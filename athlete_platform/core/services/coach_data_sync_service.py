"""
Developed by Andrew William Prince
Last Edit: March 6th, 2025

Coach Data Sync Service for aggregating and analyzing team and player biometric data.
This service provides direct access to team data and implements methods corresponding to the coach API endpoints.
"""
import logging
from datetime import datetime, timedelta
import traceback
from ..models import Athlete, CoreBiometricData, Team, User
import json
from typing import Dict, Any, List, Optional, Tuple
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone
from django.db.models import Avg, Max, Min, Count, Q, F
from .data_sync_service import DataSyncService

# Global debug flag - set to True to enable verbose logging
DEBUG = True

# Configure logger
logger = logging.getLogger(__name__)

def debug_log(message: str) -> None:
    """Helper function for debug logging with consistent formatting"""
    if DEBUG:
        logger.info(f"[COACH_SYNC] {message}")

class CoachDataSyncService:
    """
    Service to aggregate and analyze biometric data for a coach's team.
    Provides methods that directly interact with the database to retrieve
    and process team biometric data.
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
            return
            
        debug_log(f"Initialized with team: {self.team.name} (ID: {self.team.id})")
            
        # Key metrics we'll track
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
        
        # Display names for metrics
        self.METRIC_DISPLAY_NAMES = {
            'resting_heart_rate': 'Resting HR',
            'hrv_ms': 'HRV',
            'recovery_score': 'Recovery',
            'sleep_hours': 'Sleep',
            'total_steps': 'Steps',
            'max_heart_rate': 'Max HR',
            'vo2_max': 'VO2 Max',
            'fatigue_score': 'Fatigue',
            'training_load': 'Training Load',
            'readiness_score': 'Readiness'
        }

    def get_team_athletes(self) -> List[Athlete]:
        """
        Get all athletes on the team by efficiently using the athletes_array field
        and looking up their athlete records.
        """
        if not self.team:
            debug_log("No team provided, returning empty athlete list")
            return []
            
        debug_log(f"Getting athletes for team {self.team.name}")
        
        # Check if team has athletes_array field populated
        if hasattr(self.team, 'athletes_array') and self.team.athletes_array:
            try:
                # athletes_array contains user IDs, not athlete IDs
                user_ids = self.team.athletes_array
                debug_log(f"Found {len(user_ids)} user IDs in athletes_array")
                
                # Get athletes by user IDs
                athletes = Athlete.objects.filter(user_id__in=user_ids).select_related('user')
                
                if athletes.exists():
                    debug_log(f"Found {athletes.count()} athletes through user IDs")
                    return list(athletes)
                else:
                    debug_log("No athletes found through user IDs in athletes_array")
            except Exception as e:
                logger.error(f"Error getting athletes from athletes_array: {str(e)}")
                debug_log(traceback.format_exc())
        
        # Fallback: Get athletes through the direct relation
        debug_log("Falling back to direct team-athlete relation")
        athletes = Athlete.objects.filter(team=self.team).select_related('user')
        
        # If we found athletes, update the athletes_array for future use
        if athletes.exists() and hasattr(self.team, 'athletes_array'):
            debug_log(f"Updating athletes_array with {athletes.count()} athletes")
            try:
                # Store user IDs in the athletes_array
                user_ids = [str(athlete.user.id) for athlete in athletes]
                self.team.athletes_array = user_ids
                self.team.save(update_fields=['athletes_array'])
            except Exception as e:
                logger.error(f"Error updating athletes_array: {str(e)}")
                debug_log(traceback.format_exc())
            
        return list(athletes)
        
    def get_athletes_by_position(self, position: str = None) -> List[Athlete]:
        """Get athletes filtered by position if provided"""
        athletes = self.get_team_athletes()
        
        if not position:
            return athletes
            
        # For the special case of "UNKNOWN" position, include athletes with null/empty positions
        if position.upper() == "UNKNOWN":
            position_athletes = [
                athlete for athlete in athletes 
                if not athlete.position or athlete.position.strip() == "" or athlete.position.upper() == "UNKNOWN"
            ]
        else:
            # For normal positions, use exact match
            position_athletes = [
                athlete for athlete in athletes 
                if athlete.position and athlete.position.upper() == position.upper()
            ]
        
        debug_log(f"Filtered {len(position_athletes)} athletes with position {position}")
        return position_athletes

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
            
        debug_log(f"Getting team biometric summary for past {days} days")
            
        # Calculate date range
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        # Get all athletes
        athletes = self.get_team_athletes()
        athlete_ids = [athlete.id for athlete in athletes]
        
        if not athlete_ids:
            logger.warning(f"No athletes found for team {self.team.name}")
            return {
                'team_name': self.team.name,
                'athlete_count': 0,
                'athletes_with_data': 0,
                'metrics': {},
                'timestamp': timezone.now().isoformat()
            }
        
        debug_log(f"Found {len(athlete_ids)} athletes")
            
        # Query CoreBiometricData for all team athletes in one go
        try:
            biometric_data = CoreBiometricData.objects.filter(
                athlete_id__in=athlete_ids,
                date__range=[start_date, end_date]
            )
            
            debug_log(f"Found {biometric_data.count()} biometric data points")
            
            if not biometric_data.exists():
                return {
                    'team_name': self.team.name,
                    'athlete_count': len(athlete_ids),
                    'athletes_with_data': 0,
                    'metrics': {},
                    'timestamp': timezone.now().isoformat()
                }
                
            # Calculate metrics in one query per metric
            metrics = {}
            for metric in self.BIOMETRIC_METRICS:
                db_field = self._get_db_field_name(metric)
                
                # Skip metrics that don't map to direct DB fields
                if not db_field:
                    continue
                    
                # Filter out null values for this metric
                valid_data = biometric_data.filter(**{f"{db_field}__isnull": False})
                
                if valid_data.exists():
                    # Calculate in single query
                    results = valid_data.aggregate(
                        avg=Avg(db_field),
                        max=Max(db_field),
                        min=Min(db_field)
                    )
                    
                    # Format numeric values
                    avg_value = round(float(results['avg']), 2) if results['avg'] is not None else None
                    max_value = round(float(results['max']), 2) if results['max'] is not None else None
                    min_value = round(float(results['min']), 2) if results['min'] is not None else None
                    
                    metrics[metric] = {
                        'avg': avg_value,
                        'max': max_value,
                        'min': min_value,
                        'interpretation': self._get_metric_interpretation(metric),
                        'display_name': self.METRIC_DISPLAY_NAMES.get(metric, metric.replace('_', ' ').title())
                    }
            
            # Count unique athletes with data
            athletes_with_data = biometric_data.values('athlete').distinct().count()
            
            debug_log(f"Processed {len(metrics)} metrics for {athletes_with_data} athletes")
                
            return {
                'team_name': self.team.name,
                'athlete_count': len(athlete_ids),
                'athletes_with_data': athletes_with_data,
                'metrics': metrics,
                'timestamp': timezone.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting team biometric summary: {str(e)}")
            debug_log(traceback.format_exc())
            return {
                'team_name': self.team.name,
                'athlete_count': len(athlete_ids),
                'athletes_with_data': 0,
                'metrics': {},
                'error': str(e),
                'timestamp': timezone.now().isoformat()
            }
    
    def get_position_biometric_summary(self, days: int = 7) -> Dict[str, Dict[str, Any]]:
        """
        Get aggregated biometric data summary organized by player position
        
        Returns a dictionary with position keys and metric summaries
        """
        if not self.team:
            logger.warning("No team specified for position biometric summary")
            return {}
            
        debug_log(f"Getting position biometric summary for past {days} days")
            
        # Calculate date range
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        # Get all athletes, grouped by position
        all_athletes = self.get_team_athletes()
        
        # Group athletes by position
        position_athletes = {}
        for athlete in all_athletes:
            position = athlete.position.upper() if athlete.position else "UNKNOWN"
            if position not in position_athletes:
                position_athletes[position] = []
            position_athletes[position].append(athlete)
        
        debug_log(f"Grouped {len(all_athletes)} athletes into {len(position_athletes)} positions")
        
        # Process each position
        position_summaries = {}
        
        for position, athletes in position_athletes.items():
            athlete_ids = [athlete.id for athlete in athletes]
            
            # Skip if no athletes in this position
            if not athlete_ids:
                continue
                
            debug_log(f"Processing {len(athlete_ids)} athletes in position {position}")
                
            # Query the database for biometric data for this position
            try:
                biometric_data = CoreBiometricData.objects.filter(
                    athlete_id__in=athlete_ids,
                    date__range=[start_date, end_date]
                )
                
                # Skip if no data for this position
                if not biometric_data.exists():
                    debug_log(f"No biometric data found for position {position}")
                    continue
                
                debug_log(f"Found {biometric_data.count()} data points for position {position}")
                
                # Calculate metrics
                metrics = {}
                for metric in self.BIOMETRIC_METRICS:
                    db_field = self._get_db_field_name(metric)
                    
                    # Skip metrics that don't map to direct DB fields
                    if not db_field:
                        continue
                        
                    # Filter out null values for this metric
                    valid_data = biometric_data.filter(**{f"{db_field}__isnull": False})
                    
                    if valid_data.exists():
                        # Calculate in single query
                        results = valid_data.aggregate(
                            avg=Avg(db_field),
                            max=Max(db_field),
                            min=Min(db_field)
                        )
                        
                        # Format numeric values
                        avg_value = round(float(results['avg']), 2) if results['avg'] is not None else None
                        max_value = round(float(results['max']), 2) if results['max'] is not None else None
                        min_value = round(float(results['min']), 2) if results['min'] is not None else None
                        
                        metrics[metric] = {
                            'avg': avg_value,
                            'max': max_value,
                            'min': min_value,
                            'interpretation': self._get_metric_interpretation(metric),
                            'display_name': self.METRIC_DISPLAY_NAMES.get(metric, metric.replace('_', ' ').title())
                        }
                
                # Count unique athletes with data
                athletes_with_data = biometric_data.values('athlete').distinct().count()
                    
                position_summaries[position] = {
                    'position': position,
                    'athlete_count': len(athlete_ids),
                    'athletes_with_data': athletes_with_data,
                    'metrics': metrics
                }
                
            except Exception as e:
                logger.error(f"Error processing position {position}: {str(e)}")
                debug_log(traceback.format_exc())
        
        debug_log(f"Returning summaries for {len(position_summaries)} positions")
        return position_summaries
    
    def get_athlete_biometric_data(self, athlete_id: str, days: int = 7) -> Dict[str, Any]:
        """
        Get detailed biometric data for a specific athlete
        
        Returns a dictionary with the athlete's information and their biometric data
        """
        debug_log(f"Getting biometric data for athlete {athlete_id} for past {days} days")
        
        try:
            # Get the athlete
            athlete = Athlete.objects.get(id=athlete_id)
            
            # Verify athlete is on the team if a team is specified
            if self.team and athlete.team_id != self.team.id:
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
                    db_field = self._get_db_field_name(metric)
                    if not db_field:
                        continue
                        
                    value = getattr(data, db_field, None)
                    if value is not None:
                        # Format numeric values
                        if isinstance(value, (int, float)):
                            value = round(float(value), 2)
                        
                        # Convert sleep seconds to hours if needed
                        if db_field == 'total_sleep_seconds' and metric == 'sleep_hours':
                            value = round(value / 3600, 2)
                            
                        data_point['metrics'][metric] = value
                
                data_points.append(data_point)
            
            # Try to sync data for this athlete
            self._sync_athlete_data(athlete)
            
            # Calculate averages across the period
            averages = {}
            for metric in self.BIOMETRIC_METRICS:
                db_field = self._get_db_field_name(metric)
                if not db_field:
                    continue
                    
                if db_field == 'total_sleep_seconds' and metric == 'sleep_hours':
                    # For sleep hours, we need to convert seconds to hours
                    values = [getattr(data, db_field, 0) / 3600 for data in biometric_data]
                else:
                    values = [getattr(data, db_field, None) for data in biometric_data]
                    
                valid_values = [v for v in values if v is not None]
                
                if valid_values:
                    avg_value = sum(valid_values) / len(valid_values)
                    averages[metric] = round(float(avg_value), 2)
            
            debug_log(f"Returning {len(data_points)} data points for athlete {athlete_id}")
            
            return {
                'athlete': {
                    'id': str(athlete.id),
                    'name': athlete.user.username,
                    'username': athlete.user.username,
                    'position': athlete.position,
                    'jersey_number': athlete.jersey_number
                },
                'data_points': data_points,
                'averages': averages,
                'data_count': len(data_points)
            }
            
        except Athlete.DoesNotExist:
            logger.error(f"Athlete {athlete_id} not found")
            return {
                'error': f"Athlete {athlete_id} not found",
                'data_points': [],
                'averages': {},
                'data_count': 0
            }
        except Exception as e:
            logger.error(f"Error getting athlete biometric data: {str(e)}")
            debug_log(traceback.format_exc())
            return {
                'error': str(e),
                'data_points': [],
                'averages': {},
                'data_count': 0
            }
    
    def get_position_athletes_data(self, position: str, days: int = 7) -> Dict[str, Any]:
        """
        Get detailed biometric data for all athletes in a specific position
        
        Returns a dictionary with position summary and individual athlete data
        """
        debug_log(f"Getting athlete data for position {position} for past {days} days")
        
        if not self.team:
            logger.warning("No team specified for position athletes data")
            return {
                'position': position,
                'athlete_count': 0,
                'athletes': [],
                'athletes_with_data': 0
            }
            
        # Get all athletes to log their positions
        all_athletes = self.get_team_athletes()
        if DEBUG:
            for ath in all_athletes:
                pos_value = ath.position if ath.position else "None/null"
                debug_log(f"Athlete {ath.user.username} ({ath.id}) has position: '{pos_value}'")
                
        # Get athletes in this position
        athletes = self.get_athletes_by_position(position)
        
        if not athletes:
            debug_log(f"No athletes found for position {position}")
            return {
                'position': position,
                'athlete_count': 0,
                'athletes': [],
                'athletes_with_data': 0
            }
        
        debug_log(f"Found {len(athletes)} athletes in position {position}")
        
        # Get data for each athlete
        athlete_data = []
        for athlete in athletes:
            data = self.get_athlete_biometric_data(str(athlete.id), days)
            if data and 'error' not in data:  # Only include if we got valid data
                athlete_data.append(data)
                debug_log(f"Added data for athlete {athlete.user.username} with {len(data.get('data_points', []))} data points")
        
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
        
        debug_log(f"Returning data for {len(athlete_data)} athletes with position metrics")
        
        return {
            'position': position,
            'athlete_count': len(athletes),
            'athletes_with_data': len(athlete_data),
            'position_metrics': position_metrics,
            'athletes': athlete_data  # This is guaranteed to be a list
        }
    
    def get_biometric_comparison_by_position(self, days: int = 30) -> Dict[str, Any]:
        """
        Compare biometric metrics across different positions
        
        Returns a dictionary with comparative metrics and trends
        """
        debug_log(f"Getting position comparison for past {days} days")
        
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
                            'display_name': self.METRIC_DISPLAY_NAMES.get(metric, metric.replace('_', ' ').title()),
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
        
        debug_log(f"Found {len(comparison['notable_differences'])} notable differences between positions")
        return comparison
    
    def get_training_optimization_data(self, position: str = None) -> Dict[str, Any]:
        """
        Generate training optimization data based on athlete metrics
        
        Returns a dictionary with optimization recommendations
        """
        debug_log(f"Getting training optimization data for position: {position or 'all'}")
        
        # This is a placeholder implementation
        # In a real implementation, this would analyze biometric trends and generate recommendations
        athletes = self.get_athletes_by_position(position)
        
        if not athletes:
            return {
                'position': position,
                'status': 'no_data',
                'message': f"No athletes found for position: {position}" if position else "No athletes found on team"
            }
        
        # For the placeholder, return a basic structure
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
        
    def sync_team_data(self, days: int = 7, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Trigger a sync of biometric data for all athletes on the team
        
        Returns information about the sync operation
        """
        if not self.team:
            logger.warning("No team specified for syncing biometric data")
            return {
                'success': False,
                'message': "No team specified",
                'sync_count': 0
            }
            
        debug_log(f"Syncing team data for past {days} days, force_refresh={force_refresh}")
            
        athletes = self.get_team_athletes()
        
        if not athletes:
            logger.warning(f"No athletes found for team {self.team.name}")
            return {
                'success': False,
                'message': f"No athletes found for team {self.team.name}",
                'sync_count': 0
            }
        
        # Track success for each athlete
        success_count = 0
        failed_count = 0
        athlete_results = []
        
        # Sync data for each athlete
        for athlete in athletes:
            try:
                debug_log(f"Syncing data for athlete {athlete.user.username} ({athlete.id})")
                result = self._sync_athlete_data(athlete, days=days)
                
                athlete_results.append({
                    'athlete_id': str(athlete.id),
                    'username': athlete.user.username,
                    'success': result['success'],
                    'message': result['message']
                })
                
                if result['success']:
                    success_count += 1
                else:
                    failed_count += 1
                    
            except Exception as e:
                logger.error(f"Error syncing data for athlete {athlete.id}: {str(e)}")
                debug_log(traceback.format_exc())
                failed_count += 1
                athlete_results.append({
                    'athlete_id': str(athlete.id),
                    'username': getattr(athlete.user, 'username', 'Unknown'),
                    'success': False,
                    'message': str(e)
                })
        
        # Update timestamp in cache
        self._update_last_sync_timestamp()
            
        debug_log(f"Team sync complete: {success_count} successful, {failed_count} failed")
        
        return {
            'success': success_count > 0,
            'message': f"Synced data for {success_count} athletes ({failed_count} failed)",
            'sync_count': success_count,
            'failed_count': failed_count,
            'total_count': len(athletes),
            'timestamp': timezone.now().isoformat(),
            'results': athlete_results
        }
    
    def get_cached_team_data(self) -> Dict[str, Any]:
        """Get cached team data if available"""
        if not self.team:
            return None
            
        key = f"team_data_{self.team.id}"
        cached_data = cache.get(key)
        
        if cached_data:
            debug_log("Returning cached team data")
            
        return cached_data
        
    def _sync_athlete_data(self, athlete, days=7, force_refresh=False) -> Dict[str, Any]:
        """Sync data for an individual athlete"""
        try:
            sync_service = DataSyncService(athlete)
            success = sync_service.sync_data(
                start_date=timezone.now().date() - timedelta(days=days),
                end_date=timezone.now().date()
            )
            
            if success:
                return {
                    'success': True,
                    'message': f"Successfully synced data for {athlete.user.username}"
                }
            else:
                return {
                    'success': False,
                    'message': f"Failed to sync data for {athlete.user.username}"
                }
                
        except Exception as e:
            logger.error(f"Error in _sync_athlete_data for {athlete.id}: {str(e)}")
            return {
                'success': False,
                'message': str(e)
            }
    
    def _update_last_sync_timestamp(self):
        """Update the timestamp of the last sync operation"""
        if not self.team:
            return
            
        cache.set(f"last_sync_{self.team.id}", timezone.now().isoformat(), 86400)  # 24 hour cache
    
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
    
    def _get_db_field_name(self, metric: str) -> Optional[str]:
        """Map metric names to actual database field names"""
        # Direct mapping for most fields
        if metric in ['resting_heart_rate', 'max_heart_rate', 'hrv_ms', 'recovery_score']:
            return metric
            
        # Special cases
        if metric == 'sleep_hours':
            return 'total_sleep_seconds'
        if metric == 'total_steps':
            return 'total_steps'
        if metric == 'fatigue_score':
            # Inverse of recovery score, calculate in query
            return None
        if metric == 'vo2_max':
            # Not directly in DB
            return None
        if metric == 'training_load':
            # May be represented by "strain"
            return 'strain'
        if metric == 'readiness_score':
            # May be the same as recovery score
            return 'recovery_score'
            
        return None
    
    def _generate_position_difference_insight(self, metric, interpretation, high_pos, low_pos):
        """Generate an insight about positional differences for a metric"""
        metric_name = self.METRIC_DISPLAY_NAMES.get(metric, metric.replace('_', ' ').title())
        
        if interpretation == 'higher_better':
            return f"{high_pos} players show higher {metric_name} than {low_pos}, which may indicate better recovery/fitness advantages."
        elif interpretation == 'lower_better':
            return f"{low_pos} players show lower {metric_name} than {high_pos}, which may indicate better recovery/fitness advantages."
        else:
            return f"Significant difference in {metric_name} between {high_pos} and {low_pos} players may reflect different physiological demands." 