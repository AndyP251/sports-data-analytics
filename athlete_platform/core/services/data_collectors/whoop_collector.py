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
            logger.info(f"[DEBUG]Unsigned token (first 10 chars): {self.access_token[:10]}")

            # self.access_token = whoop_creds.access_token

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

    def _get_all_records(self, url: str, params: dict = None) -> List[Dict]:
        """Get all records with pagination support"""
        try:
            all_records = []
            next_token = None
            
            while True:
                request_params = params.copy() if params else {}
                if next_token:
                    request_params['nextToken'] = next_token
                
                response = self.make_request('GET', url, request_params)
                
                if not response or 'records' not in response:
                    break
                    
                all_records.extend(response['records'])
                
                next_token = response.get('next_token')
                if not next_token:
                    break
                    
            return all_records
            
        except Exception as e:
            logger.error(f"Error getting paginated records: {e}")
            return []

    def _get_recovery_data(self, date):
        """Get recovery data for a specific date"""
        try:
            params = {
                'start': f"{date.strftime('%Y-%m-%d')}T00:00:00.000Z",
                'end': f"{date.strftime('%Y-%m-%d')}T23:59:59.999Z"
            }
            
            recovery_records = self._get_all_records(f"{self.BASE_URL}/recovery", params)
            
            if not recovery_records:
                return None
                
            # Get the detailed recovery data for the first record
            if recovery_record := recovery_records[0]:
                # Recovery data is already detailed in the records response
                return recovery_record.get('score', {})
                
            return None
            
        except Exception as e:
            logger.error(f"Error getting recovery data: {e}")
            return None

    def _get_cycle_recovery_data(self, cycle_id):
        """Get recovery data for a specific cycle"""
        try:
            recovery_data = self.make_request(
                'GET',
                f"{self.BASE_URL}/cycle/{cycle_id}/recovery"
            )
            
            return recovery_data.get('score', {}) if recovery_data else None
            
        except Exception as e:
            logger.error(f"Error getting cycle recovery data: {e}")
            return None

    def _get_data_for_date(self, date: date, data_type: str) -> Optional[Dict]:
        """Get data for a specific date and type with pagination support"""
        try:
            params = {
                'start': f"{date.strftime('%Y-%m-%d')}T00:00:00.000Z",
                'end': f"{date.strftime('%Y-%m-%d')}T23:59:59.999Z"
            }
            
            # Different endpoint structure for different data types
            if data_type == 'recovery':
                return self._get_recovery_data(date)
            elif data_type == 'sleep':
                url = f"{self.BASE_URL}/activity/sleep"
            elif data_type == 'workout':
                url = f"{self.BASE_URL}/activity/workout"
            elif data_type == 'cycle':
                url = f"{self.BASE_URL}/cycle"
            else:
                logger.error(f"Invalid data type: {data_type}")
                return None

            # For sleep, workout, and cycle, use pagination to get all records
            records = self._get_all_records(url, params)
            
            if not records:
                return None if data_type != 'workout' else []

            if data_type == 'workout':
                return self._get_detailed_workouts(records)
            elif data_type == 'sleep':
                return self._get_detailed_record('sleep', records[0])
            elif data_type == 'cycle':
                cycle_data = self._get_detailed_record('cycle', records[0])
                
                # Enhance cycle data with recovery data if available
                if cycle_data and (cycle_id := cycle_data.get('id')):
                    cycle_recovery = self._get_cycle_recovery_data(cycle_id)
                    if cycle_recovery:
                        cycle_data['recovery'] = cycle_recovery
                        
                return cycle_data
            else:
                return None

        except Exception as e:
            logger.error(f"Error getting {data_type} data: {e}")
            return None if data_type != 'workout' else []

    def _get_detailed_workouts(self, workout_records: List[Dict]) -> List[Dict]:
        """Get detailed data for each workout"""
        detailed_workouts = []
        for workout in workout_records:
            if workout_id := workout.get('id'):
                detail = self.make_request(
                    'GET',
                    f"{self.BASE_URL}/activity/workout/{workout_id}"
                )
                if detail:
                    # Extract relevant fields from the workout detail
                    workout_data = {
                        'id': detail.get('id'),
                        'start': detail.get('start'),
                        'end': detail.get('end'),
                        'sport_id': detail.get('sport_id'),
                        'score': detail.get('score', {})
                    }
                    detailed_workouts.append(workout_data)
        return detailed_workouts

    def _get_detailed_record(self, data_type: str, record: Dict) -> Optional[Dict]:
        """Get detailed data for a single record"""
        if not record or not (record_id := record.get('id')):
            return None

        try:
            if data_type == 'sleep':
                url = f"{self.BASE_URL}/activity/sleep/{record_id}"
            elif data_type == 'cycle':
                url = f"{self.BASE_URL}/cycle/{record_id}"
            else:
                logger.error(f"Unsupported data type for detailed record: {data_type}")
                return None

            detail = self.make_request('GET', url)
            if not detail:
                return None

            # Extract relevant fields based on data type
            if data_type == 'sleep':
                return {
                    'id': detail.get('id'),
                    'start': detail.get('start'),
                    'end': detail.get('end'),
                    'nap': detail.get('nap', False),
                    'score': detail.get('score', {})
                }
            elif data_type == 'cycle':
                return {
                    'id': detail.get('id'),
                    'start': detail.get('start'),
                    'end': detail.get('end'),
                    'score': detail.get('score', {})
                }

            return detail

        except Exception as e:
            logger.error(f"Error getting detailed {data_type} record: {e}")
            return None

    def _get_user_profile(self) -> Optional[Dict]:
        """Get user profile data"""
        try:
            return self.make_request(
                'GET',
                f"{self.BASE_URL}/user/profile/basic"
            )
        except Exception as e:
            logger.error(f"Error getting user profile: {e}")
            return None

    def _get_user_measurements(self) -> Optional[Dict]:
        """Get user body measurements"""
        try:
            return self.make_request(
                'GET',
                f"{self.BASE_URL}/user/measurement/body"
            )
        except Exception as e:
            logger.error(f"Error getting user measurements: {e}")
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
            
            # Get user profile and measurements once
            user_profile = self._get_user_profile()
            user_measurements = self._get_user_measurements()
            
            while current_date <= end_date:
                logger.info(f"Collecting WHOOP data for {current_date}")
                
                # Get all data types for this date
                cycle_data = self._get_data_for_date(current_date, 'cycle')
                sleep_data = self._get_data_for_date(current_date, 'sleep')
                recovery_data = self._get_data_for_date(current_date, 'recovery')
                workout_data = self._get_data_for_date(current_date, 'workout')
                
                daily_data = {
                    'date': current_date.strftime('%Y-%m-%d'),
                    'daily_stats': {
                        'recovery': recovery_data,
                        'sleep': sleep_data,
                        'workouts': workout_data,
                        'cycle': cycle_data
                    }
                }
                
                # Only add days with actual data
                if any(daily_data['daily_stats'].values()):
                    raw_data.append(daily_data)
                
                current_date += timedelta(days=1)

            # Add user profile and measurements to the first data point if available
            if raw_data and (user_profile or user_measurements):
                if user_measurements:
                    raw_data[0]['user_measurements'] = user_measurements
                if user_profile:
                    raw_data[0]['user_profile'] = user_profile

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
            if new_token:
                self.access_token = new_token.get('access_token')
                logger.info("WHOOP token refresh completed successfully")
                return True
            return False
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

        

