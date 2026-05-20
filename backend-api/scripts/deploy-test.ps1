# ==================== FastAPI 后端测试环境部署脚本 (PowerShell) ====================
# 此脚本用于将 FastAPI 后端部署到测试环境 (Windows)

# 设置错误时停止
$ErrorActionPreference = "Stop"

# 颜色函数
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# 检查必需的命令
function Check-Requirements {
    Write-Info "检查系统要求..."
    
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        Write-Error "Docker 未安装，请先安装 Docker Desktop"
        exit 1
    }
    
    if (-not (Get-Command docker-compose -ErrorAction SilentlyContinue)) {
        Write-Error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    }
    
    Write-Success "系统要求检查通过"
}

# 检查环境变量配置
function Check-EnvConfig {
    Write-Info "检查环境变量配置..."
    
    if (-not (Test-Path ".env.test")) {
        Write-Error ".env.test 文件不存在"
        exit 1
    }
    
    # 读取环境变量
    $envContent = Get-Content ".env.test"
    $databaseUrl = $envContent | Where-Object { $_ -match "^DATABASE_URL=" }
    $jwtSecret = $envContent | Where-Object { $_ -match "^JWT_SECRET_KEY=" }
    
    if (-not $databaseUrl) {
        Write-Error "DATABASE_URL 未配置"
        exit 1
    }
    
    if (-not $jwtSecret) {
        Write-Error "JWT_SECRET_KEY 未配置"
        exit 1
    }
    
    Write-Success "环境变量配置检查通过"
}

# 检查数据库连接
function Check-Database {
    Write-Info "检查数据库连接..."
    
    # 从 .env.test 读取数据库配置
    $envContent = Get-Content ".env.test"
    $databaseUrl = ($envContent | Where-Object { $_ -match "^DATABASE_URL=" }) -replace "DATABASE_URL=", ""
    
    if ($databaseUrl -match "@([^:]+):(\d+)/(.+)") {
        $dbHost = $matches[1]
        $dbPort = $matches[2]
        $dbName = $matches[3]
        
        Write-Info "数据库主机: $dbHost"
        Write-Info "数据库端口: $dbPort"
        Write-Info "数据库名称: $dbName"
        
        # 尝试连接数据库
        try {
            $testConnection = Test-NetConnection -ComputerName $dbHost -Port $dbPort -WarningAction SilentlyContinue
            if ($testConnection.TcpTestSucceeded) {
                Write-Success "数据库端口可访问"
            } else {
                Write-Warning "无法连接到数据库端口，请确保 PostgreSQL 正在运行"
            }
        } catch {
            Write-Warning "无法测试数据库连接"
        }
    }
}

# 检查 Redis 连接
function Check-Redis {
    Write-Info "检查 Redis 连接..."
    
    # 从 .env.test 读取 Redis 配置
    $envContent = Get-Content ".env.test"
    $redisUrl = ($envContent | Where-Object { $_ -match "^REDIS_URL=" }) -replace "REDIS_URL=", ""
    
    if ($redisUrl -match "://([^:]+):(\d+)") {
        $redisHost = $matches[1]
        $redisPort = $matches[2]
        
        Write-Info "Redis 主机: $redisHost"
        Write-Info "Redis 端口: $redisPort"
        
        # 尝试连接 Redis
        try {
            $testConnection = Test-NetConnection -ComputerName $redisHost -Port $redisPort -WarningAction SilentlyContinue
            if ($testConnection.TcpTestSucceeded) {
                Write-Success "Redis 端口可访问"
            } else {
                Write-Warning "无法连接到 Redis 端口，请确保 Redis 正在运行"
            }
        } catch {
            Write-Warning "无法测试 Redis 连接"
        }
    }
}

# 构建 Docker 镜像
function Build-Image {
    Write-Info "构建 Docker 镜像..."
    
    docker-compose -f docker-compose.test.yml build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker 镜像构建失败"
        exit 1
    }
    
    Write-Success "Docker 镜像构建完成"
}

