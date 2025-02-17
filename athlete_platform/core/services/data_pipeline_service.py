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
# from core.utils.cache_utils import resource_lock
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