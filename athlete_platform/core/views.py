from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, logout
from django.contrib import messages
from .forms import CustomUserCreationForm
from .utils.s3_utils import S3Utils
from .models import Athlete, CoreBiometricData, create_biometric_data, get_athlete_biometrics, Team, Coach, User
from django.http import JsonResponse, HttpResponse
from django.views.decorators.http import require_POST, require_http_methods
from datetime import datetime
from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate
from django.utils import timezone
import logging
import boto3
from botocore.exceptions import ClientError
import json
import os
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
from .ai_insights import (
    get_all_insight_categories, 
    generate_insights_for_athlete, 
    get_recommendations_for_athlete, 
    get_insight_trends_for_athlete
)
from .services.coach_data_sync_service import CoachDataSyncService
from .permissions import IsCoach

# Set up logging
logger = logging.getLogger(__name__)


# Create your views here.

@login_required
def home(request):
    return render(request, 'core/home.html')

# Serve React frontend for any non-API route
def frontend_view(request, path=''):
    """
    Serve the React frontend app for any path that doesn't match API or admin routes.
    This enables client-side routing to work with direct URL access.
    """
    try:
        # Check if this is an API route (which should be handled by Django)
        if request.path.startswith('/api/') or request.path.startswith('/admin/'):
            return HttpResponse(status=404)
            
        # In production, serve the index.html from the build directory
        index_file_path = os.path.join(settings.STATIC_ROOT, 'index.html')
        
        # If in development, use the Vite dev server
        if settings.DEBUG:
            from django.shortcuts import redirect
            return redirect('http://localhost:5173' + request.get_full_path())
        
        # Check if the index file exists
        if os.path.exists(index_file_path):
            with open(index_file_path, 'r') as f:
                return HttpResponse(f.read(), content_type='text/html')
        else:
            logger.error(f"Index file not found at {index_file_path}")
            return HttpResponse("Frontend not built. Please run 'npm run build' in the frontend directory.", status=500)
    except Exception as e:
        logger.error(f"Error serving frontend: {e}")
        return HttpResponse(f"Error serving frontend: {str(e)}", status=500)

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
        
        # Get data from request body
        try:
            body_data = json.loads(request.body.decode('utf-8'))
            source = body_data.get('source')
            force_refresh = body_data.get('force_refresh', False)
            logger.info(f"Sync requested with source={source}, force_refresh={force_refresh}")
        except json.JSONDecodeError:
            source = None
            force_refresh = False
            logger.info("No body data provided, using defaults")
        
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
        
        # Filter sources if a specific one was requested
        if source:
            if source in active_sources:
                active_sources = [source]
            else:
                return JsonResponse({
                    'success': False,
                    'error': f'Source {source} is not active'
                }, status=400)

        # Initialize sync service and sync data with force_refresh parameter
        sync_service = DataSyncService(athlete)
        success = sync_service.sync_specific_sources(active_sources, force_refresh=force_refresh)
        
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
        
        # Add source filter if present
        source_filter = request.GET.get('source', None)
        
        # DEBUG: Check database directly for available sources
        from django.db.models import Count
        
        # Get source counts for this athlete
        source_counts = CoreBiometricData.objects.filter(
            athlete=athlete
        ).values('source').annotate(count=Count('id'))
        
        logger.info(f"DB source counts for athlete {athlete.id}: {list(source_counts)}")
        
        # ADDED: Direct query to check all available sources in the database
        all_sources = CoreBiometricData.objects.values_list('source', flat=True).distinct()
        logger.info(f"All sources in database: {list(all_sources)}")
        
        # ADDED: Check if any Garmin data exists in database for any athlete
        garmin_count = CoreBiometricData.objects.filter(source__iexact='garmin').count()
        logger.info(f"Total Garmin entries in database: {garmin_count}")
        
    
        # Use DataSyncService to get data
        sync_service = DataSyncService(athlete)
        
        # ADDED: Log active sources from sync_service
        logger.info(f"Active sources from sync_service: {sync_service.active_sources}")
        
        # Check if Garmin processor exists and is working
        if hasattr(sync_service, 'processors'):
            for processor in sync_service.processors:
                logger.info(f"Processor: {type(processor).__name__} is active")
                
        data = sync_service.get_biometric_data(days=days)
        
        # Log what's being returned by the sync service
        if data:
            # Count by source
            source_distribution = {}
            for item in data:
                source = item.get('source', 'unknown')
                source_distribution[source] = source_distribution.get(source, 0) + 1
            
            logger.info(f"API returning {len(data)} items with source distribution: {source_distribution}")
            
            # Log any source field inconsistencies
            unique_sources = set(item.get('source', 'unknown') for item in data)
            logger.info(f"Unique source values in API data: {unique_sources}")
            
            # Check if we should apply source filter
            if source_filter:
                filtered_data = [item for item in data if item.get('source', '').lower() == source_filter.lower()]
                logger.info(f"Filtered to {len(filtered_data)} items for source '{source_filter}'")
                data = filtered_data
        else:
            logger.info(f"No data found for athlete {athlete.id}, attempting to sync")
            sync_service.sync_specific_sources(sync_service.active_sources)
            data = sync_service.get_biometric_data(days=days)
            
            if source_filter and data:
                filtered_data = [item for item in data if item.get('source', '').lower() == source_filter.lower()]
                logger.info(f"After sync, filtered to {len(filtered_data)} items for source '{source_filter}'")
                data = filtered_data
        
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

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def get_db_info(request):
    """
    Debug endpoint to get raw database information.
    For coaches, allows querying CoreBiometricData for specific athletes
    """
    from .models import CoreBiometricData, Athlete, Coach
    from django.utils import timezone
    import datetime
    import json
    
    is_coach = False
    coach = None
    
    # Check if user is a coach - check both possible attributes
    try:
        if hasattr(request.user, 'coach_profile'):
            coach = request.user.coach_profile
            is_coach = True
        elif hasattr(request.user, 'coach'):
            coach = request.user.coach
            
        # Add debug logging
        logger.debug(f"User: {request.user}, is_coach: {is_coach}, coach object: {coach}")
            
    except Exception as e:
        logger.error(f"Error checking coach status: {e}")
        # Not a coach, use default permission logic
        if not request.user.is_staff and not (hasattr(request.user, 'role') and request.user.role == 'ADMIN'):
            return Response({"error": "Access denied. This endpoint is for administrators only."}, status=403)
    
    if request.method == 'POST' and is_coach and coach:
        # Coach-specific POST request to get CoreBiometricData for team athletes
        try:
            # Get request data
            post_data = request.data
            athlete_ids = post_data.get('athlete_ids', [])
            days = int(post_data.get('days', 7))
            team_id = post_data.get('team_id')
            
            if not athlete_ids and not team_id:
                return Response({"error": "No athlete IDs or team ID provided"}, status=400)
            
            # Calculate date range
            end_date = timezone.now().date()
            start_date = end_date - datetime.timedelta(days=days)
            
            # Get athletes that belong to this coach's team
            # Try different ways to access coach athletes
            coach_athletes = []
            coach_athlete_ids = []
            
            # First, try to get team from coach
            coach_team = None
            if coach.team:
                coach_team = coach.team
            elif team_id:
                try:
                    coach_team = Team.objects.get(id=team_id)
                except Team.DoesNotExist:
                    pass
            
            # If we have a team, try to get athletes from athletes_array first
            if coach_team and hasattr(coach_team, 'athletes_array') and coach_team.athletes_array:
                # Get all user IDs from athletes_array
                user_ids = coach_team.athletes_array
                
                # Look up athletes by user relationship instead of direct ID match
                coach_athletes = Athlete.objects.filter(user__id__in=user_ids)
                coach_athlete_ids = [str(athlete.id) for athlete in coach_athletes]
                logger.debug(f"Found {len(coach_athlete_ids)} athlete objects through user relationship")
            
            # If we didn't get athlete IDs from the athletes_array, try other methods
            if not coach_athlete_ids:
                # Try using the coach.athletes ManyToMany field
                if hasattr(coach, 'athletes'):
                    coach_athletes = coach.athletes.all()
                    coach_athlete_ids = [str(athlete.id) for athlete in coach_athletes]
                    
                # If that didn't work, try getting athletes by team relation
                if not coach_athletes and coach_team:
                    try:
                        coach_athletes = Athlete.objects.filter(team=coach_team)
                        coach_athlete_ids = [str(athlete.id) for athlete in coach_athletes]
                    except Exception as e:
                        logger.error(f"Error getting athletes by team: {e}")
                        
                # Last resort - try getting athletes by user's team association
                if not coach_athletes and coach_team:
                    try:
                        # Get user IDs who are on this team
                        team_user_ids = User.objects.filter(team=coach_team, role='ATHLETE').values_list('id', flat=True)
                        # Find athletes with these users
                        coach_athletes = Athlete.objects.filter(user__id__in=team_user_ids)
                        coach_athlete_ids = [str(athlete.id) for athlete in coach_athletes]
                        logger.debug(f"Found {len(coach_athlete_ids)} athlete objects through user-team relationship")
                    except Exception as e:
                        logger.error(f"Error getting athletes by user-team relationship: {e}")
            
            # Debug log the found athletes
            logger.debug(f"Coach {coach.user.username} has {len(coach_athlete_ids)} athletes: {coach_athlete_ids}")
            
            # If we found athletes through query but the athletes_array is empty or different,
            # update the athletes_array
            if coach_team and coach_athletes and hasattr(coach_team, 'athletes_array'):
                coach_team_athlete_ids = [str(athlete.id) for athlete in coach_athletes]
                if set(coach_team_athlete_ids) != set(coach_team.athletes_array or []):
                    coach_team.athletes_array = coach_team_athlete_ids
                    coach_team.save(update_fields=['athletes_array'])
                    logger.info(f"Updated team {coach_team.name} athletes_array with {len(coach_team_athlete_ids)} athletes")
            
            # If still no athletes, try allowing all the requested athlete IDs for now
            # (this is a temporary fallback for debugging)
            if not coach_athlete_ids and request.user.is_staff:
                logger.warning(f"No athletes found through normal methods, allowing access to all requested athletes for staff user")
                coach_athlete_ids = athlete_ids
            
            # Filter athlete IDs to only include those on the coach's team
            valid_athlete_ids = []
            
            # If we were given specific athlete IDs, filter them
            if athlete_ids:
                valid_athlete_ids = [aid for aid in athlete_ids if aid in coach_athlete_ids]
            else:
                # Otherwise use all the coach's athlete IDs
                valid_athlete_ids = coach_athlete_ids
            
            if not valid_athlete_ids:
                return Response({"error": "No valid athlete IDs found. The requested athletes may not belong to your team."}, status=400)
            
            # Query biometric data
            biometric_data = {}
            
            for athlete_id in valid_athlete_ids:
                try:
                    # First try direct lookup by ID
                    try:
                        athlete = Athlete.objects.get(id=athlete_id)
                    except Athlete.DoesNotExist:
                        # If that fails, try looking up by User ID relationship
                        try:
                            user = User.objects.get(id=athlete_id)
                            athlete = Athlete.objects.get(user=user)
                            logger.info(f"Found athlete {athlete.id} through User ID {user.id}")
                        except (User.DoesNotExist, Athlete.DoesNotExist):
                            logger.warning(f"Could not find Athlete model for ID {athlete_id}")
                            continue
                    
                    # Get biometric data for this athlete in the date range
                    data_points = CoreBiometricData.objects.filter(
                        athlete=athlete,
                        date__range=[start_date, end_date]
                    ).order_by('date')
                    
                    if data_points.exists():
                        # Convert to list of dicts for JSON serialization
                        athlete_data = []
                        for point in data_points:
                            point_dict = {
                                'date': point.date.isoformat(),
                                'resting_heart_rate': point.resting_heart_rate,
                                'max_heart_rate': point.max_heart_rate,
                                'min_heart_rate': point.min_heart_rate,
                                'hrv_ms': point.hrv_ms,
                                'recovery_score': point.recovery_score,
                                'total_sleep_seconds': point.total_sleep_seconds,
                                'deep_sleep_seconds': point.deep_sleep_seconds,
                                'light_sleep_seconds': point.light_sleep_seconds,
                                'rem_sleep_seconds': point.rem_sleep_seconds,
                                'total_steps': point.total_steps,
                                'total_distance_meters': point.total_distance_meters,
                                'average_heart_rate': point.average_heart_rate,
                                'strain': point.strain,
                                'source': point.source
                            }
                            athlete_data.append(point_dict)
                        
                        biometric_data[athlete_id] = athlete_data
                except Athlete.DoesNotExist:
                    # Skip this athlete ID
                    pass
            
            return Response({
                "status": "success",
                "data": biometric_data,
                "message": f"Retrieved biometric data for {len(biometric_data)} athletes",
                "date_range": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat()
                }
            })
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=500)
    
    # Original implementation for GET requests or non-coach users
    try:
        # Get model stats
        model_stats = {
            "CoreBiometricData": CoreBiometricData.objects.count(),
            "Athlete": Athlete.objects.count(),
        }
        
        # For staff, include additional information
        if request.user.is_staff:
            latest_data = CoreBiometricData.objects.order_by('-created_at').first()
            latest_info = "No data" if latest_data is None else {
                "athlete": str(latest_data.athlete),
                "date": latest_data.date.isoformat(),
                "created_at": latest_data.created_at.isoformat()
            }
            
            model_stats["latest_data"] = latest_info
        
        return Response({
            "model_stats": model_stats,
            "user_info": {
                "username": request.user.username,
                "is_staff": request.user.is_staff,
                "is_coach": is_coach
            }
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_insights(request):
    """Generate and return insights based on the user's biometric data"""
    try:
        days = int(request.GET.get('days', 30))
        source = request.GET.get('source', None)
        
        insights = generate_insights_for_athlete(
            athlete_id=request.user.athlete.id,
            days=days,
            source=source
        )
        
        return JsonResponse({
            'success': True,
            'insights': insights
        })
    except Exception as e:
        logger.error(f"Error generating insights: {e}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_insight_categories(request):
    """Return all available insight categories"""
    try:
        categories = get_all_insight_categories()
        return JsonResponse({
            'success': True,
            'categories': categories
        })
    except Exception as e:
        logger.error(f"Error getting insight categories: {e}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_insight_trends(request):
    """Return trend data for key metrics"""
    try:
        days = int(request.GET.get('days', 30))
        source = request.GET.get('source', None)
        
        trends = get_insight_trends_for_athlete(
            athlete_id=request.user.athlete.id,
            days=days,
            source=source
        )
        
        return JsonResponse({
            'success': True,
            'trends': trends
        })
    except Exception as e:
        logger.error(f"Error getting insight trends: {e}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_recommendations(request):
    """Return personalized recommendations based on biometric data"""
    try:
        days = int(request.GET.get('days', 30))
        source = request.GET.get('source', None)
        
        recommendations = get_recommendations_for_athlete(
            athlete_id=request.user.athlete.id,
            days=days,
            source=source
        )
        
        return JsonResponse({
            'success': True,
            'recommendations': recommendations
        })
    except Exception as e:
        logger.error(f"Error getting recommendations: {e}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_insight_feedback(request):
    """Submit user feedback about an insight or recommendation"""
    try:
        data = json.loads(request.body)
        insight_id = data.get('insight_id')
        feedback_type = data.get('type')  # 'helpful', 'not_helpful', etc.
        feedback_text = data.get('feedback', '')
        
        if not insight_id or not feedback_type:
            return JsonResponse({
                'success': False,
                'error': 'Missing required parameters'
            }, status=400)
            
        # In a real implementation, you would store this feedback in the database
        # For now, we'll just log it
        logger.info(f"Received feedback for insight {insight_id}: {feedback_type} - {feedback_text}")
        
        return JsonResponse({
            'success': True,
            'message': 'Feedback submitted successfully'
        })
    except Exception as e:
        logger.error(f"Error submitting insight feedback: {e}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def disconnect_source(request):
    """API endpoint for disconnecting a data source"""
    try:
        # Log request headers for debugging
        logger.info(f"Disconnect request headers: {request.headers}")
        
        source = request.data.get('source')
        if not source:
            return JsonResponse({
                'success': False,
                'message': 'No source specified'
            }, status=400)
            
        logger.info(f"Disconnecting source '{source}' for user: {request.user.id}")
        
        user = request.user
        athlete = user.athlete
        
        # Check if the source exists and remove related credentials
        if source == 'garmin' and hasattr(athlete, 'garmin_credentials'):
            athlete.garmin_credentials.delete()
            logger.info(f"Deleted Garmin credentials for user {user.id}")
            
        elif source == 'whoop' and hasattr(athlete, 'whoop_credentials'):
            athlete.whoop_credentials.delete()
            logger.info(f"Deleted WHOOP credentials for user {user.id}")
        
        # Update active_data_sources in user model
        # The field is defined as JSONField with default as list in the User model
        if hasattr(user, 'active_data_sources'):
            try:
                active_sources = list(user.active_data_sources)
                if source in active_sources:
                    active_sources.remove(source)
                    user.active_data_sources = active_sources
                    user.save()
                    logger.info(f"Removed '{source}' from active_data_sources for user {user.id}")
            except Exception as e:
                logger.error(f"Error updating active_data_sources: {e}")
            
        # Call method to update source information if it exists
        if hasattr(user, 'update_active_sources'):
            try:
                user.update_active_sources()
                logger.info(f"Updated active sources for user {user.id}")
            except Exception as e:
                logger.error(f"Error calling update_active_sources: {e}")
        
        return JsonResponse({
            'success': True,
            'message': f'Successfully disconnected {source}'
        })
        
    except Exception as e:
        logger.error(f"Error disconnecting source: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@csrf_exempt
def disconnect_source_no_csrf(request):
    """API endpoint for disconnecting a data source without CSRF protection (for troubleshooting)"""
    try:
        # Log request headers for debugging
        logger.info(f"Disconnect request headers (no CSRF): {request.headers}")
        
        # Parse source from request body
        try:
            if isinstance(request.data, dict):
                source = request.data.get('source')
            else:
                # Try to parse it from the body if not in request.data
                request_data = json.loads(request.body.decode('utf-8'))
                source = request_data.get('source')
        except Exception as e:
            logger.error(f"Error parsing request body: {e}")
            # Fallback to query parameters
            source = request.GET.get('source')
        
        if not source:
            return JsonResponse({
                'success': False,
                'message': 'No source specified'
            }, status=400)
            
        logger.info(f"Disconnecting source '{source}' for user: {request.user.id}")
        
        user = request.user
        athlete = user.athlete
        
        # Check if the source exists and remove related credentials
        if source == 'garmin' and hasattr(athlete, 'garmin_credentials'):
            athlete.garmin_credentials.delete()
            logger.info(f"Deleted Garmin credentials for user {user.id}")
            
        elif source == 'whoop' and hasattr(athlete, 'whoop_credentials'):
            athlete.whoop_credentials.delete()
            logger.info(f"Deleted WHOOP credentials for user {user.id}")
        
        # Update active_data_sources in user model
        try:
            if hasattr(user, 'active_data_sources'):
                active_sources = list(user.active_data_sources)
                if source in active_sources:
                    active_sources.remove(source)
                    user.active_data_sources = active_sources
                    user.save()
                    logger.info(f"Removed '{source}' from active_data_sources for user {user.id}")
        except Exception as e:
            logger.error(f"Error updating active_data_sources: {e}")
            
        return JsonResponse({
            'success': True,
            'message': f'Successfully disconnected {source}'
        })
        
    except Exception as e:
        logger.error(f"Error disconnecting source (no CSRF): {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

def get_teams(request):
    """
    Returns a list of all teams for use in registration forms
    """
    teams = Team.objects.all().values('id', 'name')
    return JsonResponse(list(teams), safe=False)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_team_athletes(request, team_id):
    """
    Returns a list of athletes for a specific team
    """
    try:
        # Check if user is a coach with access to this team
        is_authorized = False
        
        # If user is a coach and has this team
        try:
            if hasattr(request.user, 'coach_profile'):
                coach = request.user.coach_profile
                if coach.team and str(coach.team.id) == team_id:
                    is_authorized = True
        except Exception as e:
            logger.error(f"Error checking coach authorization: {e}")
        
        # If user is an admin
        if request.user.is_staff or request.user.is_superuser:
            is_authorized = True
            
        if not is_authorized:
            return Response(
                {"error": "Not authorized to view this team's athletes"}, 
                status=403
            )
        
        # Get the team
        team = Team.objects.get(id=team_id)
        
        # Get all athletes for this team
        athletes = Athlete.objects.filter(team=team)
        
        # Serialize athlete data
        athlete_data = []
        for athlete in athletes:
            athlete_data.append({
                'id': str(athlete.id),
                'user': {
                    'id': str(athlete.user.id),
                    'username': athlete.user.username,
                    'email': athlete.user.email
                },
                'position': athlete.position,
                'jersey_number': athlete.jersey_number,
                'height': float(athlete.height) if athlete.height else None,
                'weight': float(athlete.weight) if athlete.weight else None
            })
        
        return Response({
            'team': {
                'id': str(team.id),
                'name': team.name
            },
            'athletes': athlete_data
        })
        
    except Team.DoesNotExist:
        return Response({"error": "Team not found"}, status=404)
    except Exception as e:
        logger.error(f"Error getting team athletes: {e}")
        return Response({"error": f"Error retrieving team athletes: {str(e)}"}, status=500)

# Coach Data API Views
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsCoach])
def team_biometric_summary(request):
    """Get team-level biometric data summary"""
    try:
        days = int(request.query_params.get('days', 7))
        # Get coach object safely
        coach = None
        if hasattr(request.user, 'coach_profile'):
            coach = request.user.coach_profile
        elif hasattr(request.user, 'coach'):
            coach = request.user.coach
        
        service = CoachDataSyncService(coach=coach)
        summary = service.get_team_biometric_summary(days=days)
        
        return Response(summary)
    except Exception as e:
        return Response({
            'error': str(e),
            'message': 'Failed to retrieve team biometric summary'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsCoach])
def position_biometric_summary(request):
    """Get position-based biometric data summary"""
    try:
        days = int(request.query_params.get('days', 7))
        # Get coach object safely
        coach = None
        if hasattr(request.user, 'coach_profile'):
            coach = request.user.coach_profile
        elif hasattr(request.user, 'coach'):
            coach = request.user.coach
        
        service = CoachDataSyncService(coach=coach)
        summary = service.get_position_biometric_summary(days=days)
        
        return Response(summary)
    except Exception as e:
        return Response({
            'error': str(e),
            'message': 'Failed to retrieve position biometric summary'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsCoach])
def position_athletes_data(request, position):
    """Get detailed data for all athletes in a specific position"""
    try:
        days = int(request.query_params.get('days', 7))
        # Get coach object safely
        coach = None
        if hasattr(request.user, 'coach_profile'):
            coach = request.user.coach_profile
        elif hasattr(request.user, 'coach'):
            coach = request.user.coach
        
        service = CoachDataSyncService(coach=coach)
        data = service.get_position_athletes_data(position=position, days=days)
        
        return Response(data)
    except Exception as e:
        return Response({
            'error': str(e),
            'message': f'Failed to retrieve data for position: {position}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsCoach])
def athlete_biometric_data(request, athlete_id):
    """Get detailed biometric data for a specific athlete"""
    try:
        days = int(request.query_params.get('days', 7))
        # Get coach object safely
        coach = None
        if hasattr(request.user, 'coach_profile'):
            coach = request.user.coach_profile
        elif hasattr(request.user, 'coach'):
            coach = request.user.coach
        
        service = CoachDataSyncService(coach=coach)
        data = service.get_athlete_biometric_data(athlete_id=athlete_id, days=days)
        
        if not data:
            return Response({
                'message': 'No data found or athlete not on your team'
            }, status=status.HTTP_404_NOT_FOUND)
            
        return Response(data)
    except Exception as e:
        return Response({
            'error': str(e),
            'message': f'Failed to retrieve data for athlete: {athlete_id}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsCoach])
def biometric_comparison_by_position(request):
    """Get comparison of biometric metrics across different positions"""
    try:
        days = int(request.query_params.get('days', 30))
        # Get coach object safely
        coach = None
        if hasattr(request.user, 'coach_profile'):
            coach = request.user.coach_profile
        elif hasattr(request.user, 'coach'):
            coach = request.user.coach
        
        service = CoachDataSyncService(coach=coach)
        data = service.get_biometric_comparison_by_position(days=days)
        
        return Response(data)
    except Exception as e:
        return Response({
            'error': str(e),
            'message': 'Failed to retrieve biometric comparison data'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsCoach])
def training_optimization(request):
    """Get training optimization recommendations"""
    try:
        position = request.query_params.get('position', None)
        # Get coach object safely
        coach = None
        if hasattr(request.user, 'coach_profile'):
            coach = request.user.coach_profile
        elif hasattr(request.user, 'coach'):
            coach = request.user.coach
        
        service = CoachDataSyncService(coach=coach)
        data = service.get_training_optimization_data(position=position)
        
        return Response(data)
    except Exception as e:
        return Response({
            'error': str(e),
            'message': 'Failed to retrieve training optimization data'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsCoach])
def sync_team_data(request):
    """Trigger a sync of biometric data for all athletes on the team"""
    try:
        days = int(request.data.get('days', 7))
        force_refresh = request.data.get('force_refresh', False)
        team_id = request.data.get('team_id', None)
        athlete_ids = request.data.get('athlete_ids', [])
        
        # Add extensive logging
        logger.info(f"Sync team data requested by user: {request.user.username}")
        logger.info(f"Request data: days={days}, force_refresh={force_refresh}, team_id={team_id}, athlete_ids: {len(athlete_ids)}")
        
        # Get coach object safely
        coach = None
        if hasattr(request.user, 'coach_profile'):
            coach = request.user.coach_profile
            logger.info(f"Found coach via coach_profile: {coach.id if coach else 'None'}")
        elif hasattr(request.user, 'coach'):
            coach = request.user.coach
            logger.info(f"Found coach via coach attr: {coach.id if coach else 'None'}")
        
        # Add debug logging to inspect coach user
        logger.info(f"User: {request.user}, has coach_profile: {hasattr(request.user, 'coach_profile')}, has coach attr: {hasattr(request.user, 'coach')}")
        
        if not coach:
            logger.error(f"No coach object found for user {request.user.username}")
            return Response({
                'message': 'User is not a coach'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Try to find team if not already set
        coach_team = None
        if coach.team:
            coach_team = coach.team
        elif team_id:
            try:
                from .models import Team
                coach_team = Team.objects.get(id=team_id)
                logger.info(f"Found team by ID: {coach_team.name} ({coach_team.id})")
                
                # Update coach with this team if not set
                if not coach.team:
                    coach.team = coach_team
                    coach.save()
                    logger.info(f"Updated coach with team: {coach_team.name}")
            except Exception as e:
                logger.error(f"Failed to set team for coach: {e}")
        
        # Log team information
        if coach_team:
            logger.info(f"Coach team: {coach_team.name} ({coach_team.id})")
        else:
            logger.info(f"Coach has no team assigned")
            return Response({
                'message': 'No team found for coach'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Try different ways to get athletes
        athletes = []
        athlete_ids_to_sync = []
        
        # First check team's athletes_array if available
        if hasattr(coach_team, 'athletes_array') and coach_team.athletes_array:
            athlete_ids_to_sync = coach_team.athletes_array
            logger.info(f"Found {len(athlete_ids_to_sync)} athlete IDs in team's athletes_array")
            
            # Load athlete objects
            try:
                athletes = list(Athlete.objects.filter(id__in=athlete_ids_to_sync))
                logger.info(f"Loaded {len(athletes)} athlete objects from athletes_array")
            except Exception as e:
                logger.error(f"Error loading athletes from athletes_array: {e}")
        
        # If no athletes found in athletes_array, try using coach.athletes ManyToMany first
        if not athletes and hasattr(coach, 'athletes') and coach.athletes.count() > 0:
            athletes = list(coach.athletes.all())
            athlete_ids_to_sync = [str(athlete.id) for athlete in athletes]
            logger.info(f"Found {len(athletes)} athletes via coach.athletes")
            
        # If no athletes found and coach has a team, try getting by team
        if not athletes and coach_team:
            from .models import Athlete
            team_athletes = Athlete.objects.filter(team=coach_team)
            athletes = list(team_athletes)
            athlete_ids_to_sync = [str(athlete.id) for athlete in athletes]
            logger.info(f"Found {len(athletes)} athletes via team {coach_team.name}")
            
            # If we found athletes but the coach.athletes ManyToMany is empty, populate it
            if athletes and hasattr(coach, 'athletes'):
                try:
                    coach.athletes.add(*athletes)
                    logger.info(f"Added {len(athletes)} athletes to coach.athletes from team")
                except Exception as e:
                    logger.error(f"Error adding team athletes to coach: {e}")
        
        # If specific athlete_ids were provided and either:
        # 1. We found no athletes via other methods, or
        # 2. The provided IDs are a subset of the team's athlete IDs
        if athlete_ids and (not athletes or all(aid in athlete_ids_to_sync for aid in athlete_ids)):
            try:
                from .models import Athlete
                specified_athletes = Athlete.objects.filter(id__in=athlete_ids)
                if specified_athletes.exists():
                    logger.info(f"Using {specified_athletes.count()} specifically requested athletes")
                    athletes = list(specified_athletes)
                    athlete_ids_to_sync = athlete_ids
            except Exception as e:
                logger.error(f"Error finding specifically requested athletes: {e}")
        
        # Update team's athletes_array if needed
        if coach_team and athletes and hasattr(coach_team, 'athletes_array'):
            athlete_ids_from_objects = [str(a.id) for a in athletes]
            if set(athlete_ids_from_objects) != set(coach_team.athletes_array or []):
                coach_team.athletes_array = athlete_ids_from_objects
                coach_team.save(update_fields=['athletes_array'])
                logger.info(f"Updated team {coach_team.name} athletes_array with {len(athlete_ids_from_objects)} athletes")
        
        if not athletes:
            logger.error(f"No athletes found for coach {coach.user.username}, team: {coach_team}")
            return Response({
                'message': 'No athletes found or sync failed'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"Found {len(athletes)} athletes to sync")
        
        service = CoachDataSyncService(coach=coach)
        success = service.sync_team_biometric_data(days=days, force_refresh=force_refresh)
        
        if success:
            return Response({'message': f'Team data sync initiated successfully for {len(athletes)} athletes'})
        else:
            return Response({
                'message': 'No athletes found or sync failed'
            }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Error in sync_team_data: {e}", exc_info=True)
        return Response({
            'error': str(e),
            'message': 'Failed to sync team data'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

