import requests
from datetime import datetime, timedelta
from django.conf import settings
from .s3_utils import S3Utils
from ..db_models.oauth_tokens import OAuthTokens
import json
from typing import Optional, Dict
import logging

logger = logging.getLogger(__name__)

class WhoopClient:
    BASE_URL = "https://api.whoop.com/v1"
    
    def __init__(self, user_id):
        self.user_id = user_id
        self.s3_utils = S3Utils()
        from core.models import Athlete
        self.whoop_credentials = Athlete.objects.get(
            user_id=user_id
        ).whoop_credentials

    def _get_headers(self):
        """Get authorization headers with current access token"""
        return {
            "Authorization": f"Bearer {self.whoop_credentials.decrypt_token(self.whoop_credentials.access_token)}",
            "Content-Type": "application/json"
        }

    def _refresh_token_if_needed(self):
        """Check and refresh token if it's close to expiring"""
        if self.whoop_credentials.expires_at - timedelta(minutes=5) <= datetime.now():
            self._refresh_token()

    def _refresh_token(self):
        """Refresh the OAuth token"""
        from core.api_views.oauth import refresh_whoop_token
        refresh_whoop_token(self.whoop_credentials)

    def get_formatted_data(self, date):
        """Collect all WHOOP data in a structured format"""
        self._refresh_token_if_needed()
        
        try:
            return {
                "date": date.strftime("%Y-%m-%d"),
                "timestamp": datetime.now().isoformat(),
                "daily_stats": {
                    "recovery": self._get_recovery_data(date),
                    "sleep": self._get_sleep_data(date),
                    "cycles": self._get_cycles_data(date),
                    "workout": self._get_workout_data(date),
                    "body_measurement": self._get_body_measurements(date)
                },
                "profile": self._get_profile_data()
            }
        except Exception as e:
            print(f"Error collecting WHOOP data: {e}")
            return None

    def collect_and_store_data(self):
        """Collect WHOOP data and store in S3"""
        try:
            today = datetime.now()
            dates = [today - timedelta(days=x) for x in range(2)]
            
            collected_data = []
            for date in dates:
                data = self.get_formatted_data(date)
                if data:
                    collected_data.append(data)
            
            if collected_data:
                # Store in S3 at accounts/{user_id}/biometric-data/whoop/
                s3_key = f"accounts/{self.user_id}/biometric-data/whoop/{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
                
                try:
                    self.s3_utils.s3_client.put_object(
                        Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                        Key=s3_key,
                        Body=json.dumps(collected_data),
                        ContentType='application/json'
                    )
                    print(f"Successfully stored WHOOP data at: {s3_key}")
                    return True
                except Exception as e:
                    print(f"Error storing data in S3: {e}")
                    return False
            
            return False
            
        except Exception as e:
            print(f"Error in collect_and_store_data: {e}")
            return False

    # Individual data collection methods
    def _get_recovery_data(self, date):
        """Get recovery data for a specific date"""
        try:
            response = requests.get(
                f"https://api.prod.whoop.com/developer/v1/recovery/{date.strftime('%Y-%m-%d')}",
                headers=self._get_headers()
            )
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            logger.error(f"Error getting recovery data: {e}")
            return None

    def _get_sleep_data(self, date):
        """Get sleep data for a specific date"""
        try:
            # First get sleep IDs for the date
            response = requests.get(
                "https://api.prod.whoop.com/developer/v1/activity/sleep",
                params={
                    'start': f"{date.strftime('%Y-%m-%d')}T00:00:00.000Z",
                    'end': f"{date.strftime('%Y-%m-%d')}T23:59:59.999Z"
                },
                headers=self._get_headers()
            )
            if response.status_code != 200:
                return None

            sleep_records = response.json().get('records', [])
            if not sleep_records:
                return None

            # Get detailed sleep data for the most recent sleep record
            sleep_id = sleep_records[0].get('id')
            if not sleep_id:
                return None

            detail_response = requests.get(
                f"https://api.prod.whoop.com/developer/v1/activity/sleep/{sleep_id}",
                headers=self._get_headers()
            )
            if detail_response.status_code == 200:
                return detail_response.json()
            return None
        except Exception as e:
            logger.error(f"Error getting sleep data: {e}")
            return None

    def _get_cycles_data(self, date):
        """Get cycle data for a specific date"""
        try:
            # First get cycle IDs for the date
            response = requests.get(
                "https://api.prod.whoop.com/developer/v1/cycle",
                params={
                    'start': f"{date.strftime('%Y-%m-%d')}T00:00:00.000Z",
                    'end': f"{date.strftime('%Y-%m-%d')}T23:59:59.999Z"
                },
                headers=self._get_headers()
            )
            if response.status_code != 200:
                return None

            cycle_records = response.json().get('records', [])
            if not cycle_records:
                return None

            # Get detailed cycle data for the most recent cycle
            cycle_id = cycle_records[0].get('id')
            if not cycle_id:
                return None

            detail_response = requests.get(
                f"https://api.prod.whoop.com/developer/v1/cycle/{cycle_id}",
                headers=self._get_headers()
            )
            if detail_response.status_code == 200:
                return detail_response.json()
            return None
        except Exception as e:
            logger.error(f"Error getting cycle data: {e}")
            return None

    def _get_workout_data(self, date):
        """Get workout data for a specific date"""
        try:
            # First get workout IDs for the date
            response = requests.get(
                "https://api.prod.whoop.com/developer/v1/activity/workout",
                params={
                    'start': f"{date.strftime('%Y-%m-%d')}T00:00:00.000Z",
                    'end': f"{date.strftime('%Y-%m-%d')}T23:59:59.999Z"
                },
                headers=self._get_headers()
            )
            if response.status_code != 200:
                return []

            workout_records = response.json().get('records', [])
            if not workout_records:
                return []

            # Get detailed data for each workout
            detailed_workouts = []
            for workout in workout_records:
                workout_id = workout.get('id')
                if not workout_id:
                    continue

                detail_response = requests.get(
                    f"https://api.prod.whoop.com/developer/v1/activity/workout/{workout_id}",
                    headers=self._get_headers()
                )
                if detail_response.status_code == 200:
                    detailed_workouts.append(detail_response.json())

            return detailed_workouts
        except Exception as e:
            logger.error(f"Error getting workout data: {e}")
            return []

    def _get_body_measurements(self, date):
        """Get body measurements for a specific date"""
        try:
            response = requests.get(
                "https://api.prod.whoop.com/developer/v1/user/measurement/body",
                params={
                    'start': f"{date.strftime('%Y-%m-%d')}T00:00:00.000Z",
                    'end': f"{date.strftime('%Y-%m-%d')}T23:59:59.999Z"
                },
                headers=self._get_headers()
            )
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            logger.error(f"Error getting body measurements: {e}")
            return None

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

    # Add other methods for sleep, cycles, workout, etc.
    # Following similar pattern as above 