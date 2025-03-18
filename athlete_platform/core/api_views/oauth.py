"""
Developed by Andrew William Prince
Last Edit: March 7th, 2025

OAuth integration for third-party fitness services, implementing authorization flows,
token management, and API connectivity for Whoop and other data sources.
"""
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
from urllib.parse import urlencode
import json
from django.contrib.auth.decorators import login_required

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

        # Generate a state parameter that is exactly 8 characters as required by WHOOP
        import secrets
        import string
        # Create an 8-character state (WHOOP requirement)
        state = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
            
        # Store the state in session
        request.session['oauth_state'] = state
        
        # Manually construct the authorization URL to avoid CORS issues
        # This bypasses the library's URL construction which might be causing the CORS error
        authorization_url = (
            f"{self.auth_url}?"
            f"client_id={self.client_id}&"
            f"redirect_uri={self.redirect_uri}&"
            f"response_type=code&"
            f"scope={self.scope}&"
            f"state={state}"
        )

        logger.debug(f"Redirecting to WHOOP authorization URL: {authorization_url}")
        return redirect(authorization_url)

class WhoopCallbackView(WhoopOAuthBaseView):
    def get(self, request):
        """Handle OAuth callback from WHOOP"""
        code = request.GET.get('code')
        state = request.GET.get('state')
        error = request.GET.get('error')
        error_description = request.GET.get('error_description')

        logger.info(f"Processing WHOOP OAuth callback for user: {request.user.username}")
        logger.debug(f"WHOOP callback received - code exists: {bool(code)}")
        logger.debug(f"State validation: received={state}, stored={request.session.get('oauth_state')}")
        
        # Handle error codes from WHOOP
        if error:
            logger.error(f"WHOOP returned an error: {error} - {error_description}")
            return redirect(f'/dashboard?oauth_error={error}&error_description={error_description}&provider=whoop')

        if not state or state != request.session.get('oauth_state'):
            logger.error("Invalid state parameter in WHOOP callback")
            return redirect('/dashboard?oauth_error=invalid_state&provider=whoop')

        if not code:
            logger.error("No authorization code provided in WHOOP callback")
            return redirect('/dashboard?oauth_error=no_authorization_code&provider=whoop')

        try:
            # Create OAuth session for token exchange
            oauth = OAuth2Session(
                client_id=self.client_id,
                redirect_uri=self.redirect_uri
            )

            # Exchange authorization code for token using the library's method
            token = oauth.fetch_token(
                self.token_url,
                code=code,
                client_secret=self.client_secret,
                include_client_id=True
            )
            
            logger.info("Successfully exchanged code for WHOOP access token")
            signer = Signer()
            
            # Store the token in WhoopCredentials
            whoop_creds, created = WhoopCredentials.objects.update_or_create(
                athlete=request.user.athlete,
                defaults={
                    'access_token': signer.sign(token['access_token']),
                    'refresh_token': signer.sign(token['refresh_token']),
                    'expires_at': timezone.now() + timedelta(seconds=token['expires_in']),
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
            return redirect('/dashboard?oauth_success=true&provider=whoop')

        except Exception as e:
            error_message = str(e)
            logger.error(f"WHOOP OAuth Error: {error_message}", exc_info=True)
            
            # Check for rate limiting error
            if "429" in error_message:
                return redirect('/dashboard?oauth_error=rate_limited&provider=whoop&message=WHOOP+is+rate+limiting+requests.+Please+try+again+later.')
                
            return redirect(f'/dashboard?oauth_error=token_exchange_failed&provider=whoop&message={error_message}')

def refresh_whoop_token(oauth_token):
    """Utility function to refresh WHOOP token"""
    try:
        signer = Signer()
        
        # Decrypt the refresh token
        decrypted_refresh_token = signer.unsign(oauth_token.refresh_token)
        
        print("Initializing OAuth2Session for refresh...")
        oauth = OAuth2Session(
            client_id=settings.WHOOP_CLIENT_ID,
            token={
                'refresh_token': decrypted_refresh_token,
                'token_type': 'Bearer'
            }
        )
        
        print("Refreshing token...")
        new_token = oauth.refresh_token(
            settings.WHOOP_TOKEN_URL,
            client_id=settings.WHOOP_CLIENT_ID,
            client_secret=settings.WHOOP_CLIENT_SECRET
        )
        
        print("Token refreshed, storing in DB...")
        # Store encrypted tokens
        oauth_token.access_token = signer.sign(new_token.get('access_token'))
        oauth_token.refresh_token = signer.sign(new_token.get('refresh_token'))
        oauth_token.expires_at = timezone.now() + timedelta(seconds=new_token.get('expires_in', 0))
        oauth_token.save()

        logger.info(f"Successfully refreshed WHOOP token!")
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
