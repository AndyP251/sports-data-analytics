"""
Coach authentication API endpoints handling coach login, registration, and validation
of coach invitation codes.
"""
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.contrib.auth import authenticate, login
from django.views.decorators.http import require_http_methods
from ..models import User, Coach, CoachCode, Team, Athlete
import json
import logging
from datetime import datetime
from django.utils import timezone
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
        logger.info(f"COACH DEBUG [{level.name}]: {message}")
        print(f"COACH DEBUG [{level.name}]: {message}")  # Print to console for immediate feedback

@ensure_csrf_cookie
@require_http_methods(["POST", "OPTIONS"])
def coach_login_view(request):
    if request.method == "OPTIONS":
        response = JsonResponse({})
        response["Access-Control-Allow-Headers"] = "Content-Type, X-Csrftoken"
        return response

    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')

        logger.info(f"Coach login attempt for username: {username}")

        if not username or not password:
            error_msg = "Please provide both username and password"
            logger.warning(error_msg)
            return JsonResponse({'error': error_msg}, status=400)

        user = authenticate(request, username=username, password=password)
        if user is not None:
            # Check if the user is a coach
            try:
                coach = user.coach_profile
                if coach:
                    login(request, user)
                    logger.info(f"Successful coach login for user: {username}")
                    return JsonResponse({'message': 'Login successful'})
                else:
                    logger.warning(f"User {username} attempted to log in as coach but is not a coach")
                    return JsonResponse({'error': 'This account is not a coach account'}, status=403)
            except Coach.DoesNotExist:
                logger.warning(f"User {username} attempted to log in as coach but is not a coach")
                return JsonResponse({'error': 'This account is not a coach account'}, status=403)
        else:
            logger.warning(f"Failed coach login attempt for username: {username}")
            return JsonResponse({'error': 'Invalid credentials'}, status=400)

    except json.JSONDecodeError:
        logger.error("Invalid JSON in request body")
        return JsonResponse({'error': 'Invalid JSON in request body'}, status=400)
    except Exception as e:
        logger.error(f"Unexpected error in coach login: {str(e)}")
        return JsonResponse({'error': 'Login failed', 'details': str(e)}, status=500)

