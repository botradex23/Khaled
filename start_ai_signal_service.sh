#!/bin/bash

# Create data directories if they don't exist
mkdir -p python_app/data/collections/ai_signals

# Start the AI Signal Service
cd python_app && python run_ai_signal_service.py --port 5001