import logging
from datetime import datetime, timedelta

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Availability, RevisionPlan, RevisionSession
from .serializers import (
    AvailabilitySerializer,
    RevisionPlanSerializer,
    RevisionSessionSerializer,
)

from courses.models import Deck
from todos.models import ToDo
from ai_service.planning import generate_revision_plan_with_groq

logger = logging.getLogger(__name__)

DAY_TO_WEEKDAY = {
    "Lundi": 0,
    "Mardi": 1,
    "Mercredi": 2,
    "Jeudi": 3,
    "Vendredi": 4,
    "Samedi": 5,
    "Dimanche": 6,
}


def find_date_before_exam(day_name, exam_date):
    target_weekday = DAY_TO_WEEKDAY.get(day_name)

    if target_weekday is None:
        return exam_date

    current_date = exam_date - timedelta(days=1)

    for _ in range(14):
        if current_date.weekday() == target_weekday:
            return current_date
        current_date -= timedelta(days=1)

    return exam_date


@api_view(["GET", "POST"])
def revision_plan_create(request):
    if request.method == "GET":
        plans = RevisionPlan.objects.filter(user=request.user).order_by("-created_at")
        serializer = RevisionPlanSerializer(plans, many=True)
        return Response(serializer.data)

    serializer = RevisionPlanSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save(user=request.user)
        return Response(serializer.data, status=201)

    return Response(serializer.errors, status=400)


