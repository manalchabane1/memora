from .text_cleaning import clean_text
from .chunking import split_text
from .groq_service import generate_flashcards_with_groq

GENERATION_BATCH_SIZE = 8


def generate_flashcards_pipeline(text, count=10, difficulty="all", focus=""):
    cleaned_text = clean_text(text)
    chunks = split_text(cleaned_text, max_chars=7000)

    all_flashcards = []
    seen_questions = set()

    source_chunks = chunks[:3]
    if not source_chunks:
        return []

    max_attempts = ((count + GENERATION_BATCH_SIZE - 1) // GENERATION_BATCH_SIZE) + 3

    for attempt in range(max_attempts):
        remaining = count - len(all_flashcards)
        if remaining <= 0:
            break
        chunk = source_chunks[attempt % len(source_chunks)]
        retry_focus = focus
        if all_flashcards:
            previous_questions = "; ".join(
                card["question"] for card in all_flashcards[-10:]
            )
            retry_focus = (
                f"{focus} Évite absolument ces questions déjà générées : "
                f"{previous_questions}"
            ).strip()
        cards = generate_flashcards_with_groq(
            chunk,
            count=min(remaining, GENERATION_BATCH_SIZE),
            difficulty=difficulty,
            focus=retry_focus,
        )
        for card in cards:
            question_key = card.get("question", "").strip().lower()
            if question_key and question_key not in seen_questions:
                seen_questions.add(question_key)
                all_flashcards.append(card)
                if len(all_flashcards) >= count:
                    return all_flashcards

    return all_flashcards[:count]
