# ==================== 生产环境部署脚本 ====================
# FastAPI 后端生产环境部署脚本（Windows PowerShell）
#
# 使用方法:
#   .\scripts\deploy-production.ps1 [-SkipChecks] [-SkipBackup] [-SkipMigration] [-Rollback] [-Help]
#
# 参数:
#   -SkipChecks     跳过部署前检查
#   -SkipBackup     跳过数据库备份
#   -SkipMigration  跳过数据库迁移
#   -Rollback       回滚到上一个版本
#   -Help           显示帮助信息

param(
    [switch]$SkipChecks,
    [switch]$SkipBackup,
    [switch]$SkipMigration,
    [switch]$Rollback,
    [switch]$Help
)

# ==================== 错误处理 ====================
$ErrorActionPreference = "Stop"

# ==================== 辅助函数 ====================
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

# ==================== 配置变量 ====================
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$EnvFile = Join-Path $ProjectDir ".env.production"
$DockerComposeFile = Join-Path $ProjectDir "docker-compose.prod.yml"
$BackupDir = Join-Path $ProjectDir "backups"
$LogDir = Join-Path $ProjectDir "logs"
$DeploymentLog = Join-Path $LogDir "deployment.log"

# ==================== 显示帮助 ====================
if ($Help) {
    Write-Host "FastAPI 后端生产环境部署脚本"
    Write-Host ""
    Write-Host "使用方法:"
    Write-Host "  .\scripts\deploy-production.ps1 [参数]"
    Write-Host ""
    Write-Host "参数:"
    Write-Host "  -SkipChecks     跳过部署前检查"
    Write-Host "  -SkipBackup     跳过数据库备份"
    Write-Host "  -SkipMigration  跳过数据库迁移"
    Write-Host "  -Rollback       回滚到上一个版本"
    Write-Host "  -Help           显示帮助信息"
    exit 0
}

# ==================== 创建目录 ====================
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir | Out-Null
}

# ==================== 记录部署日志 ====================
function Write-DeploymentLog {
    param([string]$Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $DeploymentLog -Value "[$Timestamp] $Message"
}

# ==================== 显示横幅 ====================
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  FastAPI 后端生产环境部署" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-DeploymentLog "开始生产环境部署"

# ==================== 检查是否为回滚操作 ====================
if ($Rollback) {
    Write-Info "执行回滚操作..."
    & "$ScriptDir\rollback-production.ps1"
    exit $LASTEXITCODE
}

# ==================== 1. 部署前检查 ====================
if (-not $SkipChecks) {
    Write-Info "步骤 1/8: 执行部署前检查..."
    
    # 检查 Docker
    try {
        docker --version | Out-Null
        Write-Success "✓ Docker 已安装"
    }
    catch {
        Write-Error "Docker 未安装"
        exit 1
    }
    
    # 检查 Docker Compose
    try {
        docker-compose --version | Out-Null
        Write-Success "✓ Docker Compose 已安装"
    }
    catch {
        try {
            docker compose version | Out-Null
            Write-Success "✓ Docker Compose 已安装"
        }
        catch {
            Write-Error "Docker Compose 未安装"
            exit 1
        }
    }
    
    # 检查环境配置文件
    if (-not (Test-Path $EnvFile)) {
        Write-Error "环境配置文件不存在: $EnvFile"
        Write-Info "请复制 .env.production.template 为 .env.production 并填写配置"
        exit 1
    }
    Write-Success "✓ 环境配置文件存在"
    
    # 检查 Docker Compose 文件
    if (-not (Test-Path $DockerComposeFile)) {
        Write-Error "Docker Compose 文件不存在: $DockerComposeFile"
        exit 1
    }
    Write-Success "✓ Docker Compose 文件存在"
    
    # 检查磁盘空间
    $Drive = (Get-Item $ProjectDir).PSDrive
    $FreeSpace = [math]::Round((Get-PSDrive $Drive.Name).Free / 1GB, 2)
    if ($FreeSpace -lt 10) {
        Write-Warning "磁盘空间不足 10GB，当前可用: ${FreeSpace}GB"
        $Response = Read-Host "是否继续部署? (y/n)"
        if ($Response -ne "y") {
            exit 1
        }
    }
    Write-Success "✓ 磁盘空间充足 (${FreeSpace}GB)"
    
    # 检查内存
    $TotalMemory = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)
    if ($TotalMemory -lt 4) {
        Write-Warning "系统内存不足 4GB，当前: ${TotalMemory}GB"
        $Response = Read-Host "是否继续部署? (y/n)"
        if ($Response -ne "y") {
            exit 1
        }
    }
    Write-Success "✓ 内存充足 (${TotalMemory}GB)"
    
    Write-Success "部署前检查完成"
    Write-DeploymentLog "部署前检查通过"
}
else {
    Write-Warning "跳过部署前检查"
    Write-DeploymentLog "跳过部署前检查"
}

