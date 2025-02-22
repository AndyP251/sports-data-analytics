from typing import Optional, Dict, Any, List
from datetime import date, timedelta
from ..exceptions import CollectorError
from .base_collector import BaseDataCollector
from core.models import Athlete
from core.utils.whoop_utils import WhoopClient
import logging

logger = logging.getLogger(__name__)

class WhoopCollector(BaseDataCollector):
    """Collector for Whoop data"""
    
    def __init__(self, athlete: Athlete):
        self.athlete = athlete
        self.whoop_client = None

    def authenticate(self) -> bool:
        """Authenticate with Whoop API"""
        try:
            if not hasattr(self.athlete, 'whoop_credentials'):
                raise CollectorError("No Whoop credentials found")
                
            self.whoop_client = WhoopClient(
                client_id=self.athlete.whoop_credentials.client_id,
                client_secret=self.athlete.whoop_credentials.client_secret,
                access_token=self.athlete.whoop_credentials.access_token,
                refresh_token=self.athlete.whoop_credentials.refresh_token
            )
            return True
        except Exception as e:
            logger.error(f"Whoop authentication failed: {e}")
            return False

    def validate_credentials(self) -> bool:
        """Validate stored Whoop credentials"""
        return self.authenticate()

    def collect_data(self, start_date: date, end_date: date) -> Optional[List[Dict[str, Any]]]:
        """Collect data from Whoop API"""
        try:
            if not self.whoop_client:
                if not self.authenticate():
                    raise CollectorError("Failed to authenticate with Whoop")

            raw_data = []
            current_date = start_date
            while current_date <= end_date:
                daily_stats = self.whoop_client.get_daily_stats(current_date)
                if daily_stats:
                    raw_data.append({
                        'date': current_date.strftime('%Y-%m-%d'),
                        'daily_stats': daily_stats
                    })
                current_date += timedelta(days=1)

            return raw_data

        except Exception as e:
            logger.error(f"Error collecting Whoop data: {e}")
            return None 
        


"""
example oauth collector:
import requests
from django.http import JsonResponse
from ..db_models.oauth_tokens import OAuthTokens

def get_whoop_profile(request):
    #Fetch WHOOP profile data using access token
    try:
        oauth_token = OAuthTokens.objects.get(user=request.user, provider='whoop')
        headers = {
            'Authorization': f"Bearer {oauth_token.access_token}"
        }

        response = requests.get('https://api.prod.whoop.com/users/profile', headers=headers)
        response.raise_for_status()  # Raise error for non-200 responses
        return JsonResponse(response.json(), safe=False)

    except OAuthTokens.DoesNotExist:
        return JsonResponse({'error': 'No WHOOP token found for user.'}, status=404)
    except requests.HTTPError as e:
        return JsonResponse({'error': f'Failed to fetch WHOOP data: {str(e)}'}, status=400)

"""