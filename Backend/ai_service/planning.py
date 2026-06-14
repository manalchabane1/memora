from .chunking import evenly_select
from .groq_service import call_groq_json
from .parsing import extract_json_array
from .prompts import JSON_ONLY_SYSTEM, build_revision_plan_prompt
from .validators import deduplicate_flashcards, validate_revision_sessions


def generate_revision_plan_with_groq(deck_title, flashcards, availabilities, exam_date, priority):
    distinct_flashcards = deduplicate_flashcards(flashcards)
    representative_flashcards = evenly_select(distinct_flashcards, min(len(distinct_flashcards), 20))
    content = call_groq_json(
        build_revision_plan_prompt(
            deck_title,
            representative_flashcards,
            availabilities,
            exam_date,
            priority,
        ),
        JSON_ONLY_SYSTEM,
        temperature=0.2,
    )
    return validate_revision_sessions(extract_json_array(content), priority)
