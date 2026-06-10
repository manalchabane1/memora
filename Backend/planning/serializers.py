from rest_framework import serializers
from .models import Availability, RevisionPlan, RevisionSession

class AvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Availability
        fields = "__all__"
        read_only_fields = ["user"]

    def validate(self, attrs):
        start = attrs.get("start_time", getattr(self.instance, "start_time", None))
        end = attrs.get("end_time", getattr(self.instance, "end_time", None))
        if start and end and end <= start:
            raise serializers.ValidationError("L'heure de fin doit être après l'heure de début.")
        return attrs

class RevisionSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RevisionSession
        fields = "__all__"

    def validate(self, attrs):
        request = self.context.get("request")
        plan = attrs.get("revisionPlan", getattr(self.instance, "revisionPlan", None))
        deck = attrs.get("deck", getattr(self.instance, "deck", None))
        start = attrs.get("start_time", getattr(self.instance, "start_time", None))
        end = attrs.get("end_time", getattr(self.instance, "end_time", None))

        if request and plan and plan.user_id != request.user.id:
            raise serializers.ValidationError({"revisionPlan": "Planning introuvable."})
        if request and deck and deck.user_id != request.user.id:
            raise serializers.ValidationError({"deck": "Deck introuvable."})
        if start and end and end <= start:
            raise serializers.ValidationError("L'heure de fin doit être après l'heure de début.")
        return attrs

class RevisionPlanSerializer(serializers.ModelSerializer):  
    class Meta:
        model = RevisionPlan
        fields = "__all__"
        read_only_fields = ["user", "created_at"]
