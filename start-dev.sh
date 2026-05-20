#!/bin/bash
# 开发环境启动脚本
# 按正确顺序启动前后端服务

echo "========================================"
echo "实验室管理系统 - 开发环境启动"
echo "========================================"
echo ""

echo "[1/2] 启动 FastAPI 后端 (端口 8001)..."
cd backend-api
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001 &
BACKEND_PID=$!
cd ..
sleep 3

echo "[2/2] 启动 Vue 前端 (端口 5173)..."
cd vue-project
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "========================================"
echo "启动完成！"
echo "========================================"
echo ""
echo "前端地址: http://localhost:5173/"
echo "后端地址: http://localhost:8001/"
echo "API 文档: http://localhost:8001/docs"
echo ""
echo "后端进程 PID: $BACKEND_PID"
echo "前端进程 PID: $FRONTEND_PID"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
wait
