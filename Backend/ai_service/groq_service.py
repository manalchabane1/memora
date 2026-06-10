import json
import logging
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from groq import Groq


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

api_key = os.getenv("GROQ_API_KEY")
client = None
logger = logging.getLogger(__name__)

MODEL = "llama-3.1-8b-instant"


def get_client():
    global client
    if client is None:
        if not api_key:
            raise ValueError("GROQ_API_KEY not found in Backend/.env")
        client = Groq(api_key=api_key)
    return client


def extract_json_array(text):
    if not text:
        return []

    cleaned = text.strip()
    cleaned = cleaned.replace("```json", "")
    cleaned = cleaned.replace("```", "")
    cleaned = cleaned.strip()

    match = re.search(r"\[.*\]", cleaned, re.DOTALL)

    if not match:
        logger.warning("No JSON array found in AI response")
        return []

    json_text = match.group(0)

    try:
        return json.loads(json_text)
    except json.JSONDecodeError as e:
        logger.warning("Could not parse AI response as JSON: %s", e)
        return []


def normalize_text(value):
    if not isinstance(value, str):
        return ""
    return " ".join(value.strip().split())


def has_duplicate_choices(choices):
    normalized = [normalize_text(choice).lower() for choice in choices]
    return len(normalized) != len(set(normalized))


def generate_flashcards_with_groq(text):
    prompt = f"""
Tu es un assistant pédagogique expert en création de supports de révision.

À partir du cours fourni, génère EXACTEMENT 10 flashcards utiles pour réviser.

Réponds uniquement avec un tableau JSON valide.
Ne mets aucun texte avant ou après le JSON.
Ne mets pas de markdown.
Ne mets pas de ```.

Format obligatoire:
[
  {{
    "question": "question claire et utile",
    "answer": "réponse courte, précise et correcte",
    "difficulty": "easy"
  }}
]

Contraintes:
- difficulty doit être exactement: easy, medium ou hard
- réponds uniquement en français
- privilégie les notions importantes: définitions, théorèmes, méthodes, mécanismes, concepts
- évite les détails administratifs: nom du prof, horaires, modalités d'évaluation, liens, bibliographie
- évite les questions trop faciles ou inutiles
- ne crée pas deux flashcards qui posent presque la même question
- aucun champ supplémentaire
- si le texte manque d'information, utilise seulement les notions disponibles sans inventer

Cours:
{text[:8000]}
"""

    response = get_client().chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": "Tu réponds uniquement avec un tableau JSON valide, sans markdown."
            },
            {
                "role": "user",
                "content": prompt
            },
        ],
        temperature=0.1,
    )

    content = response.choices[0].message.content
    cards = extract_json_array(content)

    valid_cards = []
    seen_questions = set()

    for card in cards:
        question = normalize_text(card.get("question"))
        answer = normalize_text(card.get("answer"))
        difficulty = normalize_text(card.get("difficulty", "medium")).lower()

        if not question or not answer:
            continue

        question_key = question.lower()

        if question_key in seen_questions:
            continue

        if difficulty not in ["easy", "medium", "hard"]:
            difficulty = "medium"

        seen_questions.add(question_key)

        valid_cards.append({
            "question": question,
            "answer": answer,
            "difficulty": difficulty,
        })

    return valid_cards


def generate_summary_with_groq(text):
    prompt = f"""
Tu es un assistant pédagogique expert en synthèse de cours.

Résume le cours suivant de manière claire, structurée et utile pour réviser.

Contraintes:
- réponds en français
- ne rajoute aucune information inventée
- évite les détails administratifs inutiles
- organise la réponse avec des titres courts
- mets en avant les définitions, théorèmes, méthodes, concepts importants
- ajoute une courte partie "À retenir" à la fin
- écris simplement, comme une fiche de révision

Cours:
{text[:10000]}
"""

    response = get_client().chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": "Tu es un assistant pédagogique clair, précis et structuré."
            },
            {
                "role": "user",
                "content": prompt
            },
        ],
        temperature=0.2,
    )

    return response.choices[0].message.content.strip()


