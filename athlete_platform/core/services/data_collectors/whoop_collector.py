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

    def _get_from_api(self, start_date: date, end_date: date) -> Optional[List[Dict[str, Any]]]:
        """Get data directly from WHOOP API for the specified date range"""
        try:
            logger.info(f"Fetching WHOOP data from API for {start_date} to {end_date}")
            
            if not self.whoop_client:
                if not self.authenticate():
                    logger.error("Failed to authenticate with WHOOP API")
                    return None

            raw_data = []
            current_date = start_date
            
            while current_date <= end_date:
                logger.debug(f"Fetching WHOOP data for date: {current_date}")
                
                try:
                    # Get recovery data
                    recovery = self.whoop_client.get_recovery(current_date)
                    
                    # Get sleep data
                    sleep = self.whoop_client.get_sleep(current_date)
                    
                    # Get workout data
                    workouts = self.whoop_client.get_workouts(current_date)
                    
                    # Get strain data
                    strain = self.whoop_client.get_strain(current_date)
                    
                    # Combine all data for the day
                    daily_stats = {
                        'recovery': recovery,
                        'sleep': sleep,
                        'workouts': workouts,
                        'strain': strain
                    }
                    
                    raw_data.append({
                        'date': current_date.strftime('%Y-%m-%d'),
                        'daily_stats': daily_stats
                    })
                    
                    logger.debug(f"Successfully collected WHOOP data for {current_date}")
                    
                except Exception as e:
                    logger.warning(f"Failed to fetch WHOOP data for {current_date}: {e}")
                    # Continue to next date even if this one fails
                    
                current_date += timedelta(days=1)
                
            if not raw_data:
                logger.warning(f"No WHOOP data found for date range {start_date} to {end_date}")
                return None
                
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
        

