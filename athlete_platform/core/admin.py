from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Team, Athlete, WorkoutData, CoreBiometricData, CoachCode, Coach, CoreBiometricTimeSeries
from django.utils import timezone
import uuid
import random
import string

# Customize the User admin
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'is_staff')
    list_filter = ('role', 'is_staff', 'is_superuser')
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('role', 'phone_number', 'date_of_birth', 'profile_image')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Custom Fields', {'fields': ('role', 'email')}),
    )

class TeamAdmin(admin.ModelAdmin):
    list_display = ('name', 'coach', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('name', 'coach__username')

class AthleteAdmin(admin.ModelAdmin):
    list_display = ('user', 'team', 'position', 'jersey_number')
    list_filter = ('team', 'position')
    search_fields = ('user__username', 'team__name')
    raw_id_fields = ('user', 'team')

class WorkoutDataAdmin(admin.ModelAdmin):
    list_display = ('athlete', 'workout_type', 'date', 'intensity', 'duration')
    list_filter = ('workout_type', 'intensity', 'date')
    search_fields = ('athlete__user__username', 'notes')
    date_hierarchy = 'date'

class CoreBiometricDataAdmin(admin.ModelAdmin):
    list_display = ('athlete', 'date', 'resting_heart_rate', 'total_sleep_seconds', 'deep_sleep_seconds', 'light_sleep_seconds', 'rem_sleep_seconds', 'awake_seconds', 'average_respiration', 'lowest_respiration', 'highest_respiration', 'body_battery_change', 'sleep_resting_heart_rate', 'total_calories', 'active_calories', 'total_steps', 'total_distance_meters', 'average_stress_level', 'max_stress_level', 'stress_duration_seconds')
    list_filter = ('date', 'athlete')
    search_fields = ('athlete__user__username',)
    date_hierarchy = 'date'
    raw_id_fields = ('athlete', )

class CoreBiometricTimeSeriesAdmin(admin.ModelAdmin):
    list_display = ('id', 'created_at', 'updated_at')
    list_filter = ('created_at', 'updated_at')
    search_fields = ('id',)
    date_hierarchy = 'created_at'

class CoachCodeAdmin(admin.ModelAdmin):
    list_display = ('code', 'team', 'created_by', 'is_used', 'created_at', 'expires_at')
    list_filter = ('is_used', 'created_at', 'expires_at', 'team')
    search_fields = ('code', 'team__name', 'created_by__username')
    date_hierarchy = 'created_at'
    readonly_fields = ('created_at',)
    
    actions = ['generate_new_codes']
    
    def generate_new_codes(self, request, queryset):
        """Admin action to generate new coach codes for selected teams"""
        teams = set(queryset.values_list('team', flat=True))
        codes_created = 0
        
        for team_id in teams:
            team = Team.objects.get(pk=team_id)
            # Generate a unique 6-character hex code
            code = ''.join(random.choice('0123456789ABCDEF') for _ in range(6))
            
            # Set expiration date to 7 days from now
            expires_at = timezone.now() + timezone.timedelta(days=7)
            
            CoachCode.objects.create(
                code=code,
                team=team,
                created_by=request.user,
                expires_at=expires_at
            )
            codes_created += 1
        
        self.message_user(request, f"Successfully created {codes_created} new coach codes.")
    
    generate_new_codes.short_description = "Generate new coach codes for selected teams"

class CoachAdmin(admin.ModelAdmin):
    list_display = ('user', 'team', 'specialization', 'coaching_experience_years', 'can_invite_athletes', 'can_invite_coaches')
    list_filter = ('team', 'coaching_experience_years', 'can_view_athlete_data', 'can_edit_athlete_profiles', 'can_create_training_plans', 'can_invite_athletes', 'can_invite_coaches')
    search_fields = ('user__username', 'user__email', 'team__name', 'specialization')
    raw_id_fields = ('user', 'team', 'registration_code_used')
    filter_horizontal = ('athletes',)
    
    fieldsets = (
        ('Coach Profile', {
            'fields': ('user', 'team', 'athletes', 'specialization', 'bio', 'coaching_experience_years', 'certifications')
        }),
        ('Permissions', {
            'fields': ('can_view_athlete_data', 'can_edit_athlete_profiles', 'can_create_training_plans', 'can_invite_athletes', 'can_invite_coaches')
        }),
        ('Registration', {
            'fields': ('registration_code_used',)
        }),
    )

# Register all models with their custom admin classes
admin.site.register(User, CustomUserAdmin)
admin.site.register(Team, TeamAdmin)
admin.site.register(Athlete, AthleteAdmin)
admin.site.register(WorkoutData, WorkoutDataAdmin)
admin.site.register(CoreBiometricData, CoreBiometricDataAdmin)
admin.site.register(CoreBiometricTimeSeries, CoreBiometricTimeSeriesAdmin)
admin.site.register(CoachCode, CoachCodeAdmin)
admin.site.register(Coach, CoachAdmin)
