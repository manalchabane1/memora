from django.urls import path
from .views import (
    forum_post_list_create,
    forum_post_detail,
    forum_comment_list_create,
    forum_comment_detail,
)

urlpatterns = [
    path("", forum_post_list_create),
    path("<int:post_id>/", forum_post_detail),
    path("<int:post_id>/comments/", forum_comment_list_create),
    path("comments/<int:comment_id>/", forum_comment_detail),
]
