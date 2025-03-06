from typing import Dict, Any, Optional
from .base_transformer import BaseDataTransformer
from ..data_formats.biometric_format import StandardizedBiometricData
import logging
from datetime import datetime
from django.utils import timezone
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
        Transform raw Garmin data into standardized format, handling both API and S3 data formats
        """
        try:
            if not raw_data:
                logger.error("[GARMIN TRANSFORM] Raw data is empty or None")
                return None
                
            if 'date' not in raw_data:
                logger.error("[GARMIN TRANSFORM] Date field missing in raw data")
                logger.debug(f"[GARMIN TRANSFORM] Raw data keys: {list(raw_data.keys())}")
                return None
            
            logger.info(f"[GARMIN TRANSFORM] Processing raw data for date {raw_data.get('date')}")
            
            date_str = raw_data.get('date')
            current_date = datetime.strptime(date_str, "%Y-%m-%d").date() if isinstance(date_str, str) else date_str

            # Check if this is pre-transformed data
            if 'metrics' in raw_data:
                logger.info("[GARMIN TRANSFORM] Data already contains 'metrics' key, returning as is")
                return raw_data
            
            # Extract data from the raw format
            sleep_data = raw_data.get('sleep', {})
            if not sleep_data and 'dailySleepDTO' in raw_data:
                # Handle case where sleep data might be at root level
                daily_sleep_data = raw_data.get('dailySleepDTO', {})
                logger.info("[GARMIN TRANSFORM] Found dailySleepDTO at root level")
            else:
                daily_sleep_data = sleep_data.get('dailySleepDTO', {})
                
            user_summary = raw_data.get('user_summary', {})
            if not user_summary and 'restingHeartRate' in raw_data:
                # Handle case where user_summary data might be at root level
                user_summary = raw_data
                logger.info("[GARMIN TRANSFORM] Using root level as user_summary")
                
            stress_data = raw_data.get('stress', {})
            
            # Safely calculate body battery change
            try:
                if 'bodyBatteryChargedValue' in user_summary and 'bodyBatteryDrainedValue' in user_summary:
                    body_battery_change = user_summary.get('bodyBatteryChargedValue', 0) - user_summary.get('bodyBatteryDrainedValue', 0)
                else:
                    body_battery_change = 0
                    logger.warning("[GARMIN TRANSFORM] Body battery data not found, defaulting to 0")
            except Exception as e:
                logger.warning(f"[GARMIN TRANSFORM] Error calculating body battery change: {e}")
                body_battery_change = 0

            # Process sleep metrics
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
                'sleep_resting_heart_rate': sleep_data.get('sleepRestingHeartRate', user_summary.get('restingHeartRate', 0))
            }

            # Safely sanitize all metrics
            for key in sleep_metrics:
                if sleep_metrics[key] is None:
                    sleep_metrics[key] = 0 if isinstance(sleep_metrics.get(key), (int, float)) else []

            # Map to standardized format
            standardized_data = {
                'date': current_date,
                'source': 'garmin',
                'metrics': {
                    **sleep_metrics,  # Include the sanitized sleep metrics
                    
                    # Heart Rate Metrics
                    'resting_heart_rate': user_summary.get('restingHeartRate', 0),
                    'max_heart_rate': user_summary.get('maxHeartRate', 0),
                    'min_heart_rate': user_summary.get('minHeartRate', 0),
                    'last_seven_days_avg_resting_heart_rate': user_summary.get('lastSevenDaysAvgRestingHeartRate', 0),
                    
                    # User Summary Data
                    'total_calories': user_summary.get('totalKilocalories', 0),
                    'active_calories': user_summary.get('activeKilocalories', 0),
                    'bmr_calories': user_summary.get('bmrKilocalories', 0),
                    'net_calorie_goal': user_summary.get('netCalorieGoal', 0),
                    'total_distance_meters': user_summary.get('totalDistanceMeters', 0),
                    'total_steps': user_summary.get('totalSteps', 0),
                    'daily_step_goal': user_summary.get('dailyStepGoal', 0),
                    'highly_active_seconds': user_summary.get('highlyActiveSeconds', 0),
                    'sedentary_seconds': user_summary.get('sedentarySeconds', 0),

                    # Stress Data
                    'average_stress_level': stress_data.get('avgStressLevel', 0),
                    'max_stress_level': stress_data.get('maxStressLevel', 0),
                    'stress_duration_seconds': stress_data.get('stressDurationSeconds', 0),
                    'rest_stress_duration': stress_data.get('restStressDuration', 0),
                    'activity_stress_duration': stress_data.get('activityStressDuration', 0),
                    'low_stress_percentage': stress_data.get('lowStressPercentage', 0),
                    'medium_stress_percentage': stress_data.get('mediumStressPercentage', 0),
                    'high_stress_percentage': stress_data.get('highStressPercentage', 0),
                    
                    # Metadata
                    'created_at': timezone.now(),
                    'updated_at': timezone.now(),
                }
            }
            
            logger.info(f"[GARMIN TRANSFORM] Successfully transformed data for {date_str}")
            return standardized_data
            
        except Exception as e:
            logger.error(f"[GARMIN TRANSFORM] Error transforming data: {str(e)}", exc_info=True)
            return None 