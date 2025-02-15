from typing import Dict, Any, Optional, List
from datetime import date, timedelta
from .base_processor import BaseDataProcessor
from ..exceptions import ValidationError
from core.models import Athlete, CoreBiometricData
from core.utils.s3_utils import S3Utils
import logging
import json
from datetime import datetime
from ...utils.validation_utils import DataValidator
from django.conf import settings
from core.utils.garmin_utils import GarminDataCollector
from ..data_transformers.garmin_transformer import GarminTransformer
logger = logging.getLogger(__name__)

class GarminProcessor(BaseDataProcessor):
    """Processor for Garmin Connect data"""
    
    def __init__(self, athlete: Athlete, profile_type: str = 'default'):
        super().__init__(athlete)
        self.profile_type = profile_type
        self.s3_utils = S3Utils()
        self.base_path = f"accounts/{self.athlete.user.id}/biometric-data/garmin"
    
    def get_data_flow(self, start_date: date, end_date: date) -> Optional[List[Dict[str, Any]]]:
        """
        Orchestrates data retrieval in stages:
          1) DB
          2) S3
          3) If still missing, API (only for missing dates)
        """
        try:
            # Build a list of all dates in the requested range
            date_range = [
                start_date + timedelta(days=x)
                for x in range((end_date - start_date).days + 1)
            ]
            result_data = []
            missing_dates = set(date_range)

            # 1. Pull from DB
            db_data = self._get_from_db(date_range)
            if db_data:
                result_data.extend(db_data)
                # Remove any dates found in DB
                db_dates = {item["date"] for item in db_data}
                missing_dates = missing_dates - db_dates

            # 2. Pull remaining from S3
            s3_data = self._get_from_s3(list(missing_dates))
            if s3_data:
                result_data.extend(s3_data)
                # Remove any dates found in S3
                s3_dates = {item["date"] for item in s3_data}
                missing_dates = missing_dates - s3_dates
                # Also store any S3 data into DB
                for item in s3_data:
                    self.store_processed_data(item)

            # 3. Only call API for any still-missing dates
            #    (optionally restricting to "recent" if desired)
            if missing_dates:
                logger.info(f"Fetching fresh data from API for dates: {sorted(missing_dates)}")
                api_data = self._get_from_api(min(missing_dates), max(missing_dates))
                if api_data:
                    for item in api_data:
                        # Parse item date string -> date object
                        item_date_str = item["date"]
                        if isinstance(item_date_str, date):
                            item_date = item_date_str
                        else:
                            item_date = datetime.strptime(item_date_str, "%Y-%m-%d").date()

                        # Only store and append if it's truly missing
                        if item_date in missing_dates:
                            # Store raw data in S3
                            self.s3_utils.store_json_data(
                                self.base_path,
                                f"{item_date_str}_raw.json",
                                item
                            )
                            # Also keep in final result
                            result_data.append(item)

            return sorted(result_data, key=lambda x: x["date"]) if result_data else None

        except Exception as e:
            logger.error(f"Error in data flow: {e}")
            return None
    
    def check_s3_freshness(self, date_range: List[date]) -> set[date]:
        """Check if S3 data is fresh for the given date range, returns set of missing dates"""
        missing_dates = set()
        try:
            for current_date in date_range:
                # Get latest data for this date
                data = self.s3_utils.get_latest_json_data(self.base_path, current_date)
                if not data:
                    logger.info(f"No S3 data found for {current_date}")
                    missing_dates.add(current_date)
            return missing_dates
            
        except Exception as e:
            logger.error(f"Error checking S3 freshness: {e}")
            return set(date_range)  # If error, assume all dates are missing
    
    
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
        """
        Store final Garmin data in DB (CoreBiometricData) and time series in S3.
        Note: We assume the model has columns named exactly like below.
        """
        try:
            metrics = processed_data.get('metrics', {})
            current_date = processed_data.get('date')

            # 1) Read or create the DB record
            biometric_data, created = CoreBiometricData.objects.get_or_create(
                athlete=self.athlete,
                date=current_date,
                source='garmin',
                defaults={
                    'total_sleep_seconds': metrics.get('total_sleep_seconds', 0),
                    'deep_sleep_seconds': metrics.get('deep_sleep_seconds', 0),
                    'light_sleep_seconds': metrics.get('light_sleep_seconds', 0),
                    'rem_sleep_seconds': metrics.get('rem_sleep_seconds', 0),
                    'awake_seconds': metrics.get('awake_seconds', 0),

                    'resting_heart_rate': metrics.get('resting_heart_rate', 0),
                    'max_heart_rate': metrics.get('max_heart_rate', 0),
                    'min_heart_rate': metrics.get('min_heart_rate', 0),

                    'total_calories': metrics.get('total_calories', 0),
                    'active_calories': metrics.get('active_calories', 0),
                    'total_steps': metrics.get('total_steps', 0),
                    'total_distance_meters': metrics.get('total_distance_meters', 0),

                    'average_stress_level': metrics.get('average_stress_level', 0),
                    'max_stress_level': metrics.get('max_stress_level', 0),
                    'stress_duration_seconds': metrics.get('stress_duration_seconds', 0),
                }
            )

            # 2) If the record already existed, update any changed fields
            if not created:
                changed = False
                for fld in [
                    'total_sleep_seconds','deep_sleep_seconds','light_sleep_seconds','rem_sleep_seconds','awake_seconds',
                    'resting_heart_rate','max_heart_rate','min_heart_rate','total_calories','active_calories',
                    'total_steps','total_distance_meters','average_stress_level','max_stress_level','stress_duration_seconds'
                ]:
                    if fld in metrics and hasattr(biometric_data, fld):
                        setattr(biometric_data, fld, metrics[fld])
                        changed = True
                if changed:
                    biometric_data.save()

            # 3) If the processed_data includes time series, store that in S3
            if processed_data.get('time_series'):
                file_name = f"{current_date.strftime('%Y%m%d')}_time_series.json"
                self.s3_utils.store_json_data(
                    f"{self.base_path}/time_series",
                    file_name,
                    processed_data['time_series']
                )

            return True

        except Exception as e:
            logger.error(f"Error storing Garmin data: {e}", exc_info=True)
            return False
    
    def _get_from_db(self, date_range: List[date]) -> Optional[List[Dict[str, Any]]]:
        """Get data from DB for the specified dates."""
        try:
            data = CoreBiometricData.objects.filter(
                athlete=self.athlete,
                date__in=date_range,
                source='garmin'
            ).order_by('date')

            if not data.exists():
                return None

            logger.info(f"Found {data.count()} records in DB, fields are: {data.values()}");

            results = []
            for item in data:
                results.append({
                    'date': item.date,
                    'source': 'garmin',
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
                        'sleep_heart_rate': item.sleep_heart_rate,
                        'sleep_stress': item.sleep_stress,
                        'sleep_body_battery': item.sleep_body_battery,
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
                        'sleep_heart_rate': item.sleep_heart_rate,
                        'sleep_stress': item.sleep_stress,
                        'sleep_body_battery': item.sleep_body_battery,
                        'body_battery_change': item.body_battery_change,
                        'sleep_resting_heart_rate': item.sleep_resting_heart_rate,

                        # Activity Metrics
                        'total_calories': item.total_calories,
                        'active_calories': item.active_calories,
                        'total_steps': item.total_steps,
                        'total_distance_meters': item.total_distance_meters,

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

                    }
                })
            return results

        except Exception as e:
            logger.error(f"Error getting data from DB: {e}")
            return None
    
    def _get_from_s3(self, date_range: List[date]) -> Optional[List[Dict[str, Any]]]:
        """
        Tries to retrieve JSON data previously stored in S3,
        one day at a time, returning a list of items found.
        """
        try:
            data = []
            for current_date in date_range:
                daily_data = self.s3_utils.get_latest_json_data(self.base_path, current_date)
                if daily_data:
                    data.append(daily_data)
            return data if data else None
        except Exception as e:
            logger.error(f"Error getting Garmin data from S3: {e}")
            return None
    
    def _get_from_api(self, start_date: date, end_date: date) -> Optional[List[Dict[str, Any]]]:
        """
        Actually call Garmin's API collector, transform the raw data, and return it in the standard shape.
        """
        try:
            collector = GarminDataCollector({'username': self.athlete.garmin_credentials.get_profile_config()['username'], 'password': self.athlete.garmin_credentials.get_profile_config()['password']})
            raw_data_list = collector.collect_data(start_date, end_date)
            if not raw_data_list:
                return None

            final_data = []
            for raw_day in raw_data_list:
                transformed = GarminTransformer.transform(raw_day)
                if transformed:
                    final_data.append(transformed)
            return final_data

        except Exception as e:
            logger.error(f"Error getting data from API: {e}", exc_info=True)
            return None
    
    def sync_data(self, start_date: Optional[date] = None, end_date: Optional[date] = None) -> bool:
        """Garmin-specific sync implementation"""
        sync_data_debugging = True  # Toggle for debug timing
        start_time = datetime.now() if sync_data_debugging else None
        
        try:
            if sync_data_debugging:
                logger.info(f"[DEBUG] Starting sync_data at {start_time}")
            
            # TODO: Add validation of credentials
            # if not hasattr(self.athlete, 'garmin_credentials'):
            #     logger.error("No Garmin credentials found")
            #     return False

            # This is line 344 where you wanted to see the profile
            logger.info(f"Syncing Garmin data for athlete {self.athlete.id} using profile: {self.profile_type}")
            logger.info(f"Profile config: {self.athlete.garmin_credentials.get_profile_config()['name']}") # e.g. 'Default Garmin Account'
            
            
            if not start_date:
                start_date = date.today() - timedelta(days=7)
            if not end_date:
                end_date = date.today()
            date_range = [start_date + timedelta(days=x) for x in range((end_date - start_date).days + 1)]
            date_range_set = set(date_range)  # Convert to set for efficient operations
            
            # Get DB data and track which dates we found
            if sync_data_debugging:
                db_start = datetime.now()
            db_data = self._get_from_db(date_range)
            if sync_data_debugging:
                logger.info(f"[DEBUG] DB fetch took {(datetime.now() - db_start).total_seconds():.2f} seconds")
            
            missing_dates = date_range_set.copy()
            if db_data:
                found_dates = {item['date'] for item in db_data}
                missing_dates -= found_dates
                logger.info(f"Found {len(db_data)} records in DB for {start_date} to {end_date}, missing dates are: {missing_dates}")
            
            # Only proceed with S3/API if we have missing dates
            if missing_dates:
                missing_dates_list = sorted(list(missing_dates))
                
                if sync_data_debugging:
                    s3_check_start = datetime.now()
                s3_missing_dates = self.check_s3_freshness(missing_dates_list)
                if sync_data_debugging:
                    logger.info(f"[DEBUG] S3 freshness check took {(datetime.now() - s3_check_start).total_seconds():.2f} seconds")
                
                # Get dates that exist in S3
                s3_available_dates = missing_dates - s3_missing_dates
                if s3_available_dates:
                    if sync_data_debugging:
                        s3_fetch_start = datetime.now()
                    s3_data = self._get_from_s3(sorted(list(s3_available_dates)))
                    if sync_data_debugging:
                        logger.info(f"[DEBUG] S3 data fetch took {(datetime.now() - s3_fetch_start).total_seconds():.2f} seconds")
                    
                    # Store S3 data into DB if found
                    if s3_data:
                        if sync_data_debugging:
                            s3_store_start = datetime.now()
                        for item in s3_data:
                            logger.info(f"Storing S3 data for {item['date']} into DB")
                            self.store_processed_data(item)
                        if sync_data_debugging:
                            logger.info(f"[DEBUG] S3 to DB storage took {(datetime.now() - s3_store_start).total_seconds():.2f} seconds")
                
                # The remaining dates need API fetch
                api_dates_needed = missing_dates & s3_missing_dates
                if api_dates_needed:
                    logger.info(f"Fetching fresh data from API for dates: {sorted(api_dates_needed)}")
                    if sync_data_debugging:
                        api_fetch_start = datetime.now()
                    api_data = self._get_from_api(min(api_dates_needed), max(api_dates_needed))
                    if sync_data_debugging:
                        logger.info(f"[DEBUG] API fetch took {(datetime.now() - api_fetch_start).total_seconds():.2f} seconds")
                    
                    # Store API data into both S3 and DB
                    if api_data:
                        if sync_data_debugging:
                            api_store_start = datetime.now()
                        for item in api_data:
                            item_date = item['date']
                            if item_date in api_dates_needed:
                                # Convert date to string if it's a date object
                                if isinstance(item_date, date):
                                    item['date'] = item_date.isoformat()
                                
                                # Store raw data in S3
                                logger.info(f"Storing API data for {item_date} into S3")
                                self.s3_utils.store_json_data(
                                    self.base_path,
                                    f"{item_date}_raw.json",
                                    item
                                )
                                
                                # Convert back to date object for DB storage if needed
                                if isinstance(item_date, str):
                                    item['date'] = datetime.strptime(item_date, "%Y-%m-%d").date()
                                else:
                                    item['date'] = item_date
                                    
                                # Store processed data in DB
                                transformed_data = GarminTransformer.transform(item)
                                if transformed_data:
                                    logger.info(f"Storing transformed API data for {item_date} into DB")
                                    self.store_processed_data(transformed_data)
                                else:
                                    logger.error(f"Failed to transform data for {item_date}")
                        if sync_data_debugging:
                            logger.info(f"[DEBUG] API data storage took {(datetime.now() - api_store_start).total_seconds():.2f} seconds")

            # Update success check to look for any data
            if not (api_data or s3_data or db_data):
                logger.error(f"No data found for {start_date} to {end_date} in DB, S3, or API")
                return False

            if sync_data_debugging:
                total_time = datetime.now() - start_time
                logger.info(f"[DEBUG] Total sync_data execution time: {total_time.total_seconds():.2f} seconds")
            
            return True

        except Exception as e:
            if sync_data_debugging:
                logger.error(f"[DEBUG] Error in Garmin sync after {(datetime.now() - start_time).total_seconds():.2f} seconds: {e}")
            else:
                logger.error(f"Error in Garmin sync: {e}")
            return False 