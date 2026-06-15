import logging

from groq import RateLimitError

from .chunking import build_balanced_contexts, evenly_select
from .flashcards import (
    extract_flashcard_facts_with_groq,
    generate_flashcards_from_facts_with_groq,
)
from .similarity import unique_texts
from .text_cleaning import clean_text
from .validators import deduplicate_flashcards


logger = logging.getLogger(__name__)

MAX_SOURCE_CHUNKS = 8
FACTS_PER_CHUNK = 8
SOURCE_CHUNK_SIZE = 4000


def interleave_batches(batches):
    interleaved = []
    max_size = max((len(batch) for batch in batches), default=0)
    for index in range(max_size):
        for batch in batches:
            if index < len(batch):
                interleaved.append(batch[index])
    return interleaved


def build_flashcard_fallbacks(text, existing_cards, count, difficulty="all"):
    # Kept for courses.views import compatibility. Raw-text cards are unreliable.
    return []


def _select_facts(fact_batches, count):
    merged_facts = unique_texts(interleave_batches(fact_batches), threshold=0.8)
    fact_limit = max(count * 3, 30)
    return evenly_select(merged_facts, min(len(merged_facts), fact_limit))


def _generate_cards(facts, count, difficulty, focus, previous_questions=None):
    return generate_flashcards_from_facts_with_groq(
        facts,
        count=count,
        difficulty=difficulty,
        focus=focus,
        previous_questions=previous_questions,
    )


def generate_flashcards_pipeline(text, count=10, difficulty="all", focus=""):
    cleaned_text = clean_text(text)
    if not cleaned_text or count <= 0:
        return []

    source_chunks = build_balanced_contexts(
        cleaned_text,
        max_contexts=MAX_SOURCE_CHUNKS,
        chunk_chars=SOURCE_CHUNK_SIZE,
    )
    if not source_chunks:
        return []

    fact_batches = []
    for chunk in source_chunks[:MAX_SOURCE_CHUNKS]:
        try:
            facts = extract_flashcard_facts_with_groq(
                chunk,
                fact_count=FACTS_PER_CHUNK,
                focus=focus,
            )
        except RateLimitError:
            logger.warning("Groq rate limit reached while extracting flashcard facts.")
            return []
        except Exception:
            logger.exception("Flashcard fact extraction failed for one source chunk.")
            continue
        if facts:
            fact_batches.append(facts)

    selected_facts = _select_facts(fact_batches, count)
    if not selected_facts:
        return []

    primary_fact_count = min(len(selected_facts), max(count * 2, 20))
    primary_facts = selected_facts[:primary_fact_count]
    remaining_facts = selected_facts[primary_fact_count:]

    try:
        cards = _generate_cards(primary_facts, count, difficulty, focus)
    except RateLimitError:
        logger.warning("Groq rate limit reached while generating flashcards.")
        return []
    except Exception:
        logger.exception("Flashcard generation from facts failed.")
        return []

    cards = deduplicate_flashcards(cards)[:count]
    missing_count = count - len(cards)
    if missing_count <= 0:
        return cards

    repair_facts = remaining_facts or selected_facts
    previous_questions = [card["question"] for card in cards]
    try:
        repair_cards = _generate_cards(
            repair_facts,
            missing_count,
            difficulty,
            focus,
            previous_questions=previous_questions,
        )
    except RateLimitError:
        logger.warning("Groq rate limit reached during flashcard repair.")
        return cards
    except Exception:
        logger.exception("Flashcard repair call failed.")
        return cards

    return deduplicate_flashcards(cards + repair_cards)[:count]
