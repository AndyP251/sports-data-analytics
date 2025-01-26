from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from .models import User, Athlete
from .services.storage_service import UserStorageService


@receiver(post_save, sender=User)
def create_athlete_profile(sender, instance, created, **kwargs):
    if created:
        Athlete.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_athlete_profile(sender, instance, **kwargs):
    instance.athlete.save()

@receiver(post_save, sender=User)
def create_user_storage(sender, instance, created, **kwargs):
    """
    Signal handler to create S3 directory structure when a new user is created
    """
    if created:
        storage_service = UserStorageService()
        storage_service.create_user_directory_structure(instance)