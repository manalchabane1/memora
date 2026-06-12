from rest_framework import serializers
from .models import ForumPost, ForumComment

class ForumCommentSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True)

    class Meta:
        model = ForumComment
        fields = ["id", "post", "author", "author_username", "content", "created_at"]
        read_only_fields = ["author", "post", "created_at"]

class ForumPostSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True)
    comments = ForumCommentSerializer(many=True, read_only=True)
    comments_count = serializers.IntegerField(source="comments.count", read_only=True)

    class Meta:
        model = ForumPost
        fields = ["id", "title", "content", "category", "author", "author_username", "created_at", "updated_at", "comments", "comments_count"]
        read_only_fields = ["author", "created_at", "updated_at", "comments", "comments_count"]
