from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from courses.models import CoursePDF, Deck
from .models import Availability, RevisionPlan, RevisionSession
# Create your tests here.

class PlanningAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="testuser", password="testpass")
        self.course = CoursePDF.objects.create(title="Test reseaux", file="test.pdf", user=self.user)
        self.deck = Deck.objects.create(title="Deck reseaux", description="deck de test", user=self.user,CoursePDF=self.course)

    def test_create_revision_plan(self):
        data = {
            "title": "Test Plan",
            "description": "Test description"
        }
        response = self.client.post("/api/planning/", data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(RevisionPlan.objects.count(), 1)
        self.assertEqual(RevisionPlan.objects.first().title, "Test Plan")

    def test_get_revision_plans(self):
        RevisionPlan.objects.create(title="Plan 1", description="Description 1", user=self.user)
        response = self.client.get("/api/planning/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        
    def test_create_availability(self):
        data = {
            "day": "Lundi",
            "start_time": "09:00:00",
            "end_time": "11:00:00"
        }
        response = self.client.post("/api/planning/availabilities/", data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Availability.objects.count(), 1)
    
    def test_get_availabilities(self):
        Availability.objects.create(day="Lundi", start_time="09:00:00", end_time="11:00:00", user=self.user)
        response = self.client.get("/api/planning/availabilities/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        data ={
            "date": "2024-06-30",
            "start_time": "09:00:00",
            "end_time": "11:00:00",
            "revisionPlan": RevisionPlan.objects.create(title="Plan 1", description="Description 1", user=self.user).id,
            "deck": self.deck.id
        }   
        response = self.client.post("/api/planning/sessions/", data, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(RevisionSession.objects.count(), 1)

    def test_get_revision_sessions(self):
        plan=RevisionPlan.objects.create(title="Plan 1", description="Description 1", user=self.user)
        RevisionSession.objects.create(date="2024-06-30", start_time="09:00:00", end_time="11:00:00", revisionPlan=plan, deck=self.deck)
        response = self.client.get("/api/planning/sessions/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
