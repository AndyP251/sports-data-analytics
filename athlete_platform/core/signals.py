from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User, Athlete

@receiver(post_save, sender=User)
def create_athlete_profile(sender, instance, created, **kwargs):
    if created and instance.role == 'ATHLETE':
        Athlete.objects.create(user=instance) 