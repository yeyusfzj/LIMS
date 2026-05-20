#!/bin/bash

# ==================== FastAPI 后端测试环境部署脚本 ====================
# 此脚本用于将 FastAPI 后端部署到测试环境

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必需的命令
check_requirements() {
    log_info "检查系统要求..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    log_success "系统要求检查通过"
}

# 检查环境变量配置
check_env_config() {
    log_info "检查环境变量配置..."
    
    if [ ! -f ".env.test" ]; then
        log_error ".env.test 文件不存在"
        exit 1
    fi
    
    # 检查关键配置项
    source .env.test
    
    if [ -z "$DATABASE_URL" ]; then
        log_error "DATABASE_URL 未配置"
        exit 1
    fi
    
    if [ -z "$JWT_SECRET_KEY" ]; then
        log_error "JWT_SECRET_KEY 未配置"
        exit 1
    fi
    
    log_success "环境变量配置检查通过"
}

# 检查数据库连接
check_database() {
    log_info "检查数据库连接..."
    
    # 从 .env.test 读取数据库配置
    source .env.test
    
    # 提取数据库连接信息
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\(.*\)/\1/p')
    DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    
    log_info "数据库主机: $DB_HOST"
    log_info "数据库端口: $DB_PORT"
    log_info "数据库名称: $DB_NAME"
    
    # 检查数据库是否可访问
    if command -v pg_isready &> /dev/null; then
        if pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER &> /dev/null; then
            log_success "数据库连接正常"
        else
            log_warning "无法连接到数据库，请确保 PostgreSQL 正在运行"
        fi
    else
        log_warning "pg_isready 未安装，跳过数据库连接检查"
    fi
}

# 检查 Redis 连接
check_redis() {
    log_info "检查 Redis 连接..."
    
    source .env.test
    
    # 提取 Redis 连接信息
    REDIS_HOST=$(echo $REDIS_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    REDIS_PORT=$(echo $REDIS_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    
    log_info "Redis 主机: $REDIS_HOST"
    log_info "Redis 端口: $REDIS_PORT"
    
    # 检查 Redis 是否可访问
    if command -v redis-cli &> /dev/null; then
        if redis-cli -h $REDIS_HOST -p $REDIS_PORT ping &> /dev/null; then
            log_success "Redis 连接正常"
        else
            log_warning "无法连接到 Redis，请确保 Redis 正在运行"
        fi
    else
        log_warning "redis-cli 未安装，跳过 Redis 连接检查"
    fi
}

# 构建 Docker 镜像
build_image() {
    log_info "构建 Docker 镜像..."
    
    docker-compose -f docker-compose.test.yml build
    
    log_success "Docker 镜像构建完成"
}

# 停止旧容器
stop_old_containers() {
    log_info "停止旧容器..."
    
    if docker ps -a | grep -q fastapi-backend-test; then
        docker-compose -f docker-compose.test.yml down
        log_success "旧容器已停止"
    else
        log_info "没有运行中的旧容器"
    fi
}

# 启动服务
start_service() {
    log_info "启动 FastAPI 后端服务..."
    
    docker-compose -f docker-compose.test.yml up -d
    
    log_success "服务启动成功"
}

# 等待服务就绪
wait_for_service() {
    log_info "等待服务就绪..."
    
    MAX_RETRIES=30
    RETRY_COUNT=0
    
    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        if curl -f http://localhost:8001/health &> /dev/null; then
            log_success "服务已就绪"
            return 0
        fi
        
        RETRY_COUNT=$((RETRY_COUNT + 1))
        log_info "等待服务启动... ($RETRY_COUNT/$MAX_RETRIES)"
        sleep 2
    done
    
    log_error "服务启动超时"
    return 1
}

# 验证服务健康状态
verify_health() {
    log_info "验证服务健康状态..."
    
    # 检查基本健康检查
    HEALTH_RESPONSE=$(curl -s http://localhost:8001/health)
    
    if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
        log_success "健康检查通过"
    else
        log_error "健康检查失败"
        log_error "响应: $HEALTH_RESPONSE"
        return 1
    fi
    
    # 检查数据库连接
    if echo "$HEALTH_RESPONSE" | grep -q "database"; then
        log_success "数据库连接正常"
    else
        log_warning "无法验证数据库连接状态"
    fi
}

# 验证 API 端点
verify_api_endpoints() {
    log_info "验证 API 端点..."
    
    # 测试 OpenAPI 文档
    if curl -f http://localhost:8001/docs &> /dev/null; then
        log_success "OpenAPI 文档可访问"
    else
        log_warning "OpenAPI 文档不可访问"
    fi
    
    # 测试 API 根路径
    if curl -f http://localhost:8001/api/v1/ &> /dev/null; then
        log_success "API 根路径可访问"
    else
        log_warning "API 根路径不可访问"
    fi
}

# 显示服务信息
show_service_info() {
    log_info "=========================================="
    log_info "FastAPI 后端测试环境部署完成"
    log_info "=========================================="
    echo ""
    log_info "服务地址: http://localhost:8001"
    log_info "API 文档: http://localhost:8001/docs"
    log_info "健康检查: http://localhost:8001/health"
    echo ""
    log_info "查看日志: docker-compose -f docker-compose.test.yml logs -f"
    log_info "停止服务: docker-compose -f docker-compose.test.yml down"
    log_info "重启服务: docker-compose -f docker-compose.test.yml restart"
    echo ""
}

# 显示容器状态
show_container_status() {
    log_info "容器状态:"
    docker-compose -f docker-compose.test.yml ps
}

# 主函数
main() {
    log_info "=========================================="
    log_info "开始部署 FastAPI 后端到测试环境"
    log_info "=========================================="
    echo ""
    
    # 执行部署步骤
    check_requirements
    check_env_config
    check_database
    check_redis
    stop_old_containers
    build_image
    start_service
    
    # 等待服务就绪
    if wait_for_service; then
        verify_health
        verify_api_endpoints
        show_service_info
        show_container_status
        
        log_success "部署完成！"
        exit 0
    else
        log_error "部署失败，请查看日志"
        docker-compose -f docker-compose.test.yml logs --tail=50
        exit 1
    fi
}

# 执行主函数
main
