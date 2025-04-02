# AI Signal Receiver Service

The AI Signal Receiver Service is a backend service that receives, validates, stores, and processes AI trading signals. These signals can be used to drive automated trading decisions in the cryptocurrency trading platform.

## Overview

The service is designed to:

1. Receive AI trading signals via HTTP POST requests
2. Validate the structure and content of the signals
3. Store validated signals in a database
4. Prepare signals for further processing by the trade execution service
5. Provide an API to query stored signals

## API Endpoints

### POST /api/ai-signal

Endpoint to receive AI trading signals.

**Request Format:**

```json
{
  "symbol": "BTCUSDT",
  "action": "BUY",
  "confidence": 0.75,
  "timestamp": "2025-04-02T10:30:00Z",
  "source": "momentum_strategy",
  "metadata": {
    "key1": "value1",
    "key2": "value2"
  },
  "raw_data": {
    "technical_indicators": {
      "rsi": 68,
      "macd": 0.25
    }
  }
}
```

**Required Fields:**

- `symbol` (string): Trading pair symbol (e.g., "BTCUSDT")
- `action` (string): Action to take ("BUY", "SELL", "HOLD")
- `confidence` (float): Confidence level between 0 and 1
- `timestamp` (string/number): Signal timestamp in ISO format or Unix timestamp

**Optional Fields:**

- `source` (string): Source of the signal
- `metadata` (object): Additional metadata
- `raw_data` (object): Raw data used to generate the signal

**Response Format (Success - 201 Created):**

```json
{
  "success": true,
  "message": "Signal received and processed successfully",
  "signal": {
    "symbol": "BTCUSDT",
    "action": "BUY",
    "confidence": 0.75,
    "timestamp": 1712053800.0,
    "timestamp_iso": "2025-04-02T10:30:00",
    "received_at": 1712053830.5,
    "received_at_iso": "2025-04-02T10:30:30.500000",
    "source": "momentum_strategy"
  },
  "stored": true
}
```

**Response Format (Error - 400 Bad Request):**

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "action": "Action must be one of: BUY, SELL, HOLD",
    "confidence": "Confidence must be between 0 and 1"
  }
}
```

### GET /api/ai-signals

Endpoint to list AI trading signals stored in the database.

**Query Parameters:**

- `symbol` (optional): Filter by symbol (e.g., "BTCUSDT")
- `action` (optional): Filter by action (e.g., "BUY")
- `limit` (optional): Maximum number of signals to return (default: 50)

**Response Format:**

```json
{
  "success": true,
  "count": 2,
  "signals": [
    {
      "_id": "1712053830500_123456789",
      "symbol": "BTCUSDT",
      "action": "BUY",
      "confidence": 0.75,
      "timestamp": 1712053800.0,
      "timestamp_iso": "2025-04-02T10:30:00",
      "received_at": 1712053830.5,
      "received_at_iso": "2025-04-02T10:30:30.500000",
      "source": "momentum_strategy"
    },
    {
      "_id": "1712053730500_987654321",
      "symbol": "ETHUSDT",
      "action": "SELL",
      "confidence": 0.68,
      "timestamp": 1712053700.0,
      "timestamp_iso": "2025-04-02T10:28:20",
      "received_at": 1712053730.5,
      "received_at_iso": "2025-04-02T10:28:50.500000",
      "source": "trend_strategy"
    }
  ]
}
```

## Architecture

The AI Signal Receiver Service consists of the following components:

1. **Signal Validator**: Validates incoming AI trading signals
2. **Signal Receiver**: Processes validated signals
3. **Database Service**: Stores signals in a database
4. **AI Signals Route**: Exposes the API endpoints

### Signal Flow

```
HTTP POST /api/ai-signal 
  → Signal Validator (validation)
    → Signal Receiver (processing)
      → Database Service (storage)
        → Queue for Trade Execution (future)
```

## Implementation Details

### Signal Validation

Signals are validated to ensure they have the required fields and correct data types. The validation includes:

- Presence of required fields (symbol, action, confidence, timestamp)
- Correct format and value ranges (e.g., confidence between 0-1)
- Symbol format validation
- Action validation against allowed values (BUY, SELL, HOLD)
- Timestamp format validation

### Signal Normalization

Validated signals are normalized to ensure consistent format:

- Symbol is converted to uppercase
- Action is converted to uppercase
- Confidence is ensured to be a float
- Timestamp is normalized to both Unix timestamp and ISO format
- Additional timestamps are added (received_at, stored_at)

### Storage

Signals are stored in a database. In the current implementation, this is a simple file-based storage system, but it can be easily replaced with a proper database like MongoDB in production.

### Future Enhancements

The service is designed to be extended with the following features:

1. **Message Queue Integration**: Add the signals to a message queue (e.g., RabbitMQ, Redis) for more robust processing
2. **Rate Limiting**: Add rate limiting to prevent abuse
3. **Authentication**: Add authentication to secure the API
4. **Monitoring**: Add monitoring to track the health of the service
5. **Metrics**: Add metrics to track the performance of the service

## Testing

A test script (`test_ai_signal_receiver.py`) is provided to test the service. It sends both valid and invalid signals to the API and verifies the responses.

To run the test script:

```bash
python test_ai_signal_receiver.py
```

The test script verifies:

1. Successful processing of valid signals
2. Proper rejection of invalid signals
3. Ability to retrieve stored signals

## Configuration

The service uses the application's main configuration defined in `config.py`. No additional configuration is needed specifically for this service.

## Dependencies

The service depends on:

- Flask for the API endpoints
- The application's database service for storage
- Python's standard library for JSON handling and timestamp management

## API Security Notes

In a production environment, this API should be secured with:

1. API key or token-based authentication
2. Rate limiting to prevent abuse
3. HTTPS to encrypt the communication
4. Input validation to prevent injection attacks