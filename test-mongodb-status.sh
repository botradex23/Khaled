#!/bin/bash

# Test MongoDB detailed status endpoint
echo "Testing MongoDB detailed status endpoint..."
curl -v -H "Accept: application/json" -H "Content-Type: application/json" "http://localhost:5000/api/mongodb/detailed-status"
echo -e "\n\nTest complete."