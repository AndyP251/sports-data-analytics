"""
Developed by Andrew William Prince
Last Edit: March 7th, 2025

Authentication API endpoints handling user login, registration, session management,
and authentication verification for the athlete platform.
"""
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST, require_http_methods
from ..models import User, Team, Athlete  # Import your custom User model from core
import json
import logging
from enum import IntEnum
from django.db import transaction, IntegrityError
from ..services.data_sync_service import DataSyncService
import uuid

logger = logging.getLogger(__name__)

class DebugLevel(IntEnum):
    LOW = 1     # Basic operation logging
    MEDIUM = 2  # More detailed operation logging
    EXTREME = 3 # Full debug output with database dumps

# Set your desired debug level here
CURRENT_DEBUG_LEVEL = DebugLevel.EXTREME

def debug_log(message, level=DebugLevel.LOW):
    """Helper function for debug logging based on level"""
    if level.value <= CURRENT_DEBUG_LEVEL.value:
        logger.info(f"DEBUG [{level.name}]: {message}")
        print(f"DEBUG [{level.name}]: {message}")  # Print to console for immediate feedback

@ensure_csrf_cookie
def check_auth(request):
    if request.user.is_authenticated:
        return JsonResponse({
            'username': request.user.username,
            'email': request.user.email
        })
    return JsonResponse({'error': 'Not authenticated'}, status=401)

@ensure_csrf_cookie
@require_http_methods(["POST", "OPTIONS"])
def login_view(request):
    if request.method == "OPTIONS":
        response = JsonResponse({})
        response["Access-Control-Allow-Headers"] = "Content-Type, X-Csrftoken"  # Match the frontend header
        return response

    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        skip_sync = data.get('skip_sync', False)

        logger.info(f"Login attempt for username: {username}")

        if not username or not password:
            error_msg = "Please provide both username and password"
            logger.warning(error_msg)
            return JsonResponse({'error': error_msg}, status=400)

        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            
            # Set a flag for frontend to know it should sync after redirect
            if skip_sync:
                response_data = {
                    'success': True,
                    'message': 'Login successful',
                    'needs_sync': True
                }
            else:
                # Original sync behavior for backward compatibility
                sync_service = DataSyncService(user.athlete)
                sync_service.sync_data()
                response_data = {
                    'success': True,
                    'message': 'Login successful'
                }
                
            return JsonResponse(response_data)
        else:
            logger.warning(f"Failed login attempt for username: {username}")
            return JsonResponse({'error': 'Invalid credentials'}, status=400)

    except json.JSONDecodeError:
        logger.error("Invalid JSON in request body")
        return JsonResponse({'error': 'Invalid JSON in request body'}, status=400)
    except Exception as e:
        logger.error(f"Unexpected error in login: {str(e)}")
        return JsonResponse({'error': 'Login failed', 'details': str(e)}, status=500)

