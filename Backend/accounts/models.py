from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile_details")
    bio = models.TextField(blank=True, max_length=500)
    school = models.CharField(max_length=150, blank=True)
    study_level = models.CharField(max_length=100, blank=True)
    preferred_subjects = models.JSONField(default=list, blank=True)
    avatar = models.ImageField(upload_to="profile_pictures/", blank=True)

    def __str__(self):
        return f"Profil de {self.user.username}"
