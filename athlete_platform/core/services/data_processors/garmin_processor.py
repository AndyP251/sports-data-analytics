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
    
    def check_s3_freshness(self, date_range: List[date]) -> bool:
        """Check if S3 data is fresh for the given date range"""
        try:
            for current_date in date_range:
                # Get latest data for this date
                data = self.s3_utils.get_latest_json_data(self.base_path, current_date)
                if not data:
                    logger.info(f"No S3 data found for {current_date}")
                    return False
            return True
            
        except Exception as e:
            logger.error(f"Error checking S3 freshness: {e}")
            return False
    
    def process_data(self, raw_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Convert raw Garmin data into standardized format.
        If 'daily stats' are missing, we skip it.
        """
        try:
            if not raw_data:
                return None

            # The raw_data here is what's returned by collect_data()
            # Make sure daily_data keys match your structure
            date_str = raw_data['date'] if raw_data.get('date') else None
            if isinstance(date_str, date):
                current_date = date_str
            else:
                current_date = datetime.strptime(str(date_str), '%Y-%m-%d').date()

            # Merge daily stats
            daily_stats = {
                'sleep': raw_data.get('sleep', {}),
                'heart_rate': raw_data.get('heart_rate', {}),
                'user_summary': raw_data.get('user_summary', {}),
                'stress': raw_data.get('stress', {}),
                'body_battery': raw_data.get('body_battery', {})
            }

            if not daily_stats:
                logger.error(f"No daily stats found for {current_date}")
                return None

            # Build processed data
            sleep_data = daily_stats['sleep']
            heart_rate_data = daily_stats['heart_rate']
            user_summary = daily_stats['user_summary']
            stress_data = daily_stats['stress']

            return {
                'date': current_date,
                'source': 'garmin',
                'metrics': {
                    'total_sleep_seconds': sleep_data.get('sleepTimeSeconds', 0),
                    'deep_sleep_seconds': sleep_data.get('deepSleepSeconds', 0),
                    'light_sleep_seconds': sleep_data.get('lightSleepSeconds', 0),
                    'rem_sleep_seconds': sleep_data.get('remSleepSeconds', 0),
                    'awake_seconds': sleep_data.get('awakeSleepSeconds', 0),

                    'resting_heart_rate': heart_rate_data.get('restingHeartRate', 0),
                    'max_heart_rate': heart_rate_data.get('maxHeartRate', 0),
                    'min_heart_rate': heart_rate_data.get('minHeartRate', 0),

                    'total_calories': user_summary.get('totalKilocalories', 0),
                    'active_calories': user_summary.get('activeKilocalories', 0),
                    'total_distance_meters': user_summary.get('totalDistanceMeters', 0),
                    'total_steps': user_summary.get('totalSteps', 0),

                    'average_stress_level': stress_data.get('averageStressLevel', 0),
                    'max_stress_level': stress_data.get('maxStressLevel', 0),
                    'stress_duration_seconds': stress_data.get('stressDuration', 0),
                },
                'time_series': {
                    'heart_rate_values': heart_rate_data.get('heartRateValues', {}),
                    'sleep_heart_rate': sleep_data.get('sleepHeartRate', {}),
                    'stress_timeseries': stress_data.get('stressTimeseries', {}),
                }
            }
            
        except Exception as e:
            logger.error(f"Error processing Garmin data: {e}", exc_info=True)
            return None
    
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
    
    def _get_from_db(self, date_range: List[date], profile_type: Optional[str] = None) -> Optional[List[Dict[str, Any]]]:
        """Get data from DB for the specified dates."""
        try:
            data = CoreBiometricData.objects.filter(
                athlete=self.athlete,
                date__in=date_range,
                source='garmin'
            ).order_by('date')

            if not data.exists():
                return None

            results = []
            for item in data:
                # Translate DB fields back to the shape we expect
                results.append({
                    'date': item.date,
                    'source': 'garmin',
                    'metrics': {
                        'total_sleep_seconds': item.sleep_duration,
                        'deep_sleep_seconds': item.deep_sleep_duration,
                        'light_sleep_seconds': item.light_sleep_duration,
                        'rem_sleep_seconds': item.rem_sleep_duration,
                        'awake_seconds': item.awake_duration,
                        'resting_heart_rate': item.resting_heart_rate,
                        'max_heart_rate': item.max_heart_rate,
                        'min_heart_rate': item.min_heart_rate,
                        'total_calories': item.total_calories,
                        'active_calories': item.active_calories,
                        'total_steps': item.total_steps,
                        'total_distance_meters': item.total_distance_meters,
                        'average_stress_level': item.average_stress_level,
                        'max_stress_level': item.max_stress_level,
                        'stress_duration_seconds': item.stress_score
                    }
                })
            return results

        except Exception as e:
            logger.error(f"Error getting data from DB: {e}")
            return None
    
    def _get_from_s3(self, date_range: List[date], profile_type: Optional[str] = None) -> Optional[List[Dict[str, Any]]]:
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
    
    def _get_from_api(self, start_date: date, end_date: date, profile_type: Optional[str] = None) -> Optional[List[Dict[str, Any]]]:
        """
        Actually call Garmin's API collector, transform the raw data, and return it in the standard shape.
        """
        try:
            collector = GarminDataCollector({'username': settings.GARMIN_USERNAME, 'password': settings.GARMIN_PASSWORD})
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
        try:
            # TODO: Add validation of credentials
            # if not hasattr(self.athlete, 'garmin_credentials'):
            #     logger.error("No Garmin credentials found")
            #     return False

            # This is line 344 where you wanted to see the profile
            logger.info(f"Syncing Garmin data for athlete {self.athlete.id} using profile: {self.profile_type}")
            logger.info(f"Profile config: {self.athlete.garmin_credentials.get_profile_config()['name']}")
            
            

            return super().sync_data(start_date, end_date, self.profile_type)

        except Exception as e:
            logger.error(f"Error in Garmin sync: {e}")
            return False 