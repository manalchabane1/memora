from django.contrib.auth.models import User
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import CoursePDF, Deck
from .serializers import CoursePDFSerializer, DeckSerializer
import fitz 
from .models import CoursePDF, Deck, Flashcard
#from ai_service.gemini_service import generate_flashcards_with_gemini


@api_view(["GET"])
def get_courses(request):
    courses = CoursePDF.objects.all().order_by("-uploaded_at")
    serializer = CoursePDFSerializer(courses, many=True)
    return Response(serializer.data)

@api_view(["POST"])
def upload_course(request):
    user = User.objects.first()
    if user is None:
        user = User.objects.create_user(username="demo", password="demo1234")

    title = request.data.get("title", "Nouveau cours")
    file = request.FILES.get("file")

    if not file:
        return Response({"error": "Aucun fichier PDF envoyé"}, status=400)

    course = CoursePDF.objects.create(
        title=title,
        file=file,
        user=user
    )

    serializer = CoursePDFSerializer(course)
    return Response(serializer.data, status=201)

@api_view(["GET"])
def get_decks(request):
    decks = Deck.objects.prefetch_related("flashcards").all()
    serializer = DeckSerializer(decks, many=True)
    return Response(serializer.data)


@api_view(["POST"])
def generate_flashcards_from_course(request, course_id):
    try:
        course = CoursePDF.objects.get(id=course_id)
    except CoursePDF.DoesNotExist:
        return Response({"error": "Cours introuvable"}, status=404)

    text = ""

    with fitz.open(course.file.path) as pdf:
        for page in pdf:
            text += page.get_text()

    if not text.strip():
        return Response({"error": "Impossible d'extraire le texte du PDF"}, status=400)

    #generated_cards = generate_flashcards_with_gemini(text[:12000])

    deck = Deck.objects.create(
        title=f"Flashcards - {course.title}",
        description="Flashcards générées automatiquement par l'IA",
        user=course.user,
        CoursePDF=course,
    )

    for card in generated_cards:
        Flashcard.objects.create(
            deck=deck,
            question=card.get("question", ""),
            answer=card.get("answer", ""),
            difficulty=card.get("difficulty", "medium"),
        )

    return Response({
        "message": "Flashcards générées",
        "deck_id": deck.id,
        "cards_count": len(generated_cards),
    })