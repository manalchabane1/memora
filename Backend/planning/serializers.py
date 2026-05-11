from rest_framework import serializers
from .models import Availability, RevisionPlan, RevisionSession

class AvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Availability
        fields = "__all__"

class RevisionSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RevisionSession
        fields = "__all__"

class RevisionPlanSerializer(serializers.ModelSerializer):  
    class Meta:
        model = RevisionPlan
        fields = "__all__"