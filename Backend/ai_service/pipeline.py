import math
import re

from .text_cleaning import clean_text
from .chunking import split_text
from .groq_service import contains_similar_text, generate_flashcards_with_groq


GENERATION_BATCH_SIZE = 8
SOURCE_CHUNK_SIZE = 7000
MAX_SOURCE_CHUNKS = 8
OVERGENERATION_FACTOR = 2


def interleave_batches(batches):
    interleaved = []
    max_size = max((len(batch) for batch in batches), default=0)

    for index in range(max_size):
        for batch in batches:
            if index < len(batch):
                interleaved.append(batch[index])

    return interleaved


def evenly_select(items, count):
    if len(items) <= count:
        return items

    if count == 1:
        return [items[len(items) // 2]]

    return [
        items[round(index * (len(items) - 1) / (count - 1))]
        for index in range(count)
    ]


def normalize_card(card, difficulty="all"):
    if not isinstance(card, dict):
        return None

    question = (card.get("question") or "").strip()
    answer = (card.get("answer") or "").strip()
    card_difficulty = (card.get("difficulty") or "medium").strip().lower()

    if not question or not answer:
        return None

    if card_difficulty not in ["easy", "medium", "hard"]:
        card_difficulty = "medium"

    if difficulty != "all":
        card_difficulty = difficulty

    return {
        "question": question,
        "answer": answer,
        "difficulty": card_difficulty,
    }


def add_unique_cards(target, cards, seen_questions, seen_answers, difficulty="all"):
    for card in cards or []:
        normalized = normalize_card(card, difficulty)

        if not normalized:
            continue

        question = normalized["question"]
        answer = normalized["answer"]

        if contains_similar_text(question, seen_questions, threshold=0.72):
            continue

        if contains_similar_text(answer, seen_answers, threshold=0.74):
            continue

        seen_questions.append(question)
        seen_answers.append(answer)
        target.append(normalized)


def request_flashcards(chunk, count, difficulty, focus):
    try:
        return generate_flashcards_with_groq(
            chunk,
            count=count,
            difficulty=difficulty,
            focus=focus,
        )
    except Exception:
        return []


def select_source_chunks(chunks, count):
    if not chunks:
        return []

    useful_chunk_count = min(
        len(chunks),
        max(1, min(MAX_SOURCE_CHUNKS, count))
    )

    return evenly_select(chunks, useful_chunk_count)


def build_flashcard_fallbacks(text, existing_cards, count, difficulty="all"):
    missing = count - len(existing_cards)

    if missing <= 0:
        return []

    snippets = [
        sentence.strip()
        for sentence in re.split(r"(?<=[.!?])\s+", text)
        if 50 <= len(sentence.strip()) <= 700
    ]

    if not snippets:
        snippets = [
            text[index:index + 500].strip()
            for index in range(0, len(text), 500)
        ]

    snippets = [snippet for snippet in snippets if snippet]
    snippets = evenly_select(snippets, missing * 2)

    used_questions = [
        (card.get("question") or "").strip()
        for card in existing_cards
        if isinstance(card, dict)
    ]

    used_answers = [
        (card.get("answer") or "").strip()
        for card in existing_cards
        if isinstance(card, dict)
    ]

    fallback_difficulties = ["easy", "medium", "hard"]
    fallbacks = []

    for index, snippet in enumerate(snippets):
        if len(fallbacks) >= missing:
            break

        question = "Quelle est l'idée principale de ce passage du cours ?"
        if index > 0:
            question = f"Quelle notion importante peut-on retenir du passage {index + 1} ?"

        if contains_similar_text(question, used_questions, threshold=0.72):
            continue

        if contains_similar_text(snippet, used_answers, threshold=0.74):
            continue

        used_questions.append(question)
        used_answers.append(snippet)

        fallbacks.append({
            "question": question,
            "answer": snippet[:700],
            "difficulty": (
                fallback_difficulties[index % len(fallback_difficulties)]
                if difficulty == "all"
                else difficulty
            ),
        })

    return fallbacks


def generate_flashcards_pipeline(text, count=10, difficulty="all", focus=""):
    cleaned_text = clean_text(text)

    if not cleaned_text:
        return []

    source_chunks = split_text(cleaned_text, max_chars=SOURCE_CHUNK_SIZE)

    if not source_chunks:
        return []

    selected_chunks = select_source_chunks(source_chunks, count)

    all_flashcards = []
    seen_questions = []
    seen_answers = []

    target_generation_count = max(
        count * OVERGENERATION_FACTOR,
        count + 6
    )

    cards_per_chunk = max(
        3,
        math.ceil(target_generation_count / len(selected_chunks))
    )

    first_pass_batches = []

    for chunk in selected_chunks:
        first_pass_batches.append(
            request_flashcards(
                chunk,
                min(cards_per_chunk, GENERATION_BATCH_SIZE),
                difficulty,
                focus,
            )
        )

    add_unique_cards(
        all_flashcards,
        interleave_batches(first_pass_batches),
        seen_questions,
        seen_answers,
        difficulty,
    )

    max_retries = 4

    for attempt in range(max_retries):
        remaining = count - len(all_flashcards)

        if remaining <= 0:
            break

        chunk = selected_chunks[attempt % len(selected_chunks)]

        previous_questions = "; ".join(
            card["question"] for card in all_flashcards[-12:]
        )

        retry_focus = (
            f"{focus}. "
            f"Il manque encore {remaining} flashcards. "
            f"Génère de nouvelles questions différentes. "
            f"Évite ces questions déjà générées : {previous_questions}"
        ).strip()

        cards = request_flashcards(
            chunk,
            min(remaining + 5, GENERATION_BATCH_SIZE),
            difficulty,
            retry_focus,
        )

        add_unique_cards(
            all_flashcards,
            cards,
            seen_questions,
            seen_answers,
            difficulty,
        )

    selected_cards = evenly_select(all_flashcards, count)

    if len(selected_cards) < count:
        selected_cards.extend(
            build_flashcard_fallbacks(
                cleaned_text,
                selected_cards,
                count,
                difficulty,
            )
        )

    return selected_cards[:count]