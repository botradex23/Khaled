# Makefile for Cryptocurrency Trading Platform

.PHONY: start dev test

# Default target: run the application
start:
	node start.cjs

# Development mode
dev:
	node start.cjs

# Install dependencies
install:
	npm install

# Test the application
test:
	echo "Running tests..."
	node test.cjs