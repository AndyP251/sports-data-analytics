from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, logout
from django.contrib import messages
from .forms import CustomUserCreationForm
from .utils.s3_utils import S3Utils
from .models import Athlete, CoreBiometricData, create_biometric_data, get_athlete_biometrics
from django.http import JsonResponse
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
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt, csrf_protect
from rest_framework.response import Response
from datetime import timedelta
from django.contrib.auth import login as auth_login
from django.contrib.auth.signals import user_logged_in
from django.dispatch import receiver
import warnings  # Python's built-in warnings module
from django.conf import settings
from asgiref.sync import sync_to_async
from functools import wraps
from rest_framework import status
from django.core.cache import cache
from django.middleware.csrf import get_token, CsrfViewMiddleware

# Set up logging
logger = logging.getLogger(__name__)


# Create your views here.

@login_required
def home(request):
    return render(request, 'core/home.html')

@csrf_protect
@require_http_methods(["POST", "OPTIONS"])
def login_view(request):
    if request.method == "OPTIONS":
        response = JsonResponse({})
        response["Access-Control-Allow-Headers"] = "Content-Type, X-CSRFToken"
        return response

    # Manually handle CSRF validation to return JSON errors
    csrf_middleware = CsrfViewMiddleware(lambda req: None)
    csrf_response = csrf_middleware.process_view(request, None, (), {})
    if csrf_response:
        return JsonResponse({'error': 'CSRF token invalid or missing'}, status=403)

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

        # Get latest data from database
        latest_data = get_athlete_biometrics(athlete, timezone.now().date())
        
        return render(request, 'core/dashboard.html', {
            'biometric_data': latest_data,
            'athlete': athlete
        })
    except Exception as e:
        logger.error(f"Dashboard error: {e}")
        return render(request, 'core/error.html')

