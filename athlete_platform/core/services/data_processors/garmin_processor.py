from typing import Dict, Any, Optional, List
from datetime import date, timedelta, timezone
from .base_processor import BaseDataProcessor
from ..exceptions import ValidationError
from core.models import Athlete, CoreBiometricData, CoreBiometricTimeSeries
from core.utils.s3_utils import S3Utils
import logging
import json
from datetime import datetime
from ...utils.validation_utils import DataValidator
from django.conf import settings
from core.utils.garmin_utils import GarminDataCollector
from ..data_transformers.garmin_transformer import GarminTransformer
from django.db import transaction
from django.utils import timezone
logger = logging.getLogger(__name__)

class GarminProcessor(BaseDataProcessor):
    """Processor for Garmin Connect data"""
    
    def __init__(self, athlete: Athlete, profile_type: str = 'default'):
        super().__init__(athlete)
        self.profile_type = profile_type
        self.s3_utils = S3Utils()
        self.base_path = f"accounts/{self.athlete.user.id}/biometric-data/garmin"

    def _safe_get(self, data, key, default=0):
        return super()._safe_get(data, key, default)
    
    def get_data_flow(self, start_date: date, end_date: date) -> Optional[List[Dict[str, Any]]]:
        "this method is deprecated"
        logger.error("[GARMIN] get_data_flow is deprecated, use sync_data instead")
        return None
    
    def process_data(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process raw data into standardized format"""
        logger.info("[GARMIN] Processing raw data...")
        return GarminTransformer.transform(raw_data)


    def check_s3_freshness(self, date_range: List[date]) -> set[date]:
        """Check if S3 data is fresh for the given date range, returns set of missing dates"""
        missing_dates = set()
        try:
            logger.info(f"[GARMIN] Checking S3 freshness for {len(date_range)} dates")
            for current_date in date_range:
                # Get latest data for this date
                data = self.s3_utils.get_latest_json_data(self.base_path, current_date)
                if not data:
                    logger.info(f"[GARMIN] No S3 data found for {current_date}")
                    missing_dates.add(current_date)
                else:
                    logger.info(f"[GARMIN] Found S3 data for {current_date}")
            
            logger.info(f"[GARMIN] S3 freshness check complete. Missing {len(missing_dates)} out of {len(date_range)} dates")
            return missing_dates
            
        except Exception as e:
            logger.error(f"[GARMIN] Error checking S3 freshness: {e}", exc_info=True)
            # If there's an error, assume all dates are missing
            return set(date_range)
    
    def validate_data(self, processed_data: Dict[str, Any]) -> bool:
        """Validate minimal fields are present."""
        return DataValidator.validate_required_fields(
            processed_data,
            ['date', 'source'],
            {
                'metrics': [
                    'total_sleep_seconds', 'deep_sleep_seconds', 'light_sleep_seconds', 'rem_sleep_seconds',
                    'awake_seconds', 'resting_heart_rate', 'max_heart_rate', 'min_heart_rate',
                    'total_calories', 'active_calories', 'total_distance_meters', 'total_steps',
                    'average_stress_level', 'max_stress_level', 'stress_duration_seconds'
                ]
            }
        )
    
    def store_processed_data(self, processed_data: Dict[str, Any]) -> bool:
        """Store final Garmin data in DB (CoreBiometricData) and time series in CoreBiometricDetails."""
        try:
            metrics = processed_data.get('metrics', {})
            current_date = processed_data.get('date')
            
            if not current_date:
                logger.error("[GARMIN] No date provided in processed data")
                return False
            
            with transaction.atomic():
                # Add timezone awareness to created_at
                now = timezone.now()

                logger.info(f"[GARMIN] Storing processed data for {current_date}, and doing sleep check, this is your sleep data: {metrics.get('total_sleep_seconds',0)}\n\n\n")

                biometric_data, created = CoreBiometricData.objects.update_or_create(
                    athlete=self.athlete,
                    date=current_date,
                    defaults={
                        'total_sleep_seconds': self._safe_get(metrics, 'total_sleep_seconds', 0),
                        'deep_sleep_seconds': self._safe_get(metrics, 'deep_sleep_seconds', 0),
                        'light_sleep_seconds': self._safe_get(metrics, 'light_sleep_seconds', 0),
                        'rem_sleep_seconds': self._safe_get(metrics, 'rem_sleep_seconds', 0),
                        'awake_seconds': self._safe_get(metrics, 'awake_seconds', 0),
                        'average_respiration': self._safe_get(metrics, 'average_respiration', 0),
                        'lowest_respiration': self._safe_get(metrics, 'lowest_respiration', 0),
                        'highest_respiration': self._safe_get(metrics, 'highest_respiration', 0),
                        'body_battery_change': self._safe_get(metrics, 'body_battery_change', 0),
                        'sleep_resting_heart_rate': self._safe_get(metrics, 'sleep_resting_heart_rate', 0),
                        
                        # Heart Rate Metrics
                        'resting_heart_rate': self._safe_get(metrics, 'resting_heart_rate', 0),
                        'max_heart_rate': self._safe_get(metrics, 'max_heart_rate', 0),
                        'min_heart_rate': self._safe_get(metrics, 'min_heart_rate', 0),
                        'last_seven_days_avg_resting_heart_rate': self._safe_get(metrics, 'last_seven_days_avg_resting_heart_rate', 0),
                        
                        # User Summary Metrics
                        'total_calories': self._safe_get(metrics, 'total_calories', 0),
                        'active_calories': self._safe_get(metrics, 'active_calories', 0),
                        'total_steps': self._safe_get(metrics, 'total_steps', 0),
                        'total_distance_meters': self._safe_get(metrics, 'total_distance_meters', 0),
                        'bmr_calories': self._safe_get(metrics, 'bmr_calories', 0),
                        'net_calorie_goal': self._safe_get(metrics, 'net_calorie_goal', 0),
                        'daily_step_goal': self._safe_get(metrics, 'daily_step_goal', 0),
                        'highly_active_seconds': self._safe_get(metrics, 'highly_active_seconds', 0),
                        'sedentary_seconds': self._safe_get(metrics, 'sedentary_seconds', 0),

                        # Stress Metrics
                        'average_stress_level': self._safe_get(metrics, 'average_stress_level', 0),
                        'max_stress_level': self._safe_get(metrics, 'max_stress_level', 0),
                        'stress_duration_seconds': self._safe_get(metrics, 'stress_duration_seconds', 0),
                        'rest_stress_duration': self._safe_get(metrics, 'rest_stress_duration', 0),
                        'activity_stress_duration': self._safe_get(metrics, 'activity_stress_duration', 0),
                        'low_stress_percentage': self._safe_get(metrics, 'low_stress_percentage', 0),
                        'medium_stress_percentage': self._safe_get(metrics, 'medium_stress_percentage', 0),
                        'high_stress_percentage': self._safe_get(metrics, 'high_stress_percentage', 0),
                        
                        # Metadata
                        'created_at': self._safe_get(metrics, 'created_at', now),
                        'updated_at': now,
                        'source': 'garmin',
                    }
                )
                
                # 2) Store detailed time series data
                CoreBiometricTimeSeries.objects.update_or_create(
                    id=biometric_data.id,
                    defaults={
                        'sleep_heart_rate': self._safe_get(metrics, 'sleep_heart_rate', []),
                        'sleep_stress': self._safe_get(metrics, 'sleep_stress', []),
                        'sleep_body_battery': self._safe_get(metrics, 'sleep_body_battery', []),
                    }
                )
            logger.info(f"[GARMIN] {'Created' if created else 'Updated'} DB record for date {current_date}")
            return True
                
            
        except Exception as e:
            logger.error(f"[GARMIN] Error storing processed data in DB: {str(e)}", exc_info=True)
            return False
    
    def _get_from_db(self, date_range: List[date]) -> Optional[List[Dict[str, Any]]]:
        """Get data from DB for the specified dates."""
        try:
            # Get main biometric data
            data = CoreBiometricData.objects.filter(
                athlete=self.athlete,
                date__in=date_range,
                source='garmin'
            ).order_by('date')

            # Get detailed time series data
            details = CoreBiometricTimeSeries.objects.filter(
                id__in=[item.id for item in data]
            ).select_related()

            # Create a lookup dictionary for details
            details_lookup = {str(detail.id): detail for detail in details}

            if not data.exists():
                return None

            logger.info(f"[GARMIN] Found {data.count()} records in DB")

            results = []
            for item in data:
                # Get the corresponding details object
                detail = details_lookup.get(str(item.id))
                
                results.append({
                    'date': item.date,
                    'source': item.source,
                    'metrics': {
                        # Sleep Metrics
                        'total_sleep_seconds': item.total_sleep_seconds,
                        'deep_sleep_seconds': item.deep_sleep_seconds,
                        'light_sleep_seconds': item.light_sleep_seconds,
                        'rem_sleep_seconds': item.rem_sleep_seconds,
                        'awake_seconds': item.awake_seconds,
                        'average_respiration': item.average_respiration,
                        'lowest_respiration': item.lowest_respiration,
                        'highest_respiration': item.highest_respiration,
                        'sleep_heart_rate': detail.sleep_heart_rate if detail else [],
                        'sleep_stress': detail.sleep_stress if detail else [],
                        'sleep_body_battery': detail.sleep_body_battery if detail else [],
                        'body_battery_change': item.body_battery_change,
                        'sleep_resting_heart_rate': item.sleep_resting_heart_rate,

                        # Heart Rate Metrics
                        'resting_heart_rate': item.resting_heart_rate,
                        'max_heart_rate': item.max_heart_rate,
                        'min_heart_rate': item.min_heart_rate,
                        'last_seven_days_avg_resting_heart_rate': item.last_seven_days_avg_resting_heart_rate,
                        
                        # User Summary Metrics
                        'total_calories': item.total_calories,
                        'active_calories': item.active_calories,
                        'total_steps': item.total_steps,
                        'total_distance_meters': item.total_distance_meters,
                        'bmr_calories': item.bmr_calories,
                        'net_calorie_goal': item.net_calorie_goal,
                        'daily_step_goal': item.daily_step_goal,
                        'highly_active_seconds': item.highly_active_seconds,
                        'sedentary_seconds': item.sedentary_seconds,

                        # Stress Metrics
                        'average_stress_level': item.average_stress_level,
                        'max_stress_level': item.max_stress_level,
                        'stress_duration_seconds': item.stress_duration_seconds,
                        'rest_stress_duration': item.rest_stress_duration,
                        'activity_stress_duration': item.activity_stress_duration,
                        'low_stress_percentage': item.low_stress_percentage,
                        'medium_stress_percentage': item.medium_stress_percentage,
                        'high_stress_percentage': item.high_stress_percentage,
                        
                        # Metadata
                        'created_at': item.created_at,
                        'updated_at': item.updated_at,
                        'source': item.source,
                    }
                })
            return results

        except Exception as e:
            logger.error(f"[GARMIN] Error getting data from DB: {e}")
            return None
    
    def _get_from_s3(self, date_range: List[date]) -> Optional[List[Dict[str, Any]]]:
        """Get data from S3 for the specified dates."""
        logger.info(f"[GARMIN] Getting data from S3 for {len(date_range)} dates: {date_range}")
        try:
            s3_data = []
            for current_date in date_range:
                s3_path = f"accounts/{self.athlete.user.id}/biometric-data/garmin/{current_date.strftime('%Y-%m-%d')}_raw.json"
                logger.info(f"[GARMIN] Attempting to retrieve data from S3 path: {s3_path}")
                try:
                    raw_data = self.s3_utils.get_latest_json_data_full_path(s3_path)
                    if raw_data:
                        # Add date to the data dictionary if not present
                        if 'date' not in raw_data:
                            raw_data['date'] = current_date.strftime('%Y-%m-%d')
                        s3_data.append(raw_data)
                        logger.info(f"[GARMIN] Successfully retrieved data from S3 for date {current_date}")
                    else:
                        logger.warning(f"[GARMIN] Empty or no data in S3 for date {current_date}")
                except Exception as e:
                    logger.error(f"[GARMIN] Error retrieving data from S3 for date {current_date}: {str(e)}", exc_info=True)
                    # Continue to next date instead of raising exception
                    continue

            if not s3_data:
                logger.warning("[GARMIN] No data found in S3 for the entire date range")
                return None

            # Transform the data using GarminTransformer
            transformed_data = []
            for raw_day in s3_data:
                try:
                    logger.info(f"[GARMIN] Transforming data for date {raw_day.get('date')}, data keys: {list(raw_day.keys())}")
                    transformed = GarminTransformer.transform(raw_day)
                    if transformed:
                        transformed_data.append(transformed)
                        logger.info(f"[GARMIN] Successfully transformed data for {raw_day.get('date')}")
                    else:
                        logger.error(f"[GARMIN] Transformation returned None for date {raw_day.get('date')}")
                except Exception as e:
                    logger.error(f"[GARMIN] Error transforming data for date {raw_day.get('date')}: {str(e)}", exc_info=True)
                    # Continue to next day instead of failing the entire batch
                    continue

            logger.info(f"[GARMIN] Successfully transformed {len(transformed_data)} of {len(s3_data)} S3 data records")
            return transformed_data if transformed_data else None

        except Exception as e:
            logger.error(f"[GARMIN] Error getting data from S3: {str(e)}", exc_info=True)
            return None
    
    def _get_from_api(self, start_date: date, end_date: date) -> Optional[List[Dict[str, Any]]]:
        """
        Actually call Garmin's API collector, transform the raw data, and return it in the standard shape.
        """
        try:
            collector = GarminDataCollector({
                'username': self.athlete.garmin_credentials.get_profile_config()['username'], 
                'password': self.athlete.garmin_credentials.get_profile_config()['password']
            })
            raw_data_list = collector.collect_data(start_date, end_date)
            if not raw_data_list:
                logger.error(f"[GARMIN] No data returned from Garmin API for date range {start_date} to {end_date}")
                return None

            final_data = []
            for raw_day in raw_data_list:
                # Check if we have valid data in user_summary
                user_summary = raw_day.get('user_summary', {})
                if all(value is None for value in user_summary.values()):
                    logger.error(f"[GARMIN] All values in user_summary are None for date {raw_day.get('date')}")
                    continue
                final_data.append(raw_day)

            return final_data if final_data else None

        except Exception as e:
            logger.error(f"[GARMIN] Error getting data from API: {e}", exc_info=True)
            return None
    
    def sync_data(self, start_date: Optional[date] = None, end_date: Optional[date] = None, force_refresh: bool = False) -> bool:
        """Garmin-specific sync implementation"""
        sync_data_debugging = True
        start_time = datetime.now() if sync_data_debugging else None
        
        try:
            if sync_data_debugging:
                logger.info(f"[GARMIN] Starting sync_data at {start_time}")
                
            logger.info(f"[GARMIN] Syncing Garmin data for athlete {self.athlete.id} using profile: {self.profile_type}")
            
            # Set default date range if not provided
            if not start_date:
                start_date = date.today() - timedelta(days=7)
            if not end_date:
                end_date = date.today()
                
            logger.info(f"[GARMIN] Sync date range: {start_date} to {end_date}")
            
            # Create a list of all dates in the range
            date_range = [start_date + timedelta(days=x) for x in range((end_date - start_date).days + 1)]
            
            # When force_refresh is True, we'll bypass checking DB and directly go to S3
            if force_refresh:
                logger.info(f"[GARMIN] Force refresh enabled, skipping database check")
                db_data = None
            else:
                # Get what we already have in the database
                db_data = self._get_from_db(date_range)
                
            # Determine what dates we need to get from S3
            if db_data and not force_refresh:
                db_dates = {item['date'] for item in db_data}
                missing_dates = [d for d in date_range if d not in db_dates]
                logger.info(f"[GARMIN] Found {len(db_data)} records in DB. Need to process {len(missing_dates)} missing dates.")
            else:
                # Process all dates if force_refresh or no DB data
                missing_dates = date_range
                logger.info(f"[GARMIN] Processing all {len(missing_dates)} dates in range")
            
            # Always process all dates from S3 when force_refresh is True
            if force_refresh:
                s3_data = self._get_from_s3(date_range)
            else:
                # Otherwise just get missing dates
                s3_data = self._get_from_s3(missing_dates) if missing_dates else None
            
            # Store S3 data into DB if found
            if s3_data:
                logger.info(f"[GARMIN] Processing {len(s3_data)} items from S3")
                success = False
                for item in s3_data:
                    item_date = item.get('date')
                    try:
                        # The item should already be transformed by _get_from_s3
                        logger.info(f"[GARMIN] Storing S3 data for {item_date} into DB")
                        store_success = self.store_processed_data(item)
                        if store_success:
                            success = True
                            logger.info(f"[GARMIN] Successfully stored data for {item_date}")
                        else:
                            logger.error(f"[GARMIN] Failed to store data for {item_date}")
                    except Exception as e:
                        logger.error(f"[GARMIN] Error storing data for {item_date}: {str(e)}", exc_info=True)
                
                # Return True if at least one item was successfully processed
                return success
            else:
                logger.warning(f"[GARMIN] No S3 data found or processed")
                # Try to get data from API instead of returning False
                logger.info(f"[GARMIN] Attempting to fetch data directly from Garmin API")
                try:
                    api_data = self._get_from_api(start_date, end_date)
                    if not api_data:
                        logger.error(f"[GARMIN] Failed to get data from Garmin API")
                        return False
                    
                    logger.info(f"[GARMIN] Successfully retrieved {len(api_data)} records from Garmin API")
                    
                    # Process and store API data
                    success = False
                    for raw_day in api_data:
                        try:
                            # Store raw data in S3 first
                            current_date = datetime.strptime(raw_day.get('date', ''), '%Y-%m-%d').date() if isinstance(raw_day.get('date'), str) else raw_day.get('date')
                            if current_date:
                                self.s3_utils.store_json_data(self.base_path, 
                                                            f"{current_date.strftime('%Y-%m-%d')}_raw.json",
                                                            raw_day)
                          
                                logger.info(f"[GARMIN] Stored raw data in S3 at {self.base_path} for {current_date}")
                            
                            # Transform and store in DB
                            transformed = GarminTransformer.transform(raw_day)
                            if transformed:
                                store_success = self.store_processed_data(transformed)
                                if store_success:
                                    success = True
                                    logger.info(f"[GARMIN] Successfully stored API data for {raw_day.get('date')}")
                            else:
                                logger.error(f"[GARMIN] Failed to transform API data for {raw_day.get('date')}")
                        except Exception as e:
                            logger.error(f"[GARMIN] Error processing API data for {raw_day.get('date')}: {str(e)}", exc_info=True)
                    
                    return success
                except Exception as e:
                    logger.error(f"[GARMIN] Error in API fallback: {str(e)}", exc_info=True)
                    return False
                
        except Exception as e:
            logger.error(f"[GARMIN] Error in sync_data: {str(e)}", exc_info=True)
            return False 