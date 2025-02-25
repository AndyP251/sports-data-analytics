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
from ..models import WhoopCredentials
from django.utils import timezone
import logging
from django.core.signing import Signer

logger = logging.getLogger(__name__)

# reference: https://developer.whoop.com/docs/developing/oauth

class WhoopOAuthBaseView(View):
    """Base view to initialize WHOOP OAuth configuration for reuse."""
    def __init__(self, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self.client_id = settings.WHOOP_CLIENT_ID
        self.client_secret = settings.WHOOP_CLIENT_SECRET
        self.redirect_uri = settings.WHOOP_REDIRECT_URI
        self.auth_url = "https://api.prod.whoop.com/oauth/oauth2/auth"
        self.token_url = "https://api.prod.whoop.com/oauth/oauth2/token"
        self.scope = "offline read:recovery read:cycles read:sleep read:workout read:profile"

class WhoopOAuthView(WhoopOAuthBaseView):
    def get(self, request):
        """Initiate OAuth flow by redirecting to WHOOP authorization page"""
        if not all([self.client_id, self.client_secret, self.redirect_uri]):
            logger.error("Missing required WHOOP OAuth settings")
            return JsonResponse({'error': 'OAuth configuration incomplete'}, status=500)

        logger.debug(f"WHOOP OAuth Settings - Client ID exists: {bool(self.client_id)}")
        logger.debug(f"WHOOP OAuth Settings - Client Secret exists: {bool(self.client_secret)}")
        logger.debug(f"WHOOP OAuth Settings - Redirect URI: {self.redirect_uri}")

        oauth = OAuth2Session(
            client_id=self.client_id,
            redirect_uri=self.redirect_uri,
            scope=self.scope
        )

        authorization_url, state = oauth.authorization_url(self.auth_url)
        request.session['oauth_state'] = state

        logger.debug(f"Redirecting to WHOOP authorization URL: {authorization_url}")
        return redirect(authorization_url)

class WhoopCallbackView(WhoopOAuthBaseView):
    def get(self, request):
        """Handle OAuth callback from WHOOP"""
        code = request.GET.get('code')
        state = request.GET.get('state')

        logger.info(f"Processing WHOOP OAuth callback for user: {request.user.username}")
        logger.debug(f"WHOOP callback received - code exists: {bool(code)}")
        logger.debug(f"State validation: received={state}, stored={request.session.get('oauth_state')}")

        if not state or state != request.session.get('oauth_state'):
            logger.error("Invalid state parameter in WHOOP callback")
            return JsonResponse({'error': 'Invalid state parameter'}, status=400)

        if not code:
            logger.error("No authorization code provided in WHOOP callback")
            return JsonResponse({'error': 'No authorization code provided'}, status=400)

        try:
            oauth = OAuth2Session(
                client_id=self.client_id,
                redirect_uri=self.redirect_uri
            )

            token = oauth.fetch_token(
                token_url=self.token_url,
                authorization_response=request.build_absolute_uri(),
                client_id=self.client_id,
                client_secret=self.client_secret,
                include_client_id=True
            )
            logger.info("Successfully exchanged code for WHOOP access token")

            # Store encrypted tokens
            signer = Signer()
            
            # oauth_token, created = OAuthTokens.objects.update_or_create(
            #     user=request.user,
            #     provider='whoop',
            #     defaults={
            #         'access_token': signer.sign(token.get('access_token')),
            #         'refresh_token': signer.sign(token.get('refresh_token')),
            #         'expires_at': datetime.now() + timedelta(seconds=token.get('expires_in', 0)),
            #         'scope': token.get('scope', self.scope)
            #     }
            # )
                  

            # Store the token in WhoopCredentials
            whoop_creds, created = WhoopCredentials.objects.update_or_create(
                athlete=request.user.athlete,
                defaults={
                    'access_token': signer.sign(token['access_token']),
                    'refresh_token': signer.sign(token['refresh_token']),
                    'expires_at': datetime.now() + timedelta(seconds=token['expires_in']),
                    'scope': token.get('scope', self.scope)
                }
            )
            
            action = "Created" if created else "Updated"
            logger.info(f"{action} WHOOP credentials for user {request.user.username}")

            # Update user's active data sources
            if 'whoop' not in request.user.active_data_sources:
                request.user.active_data_sources.append('whoop')
                request.user.save()
                logger.info(f"Added WHOOP to active data sources for user {request.user.username}")

            logger.info(f"Successfully stored WHOOP tokens for user {request.user.id}")
            return redirect('dashboard')

        except Exception as e:
            logger.error(f"WHOOP OAuth Error: {e}", exc_info=True)
            return JsonResponse({'error': str(e)}, status=400)

def refresh_whoop_token(oauth_token):
    """Utility function to refresh WHOOP token"""
    try:
        signer = Signer()
        
        # Decrypt the refresh token
        decrypted_refresh_token = signer.unsign(oauth_token.refresh_token)
        

        oauth = OAuth2Session(
            client_id=settings.WHOOP_CLIENT_ID,
            token={
                'refresh_token': decrypted_refresh_token,
                'token_type': 'Bearer'
            }
        )

        new_token = oauth.refresh_token(
            settings.WHOOP_TOKEN_URL,
            auth=(settings.WHOOP_CLIENT_ID, settings.WHOOP_CLIENT_SECRET)
        )

        # Store encrypted tokens
        oauth_token.access_token = signer.sign(new_token.get('access_token'))
        oauth_token.refresh_token = signer.sign(new_token.get('refresh_token'))
        oauth_token.expires_at = datetime.now() + timedelta(seconds=new_token.get('expires_in', 0))
        oauth_token.save()

        logger.info(f"Successfully refreshed WHOOP token for user {oauth_token.user.id}")
        return new_token

    except Exception as e:
        logger.error(f"Token refresh failed: {str(e)}", exc_info=True)
        raise Exception(f"Token refresh failed: {str(e)}")

@method_decorator(csrf_exempt, name='dispatch')
class WhoopWebhookView(View):
    def post(self, request):
        """Handle WHOOP webhooks"""
        try:
            return HttpResponse(status=200)
        except Exception as e:
            logger.error(f"Webhook processing failed: {str(e)}")
            return JsonResponse({'error': str(e)}, status=400)
