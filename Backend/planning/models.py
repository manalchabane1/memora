from django.db import models
from django.contrib.auth.models import User
from courses.models import Deck



# Create your models here.
class Availability(models.Model):
    DAYS=[
        ('Lundi','Monday'),
        ('Mardi','Tuesday'),
        ('Mercredi','Wednesday'),
        ('Jeudi','Thursday'),
        ('Vendredi','Friday'),
        ('Samedi','Saturday'),
        ('Dimanche','Sunday')

    ]
    day=models.CharField(max_length=20, choices=DAYS)
    start_time = models.TimeField()
    end_time = models.TimeField()
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='availabilities')

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=models.Q(end_time__gt=models.F("start_time")),
                name="availability_end_after_start",
            )
        ]

    def __str__(self):
        return f"{self.user.username} - {self.day}"


class RevisionPlan(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    exam_date = models.DateField(null=True, blank=True)
    priority = models.CharField(
        max_length=20,
        choices=[
            ("low", "Faible"),
            ("medium", "Moyenne"),
            ("high", "Élevée"),
        ],
        default="medium"
    )
    goal = models.TextField(blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='revision_plans')
    created_at = models.DateTimeField(auto_now_add=True)

    
class RevisionSession(models.Model):
        STATUS_CHOICES=[
            ('planned','programmé'),
            ('done','terminé'),
            ('cancelled','annulé')
        ]
        date=models.DateField()
        start_time = models.TimeField()
        end_time = models.TimeField()
        status=models.CharField(max_length=20, choices=STATUS_CHOICES, default='planned')
        title = models.CharField(max_length=255, default="Séance de révision")
        description = models.TextField(blank=True)
        location = models.CharField(max_length=255, blank=True)
        color = models.CharField(max_length=20, default="#8B6CF6")
        revisionPlan = models.ForeignKey(RevisionPlan, on_delete=models.CASCADE, related_name='sessions')
        deck = models.ForeignKey(Deck, on_delete=models.CASCADE, related_name='revision_sessions')

        class Meta:
            constraints = [
                models.CheckConstraint(
                    condition=models.Q(end_time__gt=models.F("start_time")),
                    name="revision_session_end_after_start",
                )
            ]

        def __str__(self):
            return f"{self.revisionPlan.user.username} - {self.date}"
