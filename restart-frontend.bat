@echo off
chcp 65001 >nul
echo =========================================
echo 重新启动前端服务
echo =========================================
echo.

cd vue-project

echo 正在启动前端服务...
call npm run dev
