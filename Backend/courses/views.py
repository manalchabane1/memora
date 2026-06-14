import logging
import math

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.http import FileResponse
from django.shortcuts import get_object_or_404

from .models import (
    CoursePDF,
    Deck,
    Flashcard,
    Quiz,
    QuizQuestion,
    QuizAttempt,
)

from .serializers import (
    CoursePDFSerializer,
    DeckSerializer,
    QuizSerializer,
)

from ai_service.pdf_extractor import extract_text_from_pdf
from ai_service.pipeline import build_flashcard_fallbacks, generate_flashcards_pipeline
from ai_service.pdf_chat import ask_pdf_with_groq
from ai_service.quiz import generate_personal_quiz_with_groq, generate_quiz_with_groq
from ai_service.similarity import contains_similar_choice_set, contains_similar_text
from ai_service.summary import generate_summary_with_groq
from ai_service.text_cleaning import canonical_text

MAX_PDF_SIZE = 20 * 1024 * 1024
logger = logging.getLogger(__name__)
GENERATION_BATCH_SIZE = 8


def parse_generation_options(request, count_key, default_count, minimum, maximum):
    try:
        count = int(request.data.get(count_key, default_count))
    except (TypeError, ValueError):
        return None, Response({"error": f"{count_key} doit être un nombre"}, status=400)
    if not minimum <= count <= maximum:
        return None, Response(
            {"error": f"{count_key} doit être compris entre {minimum} et {maximum}"},
            status=400,
        )

    difficulty_value = request.data.get("difficulty") or "all"
    if not isinstance(difficulty_value, str):
        return None, Response({"error": "Difficulté invalide"}, status=400)
    difficulty = difficulty_value.strip().lower()
    if difficulty not in {"all", "easy", "medium", "hard"}:
        return None, Response({"error": "Difficulté invalide"}, status=400)

    instructions_value = request.data.get("instructions") or request.data.get("focus") or ""
    if not isinstance(instructions_value, str):
        return None, Response({"error": "La consigne doit être du texte"}, status=400)
    instructions = instructions_value.strip()
    if len(instructions) > 500:
        return None, Response({"error": "La consigne est trop longue"}, status=400)

    return {
        "count": count,
        "difficulty": difficulty,
        "instructions": instructions,
    }, None


def generate_complete_set(generator, source, count, max_attempts=None, **options):
    generated = []
    seen_questions = []
    seen_choice_sets = []
    if max_attempts is None:
        max_attempts = math.ceil(count / GENERATION_BATCH_SIZE) + 3

    no_progress_attempts = 0
    for _ in range(max_attempts):
        remaining = count - len(generated)
        if remaining <= 0:
            break
        attempt_options = options.copy()
        if generated:
            previous_questions = "; ".join(
                item["question"] for item in generated[-10:]
            )
            base_instructions = attempt_options.get("instructions") or ""
            attempt_options["instructions"] = (
                f"{base_instructions} Évite absolument ces questions déjà générées : "
                f"{previous_questions}"
            ).strip()
        try:
            batch = generator(
                source,
                count=min(remaining + 4, GENERATION_BATCH_SIZE),
                **attempt_options,
            )
        except Exception:
            logger.exception("AI generation attempt failed")
            continue
        before_count = len(generated)
        for item in batch or []:
            if not isinstance(item, dict):
                continue
            question = (item.get("question") or "").strip()
            if not question or contains_similar_text(question, seen_questions):
                continue
            choices = item.get("choices")
            if isinstance(choices, list):
                if contains_similar_choice_set(choices, seen_choice_sets):
                    continue
                seen_choice_sets.append(choices)
            seen_questions.append(question)
            generated.append(item)
        if len(generated) == before_count:
            no_progress_attempts += 1
            if no_progress_attempts >= 2:
                break
        else:
            no_progress_attempts = 0

    return generated[:count]


