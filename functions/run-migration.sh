#!/bin/bash

# Script to run Prisma migrations with Cloud SQL proxy
# Usage: ./run-migration.sh [migration_name]

cd "$(dirname "$0")"

MIGRATION_NAME="${1:-migration}"

echo "🚀 Starting Cloud SQL Auth Proxy..."
./cloud_sql_proxy --instances=mundo1-dev:us-central1:traval-dev=tcp:5432 &
PROXY_PID=$!

# Wait for proxy to be ready
echo "⏳ Waiting for proxy to connect (5 seconds)..."
sleep 5

# Check if proxy is running
if ps -p $PROXY_PID > /dev/null; then
    echo "✅ Proxy running (PID: $PROXY_PID)"
else
    echo "❌ Proxy failed to start"
    exit 1
fi

# Run the migration
echo ""
echo "📦 Running Prisma migration: $MIGRATION_NAME..."
DATABASE_URL="postgresql://voyageruser:TravalPassWins1_@127.0.0.1:5432/traval-dev" npx prisma migrate dev --name "$MIGRATION_NAME"

MIGRATION_EXIT_CODE=$?

# Stop the proxy
echo ""
echo "🛑 Stopping Cloud SQL proxy..."
kill $PROXY_PID

if [ $MIGRATION_EXIT_CODE -eq 0 ]; then
    echo "✅ Migration completed successfully!"
else
    echo "❌ Migration failed with exit code $MIGRATION_EXIT_CODE"
fi

exit $MIGRATION_EXIT_CODE
