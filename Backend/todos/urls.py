from django.urls import path
from .views import get_todos, create_todo

urlpatterns = [
    path("",get_todos),
    path("create/", create_todo),
]