class BiometricDataError(Exception):
    """Base exception for biometric data errors"""
    pass

class ValidationError(BiometricDataError):
    """Raised when data validation fails"""
    pass

class SyncError(BiometricDataError):
    """Raised when data synchronization fails"""
    pass

class CollectorError(BiometricDataError):
    """Raised when data collection fails"""
    pass

class TransformerError(BiometricDataError):
    """Raised when data transformation fails"""
    pass

class StorageError(BiometricDataError):
    """Raised when data storage fails"""
    pass

class CredentialsError(BiometricDataError):
    """Raised when there are issues with source credentials"""
    pass 