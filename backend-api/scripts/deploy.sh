#!/bin/bash
set -e

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
IMAGE_NAME="fastapi-backend"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"

echo -e "${BLUE}=========================================="
echo "FastAPI Backend Deployment Script"
echo -e "==========================================${NC}"

# 检查参数
if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --build          Build Docker image"
    echo "  --start          Start services"
    echo "  --stop           Stop services"
    echo "  --restart        Restart services"
    echo "  --logs           Show logs"
    echo "  --status         Show service status"
    echo "  --backup         Backup database"
    echo "  --migrate        Run database migrations"
    echo "  --rollback       Rollback to previous version"
    echo "  --help, -h       Show this help message"
    echo ""
    exit 0
fi

# 函数：检查环境变量文件
check_env_file() {
    if [ ! -f "$ENV_FILE" ]; then
        echo -e "${RED}Error: Environment file $ENV_FILE not found!${NC}"
        echo -e "${YELLOW}Please create it from .env.production template:${NC}"
        echo "  cp .env.production $ENV_FILE"
        echo "  nano $ENV_FILE"
        exit 1
    fi
    
    # 检查关键配置
    source $ENV_FILE
    
    if [ "$JWT_SECRET_KEY" == "YOUR_STRONG_SECRET_KEY_HERE_CHANGE_IN_PRODUCTION" ]; then
        echo -e "${RED}Error: JWT_SECRET_KEY not configured!${NC}"
        echo -e "${YELLOW}Please update $ENV_FILE with a strong secret key${NC}"
        exit 1
    fi
    
    if [ "$POSTGRES_PASSWORD" == "YOUR_STRONG_PASSWORD_HERE" ]; then
        echo -e "${RED}Error: POSTGRES_PASSWORD not configured!${NC}"
        echo -e "${YELLOW}Please update $ENV_FILE with a strong password${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Environment configuration validated${NC}"
}

# 函数：构建镜像
build_image() {
    echo -e "${BLUE}Building Docker image...${NC}"
    
    # 获取版本号
    VERSION=$(grep "APP_VERSION=" $ENV_FILE | cut -d'=' -f2)
    if [ -z "$VERSION" ]; then
        VERSION="latest"
    fi
    
    # 构建镜像
    docker build -t $IMAGE_NAME:$VERSION -t $IMAGE_NAME:latest .
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Docker image built successfully${NC}"
        echo "  Image: $IMAGE_NAME:$VERSION"
        echo "  Size: $(docker images $IMAGE_NAME:$VERSION --format "{{.Size}}")"
    else
        echo -e "${RED}✗ Failed to build Docker image${NC}"
        exit 1
    fi
}

# 函数：启动服务
start_services() {
    echo -e "${BLUE}Starting services...${NC}"
    
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Services started successfully${NC}"
        
        # 等待服务就绪
        echo "Waiting for services to be ready..."
        sleep 10
        
        # 检查健康状态
        check_health
    else
        echo -e "${RED}✗ Failed to start services${NC}"
        exit 1
    fi
}

# 函数：停止服务
stop_services() {
    echo -e "${BLUE}Stopping services...${NC}"
    
    docker-compose -f $COMPOSE_FILE down
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Services stopped successfully${NC}"
    else
        echo -e "${RED}✗ Failed to stop services${NC}"
        exit 1
    fi
}

# 函数：重启服务
restart_services() {
    echo -e "${BLUE}Restarting services...${NC}"
    
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE restart
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Services restarted successfully${NC}"
        
        # 检查健康状态
        sleep 5
        check_health
    else
        echo -e "${RED}✗ Failed to restart services${NC}"
        exit 1
    fi
}

# 函数：查看日志
show_logs() {
    echo -e "${BLUE}Showing logs...${NC}"
    docker-compose -f $COMPOSE_FILE logs -f --tail=100
}

# 函数：查看状态
show_status() {
    echo -e "${BLUE}Service Status:${NC}"
    docker-compose -f $COMPOSE_FILE ps
    
    echo ""
    echo -e "${BLUE}Resource Usage:${NC}"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" \
        $(docker-compose -f $COMPOSE_FILE ps -q)
}

