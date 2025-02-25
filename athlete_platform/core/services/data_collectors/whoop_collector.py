from typing import Optional, Dict, Any, List
from datetime import date, timedelta, datetime
from ..exceptions import CollectorError
from .base_collector import BaseDataCollector
from core.models import Athlete
from core.utils.whoop_utils import WhoopClient
import logging
import requests

logger = logging.getLogger(__name__)

class WhoopCollector(BaseDataCollector):
    """Collector for Whoop data"""
    
    def __init__(self, athlete: Athlete):
        self.athlete = athlete
        self.whoop_client = None

    def authenticate(self) -> bool:
        """Authenticate with Whoop API"""
        try:
            logger.info(f"Attempting WHOOP authentication for athlete {self.athlete.user.username}")
            
            if not hasattr(self.athlete, 'whoop_credentials'):
                logger.error(f"No WHOOP credentials found for athlete {self.athlete.user.username}")
                raise CollectorError("No Whoop credentials found")
                
            whoop_creds = self.athlete.whoop_credentials
            
            # Check if token is expired and refresh if needed
            if whoop_creds.is_expired():
                logger.info(f"WHOOP token expired for athlete {self.athlete.user.username}, attempting refresh")
                self._refresh_token(whoop_creds)
                logger.info("WHOOP token refresh successful")
            
            self.access_token = whoop_creds.access_token
            # Initialize the whoop client here
            self.whoop_client = WhoopClient(self.athlete.user.id)
            logger.info(f"WHOOP authentication successful for athlete {self.athlete.user.username}")
            return True
            
        except Exception as e:
            logger.error(f"WHOOP authentication failed for athlete {self.athlete.user.username}: {e}")
            return False

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

    def _get_from_api(self, start_date: date, end_date: date) -> Optional[List[Dict[str, Any]]]:
        """Get data directly from WHOOP API for the specified date range"""
        try:
            logger.info(f"Fetching WHOOP data from API for {start_date} to {end_date}")
            
            if not self.authenticate():
                logger.error("Failed to authenticate with WHOOP API")
                return None
            
            # Initialize the client after successful authentication
            self.whoop_client = WhoopClient(self.athlete.user.id)

            # Format dates as ISO strings
            start_iso = f"{start_date.isoformat()}T00:00:00.000Z"
            end_iso = f"{end_date.isoformat()}T23:59:59.999Z"
            
            raw_data = []
            
            # Fetch all data types with pagination
            data_types = {
                'recovery': 'activity/recovery',
                'sleep': 'activity/sleep',
                'workout': 'activity/workout',
                'cycle': 'activity/cycle'
            }
            
            for data_type, endpoint in data_types.items():
                logger.debug(f"Fetching {data_type} data")
                next_token = None
                
                while True:
                    try:
                        # Construct URL with pagination token if it exists
                        url = f"https://api.prod.whoop.com/developer/v1/{endpoint}"
                        params = {
                            'start': start_iso,
                            'end': end_iso
                        }
                        if next_token:
                            params['nextToken'] = next_token
                        
                        # Make API request
                        response = self.whoop_client.make_request('GET', url, params=params)
                        
                        if not response or 'records' not in response:
                            logger.warning(f"No {data_type} data returned from API")
                            break
                        
                        # Process records
                        records = response.get('records', [])
                        for record in records:
                            date_str = record.get('date') or record.get('created_at')
                            if not date_str:
                                continue
                                
                            # Convert to date object for comparison
                            record_date = datetime.fromisoformat(date_str.replace('Z', '+00:00')).date()
                            
                            # Find or create entry for this date
                            date_entry = next(
                                (item for item in raw_data if item['date'] == record_date.strftime('%Y-%m-%d')),
                                None
                            )
                            
                            if not date_entry:
                                date_entry = {
                                    'date': record_date.strftime('%Y-%m-%d'),
                                    'daily_stats': {
                                        'recovery': {},
                                        'sleep': {},
                                        'workouts': [],
                                        'cycle': {}
                                    }
                                }
                                raw_data.append(date_entry)
                            
                            # Add data to appropriate section
                            if data_type == 'workout':
                                date_entry['daily_stats']['workouts'].append(record)
                            else:
                                date_entry['daily_stats'][data_type] = record
                        
                        # Check for next page
                        next_token = response.get('next_token')
                        if not next_token:
                            break
                            
                    except Exception as e:
                        logger.warning(f"Error fetching {data_type} data: {e}")
                        break
            
            if not raw_data:
                logger.warning(f"No WHOOP data found for date range {start_date} to {end_date}")
                return None
                
            # Sort data by date
            raw_data.sort(key=lambda x: x['date'])
            
            logger.info(f"Successfully collected WHOOP data for {len(raw_data)} days")
            return raw_data

        except Exception as e:
            logger.error(f"Error fetching WHOOP data from API: {e}", exc_info=True)
            return None

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

    def make_request(self, method: str, url: str, params: dict = None) -> Optional[Dict]:
        """Make an authenticated request to the WHOOP API"""
        try:
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.request(
                method,
                url,
                headers=headers,
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
        

