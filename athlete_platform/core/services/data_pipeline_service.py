from ..utils.garmin_utils import GarminDataCollector
from ..models import BiometricData
from datetime import datetime
from django.utils import timezone

class DataPipelineService:
    def __init__(self, athlete):
        self.athlete = athlete
        self.garmin_collector = GarminDataCollector()

    def update_athlete_data(self):
        """
        Pipeline to collect Garmin data, store in S3, and update database
        Returns: (success: bool, message: str)
        """
        try:
            # Step 1: Collect and store Garmin data in S3
            success = self.garmin_collector.collect_and_store_data(str(self.athlete.user.id))
            if not success:
                return False, "Failed to collect Garmin data"

            # Step 2: Get the latest data from S3
            s3_utils = self.garmin_collector.s3_utils
            raw_data = s3_utils.get_athlete_data(self.athlete.user.id, 'garmin_data')
            
            if not raw_data or len(raw_data) == 0:
                return False, "No data available in S3"

            # Step 3: Process the latest data entry
            latest_data = raw_data[0]  # Most recent data
            
            # Step 4: Create or update BiometricData
            biometric_data = BiometricData.objects.create(
                athlete=self.athlete,
                date=datetime.strptime(latest_data['date'], '%Y-%m-%d').date(),
                resting_heart_rate=latest_data['daily_stats']['heart_rate'].get('restingHeartRate'),
                sleep_hours=latest_data['daily_stats']['sleep'].get('duration', 0) / 3600,  # Convert seconds to hours
                # Add other fields as needed
            )

            return True, "Data successfully updated"

        except Exception as e:
            return False, str(e) 