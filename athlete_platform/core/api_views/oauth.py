from django.views import View
from django.shortcuts import redirect
from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import requests
from datetime import datetime, timedelta
from ..db_models.oauth_tokens import OAuthTokens


class WhoopOAuthView(View):
    def get(self, request):
        """Initiate OAuth flow by redirecting to WHOOP authorization page"""
        auth_url = "https://api.whoop.com/oauth/oauth2/auth"
        params = {
            'client_id': settings.WHOOP_CLIENT_ID,
            'redirect_uri': settings.WHOOP_REDIRECT_URI,
            'response_type': 'code',
            'scope': 'read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement'
        }
        
        # Convert params to URL query string
        query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
        authorization_url = f"{auth_url}?{query_string}"
        
        return redirect(authorization_url)

class WhoopCallbackView(View):
    def get(self, request):
        """Handle OAuth callback from WHOOP"""
        code = request.GET.get('code')
        if not code:
            return JsonResponse({'error': 'No authorization code provided'}, status=400)

        # Exchange code for tokens
        token_url = "https://api.whoop.com/oauth/oauth2/token"
        data = {
            'client_id': settings.WHOOP_CLIENT_ID,
            'client_secret': settings.WHOOP_CLIENT_SECRET,
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': settings.WHOOP_REDIRECT_URI
        }

        try:
            response = requests.post(token_url, data=data)
            response.raise_for_status()
            token_data = response.json()

            # Store tokens in database
            oauth_token, created = OAuthTokens.objects.update_or_create(
                user=request.user,
                provider='whoop',
                defaults={
                    'access_token': token_data['access_token'],
                    'refresh_token': token_data['refresh_token'],
                    'expires_at': datetime.now() + timedelta(seconds=token_data['expires_in'])
                }
            )

            return redirect('dashboard')  # Redirect to success page

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

@method_decorator(csrf_exempt, name='dispatch')
class WhoopWebhookView(View):
    def post(self, request):
        """Handle WHOOP webhooks"""
        # Verify webhook signature if WHOOP provides one
        
        try:
            # Process webhook data
            # You might want to trigger a Celery task here to fetch updated data
            return HttpResponse(status=200)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400) 