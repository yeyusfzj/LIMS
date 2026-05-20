#!/bin/bash

# ==================== 生产环境部署脚本 ====================
# FastAPI 后端生产环境部署脚本（Linux/macOS）
#
# 使用方法:
#   ./scripts/deploy-production.sh [选项]
#
# 选项:
#   --skip-checks     跳过部署前检查
#   --skip-backup     跳过数据库备份
#   --skip-migration  跳过数据库迁移
#   --rollback        回滚到上一个版本
#   --help            显示帮助信息

set -e  # 遇到错误立即退出

# ==================== 颜色定义 ====================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==================== 辅助函数 ====================
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

# ==================== 配置变量 ====================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env.production"
DOCKER_COMPOSE_FILE="$PROJECT_DIR/docker-compose.prod.yml"
BACKUP_DIR="$PROJECT_DIR/backups"
DEPLOYMENT_LOG="$PROJECT_DIR/logs/deployment.log"

# 部署选项
SKIP_CHECKS=false
SKIP_BACKUP=false
SKIP_MIGRATION=false
ROLLBACK=false

# ==================== 解析命令行参数 ====================
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-checks)
            SKIP_CHECKS=true
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --skip-migration)
            SKIP_MIGRATION=true
            shift
            ;;
        --rollback)
            ROLLBACK=true
            shift
            ;;
        --help)
            echo "FastAPI 后端生产环境部署脚本"
            echo ""
            echo "使用方法:"
            echo "  ./scripts/deploy-production.sh [选项]"
            echo ""
            echo "选项:"
            echo "  --skip-checks     跳过部署前检查"
            echo "  --skip-backup     跳过数据库备份"
            echo "  --skip-migration  跳过数据库迁移"
            echo "  --rollback        回滚到上一个版本"
            echo "  --help            显示帮助信息"
            exit 0
            ;;
        *)
            log_error "未知选项: $1"
            exit 1
            ;;
    esac
done

# ==================== 创建日志目录 ====================
mkdir -p "$(dirname "$DEPLOYMENT_LOG")"
mkdir -p "$BACKUP_DIR"

# ==================== 记录部署日志 ====================
log_deployment() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$DEPLOYMENT_LOG"
}

# ==================== 显示横幅 ====================
echo "=========================================="
echo "  FastAPI 后端生产环境部署"
echo "=========================================="
echo ""

log_deployment "开始生产环境部署"

# ==================== 检查是否为回滚操作 ====================
if [ "$ROLLBACK" = true ]; then
    log_info "执行回滚操作..."
    bash "$SCRIPT_DIR/rollback-production.sh"
    exit $?
fi

