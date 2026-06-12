from django.shortcuts import get_object_or_404

from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import ForumPost, ForumComment
from .serializers import ForumPostSerializer, ForumCommentSerializer


@api_view(["GET", "POST"])
def forum_post_list_create(request):
    if request.method == "GET":
        posts = ForumPost.objects.select_related("author").prefetch_related("comments").order_by(
            "-created_at"
        )
        serializer = ForumPostSerializer(posts, many=True)
        return Response(serializer.data)

    serializer = ForumPostSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save(author=request.user)
        return Response(serializer.data, status=201)

    return Response(serializer.errors, status=400)


@api_view(["GET", "PATCH", "DELETE"])
def forum_post_detail(request, post_id):
    post = get_object_or_404(ForumPost, id=post_id)

    if request.method == "GET":
        serializer = ForumPostSerializer(post)
        return Response(serializer.data)

    if request.method == "PATCH":
        if post.author != request.user and not request.user.is_superuser:
            return Response(
                {"error": "Tu ne peux modifier que tes propres publications."},
                status=403
            )

        serializer = ForumPostSerializer(post, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=400)

    if post.author != request.user and not request.user.is_superuser:
        return Response(
            {"error": "Tu ne peux supprimer que tes propres publications."},
            status=403
        )

    post.delete()
    return Response({"message": "Publication supprimée avec succès."})


@api_view(["GET", "POST"])
def forum_comment_list_create(request, post_id):
    post = get_object_or_404(ForumPost, id=post_id)

    if request.method == "GET":
        comments = ForumComment.objects.filter(post=post).order_by("created_at")
        serializer = ForumCommentSerializer(comments, many=True)
        return Response(serializer.data)

    serializer = ForumCommentSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save(author=request.user, post=post)
        return Response(serializer.data, status=201)

    return Response(serializer.errors, status=400)


@api_view(["PATCH", "DELETE"])
def forum_comment_detail(request, comment_id):
    comment = get_object_or_404(ForumComment, id=comment_id)
    if comment.author != request.user and not request.user.is_superuser:
        return Response(
            {"error": "Tu ne peux modifier que tes propres réponses."},
            status=403,
        )

    if request.method == "PATCH":
        serializer = ForumCommentSerializer(comment, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    comment.delete()
    return Response({"message": "Réponse supprimée avec succès."})
