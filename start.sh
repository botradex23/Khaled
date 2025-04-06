#!/bin/bash

# PATH setup for Node.js
export PATH=/nix/store/hdq16s6vq9smhmcyl4ipmwfp9f2558rc-nodejs-20.10.0/bin:$PATH

# Run the custom Node.js script
node run-with-node-path.js
