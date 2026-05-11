from django.urls import path
from .views import (get_revision_plans,
    create_revision_plan,
    get_revision_sessions,
    get_availabilities)

urlpatterns = [
    path("", get_revision_plans),
    path("create/", create_revision_plan),
    path("availabilities/", get_availabilities),
    path("sessions/", get_revision_sessions),
]