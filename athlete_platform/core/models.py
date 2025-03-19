"""
Developed by Andrew William Prince
Last Edit: March 6th, 2025

Core data models for the athlete platform, defining database structure for users,
athletes, teams, workout data, and biometric measurements.
"""
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import uuid
from django.core.exceptions import ValidationError
import logging
from django.db import transaction
from django.contrib.auth.signals import user_logged_in
from django.dispatch import receiver
import random

logger = logging.getLogger(__name__)

class User(AbstractUser):
   

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the user"
    )
    ROLE_CHOICES = [
        ('ATHLETE', 'Athlete'),
        ('COACH', 'Coach'),
        ('ADMIN', 'Admin'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='ATHLETE')
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    date_of_birth = models.DateField(null=True, blank=True)
    profile_image = models.ImageField(upload_to='profile_images/', null=True, blank=True)
    
    # Direct team association and position
    team = models.ForeignKey(
        'Team', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='team_users'
    )
    
    POSITION_CHOICES = [
        ('FORWARD', 'Forward'),
        ('MIDFIELDER', 'Midfielder'),
        ('DEFENDER', 'Defender'),
        ('GOALKEEPER', 'Goalkeeper'),
        ('', 'Not Specified'),
    ]
    position = models.CharField(
        max_length=20, 
        choices=POSITION_CHOICES, 
        blank=True, 
        default='', 
        help_text="Position for athletes"
    )
    
    # Data permissions level
    data_permissions = models.IntegerField(
        default=1,
        help_text="Level of data access permissions (higher = more access)"
    )
    
    # New fields for tracking active sources
    active_data_sources = models.JSONField(
        default=list,
        help_text="List of active data sources for this user"
    )
    last_source_check = models.DateTimeField(
        auto_now=True,
        help_text="Last time the data sources were checked"
    )

    groups = models.ManyToManyField(
        'auth.Group',
        related_name='core_user_groups',
        blank=True,
        help_text='The groups this user belongs to.',
        verbose_name='groups',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='core_user_permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        verbose_name='user permissions',
    )

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
    
        
    # S3 Paths for user data storage 

    def get_s3_base_path(self):
        """Returns the base S3 path for this user's data"""
        return f'accounts/{self.id}'

    def get_biometric_data_path(self):
        """Returns the S3 path for user's biometric data"""
        return f'{self.get_s3_base_path()}/biometric-data'

    def get_metadata_path(self):
        """Returns the S3 path for user's metadata"""
        return f'{self.get_s3_base_path()}/metadata'

    def get_performance_data_path(self):
        """Returns the S3 path for user's performance data"""
        return f'{self.get_s3_base_path()}/performance-data'

    # Add this to handle admin log entries
    class Meta:
        db_table = 'core_user'

    def update_active_sources(self):
        """Update the list of active data sources for this user"""
        active_sources = []
        
        # Check if user has an athlete profile
        if hasattr(self, 'athlete'):
            # Check for Garmin credentials
            if hasattr(self.athlete, 'garmin_credentials'):
                active_sources.append('garmin')
                logger.info(f"Garmin credentials found for user {self.id}")
            
            # Check for Whoop credentials
            if hasattr(self.athlete, 'whoop_credentials'):
                active_sources.append('whoop')
                logger.info(f"Whoop credentials found for user {self.id}")
        self.active_data_sources = active_sources
        self.save(update_fields=['active_data_sources', 'last_source_check'])

@receiver(user_logged_in)
def update_sources_on_login(sender, user, request, **kwargs):
    """Update active sources when user logs in"""
    logger.info(f"Updating active sources for user {user.id} on login")
    try:
        user.update_active_sources()
    except Exception as e:
        logger.error(f"Error updating active sources on login: {e}")

class Team(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    name = models.CharField(max_length=100)
    coach = models.ForeignKey(User, on_delete=models.CASCADE, related_name='coached_teams')
    description = models.TextField(blank=True)
    logo = models.ImageField(upload_to='team_logos/', null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    athletes_array = models.JSONField(
        default=list,
        help_text="Array of athlete IDs associated with this team, used for data syncing"
    )

    def __str__(self):
        return self.name
        
    def update_athletes_array(self):
        """Update the athletes_array field based on actual athlete associations"""
        try:
            # Get all athletes with this team
            team_athletes = Athlete.objects.filter(team=self)
            
            # Create array of athlete IDs
            athlete_ids = [str(athlete.id) for athlete in team_athletes]
            
            # Update the field
            self.athletes_array = athlete_ids
            self.save(update_fields=['athletes_array', 'updated_at'])
            
            logger.info(f"Updated team {self.name} athletes_array with {len(athlete_ids)} athletes")
            return True
        except Exception as e:
            logger.error(f"Error updating athletes_array for team {self.name}: {e}")
            return False
            
    def add_athlete_to_array(self, athlete_id):
        """Add an athlete ID to the athletes_array if not already present"""
        if not self.athletes_array:
            self.athletes_array = []
            
        athlete_id_str = str(athlete_id)
        if athlete_id_str not in self.athletes_array:
            self.athletes_array.append(athlete_id_str)
            self.save(update_fields=['athletes_array', 'updated_at'])
            logger.info(f"Added athlete {athlete_id} to team {self.name} athletes_array")
        
    def remove_athlete_from_array(self, athlete_id):
        """Remove an athlete ID from the athletes_array"""
        if not self.athletes_array:
            return
            
        athlete_id_str = str(athlete_id)
        if athlete_id_str in self.athletes_array:
            self.athletes_array.remove(athlete_id_str)
            self.save(update_fields=['athletes_array', 'updated_at'])
            logger.info(f"Removed athlete {athlete_id} from team {self.name} athletes_array")

class CoachCode(models.Model):
    """
    Model for coach invitation codes. Each code is 6 unique hex characters and serves as a primary key.
    Codes are used during coach registration to validate access.
    """
    code = models.CharField(
        primary_key=True,
        max_length=6,
        help_text="Unique 6-character hexadecimal code for coach registration"
    )
    team = models.ForeignKey(
        Team, 
        on_delete=models.CASCADE, 
        related_name='coach_codes',
        help_text="Team this coach code is associated with"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_coach_codes',
        help_text="User who created this coach code"
    )
    is_used = models.BooleanField(default=False, help_text="Whether this code has been used")
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField(help_text="When this code expires")

    def __str__(self):
        return f"Coach Code {self.code} for {self.team.name}"

    def save(self, *args, **kwargs):
        # Generate a random 6-character hex code if not provided
        if not self.code:
            self.code = ''.join(random.choice('0123456789ABCDEF') for _ in range(6))
        
        # Set expiration date to 7 days from creation if not provided
        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(days=7)
            
        super().save(*args, **kwargs)

    class Meta:
        db_table = 'core_coach_code'

class Coach(models.Model):
    """
    Model for coaches containing additional coach-specific information
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the coach"
    )
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE,
        related_name='coach_profile',
        help_text="User account associated with this coach"
    )
    team = models.ForeignKey(
        Team,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='team_coaches',
        help_text="Primary team this coach is associated with"
    )
    athletes = models.ManyToManyField(
        'Athlete',
        related_name='coaches',
        blank=True,
        help_text="Athletes coached by this coach"
    )
    
    # Coach permissions
    can_view_athlete_data = models.BooleanField(
        default=True,
        help_text="Whether this coach can view athlete data"
    )
    can_edit_athlete_profiles = models.BooleanField(
        default=False,
        help_text="Whether this coach can edit athlete profiles"
    )
    can_create_training_plans = models.BooleanField(
        default=True,
        help_text="Whether this coach can create training plans"
    )
    can_invite_athletes = models.BooleanField(
        default=False,
        help_text="Whether this coach can invite athletes to the platform"
    )
    can_invite_coaches = models.BooleanField(
        default=False,
        help_text="Whether this coach can invite other coaches"
    )
    
    # Coach metadata
    specialization = models.CharField(
        max_length=100,
        blank=True,
        help_text="Coach's area of specialization (e.g., 'Strength and Conditioning')"
    )
    bio = models.TextField(
        blank=True,
        help_text="Coach's biographical information"
    )
    coaching_experience_years = models.IntegerField(
        default=0,
        help_text="Years of coaching experience"
    )
    certifications = models.JSONField(
        default=list,
        help_text="List of coaching certifications"
    )
    registration_code_used = models.ForeignKey(
        CoachCode,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registered_coach',
        help_text="Coach code used during registration"
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Coach {self.user.username} - {self.team.name if self.team else 'No Team'}"

    class Meta:
        db_table = 'core_coach'
        verbose_name_plural = 'Coaches'

class Athlete(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    POSITION_CHOICES = [
        ('FORWARD', 'Forward'),
        ('MIDFIELDER', 'Midfielder'),
        ('DEFENDER', 'Defender'),
        ('GOALKEEPER', 'Goalkeeper'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True, related_name='athletes')
    position = models.CharField(max_length=20, choices=POSITION_CHOICES)
    jersey_number = models.IntegerField(null=True, blank=True)
    height = models.DecimalField(max_digits=5, decimal_places=2, help_text='Height in cm', null=True)
    weight = models.DecimalField(max_digits=5, decimal_places=2, help_text='Weight in kg', null=True)
    emergency_contact = models.CharField(max_length=100, blank=True)
    emergency_phone = models.CharField(max_length=15, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Track the previous team to detect changes
    _original_team_id = None

    def __str__(self):
        return f"{self.user.username} - {self.team.name if self.team else 'No Team'}"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Store the original team ID when instance is initialized
        self._original_team_id = self.team_id if self.team_id else None

    def save(self, *args, **kwargs):
        if not self.id and self.user:
            self.id = self.user.id
            
        # Check if team has changed
        team_changed = self.team_id != self._original_team_id
        
        # Save the athlete first
        super().save(*args, **kwargs)
        
        # Update team's athletes_array if team is set
        if self.team and (team_changed or not self._original_team_id):
            try:
                # Add this athlete to the new team's array
                self.team.add_athlete_to_array(self.id)
            except Exception as e:
                logger.error(f"Error updating team athletes_array for athlete {self.id}: {e}")
        
        # If team was changed from a previous team, remove from previous team's array
        if team_changed and self._original_team_id:
            try:
                old_team = Team.objects.get(id=self._original_team_id)
                old_team.remove_athlete_from_array(self.id)
            except Team.DoesNotExist:
                pass
            except Exception as e:
                logger.error(f"Error removing athlete {self.id} from previous team: {e}")
        
        # Update the original team ID
        self._original_team_id = self.team_id

class WorkoutData(models.Model):
    WORKOUT_TYPES = [
        ('STRENGTH', 'Strength Training'),
        ('CARDIO', 'Cardio'),
        ('RECOVERY', 'Recovery'),
        ('SKILLS', 'Skills Training'),
        ('MATCH', 'Match'),
        ('TEAM_PRACTICE', 'Team Practice'),
    ]

    INTENSITY_LEVELS = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
    ]

    athlete = models.ForeignKey(Athlete, on_delete=models.CASCADE, related_name='workouts')
    workout_type = models.CharField(max_length=20, choices=WORKOUT_TYPES)
    date = models.DateField()
    duration = models.DurationField()
    intensity = models.CharField(max_length=10, choices=INTENSITY_LEVELS)
    distance = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, help_text='Distance in kilometers')
    calories_burned = models.IntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.athlete.user.username} - {self.workout_type} on {self.date}"

class InjuryRecord(models.Model):
    SEVERITY_CHOICES = [
        ('MINOR', 'Minor'),
        ('MODERATE', 'Moderate'),
        ('SEVERE', 'Severe'),
    ]

    athlete = models.ForeignKey(Athlete, on_delete=models.CASCADE, related_name='injuries')
    injury_date = models.DateField()
    return_date = models.DateField(null=True, blank=True)
    injury_type = models.CharField(max_length=100)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES)
    description = models.TextField()
    treatment_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.athlete.user.username} - {self.injury_type} on {self.injury_date}"

class CoreBiometricData(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    athlete = models.ForeignKey(
        'Athlete',
        on_delete=models.CASCADE,
        related_name='biometric_data'
    )
    date = models.DateField()

    # Sleep Data
    total_sleep_seconds = models.IntegerField(default=0)
    deep_sleep_seconds = models.IntegerField(default=0)
    light_sleep_seconds = models.IntegerField(default=0)
    rem_sleep_seconds = models.IntegerField(default=0)
    awake_seconds = models.IntegerField(default=0)
    sleep_needed_seconds = models.IntegerField(default=0)
    sleep_debt_seconds = models.IntegerField(default=0)
    average_respiration = models.FloatField(default=0)
    lowest_respiration = models.FloatField(default=0)
    highest_respiration = models.FloatField(default=0)
    body_battery_change = models.IntegerField(default=0)
    sleep_resting_heart_rate = models.IntegerField(default=0)
  
    # Heart Rate Data
    resting_heart_rate = models.IntegerField(default=0)
    max_heart_rate = models.IntegerField(default=0)
    min_heart_rate = models.IntegerField(default=0)
    last_seven_days_avg_resting_heart_rate = models.IntegerField(default=0)
    
    # User Summary Data
    total_calories = models.IntegerField(default=0)
    active_calories = models.IntegerField(default=0)
    calories_burned = models.FloatField(default=0)
    bmr_calories = models.IntegerField(default=0)
    net_calorie_goal = models.IntegerField(default=0)
    total_distance_meters = models.FloatField(default=0)
    total_steps = models.IntegerField(default=0)
    daily_step_goal = models.IntegerField(default=0)
    highly_active_seconds = models.IntegerField(default=0)
    sedentary_seconds = models.IntegerField(default=0)
    
    # Stress Data
    average_stress_level = models.IntegerField(default=0)
    max_stress_level = models.IntegerField(default=0)
    stress_duration_seconds = models.IntegerField(default=0)
    rest_stress_duration = models.IntegerField(default=0)
    activity_stress_duration = models.IntegerField(default=0)
    low_stress_percentage = models.FloatField(default=0)
    medium_stress_percentage = models.FloatField(default=0)
    high_stress_percentage = models.FloatField(default=0)
    
    # Whoop-specific metrics
    recovery_score = models.FloatField(default=0)
    hrv_ms = models.FloatField(default=0)
    strain = models.FloatField(default=0)
    kilojoules = models.FloatField(default=0)
    average_heart_rate = models.FloatField(default=0)
    spo2_percentage = models.FloatField(default=0)
    skin_temp_celsius = models.FloatField(default=0)
    respiratory_rate = models.FloatField(default=0)

    sleep_efficiency = models.FloatField(default=0)
    sleep_consistency = models.FloatField(default=0)
    sleep_performance = models.FloatField(default=0)
    sleep_disturbances = models.IntegerField(default=0)
    sleep_cycle_count = models.IntegerField(default=0)
    no_data_seconds = models.IntegerField(default=0)
    total_in_bed_seconds = models.IntegerField(default=0)
    baseline_sleep_seconds = models.IntegerField(default=0)
    need_from_sleep_debt_seconds = models.IntegerField(default=0)
    need_from_recent_strain_seconds = models.IntegerField(default=0)
    need_from_recent_nap_seconds = models.IntegerField(default=0)

    user_id = models.IntegerField(default=0)
    email = models.EmailField(default='')
    first_name = models.CharField(max_length=127, default='')
    last_name = models.CharField(max_length=127, default='')
    gender = models.CharField(max_length=127, default='')
    birthdate = models.DateField(null=True, blank=True)
    height_cm = models.IntegerField(default=0)
    weight_kg = models.IntegerField(default=0)
    body_fat_percentage = models.FloatField(default=0)

    source = models.CharField(max_length=20, default='garmin')
    created_at = models.DateTimeField(auto_now=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'core_biometric_data'
        unique_together = ['athlete', 'date', 'source']
        indexes = [
            models.Index(fields=['-date']),
            models.Index(fields=['athlete', '-date']),
            models.Index(fields=['athlete', 'source']),
        ]

    def __str__(self):
        return f"{self.athlete.user.username} - {self.date}"


def create_biometric_data(athlete, date, data):
    """
    Create or update biometric data for an athlete on a given date.
    We do NOT manually set 'id'—let the DB autogenerate the UUID.
    """
    from django.db import transaction

    try:
        with transaction.atomic():
            biometric_data, created = CoreBiometricData.objects.update_or_create(
                athlete=athlete,
                date=date,
                defaults=data
            )
            return biometric_data
    except Exception as e:
        logger.error(f"Error in create_biometric_data: {e}")
        return None

def get_athlete_biometrics(athlete, date):
    """Retrieves biometric data for an athlete on a specific date"""
    try:
        return CoreBiometricData.objects.get(
            athlete=athlete,
            date=date
        )
    except CoreBiometricData.DoesNotExist:
        return None

def get_athlete_biometrics_range(athlete, start_date, end_date=None):
    """Retrieves biometric data for an athlete over a date range"""
    if end_date is None:
        end_date = timezone.now().date()
    
    return CoreBiometricData.objects.filter(
        athlete=athlete,
        date__range=[start_date, end_date]
    ).order_by('-date')

class GarminCredentials(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the Garmin credentials"
    )
    athlete = models.OneToOneField(
        Athlete, 
        on_delete=models.CASCADE, 
        related_name='garmin_credentials'
    )
    profile_type = models.CharField(
        max_length=20,
        default='default'
    )
    access_token = models.CharField(max_length=255)
    refresh_token = models.CharField(max_length=255)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'core_garmin_credentials'

    def get_profile_config(self):
        from django.conf import settings
        return settings.GARMIN_PROFILES.get(self.profile_type, settings.GARMIN_PROFILES['default'])

    def __str__(self):
        return f"Garmin credentials for {self.athlete.user.username} ({self.profile_type})"


class WhoopCredentials(models.Model):
    """Model for storing Whoop credentials"""
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique identifier for the Whoop credentials"
    )
    athlete = models.OneToOneField(
        Athlete, 
        on_delete=models.CASCADE, 
        related_name='whoop_credentials'
    )
    access_token = models.CharField(max_length=255)
    refresh_token = models.CharField(max_length=255)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now=True)
    updated_at = models.DateTimeField(auto_now=True)
    scope = models.CharField(max_length=255, default='offline read:recovery read:cycles read:sleep read:workout read:profile')

    class Meta:
        db_table = 'core_whoop_credentials'

    def __str__(self):
        return f"Whoop credentials for {self.athlete.user.username}"

    def is_expired(self):
        """Check if the token is expired"""
        return timezone.now() >= self.expires_at

class CoreBiometricTimeSeries(models.Model):
    """Stores detailed time-series biometric data"""
    id = models.UUIDField(primary_key=True)  # This will match CoreBiometricData's id
    sleep_heart_rate = models.JSONField(default=list)
    sleep_stress = models.JSONField(default=list)
    sleep_body_battery = models.JSONField(default=list)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'core_biometric_time_series'
        indexes = [
            models.Index(fields=['id']),
        ]

    def __str__(self):
        return f"Details for biometric data {self.id}"
