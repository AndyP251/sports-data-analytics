"""
Developed by Andrew William Prince
Last Edit: November 15th, 2023

Coach Data Sync Service for aggregating and analyzing team and player biometric data.
This service extends functionality beyond the individual athlete focus of DataSyncService,
providing position-based aggregation and team-level metrics for coaches.
"""
from datetime import datetime, timedelta
import traceback
from ..models import Athlete, CoreBiometricData, Team
import json
import numpy as np
import logging
from scipy import stats
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from django.core.cache import cache
from functools import wraps
from django.db import transaction
from django.utils import timezone
from django.db.models import Avg, Max, Min, Count, Q, F
from .data_sync_service import DataSyncService

logger = logging.getLogger(__name__)

# Cache decorator for expensive coach data operations
def coach_data_cache(timeout=300):
    """Decorator to cache expensive coach data operations"""
    def decorator(func):
        @wraps(func)
        def wrapper(self, *args, **kwargs):
            # Create a cache key based on function name, team_id, and other args
            team_id = self.team.id if self.team else 'no_team'
            cache_key = f"coach_data_{func.__name__}_{team_id}"
            
            # Add any filter args to the cache key
            if 'position' in kwargs and kwargs['position']:
                cache_key += f"_pos_{kwargs['position']}"
            if 'days' in kwargs:
                cache_key += f"_days_{kwargs['days']}"
                
            # Check if data is in cache
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                logger.info(f"Returning cached data for {cache_key}")
                return cached_data
            
            # Call the original function
            result = func(self, *args, **kwargs)
            
            # Store result in cache
            cache.set(cache_key, result, timeout)
            return result
        return wrapper
    return decorator

