from typing import Optional, Dict, Any, List
from datetime import date, timedelta
from ..exceptions import CollectorError
from .base_collector import BaseDataCollector
from core.models import Athlete
from core.utils.garmin_utils import GarminDataCollector
import logging

logger = logging.getLogger(__name__)

class GarminCollector(BaseDataCollector):
    """Collector for Garmin Connect data"""
    
    def __init__(self, athlete: Athlete):
        self.athlete = athlete
        self.garmin_client = None

    def authenticate(self) -> bool:
        """Authenticate with Garmin Connect"""
        try:
            if not hasattr(self.athlete, 'garmin_credentials'):
                raise CollectorError("No Garmin credentials found")
                
            self.garmin_client = GarminDataCollector(
                username=self.athlete.garmin_credentials.username,
                password=self.athlete.garmin_credentials.password
            )
            return True
        except Exception as e:
            logger.error(f"Garmin authentication failed: {e}")
            return False

    def validate_credentials(self) -> bool:
        """Validate stored Garmin credentials"""
        return self.authenticate()

    def collect_data(self, start_date: date, end_date: date) -> Optional[List[Dict[str, Any]]]:
        """Collect data from Garmin Connect"""
        try:
            if not self.garmin_client:
                if not self.authenticate():
                    raise CollectorError("Failed to authenticate with Garmin")

            raw_data = []
            current_date = start_date
            while current_date <= end_date:
                daily_data = {
                    'date': current_date,
                    'user_summary': self.garmin_client.get_user_summary(current_date),
                    'sleep': self.garmin_client.get_sleep_data(current_date),
                    'heart_rate': self.garmin_client.get_heart_rate_data(current_date),
                    'stress': self.garmin_client.get_stress_data(current_date),
                    'body_battery': self.garmin_client.get_body_battery(current_date)
                }
                raw_data.append(daily_data)
                current_date += timedelta(days=1)

            return raw_data

        except Exception as e:
            logger.error(f"Error collecting Garmin data: {e}")
            return None 