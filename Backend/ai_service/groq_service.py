import json
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from groq import Groq


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise ValueError("GROQ_API_KEY not found in Backend/.env")


client = Groq(api_key=api_key)

MODEL = "llama-3.1-8b-instant"


def extract_json_array(text):
    match = re.search(r"\[.*\]", text, re.DOTALL)

    if not match:
        return []

    return json.loads(match.group(0))


def generate_flashcards_with_groq(text):
    prompt = f"""
Tu es un assistant pédagogique.

Génère des flashcards à partir du cours suivant.

Réponds UNIQUEMENT avec un JSON valide.
Pas de markdown.
Pas d'explication.

Format obligatoire:
[
  {{
    "question": "...",
    "answer": "...",
    "difficulty": "easy"
  }}
]

difficulty doit être:
easy, medium ou hard.

Cours:
{text[:8000]}
"""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": "Tu réponds uniquement avec du JSON valide."
            },
            {
                "role": "user",
                "content": prompt
            },
        ],
        temperature=0.2,
    )

    content = response.choices[0].message.content

    return extract_json_array(content)