# 函数：检查健康状态
check_health() {
    echo -e "${BLUE}Checking health status...${NC}"
    
    # 检查 API 健康状态
    for i in {1..30}; do
        if curl -f -s http://localhost:8000/health > /dev/null; then
            echo -e "${GREEN}✓ API is healthy${NC}"
            
            # 显示详细健康信息
            curl -s http://localhost:8000/health/detailed | jq '.' 2>/dev/null || echo ""
            return 0
        fi
        echo "Waiting for API to be ready... ($i/30)"
        sleep 2
    done
    
    echo -e "${RED}✗ API health check failed${NC}"
    echo "Please check logs: docker-compose -f $COMPOSE_FILE logs fastapi-backend"
    return 1
}

# 函数：备份数据库
backup_database() {
    echo -e "${BLUE}Backing up database...${NC}"
    
    # 创建备份目录
    mkdir -p backups
    
    # 生成备份文件名
    BACKUP_FILE="backups/backup-$(date +%Y%m%d-%H%M%S).sql"
    
    # 执行备份
    docker-compose -f $COMPOSE_FILE exec -T postgres pg_dump -U postgres laboratory > $BACKUP_FILE
    
    if [ $? -eq 0 ]; then
        # 压缩备份
        gzip $BACKUP_FILE
        echo -e "${GREEN}✓ Database backup created: ${BACKUP_FILE}.gz${NC}"
        
        # 显示备份大小
        echo "  Size: $(du -h ${BACKUP_FILE}.gz | cut -f1)"
    else
        echo -e "${RED}✗ Database backup failed${NC}"
        exit 1
    fi
}

# 函数：运行数据库迁移
run_migrations() {
    echo -e "${BLUE}Running database migrations...${NC}"
    
    docker-compose -f $COMPOSE_FILE exec fastapi-backend alembic upgrade head
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Database migrations completed${NC}"
    else
        echo -e "${RED}✗ Database migrations failed${NC}"
        exit 1
    fi
}

# 函数：回滚
rollback() {
    echo -e "${YELLOW}Rolling back to previous version...${NC}"
    
    # 停止当前服务
    stop_services
    
    # 恢复之前的镜像
    docker tag $IMAGE_NAME:backup $IMAGE_NAME:latest
    
    # 重新启动
    start_services
    
    echo -e "${GREEN}✓ Rollback completed${NC}"
}

# 主逻辑
case "$1" in
    --build)
        check_env_file
        build_image
        ;;
    --start)
        check_env_file
        start_services
        ;;
    --stop)
        stop_services
        ;;
    --restart)
        check_env_file
        restart_services
        ;;
    --logs)
        show_logs
        ;;
    --status)
        show_status
        ;;
    --backup)
        backup_database
        ;;
    --migrate)
        run_migrations
        ;;
    --rollback)
        rollback
        ;;
    *)
        # 默认：完整部署流程
        echo -e "${BLUE}Starting full deployment...${NC}"
        echo ""
        
        # 1. 检查环境配置
        check_env_file
        echo ""
        
        # 2. 备份当前镜像
        if docker images | grep -q "$IMAGE_NAME:latest"; then
            echo -e "${BLUE}Backing up current image...${NC}"
            docker tag $IMAGE_NAME:latest $IMAGE_NAME:backup
            echo -e "${GREEN}✓ Current image backed up${NC}"
            echo ""
        fi
        
        # 3. 构建新镜像
        build_image
        echo ""
        
        # 4. 备份数据库
        if docker-compose -f $COMPOSE_FILE ps | grep -q "postgres"; then
            backup_database
            echo ""
        fi
        
        # 5. 启动服务
        start_services
        echo ""
        
        # 6. 运行迁移
        run_migrations
        echo ""
        
        # 7. 显示状态
        show_status
        echo ""
        
        echo -e "${GREEN}=========================================="
        echo "Deployment completed successfully!"
        echo -e "==========================================${NC}"
        echo ""
        echo "Access your application at:"
        echo "  API: http://localhost:8000"
        echo "  Docs: http://localhost:8000/docs"
        echo "  Health: http://localhost:8000/health"
        echo ""
        echo "Useful commands:"
        echo "  View logs: $0 --logs"
        echo "  Check status: $0 --status"
        echo "  Backup database: $0 --backup"
        echo "  Rollback: $0 --rollback"
        ;;
esac
