#!/bin/bash

# ==================== 生产环境回滚脚本 ====================
# FastAPI 后端生产环境回滚脚本（Linux/macOS）
#
# 使用方法:
#   ./scripts/rollback-production.sh [选项]
#
# 选项:
#   --backup-file <文件>  指定要恢复的备份文件
#   --list-backups        列出所有可用的备份
#   --help                显示帮助信息

set -e

# ==================== 颜色定义 ====================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
DOCKER_COMPOSE_FILE="$PROJECT_DIR/docker-compose.prod.yml"
BACKUP_DIR="$PROJECT_DIR/backups"
ROLLBACK_LOG="$PROJECT_DIR/logs/rollback.log"

BACKUP_FILE=""
LIST_BACKUPS=false

# ==================== 解析命令行参数 ====================
while [[ $# -gt 0 ]]; do
    case $1 in
        --backup-file)
            BACKUP_FILE="$2"
            shift 2
            ;;
        --list-backups)
            LIST_BACKUPS=true
            shift
            ;;
        --help)
            echo "FastAPI 后端生产环境回滚脚本"
            echo ""
            echo "使用方法:"
            echo "  ./scripts/rollback-production.sh [选项]"
            echo ""
            echo "选项:"
            echo "  --backup-file <文件>  指定要恢复的备份文件"
            echo "  --list-backups        列出所有可用的备份"
            echo "  --help                显示帮助信息"
            exit 0
            ;;
        *)
            log_error "未知选项: $1"
            exit 1
            ;;
    esac
done

# ==================== 记录回滚日志 ====================
log_rollback() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$ROLLBACK_LOG"
}

