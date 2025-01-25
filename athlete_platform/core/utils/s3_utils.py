import boto3
from botocore.exceptions import NoCredentialsError
import json
from django.conf import settings

class S3Utils:
    def __init__(self):
        self.bucket_name = settings.AWS_STORAGE_BUCKET_NAME
        self.session = boto3.Session(
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )
        self.s3_client = self.session.client('s3')

    def store_athlete_data(self, athlete_id, data_type, data):
        """Store athlete data in S3"""
        object_name = f'athletes/{athlete_id}/{data_type}.json'
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
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
            response = self.s3_client.get_object(
                Bucket=self.bucket_name,
                Key=object_name
            )
            return json.loads(response['Body'].read().decode('utf-8'))
        except Exception as e:
            print(f'Error retrieving athlete data: {e}')
            return None 