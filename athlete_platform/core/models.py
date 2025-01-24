from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator

class User(AbstractUser):
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

class Team(models.Model):
    name = models.CharField(max_length=100)
    coach = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='coached_teams')
    description = models.TextField(blank=True)
    logo = models.ImageField(upload_to='team_logos/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
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
    team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, related_name='athletes')
    position = models.CharField(max_length=20, choices=POSITION_CHOICES)
    jersey_number = models.IntegerField(null=True, blank=True)
    height = models.DecimalField(max_digits=5, decimal_places=2, help_text='Height in cm', null=True)
    weight = models.DecimalField(max_digits=5, decimal_places=2, help_text='Weight in kg', null=True)
    emergency_contact = models.CharField(max_length=100, blank=True)
    emergency_phone = models.CharField(max_length=15, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
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
    athlete = models.ForeignKey(Athlete, on_delete=models.CASCADE, related_name='biometrics')
    date = models.DateField()
    weight = models.DecimalField(max_digits=5, decimal_places=2, help_text='Weight in kg')
    height = models.DecimalField(max_digits=5, decimal_places=2, help_text='Height in cm')
    body_fat = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, help_text='Body fat percentage')
    resting_heart_rate = models.IntegerField(null=True, blank=True)
    blood_pressure_systolic = models.IntegerField(null=True, blank=True)
    blood_pressure_diastolic = models.IntegerField(null=True, blank=True)
    hrv = models.IntegerField(null=True, blank=True, help_text='Heart Rate Variability')
    sleep_hours = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    stress_level = models.IntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text='Stress level from 1-10'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.athlete.user.username} - Biometrics on {self.date}"

    class Meta:
        verbose_name_plural = "Biometric Data"

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
