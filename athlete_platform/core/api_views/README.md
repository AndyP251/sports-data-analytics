# OAuth Views

## Flow

 - User clicks "Connect WHOOP Account" button
 - They're redirected to WHOOP authorization page
 - After authorizing, they're redirected back with a code
 - The code is exchanged for tokens
 - Tokens are stored in WhoopCredentials model
 - User's active_data_sources is updated to include 'whoop'
 - WhoopCollector can now use these credentials to fetch data
