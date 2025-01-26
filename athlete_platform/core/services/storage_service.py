import json
from datetime import datetime
import boto3
from django.conf import settings
from botocore.exceptions import ClientError

class UserStorageService:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )
        self.bucket_name = settings.AWS_STORAGE_BUCKET_NAME

    def create_user_directory_structure(self, user):
        """Creates the initial directory structure for a new user."""
        user_base_path = f'accounts/{str(user.id)}'
        directories = [
            f'{user_base_path}/biometric-data/',
            f'{user_base_path}/metadata/',
            f'{user_base_path}/performance-data/'
        ]
        
        try:
            # Create directories (S3 doesn't actually need this, but good for organization)
            for directory in directories:
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=directory
                )
            
            # Create and upload initial metadata file
            self._create_initial_metadata(user, f'{user_base_path}/metadata/user_info.json')
            return True
        except ClientError as e:
            print(f"Error creating user directory structure: {e}")
            return False

    def _create_initial_metadata(self, user, metadata_path):
        """Creates and uploads the initial metadata JSON file for the user."""
        metadata = {
            'user_id': str(user.id),
            'username': user.username,
            'email': user.email,
            'date_joined': user.date_joined.isoformat(),
            'last_login': user.last_login.isoformat() if user.last_login else None,
            'is_active': user.is_active,
            'profile_created_at': datetime.utcnow().isoformat(),
            # Add any additional user fields you want to track
        }
        
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=metadata_path,
                Body=json.dumps(metadata, indent=2),
                ContentType='application/json'
            )
        except ClientError as e:
            print(f"Error creating metadata file: {e}")
            raise