def generate_quiz_with_groq(flashcards):
    prompt = f"""
Tu es un assistant pédagogique expert en création de QCM de révision.

À partir des flashcards suivantes, génère EXACTEMENT 10 questions de quiz QCM.

Réponds uniquement avec un tableau JSON valide.
Ne mets aucun texte avant ou après le JSON.
Ne mets pas de markdown.
Ne mets pas de ```.

Format obligatoire:
[
  {{
    "question": "question claire",
    "choices": ["choix A", "choix B", "choix C", "choix D"],
    "correct_answer": "choix A",
    "explanation": "explication courte"
  }}
]

Contraintes strictes:
- réponds uniquement en français
- chaque question doit avoir exactement 4 choix
- les 4 choix doivent être tous différents
- correct_answer doit être exactement égal à l'un des 4 choix
- une seule bonne réponse
- les mauvais choix doivent être plausibles mais clairement faux
- évite les choix presque identiques avec seulement quelques mots différents
- évite les questions sur le nom du professeur, les horaires, les liens, la bibliographie ou les modalités d'examen
- privilégie les définitions, théorèmes, méthodes, mécanismes et concepts
- varie la position de la bonne réponse: parfois A, parfois B, parfois C, parfois D
- l'explication doit justifier brièvement pourquoi la bonne réponse est correcte
- aucun champ supplémentaire

Flashcards:
{json.dumps(flashcards, ensure_ascii=False)}
"""

    response = get_client().chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": "Tu réponds uniquement avec un tableau JSON valide. Aucun markdown."
            },
            {
                "role": "user",
                "content": prompt
            },
        ],
        temperature=0.1,
    )

    content = response.choices[0].message.content
    questions = extract_json_array(content)

    valid_questions = []
    seen_questions = set()

    for question in questions:
        q_text = normalize_text(question.get("question"))
        choices = question.get("choices")
        correct_answer = normalize_text(question.get("correct_answer"))
        explanation = normalize_text(question.get("explanation", ""))

        if not q_text or not choices or not correct_answer:
            continue

        if not isinstance(choices, list):
            continue

        choices = [normalize_text(choice) for choice in choices]

        if len(choices) != 4:
            continue

        if any(not choice for choice in choices):
            continue

        if has_duplicate_choices(choices):
            continue

        if correct_answer not in choices:
            continue

        q_key = q_text.lower()

        if q_key in seen_questions:
            continue

        seen_questions.add(q_key)

        valid_questions.append({
            "question": q_text,
            "choices": choices,
            "correct_answer": correct_answer,
            "explanation": explanation,
        })

    return valid_questions


def generate_personal_quiz_with_groq(topic):
    prompt = f"""
Tu es un assistant pédagogique expert en création de QCM.

Génère EXACTEMENT 10 questions de quiz QCM sur le sujet suivant.

Réponds uniquement avec un tableau JSON valide.
Ne mets aucun texte avant ou après le JSON.
Ne mets pas de markdown.
Ne mets pas de ```.

Format obligatoire:
[
  {{
    "question": "question claire",
    "choices": ["choix A", "choix B", "choix C", "choix D"],
    "correct_answer": "choix A",
    "explanation": "explication courte"
  }}
]

Contraintes:
- réponds uniquement en français
- chaque question doit avoir exactement 4 choix différents
- correct_answer doit être exactement égal à l'un des 4 choix
- une seule bonne réponse
- les mauvais choix doivent être plausibles mais clairement faux
- varie la position de la bonne réponse
- aucun champ supplémentaire

Sujet:
{topic}
"""

    response = get_client().chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": "Tu réponds uniquement avec un tableau JSON valide. Aucun markdown."
            },
            {
                "role": "user",
                "content": prompt
            },
        ],
        temperature=0.1,
    )

    content = response.choices[0].message.content
    questions = extract_json_array(content)

    valid_questions = []

    for question in questions:
        q_text = normalize_text(question.get("question"))
        choices = question.get("choices")
        correct_answer = normalize_text(question.get("correct_answer"))
        explanation = normalize_text(question.get("explanation", ""))

        if not q_text or not choices or not correct_answer:
            continue

        if not isinstance(choices, list):
            continue

        choices = [normalize_text(choice) for choice in choices]

        if len(choices) != 4:
            continue

        if any(not choice for choice in choices):
            continue

        if has_duplicate_choices(choices):
            continue

        if correct_answer not in choices:
            continue

        valid_questions.append({
            "question": q_text,
            "choices": choices,
            "correct_answer": correct_answer,
            "explanation": explanation,
        })

    return valid_questions


