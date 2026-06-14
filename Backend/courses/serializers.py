from rest_framework import serializers
from .models import (
    CoursePDF,
    Deck,
    Flashcard,
    Quiz,
    QuizQuestion,
    QuizAttempt,
    Folder
)

class FolderSerializer(serializers.ModelSerializer):
    courses_count = serializers.SerializerMethodField()

    def get_courses_count(self, obj):
        return obj.courses.count()

    class Meta:
        model = Folder
        fields = ["id", "name", "courses_count", "created_at"]

class FlashcardSerializer(serializers.ModelSerializer):
    front = serializers.CharField(source="question")
    back = serializers.CharField(source="answer")

    class Meta:
        model = Flashcard
        fields = ["id", "front", "back", "difficulty"]


class DeckSerializer(serializers.ModelSerializer):
    cards = FlashcardSerializer(source="flashcards", many=True, read_only=True)
    subject = serializers.CharField(default="Depuis PDF")
    color = serializers.CharField(default="#8B6CF6")
    mastered = serializers.IntegerField(default=0)
    due = serializers.IntegerField(default=0)

    class Meta:
        model = Deck
        fields = [
            "id",
            "title",
            "subject",
            "color",
            "mastered",
            "due",
            "cards",
        ]


class CoursePDFSerializer(serializers.ModelSerializer):
    file_name = serializers.SerializerMethodField()

    def get_file_name(self, obj):
        return obj.file.name.rsplit("/", 1)[-1]

    class Meta:
        model = CoursePDF
        fields = ["id", "title", "subject", "file_name", "summary", "uploaded_at"]
        read_only_fields = fields


class QuizQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizQuestion
        fields = ["id", "question", "choices"]


class QuizSerializer(serializers.ModelSerializer):
    quiz_questions = QuizQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = ["id", "title", "subject", "deck", "course", "created_at", "quiz_questions"]
        read_only_fields = fields


class QuizAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizAttempt
        fields = "__all__"
        read_only_fields = fields
