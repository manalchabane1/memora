from django.urls import path
from .views import (
    revision_plan_create,
    revision_plan_detail,
    availability_list_create,
    availability_detail,
    revision_session_list_create,
    revision_session_detail,
    generate_ai_revision_plan,
)

urlpatterns = [
    path("", revision_plan_create),
    path("<int:plan_id>/", revision_plan_detail),
    path("availabilities/", availability_list_create),
    path("availabilities/<int:availability_id>/", availability_detail),
    path("sessions/", revision_session_list_create),
    path("sessions/<int:session_id>/", revision_session_detail),
    path("generate-ai/", generate_ai_revision_plan, name="generate_ai_revision_plan"),
]