@ensure_csrf_cookie
@require_http_methods(["POST", "OPTIONS"])
def coach_register_view(request):
    if request.method == "OPTIONS":
        response = JsonResponse({})
        response["Access-Control-Allow-Headers"] = "Content-Type, X-Csrftoken"
        return response

    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        email = data.get('email')
        coach_code = data.get('coach_code')
        specialization = data.get('specialization', '')
        experience = data.get('experience', 0)

        debug_log(f"Coach registration attempt for username: {username}, email: {email}, code: {coach_code}", DebugLevel.LOW)

        # Validation checks
        if not username or not password or not email or not coach_code:
            missing_fields = []
            if not username: missing_fields.append('username')
            if not password: missing_fields.append('password')
            if not email: missing_fields.append('email')
            if not coach_code: missing_fields.append('coach_code')
            error_msg = f"Missing required fields: {', '.join(missing_fields)}"
            debug_log(error_msg, DebugLevel.MEDIUM)
            return JsonResponse({'error': error_msg}, status=400)

        # Validate coach code
        try:
            coach_code_obj = CoachCode.objects.get(code=coach_code)
            
            # Check if code is already used
            if coach_code_obj.is_used:
                debug_log(f"Coach code already used: {coach_code}", DebugLevel.MEDIUM)
                return JsonResponse({'error': 'invalid_coach_code', 'message': 'This coach code has already been used'}, status=400)
            
            # Check if code is expired
            if coach_code_obj.expires_at < timezone.now():
                debug_log(f"Coach code expired: {coach_code}", DebugLevel.MEDIUM)
                return JsonResponse({'error': 'invalid_coach_code', 'message': 'This coach code has expired'}, status=400)
                
        except CoachCode.DoesNotExist:
            debug_log(f"Invalid coach code: {coach_code}", DebugLevel.MEDIUM)
            return JsonResponse({'error': 'invalid_coach_code', 'message': 'Invalid coach code'}, status=400)

        # Check for existing username
        if User.objects.filter(username=username).exists():
            debug_log(f"Username already exists: {username}", DebugLevel.MEDIUM)
            return JsonResponse({
                'error': 'Username already exists',
                'field': 'username'
            }, status=400)

        # Check for existing email
        if User.objects.filter(email=email).exists():
            debug_log(f"Email already exists: {email}", DebugLevel.MEDIUM)
            return JsonResponse({
                'error': 'Email already exists',
                'field': 'email'
            }, status=400)

        # Create user and coach profile
        try:
            # Create the user with coach role
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                role='COACH'
            )
            debug_log(f"Created coach user object: {user}", DebugLevel.MEDIUM)

            # Also set the team directly on the user model
            user.team = coach_code_obj.team
            user.save(update_fields=['team'])
            debug_log(f"Set team {coach_code_obj.team.name} on user {user.username}", DebugLevel.MEDIUM)

            # Create coach profile
            coach = Coach.objects.create(
                user=user,
                team=coach_code_obj.team,
                specialization=specialization,
                coaching_experience_years=experience,
                registration_code_used=coach_code_obj
            )
            debug_log(f"Created coach profile: {coach}", DebugLevel.MEDIUM)

            # Link the coach with all athletes in the team
            team_athletes = Athlete.objects.filter(team=coach_code_obj.team)
            if team_athletes.exists():
                coach.athletes.add(*team_athletes)
                debug_log(f"Added {team_athletes.count()} athletes to coach {user.username}", DebugLevel.MEDIUM)
            
            # Mark the coach code as used
            coach_code_obj.is_used = True
            coach_code_obj.save()
            debug_log(f"Marked coach code as used: {coach_code}", DebugLevel.MEDIUM)

            # Authenticate user
            authenticated_user = authenticate(
                request, 
                username=username, 
                password=password
            )
            
            if authenticated_user:
                login(request, authenticated_user)
                debug_log(f"Successfully authenticated new coach: {authenticated_user}", DebugLevel.MEDIUM)
                return JsonResponse({
                    'message': 'Coach registration successful',
                    'username': username
                })
            else:
                debug_log(f"Authentication failed for new coach: {username}", DebugLevel.MEDIUM)
                return JsonResponse({
                    'error': 'Authentication failed after registration'
                }, status=400)

        except Exception as e:
            debug_log(f"Error creating coach. Exception: {str(e)}", DebugLevel.LOW)
            return JsonResponse({
                'error': 'Error creating coach account',
                'details': str(e)
            }, status=400)

    except json.JSONDecodeError:
        debug_log("Invalid JSON in request body", DebugLevel.LOW)
        return JsonResponse({
            'error': 'Invalid JSON in request body'
        }, status=400)
    except Exception as e:
        debug_log(f"Unexpected error: {str(e)}", DebugLevel.LOW)
        return JsonResponse({
            'error': 'Coach registration failed',
            'details': str(e)
        }, status=500)

@ensure_csrf_cookie
def check_coach_auth(request):
    """Check if the current user is authenticated as a coach"""
    if request.user.is_authenticated:
        try:
            coach = request.user.coach_profile
            if coach:
                # Get all team members directly from the User model
                team_athletes = []
                if coach.team:
                    # Get all users who have the team field set and are athletes
                    team_users = User.objects.filter(
                        team=coach.team,
                        role='ATHLETE'
                    )
                    
                    debug_log(f"Found {team_users.count()} team members with direct team association", DebugLevel.MEDIUM)
                    
                    # Format basic data about each team athlete
                    for user in team_users:
                        team_athletes.append({
                            'id': str(user.id),
                            'username': user.username,
                            'email': user.email,
                            'position': user.position or 'Unknown',
                            'data_permissions': user.data_permissions
                        })
                
                return JsonResponse({
                    'username': request.user.username,
                    'email': request.user.email,
                    'specialization': coach.specialization,
                    'team': coach.team.name if coach.team else None,
                    'team_id': str(coach.team.id) if coach.team else None,
                    'team_athletes': team_athletes,
                    'athlete_count': len(team_athletes)
                })
        except Coach.DoesNotExist:
            pass
    return JsonResponse({'error': 'Not authenticated as coach'}, status=401) 