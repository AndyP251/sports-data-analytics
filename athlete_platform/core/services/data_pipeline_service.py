from ..utils.garmin_utils import GarminDataCollector
from ..utils.whoop_utils import WhoopClient
from ..models import CoreBiometricData, create_biometric_data, get_athlete_biometrics
from datetime import datetime, timedelta
from django.utils import timezone
import logging
import boto3
from django.conf import settings
import json
from ..utils.s3_utils import S3Utils
from .data_transformers.garmin_transformer import GarminTransformer
from .data_transformers.whoop_transformer import WhoopTransformer
from .data_collectors.garmin_collector import GarminCollector
from .data_collectors.whoop_collector import WhoopCollector
from .data_processors.garmin_processor import GarminProcessor
from .data_processors.whoop_processor import WhoopProcessor
from .data_formats.biometric_format import StandardizedBiometricData
from core.utils.cache_utils import resource_lock
from typing import List, Dict, Any, Optional


logger = logging.getLogger(__name__)

class DataPipelineService:
    """
    Handles ETL pipeline for processing and storing biometric data.
    Called by DataSyncService when new data needs to be processed.
    """
    
    SOURCE_CONFIGS = {
        'garmin': {
            'collector': GarminCollector,
            'processor': GarminProcessor,
            'transformer': GarminTransformer
        },
        'whoop': {
            'collector': WhoopCollector,
            'processor': WhoopProcessor,
            'transformer': WhoopTransformer
        }
    }
    def __init__(self, athlete):
        self.athlete = athlete
        self.s3_client = boto3.client('s3')
        self.bucket_name = settings.AWS_STORAGE_BUCKET_NAME
        self.s3_utils = S3Utils()
        self.transformers = {
            'garmin': GarminTransformer(),
            'whoop': WhoopTransformer()
        }
        self.collectors = {
            'garmin': GarminCollector(athlete),
            'whoop': WhoopCollector(athlete)
        }

    def upload_to_s3(self, data, date):
        """Upload data to S3 bucket with date-specific filename"""
        try:
            timestamp = datetime.now().strftime('%H%M%S')
            file_name = f"{date.strftime('%Y%m%d')}_{timestamp}.json"
            file_path = f"accounts/{str(self.athlete.user.id)}/biometric-data/garmin/{file_name}"
            
            # Ensure data is properly serialized as JSON
            if not isinstance(data, str):
                data = json.dumps(data, indent=2)
                
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=file_path,
                Body=data,
                ContentType='application/json'
            )
            logger.info(f"Successfully uploaded {file_path} to S3")
            return True
        except Exception as e:
            logger.error(f"Failed to upload to S3: {str(e)}")
            return False

    def get_latest_s3_data(self):
        """Get all data from S3 for the past week"""
        try:
            prefix = f"accounts/{str(self.athlete.user.id)}/biometric-data/garmin/"
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=7)
            
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=prefix
            )
            
            if 'Contents' not in response:
                logger.info("No S3 data found, will fetch from API")
                return None
                
            all_data = []
            found_dates = set()  # Track which dates we've found
            
            # First, get all available files from S3
            for obj in response['Contents']:
                try:
                    filename = obj['Key'].split('/')[-1]
                    if not filename[0].isdigit():
                        continue
                        
                    file_date = datetime.strptime(filename.split('_')[0], '%Y%m%d').date()
                    if start_date <= file_date <= end_date:
                        file_response = self.s3_client.get_object(
                            Bucket=self.bucket_name,
                            Key=obj['Key']
                        )
                        file_data = json.loads(file_response['Body'].read().decode('utf-8'))
                        logger.info(f"Retrieved data from S3 for date: {file_date}")
                        
                        if isinstance(file_data, list):
                            for item in file_data:
                                if isinstance(item, dict):
                                    item_date = datetime.strptime(item.get('date', ''), '%Y-%m-%d').date()
                                    if item_date not in found_dates:
                                        all_data.append(item)
                                        found_dates.add(item_date)
                        elif isinstance(file_data, dict):
                            data_date = datetime.strptime(file_data.get('date', ''), '%Y-%m-%d').date()
                            if data_date not in found_dates:
                                all_data.append(file_data)
                                found_dates.add(data_date)
                            
                except (ValueError, IndexError) as e:
                    logger.warning(f"Skipping malformed filename: {obj['Key']}: {e}")
                    continue
                except Exception as e:
                    logger.error(f"Error processing S3 file {obj['Key']}: {e}")
                    continue
            
            # Check if we have all the dates we need
            needed_dates = set(start_date + timedelta(days=x) for x in range((end_date - start_date).days + 1))
            missing_dates = needed_dates - found_dates
            
            if missing_dates:
                logger.info(f"Missing data for dates: {missing_dates}. Will fetch from API.")
                return None
            
            logger.info(f"Retrieved {len(all_data)} complete records from S3")
            return all_data
        except Exception as e:
            logger.error(f"Error getting S3 data: {e}")
            return None

    def fetch_and_store_new_data(self):
        """Fetch new data from Garmin API and store in S3"""
        try:
            garmin_collector = GarminDataCollector()
            raw_data = garmin_collector.collect_data()
            
            if not raw_data:
                logger.error("No data received from Garmin API")
                return None

            logger.debug(f"Raw data type: {type(raw_data)}")
            logger.debug(f"Raw data first item type: {type(raw_data[0]) if raw_data else 'None'}")

            # Store each day's data separately in S3
            for daily_data in raw_data:
                date = datetime.strptime(daily_data['date'], '%Y-%m-%d').date()
                if not self.upload_to_s3(daily_data, date):
                    logger.error(f"Failed to upload data for {date} to S3")
            
            return raw_data
        except Exception as e:
            logger.error(f"Error fetching new data: {e}")
            return None

    def process_and_store_garmin_data(self, data):
        """Process and store Garmin data"""
        try:
            if not data:
                logger.error("No data to process")
                return False
            
            success = False
            
            # Handle both list and dict data structures
            if isinstance(data, list):
                data_items = data
            elif isinstance(data, dict):
                data_items = data.items()
            else:
                logger.error(f"Unexpected data type: {type(data)}")
                return False
            
            for daily_data in data_items:
                try:
                    # Handle both data structures
                    if isinstance(daily_data, tuple):  # If data is dict.items()
                        date_str, daily_data = daily_data
                    else:  # If data is list
                        date_str = daily_data.get('date')
                        if not date_str:
                            logger.error("No date found in daily data")
                            continue
                    
                    date = datetime.strptime(date_str, '%Y-%m-%d').date()
                    logger.debug(f"Processing data for date: {date}")
                    
                    # Extract sleep data
                    sleep_data = daily_data.get('sleep', {}).get('dailySleepDTO', {})
                    
                    # Extract stress data
                    stress_data = daily_data.get('stressDetails', {})
                    
                    # Extract body composition data
                    body_comp = daily_data.get('bodyComps', {})
                    
                    # Process sleep metrics - convert to hours for the old fields
                    sleep_seconds = sleep_data.get('sleepTimeSeconds', 0)
                    deep_sleep_seconds = sleep_data.get('deepSleepSeconds', 0)
                    light_sleep_seconds = sleep_data.get('lightSleepSeconds', 0)
                    rem_sleep_seconds = sleep_data.get('remSleepSeconds', 0)
                    awake_seconds = sleep_data.get('awakeSleepSeconds', 0)
                    
                    processed_data = {
                        # Map to actual CoreBiometricData model fields
                        'date': date,
                        'athlete': self.athlete,
                        
                        # Sleep metrics (all in seconds)
                        'sleep_duration': sleep_seconds,
                        'deep_sleep_duration': deep_sleep_seconds,
                        'light_sleep_duration': light_sleep_seconds,
                        'rem_sleep_duration': rem_sleep_seconds,
                        'awake_duration': awake_seconds,
                        
                        # Body metrics
                        'weight_kg': body_comp.get('weight', 0),
                        'body_fat': body_comp.get('bodyFat', 0),
                        'body_mass_index': body_comp.get('bmi', 0),
                        
                        # Other metrics
                        'stress_score': stress_data.get('stressLevel', 0),
                        'respiration_rate': sleep_data.get('averageRespirationValue', 0),
                        
                        # Source tracking
                        'source': 'garmin',
                        'last_updated': timezone.now()
                    }
                    
                    # Check for existing data
                    existing_data = CoreBiometricData.objects.filter(
                        athlete=self.athlete,
                        date=date
                    ).first()
                    
                    if existing_data:
                        logger.info(f"Updating existing data for {date}")
                        for key, value in processed_data.items():
                            if hasattr(existing_data, key) and value:  # Only update if field exists and value is not 0/None
                                setattr(existing_data, key, value)
                        existing_data.save()
                    else:
                        logger.info(f"Creating new data for {date}")
                        create_biometric_data(self.athlete, date, processed_data)
                    
                    success = True
                    logger.info(f"Successfully processed data for {date}")
                    
                except Exception as e:
                    logger.error(f"Error processing daily data: {str(e)}")
                    logger.error(f"Date: {date_str if 'date_str' in locals() else 'unknown'}")
                    continue
            
            return success
            
        except Exception as e:
            logger.error(f"Error processing Garmin data: {str(e)}")
            return False

    def update_athlete_data(self):
        """Main method to update athlete data"""
        try:
            # First try to get data from S3
            data = self.get_latest_s3_data()
            
            # If no S3 data, fetch from API
            if not data:
                data = self.fetch_and_store_new_data()
                
            if data:
                return self.process_and_store_garmin_data(data)
            
            return False
        except Exception as e:
            logger.error(f"Error updating athlete data: {e}")
            return False

    @resource_lock('data_pipeline')
    def sync_athlete_data(self) -> bool:
        """Main method to sync athlete data from all sources"""
        try:
            success = True
            for source, collector in self.collectors.items():
                if not collector.authenticate():
                    logger.error(f"Failed to authenticate with {source}")
                    success = False
                    continue
                    
                raw_data = collector.collect_data()
                if raw_data:
                    transformer = self.transformers[source]
                    standardized_data = transformer.transform_to_standard_format(raw_data)
                    self._store_data(standardized_data)
                else:
                    success = False
                    
            return success
            
        except Exception as e:
            logger.error(f"Error in data pipeline: {e}")
            return False

    def _store_data(self, data: StandardizedBiometricData) -> bool:
        """Store standardized data in both S3 and database"""
        try:
            # Store in S3
            success_s3 = self.s3_utils.store_json_data(
                f"accounts/{self.athlete.user.id}/biometric-data/{data['source']}",
                f"{data['date']}_{datetime.now().strftime('%H%M%S')}.json",
                data
            )
            
            # Store in database
            success_db = bool(create_biometric_data(self.athlete, data['date'], data))
            
            return success_s3 and success_db
            
        except Exception as e:
            logger.error(f"Error storing data from 335 pipeline: {e}")
            return False

    def collect_data(self, source: str, date_range: List[datetime.date]) -> Optional[List[Dict[str, Any]]]:
        """Centralized data collection method"""
        try:
            collector = self.collectors.get(source)
            if not collector:
                logger.error(f"No collector found for source: {source}")
                return None
            
            raw_data = collector.collect_data(date_range)
            if raw_data:
                # Store raw data in S3 immediately
                for item in raw_data:
                    self.s3_utils.store_json_data(
                        f"accounts/{self.athlete.user.id}/biometric-data/{source}",
                        f"{item['date']}_raw.json",
                        item
                    )
            return raw_data
        
        except Exception as e:
            logger.error(f"Error collecting data for {source}: {e}")
            return None 