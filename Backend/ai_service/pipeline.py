from .text_cleaning import clean_text
from .chunking import split_text
from .groq_service import generate_flashcards_with_groq


def generate_flashcards_pipeline(text):
    cleaned_text = clean_text(text)
    chunks = split_text(cleaned_text, max_chars=7000)

    all_flashcards = []
    seen_questions = set()

    for chunk in chunks[:3]:
        cards = generate_flashcards_with_groq(chunk)
        for card in cards:
            question_key = card.get("question", "").strip().lower()
            if question_key and question_key not in seen_questions:
                seen_questions.add(question_key)
                all_flashcards.append(card)

    return all_flashcards
