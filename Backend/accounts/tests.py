from unittest.mock import patch
from datetime import timedelta

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from .models import UserProfile


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

    def test_profile_stores_extended_student_information(self):
        user = User.objects.create_user(
            username="student@example.com",
            email="student@example.com",
            password="A-strong-password-123",
        )
        self.client.force_authenticate(user)

        update = self.client.patch(
            "/api/auth/profile/",
            {
                "name": "Student",
                "email": "student@example.com",
                "bio": "Je prépare mes examens.",
                "school": "Université Memora",
                "study_level": "Licence 3",
                "preferred_subjects": ["Mathématiques", "Réseaux"],
            },
            format="json",
        )
        profile = UserProfile.objects.get(user=user)

        self.assertEqual(update.status_code, 200)
        self.assertEqual(profile.school, "Université Memora")
        self.assertEqual(update.data["preferred_subjects"], ["Mathématiques", "Réseaux"])

    def test_partial_profile_update_preserves_omitted_fields(self):
        user = User.objects.create_user(
            username="student@example.com",
            email="student@example.com",
            password="A-strong-password-123",
        )
        profile = UserProfile.objects.create(
            user=user,
            bio="Bio existante",
            school="Université",
            preferred_subjects=["Réseaux"],
        )
        self.client.force_authenticate(user)

        response = self.client.patch(
            "/api/auth/profile/",
            {"name": "Nouveau nom"},
            format="json",
        )

        profile.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(profile.bio, "Bio existante")
        self.assertEqual(profile.school, "Université")
        self.assertEqual(profile.preferred_subjects, ["Réseaux"])

    def test_invalid_profile_update_is_atomic(self):
        user = User.objects.create_user(
            username="old@example.com",
            email="old@example.com",
            first_name="Old",
            password="A-strong-password-123",
        )
        self.client.force_authenticate(user)

        response = self.client.patch(
            "/api/auth/profile/",
            {
                "name": "Changed",
                "email": "changed@example.com",
                "bio": "x" * 501,
            },
            format="json",
        )

        user.refresh_from_db()
        self.assertEqual(response.status_code, 400)
        self.assertEqual(user.username, "old@example.com")
        self.assertEqual(user.email, "old@example.com")
        self.assertEqual(user.first_name, "Old")

    def test_profile_rejects_fake_image_upload(self):
        user = User.objects.create_user(
            username="student@example.com",
            email="student@example.com",
            password="A-strong-password-123",
        )
        self.client.force_authenticate(user)
        fake_image = SimpleUploadedFile(
            "fake.png",
            b"not actually an image",
            content_type="image/png",
        )

        response = self.client.patch(
            "/api/auth/profile/",
            {"avatar": fake_image},
            format="multipart",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(UserProfile.objects.get(user=user).avatar)

    def test_auth_endpoints_reject_malformed_field_types(self):
        registration = self.client.post(
            "/api/auth/register/",
            {
                "email": ["bad@example.com"],
                "password": "A-strong-password-123",
                "name": "Bad",
            },
            format="json",
        )
        login = self.client.post(
            "/api/auth/login/",
            {"username": ["bad@example.com"], "password": "password"},
            format="json",
        )
        reset = self.client.post(
            "/api/auth/password-reset/",
            {"email": ["bad@example.com"]},
            format="json",
        )

        self.assertEqual(registration.status_code, 400)
        self.assertEqual(login.status_code, 400)
        self.assertEqual(reset.status_code, 400)
