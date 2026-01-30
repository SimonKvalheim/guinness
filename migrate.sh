#!/bin/sh
# Migration script for Railway deployment
set -e

echo "Running database migrations..."
cd /app
/app/node_modules/.bin/prisma migrate deploy

echo "Migrations completed successfully!"
