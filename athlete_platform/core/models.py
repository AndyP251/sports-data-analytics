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

    def __str__(self):
        return self.name

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

    def __str__(self):
        return f"{self.user.username} - {self.team.name if self.team else 'No Team'}"

    def save(self, *args, **kwargs):
        if not self.id and self.user:
            self.id = self.user.id
        super().save(*args, **kwargs)

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
    birthdate = models.DateField(default=str(timezone.now))
    height_cm = models.IntegerField(default=0)
    weight_kg = models.IntegerField(default=0)
    body_fat_percentage = models.FloatField(default=0)

    source = models.CharField(max_length=20, default='garmin')
    created_at = models.DateTimeField(default=str(timezone.now()))
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'core_biometric_data'
        unique_together = ['athlete', 'date']
        indexes = [
            models.Index(fields=['-date']),
            models.Index(fields=['athlete', '-date']),
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
    created_at = models.DateTimeField(default=timezone.now)
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
    created_at = models.DateTimeField(default=timezone.now)
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