def build_quiz_fallbacks(flashcards, existing_questions, count):
    used_questions = [
        (item.get("question") or "").strip()
        for item in existing_questions
        if isinstance(item, dict)
    ]
    answers = []
    for card in flashcards:
        answer = (card.get("answer") or "").strip()
        if answer and not contains_similar_text(answer, answers, threshold=0.8):
            answers.append(answer)

    if len(answers) < 4:
        return []

    fallbacks = []
    seen_choice_sets = [
        item.get("choices", [])
        for item in existing_questions
        if isinstance(item, dict) and isinstance(item.get("choices"), list)
    ]
    for index, card in enumerate(flashcards):
        if len(existing_questions) + len(fallbacks) >= count:
            break
        question = (card.get("question") or "").strip()
        correct_answer = (card.get("answer") or "").strip()
        if (
            not question
            or not correct_answer
            or contains_similar_text(question, used_questions)
        ):
            continue

        other_answers = [
            answer for answer in answers
            if not contains_similar_text(answer, [correct_answer], threshold=0.8)
        ]
        distractors = [
            other_answers[(index + offset) % len(other_answers)]
            for offset in range(3)
        ]
        if len({canonical_text(choice) for choice in distractors}) != 3:
            continue
        choices = distractors[:]
        choices.insert(index % 4, correct_answer)
        if contains_similar_choice_set(choices, seen_choice_sets):
            continue
        fallbacks.append({
            "question": question,
            "choices": choices,
            "correct_answer": correct_answer,
            "explanation": correct_answer,
        })
        used_questions.append(question)
        seen_choice_sets.append(choices)

    return fallbacks


def validate_pdf_upload(file):
    if file.size > MAX_PDF_SIZE:
        return "Le PDF dépasse la taille maximale de 20 Mo"
    if not file.name.lower().endswith(".pdf"):
        return "Le fichier doit être un PDF"

    header = file.read(5)
    file.seek(0)
    if header != b"%PDF-":
        return "Le contenu du fichier n'est pas un PDF valide"
    return None


@api_view(["GET"])
def get_courses(request):
    courses = CoursePDF.objects.filter(user=request.user).order_by("-uploaded_at")
    serializer = CoursePDFSerializer(courses, many=True)
    return Response(serializer.data)


@api_view(["GET"])
def download_course(request, course_id):
    course = get_object_or_404(CoursePDF, id=course_id, user=request.user)
    return FileResponse(
        course.file.open("rb"),
        content_type="application/pdf",
        filename=course.file.name.rsplit("/", 1)[-1],
    )


@api_view(["POST"])
def upload_course(request):
    user = request.user

    title_value = request.data.get("title") or "Nouveau cours"
    subject_value = request.data.get("subject") or "Général"
    if not isinstance(title_value, str) or not isinstance(subject_value, str):
        return Response({"error": "Le titre et la matière doivent être du texte"}, status=400)
    title = title_value.strip()
    subject = subject_value.strip()
    file = request.FILES.get("file")

    if not file:
        return Response({"error": "Aucun fichier PDF envoyé"}, status=400)
    if not title or len(title) > 255:
        return Response({"error": "Le titre doit contenir entre 1 et 255 caractères"}, status=400)
    if not subject or len(subject) > 100:
        return Response({"error": "La matière doit contenir entre 1 et 100 caractères"}, status=400)

    validation_error = validate_pdf_upload(file)
    if validation_error:
        return Response({"error": validation_error}, status=400)

    course = CoursePDF.objects.create(
        title=title,
        subject=subject,
        file=file,
        user=user
    )

    serializer = CoursePDFSerializer(course)
    return Response(serializer.data, status=201)


@api_view(["GET"])
def get_decks(request):
    decks = Deck.objects.filter(user=request.user).prefetch_related("flashcards").order_by(
        "-created_at"
    )
    serializer = DeckSerializer(decks, many=True)
    return Response(serializer.data)


@api_view(["POST"])
def generate_flashcards_from_course(request, course_id):
    options, error = parse_generation_options(request, "count", 10, 5, 40)
    if error:
        return error
    try:
        course = CoursePDF.objects.get(id=course_id, user=request.user)
    except CoursePDF.DoesNotExist:
        return Response({"error": "Cours introuvable"}, status=404)

    try:
        text = extract_text_from_pdf(course.file.path)
    except Exception as e:
        logger.exception("PDF extraction failed for course %s", course.id)
        return Response({
            "error": "Erreur pendant l'extraction du PDF",
        }, status=500)

    if not text.strip():
        return Response({
            "error": "Impossible d'extraire le texte du PDF"
        }, status=400)

    try:
        generated_cards = generate_flashcards_pipeline(
            text,
            count=options["count"],
            difficulty=options["difficulty"],
            focus=options["instructions"],
        )
    except Exception:
        logger.exception("Flashcard generation failed for course %s", course.id)
        generated_cards = []

    if len(generated_cards) < options["count"]:
        generated_cards.extend(
            build_flashcard_fallbacks(
                text,
                generated_cards,
                options["count"],
                options["difficulty"],
            )
        )

    with transaction.atomic():
        deck, created = Deck.objects.get_or_create(
            CoursePDF=course,
            user=request.user,
            defaults={
                "title": f"Flashcards - {course.title}",
                "description": "Flashcards générées automatiquement par l'IA",
            },
        )
        if not created:
            deck.flashcards.all().delete()

        Flashcard.objects.bulk_create([
            Flashcard(
                deck=deck,
                question=card.get("question", ""),
                answer=card.get("answer", ""),
                difficulty=card.get("difficulty", "medium"),
            )
            for card in generated_cards
        ])

    return Response({
        "message": "Flashcards générées avec succès",
        "course_id": course.id,
        "deck_id": deck.id,
        "cards_count": len(generated_cards),
    }, status=201)