@api_view(["PATCH", "DELETE"])
def revision_plan_detail(request, plan_id):
    plan = get_object_or_404(RevisionPlan, id=plan_id, user=request.user)

    if request.method == "PATCH":
        serializer = RevisionPlanSerializer(plan, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    plan.delete()
    return Response({"message": "Planning supprimé"})


@api_view(["GET", "POST"])
def availability_list_create(request):
    if request.method == "GET":
        availabilities = Availability.objects.filter(user=request.user)
        serializer = AvailabilitySerializer(availabilities, many=True)
        return Response(serializer.data)

    serializer = AvailabilitySerializer(data=request.data)

    if serializer.is_valid():
        serializer.save(user=request.user)
        return Response(serializer.data, status=201)

    return Response(serializer.errors, status=400)


@api_view(["PATCH", "DELETE"])
def availability_detail(request, availability_id):
    availability = get_object_or_404(
        Availability,
        id=availability_id,
        user=request.user,
    )

    if request.method == "PATCH":
        serializer = AvailabilitySerializer(
            availability,
            data=request.data,
            partial=True,
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    availability.delete()
    return Response({"message": "Disponibilité supprimée"})


@api_view(["GET", "POST"])
def revision_session_list_create(request):
    if request.method == "GET":
        sessions = RevisionSession.objects.filter(
            revisionPlan__user=request.user
        ).order_by("-date")

        serializer = RevisionSessionSerializer(sessions, many=True)
        return Response(serializer.data)

    serializer = RevisionSessionSerializer(data=request.data, context={"request": request})

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)

    return Response(serializer.errors, status=400)


@api_view(["PATCH", "DELETE"])
def revision_session_detail(request, session_id):
    session = get_object_or_404(
        RevisionSession,
        id=session_id,
        revisionPlan__user=request.user,
    )

    if request.method == "PATCH":
        serializer = RevisionSessionSerializer(
            session,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    session.delete()
    return Response({"message": "Séance supprimée"})


@api_view(["POST"])
def generate_ai_revision_plan(request):
    deck_id = request.data.get("deck_id")
    exam_date_raw = request.data.get("exam_date")
    priority = request.data.get("priority", "medium")

    if priority not in ["low", "medium", "high"]:
        priority = "medium"

    if not deck_id or not exam_date_raw:
        return Response({
            "error": "deck_id et exam_date sont obligatoires"
        }, status=400)

    if not isinstance(exam_date_raw, str):
        return Response({"error": "exam_date doit être au format YYYY-MM-DD"}, status=400)

    try:
        deck_id = int(deck_id)
    except (TypeError, ValueError):
        return Response({"error": "deck_id invalide"}, status=400)

    try:
        exam_date = datetime.strptime(exam_date_raw, "%Y-%m-%d").date()
    except ValueError:
        return Response({
            "error": "exam_date doit être au format YYYY-MM-DD"
        }, status=400)

    if exam_date < timezone.localdate():
        return Response({"error": "La date d'examen doit être dans le futur"}, status=400)

    deck = get_object_or_404(
        Deck.objects.prefetch_related("flashcards"),
        id=deck_id,
        user=request.user,
    )
    availabilities = list(Availability.objects.filter(user=request.user))

    if not availabilities:
        return Response({
            "error": "Aucune disponibilité trouvée"
        }, status=400)

    flashcards_data = [
        {
            "question": card.question,
            "answer": card.answer,
            "difficulty": card.difficulty,
        }
        for card in deck.flashcards.all()
    ]

    availabilities_data = [
        {
            "day": availability.day,
            "start_time": availability.start_time.strftime("%H:%M"),
            "end_time": availability.end_time.strftime("%H:%M"),
        }
        for availability in availabilities
    ]
    availabilities_by_day = {}
    for availability in availabilities:
        availabilities_by_day.setdefault(availability.day, []).append(availability)

    try:
        ai_sessions = generate_revision_plan_with_groq(
            deck_title=deck.title,
            flashcards=flashcards_data,
            availabilities=availabilities_data,
            exam_date=exam_date_raw,
            priority=priority,
        )
    except Exception as e:
        logger.exception("AI revision planning failed for deck %s", deck.id)
        return Response({
            "error": "Erreur pendant la génération du planning IA",
        }, status=500)

    if not ai_sessions:
        return Response({
            "error": "Aucune séance générée par l'IA"
        }, status=400)

    valid_sessions = []
    occurrences_by_day = {}
    for ai_session in ai_sessions:
        if not isinstance(ai_session, dict):
            continue
        day = ai_session.get("day")

        try:
            start_time = datetime.strptime(ai_session["start_time"], "%H:%M").time()
            end_time = datetime.strptime(ai_session["end_time"], "%H:%M").time()
        except (KeyError, TypeError, ValueError):
            continue

        matching_availability = next(
            (
                availability
                for availability in availabilities_by_day.get(day, [])
                if start_time >= availability.start_time and end_time <= availability.end_time
            ),
            None,
        )
        if not matching_availability or end_time <= start_time:
            continue

        occurrence = occurrences_by_day.get(day, 0)
        session_date = find_date_before_exam(day, exam_date) - timedelta(days=occurrence * 7)
        if session_date < timezone.localdate():
            continue

        occurrences_by_day[day] = occurrence + 1
        valid_sessions.append((ai_session, session_date, start_time, end_time))

    if not valid_sessions:
        return Response({
            "error": "Aucune séance valide n'a pu être créée avec vos disponibilités"
        }, status=400)

    created_sessions = []

    with transaction.atomic():
        revision_plan = RevisionPlan.objects.create(
            title=f"Planning IA - {deck.title}",
            description="Planning de révision généré automatiquement par l'IA",
            exam_date=exam_date,
            priority=priority,
            goal=f"Réviser {deck.title} avant l'examen",
            user=request.user,
        )

        for ai_session, session_date, start_time, end_time in valid_sessions:
            session = RevisionSession.objects.create(
                revisionPlan=revision_plan,
                deck=deck,
                date=session_date,
                start_time=start_time,
                end_time=end_time,
                status="planned",
                title=ai_session["objective"],
                description=ai_session["session_type"],
                location="Planning IA",
            )

            todo = ToDo.objects.create(
                title=ai_session["todo_title"],
                description=ai_session.get("todo_description", ""),
                subject=deck.title.replace("Flashcards - ", ""),
                priority=ai_session["todo_priority"],
                due_date=session_date,
                user=request.user,
                revision_session=session,
            )

            created_sessions.append({
                "session_id": session.id,
                "todo_id": todo.id,
                "day": ai_session["day"],
                "date": session_date,
                "start_time": start_time,
                "end_time": end_time,
                "objective": ai_session["objective"],
                "session_type": ai_session["session_type"],
                "revisionPlan": revision_plan.id,
                "deck": deck.id,
                "status": "planned",
                "title": ai_session["objective"],
                "description": ai_session["session_type"],
                "location": "Planning IA",
                "color": "#8B6CF6",
            })

    return Response({
        "message": "Planning IA généré avec succès",
        "revision_plan_id": revision_plan.id,
        "sessions_count": len(created_sessions),
        "sessions": created_sessions,
    }, status=201)
