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
                logger.error("No raw data to process")
                return None
            
            # Extract daily stats from raw data
            daily_stats = raw_data.get('daily_stats', {})
            if not daily_stats:
                logger.error("No daily stats found in raw data")
                return None
            
            # Extract data components safely
            sleep_data = daily_stats.get('sleep_data', {}) or {}  
            recovery_data = daily_stats.get('recovery_data', {}) or {}
            cycle_data = daily_stats.get('cycle_data', {}) or {}
            workout_data = daily_stats.get('workout_data', {}) or {}
            
            # If no recovery data in main structure, try to get from cycle data
            if not recovery_data and cycle_data:
                recovery_data = cycle_data.get('recovery', {}) or {}
            
            # Initialize processed data structure
            processed_data = {
                'date': daily_stats.get('date'),
                'source': 'whoop',  # Add the required source field
                'sleep_score': self._safe_get(sleep_data, 'score', 0),
                'sleep_efficiency': self._safe_get(sleep_data, 'efficiency', 0),
                'sleep_consistency': self._safe_get(sleep_data, 'sleep_consistency', 0),
                'sleep_disturbances': self._safe_get(sleep_data, 'disturbances', 0),
                'recovery_score': self._safe_get(recovery_data, 'score', 0),
                'resting_heart_rate': self._safe_get(recovery_data, 'resting_heart_rate', 0),
                'sleep_resting_heart_rate': self._safe_get(sleep_data, 'resting_heart_rate', 0),
                'hrv_ms': self._safe_get(recovery_data, 'heart_rate_variability', 0),
                'day_strain': self._safe_get(cycle_data, 'strain', 0),
                'calories_burned': self._safe_get(cycle_data, 'kilojoules', 0) / 4.184,  # Convert kJ to calories
                'spo2_percentage': self._safe_get(sleep_data, 'spo2_percentage', 0),
                'respiratory_rate': self._safe_get(sleep_data, 'respiratory_rate', 0),
                'skin_temp_celsius': self._safe_get(sleep_data, 'skin_temp_celsius', 0),
                'sleep_needed_seconds': self._safe_get(sleep_data, 'sleep_needed_seconds', 0),
                'sleep_debt_seconds': self._safe_get(sleep_data, 'sleep_debt_seconds', 0),
                'deep_sleep_seconds': self._safe_get(sleep_data, 'deep_sleep_seconds', 0),
                'rem_sleep_seconds': self._safe_get(sleep_data, 'rem_sleep_seconds', 0),
                'light_sleep_seconds': self._safe_get(sleep_data, 'light_sleep_seconds', 0),
                'awake_seconds': self._safe_get(sleep_data, 'awake_seconds', 0),  # Changed from awake_sleep_seconds
            }
            
            # Process workout data if available
            if workout_data:
                # Add workout metrics to processed data
                processed_data['workout_count'] = len(workout_data) if isinstance(workout_data, list) else 0
            
            # Add metrics dictionary as required by validate_data
            processed_data['metrics'] = {
                'sleep_score': processed_data['sleep_score'],
                'sleep_efficiency': processed_data['sleep_efficiency'],
                'sleep_consistency': processed_data['sleep_consistency'],
                'recovery_score': processed_data['recovery_score'],
                'resting_heart_rate': processed_data['resting_heart_rate'],
                'hrv_ms': processed_data['hrv_ms'],
                'day_strain': processed_data['day_strain'],
                'calories_burned': processed_data['calories_burned'],
                'deep_sleep_seconds': processed_data['deep_sleep_seconds'],
                'rem_sleep_seconds': processed_data['rem_sleep_seconds'],
                'light_sleep_seconds': processed_data['light_sleep_seconds'],
                'respiratory_rate': processed_data['respiratory_rate']
            }
            
            logger.info(f"Successfully processed raw WHOOP data for {processed_data.get('date')}")
            return processed_data
            
        except Exception as e:
            logger.error(f"Error processing raw WHOOP data: {e}", exc_info=True)
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
    
    def store_processed_data(self, processed_data, date):
        """Store processed data in CoreBiometricData model"""
        try:
            if not processed_data:
                logger.warning(f"No processed data to store for date {date}")
                return None
            
            logger.info(f"Storing processed WHOOP data for {self.athlete.user.username} on {date}")
            
            # Extract values from processed data with sensible defaults
            fields_map = {
                'sleep_score': processed_data.get('sleep_score', 0),
                'sleep_efficiency': processed_data.get('sleep_efficiency', 0),
                'sleep_consistency': processed_data.get('sleep_consistency', 0),
                'sleep_disturbances': processed_data.get('sleep_disturbances', 0),
                'recovery_score': processed_data.get('recovery_score', 0),
                'resting_heart_rate': processed_data.get('resting_heart_rate', 0),
                'hrv_ms': processed_data.get('hrv_ms', 0),
                'day_strain': processed_data.get('day_strain', 0),
                'calories_burned': processed_data.get('calories_burned', 0),
                'spo2_percentage': processed_data.get('spo2_percentage', 0),
                'respiratory_rate': processed_data.get('respiratory_rate', 0),
                'skin_temp_celsius': processed_data.get('skin_temp_celsius', 0),
                'sleep_needed_seconds': processed_data.get('sleep_needed_seconds', 0),
                'sleep_debt_seconds': processed_data.get('sleep_debt_seconds', 0),
                'deep_sleep_seconds': processed_data.get('deep_sleep_seconds', 0),
                'rem_sleep_seconds': processed_data.get('rem_sleep_seconds', 0),
                'light_sleep_seconds': processed_data.get('light_sleep_seconds', 0),
                'awake_seconds': processed_data.get('awake_seconds', 0),
                'sleep_resting_heart_rate': processed_data.get('sleep_resting_heart_rate', 0),
                'source': 'whoop'  # Set the source field to match processed_data['source']
            }
            
            # Log the fields for debugging
            logger.debug(f"Field values for storage: {fields_map}")
            
            # Store the data - notice we use 'source' here to match the model field
            # instead of 'data_source' which doesn't exist in the model
            bio_data, created = CoreBiometricData.objects.update_or_create(
                athlete=self.athlete,
                date=date,
                defaults=fields_map
            )
            
            logger.info(f"Successfully stored WHOOP data for {date}, record {'created' if created else 'updated'}")
            return bio_data
            
        except Exception as e:
            logger.error(f"Error storing processed WHOOP data: {e}", exc_info=True)
            return None
    
    def _get_from_db(self, date_range: List[date]) -> Optional[List[Dict[str, Any]]]:
        """Get data from database"""
        try:
            data = CoreBiometricData.objects.filter(
                athlete=self.athlete,
                date__in=date_range,
                source='whoop'  # Use source field, not data_source
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
            
            # Create a flat structure for database storage from standardized format
            processed_data = {
                'date': raw_data.get('date'),
                'source': 'whoop',
                'metrics': standardized_data.metrics,
                'sleep_score': standardized_data.metrics.get('sleep_score', 0),
                'sleep_efficiency': standardized_data.sleep.get('sleep_efficiency', 0),
                'sleep_consistency': standardized_data.sleep.get('sleep_consistency', 0),
                'sleep_disturbances': standardized_data.sleep.get('disturbance_count', 0),
                'recovery_score': standardized_data.recovery.get('recovery_score', 0),
                'resting_heart_rate': standardized_data.recovery.get('resting_heart_rate', 0),
                'sleep_resting_heart_rate': standardized_data.recovery.get('resting_heart_rate', 0),
                'hrv_ms': standardized_data.recovery.get('hrv_rmssd', 0),
                'day_strain': standardized_data.stress.get('total_strain', 0),
                'calories_burned': standardized_data.heart_rate.get('cycle_kilojoules', 0) / 4.184,
                'spo2_percentage': standardized_data.recovery.get('spo2_percentage', 0),
                'respiratory_rate': standardized_data.sleep.get('respiratory_rate', 0),
                'skin_temp_celsius': standardized_data.recovery.get('skin_temp_celsius', 0),
                'deep_sleep_seconds': standardized_data.sleep.get('deep_sleep_seconds', 0),
                'rem_sleep_seconds': standardized_data.sleep.get('rem_sleep_seconds', 0),
                'light_sleep_seconds': standardized_data.sleep.get('light_sleep_seconds', 0),
                'awake_seconds': standardized_data.sleep.get('awake_sleep_seconds', 0),
            }
            
            return processed_data
            
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
                        if not self.store_processed_data(processed_data, current_date):
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