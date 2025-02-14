from abc import ABC, abstractmethod
from typing import Dict, Any
from ..data_formats.biometric_format import StandardizedBiometricData

class BaseDataTransformer(ABC):
    """Base class for transforming source-specific data to standard format"""
    
    @abstractmethod
    def transform_to_standard_format(self, raw_data: Dict[str, Any]) -> StandardizedBiometricData:
        """Transform source-specific data into standardized format"""
        pass
    
    @abstractmethod
    def transform_to_source_format(self, standard_data: StandardizedBiometricData) -> Dict[str, Any]:
        """Transform standardized data back to source format if needed"""
        pass 