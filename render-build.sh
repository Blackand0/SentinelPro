#!/bin/bash
set -e

echo "Installing dependencies..."
npm ci

echo "Checking Render environment configuration..."
npm run render:check

echo "Building application..."
npm run build

echo "Running database migrations for RLS..."
npm run db:migrate:rls
npm run db:migrate:rls-fix

echo "Verifying RLS configuration..."
npm run db:verify:rls

echo "Build and database setup complete!"
