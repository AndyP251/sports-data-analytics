from celery import shared_task
from .utils.whoop_utils import WhoopDataCollector

@shared_task
def collect_whoop_data(athlete_id):
    """Collect WHOOP data for an athlete"""
    collector = WhoopDataCollector(athlete_id)
    return collector.collect_and_store_data() 