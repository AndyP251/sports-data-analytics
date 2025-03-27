from typing import Optional, Dict, Any, List
from datetime import date, timedelta, datetime
from ..exceptions import CollectorError
from core.utils.s3_utils import S3Utils
from .base_collector import BaseDataCollector
from core.models import Athlete
import logging
import requests
from django.core.signing import Signer
from django.core.cache import cache
from django.conf import settings
import json
import time
import random
import asyncio
from asgiref.sync import sync_to_async
from concurrent.futures import ThreadPoolExecutor
import threading
from functools import partial

logger = logging.getLogger(__name__)

class WhoopCollector(BaseDataCollector):
    """Collector for Whoop data"""
    BASE_URL = "https://api.prod.whoop.com/developer/v1"
    RATE_LIMIT_KEY_PREFIX = "whoop_rate_limit_"
    RATE_LIMIT_WINDOW = 8  # 1 minute window
    MAX_REQUESTS_PER_WINDOW = 45  # WHOOP's rate limit (reduced to be safe)
    
    def __init__(self, athlete: Athlete):
        self.athlete = athlete
        self.access_token = None
        self.s3_utils = S3Utils()
        self.request_count = 0
        self.rate_limited = False
        self.rate_limit_reset_time = 0
        self.thread_local = threading.local()
        self.executor = ThreadPoolExecutor(max_workers=4)

    def get_event_loop(self):
        """Get or create an event loop for the current thread"""
        if not hasattr(self.thread_local, 'loop'):
            try:
                self.thread_local.loop = asyncio.get_event_loop()
            except RuntimeError:
                self.thread_local.loop = asyncio.new_event_loop()
                asyncio.set_event_loop(self.thread_local.loop)
        return self.thread_local.loop

    def run_async(self, coro):
        """Run coroutine in the current thread's event loop"""
        loop = self.get_event_loop()
        if loop.is_running():
            # Create a new loop for this specific call
            new_loop = asyncio.new_event_loop()
            try:
                return new_loop.run_until_complete(coro)
            finally:
                new_loop.close()
        else:
            return loop.run_until_complete(coro)

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
                # Use the existing refresh_whoop_token function from oauth.py
                from core.api_views.oauth import refresh_whoop_token
                try:
                    refreshed_token = refresh_whoop_token(whoop_creds)
                    if refreshed_token:
                        logger.info(f"Successfully refreshed WHOOP token for athlete {self.athlete.user.username}")
                        # Get the updated credentials after refresh
                        whoop_creds = self.athlete.whoop_credentials
                    else:
                        logger.error(f"Failed to refresh WHOOP token for athlete {self.athlete.user.username}")
                        return False
                except Exception as e:
                    logger.error(f"Error refreshing WHOOP token: {e}")
                    return False
            
            # Unsign the access token
            signer = Signer()
            self.access_token = signer.unsign(whoop_creds.access_token)
            
            # Verify token works with a test API call
            test_response = self._verify_token()
            if not test_response:
                logger.error(f"WHOOP token validation failed for athlete {self.athlete.user.username}")
                return False

            logger.info(f"WHOOP authentication successful for athlete {self.athlete.user.username}")
            return True
            
        except Exception as e:
            logger.error(f"WHOOP authentication failed for athlete {self.athlete.user.username}: {e}")
            return False

    def _verify_token(self) -> bool:
        """Verify token is valid with a simple API call"""
        try:
            # Make a simple API call to verify token works
            response = requests.get(
                f"{self.BASE_URL}/user/profile/basic",
                headers=self._get_headers()
            )
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Error verifying token: {e}")
            return False

    def _get_headers(self):
        """Get authorization headers with current access token"""
        if self.access_token:
            return {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
        else:
            logger.error("No access token available for authorization headers")
            return None

    async def async_wait(self, seconds):
        """Non-blocking wait function using asyncio"""
        await asyncio.sleep(seconds)

    async def async_wait_for_rate_limit(self):
        """Asynchronous version of wait_for_rate_limit"""
        if not self.rate_limited:
            return
        
        current_time = int(time.time())
        if current_time < self.rate_limit_reset_time:
            wait_time = self.rate_limit_reset_time - current_time
            logger.info(f"Waiting for {wait_time} seconds for rate limit to reset...")
            
            MAX_SAFE_WAIT = 4
            remaining_wait = wait_time
            
            while remaining_wait > 0:
                chunk_wait = min(remaining_wait, MAX_SAFE_WAIT)
                logger.info(f"Waiting for {chunk_wait}s (part of total {wait_time}s wait)...")
                await asyncio.sleep(chunk_wait)
                remaining_wait -= chunk_wait
            
            self.rate_limited = False
            self.request_count = 0
            logger.info("Rate limit cooldown complete, resuming data collection")

    async def async_make_request(self, method: str, url: str, params: dict = None) -> Optional[Dict]:
        """Asynchronous version of make_request"""
        max_retries = 3
        retry_count = 0
        
        if self.rate_limited:
            await self.async_wait_for_rate_limit()
            
        if self.request_count >= self.MAX_REQUESTS_PER_WINDOW:
            logger.warning(f"Max request count reached ({self.request_count}/{self.MAX_REQUESTS_PER_WINDOW}). Implementing rate limit cooldown.")
            self.rate_limited = True
            self.rate_limit_reset_time = int(time.time()) + self.RATE_LIMIT_WINDOW
            await self.async_wait_for_rate_limit()
        
        while retry_count <= max_retries:
            try:
                if retry_count > 0:
                    jitter = random.uniform(0.1, 0.5)
                    backoff_time = (2 ** retry_count) + jitter
                    await asyncio.sleep(backoff_time)
                
                # Use ThreadPoolExecutor for the blocking requests call
                with ThreadPoolExecutor() as executor:
                    response = await sync_to_async(requests.request)(
                        method,
                        url,
                        headers=self._get_headers(),
                        params=params
                    )
                
                self.request_count += 1
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 429:
                    self.rate_limited = True
                    self.rate_limit_reset_time = int(time.time()) + self.RATE_LIMIT_WINDOW
                    await self.async_wait_for_rate_limit()
                    retry_count += 1
                    continue
                else:
                    logger.error(f"API request failed: {response.status_code} - {response.text}")
                    if 500 <= response.status_code < 600 and retry_count < max_retries:
                        retry_count += 1
                        continue
                    return None
                    
            except Exception as e:
                logger.error(f"Error making API request: {e}")
                retry_count += 1
                if retry_count <= max_retries:
                    continue
                return None
        
        return None

    async def _get_all_records_async(self, url: str, params: dict = None) -> List[Dict]:
        """Async version of get_all_records"""
        try:
            all_records = []
            next_token = None
            
            while True:
                request_params = params.copy() if params else {}
                if next_token:
                    request_params['nextToken'] = next_token
                
                response = await self.async_make_request('GET', url, request_params)
                
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

    def _get_all_records(self, url: str, params: dict = None) -> List[Dict]:
        """Synchronous wrapper for _get_all_records_async"""
        # Create a new event loop if one doesn't exist
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # We're inside an async context, use sync_to_async
                return loop.run_until_complete(self._get_all_records_async(url, params))
            else:
                # We're in a sync context, use asyncio.run
                return asyncio.run(self._get_all_records_async(url, params))
        except RuntimeError:
            # No event loop exists, create one
            return asyncio.run(self._get_all_records_async(url, params))

    async def _get_recovery_data_async(self, date):
        """Async version of _get_recovery_data"""
        try:
            params = {
                'start': f"{date.strftime('%Y-%m-%d')}T00:00:00.000Z",
                'end': f"{date.strftime('%Y-%m-%d')}T23:59:59.999Z"
            }
            
            recovery_records = await self._get_all_records_async(f"{self.BASE_URL}/recovery", params)
            
            if not recovery_records:
                return None
                
            if recovery_record := recovery_records[0]:
                return recovery_record.get('score', {})
                
            return None
            
        except Exception as e:
            logger.error(f"Error getting recovery data: {e}")
            return None

    async def _get_cycle_recovery_data_async(self, cycle_id):
        """Async version of _get_cycle_recovery_data"""
        try:
            recovery_data = await self.async_make_request(
                'GET',
                f"{self.BASE_URL}/cycle/{cycle_id}/recovery"
            )
            
            return recovery_data.get('score', {}) if recovery_data else None
            
        except Exception as e:
            logger.error(f"Error getting cycle recovery data: {e}")
            return None

    async def _get_data_for_date_async(self, date: date, data_type: str) -> Optional[Dict]:
        """Async version of _get_data_for_date"""
        try:
            params = {
                'start': f"{date.strftime('%Y-%m-%d')}T00:00:00.000Z",
                'end': f"{date.strftime('%Y-%m-%d')}T23:59:59.999Z"
            }
            
            if data_type == 'recovery':
                return await self._get_recovery_data_async(date)
            elif data_type == 'sleep':
                url = f"{self.BASE_URL}/activity/sleep"
            elif data_type == 'workout':
                url = f"{self.BASE_URL}/activity/workout"
            elif data_type == 'cycle':
                url = f"{self.BASE_URL}/cycle"
            else:
                logger.error(f"Invalid data type: {data_type}")
                return None

            records = await self._get_all_records_async(url, params)
            
            if not records:
                return None if data_type != 'workout' else []

            if data_type == 'workout':
                return await self._get_detailed_workouts_async(records)
            elif data_type == 'sleep':
                return await self._get_detailed_record_async('sleep', records[0])
            elif data_type == 'cycle':
                cycle_data = await self._get_detailed_record_async('cycle', records[0])
                
                if cycle_data and (cycle_id := cycle_data.get('id')):
                    cycle_recovery = await self._get_cycle_recovery_data_async(cycle_id)
                    if cycle_recovery:
                        cycle_data['recovery'] = cycle_recovery
                        
                return cycle_data
            else:
                return None

        except Exception as e:
            logger.error(f"Error getting {data_type} data: {e}")
            return None if data_type != 'workout' else []

    def _get_data_for_date(self, date: date, data_type: str) -> Optional[Dict]:
        """Thread-safe synchronous wrapper for _get_data_for_date_async"""
        def _run_get_data():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                return loop.run_until_complete(self._get_data_for_date_async(date, data_type))
            finally:
                loop.close()
        
        return self.executor.submit(_run_get_data).result()

    async def _get_detailed_workouts_async(self, workout_records: List[Dict]) -> List[Dict]:
        """Async version of _get_detailed_workouts"""
        detailed_workouts = []
        
        for workout in workout_records:
            if workout_id := workout.get('id'):
                detail = await self.async_make_request(
                    'GET',
                    f"{self.BASE_URL}/activity/workout/{workout_id}"
                )
                if detail:
                    workout_data = {
                        'id': detail.get('id'),
                        'start': detail.get('start'),
                        'end': detail.get('end'),
                        'sport_id': detail.get('sport_id'),
                        'score': detail.get('score', {})
                    }
                    detailed_workouts.append(workout_data)
        return detailed_workouts

    async def _get_detailed_record_async(self, data_type: str, record: Dict) -> Optional[Dict]:
        """Async version of _get_detailed_record"""
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

            detail = await self.async_make_request('GET', url)
            if not detail:
                return None

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

    def validate_credentials(self) -> bool:
        """Validate stored Whoop credentials"""
        return self.authenticate()

    async def async_collect_data(self, start_date: Optional[date] = None, end_date: Optional[date] = None) -> Optional[List[Dict]]:
        """Asynchronous data collection"""
        try:
            logger.info(f"Starting WHOOP data collection for athlete {self.athlete.user.username}")
            
            # Use sync_to_async for authenticate since it's a sync method
            if not await sync_to_async(self.authenticate)():
                return None
            
            if not start_date:
                start_date = date.today()
            if not end_date:
                end_date = date.today()
            
            logger.info(f"Collecting WHOOP data for {self.athlete.user.username} from {start_date} to {end_date}")
            
            # Get user profile data using async method
            user_profile = await self.async_make_request('GET', f"{self.BASE_URL}/user/profile/basic")
            
            # Reset rate limit tracking
            self.request_count = 0
            self.rate_limited = False
            
            results = []
            current_date = start_date
            while current_date <= end_date:
                date_str = current_date.strftime('%Y-%m-%d')
                logger.info(f"Collecting WHOOP data for {date_str}")
                
                try:
                    if self.rate_limited:
                        await self.async_wait_for_rate_limit()
                    
                    # Use async methods directly
                    sleep_data = await self._get_data_for_date_async(current_date, 'sleep')
                    recovery_data = await self._get_data_for_date_async(current_date, 'recovery')
                    cycle_data = await self._get_data_for_date_async(current_date, 'cycle')
                    workout_data = await self._get_data_for_date_async(current_date, 'workout')
                    
                    daily_data = {
                        'date': date_str,
                        'daily_stats': {
                            'date': date_str,
                            'sleep_data': sleep_data,
                            'recovery_data': recovery_data,
                            'cycle_data': cycle_data,
                            'workout_data': workout_data
                        },
                        'user_profile': user_profile
                    }
                    
                    if self._verify_data_structure(daily_data):
                        results.append(daily_data)
                    
                except Exception as e:
                    logger.error(f"Error collecting WHOOP data for {date_str}: {e}", exc_info=True)
                    results.append({
                        'date': date_str,
                        'daily_stats': {
                            'date': date_str,
                            'sleep_data': {},
                            'recovery_data': {},
                            'cycle_data': {},
                            'workout_data': []
                        },
                        'error': str(e)
                    })
                
                current_date += timedelta(days=1)
            
            results.sort(key=lambda x: x['date'])
            return results
            
        except Exception as e:
            logger.error(f"WHOOP data collection failed: {e}", exc_info=True)
            return None

    def _verify_data_structure(self, data: Dict) -> bool:
        """Verify data structure integrity
        
        Args:
            data (Dict): Data to verify
            
        Returns:
            bool: True if data structure is valid
        """
        try:
            # Check for required top-level fields
            if not isinstance(data, dict):
                logger.warning("Data is not a dictionary")
                return False
            
            if 'date' not in data:
                logger.warning("Missing date in data")
                return False
            
            if 'daily_stats' not in data or not isinstance(data['daily_stats'], dict):
                logger.warning("Missing or invalid daily_stats in data")
                return False
            
            # Check that daily_stats has date field
            daily_stats = data['daily_stats']
            if 'date' not in daily_stats:
                logger.warning("Missing date in daily_stats")
                return False
            
            # All checks passed
            return True
        except Exception as e:
            logger.error(f"Error verifying data structure: {e}")
            return False

    def collect_data(self, start_date: Optional[date] = None, end_date: Optional[date] = None) -> Optional[List[Dict]]:
        """Thread-safe synchronous wrapper for async_collect_data"""
        def _run_collect():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                return loop.run_until_complete(self.async_collect_data(start_date, end_date))
            finally:
                loop.close()
        
        return self.executor.submit(_run_collect).result()

    def make_request(self, method: str, url: str, params: dict = None) -> Optional[Dict]:
        """Thread-safe synchronous wrapper for async_make_request"""
        def _run_request():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                return loop.run_until_complete(self.async_make_request(method, url, params))
            finally:
                loop.close()
        
        # Run in a separate thread using the executor
        return self.executor.submit(_run_request).result()

    def __del__(self):
        """Cleanup resources"""
        if hasattr(self, 'executor'):
            self.executor.shutdown(wait=False)

        

