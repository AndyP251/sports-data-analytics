from django.urls import path
from .api_views.auth import (
    check_auth, login_view, register_view, 
    logout_view, get_data
)
from .views import dashboard_data,update_garmin_data, sync_biometric_data, get_biometric_data
from .api_views.oauth import (
    WhoopOAuthView, WhoopCallbackView, WhoopWebhookView
)

urlpatterns = [
    # Auth endpoints
    path('api/login/', login_view, name='login'),
    path('api/register/', register_view, name='register'),
    path('api/logout/', logout_view, name='logout'),
    path('api/check-auth/', check_auth, name='check_auth'),
    path('api/data/', get_data, name='get_data'),
    path('api/dashboard/', dashboard_data, name='dashboard_data'),
    path('api/update-garmin-data/', update_garmin_data, name='update_garmin_data'),
    path('api/biometrics/sync/', sync_biometric_data, name='sync_biometric_data'),
    path('api/biometrics/', get_biometric_data, name='get_biometric_data'),
    

    
    # OAuth endpoints
    path('oauth/whoop/authorize', WhoopOAuthView.as_view(), name='whoop-oauth'),
    path('oauth/whoop/callback', WhoopCallbackView.as_view(), name='whoop-callback'),
    path('webhooks/whoop', WhoopWebhookView.as_view(), name='whoop-webhook'),
] 