from unittest.mock import patch
from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient


class AccountsAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

    @patch("accounts.views.send_mail")
    def test_registration_validates_password_and_rolls_back_email_failure(self, send_mail):
        weak = self.client.post(
            "/api/auth/register/",
            {
                "username": "weak@example.com",
                "email": "weak@example.com",
                "password": "123",
                "name": "Weak",
            },
            format="json",
        )
        send_mail.side_effect = RuntimeError("SMTP unavailable")
        email_failure = self.client.post(
            "/api/auth/register/",
            {
                "username": "valid@example.com",
                "email": "valid@example.com",
                "password": "A-strong-password-123",
                "name": "Valid",
            },
            format="json",
        )

        self.assertEqual(weak.status_code, 400)
        self.assertEqual(email_failure.status_code, 503)
        self.assertFalse(User.objects.filter(username="valid@example.com").exists())

    def test_profile_change_password_and_logout(self):
        user = User.objects.create_user(
            username="user@example.com",
            email="user@example.com",
            password="Old-strong-password-123",
        )
        token = Token.objects.create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        profile = self.client.patch(
            "/api/auth/profile/",
            {"name": "New name", "email": "new@example.com"},
            format="json",
        )
        password = self.client.post(
            "/api/auth/change-password/",
            {
                "current_password": "Old-strong-password-123",
                "new_password": "New-strong-password-456",
            },
            format="json",
        )

        self.assertEqual(profile.status_code, 200)
        self.assertEqual(password.status_code, 200)
        self.assertFalse(Token.objects.filter(user=user).exists())

    def test_expired_token_is_rejected_and_deleted(self):
        user = User.objects.create_user(username="user", password="password123")
        token = Token.objects.create(user=user)
        Token.objects.filter(pk=token.pk).update(created=timezone.now() - timedelta(days=31))
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        response = self.client.get("/api/auth/profile/")

        self.assertEqual(response.status_code, 401)
        self.assertFalse(Token.objects.filter(pk=token.pk).exists())

    def test_login_and_profile_derive_name_for_legacy_account(self):
        user = User.objects.create_user(
            username="legacy.user.1@example.com",
            email="legacy.user.1@example.com",
            password="A-strong-password-123",
        )

        login = self.client.post(
            "/api/auth/login/",
            {
                "username": "legacy.user.1@example.com",
                "password": "A-strong-password-123",
            },
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {login.data['token']}")
        profile = self.client.get("/api/auth/profile/")

        self.assertEqual(login.status_code, 200)
        self.assertEqual(login.data["name"], "Legacy User")
        self.assertEqual(profile.data["name"], "Legacy User")

    @patch("accounts.views.send_mail")
    def test_registration_requires_a_name(self, _send_mail):
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "nameless@example.com",
                "password": "A-strong-password-123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(User.objects.filter(email="nameless@example.com").exists())

    @patch("accounts.views.send_mail")
    def test_registration_uses_email_as_login_and_validates_profile_lengths(self, send_mail):
        registration = self.client.post(
            "/api/auth/register/",
            {
                "username": "different-login",
                "email": "student@example.com",
                "password": "A-strong-password-123",
                "name": "Student",
            },
            format="json",
        )
        user = User.objects.get(email="student@example.com")
        user.is_active = True
        user.save(update_fields=["is_active"])
        token = Token.objects.create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

        profile = self.client.patch(
            "/api/auth/profile/",
            {"name": "x" * 151},
            format="json",
        )

        self.assertEqual(registration.status_code, 201)
        self.assertEqual(user.username, "student@example.com")
        self.assertEqual(profile.status_code, 400)
