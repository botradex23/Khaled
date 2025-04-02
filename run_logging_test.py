#!/usr/bin/env python3
"""
Run the ML System Logging Demonstration

This script runs the logging demo and captures the output for the user.
"""

import os
import sys
import subprocess
from datetime import datetime

# Create logs directory
logs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
os.makedirs(logs_dir, exist_ok=True)

# Capture the output
output_file = os.path.join(logs_dir, f'logging_demo_output_{datetime.now().strftime("%Y%m%d_%H%M%S")}.txt')

print(f"Starting ML System Logging Demonstration...")
print(f"Output will be saved to: {output_file}")

# Run the test_logging.py script and capture its output
with open(output_file, 'w') as f:
    f.write("ML System Logging Demonstration\n")
    f.write("===============================\n\n")
    
    # Run the main logging demo
    result = subprocess.run(
        [sys.executable, 'python_app/test_logging.py'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    f.write("=== STDOUT ===\n")
    f.write(result.stdout)
    f.write("\n\n=== STDERR ===\n")
    f.write(result.stderr)
    
    # Add a section showing log file list
    f.write("\n\n=== LOG FILES CREATED ===\n")
    log_files = [f for f in os.listdir(logs_dir) if f.endswith('.log') or f.endswith('.json')]
    for log_file in sorted(log_files):
        file_path = os.path.join(logs_dir, log_file)
        file_size = os.path.getsize(file_path)
        f.write(f"{log_file} - {file_size} bytes\n")
    
    # Display a sample from one of the log files
    for log_file in sorted(log_files):
        if log_file == 'prediction_engine.log':
            f.write("\n\n=== SAMPLE FROM prediction_engine.log ===\n")
            with open(os.path.join(logs_dir, log_file), 'r') as log_f:
                sample = log_f.readlines()[:10]  # Get first 10 lines
                f.write(''.join(sample))
            break

print(f"Demonstration complete!")
print(f"Check the output file: {output_file}")
print(f"Log files are stored in: {logs_dir}")