@api_view(["PATCH", "DELETE"])
def delete_course(request, course_id):
    course = get_object_or_404(CoursePDF, id=course_id, user=request.user)

    if request.method == "PATCH":
        changed_fields = []
        if "title" in request.data:
            title_value = request.data.get("title") or ""
            if not isinstance(title_value, str):
                return Response({"error": "Le titre doit être du texte"}, status=400)
            title = title_value.strip()
            if not title or len(title) > 255:
                return Response(
                    {"error": "Le titre doit contenir entre 1 et 255 caractères"},
                    status=400,
                )
            course.title = title
            changed_fields.append("title")
        if "subject" in request.data:
            subject_value = request.data.get("subject") or ""
            if not isinstance(subject_value, str):
                return Response({"error": "La matière doit être du texte"}, status=400)
            subject = subject_value.strip()
            if not subject or len(subject) > 100:
                return Response(
                    {"error": "La matière doit contenir entre 1 et 100 caractères"},
                    status=400,
                )
            course.subject = subject
            changed_fields.append("subject")
        if changed_fields:
            course.save(update_fields=changed_fields)
        return Response(CoursePDFSerializer(course).data)

    stored_file = course.file
    course.delete()
    stored_file.delete(save=False)
    return Response({"message": "Cours supprimé"})


@api_view(["POST"])
def generate_summary_from_course(request, course_id):
    try:
        line_count = int(request.data.get("line_count", 20))
    except (TypeError, ValueError):
        return Response({"error": "line_count doit être un nombre"}, status=400)
    if not 5 <= line_count <= 100:
        return Response({"error": "line_count doit être compris entre 5 et 100"}, status=400)
    instructions_value = request.data.get("instructions") or ""
    if not isinstance(instructions_value, str):
        return Response({"error": "La consigne doit être du texte"}, status=400)
    instructions = instructions_value.strip()
    if len(instructions) > 500:
        return Response({"error": "La consigne est trop longue"}, status=400)

    try:
        course = CoursePDF.objects.get(id=course_id,user=request.user)
    except CoursePDF.DoesNotExist:
        return Response({"error": "Cours introuvable"}, status=404)

    try:
        text = extract_text_from_pdf(course.file.path)
    except Exception as e:
        logger.exception("PDF extraction failed for course %s", course.id)
        return Response({
            "error": "Erreur pendant l'extraction du PDF",
        }, status=500)

    if not text.strip():
        return Response({
            "error": "Impossible d'extraire le texte du PDF"
        }, status=400)

    try:
        summary = generate_summary_with_groq(
            text,
            line_count=line_count,
            instructions=instructions,
        )
    except Exception as e:
        logger.exception("Summary generation failed for course %s", course.id)
        return Response({
            "error": "Erreur pendant la génération du résumé",
        }, status=500)

    if not isinstance(summary, str) or not summary.strip():
        return Response(
            {"error": "L'IA n'a pas généré de résumé utilisable. Réessaie plus tard."},
            status=502,
        )

    summary = summary.strip()
    course.summary = summary
    course.save(update_fields=["summary"])

    serializer = CoursePDFSerializer(course)
    return Response({
        "message": "Résumé généré avec succès",
        "course_id": course.id,
        "summary": summary,
    }, status=201)


