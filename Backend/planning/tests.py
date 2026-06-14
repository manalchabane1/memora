from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from courses.models import CoursePDF, Deck, Flashcard
from .models import Availability, RevisionPlan, RevisionSession


class PlanningAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="testuser", password="testpass123")
        self.other_user = User.objects.create_user(username="other", password="testpass123")
        self.client.force_authenticate(self.user)
        self.course = CoursePDF.objects.create(title="Networks", file="test.pdf", user=self.user)
        self.deck = Deck.objects.create(
            title="Network deck",
            description="",
            user=self.user,
            CoursePDF=self.course,
        )
        Flashcard.objects.create(deck=self.deck, question="Q", answer="A")

    def test_crud_is_owner_scoped(self):
        create = self.client.post(
            "/api/planning/",
            {"title": "Test plan", "description": "Description"},
            format="json",
        )
        other_plan = RevisionPlan.objects.create(title="Other", user=self.other_user)
        forbidden = self.client.delete(f"/api/planning/{other_plan.id}/")

        self.assertEqual(create.status_code, 201)
        self.assertEqual(create.data["user"], self.user.id)
        self.assertEqual(forbidden.status_code, 404)

    def test_availability_rejects_invalid_range(self):
        response = self.client.post(
            "/api/planning/availabilities/",
            {"day": "Lundi", "start_time": "18:00", "end_time": "09:00"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Availability.objects.count(), 0)

    def test_revision_session_rejects_foreign_plan_and_deck(self):
        other_course = CoursePDF.objects.create(
            title="Other course",
            file="other.pdf",
            user=self.other_user,
        )
        other_deck = Deck.objects.create(
            title="Other deck",
            description="",
            user=self.other_user,
            CoursePDF=other_course,
        )
        other_plan = RevisionPlan.objects.create(title="Other plan", user=self.other_user)

        response = self.client.post(
            "/api/planning/sessions/",
            {
                "date": "2026-07-01",
                "start_time": "09:00",
                "end_time": "10:00",
                "revisionPlan": other_plan.id,
                "deck": other_deck.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(RevisionSession.objects.count(), 0)

    def test_revision_session_crud_persists_event_fields(self):
        plan = RevisionPlan.objects.create(title="Mine", user=self.user)
        create = self.client.post(
            "/api/planning/sessions/",
            {
                "title": "Review networks",
                "description": "Chapter 1",
                "location": "Library",
                "color": "#60A5FA",
                "date": "2026-07-01",
                "start_time": "09:30",
                "end_time": "10:45",
                "revisionPlan": plan.id,
                "deck": self.deck.id,
            },
            format="json",
        )
        update = self.client.patch(
            f"/api/planning/sessions/{create.data['id']}/",
            {"title": "Updated review", "start_time": "10:00", "end_time": "11:00"},
            format="json",
        )
        delete = self.client.delete(f"/api/planning/sessions/{create.data['id']}/")

        self.assertEqual(create.status_code, 201)
        self.assertEqual(create.data["start_time"], "09:30:00")
        self.assertEqual(update.status_code, 200)
        self.assertEqual(update.data["title"], "Updated review")
        self.assertEqual(delete.status_code, 200)
        self.assertFalse(RevisionSession.objects.filter(id=create.data["id"]).exists())

    @patch("planning.views.generate_revision_plan_with_groq")
    def test_ai_planning_creates_owner_scoped_sessions_and_todos(self, generate):
        exam_date = timezone.localdate() + timedelta(days=14)
        day_names = [
            "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"
        ]
        day = day_names[(exam_date - timedelta(days=1)).weekday()]
        Availability.objects.create(
            user=self.user,
            day=day,
            start_time="09:00",
            end_time="11:00",
        )
        generate.return_value = [{
            "day": day,
            "start_time": "09:30",
            "end_time": "10:30",
            "objective": "Review",
            "session_type": "review",
            "todo_title": "Review deck",
            "todo_description": "",
            "todo_priority": "medium",
        }]

        response = self.client.post(
            "/api/planning/generate-ai/",
            {
                "deck_id": self.deck.id,
                "exam_date": exam_date.isoformat(),
                "priority": "medium",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        session = RevisionSession.objects.get()
        self.assertEqual(session.revisionPlan.user, self.user)
        self.assertEqual(session.deck.user, self.user)
        self.assertEqual(session.todos.get().user, self.user)

    @patch("planning.views.generate_revision_plan_with_groq")
    def test_ai_planning_rejects_foreign_deck(self, generate):
        other_course = CoursePDF.objects.create(title="Other", file="other.pdf", user=self.other_user)
        other_deck = Deck.objects.create(
            title="Other deck",
            description="",
            user=self.other_user,
            CoursePDF=other_course,
        )
        exam_date = timezone.localdate() + timedelta(days=14)

        response = self.client.post(
            "/api/planning/generate-ai/",
            {"deck_id": other_deck.id, "exam_date": exam_date.isoformat()},
            format="json",
        )

        self.assertEqual(response.status_code, 404)
        generate.assert_not_called()

    @patch("planning.views.generate_revision_plan_with_groq")
    def test_ai_planning_rejects_malformed_exam_date(self, generate):
        response = self.client.post(
            "/api/planning/generate-ai/",
            {"deck_id": self.deck.id, "exam_date": ["2026-07-01"]},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        generate.assert_not_called()

    @patch("planning.views.generate_revision_plan_with_groq", return_value=["invalid"])
    def test_ai_planning_rejects_malformed_ai_items(self, _generate):
        exam_date = timezone.localdate() + timedelta(days=14)
        Availability.objects.create(
            user=self.user,
            day="Lundi",
            start_time="09:00",
            end_time="11:00",
        )

        response = self.client.post(
            "/api/planning/generate-ai/",
            {"deck_id": self.deck.id, "exam_date": exam_date.isoformat()},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(RevisionPlan.objects.count(), 0)
