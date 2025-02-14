from abc import ABC, abstractmethod
from datetime import date
from typing import Dict, Any, Optional
from core.models import CoreBiometricData, Athlete

class BaseDataProcessor(ABC):
    """Base interface for processing biometric data"""
    
    def __init__(self, athlete: Athlete):
        self.athlete = athlete
    
    @abstractmethod
    def process_data(self, raw_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process raw data into standardized format"""
        pass
    
    @abstractmethod
    def validate_data(self, processed_data: Dict[str, Any]) -> bool:
        """Validate processed data before storage"""
        pass
    
    @abstractmethod
    def store_data(self, processed_data: Dict[str, Any], date: date) -> bool:
        """Store processed data in database"""
        pass 