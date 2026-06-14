from .chunking import select_relevant_chunks
from .groq_service import call_groq_text
from .prompts import build_pdf_question_prompt


def ask_pdf_with_groq(text, question):
    relevant_chunks = select_relevant_chunks(text, question, max_chunks=4, max_chars=7000)
    context = "\n\n---\n\n".join(relevant_chunks)
    return call_groq_text(
        build_pdf_question_prompt(context, question),
        "Tu es un assistant pédagogique clair, précis et fidèle aux extraits fournis.",
        temperature=0.1,
    )
