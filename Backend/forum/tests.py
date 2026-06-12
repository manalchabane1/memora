from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from .models import ForumComment, ForumPost


class ForumAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="owner", password="password123")
        self.other_user = User.objects.create_user(username="other", password="password123")
        self.post = ForumPost.objects.create(
            title="Question",
            content="Contenu",
            category="question",
            author=self.user,
        )

    def test_forum_requires_authentication(self):
        responses = [
            self.client.get("/api/forum/"),
            self.client.post(
                "/api/forum/",
                {"title": "Anonymous", "content": "No", "category": "general"},
                format="json",
            ),
            self.client.post(
                f"/api/forum/{self.post.id}/comments/",
                {"content": "Anonymous"},
                format="json",
            ),
        ]

        self.assertTrue(all(response.status_code == 401 for response in responses))
        self.assertEqual(ForumPost.objects.count(), 1)
        self.assertEqual(ForumComment.objects.count(), 0)

    def test_authenticated_user_can_create_posts_and_comments(self):
        self.client.force_authenticate(self.other_user)

        post_response = self.client.post(
            "/api/forum/",
            {"title": "Nouveau", "content": "Message", "category": "help"},
            format="json",
        )
        comment_response = self.client.post(
            f"/api/forum/{self.post.id}/comments/",
            {"content": "Une réponse"},
            format="json",
        )

        self.assertEqual(post_response.status_code, 201)
        self.assertEqual(comment_response.status_code, 201)
        self.assertEqual(ForumPost.objects.get(title="Nouveau").author, self.other_user)
        self.assertEqual(ForumComment.objects.get().author, self.other_user)

    def test_user_cannot_modify_or_delete_another_users_post(self):
        self.client.force_authenticate(self.other_user)

        update = self.client.patch(
            f"/api/forum/{self.post.id}/",
            {"title": "Volé"},
            format="json",
        )
        delete = self.client.delete(f"/api/forum/{self.post.id}/")

        self.assertEqual(update.status_code, 403)
        self.assertEqual(delete.status_code, 403)
        self.post.refresh_from_db()
        self.assertEqual(self.post.title, "Question")

    def test_comment_owner_can_edit_and_delete_but_other_user_cannot(self):
        comment = ForumComment.objects.create(
            post=self.post,
            author=self.user,
            content="Original",
        )
        self.client.force_authenticate(self.other_user)
        forbidden = self.client.patch(
            f"/api/forum/comments/{comment.id}/",
            {"content": "Non"},
            format="json",
        )

        self.client.force_authenticate(self.user)
        update = self.client.patch(
            f"/api/forum/comments/{comment.id}/",
            {"content": "Corrigé"},
            format="json",
        )
        delete = self.client.delete(f"/api/forum/comments/{comment.id}/")

        self.assertEqual(forbidden.status_code, 403)
        self.assertEqual(update.status_code, 200)
        self.assertEqual(update.data["content"], "Corrigé")
        self.assertEqual(delete.status_code, 200)
        self.assertFalse(ForumComment.objects.filter(id=comment.id).exists())
