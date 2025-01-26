from django.urls import path
from . import api_views
from . import views

urlpatterns = [
    path('api/login/', api_views.login_view, name='login'),
    path('api/register/', api_views.register_view, name='register'),
    path('api/logout/', api_views.logout_view, name='logout'),
    path('api/check-auth/', api_views.check_auth, name='check_auth'),
    path('api/data/', api_views.get_data, name='get_data'),
    path('api/dashboard/', views.dashboard_data, name='dashboard_data'),
    path('api/update-garmin-data/', views.update_garmin_data, name='update_garmin_data'),
] 