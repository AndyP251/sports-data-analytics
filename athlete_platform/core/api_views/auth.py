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
from ..models import User  # Import your custom User model from core
import json
import logging
from enum import IntEnum

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

        logger.info(f"Login attempt for username: {username}")

        if not username or not password:
            error_msg = "Please provide both username and password"
            logger.warning(error_msg)
            return JsonResponse({'error': error_msg}, status=400)

        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            logger.info(f"Successful login for user: {username}")
            return JsonResponse({'message': 'Login successful'})
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

    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        email = data.get('email')

        debug_log(f"Registration attempt for username: {username}, email: {email}", DebugLevel.LOW)

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

        # Create user
        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password
            )
            debug_log(f"Created user object: {user}", DebugLevel.MEDIUM)

            # Authenticate user
            authenticated_user = authenticate(
                request, 
                username=username, 
                password=password,
                backend='django.contrib.auth.backends.ModelBackend'
            )
            
            if authenticated_user:
                login(request, authenticated_user)
                debug_log(f"Successfully authenticated new user: {authenticated_user}", DebugLevel.MEDIUM)
                return JsonResponse({
                    'message': 'Registration successful',
                    'username': username
                })
            else:
                debug_log(f"Authentication failed for new user: {username}", DebugLevel.MEDIUM)
                return JsonResponse({
                    'error': 'Authentication failed after registration'
                }, status=400)

        except Exception as e:
            debug_log(f"Error creating user. Exception: {str(e)}", DebugLevel.LOW)
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