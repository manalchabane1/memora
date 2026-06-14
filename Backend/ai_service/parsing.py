import json
import logging
import re

from .similarity import unique_texts
from .text_cleaning import normalize_text


logger = logging.getLogger(__name__)


def recover_json_objects(text):
    decoder = json.JSONDecoder()
    recovered = []
    for index, character in enumerate(text):
        if character != "{":
            continue
        try:
            value, _ = decoder.raw_decode(text[index:])
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict) and value:
            recovered.append(value)
    return recovered


def extract_json_array(text):
    if not text:
        return []
    cleaned = text.strip().replace("```json", "").replace("```", "").strip()
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict):
            for key in ("items", "flashcards", "questions", "sessions"):
                value = parsed.get(key)
                if isinstance(value, list):
                    return value
    except json.JSONDecodeError as error:
        logger.warning("Could not parse AI response as JSON: %s", error)

    match = re.search(r"\[.*\]", cleaned, re.DOTALL)
    if match:
        try:
            parsed = json.loads(match.group(0))
            if isinstance(parsed, list):
                return parsed
        except json.JSONDecodeError:
            pass

    recovered = recover_json_objects(cleaned)
    if recovered:
        logger.warning("Recovered %s complete object(s) from malformed AI JSON", len(recovered))
        return recovered
    logger.warning("No usable JSON items found in AI response")
    return []


def extract_json_lines(content, key):
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        return []
    if not isinstance(parsed, dict) or not isinstance(parsed.get(key), list):
        return []
    return unique_texts(parsed[key])


def match_correct_answer(value, choices):
    answer = normalize_text(value)
    if not answer:
        return ""
    if answer in choices:
        return answer
    case_insensitive = {choice.lower(): choice for choice in choices}
    if answer.lower() in case_insensitive:
        return case_insensitive[answer.lower()]
    letter_match = re.match(r"^([A-D])(?:[\s).:\-]|$)", answer, re.IGNORECASE)
    if letter_match:
        return choices[ord(letter_match.group(1).upper()) - ord("A")]
    return ""
