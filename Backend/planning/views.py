from django.contrib.auth.models import User
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Availability, RevisionPlan, RevisionSession

from .serializers import (AvailabilitySerializer, RevisionPlanSerializer, RevisionSessionSerializer)


@api_view(['GET', 'POST'])
def revision_plan_create(request):
    if request.method == "GET":
        plans = RevisionPlan.objects.all().order_by("-created_at")
        serializer = RevisionPlanSerializer(plans, many=True)
        return Response(serializer.data)
    
    if request.method == "POST":
        user = User.objects.first()
        if user is None:
            user = User.objects.create_user(username="demo", password="demo1234")

        serializer = RevisionPlanSerializer(data={**request.data, "user": user.id})

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)

        return Response(serializer.errors, status=400)
    
@api_view(['GET', 'POST'])
def availability_list_create(request):
    if request.method == "GET":
        availabilities = Availability.objects.all()
        serializer = AvailabilitySerializer(availabilities, many=True)
        return Response(serializer.data)
    
    if request.method == "POST":
        user = User.objects.first()
        if user is None:
            user = User.objects.create_user(username="demo", password="demo1234")

        serializer = AvailabilitySerializer(data={**request.data, "user": user.id})

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)

        return Response(serializer.errors, status=400)

@api_view(['GET', 'POST'])
def revision_session_list_create(request):
    if request.method == "GET":
        sessions = RevisionSession.objects.all().order_by("-date")
        serializer = RevisionSessionSerializer(sessions, many=True)
        return Response(serializer.data)
    
    if request.method == "POST":
        serializer = RevisionSessionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)