from typing import Dict, Any, Optional
from .base_transformer import BaseDataTransformer
from ..data_formats.biometric_format import StandardizedBiometricData
import logging
from datetime import datetime
from ..data_validation.validator import BiometricDataValidator

logger = logging.getLogger(__name__)
"""
• GarminTransformer.transform() is responsible for converting one day's raw data into a final dictionary shape that your pipeline can store in DB or S3.
• If the collector returns multiple days, your GarminProcessor can just loop over them, calling GarminTransformer.transform() for each.
"""
class GarminTransformer(BaseDataTransformer):
    def transform_to_standard_format(self, raw_data: Dict[str, Any]) -> StandardizedBiometricData:
        try:
            user_summary = raw_data.get('user_summary', {})
            sleep_data = raw_data.get('sleep', {})
            
            return StandardizedBiometricData(
                date=raw_data['date'],
                sleep={
                    'total_sleep_seconds': sleep_data.get('sleepTimeSeconds', 0),
                    'deep_sleep_seconds': sleep_data.get('deepSleepSeconds', 0),
                    'light_sleep_seconds': sleep_data.get('lightSleepSeconds', 0),
                    'rem_sleep_seconds': sleep_data.get('remSleepSeconds', 0),
                    'awake_seconds': sleep_data.get('awakeSleepSeconds', 0),
                    'average_respiration': sleep_data.get('averageRespirationValue', 0),
                    'lowest_respiration': sleep_data.get('lowestRespirationValue', 0),
                    'highest_respiration': sleep_data.get('highestRespirationValue', 0),
                    'sleep_heart_rate': sleep_data.get('sleepHeartRate', []),
                    'sleep_stress': sleep_data.get('sleepStress', []),
                    'sleep_body_battery': sleep_data.get('sleepBodyBattery', []),
                    'body_battery_change': sleep_data.get('bodyBatteryChange', 0),
                    'sleep_resting_heart_rate': sleep_data.get('sleepRestingHeartRate', 0)
                },
                heart_rate={
                    'resting_heart_rate': user_summary.get('restingHeartRate', 0),
                    'max_heart_rate': user_summary.get('maxHeartRate', 0),
                    'min_heart_rate': user_summary.get('minHeartRate', 0),
                    'last_seven_days_avg_resting_heart_rate': user_summary.get('lastSevenDaysAvgRestingHeartRate', 0),
                    # 'heart_rate_values': raw_data.get('heart_rate', {}).get('heartRateValues', [])
                },
                activity={
                    'total_calories': user_summary.get('totalKilocalories', 0),
                    'active_calories': user_summary.get('activeKilocalories', 0),
                    'bmr_calories': user_summary.get('bmrKilocalories', 0),
                    'net_calorie_goal': user_summary.get('netCalorieGoal', 0),
                    'total_distance_meters': user_summary.get('totalDistanceMeters', 0),
                    'total_steps': user_summary.get('totalSteps', 0),
                    'daily_step_goal': user_summary.get('dailyStepGoal', 0),
                    'highly_active_seconds': user_summary.get('highlyActiveSeconds', 0),
                    'sedentary_seconds': user_summary.get('sedentarySeconds', 0)
                },
                stress={
                    'average_stress_level': user_summary.get('averageStressLevel', 0),
                    'max_stress_level': user_summary.get('maxStressLevel', 0),
                    'stress_duration_seconds': user_summary.get('stressDuration', 0),
                    'rest_stress_duration': user_summary.get('restStressDuration', 0),
                    'activity_stress_duration': user_summary.get('activityStressDuration', 0),
                    'low_stress_percentage': user_summary.get('lowStressPercentage', 0),
                    'medium_stress_percentage': user_summary.get('mediumStressPercentage', 0),
                    'high_stress_percentage': user_summary.get('highStressPercentage', 0)
                },
                source='garmin'
            )
        except Exception as e:
            logger.error(f"Error transforming Garmin data: {e}")
            raise 

    def transform_to_source_format(self, standard_data: StandardizedBiometricData) -> Dict[str, Any]:
        """Transform standardized data back to Garmin format if needed"""
        # This would be implemented if we need to send data back to Garmin
        raise NotImplementedError("Garmin doesn't support data upload")

    @staticmethod
    def transform(raw_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Transform raw Garmin data into standardized format, need checks because api and s3 data are in different formats
        """
        try:
            if not raw_data or 'date' not in raw_data:
                logger.error("Invalid raw data format")
                return None
            
            logger.info(f"Received raw data in the Transformer of length: {len(raw_data)}")
            date_str = raw_data.get('date')
            current_date = datetime.strptime(date_str, "%Y-%m-%d").date() if isinstance(date_str, str) else date_str

            # Check if this is API data or S3 data by looking at the structure
            if 'metrics' in raw_data:
                # This is already transformed data from S3, just return it
                logger.info("Processing pre-transformed S3 data")
                return raw_data
            
            # This is raw API data, transform it
            logger.info("Processing raw API data")
            sleep_data = raw_data.get('sleep', {})
            daily_sleep_data = sleep_data.get('dailySleepDTO', {})
            logger.info(f"Daily sleep data: {daily_sleep_data}")
            user_summary = raw_data.get('user_summary', {})
            stress_data = raw_data.get('stress', {})
            
            try:
                body_battery_change = user_summary.get('bodyBatteryChargedValue', 0) - user_summary.get('bodyBatteryDrainedValue', 0)
            except Exception as e:
                logger.warning(f"Error calculating body battery change: {e}")
                body_battery_change = 0

            # Add default values for sleep metrics when data is missing
            sleep_metrics = {
                'total_sleep_seconds': daily_sleep_data.get('sleepTimeSeconds', 0),
                'deep_sleep_seconds': daily_sleep_data.get('deepSleepSeconds', 0),
                'light_sleep_seconds': daily_sleep_data.get('lightSleepSeconds', 0),
                'rem_sleep_seconds': daily_sleep_data.get('remSleepSeconds', 0),
                'awake_seconds': daily_sleep_data.get('awakeSleepSeconds', 0),
                'average_respiration': daily_sleep_data.get('averageRespirationValue', 0),
                'lowest_respiration': daily_sleep_data.get('lowestRespirationValue', 0),
                'highest_respiration': daily_sleep_data.get('highestRespirationValue', 0),
                'sleep_heart_rate': sleep_data.get('sleepHeartRate', []),
                'sleep_stress': sleep_data.get('sleepStress', []),
                'sleep_body_battery': sleep_data.get('sleepBodyBattery', []),
                'body_battery_change': body_battery_change,
                'sleep_resting_heart_rate': sleep_data.get('sleepRestingHeartRate', 0)
            }

            # Ensure all sleep metrics have non-null values
            for key in sleep_metrics:
                if sleep_metrics[key] is None:
                    sleep_metrics[key] = 0 if isinstance(sleep_metrics[key], (int, float)) else 0

            # Map the data to our standardized format
            return {
                'date': current_date,
                'source': 'garmin',
                'metrics': {
                    **sleep_metrics,  # Spread the validated sleep metrics
                    # Sleep Metrics - using sleepingSeconds from user_summary as fallback
                    'average_respiration': user_summary.get('avgWakingRespirationValue', 0),
                    'lowest_respiration': user_summary.get('lowestRespirationValue', 0),
                    'highest_respiration': user_summary.get('highestRespirationValue', 0),
                    'sleep_heart_rate': sleep_data.get('sleepHeartRate', []),
                    'sleep_stress': sleep_data.get('sleepStress', []),
                    'sleep_body_battery': sleep_data.get('sleepBodyBattery', []),
                    'body_battery_change': body_battery_change,
                    'sleep_resting_heart_rate': sleep_data.get('sleepRestingHeartRate', user_summary.get('restingHeartRate', 0)),
                    
                    # Heart Rate Metrics
                    'resting_heart_rate': user_summary.get('restingHeartRate', 0),
                    'max_heart_rate': user_summary.get('maxHeartRate', 0),
                    'min_heart_rate': user_summary.get('minHeartRate', 0),
                    'last_seven_days_avg_resting_heart_rate': user_summary.get('lastSevenDaysAvgRestingHeartRate', 0),
                    
                    # Activity Metrics
                    'total_calories': user_summary.get('totalKilocalories', 0),
                    'active_calories': user_summary.get('activeKilocalories', 0),
                    'bmr_calories': user_summary.get('bmrKilocalories', 0),
                    'net_calorie_goal': user_summary.get('netCalorieGoal', 0),
                    'total_distance_meters': user_summary.get('totalDistanceMeters', 0),
                    'total_steps': user_summary.get('totalSteps', 0),
                    'daily_step_goal': user_summary.get('dailyStepGoal', 0),
                    'highly_active_seconds': user_summary.get('highlyActiveSeconds', 0),
                    'sedentary_seconds': user_summary.get('sedentarySeconds', 0),
                    
                    # Stress Metrics
                    'average_stress_level': user_summary.get('averageStressLevel', 0),
                    'max_stress_level': user_summary.get('maxStressLevel', 0),
                    'stress_duration_seconds': user_summary.get('stressDuration', 0),
                    'rest_stress_duration': user_summary.get('restStressDuration', 0),
                    'activity_stress_duration': user_summary.get('activityStressDuration', 0),
                    'low_stress_percentage': user_summary.get('lowStressPercentage', 0),
                    'medium_stress_percentage': user_summary.get('mediumStressPercentage', 0),
                    'high_stress_percentage': user_summary.get('highStressPercentage', 0),
                    
                    # Metadata
                    'created_at': datetime.now(),
                    'updated_at': datetime.now(),
                }
            }

        except Exception as e:
            logger.error(f"Error transforming Garmin data: {e}", exc_info=True)
            return None 