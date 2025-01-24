from django.urls import path
from . import api_views

urlpatterns = [
    # ... your existing urls ...
    path('api/check-auth/', api_views.check_auth),
    path('api/login/', api_views.login_view, name='api_login'),
    path('api/register/', api_views.register_view),
    path('api/logout/', api_views.logout_view),
    path('api/data/', api_views.get_data),
] 