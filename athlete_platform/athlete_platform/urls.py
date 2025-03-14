"""
URL configuration for athlete_platform project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.contrib.auth import views as auth_views
from core.api_views.auth import register_view
from core import views as core_views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Admin routes
    path('admin/', admin.site.urls),
    
    # API and backend routes - process before catch-all route
    path('', include('core.urls')),  # All API endpoints and catch-all route
]

# debug check to ensure static files are served in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
