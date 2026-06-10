from rest_framework import serializers
from .models import ToDo

class ToDoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ToDo
        fields = "__all__"
        read_only_fields = ["user"]

    def validate_revision_session(self, session):
        request = self.context.get("request")
        if session and request and session.revisionPlan.user_id != request.user.id:
            raise serializers.ValidationError("Séance de révision introuvable.")
        return session
