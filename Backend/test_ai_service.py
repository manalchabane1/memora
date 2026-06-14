import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "memora_api.settings")
django.setup()

from ai_service.flashcards import generate_flashcards_with_groq
from ai_service.quiz import generate_quiz_with_groq
from ai_service.summary import generate_summary_with_groq


sample_course = """
La calculabilité étudie ce qui peut être résolu par un algorithme.
Un problème est dit décidable s'il existe un algorithme qui donne toujours une réponse correcte en temps fini.
Le problème de l'arrêt consiste à déterminer si un programme termine ou boucle indéfiniment.
Alan Turing a montré que le problème de l'arrêt est indécidable.
"""


def test_flashcards():
    print("\n=== TEST FLASHCARDS ===")
    cards = generate_flashcards_with_groq(sample_course)

    print(cards)

    assert isinstance(cards, list)
    assert len(cards) > 0

    first = cards[0]
    assert "question" in first
    assert "answer" in first
    assert "difficulty" in first

    print("✅ Flashcards OK")


def test_summary():
    print("\n=== TEST SUMMARY ===")
    summary = generate_summary_with_groq(sample_course)

    print(summary)

    assert isinstance(summary, str)
    assert len(summary.strip()) > 0

    print("✅ Summary OK")


def test_quiz():
    print("\n=== TEST QUIZ ===")

    flashcards = [
        {
            "question": "Qu'est-ce que la calculabilité ?",
            "answer": "L'étude de ce qui peut être résolu par un algorithme.",
            "difficulty": "easy",
        },
        {
            "question": "Qu'est-ce qu'un problème décidable ?",
            "answer": "Un problème pour lequel il existe un algorithme donnant toujours une réponse correcte en temps fini.",
            "difficulty": "medium",
        },
        {
            "question": "Qui a montré que le problème de l'arrêt est indécidable ?",
            "answer": "Alan Turing.",
            "difficulty": "medium",
        },
    ]

    quiz = generate_quiz_with_groq(flashcards)

    print(quiz)

    assert isinstance(quiz, list)
    assert len(quiz) > 0

    first = quiz[0]
    assert "question" in first
    assert "choices" in first
    assert "correct_answer" in first
    assert "explanation" in first
    assert len(first["choices"]) == 4
    assert first["correct_answer"] in first["choices"]

    print("✅ Quiz OK")


if __name__ == "__main__":
    test_flashcards()
    test_summary()
    test_quiz()

    print("\n🎉 All AI service tests passed")
