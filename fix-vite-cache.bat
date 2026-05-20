@echo off
chcp 65001 >nul
echo =========================================
echo 彻底清除 Vite 缓存并重启
echo =========================================
echo.

cd vue-project

echo 步骤1: 删除所有缓存目录...
if exist "node_modules\.vite" (
    rmdir /s /q "node_modules\.vite"
    echo ✓ 已删除 node_modules\.vite
)

if exist ".vite" (
    rmdir /s /q ".vite"
    echo ✓ 已删除 .vite
)

if exist "dist" (
    rmdir /s /q "dist"
    echo ✓ 已删除 dist
)

echo.
echo 步骤2: 清除 npm 缓存...
call npm cache clean --force
echo ✓ npm 缓存已清除

echo.
echo 步骤3: 重新安装依赖...
call npm install
echo ✓ 依赖已重新安装

echo.
echo =========================================
echo 清理完成！
echo =========================================
echo.
echo 现在请：
echo 1. 关闭所有浏览器窗口
echo 2. 按任意键启动前端服务
echo 3. 使用无痕模式打开 http://localhost:5173
echo.
pause

echo.
echo 正在启动前端服务...
call npm run dev
