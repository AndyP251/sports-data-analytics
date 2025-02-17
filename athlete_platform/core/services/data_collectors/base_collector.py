from abc import ABC, abstractmethod
from datetime import datetime, date
from typing import Optional, Dict, Any, List

class BaseDataCollector(ABC):
    """Base interface for all biometric data collectors"""
    
    @abstractmethod
    def collect_data(self, start_date: date, end_date: date) -> Optional[List[Dict[str, Any]]]:
        """Collect data for the given date range"""
        pass
    
    @abstractmethod
    def authenticate(self) -> bool:
        """Authenticate with the service"""
        pass
    
    @abstractmethod
    def validate_credentials(self) -> bool:
        """Validate stored credentials"""
        pass 