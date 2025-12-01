#!/bin/bash
set -e

echo "Installing dependencies..."
npm ci

echo "Building application..."
npm run build

echo "Build complete!"