@ensure_csrf_cookie
@require_http_methods(["POST", "OPTIONS"])
def register_view(request):
    if request.method == "OPTIONS":
        response = JsonResponse({})
        response["Access-Control-Allow-Headers"] = "Content-Type, X-Csrftoken"  # Match the frontend header
        return response

    created_user = None  # Variable to track created user for cleanup if needed
    
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        email = data.get('email')
        team_id = data.get('team_id')  # Changed from team to team_id to match frontend
        position = data.get('position', 'FORWARD')  # Default to FORWARD if not provided

        debug_log(f"Registration attempt for username: {username}, email: {email}", DebugLevel.LOW)
        if team_id:
            debug_log(f"Team ID: {team_id}, Position: {position}", DebugLevel.MEDIUM)

        if CURRENT_DEBUG_LEVEL == DebugLevel.EXTREME:
            debug_log("Current users in database:", DebugLevel.EXTREME)
            existing_users = User.objects.all()
            for user in existing_users:
                debug_log(f"User: {user.username}, Email: {user.email}", DebugLevel.EXTREME)

        # Validation checks
        if not username or not password or not email:
            missing_fields = []
            if not username: missing_fields.append('username')
            if not password: missing_fields.append('password')
            if not email: missing_fields.append('email')
            error_msg = f"Missing required fields: {', '.join(missing_fields)}"
            debug_log(error_msg, DebugLevel.MEDIUM)
            return JsonResponse({'error': error_msg}, status=400)
            
        # Validate position if provided
        valid_positions = ['FORWARD', 'MIDFIELDER', 'DEFENDER', 'GOALKEEPER']
        if position and position not in valid_positions:
            error_msg = f"Invalid position: {position}. Must be one of {valid_positions}"
            debug_log(error_msg, DebugLevel.MEDIUM)
            return JsonResponse({'error': error_msg}, status=400)

        # Check for existing username with debug info
        existing_username = User.objects.filter(username=username)
        if existing_username.exists():
            debug_log(f"Username collision found: {username}", DebugLevel.MEDIUM)
            
            if CURRENT_DEBUG_LEVEL == DebugLevel.EXTREME:
                all_usernames = User.objects.values_list('username', flat=True)
                debug_log(f"All existing usernames: {list(all_usernames)}", DebugLevel.EXTREME)
            
            return JsonResponse({
                'error': 'Username already exists',
                'field': 'username'
            }, status=400)

        # Check for existing email with debug info
        existing_email = User.objects.filter(email=email)
        if existing_email.exists():
            debug_log(f"Email collision found: {email}", DebugLevel.MEDIUM)
            
            if CURRENT_DEBUG_LEVEL == DebugLevel.EXTREME:
                all_emails = User.objects.values_list('email', flat=True)
                debug_log(f"All existing emails: {list(all_emails)}", DebugLevel.EXTREME)
            
            return JsonResponse({
                'error': 'Email already exists',
                'field': 'email'
            }, status=400)

        # Create user and athlete profile in separate steps with error recovery
        try:
            # First check if an athlete with same username already exists
            # This is a defensive check against potential race conditions
            try:
                existing_user = User.objects.get(username=username)
                debug_log(f"Username collision detected during registration: {username}", DebugLevel.LOW)
                return JsonResponse({
                    'error': 'Username already exists',
                    'field': 'username'
                }, status=400)
            except User.DoesNotExist:
                # This is the expected path - username doesn't exist yet
                pass

            # Create the user first
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                role='ATHLETE'
            )
            created_user = user  # Store reference for potential cleanup
            debug_log(f"Created user object: {user}", DebugLevel.MEDIUM)
            
            # Get team if team_id is provided
            team = None
            if team_id:
                try:
                    debug_log(f"Attempting to find team with ID: {team_id}", DebugLevel.MEDIUM)
                    
                    # Handle possible UUID validation issues
                    try:
                        # Convert string to UUID object for lookup
                        team_uuid = uuid.UUID(team_id)
                        team = Team.objects.get(id=team_uuid)
                    except ValueError:
                        debug_log(f"Invalid UUID format: {team_id}", DebugLevel.LOW)
                        team = None
                    
                    if team:
                        debug_log(f"Found team: {team.name}", DebugLevel.MEDIUM)
                        
                        # Directly set both the user's team field and the position
                        user.team = team
                        user.position = position
                        
                        # Save the user to persist these changes
                        user.save(update_fields=['team', 'position'])
                        
                        debug_log(f"Updated user with team {team.name} and position {position}", DebugLevel.LOW)
                    else:
                        debug_log(f"No team found with ID: {team_id}", DebugLevel.MEDIUM)
                        
                except Team.DoesNotExist:
                    debug_log(f"Team with id {team_id} not found", DebugLevel.MEDIUM)
                    team = None  # Explicitly set to None if not found
                except Exception as e:
                    debug_log(f"Error setting team: {str(e)}", DebugLevel.LOW)
                    team = None
            else:
                debug_log("No team_id provided, user will be unassigned", DebugLevel.MEDIUM)
            
            # Check if an athlete profile already exists (defensive check)
            try:
                existing_athlete = Athlete.objects.get(user=user)
                debug_log(f"Athlete profile already exists for user {user.id}", DebugLevel.LOW)
                # Continue with authentication since the profile already exists
            except Athlete.DoesNotExist:
                # Create athlete profile if it doesn't exist, with the same team and position
                athlete = Athlete.objects.create(
                    user=user,
                    position=position,
                    team=team
                )
                debug_log(f"Created athlete profile for user: {user} with team={team} and position={position}", DebugLevel.MEDIUM)
            
            # Authenticate user
            authenticated_user = authenticate(
                request, 
                username=username, 
                password=password,
                backend='django.contrib.auth.backends.ModelBackend'
            )
            
            if authenticated_user:
                login(request, authenticated_user)
                created_user = None  # Registration successful, no cleanup needed
                debug_log(f"Successfully authenticated new user: {authenticated_user}", DebugLevel.MEDIUM)
                return JsonResponse({
                    'message': 'Registration successful',
                    'username': username
                })
            else:
                debug_log(f"Authentication failed for new user: {username}", DebugLevel.MEDIUM)
                raise Exception("Authentication failed after user creation")

        except IntegrityError as e:
            debug_log(f"Database integrity error: {str(e)}", DebugLevel.LOW)
            # Attempt to clean up the partially created user
            if created_user:
                try:
                    created_user.delete()
                    debug_log(f"Cleaned up partially created user {username}", DebugLevel.MEDIUM)
                except Exception as cleanup_error:
                    debug_log(f"Failed to clean up user: {cleanup_error}", DebugLevel.LOW)
            
            return JsonResponse({
                'error': 'Registration failed due to database constraint',
                'details': 'A user with this information may already exist'
            }, status=400)
        except Exception as e:
            debug_log(f"Error creating user. Exception: {str(e)}", DebugLevel.LOW)
            # Attempt to clean up the partially created user
            if created_user:
                try:
                    created_user.delete()
                    debug_log(f"Cleaned up partially created user {username}", DebugLevel.MEDIUM)
                except Exception as cleanup_error:
                    debug_log(f"Failed to clean up user: {cleanup_error}", DebugLevel.LOW)
            
            if CURRENT_DEBUG_LEVEL >= DebugLevel.MEDIUM:
                debug_log(f"Exception details: {e.__class__.__name__}", DebugLevel.MEDIUM)
            return JsonResponse({
                'error': 'Error creating user',
                'details': str(e)
            }, status=400)

    except json.JSONDecodeError:
        debug_log("Invalid JSON in request body", DebugLevel.LOW)
        return JsonResponse({
            'error': 'Invalid JSON in request body'
        }, status=400)
    except Exception as e:
        debug_log(f"Unexpected error: {str(e)}", DebugLevel.LOW)
        # Attempt to clean up the partially created user
        if created_user:
            try:
                created_user.delete()
                debug_log(f"Cleaned up partially created user after unexpected error", DebugLevel.MEDIUM)
            except Exception as cleanup_error:
                debug_log(f"Failed to clean up user: {cleanup_error}", DebugLevel.LOW)
        
        if CURRENT_DEBUG_LEVEL >= DebugLevel.MEDIUM:
            debug_log(f"Exception details: {e.__class__.__name__}", DebugLevel.MEDIUM)
        return JsonResponse({
            'error': 'Registration failed',
            'details': str(e)
        }, status=500)

@require_POST
def logout_view(request):
    logout(request)
    return JsonResponse({'message': 'Logged out successfully'})

@login_required
def get_data(request):
    # Replace this with your actual data model and queries
    data = [
        {'id': 1, 'name': 'Item 1', 'description': 'Description 1'},
        {'id': 2, 'name': 'Item 2', 'description': 'Description 2'},
    ]
    return JsonResponse(data, safe=False) 