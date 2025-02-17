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
# from .services.data_pipeline_service import DataPipelineService
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
from asgiref.sync import sync_to_async
from functools import wraps

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
        
        # Use DataPipelineService instead of DataSyncService
        # pipeline_service = DataPipelineService(athlete)
        # pipeline_service.sync_athlete_data()
        
        # Get latest data from database
        latest_data = get_athlete_biometrics(athlete, timezone.now().date())
        
        return render(request, 'core/dashboard.html', {
            'biometric_data': latest_data,
            'athlete': athlete
        })
    except Exception as e:
        logger.error(f"Dashboard error: {e}")
        return render(request, 'core/error.html')


@login_required
def logout_view(request):
    logout(request)
    messages.success(request, 'You have been successfully logged out.')
    return redirect('login')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_data(request):
    logger.info(f"Dashboard data requested for user: {request.user.id}")
    try:
        athlete = request.user.athlete
        logger.info(f"Found athlete profile for user: {request.user.id}")
        
        # Get last 7 days of data
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=7)
        
        biometric_data = CoreBiometricData.objects.filter(
            athlete=athlete,
            date__range=[start_date, end_date]
        ).order_by('date').values()
        
        if biometric_data:
            logger.info(f"Found biometric data for athlete: {athlete.id}")
            return JsonResponse({
                'success': True,
                'data': list(biometric_data)  # Send all raw data to frontend
            })
        else:
            logger.warning(f"No biometric data found for athlete: {athlete.id}")
            return JsonResponse({
                'success': True,
                'data': []
            })
            
    except Exception as e:
        logger.error(f"Error fetching dashboard data: {str(e)}", exc_info=True)
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@receiver(user_logged_in)
def sync_on_login(sender, user, request, **kwargs):
    """Trigger sync when user logs in"""
    try:
        if hasattr(user, 'athlete'):
            sync_service = DataSyncService(user.athlete)
            sync_service.sync_data()
    except Exception as e:
        logger.error(f"Error syncing data on login: {e}")

@require_http_methods(["POST"])
@login_required
async def sync_biometric_data(request):
    """API endpoint for syncing biometric data"""

    # Accessing a DB model (Athlete) is a blocking call
    from asgiref.sync import sync_to_async

    try:
        # Wrap model calls
        athlete = await sync_to_async(Athlete.objects.get)(user=request.user)

        sync_service = await sync_to_async(DataSyncService)(athlete)

        data = await sync_to_async(sync_service.sync_data)()

        return JsonResponse({'success': True, 'data': data or []})

    except Exception as e:
        logger.error(f"Error in sync_biometric_data: {e}", exc_info=True)
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

def async_safe(f):
    @wraps(f)
    def wrapper(request, *args, **kwargs):
        if request.META.get('HTTP_ACCEPT') == 'text/event-stream':
            # Handle streaming response
            return sync_to_async(f)(request, *args, **kwargs)
        return f(request, *args, **kwargs)
    return wrapper

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@async_safe
def get_biometric_data(request):
    try:
        athlete = request.user.athlete
        sync_service = DataSyncService(athlete)
        data = sync_service.get_biometric_data()
        
        return Response(data)
    except Exception as e:
        logger.error(f"Error in get_biometric_data: {e}", exc_info=True)
        return Response({'error': str(e)}, status=500)

def get_current_user(request):
    if request.user.is_authenticated:
        return JsonResponse({'username': request.user.username})
    return JsonResponse({'username': 'AnonymousUser'}, status=401)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def activate_source(request):
    logger.info(f"Source activation requested for user: {request.user.id}")
    try:
        athlete = request.user.athlete
        source = request.data.get('source')
        profile_type = request.data.get('profile_type', 'default')
        
        if source == 'garmin':
            from django.conf import settings
            if profile_type not in settings.GARMIN_PROFILES:
                return JsonResponse({
                    'success': False,
                    'message': 'Invalid profile type'
                }, status=400)
                
            from .models import GarminCredentials
            credentials, created = GarminCredentials.objects.get_or_create(
                athlete=athlete,
                profile_type=profile_type,
                defaults={
                    'access_token': 'mock_token',
                    'refresh_token': 'mock_refresh',
                    'expires_at': timezone.now() + timedelta(days=365)
                }
            )
        elif source == 'whoop':
            # TEMPORARY: Skip authentication and just create mock credentials
            from .models import WhoopCredentials
            WhoopCredentials.objects.get_or_create(
                athlete=athlete,
                defaults={
                    'access_token': 'mock_token',  # No need for real tokens now
                    'refresh_token': 'mock_refresh',
                    'expires_at': timezone.now() + timedelta(days=365)  # Longer expiry since we're not refreshing
                }
            )
        else:
            return JsonResponse({
                'success': False,
                'message': 'Unsupported source'
            }, status=400)
            
        # TODO: Add proper OAuth flow here later
        sync_service = DataSyncService(athlete)
        success = sync_service.sync_specific_sources([source])
        
        if success:
            return JsonResponse({
                'success': True,
                'message': f'{source.title()} source activated successfully'
            })
        else:
            return JsonResponse({
                'success': False,
                'message': f'Failed to sync {source} data'
            }, status=500)
            
    except Exception as e:
        logger.error(f"Error activating source: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reset_data_processing(request):
    """Reset any stuck data processing locks"""
    try:
        sync_service = DataSyncService(request.user.athlete)
        
        # Clear locks for all processors
        for processor in sync_service.processors:
            processor.clear_processing_lock()
            
        return Response({
            'status': 'success',
            'message': 'Processing locks cleared successfully'
        })
        
    except Exception as e:
        logger.error(f"Error resetting processing locks: {e}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_garmin_profiles(request):
    from django.conf import settings
    
    # Return success field to match API convention
    return JsonResponse({
        'success': True,
        'profiles': [
            {
                'id': profile_id,
                'name': profile['name'],
                'source': 'garmin'
            }
            for profile_id, profile in settings.GARMIN_PROFILES.items()
        ]
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_raw_biometric_data(request):
    """Get raw biometric data from S3"""
    try:
        athlete = request.user.athlete
        s3_utils = S3Utils()
        
        # Get all data from S3 for this athlete
        base_path = f'accounts/{request.user.id}/biometric-data/garmin'
        raw_data = s3_utils.get_all_json_data(base_path)
        
        return JsonResponse({
            'success': True,
            'data': raw_data
        })
    except Exception as e:
        logger.error(f"Error fetching raw biometric data: {e}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def active_sources(request):
    try:
        athlete = request.user.athlete
        active_sources = []
        
        # Check Garmin credentials
        if hasattr(athlete, 'garmin_credentials'):
            active_sources.append('garmin')
            
        # Check Whoop credentials
        if hasattr(athlete, 'whoop_credentials'):
            active_sources.append('whoop')
            
        return JsonResponse({
            'success': True,
            'sources': active_sources
        })
    except Exception as e:
        logger.error(f"Error fetching active sources: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

