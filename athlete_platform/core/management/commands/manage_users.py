from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from core.models import Athlete, Team
from core.services.storage_service import UserStorageService
import boto3
from django.conf import settings
import argparse

User = get_user_model()

# Refer to README.md for more information on the commands


class Command(BaseCommand):
    help = 'Manage users, their S3 directories, and related data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear-all',
            action='store_true',
            help='Clear all users from the database and their S3 directories'
        )
        parser.add_argument(
            '--delete-user',
            type=str,
            help='Delete a specific user by email or username'
        )
        parser.add_argument(
            '--create-user',
            type=str,
            help='Create a new user with specified email'
        )
        parser.add_argument(
            '--password',
            type=str,
            help='Password for new user'
        )
        parser.add_argument(
            '--role',
            type=str,
            choices=['ATHLETE', 'COACH', 'ADMIN'],
            help='Role for new user'
        )
        parser.add_argument(
            '--list',
            action='store_true',
            help='List all users'
        )
        parser.add_argument(
            '--verify-s3',
            action='store_true',
            help='Verify S3 directories for all users'
        )
        parser.add_argument(
            '--rebuild-s3',
            action='store_true',
            help='Rebuild S3 directories for all users'
        )

    def _delete_s3_directory(self, user_id):
        """Delete all S3 objects for a user"""
        s3 = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )
        
        # List and delete all objects in user's directory
        paginator = s3.get_paginator('list_objects_v2')
        prefix = f'accounts/{user_id}/'
        
        try:
            for page in paginator.paginate(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Prefix=prefix):
                if 'Contents' in page:
                    objects = [{'Key': obj['Key']} for obj in page['Contents']]
                    s3.delete_objects(
                        Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                        Delete={'Objects': objects}
                    )
            return True
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error deleting S3 directory: {e}'))
            return False

    def handle(self, *args, **options):
        storage_service = UserStorageService()

        # List all users
        if options['list']:
            users = User.objects.all()
            self.stdout.write(self.style.SUCCESS('Current users:'))
            for user in users:
                self.stdout.write(f'- {user.email} (ID: {user.id}, Role: {user.role})')
            return

        # Clear all users
        if options['clear-all']:
            confirm = input('Are you sure you want to delete ALL users? This cannot be undone. (yes/no): ')
            if confirm.lower() != 'yes':
                self.stdout.write(self.style.WARNING('Operation cancelled.'))
                return
            
            users = User.objects.all()
            for user in users:
                self._delete_s3_directory(user.id)
            
            User.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('All users have been deleted'))
            return

        # Delete specific user
        if options['delete-user']:
            identifier = options['delete_user']
            try:
                user = User.objects.get(email=identifier)
            except User.DoesNotExist:
                try:
                    user = User.objects.get(username=identifier)
                except User.DoesNotExist:
                    raise CommandError(f'User with email/username {identifier} does not exist')

            self._delete_s3_directory(user.id)
            user.delete()
            self.stdout.write(self.style.SUCCESS(f'Successfully deleted user: {identifier}'))
            return

        # Create new user
        if options['create_user']:
            if not options['password']:
                raise CommandError('--password is required when creating a user')
            
            email = options['create_user']
            password = options['password']
            role = options['role'] or 'ATHLETE'
            
            if User.objects.filter(email=email).exists():
                raise CommandError(f'User with email {email} already exists')
            
            user = User.objects.create_user(
                username=email.split('@')[0],
                email=email,
                password=password,
                role=role
            )
            
            # Create S3 directories
            storage_service.create_user_directory_structure(user)
            
            self.stdout.write(self.style.SUCCESS(f'Successfully created user: {email}'))
            return

        # Verify S3 directories
        if options['verify_s3']:
            users = User.objects.all()
            for user in users:
                s3 = boto3.client('s3')
                base_path = user.get_s3_base_path()
                try:
                    response = s3.list_objects_v2(
                        Bucket=settings.AWS_STORAGE_BUCKET_NAME,
                        Prefix=base_path
                    )
                    if 'Contents' in response:
                        self.stdout.write(self.style.SUCCESS(f'S3 directories exist for user: {user.email}'))
                    else:
                        self.stdout.write(self.style.WARNING(f'Missing S3 directories for user: {user.email}'))
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f'Error checking S3 for user {user.email}: {e}'))
            return

        # Rebuild S3 directories
        if options['rebuild_s3']:
            users = User.objects.all()
            for user in users:
                self._delete_s3_directory(user.id)
                storage_service.create_user_directory_structure(user)
                self.stdout.write(self.style.SUCCESS(f'Rebuilt S3 directories for user: {user.email}'))
            return

        # If no arguments provided, show help
        self.print_help('manage.py', 'manage_users') 