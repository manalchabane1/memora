from .groq_service import call_groq_json
from .parsing import extract_json_array
from .prompts import JSON_ONLY_SYSTEM, build_flashcards_prompt
from .validators import validate_flashcards


def generate_flashcards_with_groq(text, count=10, difficulty="all", focus=""):
    content = call_groq_json(
        build_flashcards_prompt(text, count + 4, difficulty, focus),
        JSON_ONLY_SYSTEM,
        temperature=0.1,
    )
    return validate_flashcards(extract_json_array(content))