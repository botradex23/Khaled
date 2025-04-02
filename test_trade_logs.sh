#!/bin/bash

echo "Testing Trade Logs API..."

# Let's try with the Express server's default port
PORT=3000

echo "Testing POST to http://localhost:$PORT/api/trade-logs"
CREATE_RESPONSE=$(curl -v -X POST http://localhost:$PORT/api/trade-logs \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "action": "BUY",
    "entry_price": "50000",
    "quantity": "0.1",
    "trade_source": "ML_MODEL",
    "status": "EXECUTED",
    "predicted_confidence": "0.85",
    "reason": null,
    "user_id": 1
  }' 2>&1)

echo "Create response: $CREATE_RESPONSE"

echo "Testing GET to http://localhost:$PORT/api/trade-logs"
GET_RESPONSE=$(curl -v http://localhost:$PORT/api/trade-logs 2>&1)

echo "Get response: $GET_RESPONSE"

# Now let's try with port 5000
PORT=5000

echo "Testing POST to http://localhost:$PORT/api/trade-logs"
CREATE_RESPONSE=$(curl -v -X POST http://localhost:$PORT/api/trade-logs \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTCUSDT",
    "action": "BUY",
    "entry_price": "50000",
    "quantity": "0.1",
    "trade_source": "ML_MODEL",
    "status": "EXECUTED",
    "predicted_confidence": "0.85",
    "reason": null,
    "user_id": 1
  }' 2>&1)

echo "Create response: $CREATE_RESPONSE"

echo "Testing GET to http://localhost:$PORT/api/trade-logs"
GET_RESPONSE=$(curl -v http://localhost:$PORT/api/trade-logs 2>&1)

echo "Get response: $GET_RESPONSE"

echo "Test complete!"