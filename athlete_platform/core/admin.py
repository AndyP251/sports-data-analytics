from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Team, Athlete, WorkoutData, CoreBiometricData

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
    list_display = ('athlete', 'date', 'resting_heart_rate', 'sleep_time_seconds')
    list_filter = ('date', 'athlete')
    search_fields = ('athlete__user__username',)
    date_hierarchy = 'date'
    raw_id_fields = ('athlete',)

# Register all models with their custom admin classes
admin.site.register(User, CustomUserAdmin)
admin.site.register(Team, TeamAdmin)
admin.site.register(Athlete, AthleteAdmin)
admin.site.register(WorkoutData, WorkoutDataAdmin)
admin.site.register(CoreBiometricData, CoreBiometricDataAdmin)
