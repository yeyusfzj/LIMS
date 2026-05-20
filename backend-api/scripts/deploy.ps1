# FastAPI Backend 部署脚本
param(
    [Parameter(Position=0)]
    [ValidateSet("build", "start", "stop", "restart", "logs", "status", "backup", "migrate", "rollback", "help")]
    [string]$Action = "deploy"
)

# 配置
$IMAGE_NAME = "fastapi-backend"
$COMPOSE_FILE = "docker-compose.prod.yml"
$ENV_FILE = ".env.prod"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "FastAPI Backend Deployment Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 函数：显示帮助
function Show-Help {
    Write-Host "Usage: .\deploy.ps1 [ACTION]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Actions:" -ForegroundColor Yellow
    Write-Host "  build          Build Docker image" -ForegroundColor White
    Write-Host "  start          Start services" -ForegroundColor White
    Write-Host "  stop           Stop services" -ForegroundColor White
    Write-Host "  restart        Restart services" -ForegroundColor White
    Write-Host "  logs           Show logs" -ForegroundColor White
    Write-Host "  status         Show service status" -ForegroundColor White
    Write-Host "  backup         Backup database" -ForegroundColor White
    Write-Host "  migrate        Run database migrations" -ForegroundColor White
    Write-Host "  rollback       Rollback to previous version" -ForegroundColor White
    Write-Host "  help           Show this help message" -ForegroundColor White
    Write-Host ""
}

# 函数：检查环境变量文件
function Test-EnvFile {
    if (-not (Test-Path $ENV_FILE)) {
        Write-Host "Error: Environment file $ENV_FILE not found!" -ForegroundColor Red
        Write-Host "Please create it from .env.production template:" -ForegroundColor Yellow
        Write-Host "  Copy-Item .env.production $ENV_FILE" -ForegroundColor Gray
        Write-Host "  notepad $ENV_FILE" -ForegroundColor Gray
        exit 1
    }
    
    # 检查关键配置
    $envContent = Get-Content $ENV_FILE -Raw
    
    if ($envContent -match "JWT_SECRET_KEY=YOUR_STRONG_SECRET_KEY_HERE_CHANGE_IN_PRODUCTION") {
        Write-Host "Error: JWT_SECRET_KEY not configured!" -ForegroundColor Red
        Write-Host "Please update $ENV_FILE with a strong secret key" -ForegroundColor Yellow
        exit 1
    }
    
    if ($envContent -match "POSTGRES_PASSWORD=YOUR_STRONG_PASSWORD_HERE") {
        Write-Host "Error: POSTGRES_PASSWORD not configured!" -ForegroundColor Red
        Write-Host "Please update $ENV_FILE with a strong password" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "✓ Environment configuration validated" -ForegroundColor Green
}

# 函数：构建镜像
function Build-Image {
    Write-Host "Building Docker image..." -ForegroundColor Cyan
    
    # 获取版本号
    $version = "latest"
    if (Test-Path $ENV_FILE) {
        $envContent = Get-Content $ENV_FILE
        $versionLine = $envContent | Where-Object { $_ -match "APP_VERSION=" }
        if ($versionLine) {
            $version = $versionLine.Split("=")[1].Trim()
        }
    }
    
    # 构建镜像
    docker build -t "${IMAGE_NAME}:${version}" -t "${IMAGE_NAME}:latest" .
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Docker image built successfully" -ForegroundColor Green
        Write-Host "  Image: ${IMAGE_NAME}:${version}" -ForegroundColor Gray
        
        $imageInfo = docker images $IMAGE_NAME --format "{{.Size}}" | Select-Object -First 1
        Write-Host "  Size: $imageInfo" -ForegroundColor Gray
    } else {
        Write-Host "✗ Failed to build Docker image" -ForegroundColor Red
        exit 1
    }
}

# 函数：启动服务
function Start-Services {
    Write-Host "Starting services..." -ForegroundColor Cyan
    
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Services started successfully" -ForegroundColor Green
        
        # 等待服务就绪
        Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
        Start-Sleep -Seconds 10
        
        # 检查健康状态
        Test-Health
    } else {
        Write-Host "✗ Failed to start services" -ForegroundColor Red
        exit 1
    }
}

# 函数：停止服务
function Stop-Services {
    Write-Host "Stopping services..." -ForegroundColor Cyan
    
    docker-compose -f $COMPOSE_FILE down
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Services stopped successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to stop services" -ForegroundColor Red
        exit 1
    }
}

# 函数：重启服务
function Restart-Services {
    Write-Host "Restarting services..." -ForegroundColor Cyan
    
    docker-compose -f $COMPOSE_FILE --env-file $ENV_FILE restart
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Services restarted successfully" -ForegroundColor Green
        
        # 检查健康状态
        Start-Sleep -Seconds 5
        Test-Health
    } else {
        Write-Host "✗ Failed to restart services" -ForegroundColor Red
        exit 1
    }
}

# 函数：查看日志
function Show-Logs {
    Write-Host "Showing logs..." -ForegroundColor Cyan
    docker-compose -f $COMPOSE_FILE logs -f --tail=100
}

# 函数：查看状态
function Show-Status {
    Write-Host "Service Status:" -ForegroundColor Cyan
    docker-compose -f $COMPOSE_FILE ps
    
    Write-Host ""
    Write-Host "Resource Usage:" -ForegroundColor Cyan
    docker stats --no-stream --format "table {{.Name}}`t{{.CPUPerc}}`t{{.MemUsage}}`t{{.NetIO}}"
}

