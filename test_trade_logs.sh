#!/bin/bash

# Test script for checking API directly
echo "Testing Trade Logs API directly"

# Get the current Replit URL
REPLIT_URL=$(echo "$REPLIT_URL" || echo "https://19672ae6-76ec-438b-bcbb-ffac6b7f8d7b-00-3hmbhopvnwpnm.picard.replit.dev")

# Test the GET endpoint
echo -e "\n-- Testing GET /api/trade-logs --"
curl -s "${REPLIT_URL}/api/trade-logs" | head -n 20
echo ""

# Test creating a trade log
echo -e "\n-- Testing POST /api/trade-logs --"
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"symbol":"BTC-USDT","action":"BUY","entry_price":"69000","quantity":"0.1","trade_source":"TEST"}' \
  "${REPLIT_URL}/api/trade-logs"
echo -e "\n"

# Now fetch logs again to see the new entry
echo -e "\n-- Testing GET /api/trade-logs again --"
curl -s "${REPLIT_URL}/api/trade-logs" | head -n 20
echo -e "\n-- Done --"