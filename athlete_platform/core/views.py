from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, logout
from django.contrib import messages
from .forms import CustomUserCreationForm
from .utils.s3_utils import S3Utils
from .models import Athlete, CoreBiometricData, create_biometric_data, get_athlete_biometrics
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
from .services.data_sync_service import DataSyncService
from .services.data_pipeline_service import DataPipelineService
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from rest_framework.response import Response
from datetime import timedelta
from django.contrib.auth import login as auth_login
from django.contrib.auth.signals import user_logged_in
from django.dispatch import receiver
import warnings  # Python's built-in warnings module
from django.conf import settings

# Set up logging
logger = logging.getLogger(__name__)

# Define threshold constant - could also be moved to settings.py
MINIMUM_RECORDS_THRESHOLD = 4

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
        sync_service = DataSyncService()
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
                
                # Update CoreBiometricData
                create_biometric_data(athlete, datetime.strptime(latest_data['date'], '%Y-%m-%d').date(), latest_data)
                # CoreBiometricData.objects.create(
                #     athlete=athlete,
                #     date=datetime.strptime(latest_data['date'], '%Y-%m-%d').date(),
                #     resting_heart_rate=latest_data['daily_stats']['heart_rate'].get('restingHeartRate'),
                #     # Add other relevant fields
                # )
            
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
        biometric_data = create_biometric_data(athlete, timezone.now().date(), {})
        # biometric_data = CoreBiometricData.objects.create(
        #     athlete=athlete,
        #     date=timezone.now().date()
        # )
        
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
        # latest_data = CoreBiometricData.objects.filter(athlete=athlete).order_by('-date').first()

        # Fetch the latest biometric data from CoreBiometricData
        latest_data = get_athlete_biometrics(athlete, timezone.now().date())
        
        if latest_data:
            logger.info(f"Found latest biometric data for athlete: {athlete.id}, under path accounts/{athlete.user.id}/biometric-data/garmin")
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

@receiver(user_logged_in)
def sync_on_login(sender, user, request, **kwargs):
    """Trigger sync when user logs in"""
    try:
        if hasattr(user, 'athlete'):
            sync_service = DataSyncService(user.athlete)
            sync_service.sync_data()
    except Exception as e:
        logger.error(f"Error syncing data on login: {e}")

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sync_biometric_data(request):
    """Sync biometric data endpoint"""
    try:
        if not hasattr(request.user, 'athlete'):
            return Response({
                'success': False,
                'message': 'No athlete profile found for user'
            }, status=400)

        athlete = request.user.athlete
        sync_service = DataSyncService(athlete)
        success = sync_service.sync_data()
        
        return Response({
            'success': success,
            'message': 'Sync completed successfully' if success else 'Sync failed'
        })
    except Exception as e:
        logger.error(f"Error in sync_biometric_data: {str(e)}")
        return Response({
            'success': False,
            'message': str(e)
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_biometric_data(request):
    try:
        athlete = request.user.athlete
        logger.info(f"Data requested for user: {request.user.id}")
        
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=7)
        
        data = CoreBiometricData.objects.filter(
            athlete=athlete,
            date__range=[start_date, end_date]
        ).order_by('date')
        
        if not data.exists():
            logger.warning("No data found")
            total_records = CoreBiometricData.objects.filter(
                athlete=athlete,
                date__range=[start_date, end_date]
            ).count()
            
            if total_records < MINIMUM_RECORDS_THRESHOLD:
                logger.info(f"Found only {total_records} records, below threshold of {MINIMUM_RECORDS_THRESHOLD}. Triggering API sync.")
                pipeline_service = DataPipelineService(athlete)
                pipeline_service.update_athlete_data()
                
                data = CoreBiometricData.objects.filter(
                    athlete=athlete,
                    date__range=[start_date, end_date]
                ).order_by('date')
            
            if not data.exists():
                return Response([])
            
        logger.info(f"Found {data.count()} records for date range {start_date} to {end_date}")
        
        return Response([{
            'date': item.date,
            # Sleep metrics
            'sleep_time_seconds': item.sleep_time_seconds,
            'deep_sleep_seconds': item.deep_sleep_seconds,
            'light_sleep_seconds': item.light_sleep_seconds,
            'rem_sleep_seconds': item.rem_sleep_seconds,
            'awake_sleep': item.awake_sleep,
            'average_respiration': item.average_respiration,
            'lowest_respiration': item.lowest_respiration,
            'highest_respiration': item.highest_respiration,
            'sleep_heart_rate': item.sleep_heart_rate,
            'sleep_stress': item.sleep_stress,
            'sleep_body_battery': item.sleep_body_battery,
            'body_battery_change': item.body_battery_change,
            'sleep_resting_heart_rate': item.sleep_resting_heart_rate,
            
            # Heart rate metrics
            'resting_heart_rate': item.resting_heart_rate,
            'max_heart_rate': item.max_heart_rate,
            'min_heart_rate': item.min_heart_rate,
            'last_seven_days_avg_resting_heart_rate': item.last_seven_days_avg_resting_heart_rate,
            'heart_rate_values': item.heart_rate_values,
            
            # Activity metrics
            'total_calories': item.total_calories,
            'active_calories': item.active_calories,
            'bmr_calories': item.bmr_calories,
            'net_calorie_goal': item.net_calorie_goal,
            'total_steps': item.total_steps,
            'total_distance_meters': item.total_distance_meters,
            'daily_step_goal': item.daily_step_goal,
            'highly_active_seconds': item.highly_active_seconds,
            'sedentary_seconds': item.sedentary_seconds,
            
            # Stress metrics
            'average_stress_level': item.average_stress_level,
            'max_stress_level': item.max_stress_level,
            'stress_duration': item.stress_duration,
            'rest_stress_duration': item.rest_stress_duration,
            'activity_stress_duration': item.activity_stress_duration,
            'low_stress_percentage': item.low_stress_percentage,
            'medium_stress_percentage': item.medium_stress_percentage,
            'high_stress_percentage': item.high_stress_percentage,
        } for item in data])
        
    except Exception as e:
        logger.error(f"Error in get_biometric_data: {e}", exc_info=True)
        return Response({'error': str(e)}, status=500)

def get_current_user(request):
    if request.user.is_authenticated:
        return JsonResponse({'username': request.user.username})
    return JsonResponse({'username': 'AnonymousUser'}, status=401)

