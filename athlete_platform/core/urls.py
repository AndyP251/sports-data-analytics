from django.urls import path
from .api_views.auth import (
    check_auth, login_view, register_view, 
    logout_view, get_data
)
from .views import dashboard_data, sync_biometric_data, get_biometric_data, get_current_user, activate_source, get_garmin_profiles, get_raw_biometric_data, active_sources, verify_dev_password
from .api_views.oauth import (
    WhoopOAuthView, WhoopCallbackView, WhoopWebhookView
)
from . import views

urlpatterns = [
    # Auth endpoints
    path('api/login/', login_view, name='login'),
    path('api/register/', register_view, name='register'),
    path('api/logout/', logout_view, name='logout'),
    path('api/check-auth/', check_auth, name='check_auth'),
    path('api/data/', get_data, name='get_data'),
    path('api/dashboard/', dashboard_data, name='dashboard_data'),
    path('api/dashboard/data/', views.dashboard_data, name='dashboard_data'),
    path('api/biometrics/sync/', sync_biometric_data, name='sync_biometric_data'),
    path('api/biometrics/', get_biometric_data, name='get_biometric_data'),
    path('api/current_user/', get_current_user, name='get_current_user'),
    path('api/biometrics/activate-source/', activate_source, name='activate_source'),
    path('api/reset-processing/', views.reset_data_processing, name='reset-processing'),
    path('api/biometrics/garmin-profiles/', get_garmin_profiles, name='garmin_profiles'),
    path('api/biometrics/raw/', get_raw_biometric_data, name='raw-biometric-data'),
    path('api/biometrics/active-sources/', active_sources, name='active_sources'),
    path('api/verify-dev-password/', verify_dev_password, name='verify-dev-password'),
    

    
    # OAuth endpoints
    path('api/oauth/whoop/authorize', WhoopOAuthView.as_view(), name='whoop-oauth'),
    path('api/oauth/whoop/callback', WhoopCallbackView.as_view(), name='whoop-callback'),
    path('api/webhooks/whoop', WhoopWebhookView.as_view(), name='whoop-webhook'),
] 