# 函数：检查健康状态
function Test-Health {
    Write-Host "Checking health status..." -ForegroundColor Cyan
    
    # 检查 API 健康状态
    for ($i = 1; $i -le 30; $i++) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200) {
                Write-Host "✓ API is healthy" -ForegroundColor Green
                
                # 显示详细健康信息
                try {
                    $detailedHealth = Invoke-RestMethod -Uri "http://localhost:8000/health/detailed"
                    $detailedHealth | ConvertTo-Json | Write-Host
                } catch {
                    # 忽略错误
                }
                return $true
            }
        } catch {
            Write-Host "Waiting for API to be ready... ($i/30)" -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        }
    }
    
    Write-Host "✗ API health check failed" -ForegroundColor Red
    Write-Host "Please check logs: docker-compose -f $COMPOSE_FILE logs fastapi-backend" -ForegroundColor Yellow
    return $false
}

# 函数：备份数据库
function Backup-Database {
    Write-Host "Backing up database..." -ForegroundColor Cyan
    
    # 创建备份目录
    if (-not (Test-Path "backups")) {
        New-Item -ItemType Directory -Path "backups" | Out-Null
    }
    
    # 生成备份文件名
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupFile = "backups\backup-$timestamp.sql"
    
    # 执行备份
    docker-compose -f $COMPOSE_FILE exec -T postgres pg_dump -U postgres laboratory | Out-File -FilePath $backupFile -Encoding UTF8
    
    if ($LASTEXITCODE -eq 0) {
        # 压缩备份
        Compress-Archive -Path $backupFile -DestinationPath "$backupFile.zip"
        Remove-Item $backupFile
        
        Write-Host "✓ Database backup created: $backupFile.zip" -ForegroundColor Green
        
        # 显示备份大小
        $size = (Get-Item "$backupFile.zip").Length / 1MB
        Write-Host "  Size: $([math]::Round($size, 2)) MB" -ForegroundColor Gray
    } else {
        Write-Host "✗ Database backup failed" -ForegroundColor Red
        exit 1
    }
}

# 函数：运行数据库迁移
function Run-Migrations {
    Write-Host "Running database migrations..." -ForegroundColor Cyan
    
    docker-compose -f $COMPOSE_FILE exec fastapi-backend alembic upgrade head
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Database migrations completed" -ForegroundColor Green
    } else {
        Write-Host "✗ Database migrations failed" -ForegroundColor Red
        exit 1
    }
}

# 函数：回滚
function Invoke-Rollback {
    Write-Host "Rolling back to previous version..." -ForegroundColor Yellow
    
    # 停止当前服务
    Stop-Services
    
    # 恢复之前的镜像
    docker tag "${IMAGE_NAME}:backup" "${IMAGE_NAME}:latest"
    
    # 重新启动
    Start-Services
    
    Write-Host "✓ Rollback completed" -ForegroundColor Green
}

# 主逻辑
switch ($Action) {
    "build" {
        Test-EnvFile
        Build-Image
    }
    "start" {
        Test-EnvFile
        Start-Services
    }
    "stop" {
        Stop-Services
    }
    "restart" {
        Test-EnvFile
        Restart-Services
    }
    "logs" {
        Show-Logs
    }
    "status" {
        Show-Status
    }
    "backup" {
        Backup-Database
    }
    "migrate" {
        Run-Migrations
    }
    "rollback" {
        Invoke-Rollback
    }
    "help" {
        Show-Help
    }
    default {
        # 默认：完整部署流程
        Write-Host "Starting full deployment..." -ForegroundColor Cyan
        Write-Host ""
        
        # 1. 检查环境配置
        Test-EnvFile
        Write-Host ""
        
        # 2. 备份当前镜像
        $existingImage = docker images $IMAGE_NAME --format "{{.Repository}}" | Select-Object -First 1
        if ($existingImage) {
            Write-Host "Backing up current image..." -ForegroundColor Cyan
            docker tag "${IMAGE_NAME}:latest" "${IMAGE_NAME}:backup"
            Write-Host "✓ Current image backed up" -ForegroundColor Green
            Write-Host ""
        }
        
        # 3. 构建新镜像
        Build-Image
        Write-Host ""
        
        # 4. 备份数据库
        $runningContainers = docker-compose -f $COMPOSE_FILE ps --services --filter "status=running"
        if ($runningContainers -match "postgres") {
            Backup-Database
            Write-Host ""
        }
        
        # 5. 启动服务
        Start-Services
        Write-Host ""
        
        # 6. 运行迁移
        Run-Migrations
        Write-Host ""
        
        # 7. 显示状态
        Show-Status
        Write-Host ""
        
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host "Deployment completed successfully!" -ForegroundColor Green
        Write-Host "==========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Access your application at:" -ForegroundColor Yellow
        Write-Host "  API: http://localhost:8000" -ForegroundColor White
        Write-Host "  Docs: http://localhost:8000/docs" -ForegroundColor White
        Write-Host "  Health: http://localhost:8000/health" -ForegroundColor White
        Write-Host ""
        Write-Host "Useful commands:" -ForegroundColor Yellow
        Write-Host "  View logs: .\deploy.ps1 logs" -ForegroundColor White
        Write-Host "  Check status: .\deploy.ps1 status" -ForegroundColor White
        Write-Host "  Backup database: .\deploy.ps1 backup" -ForegroundColor White
        Write-Host "  Rollback: .\deploy.ps1 rollback" -ForegroundColor White
    }
}
