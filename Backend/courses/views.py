import logging

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
    Folder
)

from .serializers import (
    CoursePDFSerializer,
    DeckSerializer,
    QuizSerializer,
    FolderSerializer
)

from ai_service.pdf_extractor import extract_text_from_pdf
from ai_service.pipeline import generate_flashcards_pipeline

from ai_service.groq_service import (
    generate_summary_with_groq,
    generate_quiz_with_groq,
    generate_personal_quiz_with_groq,
    ask_pdf_with_groq,
)

MAX_PDF_SIZE = 20 * 1024 * 1024
logger = logging.getLogger(__name__)


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

    title = (request.data.get("title") or "Nouveau cours").strip()
    subject = (request.data.get("subject") or "Général").strip()
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
    try:
        course = CoursePDF.objects.get(id=course_id, user=request.user)
        existing_deck = Deck.objects.filter(
    CoursePDF=course,
    user=request.user
).first()

        if existing_deck:
            return Response({
                "already_exists": True,
                "deck_id": existing_deck.id,
                "message": "Flashcards déjà générées."
        })

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
        generated_cards = generate_flashcards_pipeline(text)
    except Exception as e:
        logger.exception("Flashcard generation failed for course %s", course.id)
        return Response({
            "error": "Erreur pendant la génération des flashcards",
        }, status=500)

    if not generated_cards:
        return Response({
            "error": "Aucune flashcard générée"
        }, status=400)

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
            title = (request.data.get("title") or "").strip()
            if not title or len(title) > 255:
                return Response(
                    {"error": "Le titre doit contenir entre 1 et 255 caractères"},
                    status=400,
                )
            course.title = title
            changed_fields.append("title")
        if "subject" in request.data:
            subject = (request.data.get("subject") or "").strip()
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
        summary = generate_summary_with_groq(text)
    except Exception as e:
        logger.exception("Summary generation failed for course %s", course.id)
        return Response({
            "error": "Erreur pendant la génération du résumé",
        }, status=500)

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

    if not question.strip():
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

    if not topic.strip():
        return Response({"error": "Sujet vide"}, status=400)
    if len(topic) > 255:
        return Response({"error": "Sujet trop long"}, status=400)

    try:
        generated_questions = generate_personal_quiz_with_groq(topic)
    except Exception as e:
        logger.exception("Personal quiz generation failed")
        return Response({
            "error": "Erreur pendant la génération du quiz",
        }, status=500)

    if not generated_questions:
        return Response({"error": "Aucune question générée"}, status=400)

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

    existing_quiz = Quiz.objects.filter(deck=deck, user=request.user).first()
    if existing_quiz:
        return Response({
            "already_exists": True,
            "message": "Quiz déjà généré.",
            **QuizSerializer(existing_quiz).data,
        })

    flashcards_data = [
        {
            "question": card.question,
            "answer": card.answer,
            "difficulty": card.difficulty,
        }
        for card in flashcards
    ]

    try:
        generated_questions = generate_quiz_with_groq(flashcards_data)
    except Exception as e:
        logger.exception("Quiz generation failed for deck %s", deck.id)
        return Response({
            "error": "Erreur pendant la génération du quiz",
        }, status=500)

    if not generated_questions:
        return Response({"error": "Aucune question générée"}, status=400)

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


@api_view(["POST"])
def global_chat(request):
    question = request.data.get("question", "")
    folder_id = request.data.get("folder_id")
    course_id = request.data.get("course_id")

    if not question.strip():
        return Response({"error": "Question vide"}, status=400)

    courses = CoursePDF.objects.filter(user=request.user)

    if course_id:
        courses = courses.filter(id=course_id)

    if folder_id:
        courses = courses.filter(folder_id=folder_id)

    if not courses.exists():
        return Response({"error": "Aucun cours trouvé"}, status=404)

    context = ""
    sources = []

    for course in courses[:10]:
        text = extract_text_from_pdf(course.file.path)
        context += f"\n\n--- SOURCE: {course.title} ---\n{text[:4000]}"
        sources.append(course.title)

    answer = ask_pdf_with_groq(context, question)

    return Response({
        "question": question,
        "answer": answer,
        "sources": sources,
    })


@api_view(["GET", "POST"])
def folders_list_create(request):
    if request.method == "GET":
        folders = Folder.objects.filter(user=request.user).order_by("-created_at")
        serializer = FolderSerializer(folders, many=True)
        return Response(serializer.data)

    name = request.data.get("name", "").strip()

    if not name:
        return Response({"error": "Nom du dossier vide"}, status=400)

    folder = Folder.objects.create(
        name=name,
        user=request.user
    )

    serializer = FolderSerializer(folder)
    return Response(serializer.data, status=201)


@api_view(["PATCH"])
def move_course_to_folder(request, course_id):
    folder_id = request.data.get("folder_id")

    try:
        course = CoursePDF.objects.get(id=course_id, user=request.user)
    except CoursePDF.DoesNotExist:
        return Response({"error": "Cours introuvable"}, status=404)

    if folder_id in [None, "", "null"]:
        course.folder = None
        course.save(update_fields=["folder"])
        return Response(CoursePDFSerializer(course).data)

    try:
        folder = Folder.objects.get(id=folder_id, user=request.user)
    except Folder.DoesNotExist:
        return Response({"error": "Dossier introuvable"}, status=404)

    course.folder = folder
    course.save(update_fields=["folder"])

    return Response(CoursePDFSerializer(course).data)