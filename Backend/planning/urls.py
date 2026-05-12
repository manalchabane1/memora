from django.urls import path
from .views import (
    revision_plan_create,
    availability_list_create,
    revision_session_list_create,
)

urlpatterns = [
    path("", revision_plan_create),
    path("availabilities/", availability_list_create),
    path("sessions/", revision_session_list_create),
]