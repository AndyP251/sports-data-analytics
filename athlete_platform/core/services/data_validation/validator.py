from typing import Dict, Any, List, Optional
from ..data_formats.biometric_format import StandardizedBiometricData
import logging
from datetime import datetime, date

logger = logging.getLogger(__name__)

class BiometricDataValidator:
    """Validates biometric data for consistency and completeness"""
    
    @staticmethod
    def validate_data(data: StandardizedBiometricData) -> bool:
        """Validate a single standardized data point"""
        logger.info(f"Validating data of type: {type(data)} and length: {len(data)}")
        try:
            # Check required fields
            if not data.get('date') or not isinstance(data['date'], (datetime, date)):
                logger.error("Missing or invalid date")
                return False

            if not data.get('source'):
                logger.error("Missing source identifier")
                return False

            # Validate sleep metrics with warnings
            sleep = data.get('sleep', {})
            sleep_fields = ['sleep_time_seconds', 'deep_sleep_seconds', 
                           'light_sleep_seconds', 'rem_sleep_seconds']
            invalid_sleep_fields = [
                field for field in sleep_fields 
                if not isinstance(sleep.get(field), (int, type(None)))
            ]
            if invalid_sleep_fields:
                logger.warning(f"Invalid sleep metrics types for fields: {invalid_sleep_fields}")
            
            # Check if all sleep metrics are None/0
            if all(not sleep.get(field) for field in sleep_fields):
                logger.warning("All sleep metrics are empty or zero")

            # Validate heart rate metrics with warnings
            heart_rate = data.get('heart_rate', {})
            hr_fields = ['resting_heart_rate', 'max_heart_rate', 'min_heart_rate']
            invalid_hr_fields = [
                field for field in hr_fields 
                if not isinstance(heart_rate.get(field), (int, type(None)))
            ]
            if invalid_hr_fields:
                logger.warning(f"Invalid heart rate metrics types for fields: {invalid_hr_fields}")
            
            # Check if all heart rate metrics are None/0
            if all(not heart_rate.get(field) for field in hr_fields):
                logger.warning("All heart rate metrics are empty or zero")

            # Instead of failing, we'll warn about empty data
            if all(not heart_rate.get(field) for field in heart_rate.keys()):
                logger.warning("All heart rate data is empty")
            if all(not sleep.get(field) for field in sleep.keys()):
                logger.warning("All sleep data is empty")

            # Only fail validation if we have invalid types (not just empty values)
            if invalid_sleep_fields or invalid_hr_fields:
                logger.error("Found invalid data types in metrics")
                return False

            return True

        except Exception as e:
            logger.error(f"Validation error: {e}")
            return False

    @staticmethod
    def validate_time_series(data_list: List[StandardizedBiometricData]) -> bool:
        """Validate a series of data points for consistency"""
        try:
            if not data_list:
                return False

            # Check for duplicate dates
            dates = [d['date'] for d in data_list]
            if len(dates) != len(set(dates)):
                logger.error("Duplicate dates found in time series")
                return False

            # Check chronological order
            if dates != sorted(dates):
                logger.error("Data points not in chronological order")
                return False

            return all(BiometricDataValidator.validate_data(d) for d in data_list)

        except Exception as e:
            logger.error(f"Time series validation error: {e}")
            return False 