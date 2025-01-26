from datetime import datetime, timedelta
from ..utils.garmin_utils import GarminDataCollector
from ..models import BiometricData, Athlete
from .storage_service import UserStorageService
import json

class AthleteDataSyncService:
    def __init__(self):
        self.garmin_collector = GarminDataCollector()
        self.storage_service = UserStorageService()

    def sync_athlete_data(self, athlete):
        """
        Main method to sync athlete's data from various sources
        """
        # First check S3 for existing data
        s3_data = self._get_existing_s3_data(athlete)
        
        if not s3_data:
            # If no data exists, fetch from Garmin and store in S3
            success = self.garmin_collector.collect_and_store_data(str(athlete.user.id))
            if success:
                s3_data = self._get_existing_s3_data(athlete)
        
        if s3_data:
            # Normalize and store in database
            self._normalize_and_store_data(athlete, s3_data)
            
        return self._get_dashboard_data(athlete)

    def _get_existing_s3_data(self, athlete):
        """Fetch existing data from S3"""
        try:
            s3_path = athlete.user.get_biometric_data_path()
            response = self.storage_service.s3_client.get_object(
                Bucket=self.storage_service.bucket_name,
                Key=f"{s3_path}/garmin_data.json"
            )
            return json.loads(response['Body'].read().decode('utf-8'))
        except Exception as e:
            print(f"No existing S3 data found: {e}")
            return None

    def _normalize_and_store_data(self, athlete, data):
        """Normalize Garmin data and store in database"""
        for daily_data in data:
            date = datetime.strptime(daily_data['date'], '%Y-%m-%d').date()
            daily_stats = daily_data['daily_stats']
            
            # Extract relevant metrics from Garmin data
            try:
                sleep_data = daily_stats['sleep']
                hr_data = daily_stats['heart_rate']
                body_comp = daily_stats['body_composition']
                
                # Create or update BiometricData
                biometric_data, created = BiometricData.objects.update_or_create(
                    athlete=athlete,
                    date=date,
                    defaults={
                        'sleep_hours': sleep_data.get('totalSleepTime', 0) / 3600 if sleep_data else None,
                        'resting_heart_rate': hr_data.get('restingHeartRate') if hr_data else None,
                        'weight': body_comp.get('weight') if body_comp else None,
                        'body_fat_percentage': body_comp.get('bodyFat') if body_comp else None,
                        'hrv': hr_data.get('hrvAverage') if hr_data else None,
                    }
                )
            except Exception as e:
                print(f"Error normalizing data for {date}: {e}")
                continue

    def _get_dashboard_data(self, athlete):
        """Fetch formatted data for dashboard display"""
        # Get last 7 days of data
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=7)
        
        biometric_data = BiometricData.objects.filter(
            athlete=athlete,
            date__range=[start_date, end_date]
        ).order_by('date')
        
        return {
            'biometric_data': list(biometric_data.values()),
            'performance_data': []  # Placeholder for future performance data
        } 