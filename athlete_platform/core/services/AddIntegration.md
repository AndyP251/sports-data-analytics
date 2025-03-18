# Adding a New Hardware Integration

This document outlines the process for integrating a new hardware source (like Garmin or Whoop) into the data synchronization service of the Athlete Platform.

## Overview of Integration Components

Adding a new integration requires implementing several components:

1. **Collector**: Handles API communication with the hardware service
2. **Processor**: Processes and transforms raw data into a standardized format
3. **Transformer**: Converts data into a standardized format for the platform
4. **Integration in DataSyncService**: Add the new source to the supported sources

## Key Areas in data_sync_service.py to Modify

When adding a new hardware source, you need to modify these specific areas in `data_sync_service.py`:

1. **SUPPORTED_SOURCES Dictionary** (Line ~32): 
   Add your new source to this dictionary with the name of the credentials attribute:
   ```python
   self.SUPPORTED_SOURCES = {
       'garmin': 'garmin_credentials',
       'whoop': 'whoop_credentials',
       'new_service': 'new_service_credentials',  # Add this line
   }
   ```

2. **_initialize_processors Method** (Line ~54):
   Update this method to import and initialize your new processor:
   ```python
   def _initialize_processors(self):
       """Initialize processors for active sources"""
       from .data_processors import GarminProcessor, WhoopProcessor, NewServiceProcessor
       
       for source in self.active_sources:
           try:
               if source == 'garmin':
                   # Garmin initialization...
               elif source == 'whoop':
                   # Whoop initialization...
               elif source == 'new_service':
                   self.processors.append(NewServiceProcessor(self.athlete))
           except Exception as e:
               logger.error(f"Error initializing {source} processor: {e}")
   ```

3. **sync_specific_sources Method** (Line ~109):
   If your service requires special handling, you may need to modify the synchronization logic.
   
4. **get_biometric_data Method** (Line ~217):
   If your service provides unique metrics, you might need to update this method to ensure proper display.

5. **_format_biometric_data Method** (Line ~808):
   Ensure your new service's transformer is properly included in the transformers dictionary.

## Data Standardization Requirements

The system requires all data sources to provide standardized data formats. When implementing a new integration, make sure your transformed data follows these guidelines:

### Required Fields in Standardized Data

Every record returned by the transformer must include:

1. **date**: Date of the record in YYYY-MM-DD format
2. **source**: Identifier of the source (e.g., 'garmin', 'whoop', 'new_service')
3. **metrics**: Dictionary containing standardized metrics

### Required Metrics

The following metrics are required in the `metrics` dictionary:

```python
{
    # Sleep metrics
    'sleep_score': float,  # Overall sleep score (0-100)
    'deep_sleep_seconds': int,  # Deep sleep duration in seconds
    'rem_sleep_seconds': int,  # REM sleep duration in seconds
    'light_sleep_seconds': int,  # Light sleep duration in seconds
    'total_sleep_seconds': int,  # Total sleep duration in seconds
    
    # Heart rate metrics
    'resting_heart_rate': int,  # Resting heart rate in BPM
    'max_heart_rate': int,  # Maximum heart rate in BPM
    'hrv_ms': float,  # Heart rate variability in milliseconds
    
    # Activity metrics
    'calories_burned': float,  # Total calories burned
    'day_strain': float,  # Overall strain/activity score
    
    # Recovery metrics
    'recovery_score': float  # Overall recovery score (0-100)
}
```

### Example Transformation

Here's an example of how to transform device-specific data to the standardized format:

```python
def transform_to_standard_format(self, raw_data):
    # Source-specific mappings and calculations
    sleep_data = raw_data.get('sleep', {})
    hr_data = raw_data.get('heart_rate', {})
    activity_data = raw_data.get('activity', {})
    
    # Map to standardized format
    return {
        'date': raw_data.get('date'),
        'source': 'new_service',
        'metrics': {
            'sleep_score': self._calculate_sleep_score(sleep_data),
            'deep_sleep_seconds': sleep_data.get('deep_sleep_ms', 0) // 1000,
            'rem_sleep_seconds': sleep_data.get('rem_sleep_ms', 0) // 1000,
            'light_sleep_seconds': sleep_data.get('light_sleep_ms', 0) // 1000,
            'total_sleep_seconds': sleep_data.get('total_sleep_ms', 0) // 1000,
            
            'resting_heart_rate': hr_data.get('resting_hr', 0),
            'max_heart_rate': hr_data.get('max_hr', 0),
            'hrv_ms': hr_data.get('hrv', 0),
            
            'calories_burned': activity_data.get('calories', 0),
            'day_strain': self._calculate_strain(activity_data),
            
            'recovery_score': self._calculate_recovery(raw_data)
        }
    }
```

## Step-by-Step Integration Guide

### 1. Add Credentials Model

Create a model to store user credentials for the new service:

```python
# In core/models/credentials.py
class NewServiceCredentials(models.Model):
    athlete = models.OneToOneField(Athlete, on_delete=models.CASCADE, related_name='new_service_credentials')
    access_token = models.CharField(max_length=255)
    refresh_token = models.CharField(max_length=255)
    token_expiry = models.DateTimeField()
    # Any other service-specific fields
```

