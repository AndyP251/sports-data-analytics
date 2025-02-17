# import os
# from celery import Celery

# """
# Celery is free and open-source, making it a cost-effective and scalable solution for task scheduling and background job processing. However, Celery requires a message broker (such as Redis or RabbitMQ) to function. Redis is also free and widely used for caching and task queue management, making it a good choice for simplicity and scalability.
# """

# # Set the default Django settings module for the 'celery' program.
# os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'athlete_platform.settings')

# # Create a Celery app instance.
# app = Celery('athlete_platform')

# # Load configuration from Django settings.
# app.config_from_object('django.conf:settings', namespace='CELERY')

# # Autodiscover tasks defined in Django apps.
# app.autodiscover_tasks()

# @app.task(bind=True)
# def debug_task(self):
#     print(f'Request: {self.request!r}') 