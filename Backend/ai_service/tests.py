from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase

from .groq_service import (
    JSON_RESPONSE_FORMAT,
    extract_json_array,
    generate_quiz_with_groq,
    match_correct_answer,
)
from .pipeline import generate_flashcards_pipeline


class JsonExtractionTests(SimpleTestCase):
    def test_extracts_items_from_json_object_mode_response(self):
        result = extract_json_array('{"items": [{"question": "Q1"}, {"question": "Q2"}]}')

        self.assertEqual([item["question"] for item in result], ["Q1", "Q2"])

    def test_recovers_complete_items_from_malformed_json(self):
        malformed = (
            '{"items": ['
            '{"question": "Q1", "choices": ["A", "B", "C", "D"]},'
            '{"question": "broken", "choices": ["A", "B", "C" "D"]},'
            '{"question": "Q3", "choices": ["A", "B", "C", "D"]}'
            "]}"
        )

        result = extract_json_array(malformed)

        self.assertEqual([item["question"] for item in result], ["Q1", "Q3"])

    def test_matches_letter_and_case_insensitive_correct_answers(self):
        choices = ["Premier", "Deuxième", "Troisième", "Quatrième"]

        self.assertEqual(match_correct_answer("B", choices), "Deuxième")
        self.assertEqual(match_correct_answer("c) Troisième", choices), "Troisième")
        self.assertEqual(match_correct_answer("premier", choices), "Premier")

    @patch("ai_service.groq_service.get_client")
    def test_quiz_generation_uses_json_object_mode(self, get_client):
        create = Mock(return_value=SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=(
                '{"items": [{"question": "Q", "choices": ["A", "B", "C", "D"], '
                '"correct_answer": "A", "explanation": "E"}]}'
            )))]
        ))
        get_client.return_value = SimpleNamespace(
            chat=SimpleNamespace(completions=SimpleNamespace(create=create))
        )

        questions = generate_quiz_with_groq(
            [{"question": "Source", "answer": "Answer", "difficulty": "easy"}],
            count=1,
        )

        self.assertEqual(len(questions), 1)
        self.assertEqual(create.call_args.kwargs["response_format"], JSON_RESPONSE_FORMAT)
        self.assertIn("clé items", create.call_args.kwargs["messages"][0]["content"])


class FlashcardPipelineTests(SimpleTestCase):
    @patch("ai_service.pipeline.split_text", return_value=["Cours utile"])
    @patch("ai_service.pipeline.generate_flashcards_with_groq")
    def test_pipeline_retries_with_only_the_missing_count(self, generate, _split):
        generate.side_effect = [
            [
                {"question": "Q1", "answer": "A1", "difficulty": "easy"},
                {"question": "Q2", "answer": "A2", "difficulty": "medium"},
            ],
            [
                {"question": "Q3", "answer": "A3", "difficulty": "hard"},
                {"question": "Q4", "answer": "A4", "difficulty": "easy"},
                {"question": "Q5", "answer": "A5", "difficulty": "medium"},
            ],
        ]

        cards = generate_flashcards_pipeline(
            "Cours",
            count=5,
            difficulty="all",
            focus="Examens",
        )

        self.assertEqual(len(cards), 5)
        self.assertEqual(generate.call_count, 2)
        self.assertEqual(generate.call_args_list[0].kwargs["count"], 5)
        self.assertEqual(generate.call_args_list[1].kwargs["count"], 3)

    @patch("ai_service.pipeline.split_text", return_value=["Cours utile"])
    @patch("ai_service.pipeline.generate_flashcards_with_groq")
    def test_pipeline_discards_duplicate_questions_between_retries(self, generate, _split):
        generate.return_value = [
            {"question": "Same question", "answer": "Answer", "difficulty": "easy"},
        ]

        cards = generate_flashcards_pipeline("Cours", count=5)

        self.assertEqual(len(cards), 1)
        self.assertEqual(generate.call_count, 4)
