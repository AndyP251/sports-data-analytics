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
logger = logging.getLogger(__name__)

class GarminProcessor(BaseDataProcessor):
    """Processor for Garmin Connect data"""
    
    def __init__(self, athlete: Athlete, profile_type: str = 'default'):
        super().__init__(athlete)
        self.profile_type = profile_type
        self.s3_utils = S3Utils()
        self.base_path = f"accounts/{self.athlete.user.id}/biometric-data/garmin"
    
    def get_data_flow(self, start_date: date, end_date: date) -> Optional[List[Dict[str, Any]]]:
        "this method is deprecated"
        logger.error("get_data_flow is deprecated, use sync_data instead")
        return None
    
    def process_data(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process raw data into standardized format"""
        logger.info(f"Processing raw data...")
        return GarminTransformer.transform(raw_data)


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
        """Store final Garmin data in DB (CoreBiometricData) and time series in CoreBiometricDetails."""
        try:
            metrics = processed_data.get('metrics', {})
            current_date = processed_data.get('date')
            
            if not current_date:
                logger.error("No date provided in processed data")
                return False
            
            with transaction.atomic():
                # Add timezone awareness to created_at
                now = datetime.now()

                logger.info(f"Storing processed data for {current_date}, and doing sleep check, this is your sleep data: {metrics.get('total_sleep_seconds',0)}\n\n\n")
                
                biometric_data, created = CoreBiometricData.objects.update_or_create(
                    athlete=self.athlete,
                    date=current_date,
                    defaults={
                        'total_sleep_seconds': metrics.get('total_sleep_seconds', 0),
                        'deep_sleep_seconds': metrics.get('deep_sleep_seconds', 0),
                        'light_sleep_seconds': metrics.get('light_sleep_seconds', 0),
                        'rem_sleep_seconds': metrics.get('rem_sleep_seconds', 0),
                        'awake_seconds': metrics.get('awake_seconds', 0),
                        'average_respiration': metrics.get('average_respiration', 0),
                        'lowest_respiration': metrics.get('lowest_respiration', 0),
                        'highest_respiration': metrics.get('highest_respiration', 0),
                        'body_battery_change': metrics.get('body_battery_change', 0),
                        'sleep_resting_heart_rate': metrics.get('sleep_resting_heart_rate', 0),
                        
                        # Heart Rate Metrics
                        'resting_heart_rate': metrics.get('resting_heart_rate', 0),
                        'max_heart_rate': metrics.get('max_heart_rate', 0),
                        'min_heart_rate': metrics.get('min_heart_rate', 0),
                        'last_seven_days_avg_resting_heart_rate': metrics.get('last_seven_days_avg_resting_heart_rate', 0),
                        
                        # User Summary Metrics
                        'total_calories': metrics.get('total_calories', 0),
                        'active_calories': metrics.get('active_calories', 0),
                        'total_steps': metrics.get('total_steps', 0),
                        'total_distance_meters': metrics.get('total_distance_meters', 0),
                        'bmr_calories': metrics.get('bmr_calories', 0),
                        'net_calorie_goal': metrics.get('net_calorie_goal', 0),
                        'daily_step_goal': metrics.get('daily_step_goal', 0),
                        'highly_active_seconds': metrics.get('highly_active_seconds', 0),
                        'sedentary_seconds': metrics.get('sedentary_seconds', 0),

                        # Stress Metrics
                        'average_stress_level': metrics.get('average_stress_level', 0),
                        'max_stress_level': metrics.get('max_stress_level', 0),
                        'stress_duration_seconds': metrics.get('stress_duration_seconds', 0),
                        'rest_stress_duration': metrics.get('rest_stress_duration', 0),
                        'activity_stress_duration': metrics.get('activity_stress_duration', 0),
                        'low_stress_percentage': metrics.get('low_stress_percentage', 0),
                        'medium_stress_percentage': metrics.get('medium_stress_percentage', 0),
                        'high_stress_percentage': metrics.get('high_stress_percentage', 0),
                        
                        # Metadata
                        'created_at': metrics.get('created_at', now),
                        'updated_at': now,
                    }
                )
                
                # 2) Store detailed time series data
                CoreBiometricTimeSeries.objects.update_or_create(
                    id=biometric_data.id,
                    defaults={
                        'sleep_heart_rate': metrics.get('sleep_heart_rate', []),
                        'sleep_stress': metrics.get('sleep_stress', []),
                        'sleep_body_battery': metrics.get('sleep_body_battery', []),
                    }
                )
            logger.info(f"{'Created' if created else 'Updated'} DB record for date {current_date}")
            return True
                
            
        except Exception as e:
            logger.error(f"Error storing processed data in DB: {str(e)}", exc_info=True)
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

            logger.info(f"Found {data.count()} records in DB")

            results = []
            for item in data:
                # Get the corresponding details object
                detail = details_lookup.get(str(item.id))
                
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
                    }
                })
            return results

        except Exception as e:
            logger.error(f"Error getting data from DB: {e}")
            return None
    
    def _get_from_s3(self, date_range: List[date]) -> Optional[List[Dict[str, Any]]]:
        """Get data from S3 for the given date range"""
        try:
            s3_data = []
            for current_date in date_range:
                s3_path = f"accounts/{self.athlete.user.id}/biometric-data/garmin/{current_date.strftime('%Y-%m-%d')}_raw.json"
                try:
                    raw_data = self.s3_utils.get_latest_json_data_full_path(s3_path)
                    if raw_data:
                        # Add date to the data dictionary if not present
                        raw_data['date'] = current_date.strftime('%Y-%m-%d')
                        s3_data.append(raw_data)
                        logger.info(f"Retrieved data from S3 for date {current_date}")
                    else:
                        logger.warning(f"Empty data in S3 for date {current_date}")
                except Exception as e:
                    logger.warning(f"Error retrieving data from S3 for date {current_date}: {e}")
                    raise

            if not s3_data:
                logger.warning("No data found in S3 for the entire date range")
                return None

            # Transform the data using GarminTransformer
            transformed_data = []
            for raw_day in s3_data:
                transformed = GarminTransformer.transform(raw_day)
                if transformed:
                    transformed_data.append(transformed)
                else:
                    logger.error(f"Failed to transform data for date {raw_day.get('date')}")

            return transformed_data if transformed_data else None

        except Exception as e:
            logger.error(f"Error getting data from S3: {e}", exc_info=True)
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
                logger.error(f"No data returned from Garmin API for date range {start_date} to {end_date}")
                return None

            final_data = []
            for raw_day in raw_data_list:
                # Check if we have valid data in user_summary
                user_summary = raw_day.get('user_summary', {})
                if all(value is None for value in user_summary.values()):
                    logger.error(f"All values in user_summary are None for date {raw_day.get('date')}")
                    continue
                # TODO: Remove this once we have a transformer
                final_data.append(raw_day)
                # transformed = GarminTransformer.transform(raw_day)
                # if transformed:
                #     final_data.append(transformed)
                # else:
                #     logger.error(f"Failed to transform data for date {raw_day.get('date')}")

            return final_data if final_data else None

        except Exception as e:
            logger.error(f"Error getting data from API: {e}", exc_info=True)
            return None
    
    def sync_data(self, start_date: Optional[date] = None, end_date: Optional[date] = None, force_refresh: bool = False) -> bool:
        """Garmin-specific sync implementation"""
        sync_data_debugging = True
        start_time = datetime.now() if sync_data_debugging else None
        api_data = None
        s3_data = None
        
        try:
            # if not self.athlete.active_sources.filter(source_type='garmin').exists():
            #     logger.info(f"Garmin not activated for athlete {self.athlete.id}")
            #     return False
            
            if sync_data_debugging:
                logger.info(f"[DEBUG] Starting sync_data at {start_time}")
            # TODO: Add validation of credentials
            # if not hasattr(self.athlete, 'garmin_credentials'):
            #     logger.error("No Garmin credentials found")
            #     return False
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
                            # Store processed data in DB
                            transformed_data = self.process_data(item)
                            if transformed_data:
                                logger.info(f"Storing transformed API data for {item['date']} into DB")
                                self.store_processed_data(transformed_data)
                            else:
                                logger.error(f"Failed to transform data for {item['date']}")
                        if sync_data_debugging:
                            logger.info(f"[DEBUG] S3 to DB storage took {(datetime.now() - s3_store_start).total_seconds():.2f} seconds")
                
                # The remaining dates need API fetch
                api_dates_needed = missing_dates & s3_missing_dates
                if api_dates_needed:
                    logger.info(f"Fetching fresh data from API for dates: {sorted(api_dates_needed)}")
                    if sync_data_debugging:
                        api_fetch_start = datetime.now()
                    logger.info(f"Triggering API fetch for dates: {sorted(api_dates_needed)}")
                    api_data = self._get_from_api(min(api_dates_needed), max(api_dates_needed))
                    if sync_data_debugging:
                        logger.info(f"[DEBUG] API fetch took {(datetime.now() - api_fetch_start).total_seconds():.2f} seconds")
                    
                    # Store API data into both S3 and DB
                    if api_data:
                        logger.info(f"API data is being stored into DB and S3...")
                        if sync_data_debugging:
                            api_store_start = datetime.now()
                        for item in api_data:
                            # Ensure item_date is a date object for consistent comparison
                            item_date = item.get('date')
                            if isinstance(item_date, str):
                                item_date = datetime.strptime(item_date, "%Y-%m-%d").date()
                            
                            if item_date in api_dates_needed:
                                # Store raw data in S3 (needs date as string)
                                logger.info(f"Storing API data for {item_date} into S3")
                                s3_item = item.copy()
                                s3_item['date'] = item_date.isoformat()
                                self.s3_utils.store_json_data(
                                    self.base_path,
                                    f"{item_date}_raw.json",
                                    s3_item
                                )
                                
                                # Store processed data in DB (using date object)
                                db_item = item.copy()
                                db_item['date'] = item_date
                                transformed_data = self.process_data(db_item)
                                if transformed_data:
                                    logger.info(f"Storing transformed API data for {item_date} into DB")
                                    self.store_processed_data(transformed_data)
                                else:
                                    logger.error(f"Failed to transform data for {item_date}")
                            else:
                                logger.warning(f"Skipping data for {item_date} - not in requested range")
                        if sync_data_debugging:
                            logger.info(f"[DEBUG] API data storage took {(datetime.now() - api_store_start).total_seconds():.2f} seconds")
                    else:
                        logger.error(f"No API data found for {start_date} to {end_date}")
            else:
                logger.info(f"No missing dates, skipping API fetch and S3 check")
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