# ==================== 列出备份 ====================
if [ "$LIST_BACKUPS" = true ]; then
    log_info "可用的备份文件:"
    echo ""
    
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR)" ]; then
        log_warning "没有找到备份文件"
        exit 0
    fi
    
    ls -lh "$BACKUP_DIR"/*.sql 2>/dev/null | awk '{print $9, "(" $5 ")", $6, $7, $8}'
    exit 0
fi

# ==================== 显示横幅 ====================
echo "=========================================="
echo "  FastAPI 后端生产环境回滚"
echo "=========================================="
echo ""

log_rollback "开始生产环境回滚"

# ==================== 确认回滚操作 ====================
log_warning "警告: 此操作将回滚到之前的版本"
log_warning "这将停止当前服务并恢复数据库备份"
echo ""
read -p "确定要继续吗? (yes/no) " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    log_info "回滚操作已取消"
    exit 0
fi

# ==================== 1. 选择备份文件 ====================
if [ -z "$BACKUP_FILE" ]; then
    log_info "步骤 1/5: 选择备份文件..."
    
    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR)" ]; then
        log_error "没有找到备份文件"
        exit 1
    fi
    
    echo "可用的备份文件:"
    echo ""
    
    BACKUPS=($(ls -t "$BACKUP_DIR"/*.sql 2>/dev/null))
    
    if [ ${#BACKUPS[@]} -eq 0 ]; then
        log_error "没有找到备份文件"
        exit 1
    fi
    
    for i in "${!BACKUPS[@]}"; do
        BACKUP_NAME=$(basename "${BACKUPS[$i]}")
        BACKUP_SIZE=$(du -h "${BACKUPS[$i]}" | cut -f1)
        BACKUP_DATE=$(stat -c %y "${BACKUPS[$i]}" 2>/dev/null || stat -f "%Sm" "${BACKUPS[$i]}")
        echo "  [$i] $BACKUP_NAME ($BACKUP_SIZE) - $BACKUP_DATE"
    done
    
    echo ""
    read -p "请选择备份文件编号 [0]: " BACKUP_INDEX
    BACKUP_INDEX=${BACKUP_INDEX:-0}
    
    if [ "$BACKUP_INDEX" -ge 0 ] && [ "$BACKUP_INDEX" -lt "${#BACKUPS[@]}" ]; then
        BACKUP_FILE="${BACKUPS[$BACKUP_INDEX]}"
        log_success "✓ 选择备份文件: $(basename $BACKUP_FILE)"
    else
        log_error "无效的备份文件编号"
        exit 1
    fi
else
    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "备份文件不存在: $BACKUP_FILE"
        exit 1
    fi
    log_success "✓ 使用指定的备份文件: $(basename $BACKUP_FILE)"
fi

log_rollback "选择备份文件: $BACKUP_FILE"

# ==================== 2. 停止当前服务 ====================
log_info "步骤 2/5: 停止当前服务..."

cd "$PROJECT_DIR"

if docker-compose -f "$DOCKER_COMPOSE_FILE" ps | grep -q "Up"; then
    docker-compose -f "$DOCKER_COMPOSE_FILE" down
    log_success "✓ 当前服务已停止"
    log_rollback "当前服务已停止"
else
    log_info "没有运行中的服务"
    log_rollback "没有运行中的服务"
fi

# ==================== 3. 恢复 Docker 镜像 ====================
log_info "步骤 3/5: 恢复 Docker 镜像..."

if docker images fastapi-backend-prod:backup -q | grep -q .; then
    # 删除当前的 latest 标签
    docker rmi fastapi-backend-prod:latest 2>/dev/null || true
    
    # 将 backup 标签改为 latest
    docker tag fastapi-backend-prod:backup fastapi-backend-prod:latest
    
    log_success "✓ Docker 镜像已恢复"
    log_rollback "Docker 镜像已恢复"
else
    log_warning "没有找到备份镜像，将使用当前镜像"
    log_rollback "没有找到备份镜像"
fi

# ==================== 4. 恢复数据库 ====================
log_info "步骤 4/5: 恢复数据库..."

# 启动数据库服务
docker-compose -f "$DOCKER_COMPOSE_FILE" up -d postgres

# 等待数据库就绪
log_info "等待数据库就绪..."
sleep 10

# 从环境文件读取数据库配置
source "$PROJECT_DIR/.env.production"

# 创建恢复前备份
RESTORE_BACKUP="$BACKUP_DIR/before_restore_backup_$(date +%Y%m%d_%H%M%S).sql"
log_info "创建恢复前备份..."
docker exec postgres-prod pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$RESTORE_BACKUP" 2>/dev/null || true

# 恢复数据库
log_info "正在恢复数据库..."
if docker exec -i postgres-prod psql -U "$POSTGRES_USER" "$POSTGRES_DB" < "$BACKUP_FILE"; then
    log_success "✓ 数据库已恢复"
    log_rollback "数据库已恢复: $BACKUP_FILE"
else
    log_error "数据库恢复失败"
    log_rollback "数据库恢复失败"
    
    # 尝试恢复到恢复前的状态
    if [ -f "$RESTORE_BACKUP" ]; then
        log_info "尝试恢复到恢复前的状态..."
        docker exec -i postgres-prod psql -U "$POSTGRES_USER" "$POSTGRES_DB" < "$RESTORE_BACKUP"
    fi
    
    exit 1
fi

# ==================== 5. 启动服务 ====================
log_info "步骤 5/5: 启动服务..."

if docker-compose -f "$DOCKER_COMPOSE_FILE" up -d; then
    log_success "✓ 服务已启动"
    log_rollback "服务已启动"
else
    log_error "服务启动失败"
    log_rollback "服务启动失败"
    exit 1
fi

# ==================== 健康检查 ====================
log_info "执行健康检查..."

MAX_RETRIES=24
RETRY_COUNT=0
HEALTH_CHECK_URL="http://localhost:8000/health"

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -f -s "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
        log_success "✓ 服务健康检查通过"
        log_rollback "服务健康检查通过"
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 5
done

echo ""

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    log_error "服务健康检查失败"
    log_rollback "服务健康检查失败"
    
    # 显示日志
    log_info "查看服务日志:"
    docker-compose -f "$DOCKER_COMPOSE_FILE" logs --tail=50 fastapi-backend
    
    exit 1
fi

# ==================== 回滚完成 ====================
echo ""
echo "=========================================="
log_success "生产环境回滚完成！"
echo "=========================================="
echo ""
log_info "服务信息:"
echo "  - API 地址: http://localhost:8000"
echo "  - API 文档: http://localhost:8000/docs"
echo "  - 健康检查: http://localhost:8000/health"
echo ""
log_info "恢复前备份已保存到:"
echo "  $RESTORE_BACKUP"
echo ""

log_rollback "生产环境回滚完成"

exit 0
