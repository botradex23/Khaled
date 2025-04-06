#!/bin/bash

# Set the correct Node.js path from Nix
export PATH=/nix/store/hdq16s6vq9smhmcyl4ipmwfp9f2558rc-nodejs-20.10.0/bin:$PATH

# Run the server with proper environment
exec npm run dev