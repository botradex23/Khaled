#!/bin/bash

# Update the PATH to include the local node_modules/.bin directory
PATH="./node_modules/.bin:$PATH"

# Run the TypeScript file using tsx
if [ -f "node_modules/.bin/tsx" ]; then
  echo "Found tsx in node_modules/.bin, using it to run server/index.ts"
  ./node_modules/.bin/tsx server/index.ts
else
  echo "tsx not found in node_modules/.bin, attempting to use global tsx"
  tsx server/index.ts
fi