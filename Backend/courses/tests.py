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

    def flashcards(self, count, difficulty="medium"):
        return [
            {
                "question": f"Question {index}",
                "answer": f"Answer {index}",
                "difficulty": difficulty,
            }
            for index in range(count)
        ]

    def quiz_questions(self, start, count):
        return [
            {
                "question": f"Question {index}",
                "choices": [f"A {index}", f"B {index}", f"C {index}", f"D {index}"],
                "correct_answer": f"A {index}",
                "explanation": f"Because A {index}",
            }
            for index in range(start, start + count)
        ]

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

    def test_course_endpoints_reject_malformed_text_fields(self):
        course = self.create_course()

        update = self.client.patch(
            f"/api/courses/{course.id}/",
            {"title": ["not", "text"]},
            format="json",
        )
        question = self.client.post(
            f"/api/courses/{course.id}/ask/",
            {"question": ["not", "text"]},
            format="json",
        )

        self.assertEqual(update.status_code, 400)
        self.assertEqual(question.status_code, 400)

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

    def test_quiz_answer_check_is_immediate_and_owner_scoped(self):
        quiz = Quiz.objects.create(title="Owner quiz", user=self.user)
        question = QuizQuestion.objects.create(
            quiz=quiz,
            question="Question",
            choices=["A", "B", "C", "D"],
            correct_answer="B",
            explanation="Because B",
        )

        wrong = self.client.post(
            f"/api/courses/quizzes/{quiz.id}/questions/{question.id}/check/",
            {"answer": "A"},
            format="json",
        )
        self.client.force_authenticate(self.other_user)
        forbidden = self.client.post(
            f"/api/courses/quizzes/{quiz.id}/questions/{question.id}/check/",
            {"answer": "B"},
            format="json",
        )

        self.assertEqual(wrong.status_code, 200)
        self.assertFalse(wrong.data["is_correct"])
        self.assertEqual(wrong.data["correct_answer"], "B")
        self.assertEqual(forbidden.status_code, 404)

    @patch("courses.views.extract_text_from_pdf", return_value="Cours utile")
    @patch("courses.views.generate_flashcards_pipeline")
    def test_flashcard_generation_accepts_validated_options(self, generate, _extract):
        course = self.create_course()
        generate.return_value = self.flashcards(15, "hard")

        response = self.client.post(
            f"/api/courses/{course.id}/generate-flashcards/",
            {"count": 15, "difficulty": "hard", "instructions": "Focus examens"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        generate.assert_called_once_with(
            "Cours utile",
            count=15,
            difficulty="hard",
            focus="Focus examens",
        )
        self.assertEqual(response.data["cards_count"], 15)

    @patch("courses.views.extract_text_from_pdf", return_value="Cours utile")
    @patch("courses.views.generate_flashcards_pipeline", return_value=[])
    def test_incomplete_flashcard_generation_saves_fallback_cards(self, _generate, _extract):
        deck = self.create_deck()
        Flashcard.objects.create(deck=deck, question="Existing", answer="Answer")

        response = self.client.post(
            f"/api/courses/{deck.CoursePDF_id}/generate-flashcards/",
            {"count": 10},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(deck.flashcards.count(), 1)
        self.assertNotIn("Existing", deck.flashcards.values_list("question", flat=True))

    @patch("courses.views.generate_personal_quiz_with_groq")
    def test_personal_quiz_retries_until_requested_count(self, generate):
        generate.side_effect = [
            self.quiz_questions(0, 3),
            self.quiz_questions(3, 2),
        ]

        response = self.client.post(
            "/api/courses/generate-personal-quiz/",
            {
                "topic": "Python",
                "count": 5,
                "difficulty": "hard",
                "instructions": "Focus fonctions",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data["quiz_questions"]), 5)
        self.assertEqual(generate.call_count, 2)
        generate.assert_any_call(
            "Python",
            count=5,
            difficulty="hard",
            instructions="Focus fonctions",
        )
        second_call = generate.call_args_list[1]
        self.assertEqual(second_call.kwargs["count"], 2)
        self.assertIn("Focus fonctions", second_call.kwargs["instructions"])
        self.assertIn("Question 0", second_call.kwargs["instructions"])

    @patch("courses.views.generate_personal_quiz_with_groq")
    def test_large_personal_quiz_is_generated_in_small_batches(self, generate):
        next_question = 0

        def generate_batch(_topic, count, **_options):
            nonlocal next_question
            questions = self.quiz_questions(next_question, count)
            next_question += count
            return questions

        generate.side_effect = generate_batch

        response = self.client.post(
            "/api/courses/generate-personal-quiz/",
            {"topic": "Python", "count": 26},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data["quiz_questions"]), 26)
        self.assertEqual(
            [call.kwargs["count"] for call in generate.call_args_list],
            [8, 8, 8, 2],
        )

    @patch("courses.views.generate_quiz_with_groq")
    def test_incomplete_deck_quiz_is_saved_without_repeated_padding(self, generate):
        deck = self.create_deck()
        Flashcard.objects.create(deck=deck, question="Existing", answer="Answer")
        generate.return_value = self.quiz_questions(0, 1)

        response = self.client.post(
            f"/api/courses/decks/{deck.id}/generate-quiz/",
            {"count": 5},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(generate.call_count, 3)
        self.assertEqual(len(response.data["quiz_questions"]), 1)
        self.assertEqual(Quiz.objects.count(), 1)

    @patch("courses.views.generate_quiz_with_groq", return_value=[])
    def test_deck_quiz_fills_missing_ai_questions_from_flashcards(self, generate):
        deck = self.create_deck()
        for index in range(5):
            Flashcard.objects.create(
                deck=deck,
                question=f"Flashcard question {index}",
                answer=f"Flashcard answer {index}",
            )

        response = self.client.post(
            f"/api/courses/decks/{deck.id}/generate-quiz/",
            {"count": 5},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data["quiz_questions"]), 5)
        self.assertEqual(generate.call_count, 2)
        saved_questions = QuizQuestion.objects.filter(quiz_id=response.data["id"])
        self.assertTrue(all(len(question.choices) == 4 for question in saved_questions))

    @patch("courses.views.generate_quiz_with_groq", return_value=[])
    def test_deck_quiz_does_not_pad_large_request_with_repeated_questions(self, _generate):
        deck = self.create_deck()
        Flashcard.objects.create(deck=deck, question="Question", answer="Answer")

        response = self.client.post(
            f"/api/courses/decks/{deck.id}/generate-quiz/",
            {"count": 30},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data["quiz_questions"]), 0)

    def test_generation_rejects_invalid_counts(self):
        course = self.create_course()
        response = self.client.post(
            f"/api/courses/{course.id}/generate-summary/",
            {"line_count": 1000},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    @patch("courses.views.extract_text_from_pdf", return_value="Cours utile")
    @patch("courses.views.generate_summary_with_groq", return_value="   ")
    def test_empty_summary_does_not_overwrite_existing_summary(self, _generate, _extract):
        course = self.create_course()
        course.summary = "Résumé existant"
        course.save(update_fields=["summary"])

        response = self.client.post(
            f"/api/courses/{course.id}/generate-summary/",
            {"line_count": 20},
            format="json",
        )

        course.refresh_from_db()
        self.assertEqual(response.status_code, 502)
        self.assertEqual(course.summary, "Résumé existant")

    def test_generation_rejects_non_text_options(self):
        difficulty_response = self.client.post(
            "/api/courses/generate-personal-quiz/",
            {"topic": "Python", "count": 5, "difficulty": ["hard"]},
            format="json",
        )
        topic_response = self.client.post(
            "/api/courses/generate-personal-quiz/",
            {"topic": ["Python"], "count": 5},
            format="json",
        )

        self.assertEqual(difficulty_response.status_code, 400)
        self.assertEqual(topic_response.status_code, 400)

    @patch("courses.views.generate_personal_quiz_with_groq", return_value=[])
    def test_personal_quiz_is_saved_without_fabricated_fallback_questions(self, _generate):
        response = self.client.post(
            "/api/courses/generate-personal-quiz/",
            {"topic": "Empty"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data["quiz_questions"]), 0)
        self.assertEqual(Quiz.objects.count(), 1)
