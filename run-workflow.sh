#!/bin/bash

# This script is a simple wrapper to start our application in the workflow
# It will be called by the Replit workflow system

echo "[run-workflow.sh] Starting application workflow..."

# Try to use the workflow-run.cjs script first
if [ -f "workflow-run.cjs" ]; then
  echo "[run-workflow.sh] Using workflow-run.cjs..."
  node workflow-run.cjs
  exit $?
fi

# If workflow-run.cjs doesn't exist, try other scripts
if [ -f "run.py" ]; then
  echo "[run-workflow.sh] Using run.py..."
  python3 run.py
  exit $?
fi

if [ -f "start.js" ]; then
  echo "[run-workflow.sh] Using start.js..."
  node start.js
  exit $?
fi

if [ -f "python_app/app.py" ]; then
  echo "[run-workflow.sh] Using python_app/app.py..."
  python3 python_app/app.py
  exit $?
fi

# If all else fails, run the minimal server
if [ -f "minimal-server.js" ]; then
  echo "[run-workflow.sh] Using minimal-server.js..."
  node minimal-server.js
  exit $?
fi

echo "[run-workflow.sh] No suitable start script found. Exiting."
exit 1
