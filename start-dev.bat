@echo off
REM 开发环境启动脚本
REM 按正确顺序启动前后端服务

echo ========================================
echo 实验室管理系统 - 开发环境启动
echo ========================================
echo.

echo [1/2] 启动 FastAPI 后端 (端口 8001)...
start "FastAPI Backend" cmd /k "cd backend-api && python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001"
timeout /t 3 /nobreak >nul

echo [2/2] 启动 Vue 前端 (端口 5173)...
start "Vue Frontend" cmd /k "cd vue-project && npm run dev"

echo.
echo ========================================
echo 启动完成！
echo ========================================
echo.
echo 前端地址: http://localhost:5173/
echo 后端地址: http://localhost:8001/
echo API 文档: http://localhost:8001/docs
echo.
echo 按任意键关闭此窗口...
pause >nul
