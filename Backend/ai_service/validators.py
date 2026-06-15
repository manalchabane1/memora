from .parsing import match_correct_answer
from .similarity import (
    contains_similar_choice_set,
    contains_similar_text,
    has_duplicate_choices,
)
from .text_cleaning import normalize_text


def validate_flashcards(cards):
    valid_cards = []
    seen_questions = []
    for card in cards:
        if not isinstance(card, dict):
            continue
        question = normalize_text(card.get("question"))
        answer = normalize_text(card.get("answer"))
        difficulty = normalize_text(card.get("difficulty", "medium")).lower()
        if (
            not question
            or not answer
            or contains_similar_text(question, seen_questions, threshold=0.62)
            or not is_study_worthy(question)
            or not is_study_worthy(answer, allow_concise=True)
        ):
            continue
        if difficulty not in {"easy", "medium", "hard"}:
            difficulty = "medium"
        seen_questions.append(question)
        valid_cards.append({
            "question": question,
            "answer": answer,
            "difficulty": difficulty,
        })
    return valid_cards


def deduplicate_flashcards(flashcards):
    valid_cards = []
    seen_questions = []
    seen_answers = []
    for card in flashcards:
        if not isinstance(card, dict):
            continue
        question = normalize_text(card.get("question"))
        answer = normalize_text(card.get("answer"))
        if not question or not answer:
            continue
        if contains_similar_text(question, seen_questions):
            continue
        if contains_similar_text(answer, seen_answers, threshold=0.86):
            continue
        seen_questions.append(question)
        seen_answers.append(answer)
        valid_cards.append({
            "question": question,
            "answer": answer,
            "difficulty": normalize_text(card.get("difficulty", "medium")).lower() or "medium",
        })
    return valid_cards


def validate_quiz_questions(questions, count=None):
    valid_questions = []
    seen_questions = []
    seen_choice_sets = []
    for question in questions:
        if not isinstance(question, dict):
            continue
        question_text = normalize_text(question.get("question"))
        choices = question.get("choices")
        raw_correct_answer = question.get("correct_answer")
        explanation = normalize_text(question.get("explanation", ""))
        if not question_text or not isinstance(choices, list) or not raw_correct_answer:
            continue
        choices = [normalize_text(choice) for choice in choices]
        if set(choice.upper() for choice in choices) == {"A", "B", "C", "D"}:
            continue
        if len(question_text.split()) < 6:
            continue
        if len(choices) != 4 or any(not choice for choice in choices):
            continue
        if has_duplicate_choices(choices):
            continue
        correct_answer = match_correct_answer(raw_correct_answer, choices)
        if not correct_answer:
            continue
        if contains_similar_text(question_text, seen_questions):
            continue
        if contains_similar_choice_set(choices, seen_choice_sets):
            continue
        seen_questions.append(question_text)
        seen_choice_sets.append(choices)
        valid_questions.append({
            "question": question_text,
            "choices": choices,
            "correct_answer": correct_answer,
            "explanation": explanation,
        })
        if count and len(valid_questions) >= count:
            break
    return valid_questions


def validate_revision_sessions(sessions, default_priority):
    valid_days = {"Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"}
    valid_session_types = {"flashcards", "summary", "quiz", "review"}
    valid_priorities = {"low", "medium", "high"}
    valid_sessions = []
    for session in sessions:
        if not isinstance(session, dict):
            continue
        day = normalize_text(session.get("day"))
        start_time = normalize_text(session.get("start_time"))
        end_time = normalize_text(session.get("end_time"))
        objective = normalize_text(session.get("objective"))
        session_type = normalize_text(session.get("session_type"))
        todo_title = normalize_text(session.get("todo_title"))
        todo_description = normalize_text(session.get("todo_description", ""))
        todo_priority = normalize_text(session.get("todo_priority", default_priority)).lower()
        if day not in valid_days or not start_time or not end_time or not objective or not todo_title:
            continue
        if session_type not in valid_session_types:
            session_type = "review"
        if todo_priority not in valid_priorities:
            todo_priority = default_priority
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

BAD_STUDY_TERMS = (
    "@", "université", "ufr", "enseignant", "professeur",
    "bibliographie", "modalités", "horaire", "plan du cours",
    "table des matières", "introduction à", "email"
)


def is_study_worthy(text, allow_concise=False):
    lowered = normalize_text(text).lower()

    if any(term in lowered for term in BAD_STUDY_TERMS):
        return False

    if allow_concise:
        return len(lowered) >= 2

    if len(lowered) < 20:
        return False

    if lowered.endswith("?"):
        return True

    # Reject title-like fragments with almost no sentence structure.
    words = lowered.split()
    if len(words) > 5 and not any(verb in words for verb in (
        "est", "sont", "permet", "utilise", "consiste", "définit",
        "calcule", "représente", "sert", "fonctionne", "applique"
    )):
        return False

    return True