# ==================== 2. 备份当前数据库 ====================
if (-not $SkipBackup) {
    Write-Info "步骤 2/8: 备份当前数据库..."
    
    $BackupFile = Join-Path $BackupDir "pre_deployment_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
    
    # 从环境文件读取数据库配置
    $EnvContent = Get-Content $EnvFile
    $PostgresUser = ($EnvContent | Select-String "POSTGRES_USER=(.+)").Matches.Groups[1].Value
    $PostgresDb = ($EnvContent | Select-String "POSTGRES_DB=(.+)").Matches.Groups[1].Value
    
    # 执行备份
    try {
        docker exec postgres-prod pg_dump -U $PostgresUser $PostgresDb > $BackupFile 2>$null
        Write-Success "✓ 数据库备份完成: $BackupFile"
        Write-DeploymentLog "数据库备份完成: $BackupFile"
    }
    catch {
        Write-Warning "数据库备份失败（可能是首次部署）"
        Write-DeploymentLog "数据库备份失败"
    }
}
else {
    Write-Warning "跳过数据库备份"
    Write-DeploymentLog "跳过数据库备份"
}

# ==================== 3. 拉取最新代码 ====================
Write-Info "步骤 3/8: 拉取最新代码..."

if (Test-Path (Join-Path $ProjectDir ".git")) {
    Push-Location $ProjectDir
    
    $CurrentCommit = git rev-parse HEAD
    Write-Info "当前提交: $CurrentCommit"
    
    git pull origin main
    
    $NewCommit = git rev-parse HEAD
    Write-Info "新提交: $NewCommit"
    
    if ($CurrentCommit -ne $NewCommit) {
        Write-Success "✓ 代码已更新"
        Write-DeploymentLog "代码更新: $CurrentCommit -> $NewCommit"
    }
    else {
        Write-Info "代码已是最新版本"
        Write-DeploymentLog "代码已是最新版本"
    }
    
    Pop-Location
}
else {
    Write-Warning "不是 Git 仓库，跳过代码拉取"
    Write-DeploymentLog "跳过代码拉取"
}

# ==================== 4. 构建 Docker 镜像 ====================
Write-Info "步骤 4/8: 构建 Docker 镜像..."

Push-Location $ProjectDir

# 标记旧镜像
$OldImageId = docker images fastapi-backend-prod:latest -q
if ($OldImageId) {
    docker tag fastapi-backend-prod:latest fastapi-backend-prod:backup
    Write-Info "已标记旧镜像为 backup"
}

# 构建新镜像
try {
    docker-compose -f $DockerComposeFile build --no-cache
    Write-Success "✓ Docker 镜像构建完成"
    Write-DeploymentLog "Docker 镜像构建完成"
}
catch {
    Write-Error "Docker 镜像构建失败"
    Write-DeploymentLog "Docker 镜像构建失败"
    Pop-Location
    exit 1
}

# ==================== 5. 停止旧服务 ====================
Write-Info "步骤 5/8: 停止旧服务..."

$RunningServices = docker-compose -f $DockerComposeFile ps
if ($RunningServices -match "Up") {
    Write-Info "正在停止旧服务..."
    docker-compose -f $DockerComposeFile down
    Write-Success "✓ 旧服务已停止"
    Write-DeploymentLog "旧服务已停止"
}
else {
    Write-Info "没有运行中的服务"
    Write-DeploymentLog "没有运行中的服务"
}

# ==================== 6. 执行数据库迁移 ====================
if (-not $SkipMigration) {
    Write-Info "步骤 6/8: 执行数据库迁移..."
    
    # 启动数据库服务
    docker-compose -f $DockerComposeFile up -d postgres redis
    
    # 等待数据库就绪
    Write-Info "等待数据库就绪..."
    Start-Sleep -Seconds 10
    
    # 执行迁移
    try {
        docker-compose -f $DockerComposeFile run --rm fastapi-backend alembic upgrade head
        Write-Success "✓ 数据库迁移完成"
        Write-DeploymentLog "数据库迁移完成"
    }
    catch {
        Write-Error "数据库迁移失败"
        Write-DeploymentLog "数据库迁移失败"
        
        # 询问是否回滚
        $Response = Read-Host "是否回滚到备份? (y/n)"
        if ($Response -eq "y") {
            & "$ScriptDir\rollback-production.ps1"
        }
        Pop-Location
        exit 1
    }
}
else {
    Write-Warning "跳过数据库迁移"
    Write-DeploymentLog "跳过数据库迁移"
}

