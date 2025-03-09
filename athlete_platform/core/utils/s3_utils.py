import boto3
from botocore.exceptions import NoCredentialsError
import json
from django.conf import settings
from typing import Any, List, Optional, Dict
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class S3Utils:
    def __init__(self):
        self.client = self._get_client()
        self.bucket = settings.AWS_STORAGE_BUCKET_NAME

    def _get_client(self):
        """Initialize S3 client with error handling"""
        try:
            return boto3.client('s3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_S3_REGION_NAME
            )
        except Exception as e:
            logger.error(f"Failed to initialize S3 client: {e}")
            return None

    def store_athlete_data(self, athlete_id, data_type, data):
        """Store athlete data in S3"""
        object_name = f'athletes/{athlete_id}/{data_type}.json'
        try:
            self.client.put_object(
                Bucket=self.bucket,
                Key=object_name,
                Body=json.dumps(data),
                ContentType='application/json'
            )
            return True
        except Exception as e:
            print(f'Error storing athlete data: {e}')
            return False

    def get_athlete_data(self, athlete_id, data_type):
        """Retrieve athlete data from S3"""
        object_name = f'athletes/{athlete_id}/{data_type}.json'
        try:
            response = self.client.get_object(
                Bucket=self.bucket,
                Key=object_name
            )
            return json.loads(response['Body'].read().decode('utf-8'))
        except Exception as e:
            print(f'Error retrieving athlete data: {e}')
            return None

    def check_data_freshness(self, base_path: str, date_range: List[datetime.date], required_fields: Optional[List[str]] = None) -> bool:
        """
        Generic data freshness checker for S3
        - Checks if data exists for all dates
        - Optionally validates required fields in the data
        - Handles pagination for large date ranges
        """
        try:
            date_files = set()
            paginator = self.client.get_paginator('list_objects_v2')
            
            for page in paginator.paginate(Bucket=self.bucket, Prefix=base_path):
                if 'Contents' in page:
                    for obj in page['Contents']:
                        date_str = self._extract_date_from_key(obj['Key'])
                        if date_str:
                            date_files.add(date_str)
            
            required_dates = {d.strftime('%Y%m%d') for d in date_range}
            
            # If no field validation needed, just check dates
            if not required_fields:
                return required_dates.issubset(date_files)
            
            # Validate fields in each file
            for date_str in required_dates:
                data = self.get_latest_json_data(base_path, datetime.strptime(date_str, '%Y%m%d').date())
                if not data or not all(field in data for field in required_fields):
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error checking S3 data freshness: {e}")
            return False

    def _extract_date_from_key(self, key: str) -> Optional[str]:
        """Extract date string from S3 key"""
        try:
            # Expected format: path/to/YYYYMMDD_*.json
            filename = key.split('/')[-1]
            if '_' in filename:
                date_str = filename.split('_')[0]
                # Validate it's a proper date string
                datetime.strptime(date_str, '%Y%m%d')
                return date_str
            return None
        except (IndexError, ValueError):
            return None

    def get_latest_json_data(self, base_path: str, date: datetime.date) -> Optional[dict]:
        """Get latest JSON data for a given date"""
        try:
            # logger.info(f"Getting latest JSON data at {base_path}/{date}_raw.json")
            date_prefix = f"{base_path}/{date}_raw.json"
            response = self.client.list_objects_v2(
                Bucket=self.bucket,
                Prefix=date_prefix
            )
            
            if 'Contents' not in response:
                return None
            
            # Get the latest file for this date
            latest = max(response['Contents'], key=lambda x: x['LastModified'])
            logger.info(f"Latest file: {latest['Key']}")
            obj = self.client.get_object(
                Bucket=self.bucket,
                Key=latest['Key']
            )
            
            return json.loads(obj['Body'].read())
            
        except Exception as e:
            logger.error(f"Error getting latest JSON data: {e}")
            return None 
        


    def get_latest_json_data_full_path(self, full_path: str) -> Optional[dict]:
        """Get latest JSON data for a given full path"""
        try:
            logger.info(f"Getting latest JSON data at {full_path} from S3")
            response = self.client.list_objects_v2(
                Bucket=self.bucket,
                Prefix=full_path
            )
            
            if 'Contents' not in response:
                logger.warning(f"No data found in S3 for {full_path}")
                return None
            
            # Get the latest file for this date
            latest = max(response['Contents'], key=lambda x: x['LastModified'])
            logger.info(f"Latest file: {latest['Key']}")
            obj = self.client.get_object(
                Bucket=self.bucket,
                Key=latest['Key']
            )
            
            return json.loads(obj['Body'].read())
            
        except Exception as e:
            # logger.error(f"Error getting latest JSON data: {e}")
            return None 

    def get_paginator(self, operation_name: str) -> Any:
        """Get paginator for S3 operations"""
        return self.client.meta.client.meta.paginator(operation_name)

    def get_object(self, Bucket: str, Key: str) -> Any:
        """Get object from S3"""
        return self.client.get_object(Bucket=Bucket, Key=Key)

    def put_object(self, Bucket: str, Key: str, Body: Any, ContentType: str) -> Any:
        """Put object in S3"""
        return self.client.put_object(Bucket=Bucket, Key=Key, Body=Body, ContentType=ContentType)

    def store_json_data(self, base_path: str, filename: str, data: Any) -> bool:
        """Store JSON data in S3 with proper path handling
        
        Args:
            base_path: Base path in S3 (e.g. 'accounts/123/biometric-data/garmin')
            filename: Name of file (e.g. '20240315_raw.json')
            data: Data to store (will be converted to JSON if not already)
        """
        try:
            # Ensure path is properly formatted
            full_path = f"{base_path.strip('/')}/{filename}"
            
            # Convert data to JSON if it isn't already a string
            if not isinstance(data, str):
                data = json.dumps(data, indent=2)
                
            self.client.put_object(
                Bucket=self.bucket,
                Key=full_path,
                Body=data,
                ContentType='application/json'
            )
            logger.info(f"Successfully stored data at: {full_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error storing JSON data in S3: {e}")
            return False

    def get_all_json_data(self, base_path: str) -> List[Dict]:
        """Get all JSON data for a given base path"""
        try:
            # List all objects in the path
            objects = self.client.list_objects_v2(
                Bucket=self.bucket,
                Prefix=base_path
            )
            
            all_data = []
            for obj in objects.get('Contents', []):
                if obj['Key'].endswith('.json'):
                    response = self.client.get_object(
                        Bucket=self.bucket,
                        Key=obj['Key']
                    )
                    data = json.loads(response['Body'].read().decode('utf-8'))
                    all_data.append(data)
                    
            return sorted(all_data, key=lambda x: x.get('date', ''), reverse=True)
        except Exception as e:
            logger.error(f"Error getting all JSON data: {e}")
            return []



