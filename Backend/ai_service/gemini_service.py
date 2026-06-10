import os
import json
import logging
from dotenv import load_dotenv
from google import genai
import time

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
client = None
logger = logging.getLogger(__name__)


def get_client():
    global client
    if client is None:
        if not API_KEY:
            raise ValueError("Missing GEMINI_API_KEY in .env")
        client = genai.Client(api_key=API_KEY)
    return client


def generate_flashcards_with_gemini(text):

    prompt = f"""
Tu es un assistant pédagogique.

Crée 5 flashcards simples à partir du cours suivant.

Réponds UNIQUEMENT avec un JSON valide.

Format :
[
  {{
    "question": "Question",
    "answer": "Réponse",
    "difficulty": "easy"
  }}
]

Cours :
{text}
"""

    try:
        response = get_client().models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )

        raw_text = response.text.strip()

        raw_text = raw_text.replace("```json", "")
        raw_text = raw_text.replace("```", "")
        raw_text = raw_text.strip()

        cards = json.loads(raw_text)

        return cards

    except Exception as e:
        logger.exception("Gemini flashcard generation failed")

        return []



def generate_summary_with_gemini(text):
    prompt = f""" 
Tu es un assistant de révision. Résume clairement ce cours pour un étudiant.
Le résumé doit être structuré avec :
-les idées principales 
-les notions importantes
-les points à retenir

Cours:
{text}
"""
    
    for attempt in range(3):
        try :
            response = get_client().models.generate_content(
                model="gemini-2.5-flash",contents =prompt,
            )
            return response.text.strip()
        except Exception:
            logger.exception("Gemini summary attempt %s failed", attempt + 1)
            time.sleep(2)

    return ""        


def ask_pdf_with_gemini(text, question):
    prompt = f"""
Tu es un assistant pédagogique.
Réponds à la question de l'étudiant uniquement à partir du cours fourni.

Si la réponse n'est pas dans le cours, dis :
"Je ne trouve pas cette information dans le document."

Cours :
{text}

Question :
{question}

Réponse claire et concise :
"""

    for attempt in range(3):
        try:
            response = get_client().models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )
            return response.text.strip()

        except Exception:
            logger.exception("Gemini question attempt %s failed", attempt + 1)
            time.sleep(2)

    return "Erreur : impossible de générer une réponse."


def generate_quiz_with_gemini(text):
    prompt = f"""
Tu es un générateur de quiz pour étudiants.

À partir du cours ci-dessous, génère exactement 5 questions QCM.

Réponds uniquement en JSON valide, sans markdown, sous cette forme :
[
  {{
    "question": "Question ?",
    "options": ["A", "B", "C", "D"],
    "answer": 0,
    "hint": "Indice court"
  }}
]

Important :
- answer est l'index de la bonne réponse entre 0 et 3
- les options doivent être plausibles
- les questions doivent être utiles pour réviser

Cours :
{text}
"""

    for attempt in range(3):
        try:
            response = get_client().models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )

            raw_text = response.text.strip()
            raw_text = raw_text.replace("```json", "").replace("```", "").strip()

            return json.loads(raw_text)

        except Exception:
            logger.exception("Gemini quiz attempt %s failed", attempt + 1)
            time.sleep(2)

    return []


def generate_personal_quiz_with_gemini(topic):
    prompt = f"""
Tu es un générateur de quiz pour étudiants.

Génère exactement 5 questions QCM sur le sujet :
"{topic}"

Réponds uniquement en JSON valide sous cette forme :

[
  {{
    "question": "Question ?",
    "options": ["A", "B", "C", "D"],
    "answer": 0,
    "hint": "Petit indice"
  }}
]

Important :
- answer = index entre 0 et 3
- questions pédagogiques
- réponses plausibles
"""

    for attempt in range(3):
        try:
            response = get_client().models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
            )

            raw_text = response.text.strip()
            raw_text = raw_text.replace("```json", "").replace("```", "").strip()

            return json.loads(raw_text)

        except Exception:
            logger.exception("Gemini personal quiz attempt %s failed", attempt + 1)
            time.sleep(2)

    return []