# ==================== 7. 启动新服务 ====================
Write-Info "步骤 7/8: 启动新服务..."

try {
    docker-compose -f $DockerComposeFile up -d
    Write-Success "✓ 新服务已启动"
    Write-DeploymentLog "新服务已启动"
}
catch {
    Write-Error "服务启动失败"
    Write-DeploymentLog "服务启动失败"
    Pop-Location
    exit 1
}

# ==================== 8. 健康检查 ====================
Write-Info "步骤 8/8: 执行健康检查..."

Write-Info "等待服务就绪（最多等待 120 秒）..."

$MaxRetries = 24
$RetryCount = 0
$HealthCheckUrl = "http://localhost:8000/health"

while ($RetryCount -lt $MaxRetries) {
    try {
        $Response = Invoke-WebRequest -Uri $HealthCheckUrl -UseBasicParsing -TimeoutSec 5
        if ($Response.StatusCode -eq 200) {
            Write-Success "✓ 服务健康检查通过"
            Write-DeploymentLog "服务健康检查通过"
            break
        }
    }
    catch {
        # 继续重试
    }
    
    $RetryCount++
    Write-Host "." -NoNewline
    Start-Sleep -Seconds 5
}

Write-Host ""

if ($RetryCount -eq $MaxRetries) {
    Write-Error "服务健康检查失败"
    Write-DeploymentLog "服务健康检查失败"
    
    # 显示日志
    Write-Info "查看服务日志:"
    docker-compose -f $DockerComposeFile logs --tail=50 fastapi-backend
    
    # 询问是否回滚
    $Response = Read-Host "是否回滚到上一个版本? (y/n)"
    if ($Response -eq "y") {
        & "$ScriptDir\rollback-production.ps1"
    }
    Pop-Location
    exit 1
}

# ==================== 验证关键功能 ====================
Write-Info "验证关键功能..."

# 测试 API 文档
try {
    $Response = Invoke-WebRequest -Uri "http://localhost:8000/docs" -UseBasicParsing -TimeoutSec 5
    if ($Response.StatusCode -eq 200) {
        Write-Success "✓ API 文档可访问"
    }
}
catch {
    Write-Warning "API 文档不可访问"
}

# 测试数据库连接
try {
    $Response = Invoke-RestMethod -Uri "$HealthCheckUrl/detailed" -TimeoutSec 5
    if ($Response.database -eq "connected") {
        Write-Success "✓ 数据库连接正常"
    }
    else {
        Write-Warning "数据库连接异常"
    }
    
    if ($Response.redis -eq "connected") {
        Write-Success "✓ Redis 连接正常"
    }
    else {
        Write-Warning "Redis 连接异常"
    }
}
catch {
    Write-Warning "无法获取详细健康状态"
}

# ==================== 清理旧镜像 ====================
Write-Info "清理旧镜像..."

if ($OldImageId) {
    # 保留 backup 标签的镜像，删除其他旧镜像
    docker images | Select-String "fastapi-backend-prod" | Select-String -NotMatch "backup|latest" | ForEach-Object {
        $ImageId = ($_ -split '\s+')[2]
        docker rmi -f $ImageId 2>$null
    }
    Write-Success "✓ 旧镜像已清理"
}

Pop-Location

# ==================== 部署完成 ====================
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Success "生产环境部署完成！"
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Info "服务信息:"
Write-Host "  - API 地址: http://localhost:8000"
Write-Host "  - API 文档: http://localhost:8000/docs"
Write-Host "  - 健康检查: http://localhost:8000/health"
Write-Host ""
Write-Info "查看日志:"
Write-Host "  docker-compose -f $DockerComposeFile logs -f"
Write-Host ""
Write-Info "停止服务:"
Write-Host "  docker-compose -f $DockerComposeFile down"
Write-Host ""
Write-Info "回滚服务:"
Write-Host "  .\scripts\rollback-production.ps1"
Write-Host ""

Write-DeploymentLog "生产环境部署完成"

exit 0