### 2. Create Base Collector

Create a collector class that handles API communication:

```python
# In core/services/data_collectors/new_service_collector.py
from .base_collector import BaseDataCollector

class NewServiceCollector(BaseDataCollector):
    def __init__(self, athlete):
        self.athlete = athlete
        self.credentials = athlete.new_service_credentials  # Match your model name
        self.api_client = None  # Initialize API client
        
    def authenticate(self):
        # Implement authentication using credentials
        pass
        
    def collect_data(self, start_date, end_date):
        # Implement data collection for the date range
        pass
        
    def refresh_token(self):
        # Implement token refresh logic if needed
        pass
```

### 3. Create Transformer

Create a transformer to standardize data format:

```python
# In core/services/data_transformers/new_service_transformer.py
from .base_transformer import BaseTransformer

class NewServiceTransformer(BaseTransformer):
    def transform_to_standard_format(self, raw_data):
        # Transform raw data to standardized format
        standardized_data = {
            'date': raw_data.get('date'),
            'source': 'new_service',
            # Map all required fields
            'metrics': {
                # Map all metric fields
            }
        }
        return standardized_data
```

### 4. Create Processor

Create a processor to handle data flow:

```python
# In core/services/data_processors/new_service_processor.py
from .base_processor import BaseDataProcessor
from ..data_collectors.new_service_collector import NewServiceCollector
from ..data_transformers.new_service_transformer import NewServiceTransformer
from ...utils.s3_utils import S3Utils
import logging

logger = logging.getLogger(__name__)

class NewServiceProcessor(BaseDataProcessor):
    def __init__(self, athlete):
        super().__init__(athlete)
        self.s3_utils = S3Utils()
        self.base_path = f"accounts/{self.athlete.user.id}/biometric-data/new_service"
        self.collector = NewServiceCollector(self.athlete)
        self.transformer = NewServiceTransformer()
    
    def process_raw_data(self, raw_data):
        # Process raw data into standardized format
        pass
        
    def validate_data(self, processed_data):
        # Validate processed data
        pass
        
    def store_processed_data(self, processed_data, date_value):
        # Store data in CoreBiometricData model
        pass
    
    def sync_data(self, start_date=None, end_date=None, force_refresh=False):
        # Implement sync logic
        pass
    
    # Implement other required methods
```

### 5. Update DataSyncService

Modify `data_sync_service.py` to include the new service:

1. Add the new service to `SUPPORTED_SOURCES` dictionary:

```python
self.SUPPORTED_SOURCES = {
    'garmin': 'garmin_credentials',
    'whoop': 'whoop_credentials',
    'new_service': 'new_service_credentials',  # Add this line
}
```

2. Update the `_initialize_processors` method to include the new processor:

```python
def _initialize_processors(self):
    """Initialize processors for active sources"""
    from .data_processors import GarminProcessor, WhoopProcessor, NewServiceProcessor
    
    for source in self.active_sources:
        try:
            if source == 'garmin':
                # Garmin initialization
                # ...
            elif source == 'whoop':
                # Whoop initialization
                # ...
            elif source == 'new_service':
                # New service initialization
                self.processors.append(NewServiceProcessor(self.athlete))
        except Exception as e:
            logger.error(f"Error initializing {source} processor: {e}")
```

3. Update relevant sync methods to explicitly handle the new service if needed

### 6. Create API Endpoints

Create API endpoints for authentication and data sync:

```python
# In core/api/views.py
class NewServiceAuthView(APIView):
    """Handle new service authentication"""
    
    def post(self, request):
        # Implement auth flow
        pass

class NewServiceSyncView(APIView):
    """Trigger data sync for new service"""
    
    def post(self, request):
        # Implement sync triggering
        pass
```

### 7. Update Frontend

Update frontend to support the new integration:

1. Add connection UI
2. Add visualization components if needed
3. Update settings to enable/disable the integration

## Required Files Checklist

- [ ] `core/models/credentials.py` - Add credentials model
- [ ] `core/services/data_collectors/new_service_collector.py` - API client
- [ ] `core/services/data_transformers/new_service_transformer.py` - Data transformer
- [ ] `core/services/data_processors/new_service_processor.py` - Data processor
- [ ] Update `core/services/data_sync_service.py` - Add to supported sources
- [ ] Update `core/api/views.py` - Add API endpoints
- [ ] Update `core/api/urls.py` - Add URL routes
- [ ] Frontend components for the new integration

## Testing

1. Test authentication flow with the new service
2. Test data collection from API
3. Test data transformation and validation
4. Test data storage and retrieval
5. Test integration with the DataSyncService
6. Test end-to-end workflow from frontend

## Examples

Refer to existing integrations for examples:
- Garmin: See `garmin_processor.py`, `garmin_collector.py`, and `garmin_transformer.py`
- Whoop: See `whoop_processor.py`, `whoop_collector.py`, and `whoop_transformer.py`

## Common Issues

- Ensure API rate limits are respected
- Handle token refresh properly
- Implement proper error handling for API failures
- Ensure data validation before storage
- Properly map data fields to the standardized format 