from typing import Dict, Any, Optional
from .base_transformer import BaseDataTransformer
from ..data_formats.biometric_format import StandardizedBiometricData
import logging
from datetime import datetime, date

logger = logging.getLogger(__name__)
"""
• GarminTransformer.transform() is responsible for converting one day’s raw data into a final dictionary shape that your pipeline can store in DB or S3.
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
                    'sleep_time_seconds': sleep_data.get('sleepTimeSeconds', 0),
                    'deep_sleep_seconds': sleep_data.get('deepSleepSeconds', 0),
                    'light_sleep_seconds': sleep_data.get('lightSleepSeconds', 0),
                    'rem_sleep_seconds': sleep_data.get('remSleepSeconds', 0),
                    'awake_sleep': sleep_data.get('awakeSleepSeconds', 0),
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
                    'stress_duration': user_summary.get('stressDuration', 0),
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
    def transform(daily_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Takes a single day's raw Garmin data and returns a standardized dict
        with 'date', 'source', 'metrics', 'time_series', etc.
        """
        try:
            date_str = daily_data.get("date")
            if not date_str:
                logger.error("No date found in daily_data")
                return None

            # Convert to date object if needed
            # daily_data might store date as string "YYYY-MM-DD"
            current_date = datetime.strptime(date_str, "%Y-%m-%d").date()

            # Pull out each sub-object
            sleep_data = daily_data.get("sleep", {})
            heart_rate_data = daily_data.get("heart_rate", {})
            user_summary = daily_data.get("user_summary", {})
            stress_data = daily_data.get("stress", {})

            # Build final shape
            return {
                "date": current_date,
                "source": "garmin",
                "metrics": {
                    "total_sleep_seconds": sleep_data.get("sleepTimeSeconds", 0),
                    "deep_sleep_seconds": sleep_data.get("deepSleepSeconds", 0),
                    "light_sleep_seconds": sleep_data.get("lightSleepSeconds", 0),
                    "rem_sleep_seconds": sleep_data.get("remSleepSeconds", 0),
                    "awake_seconds": sleep_data.get("awakeSleepSeconds", 0),

                    "resting_heart_rate": heart_rate_data.get("restingHeartRate", 0),
                    "max_heart_rate": heart_rate_data.get("maxHeartRate", 0),
                    "min_heart_rate": heart_rate_data.get("minHeartRate", 0),

                    "total_calories": user_summary.get("totalKilocalories", 0),
                    "active_calories": user_summary.get("activeKilocalories", 0),
                    "total_distance_meters": user_summary.get("totalDistanceMeters", 0),
                    "total_steps": user_summary.get("totalSteps", 0),

                    "average_stress_level": stress_data.get("averageStressLevel", 0),
                    "max_stress_level": stress_data.get("maxStressLevel", 0),
                    "stress_duration_seconds": stress_data.get("stressDuration", 0),
                },
                "time_series": {
                    "heart_rate_values": heart_rate_data.get("heartRateValues", {}),
                    "sleep_heart_rate": sleep_data.get("sleepHeartRate", {}),
                    "stress_timeseries": stress_data.get("stressTimeseries", {}),
                }
            }

        except Exception as e:
            logger.error(f"Error transforming Garmin data: {e}", exc_info=True)
            return None 