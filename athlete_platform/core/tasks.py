from celery import shared_task
from .utils.whoop_utils import WhoopClient

@shared_task
def collect_whoop_data(athlete_id):
    """Collect WHOOP data for an athlete"""
    collector = WhoopClient(athlete_id)
    return collector.collect_and_store_data() 