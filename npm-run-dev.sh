#!/bin/bash
# This wrapper script is a workaround for the tsx dependency issue
# Instead of running 'tsx server/index.ts', we run our minimal server

echo "Starting crypto trading platform with minimal server..."
node minimal_server.cjs
