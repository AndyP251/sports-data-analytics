from typing import TypedDict, List, Optional
from datetime import datetime

class SleepMetrics(TypedDict):
    total_sleep_seconds: int
    deep_sleep_seconds: int
    light_sleep_seconds: int
    rem_sleep_seconds: int
    awake_seconds: int
    average_respiration: float
    lowest_respiration: float
    highest_respiration: float
    sleep_heart_rate: List[dict]
    sleep_stress: List[dict]
    sleep_body_battery: List[dict]
    body_battery_change: int
    sleep_resting_heart_rate: int

class HeartRateMetrics(TypedDict):
    resting_heart_rate: int
    max_heart_rate: int
    min_heart_rate: int
    last_seven_days_avg_resting_heart_rate: int
    heart_rate_values: List[dict]

class ActivityMetrics(TypedDict):
    total_calories: int
    active_calories: int
    bmr_calories: int
    net_calorie_goal: int
    total_distance_meters: float
    total_steps: int
    daily_step_goal: int
    highly_active_seconds: int
    sedentary_seconds: int

class StressMetrics(TypedDict):
    average_stress_level: int
    max_stress_level: int
    stress_duration_seconds: int
    rest_stress_duration: int
    activity_stress_duration: int
    low_stress_percentage: float
    medium_stress_percentage: float
    high_stress_percentage: float

class StandardizedBiometricData(TypedDict):
    date: datetime
    sleep: SleepMetrics
    heart_rate: HeartRateMetrics
    activity: ActivityMetrics
    stress: StressMetrics
    source: str 