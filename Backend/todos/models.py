from django.db import models
from django.contrib.auth.models import User
from planning.models import RevisionSession


# Create your models here.

class ToDo(models.Model):   
    STATUS_CHOICES=[
        ('todo','À faire'),
        ('in_progress','En cours'),
        ('done','Terminé')
    ]
    PRIORITY_CHOICES=[
    ('low','Faible'),
    ('medium','Moyenne'),   
    ('high','Élevée')
    ]
    title=models.CharField(max_length=255)
    description=models.TextField(blank=True)
    subject=models.CharField(max_length=100, default='Général')
    status=models.CharField(max_length=20, choices=STATUS_CHOICES, default='todo')
    due_date=models.DateField(null=True, blank=True)
    priority=models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='todos')
    revision_session = models.ForeignKey(RevisionSession,on_delete=models.SET_NULL,null=True,blank=True,related_name='todos')
    def __str__(self):
        return self.title
