from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, logout
from django.contrib import messages
from .forms import CustomUserCreationForm
from .utils.s3_utils import S3Utils
from .models import Athlete, BiometricData
from django.http import JsonResponse
from .utils.garmin_utils import GarminDataCollector
from django.views.decorators.http import require_POST, require_http_methods
from datetime import datetime
from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate
from django.utils import timezone
import logging
import boto3
from botocore.exceptions import ClientError
import json
from .services.athlete_service import AthleteDataSyncService
from .services.data_pipeline_service import DataPipelineService
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.views.decorators.csrf import ensure_csrf_cookie

# Set up logging
logger = logging.getLogger(__name__)

# Create your views here.

@login_required
def home(request):
    return render(request, 'core/home.html')

def register(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            # Authenticate the user first
            authenticated_user = authenticate(
                username=form.cleaned_data['username'],
                password=form.cleaned_data['password1']
            )
            if authenticated_user is not None:
                login(request, authenticated_user)
                messages.success(request, 'Registration successful!')
                return redirect('dashboard')
    else:
        form = CustomUserCreationForm()
    return render(request, 'registration/register.html', {'form': form})

@login_required
def dashboard_view(request):
    try:
        athlete = request.user.athlete
        
        # Initialize the sync service and get dashboard data
        sync_service = AthleteDataSyncService()
        dashboard_data = sync_service.sync_athlete_data(athlete)
        
        return render(request, 'core/dashboard.html', {
            'biometric_data': dashboard_data['biometric_data'],
            'performance_data': dashboard_data['performance_data']
        })
    except AttributeError:
        # Handle case where user doesn't have an associated athlete
        return render(request, 'core/error.html', {
            'error_message': 'No athlete profile found for this user.'
        })

def get_s3_data(athlete):
    """Retrieve athlete data from S3"""
    try:
        s3 = boto3.client('s3')
        response = s3.get_object(
            Bucket='your-bucket-name',
            Key=f'athletes/{athlete.id}/data.json'
        )
        return json.loads(response['Body'].read().decode('utf-8'))
    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchKey':
            # Initialize empty data structure if no data exists
            default_data = {
                'athlete_id': athlete.id,
                'created_at': timezone.now().isoformat(),
                'biometric_history': []
            }
            # Store the initial data
            s3.put_object(
                Bucket='your-bucket-name',
                Key=f'athletes/{athlete.id}/data.json',
                Body=json.dumps(default_data)
            )
            return default_data
        raise

@login_required
def logout_view(request):
    logout(request)
    messages.success(request, 'You have been successfully logged out.')
    return redirect('login')

@require_POST
@login_required
def update_athlete_data(request):
    """Update athlete data from Garmin"""
    try:
        if request.user.role == 'ATHLETE':
            athlete = Athlete.objects.get(user=request.user)
        else:
            athlete_id = request.POST.get('athlete_id')
            athlete = Athlete.objects.get(id=athlete_id)
            
            # Check if coach has permission to update this athlete's data
            if athlete.team.coach != request.user:
                return JsonResponse({'success': False, 'error': 'Permission denied'})
        
        # Collect and store data
        collector = GarminDataCollector()
        success = collector.collect_and_store_data(athlete.id)
        
        if success:
            # Update athlete's basic stats in database
            s3_utils = S3Utils()
            raw_data = s3_utils.get_athlete_data(athlete.id, 'garmin_data')
            if raw_data and len(raw_data) > 0:
                latest_data = raw_data[0]  # Most recent data
                
                # Update BiometricData
                BiometricData.objects.create(
                    athlete=athlete,
                    date=datetime.strptime(latest_data['date'], '%Y-%m-%d').date(),
                    resting_heart_rate=latest_data['daily_stats']['heart_rate'].get('restingHeartRate'),
                    # Add other relevant fields
                )
            
            return JsonResponse({'success': True})
        else:
            return JsonResponse({'success': False, 'error': 'Failed to collect data'})
            
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@login_required
def update_data(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    
    try:
        athlete = Athlete.objects.get(user=request.user)
        
        # Create new biometric data with defaults
        biometric_data = BiometricData.objects.create(
            athlete=athlete,
            date=timezone.now().date()
        )
        
        # Update S3 with new data
        try:
            historical_data = get_s3_data(athlete)
            historical_data['biometric_history'].append({
                'date': biometric_data.date.isoformat(),
                'weight': float(biometric_data.weight),
                'height': float(biometric_data.height),
                'resting_heart_rate': biometric_data.resting_heart_rate,
                'created_at': biometric_data.created_at.isoformat()
            })
            
            s3 = boto3.client('s3')
            s3.put_object(
                Bucket='your-bucket-name',
                Key=f'athletes/{athlete.id}/data.json',
                Body=json.dumps(historical_data)
            )
            
            return JsonResponse({'success': True})
            
        except Exception as e:
            logger.error(f"S3 update error for athlete {athlete.id}: {str(e)}")
            return JsonResponse({
                'error': 'Error updating historical data',
                'details': str(e)
            }, status=500)
            
    except Athlete.DoesNotExist:
        logger.error(f"Update attempted for non-existent athlete: user {request.user.id}")
        return JsonResponse({
            'error': 'Athlete profile not found',
            'details': 'Please contact support'
        }, status=404)
    except Exception as e:
        logger.error(f"Update error for user {request.user.id}: {str(e)}")
        return JsonResponse({
            'error': 'An unexpected error occurred',
            'details': str(e)
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_data(request):
    logger.info(f"Dashboard data requested for user: {request.user.id}")
    try:
        athlete = request.user.athlete
        logger.info(f"Found athlete profile for user: {request.user.id}")
        
        # Fetch the latest biometric data
        latest_data = BiometricData.objects.filter(athlete=athlete).order_by('-date').first()
        
        if latest_data:
            logger.info(f"Found latest biometric data for athlete: {athlete.id}")
            data = {
                'heart_rate': {
                    'latest': latest_data.resting_heart_rate,
                    'average': latest_data.hrv,
                },
                'sleep': {
                    'duration': float(latest_data.sleep_hours),
                    'quality': 'Good' if latest_data.sleep_hours >= 7 else 'Poor',
                },
                'activity': {
                    'steps': 0,
                    'distance': 0,
                }
            }
        else:
            logger.warning(f"No biometric data found for athlete: {athlete.id}")
            data = {
                'heart_rate': {'latest': None, 'average': None},
                'sleep': {'duration': None, 'quality': None},
                'activity': {'steps': None, 'distance': None}
            }
            
        return JsonResponse({'success': True, 'data': data})
    except Exception as e:
        logger.error(f"Error fetching dashboard data: {str(e)}", exc_info=True)
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@ensure_csrf_cookie
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_garmin_data(request):
    logger.info(f"Garmin data update requested for user: {request.user.id}")
    try:
        athlete = request.user.athlete
        logger.info(f"Found athlete profile, initiating data pipeline for athlete: {athlete.id}")
        
        pipeline_service = DataPipelineService(athlete)
        success, message = pipeline_service.update_athlete_data()
        
        if success:
            logger.info(f"Successfully updated Garmin data for athlete: {athlete.id}")
        else:
            logger.error(f"Failed to update Garmin data for athlete: {athlete.id}. Message: {message}")
        
        return JsonResponse({
            'success': success,
            'message': message
        })
    except Exception as e:
        logger.error(f"Error updating Garmin data: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)