@api_view(["POST"])
def ask_question_from_course(request, course_id):
    question = request.data.get("question", "")

    if not isinstance(question, str):
        return Response({"error": "La question doit être du texte"}, status=400)
    question = question.strip()
    if not question:
        return Response({"error": "Question vide"}, status=400)
    if len(question) > 2000:
        return Response({"error": "Question trop longue"}, status=400)

    try:
        course = CoursePDF.objects.get(
            id=course_id,
            user=request.user
        )

    except CoursePDF.DoesNotExist:
        return Response({"error": "Cours introuvable"}, status=404)

    try:
        text = extract_text_from_pdf(course.file.path)

    except Exception as e:
        logger.exception("PDF extraction failed for course %s", course.id)
        return Response({
            "error": "Erreur extraction PDF",
        }, status=500)

    try:
        answer = ask_pdf_with_groq(text, question)
    except Exception as e:
        logger.exception("PDF question answering failed for course %s", course.id)
        return Response({
            "error": "Erreur pendant la génération de la réponse",
        }, status=500)

    return Response({
        "question": question,
        "answer": answer,
    })

    
@api_view(["DELETE"])
def delete_deck(request, deck_id):
    try:
        deck = Deck.objects.get(id=deck_id, user=request.user)
    except Deck.DoesNotExist:
        return Response({"error": "Deck introuvable"}, status=404)

    deck.delete()
    return Response({"message": "Deck supprimé"}, status=status.HTTP_200_OK)


@api_view(["POST"])
def generate_personal_quiz(request):
    topic = request.data.get("topic", "")
    options, error = parse_generation_options(request, "count", 10, 5, 30)
    if error:
        return error

    if not isinstance(topic, str):
        return Response({"error": "Le sujet doit être du texte"}, status=400)
    topic = topic.strip()
    if not topic:
        return Response({"error": "Sujet vide"}, status=400)
    if len(topic) > 255:
        return Response({"error": "Sujet trop long"}, status=400)

    try:
        generated_questions = generate_complete_set(
            generate_personal_quiz_with_groq,
            topic,
            count=options["count"],
            difficulty=options["difficulty"],
            instructions=options["instructions"],
        )
    except Exception:
        logger.exception("Personal quiz generation failed")
        generated_questions = []

    with transaction.atomic():
        quiz = Quiz.objects.create(
            title=topic,
            subject="Personnalisé",
            user=request.user,
        )
        QuizQuestion.objects.bulk_create([
            QuizQuestion(
                quiz=quiz,
                question=q.get("question", ""),
                choices=q.get("choices", []),
                correct_answer=q.get("correct_answer", ""),
                explanation=q.get("explanation", ""),
            )
            for q in generated_questions
        ])

    serializer = QuizSerializer(quiz)

    return Response(serializer.data, status=201)

@api_view(["GET"])
def get_quizzes(request):
    quizzes = Quiz.objects.filter(user=request.user).prefetch_related("quiz_questions").order_by(
        "-created_at"
    )
    serializer = QuizSerializer(quizzes,many=True)
    return Response(serializer.data)


@api_view(["DELETE"])
def delete_quiz(request,quiz_id):
    try:
        quiz = Quiz.objects.get(id=quiz_id, user=request.user)
    except Quiz.DoesNotExist:
        return Response({"error":"Quiz introuvable"},status=404)
    quiz.delete()
    return Response({"message": "Quiz supprimé"})
    

@api_view(["POST"])
def generate_quiz_from_deck(request, deck_id):
    options, error = parse_generation_options(request, "count", 10, 5, 30)
    if error:
        return error
    try:
        deck = Deck.objects.get(
    id=deck_id,
    user=request.user
)
    except Deck.DoesNotExist:
        return Response({"error": "Deck introuvable"}, status=404)

    flashcards = deck.flashcards.all()

    if not flashcards.exists():
        return Response({"error": "Aucune flashcard trouvée pour ce deck"}, status=400)

    flashcards_data = [
        {
            "question": card.question,
            "answer": card.answer,
            "difficulty": card.difficulty,
        }
        for card in flashcards
    ]

    try:
        generated_questions = generate_complete_set(
            generate_quiz_with_groq,
            flashcards_data,
            count=options["count"],
            difficulty=options["difficulty"],
            instructions=options["instructions"],
        )
    except Exception:
        logger.exception("Quiz generation failed for deck %s", deck.id)
        generated_questions = []

    if len(generated_questions) < options["count"]:
        generated_questions.extend(
            build_quiz_fallbacks(
                flashcards_data,
                generated_questions,
                options["count"],
            )
        )

    with transaction.atomic():
        quiz = Quiz.objects.create(
            title=deck.title.replace("Flashcards - ", ""),
            deck=deck,
            user=request.user,
        )
        QuizQuestion.objects.bulk_create([
            QuizQuestion(
                quiz=quiz,
                question=q.get("question", ""),
                choices=q.get("choices", []),
                correct_answer=q.get("correct_answer", ""),
                explanation=q.get("explanation", ""),
            )
            for q in generated_questions
        ])

    serializer = QuizSerializer(quiz)

    return Response(serializer.data, status=201)


