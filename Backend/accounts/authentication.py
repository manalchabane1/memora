from datetime import timedelta

from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed


class ExpiringTokenAuthentication(TokenAuthentication):
    keyword = "Token"
    max_age = timedelta(days=30)

    def authenticate_credentials(self, key):
        user, token = super().authenticate_credentials(key)
        if token.created < timezone.now() - self.max_age:
            token.delete()
            raise AuthenticationFailed("Session expirée. Reconnectez-vous.")
        return user, token
