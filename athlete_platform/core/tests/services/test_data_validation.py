import pytest
from datetime import datetime, timedelta
from core.services.data_validation.validator import BiometricDataValidator
from core.services.data_formats.biometric_format import StandardizedBiometricData

@pytest.fixture
def valid_biometric_data() -> StandardizedBiometricData:
    return {
        'date': datetime.now(),
        'source': 'garmin',
        'sleep': {
            'sleep_time_seconds': 25200,
            'deep_sleep_seconds': 7200,
            'light_sleep_seconds': 14400,
            'rem_sleep_seconds': 3600,
            'awake_sleep': 1800,
            'average_respiration': 14.5,
            'lowest_respiration': 12.0,
            'highest_respiration': 16.0,
            'sleep_heart_rate': [],
            'sleep_stress': [],
            'sleep_body_battery': [],
            'body_battery_change': 10,
            'sleep_resting_heart_rate': 55
        },
        'heart_rate': {
            'resting_heart_rate': 55,
            'max_heart_rate': 180,
            'min_heart_rate': 45,
            'last_seven_days_avg_resting_heart_rate': 54,
            'heart_rate_values': []
        },
        'activity': {
            'total_calories': 2500,
            'active_calories': 800,
            'bmr_calories': 1700,
            'net_calorie_goal': 2000,
            'total_distance_meters': 8000.0,
            'total_steps': 10000,
            'daily_step_goal': 8000,
            'highly_active_seconds': 3600,
            'sedentary_seconds': 28800
        },
        'stress': {
            'average_stress_level': 35,
            'max_stress_level': 85,
            'stress_duration': 3600,
            'rest_stress_duration': 28800,
            'activity_stress_duration': 3600,
            'low_stress_percentage': 60.0,
            'medium_stress_percentage': 30.0,
            'high_stress_percentage': 10.0
        }
    }

class TestBiometricDataValidator:
    def test_validate_valid_data(self, valid_biometric_data):
        validator = BiometricDataValidator()
        assert validator.validate_data(valid_biometric_data) is True

    def test_validate_missing_date(self, valid_biometric_data):
        validator = BiometricDataValidator()
        del valid_biometric_data['date']
        assert validator.validate_data(valid_biometric_data) is False

    def test_validate_invalid_sleep_metrics(self, valid_biometric_data):
        validator = BiometricDataValidator()
        valid_biometric_data['sleep']['sleep_time_seconds'] = 'invalid'
        assert validator.validate_data(valid_biometric_data) is False

    def test_validate_time_series(self, valid_biometric_data):
        validator = BiometricDataValidator()
        data_series = [
            {**valid_biometric_data, 'date': datetime.now() - timedelta(days=i)}
            for i in range(3)
        ]
        assert validator.validate_time_series(data_series) is True

    def test_validate_duplicate_dates(self, valid_biometric_data):
        validator = BiometricDataValidator()
        same_date = datetime.now()
        data_series = [
            {**valid_biometric_data, 'date': same_date}
            for _ in range(2)
        ]
        assert validator.validate_time_series(data_series) is False 