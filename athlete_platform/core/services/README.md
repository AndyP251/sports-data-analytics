# Data Services

This directory contains the core data processing services for the Athlete Platform.

## Structure

- `data_collectors/`: Services for collecting data from various sources (Garmin, Whoop, etc.)
- `data_processors/`: Services for processing and standardizing collected data
- `data_pipeline.py`: Main pipeline service orchestrating collection and processing

## Adding New Data Sources

To add a new data source:

1. Create a new collector in `data_collectors/` implementing `BaseDataCollector`
2. Create a new processor in `data_processors/` implementing `BaseDataProcessor`
3. Register the new collector/processor pair in `data_pipeline.py`

## Data Flow

1. Data collection (raw data from source)
2. Data processing (standardization)
3. Data validation
4. Storage (database + S3)

## Error Handling

All services implement comprehensive error handling and logging. Errors are:
- Logged using Django's logging system
- Propagated up to the pipeline level
- Reported back to the user interface

## Configuration

Data source credentials and settings are managed through Django settings and environment variables. 