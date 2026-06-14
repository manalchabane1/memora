import math
import logging

from .text_cleaning import clean_text
from .chunking import build_balanced_contexts
from .flashcards import generate_flashcards_with_groq
from .similarity import contains_similar_text

logger = logging.getLogger(__name__)

GENERATION_BATCH_SIZE = 8
SOURCE_CHUNK_SIZE = 7000


def interleave_batches(batches):
    interleaved = []
    max_size = max((len(batch) for batch in batches), default=0)

    for index in range(max_size):
        for batch in batches:
            if index < len(batch):
                interleaved.append(batch[index])

    return interleaved


def build_flashcard_fallbacks(text, existing_cards, count, difficulty="all"):
    # Kept for courses.views import compatibility.
    # No raw fallback, because it creates ugly "Explique ce passage" cards.
    return []


def add_unique_cards(target, cards, seen_questions, seen_answers=None):
    if seen_answers is None:
        seen_answers = []

    added = 0

    for card in cards or []:
        if not isinstance(card, dict):
            continue

        question = (card.get("question") or "").strip()
        answer = (card.get("answer") or "").strip()
        difficulty = (card.get("difficulty") or "medium").strip().lower()

        if not question or not answer:
            continue

        if difficulty not in {"easy", "medium", "hard"}:
            difficulty = "medium"

        if contains_similar_text(question, seen_questions, threshold=0.62):
            continue

        if contains_similar_text(answer, seen_answers, threshold=0.82):
            continue

        seen_questions.append(question)
        seen_answers.append(answer)

        target.append({
            "question": question,
            "answer": answer,
            "difficulty": difficulty,
        })

        added += 1

    return added


def request_flashcards(chunk, count, difficulty, focus):
    try:
        cards = generate_flashcards_with_groq(
            chunk,
            count=count,
            difficulty=difficulty,
            focus=focus,
        )
        logger.info("Flashcard request: asked=%s received=%s", count, len(cards or []))
        return cards
    except Exception:
        logger.exception("Flashcard generation attempt failed")
        return []


def build_retry_focus(base_focus, remaining, existing_cards):
    previous_questions = "; ".join(
        card["question"] for card in existing_cards[-20:]
    )

    return (
        f"{base_focus}. "
        f"Il manque encore {remaining} flashcards. "
        f"Génère de nouvelles flashcards différentes, sur des notions importantes du cours. "
        f"Ne réutilise pas les mêmes idées. "
        f"N'utilise pas de titres seuls, sommaires, emails, noms d'enseignants, universités ou plans de cours. "
        f"Ne crée pas de question vague du type 'Explique ce passage'. "
        f"Évite absolument ces questions déjà générées : {previous_questions}"
    ).strip()


def generate_ai_fallback_cards(source_chunks, existing_cards, count, difficulty, focus):
    missing = count - len(existing_cards)

    if missing <= 0:
        return []

    fallback_cards = []
    seen_questions = [card["question"] for card in existing_cards]
    seen_answers = [card["answer"] for card in existing_cards]

    max_attempts = max(6, len(source_chunks))

    for attempt in range(max_attempts):
        missing = count - len(existing_cards) - len(fallback_cards)

        if missing <= 0:
            break

        chunk = source_chunks[attempt % len(source_chunks)]

        fallback_focus = build_retry_focus(
            focus,
            missing,
            existing_cards + fallback_cards,
        )

        cards = request_flashcards(
            chunk,
            min(missing + 6, GENERATION_BATCH_SIZE),
            difficulty,
            fallback_focus,
        )

        add_unique_cards(
            fallback_cards,
            cards,
            seen_questions,
            seen_answers,
        )

    return fallback_cards


def generate_flashcards_pipeline(text, count=10, difficulty="all", focus=""):
    cleaned_text = clean_text(text)

    if not cleaned_text:
        return []

    source_chunks = build_balanced_contexts(
        cleaned_text,
        max_contexts=min(16, max(4, count)),
        chunk_chars=SOURCE_CHUNK_SIZE,
    )

    if not source_chunks:
        return []

    all_flashcards = []
    seen_questions = []
    seen_answers = []

    cards_per_chunk = max(
        3,
        math.ceil((count * 2) / len(source_chunks)),
    )

    first_pass_batches = []

    for chunk in source_chunks:
        first_pass_batches.append(
            request_flashcards(
                chunk,
                min(cards_per_chunk + 3, GENERATION_BATCH_SIZE),
                difficulty,
                focus,
            )
        )

    add_unique_cards(
        all_flashcards,
        interleave_batches(first_pass_batches),
        seen_questions,
        seen_answers,
    )

    max_attempts = max(10, len(source_chunks) * 3)

    for attempt in range(max_attempts):
        remaining = count - len(all_flashcards)

        if remaining <= 0:
            break

        chunk = source_chunks[attempt % len(source_chunks)]

        retry_focus = build_retry_focus(
            focus,
            remaining,
            all_flashcards,
        )

        cards = request_flashcards(
            chunk,
            min(remaining + 6, GENERATION_BATCH_SIZE),
            difficulty,
            retry_focus,
        )

        add_unique_cards(
            all_flashcards,
            cards,
            seen_questions,
            seen_answers,
        )

    if len(all_flashcards) < count:
        fallback_cards = generate_ai_fallback_cards(
            source_chunks,
            all_flashcards,
            count,
            difficulty,
            focus,
        )

        add_unique_cards(
            all_flashcards,
            fallback_cards,
            seen_questions,
            seen_answers,
        )

    return all_flashcards[:count]