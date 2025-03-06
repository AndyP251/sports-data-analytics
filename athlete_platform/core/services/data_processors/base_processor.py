from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from datetime import date, datetime, timedelta
from core.models import Athlete
import logging
from django.core.cache import cache
from functools import wraps
from django.utils import timezone
# from core.utils.cache_utils import resource_lock
from core.utils.validation_utils import DataValidator

logger = logging.getLogger(__name__)

def processing_lock(timeout=300):
    """Decorator to prevent concurrent processing for the same athlete and source"""
    def decorator(func):
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            lock_id = f"processing_lock_{self.athlete.id}_{self.source}"
            if cache.get(lock_id):
                logger.warning(f"Processing already in progress for athlete {self.athlete.id} source {self.source}")
                return False
            cache.set(lock_id, True, timeout)
            try:
                return func(self, *args, **kwargs)
            finally:
                cache.delete(lock_id)
        return wrapper
    return decorator

class BaseDataProcessor(ABC):
    """Base class for data processors with enhanced data flow control"""
    
    MINIMUM_RECORDS_THRESHOLD = 4

    def __init__(self, athlete: Athlete):
        self.athlete = athlete
        self.source = self.__class__.__name__.lower().replace('processor', '')
    
    def check_s3_freshness(self, date_range: List[date]) -> bool:
        """Check if S3 data is fresh for the given date range"""
        # Implementation specific to each source
        raise NotImplementedError
    
    def check_db_freshness(self, date_range: List[date]) -> bool:
        """Check if database data is fresh for the given date range"""
        try:
            start_date = min(date_range)
            end_date = max(date_range)
            
            count = self.athlete.biometric_data.filter(
                date__range=[start_date, end_date],
                source=self.source
            ).count()
            
            expected_days = (end_date - start_date).days + 1
            return count >= expected_days
            
        except Exception as e:
            logger.error(f"Error checking DB freshness: {e}")
            return False
    
    @abstractmethod
    def process_data(self, raw_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process raw data into standardized format"""
        pass
    
    @abstractmethod
    def validate_data(self, processed_data: Dict[str, Any]) -> bool:
        """Validate processed data"""
        pass
    
    # @resource_lock('processing')
    # def store_data(self, processed_data: Dict[str, Any], date: date) -> bool:
    #     """Store processed data with locking mechanism"""
    #     try:
    #         if not self.validate_data(processed_data):
    #             logger.error(f"Data validation failed for {date}")
    #             return False
            
    #         success = self._store_in_db(processed_data, date)
    #         if not success:
    #             return False
            
    #         return self._store_in_s3(processed_data, date)
            
    #     except Exception as e:
    #         logger.error(f"Error storing data from base processor: {e}")
    #         return False
    
    def _store_in_db(self, processed_data: Dict[str, Any], date: date) -> bool:
        """Store data in database"""
        raise NotImplementedError
    
    def _store_in_s3(self, processed_data: Dict[str, Any], date: date) -> bool:
        """Store data in S3"""
        raise NotImplementedError
    
    def get_data_flow(self, start_date: date, end_date: date) -> Optional[List[Dict[str, Any]]]:
        """
        Implement the data flow logic:
        1. Check DB for fresh data
        2. If not in DB, check S3
        3. If not in S3 or not fresh, fetch from API
        """
        date_range = [start_date + timedelta(days=x) for x in range((end_date - start_date).days + 1)]
        
        # First check DB
        if self.check_db_freshness(date_range):
            logger.info(f"Found fresh data in DB for {self.source}")
            return self._get_from_db(date_range)
        
        # Then check S3
        if self.check_s3_freshness(date_range):
            logger.info(f"Found fresh data in S3 for {self.source}")
            data = self._get_from_s3(date_range)
            if data:
                # Store in DB for faster future access
                for item in data:
                    self.store_data(item, item['date'])
                return data
        
        # Finally, fetch from API
        logger.info(f"Fetching fresh data from API for {self.source}")
        return self._get_from_api(date_range)
    
    @abstractmethod
    def _get_from_db(self, date_range: List[date]) -> Optional[List[Dict[str, Any]]]:
        """Get data from database"""

        pass
    
    @abstractmethod
    def _get_from_s3(self, date_range: List[date], profile_type: Optional[str] = None) -> Optional[List[Dict[str, Any]]]:
        """Get data from S3"""
        pass
    
    @abstractmethod
    def _get_from_api(self, date_range: List[date], profile_type: Optional[str] = None) -> Optional[List[Dict[str, Any]]]:
        """Get data from API"""
        pass

    @processing_lock()
    def sync_data(self, start_date: Optional[date] = None, end_date: Optional[date] = None) -> bool:
        """
        Base sync logic: 
          - if no data for requested range, attempt fetching
          - 1) get_from_db
          - 2) get_from_s3 for missing
          - 3) get_from_api for still missing
          - ...
          - store, etc.
          - If any step fails, return False
        """
        # TODO: Add validation of credentials
        if not start_date:
            start_date = date.today() - timedelta(days=7)
        if not end_date:
            end_date = date.today()

        data = self._get_from_db(start_date, end_date)
        if not data:
            s3_freshness = self.check_s3_freshness(start_date, end_date)
            if s3_freshness:
                data = self._get_from_s3(start_date, end_date)
            else:
                data = self._get_from_api(start_date, end_date)
        if not data:
            return False

        # Process and store data
        for item in data:
            self.store_data(item, item['date'])
        return True


    def clear_processing_lock(self) -> bool:
        """Clear any existing processing locks for this athlete/source"""
        try:
            lock_key = f"processing_lock_{self.athlete.id}_{self.source}"
            cache.delete(lock_key)
            logger.info(f"Cleared processing lock for athlete {self.athlete.id} source {self.source}")
            return True
        except Exception as e:
            logger.error(f"Error clearing processing lock: {e}")
            return False 
        
    def _safe_get(self, data, key, default=0):
        """Safely get a value from a dictionary with proper type handling"""
        if not data or key not in data:
            return default
            
        value = data.get(key)
        
        if value is None or value == "":
            return default
            
        # Handle all date/datetime fields
        date_fields = ['birthdate', 'date', 'created_at', 'updated_at']
        if key in date_fields:
            if isinstance(value, datetime):
                return value.date().isoformat()
            elif isinstance(value, date):
                return value.isoformat()
            elif isinstance(value, str):
                if value.strip() == "":  # Handle empty strings
                    return None
                return value
            return None  # Return None for invalid date values
            
        # Handle numeric values
        if isinstance(default, (int, float)):
            try:
                return float(value)
            except (ValueError, TypeError):
                return default
                
        return value