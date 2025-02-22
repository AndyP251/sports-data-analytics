from typing import Any
from django.views import View
from django.shortcuts import redirect
from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from datetime import datetime, timedelta
from requests_oauthlib import OAuth2Session
from oauthlib.oauth2 import BackendApplicationClient
from ..db_models.oauth_tokens import OAuthTokens
import logging

logger = logging.getLogger(__name__)

# reference: https://developer.whoop.com/docs/developing/oauth

class WhoopOAuthView(View):
    def __init__(self, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self.client_id = settings.WHOOP_CLIENT_ID
        self.client_secret = settings.WHOOP_CLIENT_SECRET
        self.redirect_uri = settings.WHOOP_REDIRECT_URI
        self.auth_url = "https://api.prod.whoop.com/oauth/oauth2/auth"
        self.token_url = "https://api.prod.whoop.com/oauth/oauth2/token"
        self.scope = "offline read:recovery read:cycles read:sleep read:workout read:profile read:body_measurement"

    def get(self, request):
        """Initiate OAuth flow by redirecting to WHOOP authorization page"""
        oauth = OAuth2Session(
            client_id=self.client_id,
            redirect_uri=self.redirect_uri,
            scope=self.scope
        )

        authorization_url, state = oauth.authorization_url(self.auth_url)
        request.session['oauth_state'] = state
        return redirect(authorization_url)

class WhoopCallbackView(View):
    def get(self, request):
        """Handle OAuth callback from WHOOP"""
        code = request.GET.get('code')
        state = request.GET.get('state')

        # Validate state to prevent CSRF attacks
        if not state or state != request.session.get('oauth_state'):
            return JsonResponse({'error': 'Invalid state parameter'}, status=400)

        if not code:
            return JsonResponse({'error': 'No authorization code provided'}, status=400)

        try:
            # Create OAuth session without BackendApplicationClient
            oauth = OAuth2Session(
                client_id=settings.WHOOP_CLIENT_ID,
                redirect_uri=settings.WHOOP_REDIRECT_URI,
                state=state
            )

            # Fetch token with proper parameters
            token = oauth.fetch_token(
                token_url=settings.WHOOP_TOKEN_URL,
                client_id=settings.WHOOP_CLIENT_ID,
                client_secret=settings.WHOOP_CLIENT_SECRET,
                code=code,
                include_client_id=True,
                authorization_response=request.build_absolute_uri()
            )

            # Store tokens in database
            oauth_token, created = OAuthTokens.objects.update_or_create(
                user=request.user,
                provider='whoop',
                defaults={
                    'access_token': token.get('access_token'),
                    'refresh_token': token.get('refresh_token'),
                    'expires_at': datetime.now() + timedelta(seconds=token.get('expires_in', 0))
                }
            )

            return redirect('dashboard')

        except Exception as e:
            logger.error(f"WHOOP OAuth Error: {e}")
            return JsonResponse({'error': str(e)}, status=400)

def refresh_whoop_token(oauth_token):
    """Utility function to refresh WHOOP token"""
    try:
        oauth = OAuth2Session(
            client_id=settings.WHOOP_CLIENT_ID,
            token={
                'refresh_token': oauth_token.decrypt_token(oauth_token.refresh_token),
                'token_type': 'Bearer'
            }
        )

        new_token = oauth.refresh_token(
            settings.WHOOP_TOKEN_URL,
            client_id=settings.WHOOP_CLIENT_ID,
            client_secret=settings.WHOOP_CLIENT_SECRET
        )

        oauth_token.access_token = new_token.get('access_token')
        oauth_token.refresh_token = new_token.get('refresh_token')
        oauth_token.expires_at = datetime.now() + timedelta(seconds=new_token.get('expires_in', 0))
        oauth_token.save()

        return new_token

    except Exception as e:
        logger.error(f"Token refresh failed: {str(e)}")
        raise Exception(f"Token refresh failed: {str(e)}")

@method_decorator(csrf_exempt, name='dispatch')
class WhoopWebhookView(View):
    def post(self, request):
        """Handle WHOOP webhooks"""
        try:
            # Process webhook data
            # You might want to trigger a Celery task here to fetch updated data
            return HttpResponse(status=200)
        except Exception as e:
            logger.error(f"Webhook processing failed: {str(e)}")
            return JsonResponse({'error': str(e)}, status=400)
