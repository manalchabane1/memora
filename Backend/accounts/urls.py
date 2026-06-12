from django.urls import path
from .views import (
    change_password,
    login,
    logout,
    password_reset_confirm,
    password_reset_request,
    profile,
    profile_avatar,
    register,
    verify_email,
)

urlpatterns = [
    path("register/", register),
    path("login/", login),
    path("logout/", logout),
    path("profile/", profile),
    path("profile-avatar/<int:user_id>/", profile_avatar),
    path("change-password/", change_password),
    path("verify-email/<uidb64>/<token>/", verify_email, name="verify_email"),

    path("password-reset/", password_reset_request),

    path("password-reset-confirm/<uidb64>/<token>/", password_reset_confirm),
    path("password-reset/confirm/<uidb64>/<token>/", password_reset_confirm),
]
