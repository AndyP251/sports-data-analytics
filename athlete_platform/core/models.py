from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import uuid

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

class Team(models.Model):
    name = models.CharField(max_length=100)
    coach = models.ForeignKey(User, on_delete=models.CASCADE, related_name='coached_teams')
    description = models.TextField(blank=True)
    logo = models.ImageField(upload_to='team_logos/', null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Athlete(models.Model):
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
    date_joined = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - {self.team.name if self.team else 'No Team'}"

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

class BiometricData(models.Model):
    athlete = models.ForeignKey('Athlete', on_delete=models.CASCADE)
    date = models.DateField()
    
    # Sleep metrics
    sleep_hours = models.FloatField(default=0)
    deep_sleep = models.FloatField(default=0)
    light_sleep = models.FloatField(default=0)
    rem_sleep = models.FloatField(default=0)
    awake_time = models.FloatField(default=0)
    sleep_score = models.IntegerField(default=0)
    
    # Heart rate metrics
    resting_heart_rate = models.IntegerField(default=0)
    max_heart_rate = models.IntegerField(default=0)
    avg_heart_rate = models.IntegerField(default=0)
    hrv = models.FloatField(default=0)
    
    # Activity metrics
    steps = models.IntegerField(default=0)
    calories_active = models.IntegerField(default=0)
    calories_total = models.IntegerField(default=0)
    distance_meters = models.FloatField(default=0)
    intensity_minutes = models.IntegerField(default=0)
    
    # Body metrics
    weight = models.FloatField(default=0)
    body_fat_percentage = models.FloatField(default=0)
    bmi = models.FloatField(default=0)
    
    # Stress and recovery
    stress_level = models.IntegerField(default=0)
    recovery_time = models.IntegerField(default=0)

    # Metadata
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ['athlete', 'date']
        indexes = [
            models.Index(fields=['-date']),
            models.Index(fields=['athlete', '-date']),
        ]

    def __str__(self):
        return f"{self.athlete.user.username} - {self.date}"

    def save(self, *args, **kwargs):
        if not self.pk:  # Only set created_at for new instances
            self.created_at = timezone.now()
        self.updated_at = timezone.now()
        super().save(*args, **kwargs)

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
