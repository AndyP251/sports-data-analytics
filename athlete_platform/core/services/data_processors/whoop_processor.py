from typing import Dict, Any, Optional, List
from datetime import date, timedelta, datetime
from .base_processor import BaseDataProcessor
from ..exceptions import ValidationError
from core.models import Athlete, CoreBiometricData
from core.utils.s3_utils import S3Utils
import logging
from datetime import datetime
from ...utils.validation_utils import DataValidator
from ..data_collectors.whoop_collector import WhoopCollector
from ..data_transformers.whoop_transformer import WhoopTransformer
import json

logger = logging.getLogger(__name__)

class WhoopProcessor(BaseDataProcessor):
    """Processor for Whoop data"""
    
    def __init__(self, athlete: Athlete):
        super().__init__(athlete)
        self.s3_utils = S3Utils()
        self.base_path = f"accounts/{self.athlete.user.id}/biometric-data/whoop"
        self.collector = WhoopCollector(self.athlete)
        self.transformer = WhoopTransformer()
    
    def check_s3_freshness(self, date_range: List[date]) -> bool:
        """Check if S3 data is fresh for the given date range"""
        try:
            return self.s3_utils.check_data_freshness(self.base_path, date_range)
            
        except Exception as e:
            logger.error(f"Error checking S3 freshness: {e}")
            return False
    
    def process_raw_data(self, raw_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process raw Whoop data into standardized format"""
        try:
            if not raw_data:
                return None

            # Extract date and daily stats
            date_str = raw_data.get('date')
            daily_stats = raw_data.get('daily_stats', {})
            if not daily_stats:
                logger.error(f"No daily stats found for {date_str}, data: {raw_data}")
                return None

            # Extract all data components
            sleep_data = daily_stats.get('sleep', {})
            recovery_data = daily_stats.get('recovery', {})
            cycle_data = daily_stats.get('cycle', {})
            workout_data = daily_stats.get('workouts', [])
            
            # Additional recovery data might be nested within cycle data
            cycle_recovery_data = cycle_data.get('recovery', {})
            
            # Combine recovery data sources if available
            if not recovery_data and cycle_recovery_data:
                recovery_data = cycle_recovery_data
            
            # Process sleep data with proper null handling
            sleep_score = sleep_data.get('score', {})
            stage_summary = sleep_score.get('stage_summary', {})
            
            # Extract user measurements if available
            user_measurements = raw_data.get('user_measurements', {})
            
            # Safely extract values with proper null handling
            return {
                'date': date_str,
                'source': 'whoop',
                'metrics': {
                    # Sleep metrics
                    'total_sleep_seconds': self._safe_get(stage_summary, 'total_in_bed_time_milli', 0) / 1000,
                    'deep_sleep_seconds': self._safe_get(stage_summary, 'total_slow_wave_sleep_time_milli', 0) / 1000,
                    'light_sleep_seconds': self._safe_get(stage_summary, 'total_light_sleep_time_milli', 0) / 1000,
                    'rem_sleep_seconds': self._safe_get(stage_summary, 'total_rem_sleep_time_milli', 0) / 1000,
                    'awake_sleep_seconds': self._safe_get(stage_summary, 'total_awake_time_milli', 0) / 1000,
                    'sleep_score': self._safe_get(sleep_score, 'sleep_performance_percentage', 0),
                    'sleep_quality': self._safe_get(sleep_score, 'sleep_efficiency_percentage', 0),
                    'sleep_consistency': self._safe_get(sleep_score, 'sleep_consistency_percentage', 0),
                    'sleep_efficiency': self._safe_get(sleep_score, 'sleep_efficiency_percentage', 0),
                    'respiratory_rate': self._safe_get(sleep_score, 'respiratory_rate', 0),
                    'sleep_cycle_count': self._safe_get(stage_summary, 'sleep_cycle_count', 0),
                    'sleep_disturbances': self._safe_get(stage_summary, 'disturbance_count', 0),
                    
                    # Recovery metrics
                    'recovery_score': self._safe_get(recovery_data, 'recovery_score', 0),
                    'resting_heart_rate': self._safe_get(recovery_data, 'resting_heart_rate', 0),
                    'hrv_ms': self._safe_get(recovery_data, 'hrv_rmssd_milli', 0),
                    'spo2_percentage': self._safe_get(recovery_data, 'spo2_percentage', 0),
                    'skin_temp_celsius': self._safe_get(recovery_data, 'skin_temp_celsius', 0),
                    
                    # Cycle/strain metrics
                    'day_strain': self._safe_get(cycle_data.get('score', {}), 'strain', 0),
                    'max_heart_rate': self._safe_get(cycle_data.get('score', {}), 'max_heart_rate', 0),
                    'average_heart_rate': self._safe_get(cycle_data.get('score', {}), 'average_heart_rate', 0),
                    'kilojoules': self._safe_get(cycle_data.get('score', {}), 'kilojoule', 0),
                    'calories_burned': self._safe_get(cycle_data.get('score', {}), 'kilojoule', 0) / 4.184,  # Convert kJ to calories
                    
                    # User measurements
                    'height_m': user_measurements.get('height_meter', 0),
                    'weight_kg': user_measurements.get('weight_kilogram', 0),
                    'max_possible_hr': user_measurements.get('max_heart_rate', 0),
                },
                # Store raw time series data for potential future use
                'time_series': {
                    'sleep': {
                        'start': sleep_data.get('start', ''),
                        'end': sleep_data.get('end', ''),
                    },
                    'cycle': {
                        'start': cycle_data.get('start', ''),
                        'end': cycle_data.get('end', ''),
                    },
                    'workout_data': workout_data
                }
            }
            
        except Exception as e:
            logger.error(f"Error processing Whoop data: {e}", exc_info=True)
            return None
    
    def _safe_get(self, data, key, default=0):
        """Safely get a value from a dictionary with proper type handling"""
        if not data or key not in data:
            return default
            
        value = data.get(key)
        
        if value is None:
            return default
            
        # Handle numeric values
        if isinstance(default, (int, float)):
            try:
                return float(value)
            except (ValueError, TypeError):
                return default
                
        return value
    
    def validate_data(self, processed_data: Dict[str, Any]) -> bool:
        """Validate processed Whoop data"""
        if not processed_data:
            return False
            
        required_fields = ['date', 'source']
        
        # Only validate the existence of these fields, not their values
        for field in required_fields:
            if field not in processed_data:
                logger.error(f"Missing required field: {field}")
                return False
                
        # Ensure metrics dictionary exists
        if 'metrics' not in processed_data:
            logger.error("Missing metrics dictionary")
            return False
            
        return True
    
    def store_processed_data(self, processed_data: Dict[str, Any]) -> bool:
        """Store processed Whoop data"""
        try:
            if not processed_data:
                logger.error("No processed data to store")
                return False
                
            metrics = processed_data.get('metrics', {})
            date_str = processed_data.get('date')
            
            try:
                data_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except (ValueError, TypeError):
                logger.error(f"Invalid date format: {date_str}")
                return False
            
            # Set default values for required fields
            defaults = {
                'total_sleep_seconds': metrics.get('total_sleep_seconds', 0),
                'deep_sleep_seconds': metrics.get('deep_sleep_seconds', 0),
                'light_sleep_seconds': metrics.get('light_sleep_seconds', 0),
                'rem_sleep_seconds': metrics.get('rem_sleep_seconds', 0),
                'sleep_score': metrics.get('sleep_score', 0),
                'resting_heart_rate': metrics.get('resting_heart_rate', 0),
                'max_heart_rate': metrics.get('max_heart_rate', 0),
                'average_heart_rate': metrics.get('average_heart_rate', 0),
                'recovery_score': metrics.get('recovery_score', 0),
                'hrv_ms': metrics.get('hrv_ms', 0),
                'respiratory_rate': metrics.get('respiratory_rate', 0),
                'day_strain': metrics.get('day_strain', 0),
                'calories_burned': metrics.get('calories_burned', 0),
                'sleep_efficiency': metrics.get('sleep_efficiency', 0),
                'sleep_consistency': metrics.get('sleep_consistency', 0),
                'sleep_disturbances': metrics.get('sleep_disturbances', 0),
                'spo2_percentage': metrics.get('spo2_percentage', 0),
                'skin_temp_celsius': metrics.get('skin_temp_celsius', 0)
            }

            biometric_data, created = CoreBiometricData.objects.get_or_create(
                athlete=self.athlete,
                date=data_date,
                source='whoop',
                defaults=defaults
            )

            if not created:
                for field, value in defaults.items():
                    setattr(biometric_data, field, value)
                biometric_data.save()

            # Store time series data in S3
            if processed_data.get('time_series'):
                file_name = f"{data_date.strftime('%Y%m%d')}_time_series.json"
                self.s3_utils.store_json_data(
                    f"{self.base_path}/time_series",
                    file_name,
                    processed_data['time_series']
                )

            return True

        except Exception as e:
            logger.error(f"Error storing WHOOP data: {e}", exc_info=True)
            return False
    
    def _get_from_db(self, date_range: List[date]) -> Optional[List[Dict[str, Any]]]:
        """Get data from database"""
        try:
            data = CoreBiometricData.objects.filter(
                athlete=self.athlete,
                date__in=date_range,
                source='whoop'
            ).order_by('date')
            
            return [{
                'date': item.date,
                'source': 'whoop',
                'metrics': {
                    'total_sleep_seconds': item.total_sleep_seconds,
                    'deep_sleep_seconds': item.deep_sleep_seconds,
                    'light_sleep_seconds': item.light_sleep_seconds,
                    'rem_sleep_seconds': item.rem_sleep_seconds,
                    'resting_heart_rate': item.resting_heart_rate,
                    'max_heart_rate': item.max_heart_rate,
                    'recovery_score': item.recovery_score,
                    'day_strain': item.day_strain,
                    'calories_burned': item.calories_burned,
                    'hrv_ms': item.hrv_ms,
                    'respiratory_rate': item.respiratory_rate,
                    'sleep_score': item.sleep_score,
                    'sleep_efficiency': item.sleep_efficiency,
                    'sleep_consistency': item.sleep_consistency
                }
            } for item in data]
            
        except Exception as e:
            logger.error(f"Error getting Whoop data from DB: {e}")
            return None
    
    def _get_from_s3(self, date_range: List[date]) -> Optional[List[Dict[str, Any]]]:
        """Get data from S3"""
        try:
            data = []
            
            for current_date in date_range:
                daily_data = self.s3_utils.get_latest_json_data(self.base_path, current_date)
                if daily_data:
                    data.append(daily_data)
            
            return data if data else None
            
        except Exception as e:
            logger.error(f"Error getting Whoop data from S3: {e}")
            return None
    
    def _get_from_api(self, date_range: List[date]) -> Optional[List[Dict[str, Any]]]:
        """Whoop-specific API data fetch"""
        try:
            raw_data = self.collector.collect_data(min(date_range), max(date_range))
            
            if not raw_data:
                return None
                
            return [self.process_raw_data(data) for data in raw_data]
            
        except Exception as e:
            logger.error(f"Error getting Whoop API data: {e}")
            return None

    def process_data(self, raw_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process raw data into standardized format"""
        try:
            # Use the transformer to standardize the data
            standardized_data = self.transformer.transform_to_standard_format(raw_data)
            
            # Convert standardized data to flat structure for storage
            return self.process_raw_data(raw_data)
            
        except Exception as e:
            logger.error(f"Error processing Whoop data: {e}", exc_info=True)
            return None

    def sync_data(self, start_date: Optional[date] = None, end_date: Optional[date] = None) -> bool:
        """Simple WHOOP data sync that fetches from API and stores in S3"""
        try:
            logger.info(f"Starting WHOOP data sync for athlete {self.athlete.user.username}")
            
            # Use today if no dates provided
            if not start_date:
                start_date = date.today() - timedelta(days=7)
            if not end_date:
                end_date = date.today()
                
            logger.info(f"Fetching WHOOP data from {start_date} to {end_date}")

            # Get data from API using collector
            if not self.collector.authenticate():
                logger.error("Failed to authenticate with WHOOP API")
                return False
                
            raw_data = self.collector.collect_data(start_date, end_date)
            
            if not raw_data:
                logger.warning("No data retrieved from WHOOP API")
                return False

            # Store each day's raw data in S3 and process for DB
            success = True
            for daily_data in raw_data:
                try:
                    # Store raw data in S3
                    current_date = datetime.strptime(daily_data['date'], '%Y-%m-%d').date()
                    
                    logger.info(f"Storing raw WHOOP data in S3 for {current_date}")
                    self.s3_utils.store_json_data(
                        self.base_path, 
                        f"{current_date.strftime('%Y-%m-%d')}_raw.json",
                        daily_data
                    )
                    
                    # Process and store in database
                    processed_data = self.process_raw_data(daily_data)
                    if processed_data and self.validate_data(processed_data):
                        if not self.store_processed_data(processed_data):
                            logger.error(f"Failed to store processed data for {current_date}")
                            success = False
                    else:
                        logger.warning(f"Invalid processed data for {current_date}")
                        success = False
                        
                except Exception as e:
                    logger.error(f"Error processing data for {daily_data.get('date')}: {e}", exc_info=True)
                    success = False

            logger.info(f"WHOOP data sync completed with status: {success}")
            return success

        except Exception as e:
            logger.error(f"Error in WHOOP data sync: {e}", exc_info=True)
            return False

    def store_raw_data_in_s3(self, raw_data):
        """Store raw data in S3"""
        for daily_data in raw_data:
            try:
                current_date = datetime.strptime(daily_data['date'], '%Y-%m-%d').date()
                
                logger.info(f"Storing WHOOP data in S3 for {current_date}")
                self.s3_utils.store_json_data(
                    self.base_path, 
                    f"{current_date.strftime('%Y-%m-%d')}_raw.json",
                    daily_data
                )
            except Exception as e:
                logger.error(f"Error storing data in S3 for {daily_data.get('date')}: {e}")
                continue 