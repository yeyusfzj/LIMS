@echo off
chcp 65001 >nul
echo =========================================
echo 样品登记问题快速测试
echo =========================================
echo.

REM 检查Node.js
echo 检查Node.js...
where node >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
    echo ✓ Node.js版本: %NODE_VERSION%
) else (
    echo ✗ Node.js未安装
    exit /b 1
)

REM 检查后端服务
echo.
echo 检查后端服务...
curl -s http://localhost:3000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ 后端服务运行正常
) else (
    echo ✗ 后端服务未运行
    echo   请在backend-api目录运行: npm run dev
    exit /b 1
)

REM 检查前端服务
echo.
echo 检查前端服务...
curl -s http://localhost:5173 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ 前端服务运行正常
) else (
    echo ✗ 前端服务未运行
    echo   请在vue-project目录运行: npm run dev
    exit /b 1
)

REM 运行API测试
echo.
echo 运行API测试...
node debug-sample-issue.js

echo.
echo =========================================
echo 测试完成
echo =========================================
echo.
echo 如果测试通过但前端依然看不到样品，请：
echo 1. 打开浏览器开发者工具（F12）
echo 2. 查看Console标签的日志
echo 3. 查看Network标签的API请求
echo 4. 参考 样品显示问题排查指南.md
echo.
pause
