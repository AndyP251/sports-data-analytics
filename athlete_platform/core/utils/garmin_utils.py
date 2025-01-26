import garminconnect
from datetime import datetime, timedelta
from django.conf import settings
from .s3_utils import S3Utils
import json

class GarminDataCollector:
    def __init__(self, user_credentials=None):
        # If user_credentials is provided, use those instead of default settings
        if user_credentials:
            self.username = user_credentials.get('username')
            self.password = user_credentials.get('password')
        else:
            self.username = settings.GARMIN_USERNAME
            self.password = settings.GARMIN_PASSWORD
        self.s3_utils = S3Utils()
        
    def get_formatted_data(self, garmin, date):
        """Collect all Garmin data in a structured format"""
        try:
            return {
                "date": date.strftime("%Y-%m-%d"),
                "timestamp": datetime.now().isoformat(),
                "daily_stats": {
                    "sleep": garmin.get_sleep_data(date.strftime("%Y-%m-%d")),
                    "steps": garmin.get_steps_data(date.strftime("%Y-%m-%d")),
                    "heart_rate": garmin.get_heart_rates(date.strftime("%Y-%m-%d")),
                    "user_summary": garmin.get_user_summary(date.strftime("%Y-%m-%d")),
                    "body_composition": garmin.get_body_composition(date.strftime("%Y-%m-%d"))
                },
                "activities": garmin.get_last_activity()
            }
        except Exception as e:
            print(f"Error collecting Garmin data: {e}")
            return None

    def collect_and_store_data(self, athlete_id):
        """Collect Garmin data and store in S3"""
        try:
            # Initialize and login to Garmin
            garmin = garminconnect.Garmin(self.username, self.password)
            garmin.login()
            
            # Get data for last 2 days
            today = datetime.now()
            dates = [today - timedelta(days=x) for x in range(2)]
            
            collected_data = []
            for date in dates:
                data = self.get_formatted_data(garmin, date)
                if data:
                    collected_data.append(data)
            
            # Store in S3
            if collected_data:
                self.s3_utils.store_athlete_data(
                    athlete_id,
                    'garmin_data',
                    collected_data
                )
                return True
            
            return False
            
        except Exception as e:
            print(f"Error in collect_and_store_data: {e}")
            return False 