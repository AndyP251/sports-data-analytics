"""
Developed by Andrew William Prince
Last Edit: March 7th, 2025

OAuth token storage model with encryption capabilities for securely managing
third-party API credentials for athlete data sources.
"""
from django.db import models
from django.conf import settings
from django.utils.crypto import get_random_string
from cryptography.fernet import Fernet

class OAuthTokens(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='oauth_tokens'
    )
    provider = models.CharField(max_length=50)  # 'whoop', 'garmin', etc.
    access_token = models.TextField()
    refresh_token = models.TextField()
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'provider')

    def encrypt_token(self, token):
        f = Fernet(settings.ENCRYPTION_KEY)
        return f.encrypt(token.encode()).decode()

    def decrypt_token(self, encrypted_token):
        f = Fernet(settings.ENCRYPTION_KEY)
        return f.decrypt(encrypted_token.encode()).decode()

    def save(self, *args, **kwargs):
        if not self.pk:  # Only encrypt on first save
            self.access_token = self.encrypt_token(self.access_token)
            self.refresh_token = self.encrypt_token(self.refresh_token)
        super().save(*args, **kwargs) 