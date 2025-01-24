from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Team, Athlete, WorkoutData, BiometricData

# Customize the User admin
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'role', 'is_staff')
    list_filter = ('role', 'is_staff', 'is_superuser')
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('role',)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Custom Fields', {'fields': ('role',)}),
    )

# Register all models
admin.site.register(User, CustomUserAdmin)
admin.site.register(Team)

class AthleteAdmin(admin.ModelAdmin):
    list_display = ('user', 'team', 'position')
    list_filter = ('team', 'position')

class WorkoutDataAdmin(admin.ModelAdmin):
    list_display = ('athlete', 'workout_type', 'date', 'intensity')
    list_filter = ('workout_type', 'date')

admin.site.register(Athlete, AthleteAdmin)
admin.site.register(WorkoutData, WorkoutDataAdmin)

admin.site.register(BiometricData)
