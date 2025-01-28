from ..utils.garmin_utils import GarminDataCollector
from ..utils.whoop_utils import WhoopDataCollector
from ..models import BiometricData
from datetime import datetime
from django.utils import timezone
import logging
import boto3
from django.conf import settings
import json

logger = logging.getLogger(__name__)

class DataPipelineService:
    def __init__(self, athlete):
        self.athlete = athlete
        self.s3_client = boto3.client('s3')
        self.bucket_name = settings.AWS_STORAGE_BUCKET_NAME

    def upload_to_s3(self, data, file_name):
        """Upload data to S3 bucket"""
        try:
            file_path = f"accounts/{str(self.athlete.user.id)}/biometric-data/garmin/{file_name}"
            
            # Ensure data is properly serialized as JSON
            if not isinstance(data, str):
                data = json.dumps(data, indent=2)
                
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=file_path,
                Body=data,
                ContentType='application/json'
            )
            logger.info(f"Successfully uploaded {file_path} to S3")
            return True
        except Exception as e:
            logger.error(f"Failed to upload to S3: {str(e)}")
            return False

    def process_and_store_garmin_data(self, raw_data):
        """Process raw Garmin data and store in database"""
        try:
            for daily_data in raw_data:
                date = datetime.strptime(daily_data['date'], '%Y-%m-%d').date()
                daily_stats = daily_data.get('daily_stats', {})
                
                sleep_data = daily_stats.get('sleep', {})
                hr_data = daily_stats.get('heart_rate', {})
                body_comp = daily_stats.get('body_composition', {})
                steps_data = daily_stats.get('steps', {})
                user_summary = daily_stats.get('user_summary', {})
                
                # Helper function to safely get nested values
                def get_nested(data, *keys, default=0):
                    current = data
                    for key in keys:
                        if not isinstance(current, dict):
                            return default
                        current = current.get(key, default)
                    return current if current is not None else default

                data = {
                    'date': date,
                    # Sleep metrics
                    'sleep_hours': get_nested(sleep_data, 'totalSleepTime', default=0) / 3600,
                    'deep_sleep': get_nested(sleep_data, 'deepSleepSeconds', default=0) / 3600,
                    'light_sleep': get_nested(sleep_data, 'lightSleepSeconds', default=0) / 3600,
                    'rem_sleep': get_nested(sleep_data, 'remSleepSeconds', default=0) / 3600,
                    'awake_time': get_nested(sleep_data, 'awakeSleepSeconds', default=0) / 3600,
                    'sleep_score': get_nested(sleep_data, 'sleepScore', default=0),
                    
                    # Heart rate metrics
                    'resting_heart_rate': get_nested(hr_data, 'restingHeartRate', default=0),
                    'max_heart_rate': get_nested(hr_data, 'maxHeartRate', default=0),
                    'avg_heart_rate': get_nested(hr_data, 'averageHeartRate', default=0),
                    'hrv': get_nested(hr_data, 'hrvAverage', default=0),
                    
                    # Activity metrics
                    'steps': get_nested(steps_data, 'steps', default=0),
                    'calories_active': get_nested(user_summary, 'activeKilocalories', default=0),
                    'calories_total': get_nested(user_summary, 'totalKilocalories', default=0),
                    'distance_meters': get_nested(user_summary, 'distanceInMeters', default=0),
                    'intensity_minutes': get_nested(user_summary, 'intensityMinutes', default=0),
                    
                    # Body metrics
                    'weight': get_nested(body_comp, 'weight', default=0),
                    'body_fat_percentage': get_nested(body_comp, 'bodyFat', default=0),
                    'bmi': get_nested(body_comp, 'bmi', default=0),
                    
                    # Stress and recovery
                    'stress_level': get_nested(user_summary, 'averageStressLevel', default=0),
                    'recovery_time': get_nested(user_summary, 'recoveryTime', default=0),
                }
                
                biometric_data, created = BiometricData.objects.update_or_create(
                    athlete=self.athlete,
                    date=date,
                    defaults=data
                )
            
            return True
        except Exception as e:
            logger.error(f"Error processing Garmin data: {e}")
            return False

    def update_athlete_data(self):
        """Update both Garmin and WHOOP data"""
        success_messages = []
        error_messages = []

        # Update Garmin Data
        try:
            garmin_collector = GarminDataCollector()
            raw_data = garmin_collector.collect_data()
            
            if raw_data:
                # Use ISO format timestamp
                timestamp = datetime.now().isoformat().replace(':', '-').replace('.', '-')
                if self.upload_to_s3(raw_data, f"garmin_data_{timestamp}.json"):
                    success_messages.append("Raw Garmin data uploaded to S3 successfully")
                    
                    # Process and store in database
                    if self.process_and_store_garmin_data(raw_data):
                        success_messages.append("Garmin data processed and stored in DB successfully")
                    else:
                        error_messages.append("Failed to process and store Garmin data in DB")
                else:
                    error_messages.append("Failed to upload raw Garmin data to S3")
            else:
                error_messages.append("Failed to collect Garmin data")
        except Exception as e:
            error_messages.append(f"Garmin error: {str(e)}")

        # Update WHOOP Data
        # try:
        #     whoop_collector = WhoopDataCollector(self.athlete.user.id)
        #     if whoop_collector.collect_and_store_data():
        #         success_messages.append("WHOOP data updated successfully")
        #     else:
        #         error_messages.append("Failed to update WHOOP data")
        # except Exception as e:
        #     error_messages.append(f"WHOOP error: {str(e)}")

        if error_messages:
            return False, " | ".join(error_messages)
        return True, " | ".join(success_messages) 