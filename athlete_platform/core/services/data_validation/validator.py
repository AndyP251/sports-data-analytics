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

            # Validate sleep metrics
            sleep = data.get('sleep', {})
            if not all(isinstance(sleep.get(field), int) for field in [
                'sleep_time_seconds', 'deep_sleep_seconds', 
                'light_sleep_seconds', 'rem_sleep_seconds'
            ]):
                logger.error("Invalid sleep metrics")
                return False

            # Validate heart rate metrics
            heart_rate = data.get('heart_rate', {})
            if not all(isinstance(heart_rate.get(field), int) for field in [
                'resting_heart_rate', 'max_heart_rate', 'min_heart_rate'
            ]):
                logger.error("Invalid heart rate metrics")
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