from django.urls import path
from .views import delete_deck

urlpatterns = [
    path("delete/<int:deck_id>/", delete_deck),
]
