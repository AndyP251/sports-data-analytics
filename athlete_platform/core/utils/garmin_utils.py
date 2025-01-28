import garminconnect
from datetime import datetime, timedelta
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class GarminDataCollector:
    def __init__(self, user_credentials=None):
        if user_credentials:
            self.username = user_credentials.get('username')
            self.password = user_credentials.get('password')
        else:
            self.username = settings.GARMIN_USERNAME
            self.password = settings.GARMIN_PASSWORD

    def collect_data(self, days=2):
        """Collect raw Garmin data for the specified number of days"""
        try:
            # Initialize and login to Garmin
            garmin = garminconnect.Garmin(self.username, self.password)
            garmin.login()
            
            # Get dates for the last X days
            today = datetime.now()
            dates = [today - timedelta(days=x) for x in range(days)]
            
            collected_data = []
            for date in dates:
                data = self.get_formatted_data(garmin, date)
                if data:
                    collected_data.append(data)
            
            return collected_data
            
        except Exception as e:
            logger.error(f"Error in collect_data: {e}")
            return None

    def get_formatted_data(self, garmin, date):
        """Collect all Garmin data in a structured format"""
        try:
            date_str = date.strftime("%Y-%m-%d")
            return {
                "date": date_str,
                "timestamp": datetime.now().isoformat(),
                "daily_stats": {
                    "sleep": garmin.get_sleep_data(date_str),
                    "steps": garmin.get_steps_data(date_str),
                    "heart_rate": garmin.get_heart_rates(date_str),
                    "user_summary": garmin.get_user_summary(date_str),
                    "body_composition": garmin.get_body_composition(date_str)
                },
                "activities": garmin.get_last_activity()
            }
        except Exception as e:
            logger.error(f"Error collecting Garmin data: {e}")
            return None 