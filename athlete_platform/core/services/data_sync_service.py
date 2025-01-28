from datetime import datetime, timedelta
from ..utils.garmin_utils import GarminDataCollector
from ..models import BiometricData, Athlete
from .storage_service import UserStorageService
import json
import boto3
import numpy as np
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class DataSyncService:
    def __init__(self, athlete):
        self.athlete = athlete
        self.s3_client = boto3.client('s3', 
                                    region_name='us-east-2')  # Explicitly set region
        self.bucket_name = settings.AWS_STORAGE_BUCKET_NAME

    def get_s3_data(self, days=7):
        """Fetch raw data from S3 for the last X days"""
        try:
            base_path = f"accounts/{str(self.athlete.user.id)}/biometric-data/garmin/"
            
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=base_path
            )

            raw_data = []
            for obj in response.get('Contents', []):
                try:
                    data = self.s3_client.get_object(
                        Bucket=self.bucket_name,
                        Key=obj['Key']
                    )
                    json_data = json.loads(data['Body'].read().decode('utf-8'))
                    if isinstance(json_data, list):
                        raw_data.extend(json_data)
                    else:
                        raw_data.append(json_data)
                except Exception as e:
                    logger.error(f"Error processing S3 object {obj['Key']}: {e}")

            return raw_data
        except Exception as e:
            logger.error(f"Error fetching S3 data: {e}")
            return []

    def calculate_hrv(self, heart_rate_data):
        """Calculate HRV from raw heart rate data"""
        try:
            if not heart_rate_data or 'heartRateValues' not in heart_rate_data:
                return 0
            
            hr_values = heart_rate_data['heartRateValues']
            if len(hr_values) < 2:
                return 0
                
            rr_intervals = [60000 / hr for hr in hr_values if hr > 0]
            differences = np.diff(rr_intervals)
            squared_diff = differences ** 2
            mean_squared_diff = np.mean(squared_diff)
            rmssd = np.sqrt(mean_squared_diff)
            
            return round(rmssd, 2)
        except Exception as e:
            logger.error(f"Error calculating HRV: {e}")
            return 0

    def process_raw_data(self, raw_data):
        """Process raw data and calculate derived metrics"""
        try:
            for daily_data in raw_data:
                date = datetime.strptime(daily_data['date'], '%Y-%m-%d').date()
                daily_stats = daily_data.get('daily_stats', {})
                
                # Get raw data sections
                sleep_data = daily_stats.get('sleep', {})
                hr_data = daily_stats.get('heart_rate', {})
                body_comp = daily_stats.get('body_composition', {})
                steps_data = daily_stats.get('steps', {})
                user_summary = daily_stats.get('user_summary', {})

                # Calculate HRV if not present
                hrv_value = hr_data.get('hrvAverage', 0)
                if not hrv_value:
                    hrv_value = self.calculate_hrv(hr_data)

                # Process and store the data
                data = {
                    'date': date,
                    'sleep_hours': sleep_data.get('totalSleepTime', 0) / 3600 if sleep_data else 0,
                    'deep_sleep': sleep_data.get('deepSleepSeconds', 0) / 3600 if sleep_data else 0,
                    'light_sleep': sleep_data.get('lightSleepSeconds', 0) / 3600 if sleep_data else 0,
                    'rem_sleep': sleep_data.get('remSleepSeconds', 0) / 3600 if sleep_data else 0,
                    'awake_time': sleep_data.get('awakeSleepSeconds', 0) / 3600 if sleep_data else 0,
                    'sleep_score': sleep_data.get('sleepScore', 0),
                    'resting_heart_rate': hr_data.get('restingHeartRate', 0),
                    'max_heart_rate': hr_data.get('maxHeartRate', 0),
                    'avg_heart_rate': hr_data.get('averageHeartRate', 0),
                    'hrv': hrv_value,
                    'steps': steps_data.get('steps', 0),
                    'calories_active': user_summary.get('activeKilocalories', 0),
                    'calories_total': user_summary.get('totalKilocalories', 0),
                    'distance_meters': user_summary.get('distanceInMeters', 0),
                    'intensity_minutes': user_summary.get('intensityMinutes', 0),
                    'weight': body_comp.get('weight', 0),
                    'body_fat_percentage': body_comp.get('bodyFat', 0),
                    'bmi': body_comp.get('bmi', 0),
                    'stress_level': user_summary.get('averageStressLevel', 0),
                    'recovery_time': user_summary.get('recoveryTime', 0),
                }

                BiometricData.objects.update_or_create(
                    athlete=self.athlete,
                    date=date,
                    defaults=data
                )

            return True
        except Exception as e:
            logger.error(f"Error processing raw data: {e}")
            return False

    def sync_data(self, days=7):
        """Main method to sync data from S3 to database"""
        try:
            raw_data = self.get_s3_data(days)
            if raw_data:
                return self.process_raw_data(raw_data)
            return False
        except Exception as e:
            logger.error(f"Error in sync_data: {e}")
            return False 