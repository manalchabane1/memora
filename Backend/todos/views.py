from django.contrib.auth.models import User
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import ToDo
from .serializers import TodoSerializer


@api_view(["GET", "POST"])
def todo_list_create(request):
    if request.method == "GET":
        todos = ToDo.objects.all().order_by("-id")
        serializer = TodoSerializer(todos, many=True)
        return Response(serializer.data)

    if request.method == "POST":
        user = User.objects.first()
        if user is None:
            user = User.objects.create_user(username="demo", password="demo1234")

        serializer = TodoSerializer(data={**request.data, "user": user.id})

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)

        return Response(serializer.errors, status=400)


@api_view(["PATCH", "DELETE"])
def todo_detail(request, todo_id):
    try:
        todo = ToDo.objects.get(id=todo_id)
    except ToDo.DoesNotExist:
        return Response({"error": "Todo introuvable"}, status=404)

    if request.method == "PATCH":
        serializer = TodoSerializer(todo, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=400)

    if request.method == "DELETE":
        todo.delete()
        return Response({"message": "Todo supprimée"})
