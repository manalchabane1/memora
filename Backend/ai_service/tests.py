import json
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.test import SimpleTestCase

from .chunking import build_balanced_contexts, select_relevant_chunks
from .groq_service import JSON_RESPONSE_FORMAT, call_groq_json
from .parsing import extract_json_array, match_correct_answer
from .pdf_chat import ask_pdf_with_groq
from .pipeline import generate_flashcards_pipeline
from .planning import generate_revision_plan_with_groq
from .prompts import build_flashcards_prompt
from .quiz import generate_quiz_with_groq
from .similarity import choice_sets_are_similar, has_duplicate_choices, texts_are_similar
from .summary import generate_summary_with_groq


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

    def test_detects_near_duplicate_questions_and_choices(self):
        self.assertTrue(texts_are_similar(
            "Quel est le rôle principal du protocole TCP ?",
            "Quel est le rôle principal de TCP ?",
        ))
        self.assertTrue(has_duplicate_choices([
            "Transmission fiable des données",
            "La transmission fiable des données",
            "Routage des paquets",
            "Chiffrement des messages",
        ]))
        self.assertTrue(choice_sets_are_similar(
            ["Transmission fiable", "Routage", "Chiffrement", "Compression"],
            ["La transmission fiable", "Le routage", "Le chiffrement", "La compression"],
        ))

    @patch("ai_service.groq_service.get_client")
    def test_groq_json_transport_uses_json_object_mode(self, get_client):
        create = Mock(return_value=SimpleNamespace(
            choices=[SimpleNamespace(message=SimpleNamespace(content=(
                '{"items": [{"question": "Q", "choices": ["A", "B", "C", "D"], '
                '"correct_answer": "A", "explanation": "E"}]}'
            )))]
        ))
        get_client.return_value = SimpleNamespace(
            chat=SimpleNamespace(completions=SimpleNamespace(create=create))
        )

        content = call_groq_json("Prompt", "System")

        self.assertIn('"question": "Q"', content)
        self.assertEqual(create.call_args.kwargs["response_format"], JSON_RESPONSE_FORMAT)

    @patch("ai_service.quiz.call_groq_json")
    def test_quiz_generation_removes_repeated_questions_and_choice_sets(self, call_groq):
        content = json.dumps({"items": [
            {
                "question": "Quel est le rôle principal du protocole TCP ?",
                "choices": ["Fiabilité", "Routage", "Chiffrement", "Compression"],
                "correct_answer": "Fiabilité",
                "explanation": "TCP assure la fiabilité.",
            },
            {
                "question": "Quel est le rôle principal de TCP ?",
                "choices": ["Connexion", "Diffusion", "Adressage", "Encodage"],
                "correct_answer": "Connexion",
                "explanation": "Question reformulée.",
            },
            {
                "question": "Que fait le protocole UDP ?",
                "choices": ["La fiabilité", "Le routage", "Le chiffrement", "La compression"],
                "correct_answer": "Le routage",
                "explanation": "Choix répétés.",
            },
            {
                "question": "Quelle propriété caractérise UDP ?",
                "choices": ["Rapidité", "Accusé de réception", "Connexion persistante", "Retransmission"],
                "correct_answer": "Rapidité",
                "explanation": "UDP privilégie la rapidité.",
            },
        ]}, ensure_ascii=False)
        call_groq.return_value = content

        questions = generate_quiz_with_groq(
            [{"question": "Source", "answer": "Answer", "difficulty": "easy"}],
            count=4,
        )

        self.assertEqual(
            [question["question"] for question in questions],
            [
                "Quel est le rôle principal du protocole TCP ?",
                "Quelle propriété caractérise UDP ?",
            ],
        )

    @patch("ai_service.quiz.call_groq_json")
    def test_quiz_deduplicates_source_and_oversamples_before_filtering(self, call_groq):
        call_groq.return_value = json.dumps({"items": []})
        flashcards = [
            {"question": "Question répétée", "answer": "Même réponse", "difficulty": "easy"},
            {"question": "Question répétée reformulée", "answer": "Même réponse", "difficulty": "easy"},
            {"question": "Question distincte", "answer": "Réponse distincte", "difficulty": "medium"},
        ]

        generate_quiz_with_groq(flashcards, count=2)

        prompt = call_groq.call_args.args[0]
        self.assertEqual(prompt.count('"question": "Question répétée"'), 1)
        self.assertNotIn("Question répétée reformulée", prompt)
        self.assertIn("jusqu'à 5 questions", prompt)


