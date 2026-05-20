#!/bin/bash

echo "========================================="
echo "样品登记问题快速测试"
echo "========================================="
echo ""

# 检查Node.js
echo "检查Node.js..."
if command -v node &> /dev/null; then
    echo "✓ Node.js版本: $(node -v)"
else
    echo "✗ Node.js未安装"
    exit 1
fi

# 检查后端服务
echo ""
echo "检查后端服务..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✓ 后端服务运行正常"
else
    echo "✗ 后端服务未运行"
    echo "  请在backend-api目录运行: npm run dev"
    exit 1
fi

# 检查前端服务
echo ""
echo "检查前端服务..."
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✓ 前端服务运行正常"
else
    echo "✗ 前端服务未运行"
    echo "  请在vue-project目录运行: npm run dev"
    exit 1
fi

# 运行API测试
echo ""
echo "运行API测试..."
node debug-sample-issue.js

echo ""
echo "========================================="
echo "测试完成"
echo "========================================="
echo ""
echo "如果测试通过但前端依然看不到样品，请："
echo "1. 打开浏览器开发者工具（F12）"
echo "2. 查看Console标签的日志"
echo "3. 查看Network标签的API请求"
echo "4. 参考 样品显示问题排查指南.md"
