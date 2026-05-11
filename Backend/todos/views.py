from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import ToDo
from django.contrib.auth.models import User
from .serializers import ToDoSerializer

# Create your views here.
@api_view(['GET'])
def get_todos(request):
    todos = ToDo.objects.all().order_by('-id')
    serializer = ToDoSerializer(todos, many=True)
    return Response(serializer.data)

@api_view(['POST'])
def create_todo(request):
    user = User.objects.first()

    todo= ToDo.objects.create(  
        title = request.data.get('title'),
        description = request.data.get('description'),
        status = request.data.get('status', 'todo'),
        priority = request.data.get('priority', 'medium'),
        user = user,
    )

    serializer = ToDoSerializer(todo)
    return Response(serializer.data, status=201)