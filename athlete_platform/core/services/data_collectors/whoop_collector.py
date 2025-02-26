from typing import Optional, Dict, Any, List
from datetime import date, timedelta, datetime
from ..exceptions import CollectorError
from core.utils.s3_utils import S3Utils
from .base_collector import BaseDataCollector
from core.models import Athlete
import logging
import requests
from django.core.signing import Signer
import json

logger = logging.getLogger(__name__)

class WhoopCollector(BaseDataCollector):
    """Collector for Whoop data"""
    BASE_URL = "https://api.prod.whoop.com/developer/v1"
    
    def __init__(self, athlete: Athlete):
        self.athlete = athlete
        self.access_token = None
        self.s3_utils = S3Utils()

    def authenticate(self) -> bool:
        """Authenticate with Whoop API"""
        try:
            logger.info(f"Attempting WHOOP authentication for athlete {self.athlete.user.username}")
            
            if not hasattr(self.athlete, 'whoop_credentials'):
                logger.error(f"No WHOOP credentials found for athlete {self.athlete.user.username}")
                raise CollectorError("No Whoop credentials found")
                
            whoop_creds = self.athlete.whoop_credentials
            
            if whoop_creds.is_expired():
                logger.info(f"WHOOP token expired for athlete {self.athlete.user.username}, attempting refresh")
                if not self._refresh_token(whoop_creds):
                    logger.error(f"Failed to refresh WHOOP token for athlete {self.athlete.user.username}")
                    return False
            
            signer = Signer()
            self.access_token = signer.unsign(whoop_creds.access_token)
            logger.info(f"WHOOP authentication successful for athlete {self.athlete.user.username}")
            return True
            
        except Exception as e:
            logger.error(f"WHOOP authentication failed for athlete {self.athlete.user.username}: {e}")
            return False

    def _get_headers(self):
        """Get authorization headers with current access token"""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

    def make_request(self, method: str, url: str, params: dict = None) -> Optional[Dict]:
        """Make an authenticated request to the WHOOP API"""
        try:
            response = requests.request(
                method,
                url,
                headers=self._get_headers(),
                params=params
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"API request failed: {response.status_code} - {response.text}")
                return None
            
        except Exception as e:
            logger.error(f"Error making API request: {e}")
            return None

    def _get_recovery_data(self, date):
        """Get recovery data for a specific date"""
        try:
            response = self.make_request(
                'GET',
                f"{self.BASE_URL}/recovery/{date.strftime('%Y-%m-%d')}",
                params={
                    'start': f"{date.strftime('%Y-%m-%d')}T00:00:00.000Z",
                    'end': f"{date.strftime('%Y-%m-%d')}T23:59:59.999Z"
                }
            )
            return response
        except Exception as e:
            logger.error(f"Error getting recovery data: {e}")
            return None

    def _get_data_for_date(self, date: date, data_type: str) -> Optional[Dict]:
        """Get data for a specific date and type with pagination support"""
        try:
            all_records = []
            next_token = None
            
            while True:
                params = {
                    'start': f"{date.strftime('%Y-%m-%d')}T00:00:00.000Z",
                    'end': f"{date.strftime('%Y-%m-%d')}T23:59:59.999Z"
                }
                if next_token:
                    params['nextToken'] = next_token

                response = self.make_request(
                    'GET',
                    f"{self.BASE_URL}/activity/{data_type}",
                    params=params
                )
                
                if not response or 'records' not in response:
                    return None if data_type != 'workout' else []

                records = response['records']
                all_records.extend(records)
                
                next_token = response.get('next_token')
                if not next_token:
                    break

            if not all_records:
                return None if data_type != 'workout' else []

            if data_type == 'workout':
                return self._get_detailed_workouts(all_records)
            else:
                return self._get_detailed_record(data_type, all_records[0])

        except Exception as e:
            logger.error(f"Error getting {data_type} data: {e}")
            return None if data_type != 'workout' else []

    def _get_detailed_workouts(self, workout_records):
        """Get detailed data for each workout"""
        detailed_workouts = []
        for workout in workout_records:
            if workout_id := workout.get('id'):
                detail = self.make_request(
                    'GET',
                    f"{self.BASE_URL}/activity/workout/{workout_id}"
                )
                if detail:
                    detailed_workouts.append(detail)
        return detailed_workouts

    def _get_detailed_record(self, data_type: str, record: Dict):
        """Get detailed data for a single record"""
        if record_id := record.get('id'):
            return self.make_request(
                'GET',
                f"{self.BASE_URL}/activity/{data_type}/{record_id}"
            )
        return None

    def _get_from_api(self, start_date: date, end_date: date) -> Optional[List[Dict[str, Any]]]:
        """Get data directly from WHOOP API for the specified date range"""
        try:
            logger.info(f"Fetching WHOOP data from API for {start_date} to {end_date}")
            
            if not self.authenticate():
                logger.error("Failed to authenticate with WHOOP API")
                return None

            raw_data = []
            current_date = start_date
            
            while current_date <= end_date:
                daily_data = {
                    'date': current_date.strftime('%Y-%m-%d'),
                    'daily_stats': {
                        'recovery': self._get_data_for_date(current_date, 'recovery'),
                        'sleep': self._get_data_for_date(current_date, 'sleep'),
                        'workouts': self._get_data_for_date(current_date, 'workout'),
                        'cycle': self._get_data_for_date(current_date, 'cycle')
                    }
                }
                
                # Only add days with actual data
                if any(daily_data['daily_stats'].values()):
                    raw_data.append(daily_data)
                
                current_date += timedelta(days=1)

            if not raw_data:
                logger.warning(f"No WHOOP data found for date range {start_date} to {end_date}")
                return None

            logger.info(f"Successfully collected WHOOP data for {len(raw_data)} days")
            return raw_data

        except Exception as e:
            logger.error(f"Error fetching WHOOP data from API: {e}", exc_info=True)
            return None

    def _refresh_token(self, whoop_creds):
        """Refresh expired token"""
        try:
            logger.info("Starting WHOOP token refresh")
            from core.api_views.oauth import refresh_whoop_token
            new_token = refresh_whoop_token(whoop_creds)
            logger.info("WHOOP token refresh completed successfully")
            return True
        except Exception as e:
            logger.error(f"Failed to refresh WHOOP token: {e}")
            return False

    def validate_credentials(self) -> bool:
        """Validate stored Whoop credentials"""
        return self.authenticate()

    def collect_data(self, start_date: date, end_date: date) -> Optional[List[Dict[str, Any]]]:
        """Collect data from Whoop API"""
        try:
            logger.info(f"Starting WHOOP data collection for {start_date} to {end_date}")
            
            # First try to get data from API
            raw_data = self._get_from_api(start_date, end_date)
            
            if raw_data:
                logger.info(f"Successfully collected {len(raw_data)} days of WHOOP data")
                return raw_data
            else:
                logger.warning("Failed to collect WHOOP data")
                return None

        except Exception as e:
            logger.error(f"Error in WHOOP data collection: {e}", exc_info=True)
            return None

        

