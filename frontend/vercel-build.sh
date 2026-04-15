#!/bin/bash
set -e

echo "Node.js version:"
node --version

echo "npm version:"
npm --version

echo "Installing dependencies..."
npm install

echo "Building project..."
CI=false npm run build

echo "Build completed successfully!"