# athlete_platform/core/utils/garmin_utils.py

import garminconnect
import logging
from datetime import date, timedelta
from typing import Optional, Dict, Any, List
from ..utils.encryption_utils import decrypt_value
logger = logging.getLogger(__name__)

class GarminDataCollector:
    def __init__(self, user_credentials=None):
        self.username = decrypt_value(user_credentials.get('username'))
        self.password = decrypt_value(user_credentials.get('password'))
        
        self.garmin_client = None

    def authenticate(self) -> bool:
        try:
            self.garmin_client = garminconnect.Garmin(self.username, self.password)
            self.garmin_client.login()
            return True
        except Exception as e:
            logger.error(f"Garmin authentication failed: {e}")
            return False

    def collect_data(self, start_date: date, end_date: date) -> Optional[List[Dict[str, Any]]]:
        """
        Collect data from Garmin Connect for all dates between start_date and end_date.
        """
        if not self.authenticate():
            logger.error("Failed to authenticate Garmin client.")
            return None

        data = []
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.strftime("%Y-%m-%d")
            try:
                daily_data = {
                    "date": date_str,
                    "sleep": self.garmin_client.get_sleep_data(date_str),
                    "heart_rate": self.garmin_client.get_heart_rates(date_str),
                    "steps": self.garmin_client.get_steps_data(date_str),
                    "body_comp": self.garmin_client.get_body_composition(date_str),
                    "user_summary": self.garmin_client.get_user_summary(date_str),
                    "stress": self.garmin_client.get_stress_data(date_str),
                }
                data.append(daily_data)
                logger.info(f"Collected data for {current_date}")
            except Exception as e:
                logger.error(f"Error collecting data for {current_date}: {e}")
            current_date += timedelta(days=1)

        if data:
            logger.info(f"Successfully collected {len(data)} day(s) of Garmin data")
        return data or None