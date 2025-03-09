import logging
import json
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple, Set
import numpy as np
from django.conf import settings
from django.utils import timezone
from .models import CoreBiometricData, User

# Configure logging
logger = logging.getLogger(__name__)

class InsightCategory:
    """Categories for organizing insights"""
    SLEEP = "sleep"
    ACTIVITY = "activity"
    RECOVERY = "recovery"
    CARDIOVASCULAR = "cardiovascular"
    TRENDS = "trends"
    NUTRITION = "nutrition"
    STRESS = "stress"
    PERFORMANCE = "performance"
    
    @classmethod
    def get_all(cls) -> List[str]:
        """Return all category values"""
        return [
            cls.SLEEP, cls.ACTIVITY, cls.RECOVERY, cls.CARDIOVASCULAR, 
            cls.TRENDS, cls.NUTRITION, cls.STRESS, cls.PERFORMANCE
        ]
    
    @classmethod
    def get_icon(cls, category: str) -> str:
        """Return an appropriate icon for a category"""
        icons = {
            cls.SLEEP: "BedtimeIcon",
            cls.ACTIVITY: "DirectionsRunIcon",
            cls.RECOVERY: "RestoreIcon",
            cls.CARDIOVASCULAR: "FavoriteIcon",
            cls.TRENDS: "MonitorHeartIcon",
            cls.NUTRITION: "RestaurantIcon",
            cls.STRESS: "SpaIcon",
            cls.PERFORMANCE: "EmojiEventsIcon"
        }
        return icons.get(category, "InfoIcon")
    
    @classmethod
    def get_color(cls, category: str) -> str:
        """Return an appropriate color for a category"""
        colors = {
            cls.SLEEP: "#8e44ad",  # Purple
            cls.ACTIVITY: "#2ecc71",  # Green
            cls.RECOVERY: "#3498db",  # Blue
            cls.CARDIOVASCULAR: "#e74c3c",  # Red
            cls.TRENDS: "#f39c12",  # Orange
            cls.NUTRITION: "#1abc9c",  # Teal
            cls.STRESS: "#9b59b6",  # Violet
            cls.PERFORMANCE: "#f1c40f"  # Yellow
        }
        return colors.get(category, "#95a5a6")  # Default gray


