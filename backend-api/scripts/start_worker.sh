#!/bin/bash

# ARQ Worker 启动脚本

echo "启动 ARQ Worker..."

# 设置 Python 路径
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# 启动 worker
arq app.worker.WorkerSettings

echo "ARQ Worker 已停止"