# ==================== 1. 部署前检查 ====================
if [ "$SKIP_CHECKS" = false ]; then
    log_info "步骤 1/8: 执行部署前检查..."
    
    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装"
        exit 1
    fi
    log_success "✓ Docker 已安装"
    
    # 检查 Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose 未安装"
        exit 1
    fi
    log_success "✓ Docker Compose 已安装"
    
    # 检查环境配置文件
    if [ ! -f "$ENV_FILE" ]; then
        log_error "环境配置文件不存在: $ENV_FILE"
        log_info "请复制 .env.production.template 为 .env.production 并填写配置"
        exit 1
    fi
    log_success "✓ 环境配置文件存在"
    
    # 检查 Docker Compose 文件
    if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
        log_error "Docker Compose 文件不存在: $DOCKER_COMPOSE_FILE"
        exit 1
    fi
    log_success "✓ Docker Compose 文件存在"
    
    # 检查磁盘空间（至少需要 10GB）
    AVAILABLE_SPACE=$(df -BG "$PROJECT_DIR" | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$AVAILABLE_SPACE" -lt 10 ]; then
        log_warning "磁盘空间不足 10GB，当前可用: ${AVAILABLE_SPACE}GB"
        read -p "是否继续部署? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    log_success "✓ 磁盘空间充足"
    
    # 检查内存（至少需要 4GB）
    AVAILABLE_MEMORY=$(free -g | awk 'NR==2 {print $7}')
    if [ "$AVAILABLE_MEMORY" -lt 4 ]; then
        log_warning "可用内存不足 4GB，当前可用: ${AVAILABLE_MEMORY}GB"
        read -p "是否继续部署? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    log_success "✓ 内存充足"
    
    log_success "部署前检查完成"
    log_deployment "部署前检查通过"
else
    log_warning "跳过部署前检查"
    log_deployment "跳过部署前检查"
fi

# ==================== 2. 备份当前数据库 ====================
if [ "$SKIP_BACKUP" = false ]; then
    log_info "步骤 2/8: 备份当前数据库..."
    
    BACKUP_FILE="$BACKUP_DIR/pre_deployment_backup_$(date +%Y%m%d_%H%M%S).sql"
    
    # 从环境文件读取数据库配置
    source "$ENV_FILE"
    
    # 执行备份
    if docker exec postgres-prod pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$BACKUP_FILE" 2>/dev/null; then
        log_success "✓ 数据库备份完成: $BACKUP_FILE"
        log_deployment "数据库备份完成: $BACKUP_FILE"
    else
        log_warning "数据库备份失败（可能是首次部署）"
        log_deployment "数据库备份失败"
    fi
else
    log_warning "跳过数据库备份"
    log_deployment "跳过数据库备份"
fi

# ==================== 3. 拉取最新代码 ====================
log_info "步骤 3/8: 拉取最新代码..."

if [ -d "$PROJECT_DIR/.git" ]; then
    cd "$PROJECT_DIR"
    CURRENT_COMMIT=$(git rev-parse HEAD)
    log_info "当前提交: $CURRENT_COMMIT"
    
    git pull origin main
    
    NEW_COMMIT=$(git rev-parse HEAD)
    log_info "新提交: $NEW_COMMIT"
    
    if [ "$CURRENT_COMMIT" != "$NEW_COMMIT" ]; then
        log_success "✓ 代码已更新"
        log_deployment "代码更新: $CURRENT_COMMIT -> $NEW_COMMIT"
    else
        log_info "代码已是最新版本"
        log_deployment "代码已是最新版本"
    fi
else
    log_warning "不是 Git 仓库，跳过代码拉取"
    log_deployment "跳过代码拉取"
fi

# ==================== 4. 构建 Docker 镜像 ====================
log_info "步骤 4/8: 构建 Docker 镜像..."

cd "$PROJECT_DIR"

# 标记旧镜像
OLD_IMAGE_ID=$(docker images fastapi-backend-prod:latest -q)
if [ -n "$OLD_IMAGE_ID" ]; then
    docker tag fastapi-backend-prod:latest fastapi-backend-prod:backup
    log_info "已标记旧镜像为 backup"
fi

# 构建新镜像
if docker-compose -f "$DOCKER_COMPOSE_FILE" build --no-cache; then
    log_success "✓ Docker 镜像构建完成"
    log_deployment "Docker 镜像构建完成"
else
    log_error "Docker 镜像构建失败"
    log_deployment "Docker 镜像构建失败"
    exit 1
fi

# ==================== 5. 停止旧服务 ====================
log_info "步骤 5/8: 停止旧服务..."

if docker-compose -f "$DOCKER_COMPOSE_FILE" ps | grep -q "Up"; then
    log_info "正在停止旧服务..."
    docker-compose -f "$DOCKER_COMPOSE_FILE" down
    log_success "✓ 旧服务已停止"
    log_deployment "旧服务已停止"
else
    log_info "没有运行中的服务"
    log_deployment "没有运行中的服务"
fi

# ==================== 6. 执行数据库迁移 ====================
if [ "$SKIP_MIGRATION" = false ]; then
    log_info "步骤 6/8: 执行数据库迁移..."
    
    # 启动数据库服务
    docker-compose -f "$DOCKER_COMPOSE_FILE" up -d postgres redis
    
    # 等待数据库就绪
    log_info "等待数据库就绪..."
    sleep 10
    
    # 执行迁移
    if docker-compose -f "$DOCKER_COMPOSE_FILE" run --rm fastapi-backend alembic upgrade head; then
        log_success "✓ 数据库迁移完成"
        log_deployment "数据库迁移完成"
    else
        log_error "数据库迁移失败"
        log_deployment "数据库迁移失败"
        
        # 询问是否回滚
        read -p "是否回滚到备份? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            bash "$SCRIPT_DIR/rollback-production.sh"
        fi
        exit 1
    fi
else
    log_warning "跳过数据库迁移"
    log_deployment "跳过数据库迁移"
fi

# ==================== 7. 启动新服务 ====================
log_info "步骤 7/8: 启动新服务..."

if docker-compose -f "$DOCKER_COMPOSE_FILE" up -d; then
    log_success "✓ 新服务已启动"
    log_deployment "新服务已启动"
else
    log_error "服务启动失败"
    log_deployment "服务启动失败"
    exit 1
fi

# ==================== 8. 健康检查 ====================
log_info "步骤 8/8: 执行健康检查..."

log_info "等待服务就绪（最多等待 120 秒）..."

MAX_RETRIES=24
RETRY_COUNT=0
HEALTH_CHECK_URL="http://localhost:8000/health"

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f -s "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
        log_success "✓ 服务健康检查通过"
        log_deployment "服务健康检查通过"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 5
done

echo ""

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    log_error "服务健康检查失败"
    log_deployment "服务健康检查失败"
    
    # 显示日志
    log_info "查看服务日志:"
    docker-compose -f "$DOCKER_COMPOSE_FILE" logs --tail=50 fastapi-backend
    
    # 询问是否回滚
    read -p "是否回滚到上一个版本? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        bash "$SCRIPT_DIR/rollback-production.sh"
    fi
    exit 1
fi

# ==================== 验证关键功能 ====================
log_info "验证关键功能..."

# 测试 API 文档
if curl -f -s "http://localhost:8000/docs" > /dev/null 2>&1; then
    log_success "✓ API 文档可访问"
else
    log_warning "API 文档不可访问"
fi

# 测试数据库连接
HEALTH_RESPONSE=$(curl -s "$HEALTH_CHECK_URL/detailed")
if echo "$HEALTH_RESPONSE" | grep -q '"database":"connected"'; then
    log_success "✓ 数据库连接正常"
else
    log_warning "数据库连接异常"
fi

# 测试 Redis 连接
if echo "$HEALTH_RESPONSE" | grep -q '"redis":"connected"'; then
    log_success "✓ Redis 连接正常"
else
    log_warning "Redis 连接异常"
fi

# ==================== 清理旧镜像 ====================
log_info "清理旧镜像..."

if [ -n "$OLD_IMAGE_ID" ]; then
    # 保留 backup 标签的镜像，删除其他旧镜像
    docker images | grep fastapi-backend-prod | grep -v backup | grep -v latest | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true
    log_success "✓ 旧镜像已清理"
fi

# ==================== 部署完成 ====================
echo ""
echo "=========================================="
log_success "生产环境部署完成！"
echo "=========================================="
echo ""
log_info "服务信息:"
echo "  - API 地址: http://localhost:8000"
echo "  - API 文档: http://localhost:8000/docs"
echo "  - 健康检查: http://localhost:8000/health"
echo ""
log_info "查看日志:"
echo "  docker-compose -f $DOCKER_COMPOSE_FILE logs -f"
echo ""
log_info "停止服务:"
echo "  docker-compose -f $DOCKER_COMPOSE_FILE down"
echo ""
log_info "回滚服务:"
echo "  bash $SCRIPT_DIR/rollback-production.sh"
echo ""

log_deployment "生产环境部署完成"

# ==================== 发送部署通知（可选）====================
if [ -n "$ALERT_EMAIL_RECIPIENTS" ]; then
    log_info "发送部署通知..."
    # 这里可以添加发送邮件的逻辑
fi

exit 0
