from django.urls import path
from .views import get_courses, get_decks, upload_course

urlpatterns = [
    path("", get_courses),
    path("upload/", upload_course),
    path("decks/", get_decks),
    #path("<int : course_id>/generate-flashcards/", generate_flashcards_from_course),
]