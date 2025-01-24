from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import login, logout
from django.contrib import messages
from .forms import CustomUserCreationForm
from .utils.s3_utils import S3Utils
from .models import Athlete, BiometricData
from django.http import JsonResponse
from .utils.garmin_utils import GarminDataCollector
from django.views.decorators.http import require_POST
from datetime import datetime
from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate
from django.utils import timezone
import logging
import boto3
from botocore.exceptions import ClientError
import json

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
def dashboard(request):
    context = {}
    try:
        # Try to get the athlete data
        athlete = Athlete.objects.get(user=request.user)
        latest_biometric = BiometricData.objects.filter(athlete=athlete).first()
        
        if latest_biometric:
            context['biometric_data'] = latest_biometric
        else:
            messages.info(request, "No biometric data found. Please update your data.")
            
        # Try to get historical data from S3
        try:
            historical_data = get_s3_data(athlete)
            context['historical_data'] = historical_data
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                messages.info(request, "No historical data found. Starting fresh tracking.")
                logger.info(f"No historical data found for athlete {athlete.id}")
            else:
                messages.error(request, "Error retrieving historical data. Please try again later.")
                logger.error(f"S3 error for athlete {athlete.id}: {str(e)}")
        
    except Athlete.DoesNotExist:
        messages.error(request, "Athlete profile not found. Please contact support.")
        logger.error(f"No athlete profile found for user {request.user.id}")
    except Exception as e:
        messages.error(request, "An unexpected error occurred. Please try again later.")
        logger.error(f"Dashboard error for user {request.user.id}: {str(e)}")
    
    return render(request, 'core/dashboard.html', context)

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
