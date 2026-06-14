from django.db import models
from django.contrib.auth.models import User


class Folder(models.Model):
    name = models.CharField(max_length=255)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="folders"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

# Create your models here.
class CoursePDF(models.Model):
    title = models.CharField(max_length=255)
    subject = models.CharField(max_length=100, default="Général")
    file = models.FileField(upload_to='course_pdfs/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(User, on_delete = models.CASCADE, related_name='course_pdfs')
    summary = models.TextField(blank=True, default="")
    folder = models.ForeignKey(Folder,on_delete=models.SET_NULL,null=True,
    blank=True,
    related_name="courses"
)


    def __str__(self):
        return self.title

class Deck(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(User, on_delete = models.CASCADE, related_name='decks')
    CoursePDF = models.ForeignKey(CoursePDF, on_delete=models.CASCADE, related_name='decks')


    def __str__(self):
        return self.title
    
class Flashcard(models.Model):
    question = models.TextField()
    answer = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    deck = models.ForeignKey(Deck, on_delete=models.CASCADE, related_name='flashcards')
    DIFFICULTY_LEVELS = [
        ('easy','facile'),
        ('medium','moyen'),
        ('hard','difficile'),]
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_LEVELS, default='medium')

    def __str__(self):
        return self.question[:50]  # Return the first 50 characters of the question for display purposes   
    
class Quiz(models.Model):
    title = models.CharField(max_length=255)
    subject = models.CharField(max_length=100, default="Quiz")
    questions = models.JSONField(default=list, blank=True)

    deck = models.ForeignKey(
        Deck,
        on_delete=models.CASCADE,
        related_name="quizzes",
        null=True,
        blank=True
    )

    course = models.ForeignKey(
        CoursePDF,
        on_delete=models.CASCADE,
        related_name="quizzes",
        null=True,
        blank=True
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="quizzes"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class QuizQuestion(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="quiz_questions")
    question = models.TextField()
    choices = models.JSONField(default=list)
    correct_answer = models.TextField()
    explanation = models.TextField(blank=True)

    def __str__(self):
        return self.question[:50]


class QuizAttempt(models.Model):
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="attempts")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="quiz_attempts")
    score = models.IntegerField()
    total_questions = models.IntegerField()
    percentage = models.FloatField()
    completed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.quiz.title} - {self.percentage}%"