class CoachDataSyncService:
    """
    Service to aggregate and analyze biometric data for a coach's team.
    Provides position-based analysis and team-level metrics.
    """
    
    def __init__(self, team: Team = None, coach=None):
        """
        Initialize with either a team or a coach who has a team
        """
        self.team = team
        
        # If a coach is provided but no team, try to get team from coach
        if not self.team and coach and hasattr(coach, 'team'):
            self.team = coach.team
            
        if not self.team:
            logger.warning("CoachDataSyncService initialized without a team")
            
        # Key metrics we'll track across all functions
        self.BIOMETRIC_METRICS = [
            'resting_heart_rate',
            'hrv_ms',
            'recovery_score',
            'sleep_hours',
            'total_steps',
            'max_heart_rate',
            'vo2_max',
            'fatigue_score',
            'training_load',
            'readiness_score'
        ]
        
        # Metrics that have a "higher is better" interpretation
        self.HIGHER_BETTER_METRICS = [
            'hrv_ms',
            'recovery_score', 
            'sleep_hours',
            'vo2_max',
            'readiness_score'
        ]
        
        # Metrics that have a "lower is better" interpretation  
        self.LOWER_BETTER_METRICS = [
            'resting_heart_rate',
            'fatigue_score'
        ]
        
        # Metrics that have an "optimal range" interpretation
        self.RANGE_METRICS = [
            'training_load',
            'total_steps',
            'max_heart_rate'
        ]
        
        # Default position categories for team sports
        self.DEFAULT_POSITIONS = ['FORWARD', 'MIDFIELDER', 'DEFENDER', 'GOALKEEPER']

    def get_team_athletes(self) -> List[Athlete]:
        """Get all athletes on the team"""
        if not self.team:
            return []
            
        # First check the athletes_array field for IDs
        if hasattr(self.team, 'athletes_array') and self.team.athletes_array:
            try:
                # Get athletes by IDs in the athletes_array
                athlete_ids = self.team.athletes_array
                logger.info(f"Using athletes_array with {len(athlete_ids)} athletes for team {self.team.name}")
                
                # Convert string IDs to UUID and query
                athletes = Athlete.objects.filter(id__in=athlete_ids)
                
                # If we found all the athletes, return them
                if athletes.count() == len(athlete_ids):
                    return athletes
                    
                # If not all athletes were found, log a warning
                logger.warning(f"Only found {athletes.count()} of {len(athlete_ids)} athletes from athletes_array")
            except Exception as e:
                logger.error(f"Error getting athletes from athletes_array: {e}")
        
        # Fallback to the traditional relation
        athletes = Athlete.objects.filter(team=self.team)
        
        # If we got athletes through the relation but not through the array,
        # update the athletes_array to keep it in sync
        if athletes.exists() and (not hasattr(self.team, 'athletes_array') or not self.team.athletes_array):
            try:
                self.team.update_athletes_array()
            except Exception as e:
                logger.error(f"Error updating athletes_array: {e}")
            
        return athletes
        
    def get_athletes_by_position(self, position: str = None) -> List[Athlete]:
        """Get athletes filtered by position if provided"""
        if not self.team:
            return []
            
        athletes = Athlete.objects.filter(team=self.team)
        
        if position:
            # Case insensitive position filter
            athletes = athletes.filter(position__iexact=position)
            
        return athletes

    @coach_data_cache(timeout=900)  # 15 minutes cache
    def get_team_biometric_summary(self, days: int = 7) -> Dict[str, Any]:
        """
        Get aggregated biometric data summary for the entire team
        
        Returns a dictionary with:
        - average metrics for the team
        - count of athletes with data
        - timestamp of the data
        """
        if not self.team:
            logger.warning("No team specified for biometric summary")
            return {}
            
        # Calculate date range
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        athletes = self.get_team_athletes()
        athlete_ids = [athlete.id for athlete in athletes]
        
        if not athlete_ids:
            logger.warning(f"No athletes found for team {self.team.name}")
            return {}
            
        # Query the database for biometric data
        biometric_data = CoreBiometricData.objects.filter(
            athlete_id__in=athlete_ids,
            date__range=[start_date, end_date]
        )
        
        # If no data, return empty summary
        if not biometric_data.exists():
            logger.warning(f"No biometric data found for team {self.team.name}")
            return {
                'team_name': self.team.name,
                'athlete_count': len(athlete_ids),
                'athletes_with_data': 0,
                'metrics': {},
                'timestamp': timezone.now().isoformat()
            }
        
        # Calculate aggregate metrics
        metrics = {}
        for metric in self.BIOMETRIC_METRICS:
            # Filter out null values for this metric
            valid_data = biometric_data.filter(**{f"{metric}__isnull": False})
            
            # Only calculate average if we have valid data points
            if valid_data.exists():
                avg_value = valid_data.aggregate(avg=Avg(metric))['avg']
                max_value = valid_data.aggregate(max=Max(metric))['max']
                min_value = valid_data.aggregate(min=Min(metric))['min']
                
                # Format numeric values
                avg_value = round(float(avg_value), 2) if avg_value is not None else None
                max_value = round(float(max_value), 2) if max_value is not None else None
                min_value = round(float(min_value), 2) if min_value is not None else None
                
                metrics[metric] = {
                    'avg': avg_value,
                    'max': max_value,
                    'min': min_value,
                    'interpretation': self._get_metric_interpretation(metric)
                }
        
        # Count unique athletes with data
        athletes_with_data = biometric_data.values('athlete').distinct().count()
            
        return {
            'team_name': self.team.name,
            'athlete_count': len(athlete_ids),
            'athletes_with_data': athletes_with_data,
            'metrics': metrics,
            'timestamp': timezone.now().isoformat()
        }
    
    @coach_data_cache(timeout=900)  # 15 minutes cache
    def get_position_biometric_summary(self, days: int = 7) -> Dict[str, Dict[str, Any]]:
        """
        Get aggregated biometric data summary organized by player position
        
        Returns a dictionary with position keys and metric summaries
        """
        if not self.team:
            logger.warning("No team specified for position biometric summary")
            return {}
            
        # Calculate date range
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        # Get all athletes on the team
        athletes = self.get_team_athletes()
        
        # Group athletes by position
        positions_dict = {}
        for athlete in athletes:
            position = athlete.position.upper() if athlete.position else "UNKNOWN"
            if position not in positions_dict:
                positions_dict[position] = []
            positions_dict[position].append(athlete.id)
        
        # Initialize results
        position_summaries = {}
        
        # Process each position
        for position, athlete_ids in positions_dict.items():
            # Skip if no athletes in this position
            if not athlete_ids:
                continue
                
            # Query the database for biometric data for this position
            biometric_data = CoreBiometricData.objects.filter(
                athlete_id__in=athlete_ids,
                date__range=[start_date, end_date]
            )
            
            # Skip if no data for this position
            if not biometric_data.exists():
                continue
            
            # Calculate aggregate metrics for this position
            metrics = {}
            for metric in self.BIOMETRIC_METRICS:
                # Filter out null values for this metric
                valid_data = biometric_data.filter(**{f"{metric}__isnull": False})
                
                # Only calculate average if we have valid data points
                if valid_data.exists():
                    avg_value = valid_data.aggregate(avg=Avg(metric))['avg']
                    max_value = valid_data.aggregate(max=Max(metric))['max']
                    min_value = valid_data.aggregate(min=Min(metric))['min']
                    
                    # Format numeric values
                    avg_value = round(float(avg_value), 2) if avg_value is not None else None
                    max_value = round(float(max_value), 2) if max_value is not None else None
                    min_value = round(float(min_value), 2) if min_value is not None else None
                    
                    metrics[metric] = {
                        'avg': avg_value,
                        'max': max_value,
                        'min': min_value,
                        'interpretation': self._get_metric_interpretation(metric)
                    }
            
            # Count unique athletes with data in this position
            athletes_with_data = biometric_data.values('athlete').distinct().count()
                
            position_summaries[position] = {
                'position': position,
                'athlete_count': len(athlete_ids),
                'athletes_with_data': athletes_with_data,
                'metrics': metrics
            }
        
        return position_summaries
    
    @coach_data_cache(timeout=600)  # 10 minutes cache
    def get_athlete_biometric_data(self, athlete_id: str, days: int = 7) -> Dict[str, Any]:
        """
        Get detailed biometric data for a specific athlete
        
        Returns a dictionary with the athlete's information and their biometric data
        """
        try:
            # Get the athlete
            athlete = Athlete.objects.get(id=athlete_id)
            
            # Verify athlete is on the team
            if self.team and athlete.team != self.team:
                logger.warning(f"Athlete {athlete_id} is not on team {self.team.id}")
                return {}
            
            # Calculate date range
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=days)
            
            # Query the database for this athlete's biometric data
            biometric_data = CoreBiometricData.objects.filter(
                athlete=athlete,
                date__range=[start_date, end_date]
            ).order_by('date')
            
            # Process data for return
            data_points = []
            for data in biometric_data:
                data_point = {
                    'date': data.date.isoformat(),
                    'metrics': {}
                }
                
                # Add each metric if it exists
                for metric in self.BIOMETRIC_METRICS:
                    value = getattr(data, metric, None)
                    if value is not None:
                        # Format numeric values
                        if isinstance(value, (int, float)):
                            value = round(float(value), 2)
                        data_point['metrics'][metric] = value
                
                data_points.append(data_point)
            
            # Calculate averages across the period
            averages = {}
            for metric in self.BIOMETRIC_METRICS:
                values = [getattr(data, metric, None) for data in biometric_data]
                valid_values = [v for v in values if v is not None]
                
                if valid_values:
                    avg_value = sum(valid_values) / len(valid_values)
                    averages[metric] = round(float(avg_value), 2)
            
            return {
                'athlete': {
                    'id': str(athlete.id),
                    'name': athlete.user.username,
                    'position': athlete.position,
                    'jersey_number': athlete.jersey_number
                },
                'data_points': data_points,
                'averages': averages,
                'data_count': len(data_points)
            }
            
        except Athlete.DoesNotExist:
            logger.error(f"Athlete {athlete_id} not found")
            return {}
        except Exception as e:
            logger.error(f"Error getting athlete biometric data: {e}")
            return {}
    
    @coach_data_cache(timeout=900)  # 15 minutes cache
    def get_position_athletes_data(self, position: str, days: int = 7) -> Dict[str, Any]:
        """
        Get detailed biometric data for all athletes in a specific position
        
        Returns a dictionary with position summary and individual athlete data
        """
        if not self.team:
            logger.warning("No team specified for position athletes data")
            return {}
            
        # Get athletes in this position
        athletes = self.get_athletes_by_position(position)
        
        if not athletes:
            logger.warning(f"No athletes found for position {position}")
            return {
                'position': position,
                'athlete_count': 0,
                'athletes': []
            }
        
        # Get data for each athlete
        athlete_data = []
        for athlete in athletes:
            data = self.get_athlete_biometric_data(str(athlete.id), days)
            if data:  # Only include if we got data
                athlete_data.append(data)
        
        # Sort by jersey number if available
        athlete_data.sort(key=lambda x: x['athlete'].get('jersey_number', 999) or 999)
        
        # Calculate position averages
        position_metrics = {}
        for metric in self.BIOMETRIC_METRICS:
            values = []
            for athlete in athlete_data:
                if metric in athlete.get('averages', {}):
                    values.append(athlete['averages'][metric])
            
            if values:
                avg_value = sum(values) / len(values)
                position_metrics[metric] = round(float(avg_value), 2)
        
        return {
            'position': position,
            'athlete_count': len(athletes),
            'athletes_with_data': len(athlete_data),
            'position_metrics': position_metrics,
            'athletes': athlete_data
        }
    
    def get_training_optimization_data(self, position: str = None) -> Dict[str, Any]:
        """
        Generate training optimization data based on athlete metrics
        This is a scaffold for future algorithm implementation
        
        Returns a dictionary with optimization recommendations
        """
        # This is a scaffold for future algorithm implementation
        # Would analyze biometric trends and generate specific training recommendations
        
        # For now, return a basic structure that could be filled with real data later
        athletes = self.get_athletes_by_position(position)
        
        if not athletes:
            return {
                'position': position,
                'status': 'no_data',
                'message': f"No athletes found for position: {position}" if position else "No athletes found on team"
            }
            
        return {
            'position': position if position else 'all',
            'athlete_count': len(athletes),
            'status': 'scaffold',
            'message': "Training optimization algorithm not yet implemented",
            'recommendations': [
                {
                    'type': 'recovery',
                    'title': 'Team Recovery Focus',
                    'description': 'Preliminary data suggests team recovery metrics could be improved',
                    'priority': 'medium',
                    'metrics_involved': ['recovery_score', 'sleep_hours', 'hrv_ms']
                },
                {
                    'type': 'training',
                    'title': 'Position-specific Training Adjustment',
                    'description': 'Consider position-specific load management',
                    'priority': 'low',
                    'metrics_involved': ['training_load', 'fatigue_score', 'readiness_score']
                }
            ]
        }
        
    def sync_team_biometric_data(self, days: int = 7, force_refresh: bool = False) -> bool:
        """
        Trigger a sync of biometric data for all athletes on the team
        
        Returns True if sync was successful for at least one athlete
        """
        if not self.team:
            logger.warning("No team specified for syncing biometric data")
            return False
            
        athletes = self.get_team_athletes()
        
        if not athletes:
            logger.warning(f"No athletes found for team {self.team.name}")
            return False
        
        # Track success for each athlete
        success_count = 0
        
        # Sync data for each athlete
        for athlete in athletes:
            try:
                sync_service = DataSyncService(athlete)
                success = sync_service.sync_data(
                    start_date=timezone.now() - timedelta(days=days),
                    end_date=timezone.now()
                )
                
                if success:
                    success_count += 1
                    
            except Exception as e:
                logger.error(f"Error syncing data for athlete {athlete.id}: {e}")
                continue
        
        # Clear cache after syncing
        if success_count > 0:
            self._clear_cache()
            
        return success_count > 0
    
    def _clear_cache(self):
        """Clear all coach data caches for this team"""
        team_id = self.team.id if self.team else 'no_team'
        cache_pattern = f"coach_data_*_{team_id}*"
        
        # In a real implementation, you would use a more sophisticated way to clear 
        # pattern-based cache keys. This is a placeholder for that logic.
        # For now, we'll just log that we would clear these caches
        logger.info(f"Would clear caches matching pattern: {cache_pattern}")
    
    def _get_metric_interpretation(self, metric: str) -> str:
        """Get the interpretation category for a metric"""
        if metric in self.HIGHER_BETTER_METRICS:
            return 'higher_better'
        elif metric in self.LOWER_BETTER_METRICS:
            return 'lower_better'
        elif metric in self.RANGE_METRICS:
            return 'optimal_range'
        else:
            return 'neutral'
    
    def get_biometric_comparison_by_position(self, days: int = 30) -> Dict[str, Any]:
        """
        Compare biometric metrics across different positions
        
        Returns a dictionary with comparative metrics and trends
        """
        if not self.team:
            logger.warning("No team specified for position comparison")
            return {}
            
        # Get position summaries
        position_summaries = self.get_position_biometric_summary(days)
        
        if not position_summaries:
            return {}
        
        # Initialize comparison structure
        comparison = {
            'team_name': self.team.name,
            'metrics_compared': {},
            'notable_differences': []
        }
        
        # Create direct metric comparisons
        for metric in self.BIOMETRIC_METRICS:
            metric_by_position = {}
            
            for position, summary in position_summaries.items():
                if metric in summary.get('metrics', {}):
                    avg_value = summary['metrics'][metric].get('avg')
                    if avg_value is not None:
                        metric_by_position[position] = avg_value
            
            # Only include metrics that have data for at least 2 positions
            if len(metric_by_position) >= 2:
                comparison['metrics_compared'][metric] = metric_by_position
                
                # Check for notable differences between positions
                if len(metric_by_position) >= 2:
                    # Find min and max values and positions
                    min_pos = min(metric_by_position.items(), key=lambda x: x[1])
                    max_pos = max(metric_by_position.items(), key=lambda x: x[1])
                    
                    # Calculate the percentage difference
                    diff_percent = abs(max_pos[1] - min_pos[1]) / ((max_pos[1] + min_pos[1]) / 2) * 100
                    
                    # If the difference is significant (> 15%), note it
                    if diff_percent > 15:
                        interpretation = self._get_metric_interpretation(metric)
                        comparison['notable_differences'].append({
                            'metric': metric,
                            'difference_percent': round(diff_percent, 1),
                            'highest_position': max_pos[0],
                            'highest_value': max_pos[1],
                            'lowest_position': min_pos[0],
                            'lowest_value': min_pos[1],
                            'interpretation': interpretation,
                            'insight': self._generate_position_difference_insight(
                                metric, interpretation, max_pos[0], min_pos[0]
                            )
                        })
        
        return comparison
    
    def _generate_position_difference_insight(self, metric, interpretation, high_pos, low_pos):
        """Generate an insight about positional differences for a metric"""
        metric_name = metric.replace('_', ' ').title()
        
        if interpretation == 'higher_better':
            return f"{high_pos} players show higher {metric_name} than {low_pos}, which may indicate better recovery/fitness advantages."
        elif interpretation == 'lower_better':
            return f"{low_pos} players show lower {metric_name} than {high_pos}, which may indicate better recovery/fitness advantages."
        else:
            return f"Significant difference in {metric_name} between {high_pos} and {low_pos} players may reflect different physiological demands." 