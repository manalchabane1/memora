import math

from .chunking import evenly_select
from .groq_service import call_groq_json
from .parsing import extract_json_array
from .prompts import JSON_ONLY_SYSTEM, build_personal_quiz_prompt, build_quiz_prompt
from .validators import deduplicate_flashcards, validate_quiz_questions


def _oversampled_count(count):
    return min(16, max(count + 3, math.ceil(count * 1.5)))


def generate_quiz_with_groq(flashcards, count=10, difficulty="medium", instructions=""):
    distinct_flashcards = deduplicate_flashcards(flashcards)
    representative_flashcards = evenly_select(distinct_flashcards, min(len(distinct_flashcards), 40))
    if not representative_flashcards:
        return []
    requested_count = _oversampled_count(count)
    content = call_groq_json(
        build_quiz_prompt(representative_flashcards, requested_count, difficulty, instructions),
        JSON_ONLY_SYSTEM,
        temperature=0.1,
    )
    return validate_quiz_questions(extract_json_array(content), count=count)


def generate_personal_quiz_with_groq(topic, count=10, difficulty="medium", instructions=""):
    requested_count = _oversampled_count(count)
    content = call_groq_json(
        build_personal_quiz_prompt(topic, requested_count, difficulty, instructions),
        JSON_ONLY_SYSTEM,
        temperature=0.1,
    )
    return validate_quiz_questions(extract_json_array(content), count=count)
