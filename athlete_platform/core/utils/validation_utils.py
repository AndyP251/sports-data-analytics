from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)

class DataValidator:
    @staticmethod
    def validate_required_fields(data: Dict[str, Any], required_fields: List[str], 
                               nested_fields: Optional[Dict[str, List[str]]] = None) -> bool:
        """
        Generic field validator that can handle nested structures
        Usage:
        validate_required_fields(
            data,
            ['date', 'source'],
            {'metrics': ['heart_rate', 'steps']}
        )
        """
        try:
            # Check top-level fields
            if not all(field in data for field in required_fields):
                return False
            
            # Check nested fields if specified
            if nested_fields:
                for parent, children in nested_fields.items():
                    if parent not in data:
                        return False
                    if not all(child in data[parent] for child in children):
                        return False
            
            return True
            
        except Exception as e:
            logger.error(f"Validation error: {e}")
            return False 