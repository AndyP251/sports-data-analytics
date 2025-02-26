from typing import Dict, Any, Optional, List
from datetime import date, timedelta
from .base_processor import BaseDataProcessor
from ..exceptions import ValidationError
from core.models import Athlete, CoreBiometricData
from core.utils.s3_utils import S3Utils
import logging
from datetime import datetime
from ...utils.validation_utils import DataValidator
from ..data_collectors.whoop_collector import WhoopCollector
import json

logger = logging.getLogger(__name__)

class WhoopProcessor(BaseDataProcessor):
    """Processor for Whoop data"""
    
    def __init__(self, athlete: Athlete):
        super().__init__(athlete)
        self.s3_utils = S3Utils()
        self.base_path = f"accounts/{self.athlete.user.id}/biometric-data/whoop"
    
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
            date = raw_data.get('date')
            daily_stats = raw_data.get('daily_stats', {})
            if not daily_stats:
                logger.error(f"No daily stats found for {date}, data: {raw_data}")
                return None

            # Extract all data components
            sleep_data = daily_stats.get('sleep', {})
            recovery_data = daily_stats.get('recovery', {})
            strain_data = daily_stats.get('strain', {})
            workout_data = daily_stats.get('workouts', [])

            return {
                'date': date,
                'source': 'whoop',
                'metrics': {
                    # Sleep metrics
                    'total_sleep_seconds': sleep_data.get('total_sleep_seconds', 0),
                    'deep_sleep_seconds': sleep_data.get('slow_wave_sleep_seconds', 0),
                    'light_sleep_seconds': sleep_data.get('light_sleep_seconds', 0),
                    'rem_sleep_seconds': sleep_data.get('rem_sleep_seconds', 0),
                    'sleep_score': sleep_data.get('sleep_score', 0),
                    'sleep_quality': sleep_data.get('sleep_quality', 0),
                    'sleep_consistency': sleep_data.get('sleep_consistency', 0),
                    'sleep_efficiency': sleep_data.get('sleep_efficiency', 0),
                    'respiratory_rate': sleep_data.get('respiratory_rate', 0),
                    
                    # Recovery metrics
                    'recovery_score': recovery_data.get('recovery_score', 0),
                    'resting_heart_rate': recovery_data.get('resting_heart_rate', 0),
                    'hrv_ms': recovery_data.get('hrv_milliseconds', 0),
                    'spo2_percentage': recovery_data.get('spo2_percentage', 0),
                    'skin_temp_celsius': recovery_data.get('skin_temp_celsius', 0),
                    
                    # Strain metrics
                    'day_strain': strain_data.get('day_strain', 0),
                    'max_heart_rate': strain_data.get('max_heart_rate', 0),
                    'average_heart_rate': strain_data.get('average_heart_rate', 0),
                    'kilojoules': strain_data.get('kilojoules', 0),
                    'calories_burned': strain_data.get('calories', 0),
                },
                # Store raw time series data for potential future use
                'time_series': {
                    'heart_rate_data': strain_data.get('heart_rate_data', {}),
                    'hrv_samples': recovery_data.get('hrv_samples', {}),
                    'workout_data': workout_data
                }
            }
            
        except Exception as e:
            logger.error(f"Error processing Whoop data: {e}", exc_info=True)
            return None
    
    def validate_data(self, processed_data: Dict[str, Any]) -> bool:
        """Validate processed Whoop data"""
        return DataValidator.validate_required_fields(
            processed_data,
            ['date', 'source'],
            {
                'metrics': [
                    'total_sleep_seconds', 'deep_sleep_seconds', 'light_sleep_seconds', 'rem_sleep_seconds',
                    'sleep_score', 'sleep_quality', 'sleep_consistency', 'sleep_efficiency', 'respiratory_rate',
                    'recovery_score', 'resting_heart_rate', 'hrv_ms', 'spo2_percentage', 'skin_temp_celsius',
                    'day_strain', 'max_heart_rate', 'average_heart_rate', 'kilojoules', 'calories_burned'
                ]
            }
        )
    
    def store_processed_data(self, processed_data: Dict[str, Any]) -> bool:
        """Store processed Whoop data"""
        try:
            metrics = processed_data.get('metrics', {})
            date = processed_data.get('date')
            
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
                'sleep_resting_heart_rate': metrics.get('sleep_resting_heart_rate', 0)  # Add default
            }

            biometric_data, created = CoreBiometricData.objects.get_or_create(
                athlete=self.athlete,
                date=date,
                source='whoop',
                defaults=defaults
            )

            if not created:
                for field, value in defaults.items():
                    setattr(biometric_data, field, value)
                biometric_data.save()

            # Store time series data in S3
            if processed_data.get('time_series'):
                file_name = f"{date.strftime('%Y%m%d')}_time_series.json"
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
                    'total_sleep': item.total_sleep_seconds,
                    'deep_sleep': item.deep_sleep_seconds,
                    'light_sleep': item.light_sleep_seconds,
                    'rem_sleep': item.rem_sleep_seconds,
                    'resting_heart_rate': item.resting_heart_rate,
                    'max_heart_rate': item.max_heart_rate,
                    'recovery_score': item.recovery_score,
                    'strain_score': item.strain_score
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
            from core.utils.whoop_utils import WhoopClient
            client = WhoopClient(self.athlete.whoop_credentials)
            
            raw_data = []
            for current_date in date_range:
                daily_data = client.get_daily_stats(current_date)
                if daily_data:
                    raw_data.append({
                        'date': current_date,
                        'daily_stats': daily_data
                    })
            
            return [self.process_raw_data(data) for data in raw_data] if raw_data else None
            
        except Exception as e:
            logger.error(f"Error getting Whoop API data: {e}")
            return None

    def process_data(self, raw_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process raw data into standardized format"""
        pass

    def sync_data(self, start_date: Optional[date] = None, end_date: Optional[date] = None) -> bool:
        """Simple WHOOP data sync that just fetches from API and stores in S3"""
        try:
            logger.info(f"Starting simple WHOOP data sync for athlete {self.athlete.user.username}")
            
            # Use today if no dates provided
            if not start_date:
                start_date = date.today() - timedelta(days=7)
            if not end_date:
                end_date = date.today()
                
            logger.info(f"Fetching WHOOP data from {start_date} to {end_date}")

            # Get data from API
            collector = WhoopCollector(self.athlete)
            
            if not collector.authenticate():
                logger.error("Failed to authenticate with WHOOP API")
                return False
                
            raw_data = collector._get_from_api(start_date, end_date)
            
            if not raw_data:
                logger.warning("No data retrieved from WHOOP API")
                return False

            # Store each day's data in S3
            for daily_data in raw_data:
                try:
                    current_date = datetime.strptime(daily_data['date'], '%Y-%m-%d').date()
                    s3_path = f"{self.base_path}/{current_date.strftime('%Y-%m-%d')}_raw.json"
                    
                    logger.info(f"Storing WHOOP data in S3: {s3_path}")
                    self.s3_utils.store_json_data(s3_path, json.dumps(daily_data))    
                except Exception as e:
                    logger.error(f"Error storing data in S3 for {daily_data.get('date')}: {e}")
                    continue

            logger.info("Simple WHOOP data sync completed")
            return True

        except Exception as e:
            logger.error(f"Error in simple WHOOP data sync: {e}", exc_info=True)
            return False


    
    def sync_data_complex(self, start_date: Optional[date] = None, end_date: Optional[date] = None) -> bool:
        """Sync Whoop data for the specified date range"""
        try:
            logger.info(f"Starting WHOOP data sync for athlete {self.athlete.user.username}")
            
            # Validate dates
            if not start_date:
                start_date = date.today() - timedelta(days=7)
            if not end_date:
                end_date = date.today()
            
            logger.info(f"Syncing WHOOP data from {start_date} to {end_date}")

            # First check DB for existing data
            existing_data = self._get_from_db(date_range=[start_date + timedelta(days=x) 
                                                         for x in range((end_date - start_date).days + 1)])
            
            if existing_data:
                logger.info(f"Found {len(existing_data)} existing records in DB")
                # Create a set of dates we already have data for
                existing_dates = {item['date'] for item in existing_data}
                
                # Update date range to only fetch missing dates
                missing_dates = [d for d in (start_date + timedelta(days=x) 
                               for x in range((end_date - start_date).days + 1)) 
                               if d not in existing_dates]
                
                if not missing_dates:
                    logger.info("No missing dates to sync")
                    return True
                    
                logger.info(f"Fetching data for {len(missing_dates)} missing dates")
                start_date = min(missing_dates)
                end_date = max(missing_dates)

            # Try to get data from API
            from core.services.data_collectors.whoop_collector import WhoopCollector
            collector = WhoopCollector(self.athlete)
            
            if not collector.authenticate():
                logger.error("Failed to authenticate with WHOOP API")
                return False
            
            raw_data = collector._get_from_api(start_date, end_date)
            
            if not raw_data:
                logger.warning("No new data retrieved from WHOOP API")
                return False

            # Process and store the data
            success = True
            for daily_data in raw_data:
                try:
                    processed_data = self.process_raw_data(daily_data)
                    if processed_data:
                        if not self.store_processed_data(processed_data):
                            logger.error(f"Failed to store processed data for {daily_data.get('date')}")
                            success = False
                    else:
                        logger.warning(f"Failed to process data for {daily_data.get('date')}")
                        success = False
                except Exception as e:
                    logger.error(f"Error processing/storing data for {daily_data.get('date')}: {e}")
                    success = False

            logger.info(f"WHOOP data sync completed with status: {success}")
            return success

        except Exception as e:
            logger.error(f"Error in WHOOP data sync: {e}", exc_info=True)
            return False 