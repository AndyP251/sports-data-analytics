"""
Test file for the CoachDataSyncService functionality
"""
import os
import sys
import logging
import django
from datetime import datetime, timedelta
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model

# Setup Django for standalone testing
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'athlete_platform.settings')
django.setup()

# Import models and services after Django setup
from athlete_platform.core.models import Team, Athlete, CoreBiometricData, Coach
from athlete_platform.core.services.coach_data_sync_service import CoachDataSyncService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

User = get_user_model()

class CoachDataSyncTest:
    """Helper class to test CoachDataSyncService functionality"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def setup_test_data(self):
        """Set up test data including a team, coach, and athletes with biometric data"""
        try:
            # Create a test team
            self.logger.info("Creating test team...")
            self.coach_user = User.objects.create_user(
                username="test_coach",
                email="coach@test.com",
                password="testpassword",
                role="COACH"
            )
            
            self.team = Team.objects.create(
                name="Test Team",
                coach=self.coach_user,
                description="Test team for coach sync"
            )
            
            # Create a coach profile
            self.coach = Coach.objects.create(
                user=self.coach_user,
                team=self.team
            )
            
            # Create test athletes
            self.logger.info("Creating test athletes...")
            positions = ["FORWARD", "MIDFIELDER", "DEFENDER", "GOALKEEPER"]
            self.athletes = []
            
            for i in range(8):  # Create 8 athletes, 2 per position
                position = positions[i % 4]
                user = User.objects.create_user(
                    username=f"athlete_{position.lower()}_{i+1}",
                    email=f"athlete{i+1}@test.com",
                    password="testpassword",
                    role="ATHLETE"
                )
                
                athlete = Athlete.objects.create(
                    user=user,
                    team=self.team,
                    position=position,
                    jersey_number=i+1
                )
                self.athletes.append(athlete)
            
            # Ensure athletes_array is properly populated
            self.team.athletes_array = [str(athlete.user.id) for athlete in self.athletes]
            self.team.save()
                
            # Create test biometric data
            self.logger.info("Creating test biometric data...")
            end_date = timezone.now().date()
            
            for athlete in self.athletes:
                for i in range(7):  # 7 days of data
                    date = end_date - timedelta(days=i)
                    
                    # Generate position-specific mock data
                    rhr_base = 60
                    hrv_base = 70
                    recovery_base = 80
                    
                    # Adjust based on position
                    if athlete.position == "FORWARD":
                        rhr_base += 5
                        hrv_base -= 5
                        recovery_base -= 5
                    elif athlete.position == "MIDFIELDER":
                        rhr_base += 3
                        hrv_base -= 3
                        recovery_base -= 3
                    elif athlete.position == "DEFENDER":
                        # No adjustments, baseline
                        pass
                    elif athlete.position == "GOALKEEPER":
                        rhr_base -= 3
                        hrv_base += 5
                        recovery_base += 5
                    
                    # Add some daily variation
                    daily_variation = (i % 3) - 1  # -1, 0, or 1
                    
                    CoreBiometricData.objects.create(
                        athlete=athlete,
                        date=date,
                        resting_heart_rate=rhr_base + daily_variation,
                        max_heart_rate=180 + daily_variation,
                        hrv_ms=hrv_base + daily_variation,
                        recovery_score=recovery_base + daily_variation,
                        total_sleep_seconds=7 * 3600 + daily_variation * 1800,  # 7 hours +/- 30 min
                        total_steps=8000 + daily_variation * 500,
                        strain=50 + daily_variation * 5
                    )
            
            self.logger.info("Test data setup complete!")
            return True
        except Exception as e:
            self.logger.error(f"Error setting up test data: {e}")
            return False
    
    def run_tests(self):
        """Run tests on the CoachDataSyncService functionality"""
        try:
            if not self.setup_test_data():
                self.logger.error("Failed to set up test data. Aborting tests.")
                return False
                
            # Create service instance
            self.logger.info("Creating CoachDataSyncService instance...")
            service = CoachDataSyncService(team=self.team)
            
            # Test getting team athletes
            self.logger.info("Testing get_team_athletes...")
            athletes = service.get_team_athletes()
            self.logger.info(f"Found {len(athletes)} athletes")
            
            # Test get_team_biometric_summary
            self.logger.info("Testing get_team_biometric_summary...")
            summary = service.get_team_biometric_summary(days=7)
            self.logger.info(f"Team biometric summary: {summary.keys()}")
            self.logger.info(f"Athletes with data: {summary.get('athletes_with_data', 0)}")
            self.logger.info(f"Metrics: {summary.get('metrics', {}).keys()}")
            
            # Test get_position_biometric_summary
            self.logger.info("Testing get_position_biometric_summary...")
            position_summary = service.get_position_biometric_summary(days=7)
            self.logger.info(f"Position summary contains {len(position_summary)} positions")
            for position, data in position_summary.items():
                self.logger.info(f"Position: {position}, Athletes with data: {data.get('athletes_with_data', 0)}")
            
            # Test get_athlete_biometric_data for the first athlete
            if athletes:
                athlete_id = athletes[0].id
                self.logger.info(f"Testing get_athlete_biometric_data for athlete {athlete_id}...")
                athlete_data = service.get_athlete_biometric_data(athlete_id=str(athlete_id), days=7)
                self.logger.info(f"Athlete data points: {len(athlete_data.get('data_points', []))}")
                self.logger.info(f"Athlete averages: {athlete_data.get('averages', {}).keys()}")
            
            # Test get_position_athletes_data
            self.logger.info("Testing get_position_athletes_data for FORWARD...")
            position_athletes = service.get_position_athletes_data("FORWARD", days=7)
            self.logger.info(f"Position athletes data: {len(position_athletes.get('athletes', []))} athletes")
            
            # Test get_biometric_comparison_by_position
            self.logger.info("Testing get_biometric_comparison_by_position...")
            comparison = service.get_biometric_comparison_by_position(days=7)
            self.logger.info(f"Comparison metrics: {comparison.get('metrics_compared', {}).keys()}")
            self.logger.info(f"Notable differences: {len(comparison.get('notable_differences', []))}")
            
            # Test sync_team_data
            self.logger.info("Testing sync_team_data...")
            sync_result = service.sync_team_data(days=3)
            self.logger.info(f"Sync result: {sync_result}")
            
            # Get training optimization data
            self.logger.info("Testing get_training_optimization_data...")
            optimization_data = service.get_training_optimization_data()
            self.logger.info(f"Optimization status: {optimization_data.get('status')}")
            
            self.logger.info("All tests completed successfully!")
            return True
            
        except Exception as e:
            self.logger.error(f"Error running tests: {e}")
            import traceback
            self.logger.error(traceback.format_exc())
            return False
        
    def cleanup(self):
        """Clean up test data"""
        try:
            self.logger.info("Cleaning up test data...")
            
            # Delete biometric data
            CoreBiometricData.objects.filter(athlete__in=self.athletes).delete()
            
            # Delete athletes
            for athlete in self.athletes:
                athlete.user.delete()  # Will cascade delete athlete
            
            # Delete coach and team
            self.coach.delete()
            self.team.delete()
            self.coach_user.delete()
            
            self.logger.info("Cleanup complete!")
            return True
        except Exception as e:
            self.logger.error(f"Error cleaning up test data: {e}")
            return False

if __name__ == "__main__":
    test = CoachDataSyncTest()
    try:
        test.run_tests()
    finally:
        test.cleanup() 