#!/bin/sh
# Startup script to debug environment variables

echo "==================== ENVIRONMENT DEBUG ===================="
echo "NODE_ENV: $NODE_ENV"
echo "DATABASE_URL (first 30 chars): ${DATABASE_URL:0:30}..."
echo "RAILWAY_ENVIRONMENT: $RAILWAY_ENVIRONMENT"
echo "PORT: $PORT"
echo ""
echo "All DATABASE and RAILWAY vars:"
env | grep -E "(DATABASE|RAILWAY)" || echo "No DATABASE/RAILWAY vars found"
echo "==========================================================="

# Start the Next.js server
exec node server.js
