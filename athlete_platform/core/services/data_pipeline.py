from typing import Dict, Optional, Type, List
from datetime import datetime, date
from django.conf import settings
import logging
from .data_collectors import GarminCollector, WhoopCollector
from .data_processors import GarminProcessor, WhoopProcessor
from .data_transformers import GarminTransformer, WhoopTransformer
from .data_formats.biometric_format import StandardizedBiometricData
from core.models import Athlete

logger = logging.getLogger(__name__)

class DataPipelineService:
    """
    Enhanced data pipeline service that handles collection, transformation,
    and processing of biometric data from multiple sources.
    """
    
    SOURCE_CONFIGS = {
        'garmin': {
            'collector': GarminCollector,
            'processor': GarminProcessor,
            'transformer': GarminTransformer
        },
        'whoop': {
            'collector': WhoopCollector,
            'processor': WhoopProcessor,
            'transformer': WhoopTransformer
        }
    }
    
    def __init__(self, athlete: Athlete):
        self.athlete = athlete
        self.active_sources = self._get_active_sources()
        
    def _get_active_sources(self) -> Dict[str, bool]:
        """Determine which data sources are active for this athlete"""
        return {
            'garmin': hasattr(self.athlete, 'garmin_credentials'),
            'whoop': hasattr(self.athlete, 'whoop_credentials')
        }
    
    def process_source(self, source: str, start_date: date, end_date: date) -> Optional[List[StandardizedBiometricData]]:
        """Process data from a single source"""
        try:
            config = self.SOURCE_CONFIGS[source]
            collector = config['collector'](self.athlete)
            transformer = config['transformer']()
            processor = config['processor'](self.athlete)
            
            # Collect raw data
            raw_data = collector.collect_data(start_date, end_date)
            if not raw_data:
                return None
                
            # Transform to standard format
            standardized_data = [
                transformer.transform_to_standard_format(data)
                for data in raw_data
            ]
            
            # Process and store
            for data in standardized_data:
                processor.process_and_store(data)
                
            return standardized_data
            
        except Exception as e:
            logger.error(f"Error processing {source} data: {str(e)}")
            return None
    
    def update_athlete_data(self, start_date: Optional[date] = None, 
                          end_date: Optional[date] = None) -> Dict[str, List[StandardizedBiometricData]]:
        """
        Update athlete data from all active sources
        Returns dict of {source: standardized_data}
        """
        results = {}
        
        for source, is_active in self.active_sources.items():
            if not is_active:
                continue
                
            standardized_data = self.process_source(source, start_date, end_date)
            if standardized_data:
                results[source] = standardized_data
        
        return results 