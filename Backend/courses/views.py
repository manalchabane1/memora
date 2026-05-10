from django.contrib.auth.models import User
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import CoursePDF, Deck
from .serializers import CoursePDFSerializer, DeckSerializer

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