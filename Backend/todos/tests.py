from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from .models import ToDo
# Create your tests here.

class TodoAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username="testuser", password="testpass")

    def test_get_todos(self):
        ToDo.objects.create(title="Test Todo", description="Test description", user=self.user)
        response = self.client.get("/api/todos/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Test Todo")

    def test_create_todo(self):
        data = {
            "title": "New Todo",
            "description": "New description",
            "priority": "high",
            "revision_session": None
        }
        response = self.client.post("/api/todos/", data, format="json")
        print(response.data)
        self.assertEqual(response.status_code, 201)
        self.assertEqual(ToDo.objects.count(), 1)
        self.assertEqual(ToDo.objects.first().title, "New Todo")        
    
    def test_update_todo(self):
        todo =ToDo.objects.create(title="Test Todo", description="Test description", user=self.user)
        response = self.client.patch(f"/api/todos/{todo.id}/",
            {"status": "done"},
            format="json"
        )
        todo.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(todo.status, "done")

    def test_delete_todo(self):
        todo = ToDo.objects.create(title="Réviser algo", user=self.user)
        response = self.client.delete(f"/api/todos/{todo.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(ToDo.objects.count(), 0)