from django.urls import path
from .views import todo_list_create, todo_detail

urlpatterns = [
    path("", todo_list_create),
    path("<int:todo_id>/", todo_detail),
]