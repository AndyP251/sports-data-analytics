from typing import Dict, Any
from .base_transformer import BaseDataTransformer
from ..data_formats.biometric_format import StandardizedBiometricData
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class WhoopTransformer(BaseDataTransformer):
    def transform_to_standard_format(self, raw_data: Dict[str, Any]) -> StandardizedBiometricData:
        try:
            daily_stats = raw_data.get('daily_stats', {})
            sleep_data = daily_stats.get('sleep', {})
            recovery_data = daily_stats.get('recovery', {})
            cycle_data = daily_stats.get('cycles', {})
            workout_data = daily_stats.get('workout', {})
            
            # Convert Whoop's percentage-based metrics to absolute values
            sleep_performance = sleep_data.get('sleep_performance', 0) / 100
            
            return StandardizedBiometricData(
                date=datetime.strptime(raw_data['date'], '%Y-%m-%d'),
                sleep={
                    'sleep_time_seconds': sleep_data.get('total_sleep_seconds', 0),
                    'deep_sleep_seconds': sleep_data.get('deep_sleep_seconds', 0),
                    'light_sleep_seconds': sleep_data.get('light_sleep_seconds', 0),
                    'rem_sleep_seconds': sleep_data.get('rem_sleep_seconds', 0),
                    'awake_sleep': sleep_data.get('awake_seconds', 0),
                    'average_respiration': sleep_data.get('respiratory_rate', 0),
                    'lowest_respiration': sleep_data.get('lowest_respiratory_rate', 0),
                    'highest_respiration': sleep_data.get('highest_respiratory_rate', 0),
                    'sleep_heart_rate': sleep_data.get('heart_rate_data', []),
                    'sleep_stress': [], # Whoop doesn't provide sleep stress
                    'sleep_body_battery': [], # Whoop equivalent would be recovery
                    'body_battery_change': int(recovery_data.get('recovery_score', 0)),
                    'sleep_resting_heart_rate': sleep_data.get('average_heart_rate', 0)
                },
                heart_rate={
                    'resting_heart_rate': recovery_data.get('resting_heart_rate', 0),
                    'max_heart_rate': workout_data.get('max_heart_rate', 0),
                    'min_heart_rate': sleep_data.get('lowest_heart_rate', 0),
                    'last_seven_days_avg_resting_heart_rate': recovery_data.get('average_resting_heart_rate', 0),
                    'heart_rate_values': cycle_data.get('heart_rate_data', [])
                },
                activity={
                    'total_calories': workout_data.get('total_calories', 0),
                    'active_calories': workout_data.get('active_calories', 0),
                    'bmr_calories': recovery_data.get('calories_burned', 0),
                    'net_calorie_goal': 0,  # Whoop doesn't provide this
                    'total_distance_meters': workout_data.get('distance_meters', 0),
                    'total_steps': cycle_data.get('total_steps', 0),
                    'daily_step_goal': 0,  # Whoop doesn't provide this
                    'highly_active_seconds': workout_data.get('duration_seconds', 0),
                    'sedentary_seconds': 0  # Whoop doesn't provide this directly
                },
                stress={
                    'average_stress_level': recovery_data.get('recovery_score', 0),
                    'max_stress_level': 100 - recovery_data.get('recovery_score', 0),
                    'stress_duration': cycle_data.get('strain', 0),
                    'rest_stress_duration': 0,  # Whoop uses different metrics
                    'activity_stress_duration': workout_data.get('strain', 0),
                    'low_stress_percentage': 0,  # Whoop uses different metrics
                    'medium_stress_percentage': 0,
                    'high_stress_percentage': 0
                },
                source='whoop'
            )
        except Exception as e:
            logger.error(f"Error transforming Whoop data: {e}")
            raise

    def transform_to_source_format(self, standard_data: StandardizedBiometricData) -> Dict[str, Any]:
        """Transform standardized data back to Whoop format if needed"""
        # This would be implemented if we need to send data back to Whoop
        raise NotImplementedError("Whoop doesn't support data upload") 