@ensure_csrf_cookie
@login_required
def logout_view(request):
    logout(request)
    messages.success(request, 'You have been successfully logged out.')
    return redirect('dashboard')


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
def sync_biometric_data(request):
    """API endpoint for syncing biometric data"""
    try:
        athlete = request.user.athlete
        active_sources = []
        
        # Check for active sources directly from credentials
        if hasattr(athlete, 'garmin_credentials'):
            active_sources.append('garmin')
            
        if hasattr(athlete, 'whoop_credentials'):
            active_sources.append('whoop')
            
            if not active_sources:
                return JsonResponse({
                    'success': False,
                    'error': 'No active sources found'
                }, status=400)

        # Initialize sync service and sync data
        sync_service = DataSyncService(athlete)
        success = sync_service.sync_specific_sources(active_sources)
        
        # Include source-specific error messages if available
        source_errors = {}
        for source, result in success.items():
            if not result:
                # Check if there's a specific error in the logger for this source
                # This is a simplification - in reality you might want to capture errors during sync
                if 'garmin' in source.lower() and hasattr(sync_service, 'last_garmin_error'):
                    source_errors[source] = sync_service.last_garmin_error
                elif 'whoop' in source.lower() and hasattr(sync_service, 'last_whoop_error'):
                    source_errors[source] = sync_service.last_whoop_error

        return JsonResponse({
            'success': success,
            'data': [] if not any(success.values()) else '',
            'errors': source_errors
        })

    except Exception as e:
        error_message = str(e)
        status_code = 500
        
        # Customize the error message based on known error types
        if "Rate limit exceeded" in error_message:
            status_code = 429
            error_message = "Rate limit exceeded. Garmin API is temporarily unavailable. Existing data is still accessible."
            
        logger.error(f"Error in sync_biometric_data: {e}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': error_message
        }, status=status_code)

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
        
        # Get days parameter from query string, default to 30 days
        days = int(request.GET.get('days', 30))
        
        # Use DataSyncService to get data
        sync_service = DataSyncService(athlete)
        data = sync_service.get_biometric_data(days=days)
        
        # If no data found, try to sync first
        if not data:
            logger.info(f"No data found for athlete {athlete.id}, attempting to sync")
            sync_service.sync_specific_sources(sync_service.active_sources)
            data = sync_service.get_biometric_data(days=days)
        
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
    """Get raw biometric data from S3 for all active data sources"""
    try:
        athlete = request.user.athlete
        logger.info(f"Fetching raw biometric data for athlete {athlete.id}")
        
        # Get all active sources
        active_sources = request.user.active_data_sources
        
        if not active_sources:
            logger.warning(f"No active sources found for athlete {athlete.id}")
            return JsonResponse({
                'success': True,
                'data': []
            })
        
        s3_utils = S3Utils()
        all_raw_data = []
        
        # Iterate through all active sources and aggregate data
        for source in active_sources:
            # Use the correct base path format
            base_path = f'accounts/{request.user.id}/biometric-data/{source}'
            logger.info(f"Checking S3 path for source {source}: {base_path}")
            
            try:
                source_data = s3_utils.get_all_json_data(base_path)
                if source_data:
                    # Add source information to each data point
                    for data_point in source_data:
                        data_point['source'] = source
                    all_raw_data.extend(source_data)
                    logger.info(f"Found {len(source_data)} data points for source {source}")
                else:
                    logger.warning(f"No raw data found in S3 for source {source} at path: {base_path}")
            except Exception as s3_error:
                logger.error(f"S3 operation failed for source {source}: {s3_error}", exc_info=True)
                # Continue with other sources even if one fails
        
        # Sort all data by date (if available)
        all_raw_data.sort(key=lambda x: x.get('date', ''), reverse=True)
        
        return JsonResponse({
            'success': True,
            'data': all_raw_data
        })
    except Exception as e:
        logger.error(f"Error fetching raw biometric data: {e}", exc_info=True)
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
            garmin_creds = athlete.garmin_credentials
            active_sources.append({
                'id': 'garmin',
                'name': 'Garmin',
                'profile_type': garmin_creds.profile_type,
                'last_sync': request.user.last_source_check
            })
            
        # Check Whoop credentials
        if hasattr(athlete, 'whoop_credentials'):
            whoop_creds = athlete.whoop_credentials
            active_sources.append({
                'id': 'whoop',
                'name': 'Whoop',
                'last_sync': request.user.last_source_check
            })
            
        return JsonResponse({
            'success': True,
            'sources': active_sources,
            'last_check': request.user.last_source_check
        })
    except Exception as e:
        logger.error(f"Error fetching active sources: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@ensure_csrf_cookie
@require_http_methods(["GET", "POST"])
def verify_dev_password(request):
    if request.method == "GET":
        # Explicitly set CSRF token
        csrf_token = get_token(request)
        logger.info(f"Setting CSRF token: {csrf_token}")
        response = JsonResponse({'csrfToken': csrf_token})
        response['X-CSRFToken'] = csrf_token
        return response
        
    try:
        # Rate limiting
        ip = request.META.get('REMOTE_ADDR')
        attempts_key = f'dev_password_attempts_{ip}'
        attempts = cache.get(attempts_key, 0)
        
        if attempts >= 5:  # Max 5 attempts per 15 minutes
            return JsonResponse(
                {'error': 'Too many attempts. Please try again later.'}, 
                status=429
            )
            
        cache.set(attempts_key, attempts + 1, 900)  # 15 minutes timeout
        
        data = json.loads(request.body)
        password = data.get('password')
        
        if not settings.DEVELOPMENT_PASSWORD:
            logger.error("Development password not set in environment")
            return JsonResponse(
                {'error': 'Server configuration error'}, 
                status=500
            )
        
        if password == settings.DEVELOPMENT_PASSWORD:
            cache.delete(attempts_key)  # Reset attempts on success
            return JsonResponse({'status': 'success'})
        
        return JsonResponse(
            {'error': 'Invalid development password'}, 
            status=401
        )
    except Exception as e:
        logger.error(f"Development gate error: {str(e)}")
        return JsonResponse(
            {'error': 'Server error'}, 
            status=500
        )

