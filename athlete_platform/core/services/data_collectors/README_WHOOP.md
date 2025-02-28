# Whoop Data Collector Documentation

This document describes the implementation of the `WhoopCollector` class, which is responsible for collecting data from the Whoop API.

## API Endpoints Coverage

The collector provides complete coverage of all Whoop API endpoints:

### Cycle Endpoints
- `/cycle` - Used in `_get_data_for_date` to fetch cycle records
- `/cycle/{cycleId}` - Used in `_get_detailed_record` to get specific cycle details

### Recovery Endpoints
- `/recovery` - Used in `_get_recovery_data` to fetch recovery data
- `/cycle/{cycleId}/recovery` - Used in `_get_cycle_recovery_data` to get recovery for a specific cycle

### Sleep Endpoints
- `/activity/sleep` - Used in `_get_data_for_date` to fetch sleep records
- `/activity/sleep/{sleepId}` - Used in `_get_detailed_record` to get detailed sleep data

### Workout Endpoints
- `/activity/workout` - Used in `_get_data_for_date` for workout records
- `/activity/workout/{workoutId}` - Used in `_get_detailed_workouts` for detailed workout data

### User Endpoints
- `/user/measurement/body` - Used in `_get_user_measurements`
- `/user/profile/basic` - Used in `_get_user_profile`

## Pagination Handling

The collector properly handles pagination for all endpoints that support it. This ensures all available data is collected, regardless of how many records exist.

### Implementation

The `_get_all_records` method is the key component for pagination:

```python
def _get_all_records(self, url: str, params: dict = None) -> List[Dict]:
    """Get all records with pagination support"""
    try:
        all_records = []
        next_token = None
        
        while True:
            request_params = params.copy() if params else {}
            if next_token:
                request_params['nextToken'] = next_token
            
            response = self.make_request('GET', url, request_params)
            
            if not response or 'records' not in response:
                break
                
            all_records.extend(response['records'])
            
            next_token = response.get('next_token')
            if not next_token:
                break
                
        return all_records
    except Exception as e:
        logger.error(f"Error getting paginated records: {e}")
        return []
```

This method:
1. Makes initial request to the API endpoint
2. Collects all records from the response
3. Checks for a `next_token` in the response
4. If token exists, makes subsequent requests with that token
5. Continues until there are no more pages (no more `next_token`)

## Data Collection Process

For any given date range, the collector:

1. Authenticates with the Whoop API
2. Collects user profile and body measurements once
3. For each date in the range:
   - Collects cycle data
   - Collects sleep data
   - Collects recovery data
   - Collects workout data
4. Structures all data in a standardized format
5. Returns the complete dataset

## Error Handling

The implementation includes comprehensive error handling and logging:
- Authentication failures
- API request errors
- Data parsing issues
- Pagination problems

## Usage

The collector is used by calling the `collect_data` method with a start and end date:

```python
collector = WhoopCollector(athlete)
data = collector.collect_data(start_date, end_date)
```

This will return a list of daily data records, each containing all available Whoop data for that day. 