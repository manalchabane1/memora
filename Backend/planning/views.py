from django.contrib.auth.models import User
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Availability, RevisionPlan, RevisionSession

from .serializers import (AvailabilitySerializer, RevisionPlanSerializer, RevisionSessionSerializer)

# Create your views here.
@api_view(['GET'])
def get_revision_plans(request):
    plans = RevisionPlan.objects.all().order_by('-created_at')
    serializer = RevisionPlanSerializer(plans, many=True)
    return Response(serializer.data)

@api_view(['POST'])
def create_revision_plan(request):
    user = User.objects.first()

    plan = RevisionPlan.objects.create(
        title = request.data.get('title'),
        description = request.data.get('description'),
        user = user,
    )

    serializer = RevisionPlanSerializer(plan)
    return Response(serializer.data, status=201)

@api_view(["GET"])
def get_revision_sessions(request):
    sessions = RevisionSession.objects.all().order_by("-date")
    serializer = RevisionSessionSerializer(sessions, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def get_availabilities(request):
    availabilities = Availability.objects.all()
    serializer = AvailabilitySerializer(availabilities, many=True)
    return Response(serializer.data)