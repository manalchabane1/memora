from django.urls import path
from .views import (register, login, verify_email,password_reset_confirm,password_reset_request)

urlpatterns = [
    path("register/", register),
    path("login/", login),
    path("verify-email/<uidb64>/<token>/", verify_email, name="verify_email"),

    path("password-reset/", password_reset_request),

    path("password-reset-confirm/<uidb64>/<token>/", password_reset_confirm),
    path("password-reset/confirm/<uidb64>/<token>/", password_reset_confirm),
]
