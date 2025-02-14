from datetime import datetime, timedelta
import traceback
from ..utils.garmin_utils import GarminDataCollector
from ..models import Athlete, CoreBiometricData, create_biometric_data, get_athlete_biometrics
from .storage_service import UserStorageService
import json
import boto3
import numpy as np
from django.conf import settings
import logging
from scipy import stats
import pandas as pd
from typing import Dict, Any, List
from django.core.cache import cache
from functools import wraps

logger = logging.getLogger(__name__)

def sync_lock(timeout=300):
    def decorator(func):
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            lock_id = f"sync_lock_{self.athlete.id}"
            
            # Check if sync is already running
            if cache.get(lock_id):
                logger.warning(f"Sync already in progress for athlete {self.athlete.id}")
                return False
            
            # Set lock with timeout
            cache.set(lock_id, True, timeout)
            
            try:
                result = func(self, *args, **kwargs)
                return result
            finally:
                cache.delete(lock_id)
        return wrapper
    return decorator

class DataSyncService:
    def __init__(self, athlete):
        self.athlete = athlete
        self.s3 = boto3.client(
            's3',
            region_name='us-east-2',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        self.bucket = 'athlete-platform-bucket'
        self.garmin_collector = GarminDataCollector()

    def _check_s3_data_exists(self, date_str):
        """Check if data already exists in S3 for a given date"""
        prefix = f'accounts/{self.athlete.user.id}/biometric-data/garmin/'
        try:
            response = self.s3.list_objects_v2(
                Bucket=self.bucket,
                Prefix=f"{prefix}{date_str}"
            )
            return 'Contents' in response and len(response['Contents']) > 0
        except Exception as e:
            logger.error(f"Error checking S3: {e}")
            return False

    @sync_lock()
    def sync_data(self):
        """Sync data from Garmin with locking mechanism."""
        try:
            # If you want to skip calling Garmin entirely if any day is in S3, you can check it first.
            # For each day, if it's in S3, skip. Otherwise, pull from Garmin.

            raw_data = self.garmin_collector.collect_data()
            if not raw_data:
                logger.error("No data received from Garmin")
                return False
            
            success = False
            processed_dates = set()

            for daily_data in raw_data:
                date = daily_data.get('date')
                if not date:
                    continue

                # Skip if already processed or if already on S3
                if date in processed_dates or self._check_s3_data_exists(date):
                    logger.info(f"Skipping data for date {date} (already on S3 or processed).")
                    continue

                # Process & save
                if self._process_and_save_data(daily_data):
                    success = True
                    processed_dates.add(date)
                    
                    # Only upload once DB is updated successfully
                    self._upload_to_s3(daily_data, date)

            return success

        except Exception as e:
            logger.error(f"Error in sync_data: {e}", exc_info=True)
            return False
        finally:
            cache.delete(f"sync_lock_{self.athlete.id}")

    def _upload_to_s3(self, data, date):
        """Upload data to S3 with proper error handling"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            key = f'accounts/{self.athlete.user.id}/biometric-data/garmin/{date}_{timestamp}.json'
            
            # Check if file already exists
            if self._check_s3_data_exists(date):
                logger.info(f"Data already exists in S3 for date {date}")
                return True
                
            self.s3.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=json.dumps(data)
            )
            logger.info(f"Successfully uploaded {key} to S3")
            return True
        except Exception as e:
            logger.error(f"Error uploading to S3: {e}")
            return False

    def _process_and_save_data(self, data):
        """Process and save a single day's data"""
        try:
            if not isinstance(data, dict):
                logger.debug(f"Data structure received: {type(data)}")
                # If it's a list of dictionaries, process each dictionary
                if isinstance(data, list):
                    success = False
                    for item in data:
                        if isinstance(item, dict) and self._process_single_day_data(item):
                            success = True
                    return success
                logger.error(f"Invalid data format: {type(data)}")
                return False
            
            return self._process_single_day_data(data)
            
        except Exception as e:
            logger.error(f"Error processing data: {e}")
            return False

    def _process_single_day_data(self, daily_data: dict):
        """Process a single day's data dictionary and save to DB."""
        try:
            # Extract date from the data
            date_str = daily_data.get('date')
            if not date_str:
                logger.error("No date found in daily_data; skipping.")
                return False

            date = datetime.strptime(date_str, '%Y-%m-%d').date()

            # Consolidate fields with safe defaults
            user_summary = daily_data.get('user_summary', {}) or {}
            sleep_data = daily_data.get('sleep', {}) or {}
            heart_rate_data = daily_data.get('heart_rate', {}) or {}

            processed_data = {
                # Sleep Data
                'sleep_time_seconds': sleep_data.get('sleepTimeSeconds', 0) or 0,
                'deep_sleep_seconds': sleep_data.get('deepSleepSeconds', 0) or 0,
                'light_sleep_seconds': sleep_data.get('lightSleepSeconds', 0) or 0,
                'rem_sleep_seconds': sleep_data.get('remSleepSeconds', 0) or 0,
                'awake_sleep': sleep_data.get('awakeSleepSeconds', 0) or 0,
                'average_respiration': sleep_data.get('averageRespirationValue', 0) or 0,
                'lowest_respiration': sleep_data.get('lowestRespirationValue', 0) or 0,
                'highest_respiration': sleep_data.get('highestRespirationValue', 0) or 0,
                'sleep_heart_rate': sleep_data.get('sleepHeartRate', []) or [],
                'sleep_stress': sleep_data.get('sleepStress', []) or [],
                'sleep_body_battery': sleep_data.get('sleepBodyBattery', []) or [],
                'body_battery_change': sleep_data.get('bodyBatteryChange', 0) or 0,
                'sleep_resting_heart_rate': sleep_data.get('sleepRestingHeartRate', 0) or 0,

                # Steps Data
                'steps': daily_data.get('steps', []) or [],

                # Heart Rate
                'resting_heart_rate': user_summary.get('restingHeartRate', 0) or 0,
                'max_heart_rate': user_summary.get('maxHeartRate', 0) or 0,
                'min_heart_rate': user_summary.get('minHeartRate', 0) or 0,
                'last_seven_days_avg_resting_heart_rate': user_summary.get('lastSevenDaysAvgRestingHeartRate', 0) or 0,
                'heart_rate_values': heart_rate_data.get('heartRateValues', []) or [],

                # Activity / Summary
                'total_calories': user_summary.get('totalKilocalories', 0) or 0,
                'active_calories': user_summary.get('activeKilocalories', 0) or 0,
                'bmr_calories': user_summary.get('bmrKilocalories', 0) or 0,
                'net_calorie_goal': user_summary.get('netCalorieGoal', 0) or 0,
                'total_distance_meters': user_summary.get('totalDistanceMeters', 0) or 0,
                'total_steps': user_summary.get('totalSteps', 0) or 0,
                'daily_step_goal': user_summary.get('dailyStepGoal', 0) or 0,
                'highly_active_seconds': user_summary.get('highlyActiveSeconds', 0) or 0,
                'sedentary_seconds': user_summary.get('sedentarySeconds', 0) or 0,
                'average_stress_level': user_summary.get('averageStressLevel', 0) or 0,
                'max_stress_level': user_summary.get('maxStressLevel', 0) or 0,
                'stress_duration': user_summary.get('stressDuration', 0) or 0,
                'rest_stress_duration': user_summary.get('restStressDuration', 0) or 0,
                'activity_stress_duration': user_summary.get('activityStressDuration', 0) or 0,
                'low_stress_percentage': user_summary.get('lowStressPercentage', 0) or 0,
                'medium_stress_percentage': user_summary.get('mediumStressPercentage', 0) or 0,
                'high_stress_percentage': user_summary.get('highStressPercentage', 0) or 0,
            }

            try:
                # Create or update using the create_biometric_data helper
                biometric_data = create_biometric_data(
                    athlete=self.athlete,
                    date=date,
                    data=processed_data
                )

                if biometric_data:
                    logger.info(f"Successfully processed data for {date}")
                    return True
                else:
                    logger.error(f"Failed to save data for {date}")
                    return False

            except Exception as e:
                logger.error(f"Error saving biometric data: {str(e)}")
                return False

        except Exception as e:
            logger.error(f"Error processing daily data: {str(e)}")
            return False

    def get_latest_data(self) -> Dict[str, Any]:
        """Get the latest data file from S3 and process all fields"""
        try:
            # List all files in athlete's directory
            prefix = f'accounts/{self.athlete.user.id}/biometric-data/garmin/'
            response = self.s3.list_objects_v2(
                Bucket=self.bucket,
                Prefix=prefix
            )

            if 'Contents' not in response:
                logger.warning(f"No files found for athlete {self.athlete.user.id}")
                return {}

            # Get the most recent file
            latest_file = max(
                response['Contents'],
                key=lambda x: x['LastModified']
            )

            # Get file content
            file_response = self.s3.get_object(
                Bucket=self.bucket,
                Key=latest_file['Key']
            )
            
            data = json.loads(file_response['Body'].read())
            return self._process_complete_data(data[0])

        except Exception as e:
            logger.error(f"Error getting data from S3: {e}", exc_info=True)
            return {}

    def _process_complete_data(self, raw_data: Dict) -> Dict[str, Any]:
        """Process every single field from the raw data"""
        processed = {
            'date': raw_data['date'],
            'timestamp': raw_data['timestamp'],
            
            # Sleep Metrics
            'sleep': {
                'total_sleep': raw_data['daily_stats']['sleep']['dailySleepDTO']['sleepTimeSeconds'] / 3600,
                'deep_sleep': raw_data['daily_stats']['sleep']['dailySleepDTO']['deepSleepSeconds'] / 3600,
                'light_sleep': raw_data['daily_stats']['sleep']['dailySleepDTO']['lightSleepSeconds'] / 3600,
                'rem_sleep': raw_data['daily_stats']['sleep']['dailySleepDTO']['remSleepSeconds'] / 3600,
                'awake_time': raw_data['daily_stats']['sleep']['dailySleepDTO']['awakeSleepSeconds'] / 3600,
                'sleep_start': datetime.fromtimestamp(
                    raw_data['daily_stats']['sleep']['dailySleepDTO']['sleepStartTimestampGMT'] / 1000
                ).isoformat(),
                'sleep_end': datetime.fromtimestamp(
                    raw_data['daily_stats']['sleep']['dailySleepDTO']['sleepEndTimestampGMT'] / 1000
                ).isoformat(),
                'respiration': {
                    'average': raw_data['daily_stats']['sleep']['dailySleepDTO']['averageRespirationValue'],
                    'lowest': raw_data['daily_stats']['sleep']['dailySleepDTO']['lowestRespirationValue'],
                    'highest': raw_data['daily_stats']['sleep']['dailySleepDTO']['highestRespirationValue']
                },
                'movement_data': raw_data['daily_stats']['sleep']['sleepMovement']
            },

            # Heart Rate & Activity
            'heart_rate': {
                'resting': raw_data['daily_stats']['user_summary']['restingHeartRate'],
                'min': raw_data['daily_stats']['user_summary']['minHeartRate'],
                'max': raw_data['daily_stats']['user_summary']['maxHeartRate'],
                'avg': raw_data['daily_stats']['user_summary'].get('averageHeartRate', 0)
            },

            # Stress & Recovery
            'stress': {
                'average_level': raw_data['daily_stats']['user_summary']['averageStressLevel'],
                'max_level': raw_data['daily_stats']['user_summary']['maxStressLevel'],
                'stress_duration': raw_data['daily_stats']['user_summary']['stressDuration'],
                'rest_stress_duration': raw_data['daily_stats']['user_summary']['restStressDuration'],
                'activity_stress_duration': raw_data['daily_stats']['user_summary']['activityStressDuration'],
                'low_stress_duration': raw_data['daily_stats']['user_summary']['lowStressDuration'],
                'medium_stress_duration': raw_data['daily_stats']['user_summary']['mediumStressDuration'],
                'high_stress_duration': raw_data['daily_stats']['user_summary']['highStressDuration']
            },

            # Activity & Energy
            'activity': {
                'total_steps': raw_data['daily_stats']['user_summary']['totalSteps'],
                'distance_meters': raw_data['daily_stats']['user_summary']['totalDistanceMeters'],
                'calories': {
                    'total': raw_data['daily_stats']['user_summary']['totalKilocalories'],
                    'active': raw_data['daily_stats']['user_summary']['activeKilocalories'],
                    'bmr': raw_data['daily_stats']['user_summary']['bmrKilocalories']
                },
                'intensity_minutes': {
                    'moderate': raw_data['daily_stats']['user_summary']['moderateIntensityMinutes'],
                    'vigorous': raw_data['daily_stats']['user_summary']['vigorousIntensityMinutes']
                }
            },

            # Body Battery
            'body_battery': {
                'charged': raw_data['daily_stats']['user_summary']['bodyBatteryChargedValue'],
                'drained': raw_data['daily_stats']['user_summary']['bodyBatteryDrainedValue'],
                'highest': raw_data['daily_stats']['user_summary']['bodyBatteryHighestValue'],
                'lowest': raw_data['daily_stats']['user_summary']['bodyBatteryLowestValue'],
                'most_recent': raw_data['daily_stats']['user_summary']['bodyBatteryMostRecentValue']
            }
        }

        # Add any activities if present
        if 'activities' in raw_data:
            processed['activities'] = raw_data['activities']

        return processed

    def save_to_database(self, processed_data: Dict[str, Any]) -> bool:
        """Save all processed data to appropriate database models"""
        try:
            # Update BiometricData model

            biometric_data = create_biometric_data(self.athlete, processed_data['date'], {
                'resting_heart_rate': processed_data['heart_rate']['resting'],
                'min_heart_rate': processed_data['heart_rate']['min'],
                'max_heart_rate': processed_data['heart_rate']['max'],
                'avg_heart_rate': processed_data['heart_rate']['avg'],
                'sleep_hours': processed_data['sleep']['total_sleep'],
                'deep_sleep': processed_data['sleep']['deep_sleep'],
                'light_sleep': processed_data['sleep']['light_sleep'],
                'rem_sleep': processed_data['sleep']['rem_sleep'],
                'awake_time': processed_data['sleep']['awake_time'],
                'calories_active': processed_data['activity']['calories']['active'],
                'calories_total': processed_data['activity']['calories']['total'],
                'steps': processed_data['activity']['total_steps'],
                'distance_meters': processed_data['activity']['distance_meters'],
                'intensity_minutes': (
                    processed_data['activity']['intensity_minutes']['moderate'] +
                    processed_data['activity']['intensity_minutes']['vigorous']
                )
            })

            # Save detailed data to other models as needed
            self._save_detailed_sleep(processed_data['sleep'])
            self._save_stress_details(processed_data['stress'])
            self._save_body_battery(processed_data['body_battery'])

            return True

        except Exception as e:
            logger.error(f"Error saving to database: {e}", exc_info=True)
            return False

    def get_s3_data(self, days=7):
        """Fetch the latest raw data files from S3 for each of the last X days."""
        try:
            base_path = f"accounts/{str(self.athlete.user.id)}/biometric-data/garmin/"
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            raw_data = []
            latest_files = {}

            # List objects in the S3 bucket
            paginator = self.s3.get_paginator("list_objects_v2")
            pages = paginator.paginate(Bucket=self.bucket, Prefix=base_path)

            for page in pages:
                for obj in page.get("Contents", []):
                    key = obj["Key"]
                    last_modified = obj["LastModified"]

                    # Filter only objects from the last `days` days
                    if last_modified >= cutoff_date:
                        date_str = last_modified.strftime("%Y-%m-%d")
                        
                        # Keep only the latest file for each date
                        if date_str not in latest_files or last_modified > latest_files[date_str]["LastModified"]:
                            latest_files[date_str] = {"Key": key, "LastModified": last_modified}

            # Fetch data from the latest files
            for date_str, file_info in latest_files.items():
                try:
                    data = self.s3.get_object(Bucket=self.bucket, Key=file_info["Key"])
                    json_data = json.loads(data["Body"].read().decode("utf-8"))
                    
                    # Ensure proper handling of the JSON structure
                    if isinstance(json_data, list):
                        raw_data.extend(json_data)
                    else:
                        raw_data.append(json_data)
                
                except Exception as e:
                    logger.error(f"Error processing S3 object {file_info['Key']}: {e}")

            return raw_data

        except Exception as e:
            logger.error(f"Error fetching S3 data: {e}")
            return []

    def get_detailed_heart_rate_data(self, hr_data):
        """Extract detailed heart rate data from raw measurements"""
        try:
            # Get all heart rate measurements for the day
            measurements = hr_data.get('detailed_measurements', [])
            if not measurements:
                return [], []
            
            # Convert to pandas for easier processing
            df = pd.DataFrame(measurements)
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            
            # Resample to minute intervals
            df_resampled = df.set_index('timestamp').resample('1T').mean()
            
            return (
                df_resampled.index.tolist(),
                df_resampled['value'].tolist()
            )
        except Exception as e:
            logger.error(f"Error processing detailed HR data: {e}")
            return [], []

    def calculate_hrv(self, hr_data):
        """Calculate HRV using RMSSD method from detailed heart rate data"""
        try:
            timestamps, hr_values = self.get_detailed_heart_rate_data(hr_data)
            if not hr_values or len(hr_values) < 2:
                return 0
            
            # Convert HR to RR intervals (in ms)
            rr_intervals = [60000 / hr for hr in hr_values if hr > 30 and hr < 200]  # Filter unrealistic values
            
            if len(rr_intervals) < 2:
                return 0
                
            # Calculate RMSSD
            differences = np.diff(rr_intervals)
            squared_diff = differences ** 2
            mean_squared_diff = np.mean(squared_diff)
            rmssd = np.sqrt(mean_squared_diff)
            
            # RMSSD typically ranges from 15-40 for healthy adults
            return min(max(round(rmssd, 2), 15), 100)
        except Exception as e:
            logger.error(f"Error calculating HRV: {e}")
            return 0

    def calculate_sleep_stages(self, sleep_data):
        """Calculate detailed sleep stages from raw sleep data"""
        try:
            sleep_segments = sleep_data.get('sleep_segments', [])
            if not sleep_segments:
                return self.estimate_sleep_stages(sleep_data.get('totalSleepTime', 0))
            
            deep_sleep = sum(seg['duration'] for seg in sleep_segments if seg['type'] == 'deep')
            light_sleep = sum(seg['duration'] for seg in sleep_segments if seg['type'] == 'light')
            rem_sleep = sum(seg['duration'] for seg in sleep_segments if seg['type'] == 'rem')
            awake_time = sum(seg['duration'] for seg in sleep_segments if seg['type'] == 'awake')
            
            # Convert to hours
            conversion = 3600
            return (
                round(deep_sleep / conversion, 2),
                round(light_sleep / conversion, 2),
                round(rem_sleep / conversion, 2),
                round((deep_sleep + light_sleep + rem_sleep) / conversion, 2),
                round(awake_time / conversion, 2)
            )
        except Exception as e:
            logger.error(f"Error calculating sleep stages: {e}")
            return self.estimate_sleep_stages(sleep_data.get('totalSleepTime', 0))

    def estimate_sleep_stages(self, total_sleep_time):
        """Estimate sleep stages based on typical percentages"""
        conversion = 3600
        total_hours = total_sleep_time / conversion
        return (
            round(total_hours * 0.20, 2),  # deep sleep ~20%
            round(total_hours * 0.55, 2),  # light sleep ~55%
            round(total_hours * 0.25, 2),  # REM sleep ~25%
            round(total_hours, 2),         # total sleep
            round(total_hours * 0.10, 2)   # awake time ~10%
        )

    def calculate_heart_rate_metrics(self, hr_data):
        """Calculate comprehensive heart rate metrics"""
        try:
            timestamps, hr_values = self.get_detailed_heart_rate_data(hr_data)
            if not hr_values:
                return {
                    'avg_hr': 0,
                    'max_hr': 0,
                    'min_hr': 0,
                    'resting_hr': 0,
                    'hrv': 0
                }
            
            # Convert to numpy array for calculations
            hr_array = np.array(hr_values)
            
            # Remove outliers using z-score
            z_scores = stats.zscore(hr_array)
            hr_filtered = hr_array[np.abs(z_scores) < 3]
            
            # Calculate metrics
            avg_hr = round(np.mean(hr_filtered))
            max_hr = round(np.max(hr_filtered))
            min_hr = round(np.min(hr_filtered))
            
            # Calculate resting heart rate (average of lowest 10% of readings)
            resting_hr = round(np.percentile(hr_filtered, 10))
            
            # Calculate HRV
            hrv = self.calculate_hrv(hr_data)
            
            return {
                'avg_hr': avg_hr,
                'max_hr': max_hr,
                'min_hr': min_hr,
                'resting_hr': resting_hr,
                'hrv': hrv
            }
        except Exception as e:
            logger.error(f"Error calculating heart rate metrics: {e}")
            return {
                'avg_hr': 0,
                'max_hr': 0,
                'min_hr': 0,
                'resting_hr': 0,
                'hrv': 0
            }

    def calculate_recovery_score(self, metrics):
        """Calculate comprehensive recovery score"""
        try:
            # HRV Score (30%)
            hrv_score = min(metrics['hrv'] / 100, 1) * 100 * 0.3
            
            # Sleep Score (30%)
            sleep_hours = metrics['total_sleep']
            sleep_score = min(sleep_hours / 8, 1) * 100 * 0.3
            
            # Resting HR Score (20%)
            rhr = metrics['resting_hr']
            rhr_score = (1 - min(max(rhr - 40, 0) / 40, 1)) * 100 * 0.2
            
            # Stress Score (20%)
            stress_score = (100 - metrics['stress_level']) * 0.2
            
            total_score = round(hrv_score + sleep_score + rhr_score + stress_score)
            return min(max(total_score, 0), 100)
        except Exception as e:
            logger.error(f"Error calculating recovery score: {e}")
            return 0

    def _process_raw_data(self, raw_data):
        """Process raw Garmin data into standardized format"""
        try:
            # Extract date
            date = datetime.strptime(raw_data.get('date'), '%Y-%m-%d').date()
            
            # Get daily stats
            daily_stats = raw_data.get('daily_stats', {})
            if not daily_stats:
                logger.error(f"No daily stats found for {date}, data: {raw_data}")
                
                return False

            # Extract sleep data
            sleep_data = daily_stats.get('sleep', {}).get('dailySleepDTO', {})
            user_summary = daily_stats.get('user_summary', {})
            heart_rate_data = daily_stats.get('heart_rate', {})
            stress_data = daily_stats.get('stress', {})

            processed_data = {
                'date': date,
                
                # Sleep metrics
                'total_sleep_seconds': sleep_data.get('sleepTimeSeconds', 0),
                'deep_sleep_seconds': sleep_data.get('deepSleepSeconds', 0),
                'light_sleep_seconds': sleep_data.get('lightSleepSeconds', 0),
                'rem_sleep_seconds': sleep_data.get('remSleepSeconds', 0),
                'awake_seconds': sleep_data.get('awakeSleepSeconds', 0),
                'average_respiration': sleep_data.get('averageRespirationValue', 0),
                'lowest_respiration': sleep_data.get('lowestRespirationValue', 0),
                'highest_respiration': sleep_data.get('highestRespirationValue', 0),
                'sleep_heart_rate': daily_stats.get('sleep_heart_rate', {}),
                'sleep_stress': daily_stats.get('sleep_stress', {}),
                'sleep_body_battery': daily_stats.get('sleep_body_battery', {}),
                'body_battery_change': daily_stats.get('body_battery_change', 0),
                'sleep_resting_heart_rate': sleep_data.get('sleepRestingHeartRate', 0),
                
                # Heart Rate Data
                'resting_heart_rate': heart_rate_data.get('restingHeartRate', 0),
                'max_heart_rate': heart_rate_data.get('maxHeartRate', 0),
                'min_heart_rate': heart_rate_data.get('minHeartRate', 0),
                'last_seven_days_avg_resting_heart_rate': heart_rate_data.get('lastSevenDaysAvgRestingHeartRate', 0),
                'heart_rate_values': heart_rate_data.get('heartRateValues', {}),
                
                # Activity Data
                'total_calories': user_summary.get('totalKilocalories', 0),
                'active_calories': user_summary.get('activeKilocalories', 0),
                'bmr_calories': user_summary.get('bmrKilocalories', 0),
                'net_calorie_goal': user_summary.get('netCalorieGoal', 0),
                'total_distance_meters': user_summary.get('totalDistanceMeters', 0),
                'total_steps': user_summary.get('totalSteps', 0),
                'daily_step_goal': user_summary.get('dailyStepGoal', 0),
                'highly_active_seconds': user_summary.get('highlyActiveSeconds', 0),
                'sedentary_seconds': user_summary.get('sedentarySeconds', 0),
                
                # Stress Data
                'average_stress_level': stress_data.get('averageStressLevel', 0),
                'max_stress_level': stress_data.get('maxStressLevel', 0),
                'stress_duration': stress_data.get('stressDuration', 0),
                'rest_stress_duration': stress_data.get('restStressDuration', 0),
                'activity_stress_duration': stress_data.get('activityStressDuration', 0),
                'low_stress_percentage': stress_data.get('lowStressPercentage', 0),
                'medium_stress_percentage': stress_data.get('mediumStressPercentage', 0),
                'high_stress_percentage': stress_data.get('highStressPercentage', 0),
            }

            return processed_data

        except Exception as e:
            logger.error(f"Error processing raw data: {e}", exc_info=True)
            return False

    def _store_processed_data(self, processed_data):
        """Store the processed data in the database"""
        try:
            # Get or create the BiometricData instance
            biometric_data, created = CoreBiometricData.objects.get_or_create(
                date=processed_data['date'],
                athlete=self.athlete,
                defaults={
                    'resting_heart_rate': processed_data['resting_heart_rate'],
                    'min_heart_rate': processed_data['min_hr'],
                    'max_heart_rate': processed_data['max_hr'],
                    'avg_heart_rate': processed_data['avg_heart_rate'],
                    'calories_active': processed_data['calories_active'],
                    'calories_total': processed_data['calories_total'],
                    'steps': processed_data['steps'],
                    'distance_meters': processed_data['distance_meters'],
                    'intensity_minutes': processed_data['intensity_minutes'],
                    'stress_level': processed_data['stress_level'],
                    'sleep_hours': processed_data['sleep_hours'],
                    'deep_sleep': processed_data['deep_sleep'],
                    'light_sleep': processed_data['light_sleep'],
                    'rem_sleep': processed_data['rem_sleep'],
                    'awake_time': processed_data['awake_time'],
                }
            )

            if not created:
                # Update existing record
                for key, value in processed_data.items():
                    setattr(biometric_data, key, value)
                biometric_data.save()

            return True

        except Exception as e:
            logger.error(f"Error storing processed data: {e}", exc_info=True)
            return False

    def _save_detailed_sleep(self, sleep_data):
        # Implementation of _save_detailed_sleep method
        pass

    def _save_stress_details(self, stress_data):
        # Implementation of _save_stress_details method
        pass

    def _save_body_battery(self, body_battery_data):
        # Implementation of _save_body_battery method
        pass 