def ask_pdf_with_groq(text, question):
    prompt = f"""
Tu es un assistant pédagogique.

Réponds à la question suivante uniquement à partir du cours fourni.

Règles:
- réponds en français
- si la réponse n'est pas dans le cours, dis: "Je ne trouve pas cette information dans le cours."
- ne rajoute pas d'information inventée
- sois clair et précis

Question:
{question}

Cours:
{text[:10000]}
"""

    response = get_client().chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": "Tu es un assistant pédagogique clair et précis."
            },
            {
                "role": "user",
                "content": prompt
            },
        ],
        temperature=0.2,
    )

    return response.choices[0].message.content.strip()

def generate_revision_plan_with_groq(deck_title, flashcards, availabilities, exam_date, priority):
    prompt = f"""
Tu es un assistant pédagogique spécialisé dans l'organisation des révisions.

À partir des informations suivantes, propose un planning de révision réaliste.

Réponds uniquement avec un tableau JSON valide.
Ne mets aucun texte avant ou après le JSON.
Ne mets pas de markdown.

Format obligatoire:
[
  {{
    "day": "Lundi",
    "start_time": "18:00",
    "end_time": "19:00",
    "objective": "Réviser les notions principales",
    "session_type": "flashcards",
    "todo_title": "Réviser les flashcards importantes",
    "todo_description": "Revoir les cartes difficiles et refaire un quiz",
    "todo_priority": "high"
  }}
]

Contraintes:
- utilise uniquement les disponibilités fournies
- ne crée pas de séance hors disponibilité
- adapte la charge selon la priorité: low, medium ou high
- si l'examen est proche, propose des séances plus ciblées
- privilégie les flashcards difficiles et les notions importantes
- session_type doit être: flashcards, summary, quiz ou review
- todo_priority doit être: low, medium ou high
- réponds en français
- propose maximum 5 séances

Deck:
{deck_title}

Date d'examen:
{exam_date}

Priorité:
{priority}

Disponibilités:
{json.dumps(availabilities, ensure_ascii=False)}

Flashcards:
{json.dumps(flashcards[:20], ensure_ascii=False)}
"""

    response = get_client().chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": "Tu réponds uniquement avec un tableau JSON valide. Aucun markdown."
            },
            {
                "role": "user",
                "content": prompt
            },
        ],
        temperature=0.2,
    )

    content = response.choices[0].message.content
    sessions = extract_json_array(content)

    valid_sessions = []

    valid_days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
    valid_session_types = ["flashcards", "summary", "quiz", "review"]
    valid_priorities = ["low", "medium", "high"]

    for session in sessions:
        day = normalize_text(session.get("day"))
        start_time = normalize_text(session.get("start_time"))
        end_time = normalize_text(session.get("end_time"))
        objective = normalize_text(session.get("objective"))
        session_type = normalize_text(session.get("session_type"))
        todo_title = normalize_text(session.get("todo_title"))
        todo_description = normalize_text(session.get("todo_description", ""))
        todo_priority = normalize_text(session.get("todo_priority", priority)).lower()

        if day not in valid_days:
            continue

        if session_type not in valid_session_types:
            session_type = "review"

        if todo_priority not in valid_priorities:
            todo_priority = priority

        if not start_time or not end_time or not objective or not todo_title:
            continue

        valid_sessions.append({
            "day": day,
            "start_time": start_time,
            "end_time": end_time,
            "objective": objective,
            "session_type": session_type,
            "todo_title": todo_title,
            "todo_description": todo_description,
            "todo_priority": todo_priority,
        })

    return valid_sessions