@api_view(["POST"])
def check_quiz_answer(request, quiz_id, question_id):
    question = get_object_or_404(
        QuizQuestion,
        id=question_id,
        quiz_id=quiz_id,
        quiz__user=request.user,
    )
    answer = request.data.get("answer")
    if answer not in question.choices:
        return Response({"error": "Réponse invalide"}, status=400)

    return Response({
        "is_correct": answer == question.correct_answer,
        "correct_answer": question.correct_answer,
        "explanation": question.explanation,
    })


@api_view(["POST"])
def submit_quiz(request, quiz_id):
    try:
        quiz = Quiz.objects.prefetch_related("quiz_questions").get(
            id=quiz_id,
            user=request.user,
        )
    except Quiz.DoesNotExist:
        return Response({"error": "Quiz introuvable"}, status=404)

    answers = request.data.get("answers", {})
    if not isinstance(answers, dict):
        return Response({"error": "Le format des réponses est invalide"}, status=400)

    score = 0
    total = quiz.quiz_questions.count()
    corrections = []

    if total == 0:
        return Response({"error": "Ce quiz ne contient aucune question"}, status=400)

    for question in quiz.quiz_questions.all():
        user_answer = answers.get(str(question.id))
        is_correct = user_answer == question.correct_answer

        if is_correct:
            score += 1

        corrections.append({
            "question_id": question.id,
            "question": question.question,
            "choices": question.choices,
            "user_answer": user_answer,
            "correct_answer": question.correct_answer,
            "is_correct": is_correct,
            "explanation": question.explanation,
        })

    percentage = round((score / total) * 100, 2)

    attempt = QuizAttempt.objects.create(
        quiz=quiz,
        user=request.user,
        score=score,
        total_questions=total,
        percentage=percentage,
    )

    return Response({
        "message": "Quiz corrigé avec succès",
        "quiz_id": quiz.id,
        "attempt_id": attempt.id,
        "score": score,
        "total_questions": total,
        "percentage": percentage,
        "corrections": corrections,
    }, status=201)

@api_view(["GET"])
def quiz_attempt_history(request, quiz_id):
    try:
        quiz = Quiz.objects.get(
    id=quiz_id,
    user=request.user
)
    except Quiz.DoesNotExist:
        return Response({"error": "Quiz introuvable"}, status=404)

    attempts = QuizAttempt.objects.filter(
        quiz=quiz,
        user=request.user,
    ).order_by("-completed_at")

    data = [
        {
            "attempt_id": attempt.id,
            "score": attempt.score,
            "total_questions": attempt.total_questions,
            "percentage": attempt.percentage,
            "completed_at": attempt.completed_at,
        }
        for attempt in attempts
    ]

    return Response({
        "quiz_id": quiz.id,
        "quiz_title": quiz.title,
        "attempts": data,
    })


@api_view(["GET"])
def quiz_statistics(request, quiz_id):
    try:
        quiz = Quiz.objects.get(id=quiz_id, user=request.user)
    except Quiz.DoesNotExist:
        return Response({"error": "Quiz introuvable"}, status=404)

    attempts = QuizAttempt.objects.filter(quiz=quiz, user=request.user)

    if not attempts.exists():
        return Response({
            "quiz_id": quiz.id,
            "quiz_title": quiz.title,
            "attempts_count": 0,
            "best_score": None,
            "average_percentage": None,
            "last_percentage": None,
        })

    percentages = [attempt.percentage for attempt in attempts]

    return Response({
        "quiz_id": quiz.id,
        "quiz_title": quiz.title,
        "attempts_count": attempts.count(),
        "best_score": max(percentages),
        "average_percentage": round(sum(percentages) / len(percentages), 2),
        "last_percentage": attempts.order_by("-completed_at").first().percentage,
    })
