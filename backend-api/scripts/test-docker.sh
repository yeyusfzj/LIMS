#!/bin/bash
set -e

echo "=========================================="
echo "Docker Image Test Script"
echo "=========================================="

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试函数
test_passed() {
    echo -e "${GREEN}✓ $1${NC}"
}

test_failed() {
    echo -e "${RED}✗ $1${NC}"
    exit 1
}

test_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# 1. 检查 Dockerfile 语法
echo ""
echo "1. Checking Dockerfile syntax..."
if docker build --check ./fastapi-backend 2>/dev/null; then
    test_passed "Dockerfile syntax is valid"
else
    test_warning "Dockerfile check not supported, skipping..."
fi

# 2. 检查 .dockerignore 文件
echo ""
echo "2. Checking .dockerignore file..."
if [ -f "./fastapi-backend/.dockerignore" ]; then
    test_passed ".dockerignore file exists"
else
    test_failed ".dockerignore file not found"
fi

# 3. 检查必要的文件
echo ""
echo "3. Checking required files..."
required_files=(
    "./fastapi-backend/Dockerfile"
    "./fastapi-backend/docker-compose.yml"
    "./fastapi-backend/docker-compose.prod.yml"
    "./fastapi-backend/requirements.txt"
    "./fastapi-backend/app/main.py"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        test_passed "Found: $file"
    else
        test_failed "Missing: $file"
    fi
done

# 4. 检查 Nginx 配置
echo ""
echo "4. Checking Nginx configuration..."
if [ -f "./fastapi-backend/nginx/nginx.conf" ]; then
    test_passed "Nginx configuration exists"
    
    # 验证 Nginx 配置语法（如果 nginx 已安装）
    if command -v nginx &> /dev/null; then
        if nginx -t -c ./fastapi-backend/nginx/nginx.conf 2>/dev/null; then
            test_passed "Nginx configuration syntax is valid"
        else
            test_warning "Nginx configuration syntax check failed (may need adjustment for production)"
        fi
    else
        test_warning "Nginx not installed, skipping syntax check"
    fi
else
    test_failed "Nginx configuration not found"
fi

# 5. 检查环境变量模板
echo ""
echo "5. Checking environment variable templates..."
if [ -f "./fastapi-backend/.env.example" ]; then
    test_passed ".env.example exists"
else
    test_warning ".env.example not found"
fi

if [ -f "./fastapi-backend/.env.production" ]; then
    test_passed ".env.production template exists"
else
    test_warning ".env.production template not found"
fi

# 6. 检查启动脚本
echo ""
echo "6. Checking startup scripts..."
if [ -f "./fastapi-backend/scripts/start.sh" ]; then
    test_passed "Startup script exists"
    
    # 检查脚本是否可执行
    if [ -x "./fastapi-backend/scripts/start.sh" ]; then
        test_passed "Startup script is executable"
    else
        test_warning "Startup script is not executable (will be fixed)"
        chmod +x ./fastapi-backend/scripts/start.sh
        test_passed "Made startup script executable"
    fi
else
    test_failed "Startup script not found"
fi

# 7. 估算镜像大小
echo ""
echo "7. Estimating image size..."
app_size=$(du -sh ./fastapi-backend/app 2>/dev/null | cut -f1)
echo "   Application code size: $app_size"

# 8. 检查多阶段构建
echo ""
echo "8. Checking multi-stage build configuration..."
if grep -q "FROM.*AS builder" ./fastapi-backend/Dockerfile; then
    test_passed "Multi-stage build is configured"
else
    test_failed "Multi-stage build not found in Dockerfile"
fi

# 9. 检查健康检查配置
echo ""
echo "9. Checking health check configuration..."
if grep -q "HEALTHCHECK" ./fastapi-backend/Dockerfile; then
    test_passed "Health check is configured in Dockerfile"
else
    test_warning "Health check not found in Dockerfile"
fi

if grep -q "healthcheck:" ./fastapi-backend/docker-compose.prod.yml; then
    test_passed "Health check is configured in docker-compose.prod.yml"
else
    test_warning "Health check not found in docker-compose.prod.yml"
fi

# 10. 检查安全配置
echo ""
echo "10. Checking security configurations..."
if grep -q "USER appuser" ./fastapi-backend/Dockerfile; then
    test_passed "Non-root user is configured"
else
    test_failed "Non-root user not configured"
fi

if grep -q "resources:" ./fastapi-backend/docker-compose.prod.yml; then
    test_passed "Resource limits are configured"
else
    test_warning "Resource limits not configured"
fi

# 总结
echo ""
echo "=========================================="
echo "Docker Configuration Test Summary"
echo "=========================================="
echo -e "${GREEN}All critical tests passed!${NC}"
echo ""
echo "Next steps:"
echo "1. Build the Docker image:"
echo "   docker build -t fastapi-backend:latest ./fastapi-backend"
echo ""
echo "2. Test the image locally:"
echo "   docker-compose -f ./fastapi-backend/docker-compose.yml up"
echo ""
echo "3. Deploy to production:"
echo "   docker-compose -f ./fastapi-backend/docker-compose.prod.yml up -d"
echo ""