# 停止旧容器
function Stop-OldContainers {
    Write-Info "停止旧容器..."
    
    $containers = docker ps -a --filter "name=fastapi-backend-test" --format "{{.Names}}"
    
    if ($containers) {
        docker-compose -f docker-compose.test.yml down
        Write-Success "旧容器已停止"
    } else {
        Write-Info "没有运行中的旧容器"
    }
}

# 启动服务
function Start-Service {
    Write-Info "启动 FastAPI 后端服务..."
    
    docker-compose -f docker-compose.test.yml up -d
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "服务启动失败"
        exit 1
    }
    
    Write-Success "服务启动成功"
}

# 等待服务就绪
function Wait-ForService {
    Write-Info "等待服务就绪..."
    
    $maxRetries = 30
    $retryCount = 0
    
    while ($retryCount -lt $maxRetries) {
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:8001/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                Write-Success "服务已就绪"
                return $true
            }
        } catch {
            # 忽略错误，继续重试
        }
        
        $retryCount++
        Write-Info "等待服务启动... ($retryCount/$maxRetries)"
        Start-Sleep -Seconds 2
    }
    
    Write-Error "服务启动超时"
    return $false
}

# 验证服务健康状态
function Verify-Health {
    Write-Info "验证服务健康状态..."
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8001/health" -Method Get
        
        if ($response.status -eq "healthy") {
            Write-Success "健康检查通过"
        } else {
            Write-Error "健康检查失败"
            Write-Error "响应: $($response | ConvertTo-Json)"
            return $false
        }
        
        # 检查数据库连接
        if ($response.database) {
            Write-Success "数据库连接正常"
        } else {
            Write-Warning "无法验证数据库连接状态"
        }
        
        return $true
    } catch {
        Write-Error "健康检查失败: $_"
        return $false
    }
}

# 验证 API 端点
function Verify-ApiEndpoints {
    Write-Info "验证 API 端点..."
    
    # 测试 OpenAPI 文档
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8001/docs" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Success "OpenAPI 文档可访问"
        }
    } catch {
        Write-Warning "OpenAPI 文档不可访问"
    }
    
    # 测试 API 根路径
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8001/api/v1/" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Success "API 根路径可访问"
        }
    } catch {
        Write-Warning "API 根路径不可访问"
    }
}

# 显示服务信息
function Show-ServiceInfo {
    Write-Info "=========================================="
    Write-Info "FastAPI 后端测试环境部署完成"
    Write-Info "=========================================="
    Write-Host ""
    Write-Info "服务地址: http://localhost:8001"
    Write-Info "API 文档: http://localhost:8001/docs"
    Write-Info "健康检查: http://localhost:8001/health"
    Write-Host ""
    Write-Info "查看日志: docker-compose -f docker-compose.test.yml logs -f"
    Write-Info "停止服务: docker-compose -f docker-compose.test.yml down"
    Write-Info "重启服务: docker-compose -f docker-compose.test.yml restart"
    Write-Host ""
}

# 显示容器状态
function Show-ContainerStatus {
    Write-Info "容器状态:"
    docker-compose -f docker-compose.test.yml ps
}

# 主函数
function Main {
    Write-Info "=========================================="
    Write-Info "开始部署 FastAPI 后端到测试环境"
    Write-Info "=========================================="
    Write-Host ""
    
    try {
        # 执行部署步骤
        Check-Requirements
        Check-EnvConfig
        Check-Database
        Check-Redis
        Stop-OldContainers
        Build-Image
        Start-Service
        
        # 等待服务就绪
        if (Wait-ForService) {
            if (Verify-Health) {
                Verify-ApiEndpoints
                Show-ServiceInfo
                Show-ContainerStatus
                
                Write-Success "部署完成！"
                exit 0
            } else {
                Write-Error "健康检查失败"
                docker-compose -f docker-compose.test.yml logs --tail=50
                exit 1
            }
        } else {
            Write-Error "部署失败，请查看日志"
            docker-compose -f docker-compose.test.yml logs --tail=50
            exit 1
        }
    } catch {
        Write-Error "部署过程中发生错误: $_"
        exit 1
    }
}

# 执行主函数
Main
