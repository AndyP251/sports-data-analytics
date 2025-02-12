import garminconnect
from datetime import datetime, timedelta, timezone
from django.conf import settings
import logging
from django.utils import timezone

logger = logging.getLogger(__name__)

DAYCOUNT = 4

class GarminDataCollector:
    def __init__(self, user_credentials=None):
        if user_credentials:
            self.username = user_credentials.get('username')
            self.password = user_credentials.get('password')
        else:
            self.username = settings.GARMIN_USERNAME
            self.password = settings.GARMIN_PASSWORD

    def collect_data(self):
        """Collect data from Garmin Connect API"""
        try:
            garmin = self._get_client()
            if not garmin:
                return None

            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=DAYCOUNT)
            
            # Collect a week's worth of data
            data = []
            current_date = start_date
            while current_date <= end_date:
                try:
                    date_str = current_date.strftime("%Y-%m-%d")
                    daily_data = {
                        "date": date_str,
                        "sleep": garmin.get_sleep_data(date_str),
                        "heart_rate": garmin.get_heart_rates(date_str),
                        "steps": garmin.get_steps_data(date_str),
                        "body_comp": garmin.get_body_composition(date_str),
                        "user_summary": garmin.get_user_summary(date_str),
                        "stress": garmin.get_stress_data(date_str)
                    }
                    data.append(daily_data)
                    logger.info(f"Collected data for {current_date}")
                except Exception as e:
                    logger.error(f"Error collecting data for {current_date}: {e}")
                
                current_date += timedelta(days=1)
            
            logger.info(f"Successfully collected {len(data)} days of Garmin data")
            return data
            
        except Exception as e:
            logger.error(f"Error collecting Garmin data: {e}")
            return None

    def _get_client(self):
        try:
            garmin = garminconnect.Garmin(self.username, self.password)
            garmin.login()
            return garmin
        except Exception as e:
            logger.error(f"Error initializing Garmin client: {e}")
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