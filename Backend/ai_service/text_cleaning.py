import re
import unicodedata


ADMIN_PATTERNS = (
    r"\b(?:enseignant|professeur|email|e-mail|horaire|bibliographie)\s*[:\-].*",
    r"\b(?:modalités?|évaluation|examen)\s*[:\-].*",
)


def normalize_text(value):
    if not isinstance(value, str):
        return ""
    return " ".join(value.strip().split())


def canonical_text(value):
    normalized = unicodedata.normalize("NFKD", normalize_text(value).lower())
    ascii_text = "".join(
        character for character in normalized
        if not unicodedata.combining(character)
    )
    return re.sub(r"[^a-z0-9]+", " ", ascii_text).strip()


def clean_text(text):
    if not isinstance(text, str):
        return ""
    text = re.sub(r"https?://\S+|www\.\S+", " ", text)
    text = re.sub(r"(?im)^\s*(?:page\s+)?\d+\s*(?:/\s*\d+)?\s*$", " ", text)
    for pattern in ADMIN_PATTERNS:
        text = re.sub(pattern, " ", text, flags=re.IGNORECASE)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\s*\n\s*", "\n", text)
    return text.strip()


def meaningful_sentences(text):
    excluded_terms = (
        "bibliographie", "http", "www.", "modalité", "examen", "enseignant",
        "professeur", "email", "horaire", "année universitaire",
    )
    candidates = []
    for sentence in re.split(r"(?<=[.!?])\s+", clean_text(text)):
        normalized = normalize_text(sentence)
        lowered = normalized.lower()
        if not 40 <= len(normalized) <= 350:
            continue
        if any(term in lowered for term in excluded_terms):
            continue
        if len(re.findall(r"[A-Za-zÀ-ÿ]{3,}", normalized)) < 6:
            continue
        candidates.append(normalized)
    return candidates

def remove_bad_course_metadata(text):
    text = re.sub(r"\S+@\S+", " ", text)
    text = re.sub(r"\b[A-Z][a-z]+ [A-Z][a-z]+\b", " ", text)
    text = re.sub(r"Université d[’']Aix[- ]Marseille.*", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"UFR Sciences.*", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"L3 Informatique.*", " ", text, flags=re.IGNORECASE)
    return text