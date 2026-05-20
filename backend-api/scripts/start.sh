#!/bin/bash
set -e

echo "=========================================="
echo "FastAPI Backend Startup Script"
echo "=========================================="

# 等待数据库就绪
echo "Waiting for PostgreSQL to be ready..."
until PGPASSWORD=$POSTGRES_PASSWORD psql -h "postgres" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c '\q' 2>/dev/null; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done
echo "PostgreSQL is ready!"

# 等待 Redis 就绪
echo "Waiting for Redis to be ready..."
until redis-cli -h redis ping 2>/dev/null; do
  echo "Redis is unavailable - sleeping"
  sleep 2
done
echo "Redis is ready!"

# 运行数据库迁移
echo "Running database migrations..."
alembic upgrade head
echo "Database migrations completed!"

# 启动应用
echo "Starting FastAPI application..."
if [ "$ENVIRONMENT" = "production" ]; then
    echo "Running in PRODUCTION mode with multiple workers..."
    exec uvicorn app.main:app \
        --host 0.0.0.0 \
        --port 8000 \
        --workers 4 \
        --log-level info \
        --no-access-log \
        --proxy-headers \
        --forwarded-allow-ips='*'
else
    echo "Running in DEVELOPMENT mode with single worker..."
    exec uvicorn app.main:app \
        --host 0.0.0.0 \
        --port 8000 \
        --reload \
        --log-level debug
fi
