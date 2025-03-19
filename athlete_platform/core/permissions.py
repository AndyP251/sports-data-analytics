from rest_framework import permissions
from .models import Coach

class IsCoach(permissions.BasePermission):
    """
    Permission to only allow coaches access.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Check if user is a coach
        try:
            coach = Coach.objects.get(user=request.user)
            return True
        except Coach.DoesNotExist:
            return False 