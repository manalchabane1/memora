from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from .models import CoursePDF, Deck, Flashcard, Quiz, QuizQuestion


class CoursesAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="testuser", password="testpass123")
        self.other_user = User.objects.create_user(username="other", password="testpass123")
        self.client.force_authenticate(self.user)

    def create_course(self, user=None, title="Course 1"):
        return CoursePDF.objects.create(
            title=title,
            file="test.pdf",
            user=user or self.user,
        )

    def create_deck(self, user=None):
        owner = user or self.user
        course = self.create_course(owner)
        return Deck.objects.create(
            title="Deck 1",
            description="Description",
            user=owner,
            CoursePDF=course,
        )

    def test_get_courses_only_returns_current_users_courses(self):
        self.create_course()
        self.create_course(self.other_user, "Other course")

        response = self.client.get("/api/courses/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Course 1")

    def test_upload_course_rejects_non_pdf_content(self):
        file = SimpleUploadedFile("fake.pdf", b"not a pdf", content_type="application/pdf")

        response = self.client.post(
            "/api/courses/upload/",
            {"title": "Fake", "file": file},
            format="multipart",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(CoursePDF.objects.count(), 0)

    def test_upload_course_with_pdf(self):
        file = SimpleUploadedFile(
            "test.pdf",
            b"%PDF-1.4\nminimal",
            content_type="application/pdf",
        )

        response = self.client.post(
            "/api/courses/upload/",
            {"title": "Course 3", "file": file},
            format="multipart",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(CoursePDF.objects.get().user, self.user)

    def test_update_and_delete_course_are_owner_scoped(self):
        course = self.create_course()
        other_course = self.create_course(self.other_user, "Other")

        update = self.client.patch(
            f"/api/courses/{course.id}/",
            {"title": "Renamed", "subject": "Réseaux"},
            format="json",
        )
        forbidden_delete = self.client.delete(f"/api/courses/{other_course.id}/")

        self.assertEqual(update.status_code, 200)
        self.assertEqual(update.data["title"], "Renamed")
        self.assertEqual(update.data["subject"], "Réseaux")
        self.assertEqual(forbidden_delete.status_code, 404)

    def test_update_course_rejects_oversized_fields(self):
        course = self.create_course()

        title = self.client.patch(
            f"/api/courses/{course.id}/",
            {"title": "x" * 256},
            format="json",
        )
        subject = self.client.patch(
            f"/api/courses/{course.id}/",
            {"subject": "x" * 101},
            format="json",
        )

        self.assertEqual(title.status_code, 400)
        self.assertEqual(subject.status_code, 400)

    def test_course_pdf_download_is_owner_scoped(self):
        course = CoursePDF.objects.create(
            title="Download",
            file=SimpleUploadedFile("download.pdf", b"%PDF-1.4\nminimal"),
            user=self.user,
        )
        other_course = self.create_course(self.other_user, "Other")

        response = self.client.get(f"/api/courses/{course.id}/file/")
        forbidden = self.client.get(f"/api/courses/{other_course.id}/file/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(forbidden.status_code, 404)

    def test_get_decks_only_returns_current_users_decks(self):
        deck = self.create_deck()
        Flashcard.objects.create(
            question="Question 1",
            answer="Answer 1",
            difficulty="easy",
            deck=deck,
        )
        self.create_deck(self.other_user)

        response = self.client.get("/api/courses/decks/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(len(response.data[0]["cards"]), 1)

    def test_quiz_submission_and_statistics_are_owner_scoped(self):
        quiz = Quiz.objects.create(title="Owner quiz", user=self.user)
        question = QuizQuestion.objects.create(
            quiz=quiz,
            question="Question",
            choices=["A", "B", "C", "D"],
            correct_answer="B",
            explanation="Because B",
        )
        other_quiz = Quiz.objects.create(title="Other quiz", user=self.other_user)

        response = self.client.post(
            f"/api/courses/quizzes/{quiz.id}/submit/",
            {"answers": {str(question.id): "B"}},
            format="json",
        )
        forbidden_submit = self.client.post(
            f"/api/courses/quizzes/{other_quiz.id}/submit/",
            {"answers": {}},
            format="json",
        )
        forbidden_stats = self.client.get(
            f"/api/courses/quizzes/{other_quiz.id}/statistics/"
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["score"], 1)
        self.assertEqual(response.data["corrections"][0]["correct_answer"], "B")
        self.assertEqual(forbidden_submit.status_code, 404)
        self.assertEqual(forbidden_stats.status_code, 404)

    def test_quiz_list_does_not_expose_answers(self):
        quiz = Quiz.objects.create(title="Owner quiz", user=self.user)
        QuizQuestion.objects.create(
            quiz=quiz,
            question="Question",
            choices=["A", "B", "C", "D"],
            correct_answer="B",
            explanation="Because B",
        )

        response = self.client.get("/api/courses/quizzes/")

        question = response.data[0]["quiz_questions"][0]
        self.assertNotIn("correct_answer", question)
        self.assertNotIn("explanation", question)

    @patch("courses.views.generate_personal_quiz_with_groq", return_value=[])
    def test_personal_quiz_is_not_created_without_questions(self, _generate):
        response = self.client.post(
            "/api/courses/generate-personal-quiz/",
            {"topic": "Empty"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Quiz.objects.count(), 0)
