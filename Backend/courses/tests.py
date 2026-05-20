from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from django.core.files.uploadedfile import SimpleUploadedFile
from .models import CoursePDF, Deck,Flashcard

# Create your tests here.
class CoursesAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass')

    def test_get_courses(self):
        CoursePDF.objects.create(title = 'Course 1', file= "test.pdf", user=self.user)
        response = self.client.get('/api/courses/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], 'Course 1')

    def test_upload_course_without_file(self):
        response = self.client.post('/api/courses/upload/', {'title': 'Course 2'}, format='multipart')
        self.assertEqual(response.status_code, 400)
        self.assertIn("error",response.data)

    def test_upload_course_with_file(self):
        pdf_file = SimpleUploadedFile("test.pdf", b"file_content", content_type="application/pdf")
        response = self.client.post('/api/courses/upload/', {'title': 'Course 3', 'file': pdf_file}, format='multipart')    
        self.assertEqual(response.status_code, 201)
        self.assertEqual(CoursePDF.objects.count(), 1)
        self.assertEqual(CoursePDF.objects.first().title, 'Course 3')

    def test_get_deck(self):
        course = CoursePDF.objects.create(title = 'Course 4', file= "test.pdf", user=self.user)
        deck = Deck.objects.create(title='Deck 1', description='Description 1', user=self.user, CoursePDF=course)
        Flashcard.objects.create(question='Question 1', answer='Answer 1',difficulty= 'easy', deck=deck)

        response = self.client.get("/api/courses/decks/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Deck 1")
        self.assertEqual(len(response.data[0]["cards"]), 1)