class InsightGenerator:
    """Class responsible for generating insights from biometric data"""
    
    def __init__(self, athlete_id: str):
        self.athlete_id = athlete_id
        self.trends_cache = {}
        self.source_capabilities = {
            'whoop': ['recovery_score', 'hrv_ms', 'strain', 'sleep_efficiency', 'sleep_consistency', 'sleep_performance'],
            'garmin': ['steps', 'distance_meters', 'active_calories', 'total_calories', 'floors_climbed', 'intensity_minutes']
        }
        # Fields tracked by both sources
        self.common_fields = ['resting_heart_rate', 'sleep_hours', 'max_heart_rate', 'min_heart_rate']
    
    def get_data(self, days: int = 30, source: Optional[str] = None) -> List[Dict]:
        """Retrieve biometric data for the specified time period"""
        try:
            start_date = timezone.now() - timedelta(days=days)
            
            query = CoreBiometricData.objects.filter(
                athlete_id=self.athlete_id,
                date__gte=start_date
            ).order_by('date')
            
            if source and source != 'all':
                query = query.filter(source=source)
            
            # Convert QuerySet to list of dictionaries for easier processing
            data = list(query.values())
            
            if not data:
                logger.warning(f"No data found for athlete {self.athlete_id} in the last {days} days")
                
            return data
        
        except Exception as e:
            logger.error(f"Error retrieving biometric data: {e}", exc_info=True)
            return []
    
    def analyze_sleep(self, data: List[Dict]) -> List[Dict]:
        """Generate sleep-related insights"""
        if not data:
            return []
        
        insights = []
        
        # Calculate average sleep metrics
        sleep_hours = [d.get('sleep_hours', 0) for d in data if d.get('sleep_hours', 0) > 0]
        
        if not sleep_hours:
            return []
            
        avg_sleep = sum(sleep_hours) / len(sleep_hours)
        sleep_trend = self._calculate_trend([d.get('sleep_hours', None) for d in data])
        
        # Sleep duration insight
        if avg_sleep < 6:
            insights.append({
                'category': InsightCategory.SLEEP,
                'title': 'Sleep Duration Alert',
                'content': f"You're averaging only {avg_sleep:.1f} hours of sleep, which is below the recommended 7-9 hours for optimal recovery.",
                'recommendation': "Try to increase your sleep time by going to bed 30 minutes earlier.",
                'priority': 'high',
                'trend': sleep_trend,
                'data_points': sleep_hours[-7:] if len(sleep_hours) >= 7 else sleep_hours,
                'visualization': 'line'
            })
        elif avg_sleep < 7:
            insights.append({
                'category': InsightCategory.SLEEP,
                'title': 'Sleep Duration Warning',
                'content': f"Your average sleep of {avg_sleep:.1f} hours is slightly below optimal levels for athletic recovery.",
                'recommendation': "Aim for 7-9 hours of sleep for improved recovery and performance.",
                'priority': 'medium',
                'trend': sleep_trend,
                'data_points': sleep_hours[-7:] if len(sleep_hours) >= 7 else sleep_hours,
                'visualization': 'line'
            })
        else:
            insights.append({
                'category': InsightCategory.SLEEP,
                'title': 'Optimal Sleep Duration',
                'content': f"Great job maintaining an average of {avg_sleep:.1f} hours of sleep, which is within the optimal range.",
                'recommendation': "Continue your current sleep routine for maximum recovery benefits.",
                'priority': 'low',
                'trend': sleep_trend,
                'data_points': sleep_hours[-7:] if len(sleep_hours) >= 7 else sleep_hours,
                'visualization': 'line'
            })
        
        # Sleep efficiency insights if available
        efficiency_data = [d for d in data if 'sleep_efficiency' in d and d['sleep_efficiency'] is not None]
        if efficiency_data:
            efficiencies = [d.get('sleep_efficiency', 0) for d in efficiency_data]
            avg_efficiency = sum(efficiencies) / len(efficiencies)
            efficiency_trend = self._calculate_trend(efficiencies)
            
            if avg_efficiency < 70:
                insights.append({
                    'category': InsightCategory.SLEEP,
                    'title': 'Poor Sleep Quality',
                    'content': f"Your sleep efficiency of {avg_efficiency:.1f}% indicates poor sleep quality.",
                    'recommendation': "Focus on sleep environment: dark room, cool temperature, and limit screen time before bed.",
                    'priority': 'high',
                    'trend': efficiency_trend,
                    'data_points': efficiencies[-7:] if len(efficiencies) >= 7 else efficiencies,
                    'visualization': 'bar'
                })
            elif avg_efficiency < 85:
                insights.append({
                    'category': InsightCategory.SLEEP,
                    'title': 'Moderate Sleep Quality',
                    'content': f"Your sleep efficiency is {avg_efficiency:.1f}%, which indicates room for improvement.",
                    'recommendation': "Consider a relaxing pre-sleep routine to improve sleep quality.",
                    'priority': 'medium',
                    'trend': efficiency_trend,
                    'data_points': efficiencies[-7:] if len(efficiencies) >= 7 else efficiencies,
                    'visualization': 'bar'
                })
            else:
                insights.append({
                    'category': InsightCategory.SLEEP,
                    'title': 'Excellent Sleep Quality',
                    'content': f"Your sleep efficiency is excellent at {avg_efficiency:.1f}%.",
                    'recommendation': "Maintain your current sleep routine.",
                    'priority': 'low',
                    'trend': efficiency_trend,
                    'data_points': efficiencies[-7:] if len(efficiencies) >= 7 else efficiencies,
                    'visualization': 'bar'
                })
        
        return insights
    
    def analyze_cardiovascular(self, data: List[Dict]) -> List[Dict]:
        """Generate heart rate and cardiovascular-related insights"""
        if not data:
            return []
        
        insights = []
        
        # Get resting heart rate data
        rhr_data = [d.get('resting_heart_rate', None) for d in data]
        rhr_data = [rhr for rhr in rhr_data if rhr is not None]
        
        if not rhr_data:
            return []
            
        avg_rhr = sum(rhr_data) / len(rhr_data)
        rhr_trend = self._calculate_trend(rhr_data)
        
        # RHR insights
        if avg_rhr < 50:
            insights.append({
                'category': InsightCategory.CARDIOVASCULAR,
                'title': 'Elite Cardiovascular Fitness',
                'content': f"Your average resting heart rate of {avg_rhr:.1f} bpm indicates excellent cardiovascular fitness, typical of elite athletes.",
                'recommendation': "Maintain your current training program, which is clearly effective.",
                'priority': 'low',
                'trend': rhr_trend,
                'data_points': rhr_data[-7:] if len(rhr_data) >= 7 else rhr_data,
                'visualization': 'line'
            })
        elif avg_rhr < 60:
            insights.append({
                'category': InsightCategory.CARDIOVASCULAR,
                'title': 'Great Cardiovascular Health',
                'content': f"Your average resting heart rate of {avg_rhr:.1f} bpm indicates very good cardiovascular health.",
                'recommendation': "Continue your current exercise routine to maintain this excellent level.",
                'priority': 'low',
                'trend': rhr_trend,
                'data_points': rhr_data[-7:] if len(rhr_data) >= 7 else rhr_data,
                'visualization': 'line'
            })
        elif avg_rhr < 70:
            insights.append({
                'category': InsightCategory.CARDIOVASCULAR,
                'title': 'Good Cardiovascular Health',
                'content': f"Your average resting heart rate of {avg_rhr:.1f} bpm is within the healthy range.",
                'recommendation': "Consider adding more cardio training to potentially lower your RHR further.",
                'priority': 'medium',
                'trend': rhr_trend,
                'data_points': rhr_data[-7:] if len(rhr_data) >= 7 else rhr_data,
                'visualization': 'line'
            })
        else:
            insights.append({
                'category': InsightCategory.CARDIOVASCULAR,
                'title': 'Elevated Resting Heart Rate',
                'content': f"Your average resting heart rate of {avg_rhr:.1f} bpm is higher than optimal.",
                'recommendation': "Focus on consistent cardio exercise, stress reduction, and improved sleep quality to lower your RHR.",
                'priority': 'high',
                'trend': rhr_trend,
                'data_points': rhr_data[-7:] if len(rhr_data) >= 7 else rhr_data,
                'visualization': 'line'
            })
        
        # HRV insights if available
        hrv_data = [d.get('hrv_ms', None) for d in data]
        hrv_data = [hrv for hrv in hrv_data if hrv is not None]
        
        if hrv_data:
            avg_hrv = sum(hrv_data) / len(hrv_data)
            hrv_trend = self._calculate_trend(hrv_data)
            
            # Note: HRV norms vary by age, gender, and fitness level
            # These are general ranges
            if avg_hrv < 30:
                insights.append({
                    'category': InsightCategory.CARDIOVASCULAR,
                    'title': 'Low Heart Rate Variability',
                    'content': f"Your average HRV of {avg_hrv:.1f} ms is low, which may indicate chronic stress or overtraining.",
                    'recommendation': "Focus on recovery: adequate sleep, stress management, and possibly reduce training load.",
                    'priority': 'high',
                    'trend': hrv_trend,
                    'data_points': hrv_data[-7:] if len(hrv_data) >= 7 else hrv_data,
                    'visualization': 'area'
                })
            elif avg_hrv < 60:
                insights.append({
                    'category': InsightCategory.CARDIOVASCULAR,
                    'title': 'Moderate Heart Rate Variability',
                    'content': f"Your average HRV of {avg_hrv:.1f} ms suggests moderate autonomic nervous system health.",
                    'recommendation': "Include more dedicated recovery practices such as meditation or breathing exercises.",
                    'priority': 'medium',
                    'trend': hrv_trend,
                    'data_points': hrv_data[-7:] if len(hrv_data) >= 7 else hrv_data,
                    'visualization': 'area'
                })
            else:
                insights.append({
                    'category': InsightCategory.CARDIOVASCULAR,
                    'title': 'Excellent Heart Rate Variability',
                    'content': f"Your average HRV of {avg_hrv:.1f} ms indicates excellent cardiovascular health and recovery capacity.",
                    'recommendation': "Continue your current training and recovery practices.",
                    'priority': 'low',
                    'trend': hrv_trend,
                    'data_points': hrv_data[-7:] if len(hrv_data) >= 7 else hrv_data,
                    'visualization': 'area'
                })
        
        return insights
    
    def analyze_activity(self, data: List[Dict]) -> List[Dict]:
        """Generate activity and exercise-related insights"""
        if not data:
            return []
        
        insights = []
        garmin_data = [d for d in data if d.get('source', '').lower() == 'garmin']
        
        # Check if we have Garmin data to analyze
        if not garmin_data:
            return []
        
        # Steps analysis
        steps_data = [d.get('steps', 0) for d in garmin_data if d.get('steps', 0) > 0]
        
        if steps_data:
            avg_steps = sum(steps_data) / len(steps_data)
            steps_trend = self._calculate_trend(steps_data)
            
            if avg_steps < 5000:
                insights.append({
                    'category': InsightCategory.ACTIVITY,
                    'title': 'Low Activity Level',
                    'content': f"Your average of {int(avg_steps):,} steps per day is below recommended levels for good health.",
                    'recommendation': "Try to increase daily movement with walking breaks, using stairs, or short walks during the day.",
                    'priority': 'high',
                    'trend': steps_trend,
                    'data_points': steps_data[-7:] if len(steps_data) >= 7 else steps_data,
                    'visualization': 'bar',
                    'source': 'garmin',
                    'primary_metric': 'steps'
                })
            elif avg_steps < 7500:
                insights.append({
                    'category': InsightCategory.ACTIVITY,
                    'title': 'Moderate Activity Level',
                    'content': f"Your average of {int(avg_steps):,} steps per day indicates a somewhat active lifestyle.",
                    'recommendation': "For optimal health benefits, aim to increase to 10,000+ steps daily.",
                    'priority': 'medium',
                    'trend': steps_trend,
                    'data_points': steps_data[-7:] if len(steps_data) >= 7 else steps_data,
                    'visualization': 'bar',
                    'source': 'garmin',
                    'primary_metric': 'steps'
                })
            else:
                insights.append({
                    'category': InsightCategory.ACTIVITY,
                    'title': 'Active Lifestyle',
                    'content': f"Great job maintaining an average of {int(avg_steps):,} steps per day, which supports good health.",
                    'recommendation': "Keep up this excellent activity level.",
                    'priority': 'low',
                    'trend': steps_trend,
                    'data_points': steps_data[-7:] if len(steps_data) >= 7 else steps_data,
                    'visualization': 'bar',
                    'source': 'garmin',
                    'primary_metric': 'steps'
                })
        
        # Distance analysis
        distance_data = [d.get('distance_meters', 0) for d in garmin_data if d.get('distance_meters', 0) > 0]
        
        if distance_data:
            avg_distance_km = sum(distance_data) / len(distance_data) / 1000  # Convert to km
            distance_trend = self._calculate_trend(distance_data)
            
            if avg_distance_km > 5:
                insights.append({
                    'category': InsightCategory.ACTIVITY,
                    'title': 'Good Daily Distance',
                    'content': f"You're covering an average of {avg_distance_km:.2f} km per day, which is a healthy amount of movement.",
                    'recommendation': "Your daily distance is good for cardiovascular health. Consider adding variety in terrain or intensity for additional benefits.",
                    'priority': 'low',
                    'trend': distance_trend,
                    'data_points': [d/1000 for d in distance_data[-7:]] if len(distance_data) >= 7 else [d/1000 for d in distance_data],  # Convert to km
                    'visualization': 'line',
                    'source': 'garmin',
                    'primary_metric': 'distance_meters'
                })
            elif avg_distance_km > 2:
                insights.append({
                    'category': InsightCategory.ACTIVITY,
                    'title': 'Moderate Daily Distance',
                    'content': f"You're covering an average of {avg_distance_km:.2f} km per day, which provides some health benefits.",
                    'recommendation': "Try to gradually increase your daily distance for improved cardiovascular health.",
                    'priority': 'medium',
                    'trend': distance_trend,
                    'data_points': [d/1000 for d in distance_data[-7:]] if len(distance_data) >= 7 else [d/1000 for d in distance_data],
                    'visualization': 'line',
                    'source': 'garmin',
                    'primary_metric': 'distance_meters'
                })
        
        # Calories analysis
        active_calories = [d.get('active_calories', 0) for d in garmin_data if d.get('active_calories', 0) > 0]
        
        if active_calories:
            avg_active_calories = sum(active_calories) / len(active_calories)
            calories_trend = self._calculate_trend(active_calories)
            
            if avg_active_calories > 500:
                insights.append({
                    'category': InsightCategory.ACTIVITY,
                    'title': 'Good Calorie Burn',
                    'content': f"You're burning an average of {int(avg_active_calories)} active calories daily, which indicates a good level of physical activity.",
                    'recommendation': "This calorie burn supports weight management and cardiovascular health. Keep up the good work!",
                    'priority': 'low',
                    'trend': calories_trend,
                    'data_points': active_calories[-7:] if len(active_calories) >= 7 else active_calories,
                    'visualization': 'bar',
                    'source': 'garmin',
                    'primary_metric': 'active_calories'
                })
            elif avg_active_calories > 300:
                insights.append({
                    'category': InsightCategory.ACTIVITY,
                    'title': 'Moderate Calorie Burn',
                    'content': f"You're burning an average of {int(avg_active_calories)} active calories daily, which provides some health benefits.",
                    'recommendation': "Consider adding more intensity to your activities to increase calorie burn and fitness benefits.",
                    'priority': 'medium',
                    'trend': calories_trend,
                    'data_points': active_calories[-7:] if len(active_calories) >= 7 else active_calories,
                    'visualization': 'bar',
                    'source': 'garmin',
                    'primary_metric': 'active_calories'
                })
            else:
                insights.append({
                    'category': InsightCategory.ACTIVITY,
                    'title': 'Low Calorie Burn',
                    'content': f"You're burning an average of {int(avg_active_calories)} active calories daily, which is on the lower side.",
                    'recommendation': "Try to increase your physical activity level to boost calorie burn and overall fitness.",
                    'priority': 'high',
                    'trend': calories_trend,
                    'data_points': active_calories[-7:] if len(active_calories) >= 7 else active_calories,
                    'visualization': 'bar',
                    'source': 'garmin',
                    'primary_metric': 'active_calories'
                })
        
        # Intensity minutes analysis
        intensity_data = [d.get('intensity_minutes', 0) for d in garmin_data if 'intensity_minutes' in d]
        
        if intensity_data:
            avg_intensity = sum(intensity_data) / len(intensity_data)
            intensity_trend = self._calculate_trend(intensity_data)
            
            if avg_intensity >= 30:
                insights.append({
                    'category': InsightCategory.ACTIVITY,
                    'title': 'Meeting Intensity Guidelines',
                    'content': f"You're averaging {int(avg_intensity)} minutes of moderate-to-vigorous activity daily, which meets health guidelines.",
                    'recommendation': "You're meeting the recommended 150+ minutes of moderate activity per week. Great job maintaining this healthy habit!",
                    'priority': 'low',
                    'trend': intensity_trend,
                    'data_points': intensity_data[-7:] if len(intensity_data) >= 7 else intensity_data,
                    'visualization': 'bar',
                    'source': 'garmin',
                    'primary_metric': 'intensity_minutes'
                })
            elif avg_intensity >= 15:
                insights.append({
                    'category': InsightCategory.ACTIVITY,
                    'title': 'Approaching Intensity Guidelines',
                    'content': f"You're averaging {int(avg_intensity)} minutes of moderate-to-vigorous activity daily.",
                    'recommendation': "You're getting close to the recommended 150+ minutes per week. Try to add a few more minutes of moderate activity each day.",
                    'priority': 'medium',
                    'trend': intensity_trend,
                    'data_points': intensity_data[-7:] if len(intensity_data) >= 7 else intensity_data,
                    'visualization': 'bar',
                    'source': 'garmin',
                    'primary_metric': 'intensity_minutes'
                })
            else:
                insights.append({
                    'category': InsightCategory.ACTIVITY,
                    'title': 'Below Intensity Guidelines',
                    'content': f"You're averaging only {int(avg_intensity)} minutes of moderate-to-vigorous activity daily.",
                    'recommendation': "Health guidelines recommend at least 150 minutes of moderate activity per week. Try to increase your daily intensity minutes.",
                    'priority': 'high',
                    'trend': intensity_trend,
                    'data_points': intensity_data[-7:] if len(intensity_data) >= 7 else intensity_data,
                    'visualization': 'bar',
                    'source': 'garmin',
                    'primary_metric': 'intensity_minutes'
                })
        
        # Floors climbed analysis if available
        floors_data = [d.get('floors_climbed', 0) for d in garmin_data if d.get('floors_climbed', 0) > 0]
        
        if floors_data:
            avg_floors = sum(floors_data) / len(floors_data)
            floors_trend = self._calculate_trend(floors_data)
            
            if avg_floors >= 10:
                insights.append({
                    'category': InsightCategory.ACTIVITY,
                    'title': 'Great Stair Activity',
                    'content': f"You're climbing an average of {avg_floors:.1f} floors daily, which is excellent for leg strength and cardiovascular health.",
                    'recommendation': "Climbing stairs is a great form of exercise. Keep up this healthy habit!",
                    'priority': 'low',
                    'trend': floors_trend,
                    'data_points': floors_data[-7:] if len(floors_data) >= 7 else floors_data,
                    'visualization': 'bar',
                    'source': 'garmin',
                    'primary_metric': 'floors_climbed'
                })
            elif avg_floors >= 5:
                insights.append({
                    'category': InsightCategory.ACTIVITY,
                    'title': 'Good Stair Activity',
                    'content': f"You're climbing an average of {avg_floors:.1f} floors daily, which provides good health benefits.",
                    'recommendation': "Consider adding a few more flights of stairs throughout your day for additional cardiovascular benefits.",
                    'priority': 'medium',
                    'trend': floors_trend,
                    'data_points': floors_data[-7:] if len(floors_data) >= 7 else floors_data,
                    'visualization': 'bar',
                    'source': 'garmin',
                    'primary_metric': 'floors_climbed'
                })
        
        # Strain/workload analysis if available (from WHOOP)
        strain_data = [d.get('strain', None) for d in data if d.get('source', '').lower() == 'whoop']
        strain_data = [s for s in strain_data if s is not None]
        
        if strain_data:
            avg_strain = sum(strain_data) / len(strain_data)
            strain_trend = self._calculate_trend(strain_data)
            
            if avg_strain < 8:
                insights.append({
                    'category': InsightCategory.ACTIVITY,
                    'title': 'Low Training Stress',
                    'content': f"Your average strain of {avg_strain:.1f} indicates a relatively low training load.",
                    'recommendation': "Consider increasing your training intensity or volume if improved fitness is a goal.",
                    'priority': 'medium',
                    'trend': strain_trend,
                    'data_points': strain_data[-7:] if len(strain_data) >= 7 else strain_data,
                    'visualization': 'line',
                    'source': 'whoop',
                    'primary_metric': 'strain'
                })
            elif avg_strain < 14:
                insights.append({
                    'category': InsightCategory.ACTIVITY,
                    'title': 'Moderate Training Load',
                    'content': f"Your average strain of {avg_strain:.1f} indicates a balanced training load.",
                    'recommendation': "This is a sustainable level that should lead to fitness improvements without excessive fatigue.",
                    'priority': 'low',
                    'trend': strain_trend,
                    'data_points': strain_data[-7:] if len(strain_data) >= 7 else strain_data,
                    'visualization': 'line',
                    'source': 'whoop',
                    'primary_metric': 'strain'
                })
            else:
                insights.append({
                    'category': InsightCategory.ACTIVITY,
                    'title': 'High Training Load',
                    'content': f"Your average strain of {avg_strain:.1f} indicates a high training load.",
                    'recommendation': "Ensure you're balancing this high workload with adequate recovery to avoid overtraining.",
                    'priority': 'high',
                    'trend': strain_trend,
                    'data_points': strain_data[-7:] if len(strain_data) >= 7 else strain_data,
                    'visualization': 'line',
                    'source': 'whoop',
                    'primary_metric': 'strain'
                })
        
        return insights
    
    def analyze_recovery(self, data: List[Dict]) -> List[Dict]:
        """Generate recovery-related insights"""
        if not data:
            return []
        
        insights = []
        
        # Recovery score analysis if available
        recovery_data = [d.get('recovery_score', None) for d in data]
        recovery_data = [r for r in recovery_data if r is not None]
        
        if recovery_data:
            avg_recovery = sum(recovery_data) / len(recovery_data)
            recovery_trend = self._calculate_trend(recovery_data)
            
            if avg_recovery < 33:
                insights.append({
                    'category': InsightCategory.RECOVERY,
                    'title': 'Poor Recovery Status',
                    'content': f"Your average recovery score of {avg_recovery:.1f}% indicates your body is consistently under-recovered.",
                    'recommendation': "Prioritize rest, reduce training intensity, and focus on sleep quality and nutrition.",
                    'priority': 'high',
                    'trend': recovery_trend,
                    'data_points': recovery_data[-7:] if len(recovery_data) >= 7 else recovery_data,
                    'visualization': 'gauge'
                })
            elif avg_recovery < 66:
                insights.append({
                    'category': InsightCategory.RECOVERY,
                    'title': 'Moderate Recovery Status',
                    'content': f"Your average recovery score of {avg_recovery:.1f}% indicates moderate recovery levels.",
                    'recommendation': "Pay attention to recovery practices and possibly adjust training intensity on low-recovery days.",
                    'priority': 'medium',
                    'trend': recovery_trend,
                    'data_points': recovery_data[-7:] if len(recovery_data) >= 7 else recovery_data,
                    'visualization': 'gauge'
                })
            else:
                insights.append({
                    'category': InsightCategory.RECOVERY,
                    'title': 'Excellent Recovery Status',
                    'content': f"Your average recovery score of {avg_recovery:.1f}% indicates your body is recovering well between sessions.",
                    'recommendation': "Continue your current balance of training and recovery.",
                    'priority': 'low',
                    'trend': recovery_trend,
                    'data_points': recovery_data[-7:] if len(recovery_data) >= 7 else recovery_data,
                    'visualization': 'gauge'
                })
        
        # Analyze sleep and RHR in relation to recovery
        sleep_data = [d.get('sleep_hours', 0) for d in data if d.get('sleep_hours', 0) > 0]
        rhr_data = [d.get('resting_heart_rate', None) for d in data]
        rhr_data = [rhr for rhr in rhr_data if rhr is not None]
        
        if sleep_data and rhr_data and len(data) >= 3:
            recent_sleep_avg = sum(sleep_data[-3:]) / min(len(sleep_data), 3)
            sleep_trend = self._calculate_trend(sleep_data[-7:] if len(sleep_data) >= 7 else sleep_data)
            
            if recent_sleep_avg < 6 and sleep_trend == 'decreasing':
                insights.append({
                    'category': InsightCategory.RECOVERY,
                    'title': 'Sleep Debt Warning',
                    'content': f"Your recent sleep average of {recent_sleep_avg:.1f} hours is decreasing, which may lead to accumulated fatigue.",
                    'recommendation': "Focus on improving sleep quantity and quality to enhance recovery.",
                    'priority': 'high',
                    'trend': 'decreasing',
                    'data_points': sleep_data[-7:] if len(sleep_data) >= 7 else sleep_data,
                    'visualization': 'line'
                })
        
        return insights
    
    def analyze_trends(self, data: List[Dict]) -> List[Dict]:
        """Generate long-term trend insights"""
        if not data or len(data) < 14:  # Need sufficient data for trends
            return []
        
        insights = []
        
        # Resting heart rate trend analysis
        rhr_data = [d.get('resting_heart_rate', None) for d in data]
        rhr_data = [rhr for rhr in rhr_data if rhr is not None]
        
        if len(rhr_data) >= 14:
            rhr_trend = self._calculate_trend(rhr_data)
            first_week_avg = sum(rhr_data[:7]) / 7
            last_week_avg = sum(rhr_data[-7:]) / 7
            rhr_change = last_week_avg - first_week_avg
            
            if rhr_trend == 'decreasing' and rhr_change < -3:
                insights.append({
                    'category': InsightCategory.TRENDS,
                    'title': 'Improving Cardiovascular Fitness',
                    'content': f"Your resting heart rate has decreased by {abs(rhr_change):.1f} bpm over this period, indicating improved cardiovascular fitness.",
                    'recommendation': "Your training is effectively improving your cardiovascular health. Continue your current approach.",
                    'priority': 'low',
                    'trend': 'decreasing',
                    'data_points': rhr_data[-14:],
                    'visualization': 'line'
                })
            elif rhr_trend == 'increasing' and rhr_change > 5:
                insights.append({
                    'category': InsightCategory.TRENDS,
                    'title': 'Increasing Resting Heart Rate',
                    'content': f"Your resting heart rate has increased by {rhr_change:.1f} bpm, which may indicate fatigue, stress, or reduced fitness.",
                    'recommendation': "Consider a recovery week with reduced training load and focus on sleep and stress management.",
                    'priority': 'high',
                    'trend': 'increasing',
                    'data_points': rhr_data[-14:],
                    'visualization': 'line'
                })
        
        # HRV trend analysis
        hrv_data = [d.get('hrv_ms', None) for d in data]
        hrv_data = [hrv for hrv in hrv_data if hrv is not None]
        
        if len(hrv_data) >= 14:
            hrv_trend = self._calculate_trend(hrv_data)
            first_week_avg = sum(hrv_data[:7]) / 7
            last_week_avg = sum(hrv_data[-7:]) / 7
            hrv_change = last_week_avg - first_week_avg
            
            if hrv_trend == 'increasing' and hrv_change > 5:
                insights.append({
                    'category': InsightCategory.TRENDS,
                    'title': 'Improving Recovery Capacity',
                    'content': f"Your heart rate variability has increased by {hrv_change:.1f} ms, suggesting improved recovery capacity and autonomic nervous system balance.",
                    'recommendation': "Your recovery practices are working well. Continue this balanced approach to training and recovery.",
                    'priority': 'low',
                    'trend': 'increasing',
                    'data_points': hrv_data[-14:],
                    'visualization': 'area'
                })
            elif hrv_trend == 'decreasing' and hrv_change < -5:
                insights.append({
                    'category': InsightCategory.TRENDS,
                    'title': 'Declining Recovery Capacity',
                    'content': f"Your heart rate variability has decreased by {abs(hrv_change):.1f} ms, which may indicate accumulated fatigue or stress.",
                    'recommendation': "Focus on recovery: reduce training intensity, prioritize sleep, and consider stress management techniques.",
                    'priority': 'high',
                    'trend': 'decreasing',
                    'data_points': hrv_data[-14:],
                    'visualization': 'area'
                })
        
        return insights
    
    def get_insight_trends(self, data: Optional[List[Dict]] = None, days: int = 30, source: Optional[str] = None) -> Dict[str, Any]:
        """Get trend information about key metrics"""
        if data is None:
            data = self.get_data(days, source)
        
        if not data:
            return {}
        
        trends = {}
        
        # Determine which metrics to analyze based on the source
        metrics_to_analyze = []
        
        # Get unique sources in the data
        sources_in_data = set(item.get('source', '').lower() for item in data if item.get('source'))
        
        # Always include common metrics
        metrics_to_analyze.extend(self.common_fields)
        
        # Add source-specific metrics if that source is present in the data
        for src, metrics in self.source_capabilities.items():
            if source == 'all' or src in sources_in_data:
                metrics_to_analyze.extend(metrics)
        
        # Remove duplicates
        metrics_to_analyze = list(set(metrics_to_analyze))
        
        for metric in metrics_to_analyze:
            metric_data = [d.get(metric, None) for d in data]
            metric_data = [m for m in metric_data if m is not None]
            
            if metric_data and len(metric_data) > 0:
                trend_direction = self._calculate_trend(metric_data)
                recent_avg = sum(metric_data[-min(7, len(metric_data)):]) / min(7, len(metric_data))
                
                # Only include metrics that have actual data
                if recent_avg > 0 or metric in ['resting_heart_rate', 'min_heart_rate']:  # Some metrics like heart rate can be very low
                    trends[metric] = {
                        'trend': trend_direction,
                        'recent_average': recent_avg,
                        'data_points': metric_data[-14:] if len(metric_data) >= 14 else metric_data,
                        'source': self._determine_data_source(metric, sources_in_data)
                    }
        
        # Cache the trends for use in other functions
        self.trends_cache = trends
        
        return trends
    
    def _determine_data_source(self, metric: str, sources: Set[str]) -> str:
        """Determine which source likely provided this metric"""
        if metric in self.common_fields:
            return "multiple"
            
        for source, capabilities in self.source_capabilities.items():
            if metric in capabilities and source in sources:
                return source
                
        return "unknown"
    
    def generate_all_insights(self, data: Optional[List[Dict]] = None, days: int = 30, source: Optional[str] = None) -> List[Dict]:
        """Generate all available insights for the athlete"""
        if data is None:
            data = self.get_data(days, source)
        
        if not data:
            return []
        
        # Get the sources present in the data
        sources_in_data = set(item.get('source', '').lower() for item in data if item.get('source'))
        
        all_insights = []
        
        # Always run analyses for common metrics
        all_insights.extend(self.analyze_sleep(data))
        all_insights.extend(self.analyze_cardiovascular(data))
        
        # Run source-specific analyses only if we have that source's data
        if 'whoop' in sources_in_data and (source == 'all' or source == 'whoop'):
            all_insights.extend(self.analyze_recovery(data))
            
        if 'garmin' in sources_in_data and (source == 'all' or source == 'garmin'):
            all_insights.extend(self.analyze_activity(data))
            
        # Trends analysis requires sufficient data points
        if len(data) >= 10:  # Need sufficient data for trends
            all_insights.extend(self.analyze_trends(data))
        
        # Sort insights by priority
        priority_map = {'high': 0, 'medium': 1, 'low': 2}
        all_insights.sort(key=lambda x: priority_map.get(x.get('priority', 'low'), 3))
        
        # Add timestamps and IDs
        for i, insight in enumerate(all_insights):
            insight['id'] = f"insight_{i}_{timezone.now().timestamp()}"
            insight['timestamp'] = timezone.now().isoformat()
            # Add the source information if not already present
            if 'source' not in insight:
                insight['source'] = self._determine_data_source(
                    insight.get('primary_metric', ''), 
                    sources_in_data
                )
        
        return all_insights
    
    def get_recommendations(self, data: Optional[List[Dict]] = None, days: int = 30, source: Optional[str] = None) -> List[Dict]:
        """Get actionable recommendations based on insights"""
        insights = self.generate_all_insights(data, days, source)
        
        if not insights:
            return []
        
        # Extract recommendations and add additional context
        recommendations = []
        for insight in insights:
            recommendation = {
                'id': f"rec_{insight['id']}",
                'category': insight['category'],
                'title': f"Recommendation: {insight['title']}",
                'content': insight['recommendation'],
                'priority': insight['priority'],
                'linked_insight': insight['id'],
                'timestamp': timezone.now().isoformat()
            }
            recommendations.append(recommendation)
        
        return recommendations
    
    def _calculate_trend(self, data_points: List[float]) -> str:
        """
        Calculate the trend direction of a series of data points
        
        Returns:
            str: 'increasing', 'decreasing', or 'stable'
        """
        if not data_points or len(data_points) < 3:
            return 'stable'
        
        try:
            # Convert to numpy array and remove None values
            data = [p for p in data_points if p is not None]
            if len(data) < 3:
                return 'stable'
                
            # Simple linear regression
            x = np.arange(len(data))
            y = np.array(data)
            
            # Calculate slope
            slope = np.polyfit(x, y, 1)[0]
            
            # Determine trend based on slope
            if slope > 0.01 * np.mean(y):
                return 'increasing'
            elif slope < -0.01 * np.mean(y):
                return 'decreasing'
            else:
                return 'stable'
                
        except Exception as e:
            logger.error(f"Error calculating trend: {e}")
            return 'stable'


# API interface functions
def get_all_insight_categories():
    """Return all available insight categories"""
    return [{
        'id': category,
        'name': category.capitalize(),
        'icon': InsightCategory.get_icon(category),
        'color': InsightCategory.get_color(category)
    } for category in InsightCategory.get_all()]

def generate_insights_for_athlete(athlete_id, days=30, source=None):
    """Generate insights for the specified athlete"""
    generator = InsightGenerator(athlete_id)
    return generator.generate_all_insights(days=days, source=source)

def get_recommendations_for_athlete(athlete_id, days=30, source=None):
    """Get recommendations for the specified athlete"""
    generator = InsightGenerator(athlete_id)
    return generator.get_recommendations(days=days, source=source)

def get_insight_trends_for_athlete(athlete_id, days=30, source=None):
    """Get metric trends for the specified athlete"""
    generator = InsightGenerator(athlete_id)
    return generator.get_insight_trends(days=days, source=source) 