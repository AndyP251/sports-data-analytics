from typing import Dict, Any, Optional, List
from datetime import date, timedelta, datetime, timezone
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

DEBUG_MODE = False

class WhoopProcessor(BaseDataProcessor):
    """Processor for Whoop data"""
    
    def __init__(self, athlete: Athlete):
        super().__init__(athlete)
        self.s3_utils = S3Utils()
        self.base_path = f"accounts/{self.athlete.user.id}/biometric-data/whoop"
        self.collector = WhoopCollector(self.athlete)
        self.transformer = WhoopTransformer()
    
    def _safe_get(self, data, key, default=0):
        return super()._safe_get(data, key, default)

    def check_s3_freshness(self, date_range: List[date]) -> bool:
        """Check if S3 data is fresh for the given date range"""
        try:
            return self.s3_utils.check_data_freshness(self.base_path, date_range)
            
        except Exception as e:
            if DEBUG_MODE:
                logger.error(f"[WHOOP] Error checking S3 freshness: {e}")
            return False
    
    def process_raw_data(self, raw_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process raw Whoop data into standardized format"""
        try:
            if not raw_data:
                if DEBUG_MODE:
                    logger.error("[WHOOP] No raw data to process")
                return None
            
            # Extract daily stats from raw data
            daily_stats = raw_data.get('daily_stats', {})
            if not daily_stats:
                if DEBUG_MODE:
                    logger.error("[WHOOP] No daily stats found in raw data")
                return None
            
            # Extract data components safely
            sleep_data = daily_stats.get('sleep_data', {}) or {}  
            recovery_data = daily_stats.get('recovery_data', {}) or {}
            cycle_data = daily_stats.get('cycle_data', {}) or {}
            workout_data = daily_stats.get('workout_data', []) or []
            user_profile = raw_data.get('user_profile', {}) or {}
            
            # If no recovery data in main structure, try to get from cycle data
            if not recovery_data and cycle_data:
                recovery_data = cycle_data.get('recovery', {}) or {}
            
            sleep_score = self._safe_get(sleep_data, 'score', {})
            sleep_summary = self._safe_get(sleep_score, 'stage_summary', {})
            sleep_needed = self._safe_get(sleep_score, 'sleep_needed', {})
            cycle_score = self._safe_get(cycle_data, 'score', {})
            cycle_recovery = self._safe_get(cycle_data, 'recovery', {})

            # Initialize processed data structure
            processed_data = {
                'date': daily_stats.get('date'),
                'source': 'whoop',  # Add the required source field
                # Score Sleep Metrics
                'sleep_efficiency': self._safe_get(sleep_score, 'sleep_efficiency_percentage', 0),
                'sleep_consistency': self._safe_get(sleep_score, 'sleep_consistency_percentage', 0),
                'sleep_performance': self._safe_get(sleep_score, 'sleep_performance_percentage', 0),
                'respiratory_rate': self._safe_get(sleep_score, 'respiratory_rate', 0),
                # Score / Summary Sleep Metrics
                'sleep_disturbances': self._safe_get(sleep_summary, 'disturbance_count', 0),
                'sleep_cycle_count': self._safe_get(sleep_summary, 'sleep_cycle_count', 0),
                'deep_sleep_seconds': self._safe_get(sleep_summary, 'total_slow_wave_sleep_time_milli', 0),
                'rem_sleep_seconds': self._safe_get(sleep_summary, 'total_rem_sleep_time_milli', 0),
                'light_sleep_seconds': self._safe_get(sleep_summary, 'total_light_sleep_time_milli', 0),
                'no_data_seconds': self._safe_get(sleep_summary, 'total_no_data_time_milli', 0),
                'awake_seconds': self._safe_get(sleep_summary, 'total_awake_time_milli', 0),
                'total_in_bed_seconds': self._safe_get(sleep_summary, 'total_in_bed_time_milli', 0),
                # Score / Sleep Needed
                'baseline_sleep_seconds': self._safe_get(sleep_needed, 'baseline_milli', 0),
                'need_from_sleep_debt_seconds': self._safe_get(sleep_needed, 'need_from_sleep_debt_milli', 0),
                'need_from_recent_strain_seconds': self._safe_get(sleep_needed, 'need_from_recent_strain_milli', 0),
                'need_from_recent_nap_seconds': self._safe_get(sleep_needed, 'need_from_recent_nap_milli', 0), #neg #
                # Recovery Data
                'user_calibrating_recovery': self._safe_get(recovery_data, 'user_calibrating', False),
                'recovery_score': self._safe_get(recovery_data, 'recovery_score', 0),
                'resting_heart_rate': self._safe_get(recovery_data, 'resting_heart_rate', 0),
                'sleep_resting_heart_rate': self._safe_get(sleep_data, 'resting_heart_rate', 0),
                'hrv_ms': self._safe_get(recovery_data, 'hrv_rmssd_milli', 0),
                'spo2_percentage': self._safe_get(recovery_data, 'spo2_percentage', 0),
                'skin_temp_celsius': self._safe_get(recovery_data, 'skin_temp_celsius', 0),
                # Cycle Data
                'start_time': self._safe_get(cycle_data, 'start', str(datetime.now())),
                'strain': self._safe_get(cycle_score, 'strain', 0),
                'kilojoules': self._safe_get(cycle_score, 'kilojoule', 0),
                'average_heart_rate': self._safe_get(cycle_score, 'average_heart_rate', 0),
                'max_heart_rate': self._safe_get(cycle_score, 'max_heart_rate', 0),
                # Cycle / Recovery
                'user_calibrating_cycle': self._safe_get(cycle_recovery, 'user_calibrating', False),
                'recovery_score': self._safe_get(cycle_recovery, 'recovery_score', 0),
                'resting_heart_rate': self._safe_get(cycle_recovery, 'resting_heart_rate', 0),
                'hrv_ms': self._safe_get(cycle_recovery, 'hrv_rmssd_milli', 0),
                'spo2_percentage': self._safe_get(cycle_recovery, 'spo2_percentage', 0),
                'skin_temp_celsius': self._safe_get(cycle_recovery, 'skin_temp_celsius', 0),
                # user profile data
                'user_id': self._safe_get(user_profile, 'user_id', 0),
                'email': self._safe_get(user_profile, 'email', ''),
                'first_name': self._safe_get(user_profile, 'first_name', ''),
                'last_name': self._safe_get(user_profile, 'last_name', ''),
                'gender': self._safe_get(user_profile, 'gender', ''),
                'birthdate': self._safe_get(user_profile, 'birthdate', None),
                'height_cm': self._safe_get(user_profile, 'height_cm', 0),
                'weight_kg': self._safe_get(user_profile, 'weight_kg', 0),
                'body_fat_percentage': self._safe_get(user_profile, 'body_fat_percentage', 0),
                
            }
            
            # Process workout data if available
            if workout_data:
                # Add workout metrics to processed data
                processed_data['workout_count'] = len(workout_data) if isinstance(workout_data, list) else 0
            
            # Add metrics dictionary as required by validate_data
            processed_data['metrics'] = {
                'sleep_score': processed_data['sleep_performance'],
                'sleep_efficiency': processed_data['sleep_efficiency'],
                'sleep_consistency': processed_data['sleep_consistency'],
                'recovery_score': processed_data['recovery_score'],
                'resting_heart_rate': processed_data['resting_heart_rate'],
                'hrv_ms': processed_data['hrv_ms'],
                'day_strain': processed_data['strain'],
                'calories_burned': processed_data['kilojoules'] / 4.184,
                'deep_sleep_seconds': processed_data['deep_sleep_seconds'],
                'rem_sleep_seconds': processed_data['rem_sleep_seconds'],
                'light_sleep_seconds': processed_data['light_sleep_seconds'],
                'respiratory_rate': processed_data['respiratory_rate']
            }
            
            if DEBUG_MODE:
                logger.info(f"[WHOOP] Successfully processed raw data for {processed_data.get('date')}")
            return processed_data
            
        except Exception as e:
            if DEBUG_MODE:
                logger.error(f"[WHOOP] Error processing raw data: {e}", exc_info=True)
            return None
    
    
    def validate_data(self, processed_data: Dict[str, Any]) -> bool:
        """Validate processed Whoop data"""
        if not processed_data:
            return False
            
        required_fields = ['date', 'source']
        
        # Only validate the existence of these fields, not their values
        for field in required_fields:
            if field not in processed_data:
                if DEBUG_MODE:
                    logger.error(f"[WHOOP] Missing required field: {field}")
                return False
                
        # Ensure metrics dictionary exists
        if 'metrics' not in processed_data:
            if DEBUG_MODE:
                logger.error("[WHOOP] Missing metrics dictionary")
            return False
            
        return True
    
    def store_processed_data(self, processed_data, date_value):
        """Store processed data in CoreBiometricData model"""
        try:
            if not processed_data:
                if DEBUG_MODE:
                    logger.warning(f"[WHOOP] No processed data to store for date {date_value}")
                return None
            
            if DEBUG_MODE:
                logger.info(f"[WHOOP] Storing processed data for {self.athlete.user.username} on {date_value}")
            if date_value is None:
                if DEBUG_MODE:
                    logger.warning(f"[WHOOP] No date value provided for {self.athlete.user.username}, defaulting to current date")
                date_value = str(datetime.now())

            # Convert date to string if it's a datetime or date object
            if isinstance(date_value, (datetime, date)):
                if DEBUG_MODE:
                    logger.info(f"[WHOOP] Converting date to string: {date_value} in store_processed_data of whoop_processor.py")
                date_str = date_value.isoformat().split('T')[0]  # Get just the date part
            else:
                date_str = str(date_value)
            
            # Extract values from processed data with sensible defaults
            fields_map = {
                'date': date_str,  # Use the converted date string
                'sleep_efficiency': self._safe_get(processed_data, 'sleep_efficiency', 0),
                'sleep_consistency': self._safe_get(processed_data, 'sleep_consistency', 0),
                'sleep_performance': self._safe_get(processed_data, 'sleep_performance', 0),
                'respiratory_rate': self._safe_get(processed_data, 'respiratory_rate', 0),
                'sleep_disturbances': self._safe_get(processed_data, 'sleep_disturbances', 0),
                'sleep_cycle_count': self._safe_get(processed_data, 'sleep_cycle_count', 0),
                'deep_sleep_seconds': self._safe_get(processed_data, 'deep_sleep_seconds', 0),
                'rem_sleep_seconds': self._safe_get(processed_data, 'rem_sleep_seconds', 0),
                'light_sleep_seconds': self._safe_get(processed_data, 'light_sleep_seconds', 0),
                'no_data_seconds': self._safe_get(processed_data, 'no_data_seconds', 0),
                'awake_seconds': self._safe_get(processed_data, 'awake_seconds', 0),
                'total_in_bed_seconds': self._safe_get(processed_data, 'total_in_bed_seconds', 0),
                'baseline_sleep_seconds': self._safe_get(processed_data, 'baseline_sleep_seconds', 0),
                'need_from_sleep_debt_seconds': self._safe_get(processed_data, 'need_from_sleep_debt_seconds', 0),
                'need_from_recent_strain_seconds': self._safe_get(processed_data, 'need_from_recent_strain_seconds', 0),
                'need_from_recent_nap_seconds': self._safe_get(processed_data, 'need_from_recent_nap_seconds', 0),
                'recovery_score': self._safe_get(processed_data, 'recovery_score', 0),
                'resting_heart_rate': self._safe_get(processed_data, 'resting_heart_rate', 0),
                'sleep_resting_heart_rate': self._safe_get(processed_data, 'sleep_resting_heart_rate', 0),
                'hrv_ms': self._safe_get(processed_data, 'hrv_ms', 0),
                'spo2_percentage': self._safe_get(processed_data, 'spo2_percentage', 0),
                'skin_temp_celsius': self._safe_get(processed_data, 'skin_temp_celsius', 0),
                'strain': self._safe_get(processed_data, 'strain', 0),
                'kilojoules': self._safe_get(processed_data, 'kilojoules', 0),
                'average_heart_rate': self._safe_get(processed_data, 'average_heart_rate', 0),
                'max_heart_rate': self._safe_get(processed_data, 'max_heart_rate', 0),
                'user_id': self._safe_get(processed_data, 'user_id', 0),
                'email': self._safe_get(processed_data, 'email', ''),
                'first_name': self._safe_get(processed_data, 'first_name', ''),
                'last_name': self._safe_get(processed_data, 'last_name', ''),
                'gender': self._safe_get(processed_data, 'gender', ''),
                'birthdate': self._safe_get(processed_data, 'birthdate', None),
                'height_cm': self._safe_get(processed_data, 'height_cm', 0),
                'weight_kg': self._safe_get(processed_data, 'weight_kg', 0),
                'body_fat_percentage': self._safe_get(processed_data, 'body_fat_percentage', 0),
                'source': self._safe_get(processed_data, 'source', 'whoop'),
            }
            
            # Log the fields for debugging
            if DEBUG_MODE:
                logger.debug(f"Field values for storage: {fields_map}")
            
            # Store the data
            bio_data, created = CoreBiometricData.objects.update_or_create(
                athlete=self.athlete,
                date=date_str,
                source='whoop',  # Include source in the lookup criteria
                defaults=fields_map
            )
            
            if DEBUG_MODE:
                logger.info(f"[WHOOP] Successfully stored data for {date_str}, record {'created' if created else 'updated'}")
            return bio_data
            
        except Exception as e:
            if DEBUG_MODE:
                logger.error(f"[WHOOP] Error storing processed data: {e}", exc_info=True)
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
                    'day_strain': item.strain,
                    'calories_burned': item.kilojoules / 4.184,
                    'hrv_ms': item.hrv_ms,
                    'respiratory_rate': item.respiratory_rate,
                    'sleep_score': item.sleep_performance,
                    'sleep_efficiency': item.sleep_efficiency,
                    'sleep_consistency': item.sleep_consistency
                }
            } for item in data]
            
        except Exception as e:
            if DEBUG_MODE:
                logger.error(f"[WHOOP] Error getting data from DB: {e}")
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
            if DEBUG_MODE:
                logger.error(f"[WHOOP] Error getting data from S3: {e}")
            return None
    
    def _get_from_api(self, date_range: List[date]) -> Optional[List[Dict[str, Any]]]:
        """Whoop-specific API data fetch
        Deprecated: Not needed for Whoop
        """
        pass

    def process_data(self, raw_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process raw data into standardized format
        Deprecated: Using transformer instead
        """
        pass


    def sync_data(self, start_date: Optional[date] = None, end_date: Optional[date] = None, force_refresh: bool = False) -> bool:
        """Simple WHOOP data sync that fetches from API and stores in S3"""
        try:
            # Always log this one regardless of DEBUG_MODE
            logger.info(f"[WHOOP] collecting data for athlete {self.athlete.user.username}")
            
            if DEBUG_MODE:
                logger.info(f"[WHOOP] Starting data sync for athlete {self.athlete.user.username}")
            
            # Use today if no dates provided
            if not start_date:
                start_date = date.today() - timedelta(days=7)
            if not end_date:
                end_date = date.today()
                
            if DEBUG_MODE:
                logger.info(f"[WHOOP] Fetching data from {start_date} to {end_date}")

            # Generate list of dates in the range
            date_range = [start_date + timedelta(days=x) for x in range((end_date - start_date).days + 1)]
            
            # Track which dates we need data for
            missing_dates = date_range.copy()
            all_data = []
            
            # First check S3 for data unless force refresh is True
            if not force_refresh:
                if DEBUG_MODE:
                    logger.info("[WHOOP] Checking S3 for existing data")
                s3_data = self._get_from_s3(date_range)
                
                if s3_data:
                    all_data.extend(s3_data)
                    # Remove dates we already have data for
                    for daily_data in s3_data:
                        try:
                            current_date = datetime.strptime(daily_data['date'], '%Y-%m-%d').date()
                            if current_date in missing_dates:
                                missing_dates.remove(current_date)
                        except (KeyError, ValueError) as e:
                            if DEBUG_MODE:
                                logger.warning(f"[WHOOP] Error processing S3 data date: {e}")
                
                # If we still have missing dates, check the database
                if missing_dates and not force_refresh:
                    if DEBUG_MODE:
                        logger.info("[WHOOP] Checking database for remaining dates")
                    db_data = self._get_from_db(missing_dates)
                    
                    if db_data:
                        all_data.extend(db_data)
                        # Remove dates we got from the database
                        for daily_data in db_data:
                            try:
                                if isinstance(daily_data.get('date'), date):
                                    current_date = daily_data['date']
                                else:
                                    current_date = datetime.strptime(daily_data['date'], '%Y-%m-%d').date()
                                if current_date in missing_dates:
                                    missing_dates.remove(current_date)
                            except (KeyError, ValueError) as e:
                                if DEBUG_MODE:
                                    logger.warning(f"[WHOOP] Error processing DB data date: {e}")
            
            # If we still have missing dates, or force refresh is True, use the API
            if missing_dates or force_refresh:
                # Get data from API using collector
                if not self.collector.authenticate():
                    if DEBUG_MODE:
                        logger.error("[WHOOP] Failed to authenticate with API")
                    return False
                
                # If force_refresh, we need all dates; otherwise, just the missing ones
                api_start_date = start_date if force_refresh else min(missing_dates)
                api_end_date = end_date if force_refresh else max(missing_dates)
                
                if DEBUG_MODE:
                    logger.info(f"[WHOOP] Fetching data from API for dates {api_start_date} to {api_end_date}")
                raw_data = self.collector.collect_data(api_start_date, api_end_date)
                
                if not raw_data:
                    if DEBUG_MODE:
                        logger.warning("[WHOOP] No data retrieved from API")
                    # If we have some data from S3 or DB, continue processing that
                    if not all_data:
                        return False
                else:
                    # Add API data to our collection
                    for daily_data in raw_data:
                        # Store raw data in S3
                        try:
                            current_date = datetime.strptime(daily_data['date'], '%Y-%m-%d').date()
                            
                            # Always log this one regardless of DEBUG_MODE
                            logger.info(f"[WHOOP] collecting data for this day {current_date}")
                            
                            if DEBUG_MODE:
                                logger.info(f"[WHOOP] Storing raw data in S3 for {current_date}")
                            self.s3_utils.store_json_data(
                                self.base_path, 
                                f"{current_date.strftime('%Y-%m-%d')}_raw.json",
                                daily_data
                            )
                            
                            # Add to our all_data collection
                            all_data.append(daily_data)
                        except Exception as e:
                            if DEBUG_MODE:
                                logger.error(f"[WHOOP] Error storing raw data in S3: {e}", exc_info=True)

            # Process and store all collected data
            success = True
            for daily_data in all_data:
                try:
                    # Get the date for this data
                    if isinstance(daily_data.get('date'), date):
                        current_date = daily_data['date']
                    else:
                        current_date = datetime.strptime(daily_data['date'], '%Y-%m-%d').date()
                    
                    # Process and store in database
                    processed_data = self.process_raw_data(daily_data)
                    if processed_data and self.validate_data(processed_data):
                        if DEBUG_MODE:
                            logger.info(f"[WHOOP] Processed data: {processed_data}")
                        if not self.store_processed_data(processed_data, current_date):
                            if DEBUG_MODE:
                                logger.error(f"[WHOOP] Failed to store processed data for {current_date}")
                            success = False
                    else:
                        if DEBUG_MODE:
                            logger.warning(f"[WHOOP] Invalid processed data for {current_date}")
                        success = False
                        
                except Exception as e:
                    if DEBUG_MODE:
                        logger.error(f"[WHOOP] Error processing data: {e}", exc_info=True)
                    success = False

            if DEBUG_MODE:
                logger.info(f"[WHOOP] data sync completed with status: {success}")
            return success

        except Exception as e:
            if DEBUG_MODE:
                logger.error(f"[WHOOP] Error in sync_data: {e}", exc_info=True)
            return False

    def store_raw_data_in_s3(self, raw_data):
        """Store raw data in S3"""
        for daily_data in raw_data:
            try:
                current_date = datetime.strptime(daily_data['date'], '%Y-%m-%d').date()
                
                if DEBUG_MODE:
                    logger.info(f"[WHOOP] Storing data in S3 for {current_date}")
                self.s3_utils.store_json_data(
                    self.base_path, 
                    f"{current_date.strftime('%Y-%m-%d')}_raw.json",
                    daily_data
                )
            except Exception as e:
                if DEBUG_MODE:
                    logger.error(f"[WHOOP] Error storing data in S3 for {daily_data.get('date')}: {e}")
                continue 