class ChunkingTests(SimpleTestCase):
    def test_balanced_contexts_cover_beginning_middle_and_end_with_bounded_calls(self):
        text = " ".join(
            f"Section {index} contient une explication suffisamment longue."
            for index in range(30)
        )

        contexts = build_balanced_contexts(
            text,
            max_contexts=3,
            chunk_chars=120,
            context_chars=1000,
        )

        self.assertLessEqual(len(contexts), 3)
        joined = " ".join(contexts)
        self.assertIn("Section 0", joined)
        self.assertIn("Section 15", joined)
        self.assertIn("Section 29", joined)

    def test_pdf_retrieval_uses_relevant_late_chunk(self):
        text = (
            "Introduction générale sans réponse. " * 20
            + "Le chiffrement asymétrique utilise une clé publique et une clé privée. "
            + "Conclusion générale. " * 20
        )

        chunks = select_relevant_chunks(text, "Quelle clé utilise le chiffrement asymétrique?", max_chunks=1, max_chars=250)

        self.assertIn("clé publique", chunks[0])

    def test_flashcard_prompt_does_not_truncate_input(self):
        marker = "MARQUEUR_FIN_DOCUMENT"
        prompt = build_flashcards_prompt("Cours " + ("x" * 9000) + marker, 5)

        self.assertIn(marker, prompt)

    @patch("ai_service.pdf_chat.call_groq_text", return_value="Réponse")
    def test_pdf_chat_makes_one_call_with_relevant_late_context(self, call_groq):
        text = (
            "Introduction générale sans réponse. " * 20
            + "Le chiffrement asymétrique utilise une clé publique et une clé privée. "
            + "Conclusion générale. " * 20
        )

        answer = ask_pdf_with_groq(text, "Quelle clé utilise le chiffrement asymétrique?")

        self.assertEqual(answer, "Réponse")
        call_groq.assert_called_once()
        self.assertIn("clé publique", call_groq.call_args.args[0])

    @patch("ai_service.planning.call_groq_json", return_value='{"sessions": []}')
    def test_planning_samples_across_full_deck(self, call_groq):
        flashcards = [
            {
                "question": f"Question distincte {index}",
                "answer": f"Réponse distincte {index}",
                "difficulty": "medium",
            }
            for index in range(30)
        ]

        generate_revision_plan_with_groq(
            "Deck",
            flashcards,
            [{"day": "Lundi", "start_time": "09:00", "end_time": "10:00"}],
            "2026-07-01",
            "medium",
        )

        prompt = call_groq.call_args.args[0]
        self.assertIn("Question distincte 0", prompt)
        self.assertIn("Question distincte 29", prompt)


class FlashcardPipelineTests(SimpleTestCase):
    @patch("ai_service.pipeline.build_balanced_contexts", return_value=["Cours utile"])
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
        self.assertEqual(generate.call_args_list[1].kwargs["count"], 7)

    @patch("ai_service.pipeline.build_balanced_contexts", return_value=["Cours utile"])
    @patch("ai_service.pipeline.generate_flashcards_with_groq")
    def test_pipeline_discards_duplicate_questions_between_retries(self, generate, _split):
        generate.return_value = [
            {"question": "Same question", "answer": "Answer", "difficulty": "easy"},
        ]

        cards = generate_flashcards_pipeline("Cours", count=5)

        self.assertEqual(len(cards), 2)
        self.assertEqual(len({card["question"] for card in cards}), 2)
        self.assertEqual(generate.call_count, 3)

    @patch("ai_service.pipeline.build_balanced_contexts", return_value=["Début du cours.", "Milieu du cours.", "Fin du cours."])
    @patch("ai_service.pipeline.generate_flashcards_with_groq")
    def test_pipeline_processes_every_pdf_chunk(self, generate, _split):
        generate.side_effect = lambda text, **_options: [{
            "question": f"Question sur {text}",
            "answer": text,
            "difficulty": "medium",
        }]

        cards = generate_flashcards_pipeline("Cours complet", count=3)

        self.assertEqual(len(cards), 3)
        self.assertEqual(
            [call.args[0] for call in generate.call_args_list],
            ["Début du cours.", "Milieu du cours.", "Fin du cours."],
        )

    @patch("ai_service.pipeline.build_balanced_contexts", return_value=["Cours complet"])
    @patch("ai_service.pipeline.generate_flashcards_with_groq", side_effect=RuntimeError("provider down"))
    def test_pipeline_fills_requested_count_when_source_has_distinct_material(
        self, _generate, _split
    ):
        text = (
            "TCP garantit la livraison fiable des données entre deux machines. "
            "UDP privilégie la rapidité et ne confirme pas chaque paquet transmis. "
            "Le routage sélectionne un chemin pour acheminer les paquets sur le réseau. "
            "Le chiffrement protège le contenu des messages contre une lecture non autorisée. "
            "La compression réduit la quantité de données nécessaire à la transmission."
        )

        cards = generate_flashcards_pipeline(text, count=5)

        self.assertEqual(len(cards), 5)
        self.assertTrue(all(card["question"] and card["answer"] for card in cards))


class SummaryGenerationTests(SimpleTestCase):
    @patch("ai_service.summary.build_balanced_contexts", return_value=["Début", "Milieu", "Fin"])
    @patch("ai_service.summary.synthesize_summary_lines")
    @patch("ai_service.summary.request_summary_facts")
    def test_summary_processes_all_chunks_and_synthesizes_once(
        self, request_facts, synthesize, _chunks
    ):
        request_facts.side_effect = [
            ["Résumé du début", "Autre point du début"],
            ["Résumé du milieu", "Autre point du milieu"],
            ["Résumé de la fin", "Autre point de la fin"],
        ]
        synthesize.return_value = [
            "Idée 1", "Idée 2", "Idée 3", "Idée 4", "À retenir : Idée 5",
        ]

        summary = generate_summary_with_groq("Cours complet.", line_count=5)

        self.assertEqual(request_facts.call_count, 3)
        self.assertGreaterEqual(request_facts.call_args_list[0].args[1], 6)
        synthesize.assert_called_once()
        self.assertEqual(len(summary.splitlines()), 5)
        self.assertTrue(summary.splitlines()[-1].startswith("- À retenir :"))

    @patch("ai_service.summary.build_balanced_contexts", return_value=["Section"])
    @patch("ai_service.summary.synthesize_summary_lines", return_value=[])
    @patch("ai_service.summary.request_summary_facts")
    def test_summary_does_not_repeat_filler_to_reach_requested_count(
        self, request_facts, _synthesize, _chunks
    ):
        request_facts.return_value = [
            "TCP garantit une transmission fiable des données",
            "UDP privilégie une transmission rapide sans connexion",
        ]

        summary = generate_summary_with_groq("Texte trop court.", line_count=10)

        self.assertEqual(len(summary.splitlines()), 2)
