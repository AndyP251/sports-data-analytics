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
            cycle_data = daily_stats.get('cycle', {})
            workout_data = daily_stats.get('workouts', [])
            
            # Additional recovery data might be nested within cycle data after our collector enhancement
            cycle_recovery_data = cycle_data.get('recovery', {})
            
            # Combine recovery data sources if available
            if not recovery_data and cycle_recovery_data:
                recovery_data = cycle_recovery_data
                
            # User measurements if available
            user_measurements = raw_data.get('user_measurements', {})
            
            # Aggregate workouts by ID
            aggregated_workouts = {}
            for workout in workout_data:
                aggregated_workouts[workout.get('id')] = workout
            
            # Process sleep data with proper null handling
            sleep_score = sleep_data.get('score', {})
            stage_summary = sleep_score.get('stage_summary', {})
            
            # Extract sleep metrics safely
            sleep_time_seconds = self._get_value_or_default(stage_summary, 'total_in_bed_time_milli', 0) / 1000
            deep_sleep_seconds = self._get_value_or_default(stage_summary, 'total_slow_wave_sleep_time_milli', 0) / 1000
            light_sleep_seconds = self._get_value_or_default(stage_summary, 'total_light_sleep_time_milli', 0) / 1000
            rem_sleep_seconds = self._get_value_or_default(stage_summary, 'total_rem_sleep_time_milli', 0) / 1000
            awake_sleep_seconds = self._get_value_or_default(stage_summary, 'total_awake_time_milli', 0) / 1000
            
            # Extract recovery metrics
            recovery_score = self._get_value_or_default(recovery_data, 'recovery_score', 0)
            resting_heart_rate = self._get_value_or_default(recovery_data, 'resting_heart_rate', 0)
            hrv_rmssd = self._get_value_or_default(recovery_data, 'hrv_rmssd_milli', 0)
            spo2_percentage = self._get_value_or_default(recovery_data, 'spo2_percentage', 0)
            skin_temp_celsius = self._get_value_or_default(recovery_data, 'skin_temp_celsius', 0)
            
            # Extract cycle metrics
            cycle_score = cycle_data.get('score', {})
            
            return StandardizedBiometricData(
                date=datetime.strptime(raw_data['date'], '%Y-%m-%d'),
                sleep={
                    'sleep_time_seconds': sleep_time_seconds,
                    'deep_sleep_seconds': deep_sleep_seconds,
                    'light_sleep_seconds': light_sleep_seconds,
                    'rem_sleep_seconds': rem_sleep_seconds,
                    'awake_sleep_seconds': awake_sleep_seconds,
                    'sleep_cycle_count': self._get_value_or_default(stage_summary, 'sleep_cycle_count', 0),
                    'disturbance_count': self._get_value_or_default(stage_summary, 'disturbance_count', 0),
                    'respiratory_rate': self._get_value_or_default(sleep_score, 'respiratory_rate', 0),
                    'sleep_performance': self._get_value_or_default(sleep_score, 'sleep_performance_percentage', 0),
                    'sleep_consistency': self._get_value_or_default(sleep_score, 'sleep_consistency_percentage', 0),
                    'sleep_efficiency': self._get_value_or_default(sleep_score, 'sleep_efficiency_percentage', 0),
                    'sleep_start': sleep_data.get('start', ''),
                    'sleep_end': sleep_data.get('end', ''),
                },
                
                workouts={
                    workout_id: {
                        'start_time': workout.get('start', ''),
                        'end_time': workout.get('end', ''),
                        'sport_id': workout.get('sport_id', 0),
                        'strain_score': self._get_value_or_default(workout.get('score', {}), 'strain', 0),
                        'avg_heart_rate': self._get_value_or_default(workout.get('score', {}), 'average_heart_rate', 0),
                        'max_heart_rate': self._get_value_or_default(workout.get('score', {}), 'max_heart_rate', 0),
                        'total_energy_kj': self._get_value_or_default(workout.get('score', {}), 'kilojoule', 0),
                        'recording_percentage': self._get_value_or_default(workout.get('score', {}), 'percent_recorded', 0),
                        'distance_meters': self._get_value_or_default(workout.get('score', {}), 'distance_meter', 0),
                        'altitude_gain_meters': self._get_value_or_default(workout.get('score', {}), 'altitude_gain_meter', 0),
                        'altitude_change_meters': self._get_value_or_default(workout.get('score', {}), 'altitude_change_meter', 0),
                        'zone_durations': {
                            'zone_0_ms': self._get_value_or_default(workout.get('score', {}).get('zone_duration', {}), 'zone_zero_milli', 0),
                            'zone_1_ms': self._get_value_or_default(workout.get('score', {}).get('zone_duration', {}), 'zone_one_milli', 0),
                            'zone_2_ms': self._get_value_or_default(workout.get('score', {}).get('zone_duration', {}), 'zone_two_milli', 0),
                            'zone_3_ms': self._get_value_or_default(workout.get('score', {}).get('zone_duration', {}), 'zone_three_milli', 0),
                            'zone_4_ms': self._get_value_or_default(workout.get('score', {}).get('zone_duration', {}), 'zone_four_milli', 0),
                            'zone_5_ms': self._get_value_or_default(workout.get('score', {}).get('zone_duration', {}), 'zone_five_milli', 0)
                        }
                    }
                    for workout_id, workout in aggregated_workouts.items()
                },
                
                heart_rate={
                    'max_heart_rate': self._get_value_or_default(cycle_score, 'max_heart_rate', 0),
                    'min_heart_rate': self._get_value_or_default(recovery_data, 'resting_heart_rate', 0),
                    'average_heart_rate': self._get_value_or_default(cycle_score, 'average_heart_rate', 0),
                    'cycle_start': cycle_data.get('start', ''),
                    'cycle_end': cycle_data.get('end', ''),
                    'cycle_strain': self._get_value_or_default(cycle_score, 'strain', 0),
                    'cycle_kilojoules': self._get_value_or_default(cycle_score, 'kilojoule', 0),
                    'heart_rate_values': cycle_data.get('heart_rate_data', [])
                },
                
                recovery={
                    'recovery_score': recovery_score,
                    'resting_heart_rate': resting_heart_rate, 
                    'hrv_rmssd': hrv_rmssd,
                    'spo2_percentage': spo2_percentage,
                    'skin_temp_celsius': skin_temp_celsius,
                    'user_calibrating': recovery_data.get('user_calibrating', False)
                },
                
                stress={
                    'average_stress_level': 100 - recovery_score if recovery_score else 0,
                    'max_stress_level': 100 - recovery_score if recovery_score else 0,
                    'stress_duration': self._get_value_or_default(cycle_score, 'strain', 0),
                    'total_strain': self._get_value_or_default(cycle_score, 'strain', 0),
                    'workout_strain': sum(self._get_value_or_default(w.get('score', {}), 'strain', 0) for w in workout_data),
                    'rest_stress_duration': 0,  # Whoop uses different metrics
                    'activity_stress_duration': sum(self._get_value_or_default(w.get('score', {}), 'strain', 0) for w in workout_data)
                },
                
                user_info={
                    'height_meter': user_measurements.get('height_meter', 0),
                    'weight_kilogram': user_measurements.get('weight_kilogram', 0),
                    'max_heart_rate': user_measurements.get('max_heart_rate', 0)
                },
                
                source='whoop'
            )
        except Exception as e:
            logger.error(f"Error transforming Whoop data: {e}", exc_info=True)
            raise

    def _get_value_or_default(self, data, key, default=0):
        """Safely get a value from a dictionary with proper type handling"""
        if not data or key not in data:
            return default
            
        value = data.get(key)
        
        if value is None:
            return default
            
        # Handle numeric values
        if isinstance(default, (int, float)):
            try:
                return float(value)
            except (ValueError, TypeError):
                return default
                
        return value

    def transform_to_source_format(self, standard_data: StandardizedBiometricData) -> Dict[str, Any]:
        """Transform standardized data back to Whoop format if needed"""
        # This would be implemented if we need to send data back to Whoop
        raise NotImplementedError("Whoop doesn't support data upload") 