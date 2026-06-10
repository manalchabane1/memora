from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from courses.models import CoursePDF, Deck
from planning.models import RevisionPlan, RevisionSession
from .models import ToDo


class TodoAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="testuser", password="testpass123")
        self.other_user = User.objects.create_user(username="other", password="testpass123")
        self.client.force_authenticate(self.user)

    def test_get_todos_only_returns_current_users_todos(self):
        ToDo.objects.create(title="Mine", user=self.user)
        ToDo.objects.create(title="Other", user=self.other_user)

        response = self.client.get("/api/todos/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Mine")

    def test_create_update_and_delete_todo(self):
        create = self.client.post(
            "/api/todos/",
            {
                "title": "New Todo",
                "description": "Description",
                "subject": "Mathématiques",
                "priority": "high",
            },
            format="json",
        )
        todo_id = create.data["id"]
        update = self.client.patch(
            f"/api/todos/{todo_id}/",
            {"status": "done"},
            format="json",
        )
        delete = self.client.delete(f"/api/todos/{todo_id}/")

        self.assertEqual(create.status_code, 201)
        self.assertEqual(create.data["user"], self.user.id)
        self.assertEqual(create.data["subject"], "Mathématiques")
        self.assertEqual(update.status_code, 200)
        self.assertEqual(update.data["status"], "done")
        self.assertEqual(delete.status_code, 200)
        self.assertFalse(ToDo.objects.filter(id=todo_id).exists())

    def test_owner_cannot_be_reassigned(self):
        todo = ToDo.objects.create(title="Mine", user=self.user)

        response = self.client.patch(
            f"/api/todos/{todo.id}/",
            {"user": self.other_user.id},
            format="json",
        )

        todo.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(todo.user, self.user)

    def test_foreign_revision_session_is_rejected(self):
        course = CoursePDF.objects.create(title="Other", file="other.pdf", user=self.other_user)
        deck = Deck.objects.create(
            title="Other deck",
            description="",
            user=self.other_user,
            CoursePDF=course,
        )
        plan = RevisionPlan.objects.create(title="Other plan", user=self.other_user)
        session = RevisionSession.objects.create(
            date="2026-07-01",
            start_time="09:00",
            end_time="10:00",
            revisionPlan=plan,
            deck=deck,
        )

        response = self.client.post(
            "/api/todos/",
            {"title": "Mine", "revision_session": session.id},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
