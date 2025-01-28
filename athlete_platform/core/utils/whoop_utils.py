import requests
from datetime import datetime, timedelta
from django.conf import settings
from .s3_utils import S3Utils
from ..db_models.oauth_tokens import OAuthTokens
import json

class WhoopDataCollector:
    BASE_URL = "https://api.whoop.com/v1"
    
    def __init__(self, user_id):
        self.user_id = user_id
        self.s3_utils = S3Utils()
        self.oauth_tokens = OAuthTokens.objects.get(
            user_id=user_id,
            provider='whoop'
        )

    def _get_headers(self):
        """Get authorization headers with current access token"""
        return {
            "Authorization": f"Bearer {self.oauth_tokens.decrypt_token(self.oauth_tokens.access_token)}",
            "Content-Type": "application/json"
        }

    def _refresh_token_if_needed(self):
        """Check and refresh token if it's close to expiring"""
        if self.oauth_tokens.expires_at - timedelta(minutes=5) <= datetime.now():
            self._refresh_token()

    def _refresh_token(self):
        """Refresh the OAuth token"""
        response = requests.post(
            f"{self.BASE_URL}/oauth/token",
            data={
                "grant_type": "refresh_token",
                "refresh_token": self.oauth_tokens.decrypt_token(self.oauth_tokens.refresh_token),
                "client_id": settings.WHOOP_CLIENT_ID,
                "client_secret": settings.WHOOP_CLIENT_SECRET
            }
        )
        data = response.json()
        
        self.oauth_tokens.access_token = data["access_token"]
        self.oauth_tokens.refresh_token = data["refresh_token"]
        self.oauth_tokens.expires_at = datetime.now() + timedelta(seconds=data["expires_in"])
        self.oauth_tokens.save()

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
        response = requests.get(
            f"{self.BASE_URL}/recovery/{date.strftime('%Y-%m-%d')}",
            headers=self._get_headers()
        )
        return response.json()

    # Add other methods for sleep, cycles, workout, etc.
    # Following similar pattern as above 