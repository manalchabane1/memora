from .text_cleaning import clean_text
from .chunking import split_text
from .groq_service import generate_flashcards_with_groq


def generate_flashcards_pipeline(text):
    cleaned_text = clean_text(text)
    chunks = split_text(cleaned_text)

    all_flashcards = []

    for chunk in chunks[:1]:
        cards = generate_flashcards_with_groq(chunk)
        all_flashcards.extend(cards)

    return all_flashcards