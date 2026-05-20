# ==================== 生产环境回滚脚本 ====================
# FastAPI 后端生产环境回滚脚本（Windows PowerShell）
#
# 使用方法:
#   .\scripts\rollback-production.ps1 [-BackupFile <文件>] [-ListBackups] [-Help]
#
# 参数:
#   -BackupFile <文件>  指定要恢复的备份文件
#   -ListBackups        列出所有可用的备份
#   -Help               显示帮助信息

param(
    [string]$BackupFile = "",
    [switch]$ListBackups,
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
$DockerComposeFile = Join-Path $ProjectDir "docker-compose.prod.yml"
$BackupDir = Join-Path $ProjectDir "backups"
$LogDir = Join-Path $ProjectDir "logs"
$RollbackLog = Join-Path $LogDir "rollback.log"

# ==================== 显示帮助 ====================
if ($Help) {
    Write-Host "FastAPI 后端生产环境回滚脚本"
    Write-Host ""
    Write-Host "使用方法:"
    Write-Host "  .\scripts\rollback-production.ps1 [参数]"
    Write-Host ""
    Write-Host "参数:"
    Write-Host "  -BackupFile <文件>  指定要恢复的备份文件"
    Write-Host "  -ListBackups        列出所有可用的备份"
    Write-Host "  -Help               显示帮助信息"
    exit 0
}

# ==================== 创建日志目录 ====================
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir | Out-Null
}

# ==================== 记录回滚日志 ====================
function Write-RollbackLog {
    param([string]$Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $RollbackLog -Value "[$Timestamp] $Message"
}

# ==================== 列出备份 ====================
if ($ListBackups) {
    Write-Info "可用的备份文件:"
    Write-Host ""
    
    if (-not (Test-Path $BackupDir) -or (Get-ChildItem $BackupDir -Filter "*.sql").Count -eq 0) {
        Write-Warning "没有找到备份文件"
        exit 0
    }
    
    Get-ChildItem $BackupDir -Filter "*.sql" | Sort-Object LastWriteTime -Descending | Format-Table Name, Length, LastWriteTime -AutoSize
    exit 0
}

# ==================== 显示横幅 ====================
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  FastAPI 后端生产环境回滚" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-RollbackLog "开始生产环境回滚"

# ==================== 确认回滚操作 ====================
Write-Warning "警告: 此操作将回滚到之前的版本"
Write-Warning "这将停止当前服务并恢复数据库备份"
Write-Host ""
$Confirmation = Read-Host "确定要继续吗? (yes/no)"

if ($Confirmation -ne "yes") {
    Write-Info "回滚操作已取消"
    exit 0
}

# ==================== 1. 选择备份文件 ====================
if (-not $BackupFile) {
    Write-Info "步骤 1/5: 选择备份文件..."
    
    if (-not (Test-Path $BackupDir)) {
        Write-Error "备份目录不存在: $BackupDir"
        exit 1
    }
    
    $Backups = Get-ChildItem $BackupDir -Filter "*.sql" | Sort-Object LastWriteTime -Descending
    
    if ($Backups.Count -eq 0) {
        Write-Error "没有找到备份文件"
        exit 1
    }
    
    Write-Host "可用的备份文件:"
    Write-Host ""
    
    for ($i = 0; $i -lt $Backups.Count; $i++) {
        $Backup = $Backups[$i]
        $Size = [math]::Round($Backup.Length / 1MB, 2)
        Write-Host "  [$i] $($Backup.Name) (${Size}MB) - $($Backup.LastWriteTime)"
    }
    
    Write-Host ""
    $BackupIndex = Read-Host "请选择备份文件编号 [0]"
    if (-not $BackupIndex) {
        $BackupIndex = 0
    }
    
    if ($BackupIndex -ge 0 -and $BackupIndex -lt $Backups.Count) {
        $BackupFile = $Backups[$BackupIndex].FullName
        Write-Success "✓ 选择备份文件: $($Backups[$BackupIndex].Name)"
    }
    else {
        Write-Error "无效的备份文件编号"
        exit 1
    }
}
else {
    if (-not (Test-Path $BackupFile)) {
        Write-Error "备份文件不存在: $BackupFile"
        exit 1
    }
    Write-Success "✓ 使用指定的备份文件: $(Split-Path -Leaf $BackupFile)"
}

Write-RollbackLog "选择备份文件: $BackupFile"

# ==================== 2. 停止当前服务 ====================
Write-Info "步骤 2/5: 停止当前服务..."

Push-Location $ProjectDir

$RunningServices = docker-compose -f $DockerComposeFile ps
if ($RunningServices -match "Up") {
    docker-compose -f $DockerComposeFile down
    Write-Success "✓ 当前服务已停止"
    Write-RollbackLog "当前服务已停止"
}
else {
    Write-Info "没有运行中的服务"
    Write-RollbackLog "没有运行中的服务"
}

# ==================== 3. 恢复 Docker 镜像 ====================
Write-Info "步骤 3/5: 恢复 Docker 镜像..."

$BackupImage = docker images fastapi-backend-prod:backup -q
if ($BackupImage) {
    # 删除当前的 latest 标签
    docker rmi fastapi-backend-prod:latest 2>$null
    
    # 将 backup 标签改为 latest
    docker tag fastapi-backend-prod:backup fastapi-backend-prod:latest
    
    Write-Success "✓ Docker 镜像已恢复"
    Write-RollbackLog "Docker 镜像已恢复"
}
else {
    Write-Warning "没有找到备份镜像，将使用当前镜像"
    Write-RollbackLog "没有找到备份镜像"
}

# ==================== 4. 恢复数据库 ====================
Write-Info "步骤 4/5: 恢复数据库..."

# 启动数据库服务
docker-compose -f $DockerComposeFile up -d postgres

# 等待数据库就绪
Write-Info "等待数据库就绪..."
Start-Sleep -Seconds 10

# 从环境文件读取数据库配置
$EnvFile = Join-Path $ProjectDir ".env.production"
$EnvContent = Get-Content $EnvFile
$PostgresUser = ($EnvContent | Select-String "POSTGRES_USER=(.+)").Matches.Groups[1].Value
$PostgresDb = ($EnvContent | Select-String "POSTGRES_DB=(.+)").Matches.Groups[1].Value

# 创建恢复前备份
$RestoreBackup = Join-Path $BackupDir "before_restore_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
Write-Info "创建恢复前备份..."
try {
    docker exec postgres-prod pg_dump -U $PostgresUser $PostgresDb > $RestoreBackup 2>$null
}
catch {
    # 忽略错误
}

# 恢复数据库
Write-Info "正在恢复数据库..."
try {
    Get-Content $BackupFile | docker exec -i postgres-prod psql -U $PostgresUser $PostgresDb
    Write-Success "✓ 数据库已恢复"
    Write-RollbackLog "数据库已恢复: $BackupFile"
}
catch {
    Write-Error "数据库恢复失败"
    Write-RollbackLog "数据库恢复失败"
    
    # 尝试恢复到恢复前的状态
    if (Test-Path $RestoreBackup) {
        Write-Info "尝试恢复到恢复前的状态..."
        Get-Content $RestoreBackup | docker exec -i postgres-prod psql -U $PostgresUser $PostgresDb
    }
    
    Pop-Location
    exit 1
}

# ==================== 5. 启动服务 ====================
Write-Info "步骤 5/5: 启动服务..."

try {
    docker-compose -f $DockerComposeFile up -d
    Write-Success "✓ 服务已启动"
    Write-RollbackLog "服务已启动"
}
catch {
    Write-Error "服务启动失败"
    Write-RollbackLog "服务启动失败"
    Pop-Location
    exit 1
}

# ==================== 健康检查 ====================
Write-Info "执行健康检查..."

$MaxRetries = 24
$RetryCount = 0
$HealthCheckUrl = "http://localhost:8000/health"

while ($RetryCount -lt $MaxRetries) {
    try {
        $Response = Invoke-WebRequest -Uri $HealthCheckUrl -UseBasicParsing -TimeoutSec 5
        if ($Response.StatusCode -eq 200) {
            Write-Success "✓ 服务健康检查通过"
            Write-RollbackLog "服务健康检查通过"
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
    Write-RollbackLog "服务健康检查失败"
    
    # 显示日志
    Write-Info "查看服务日志:"
    docker-compose -f $DockerComposeFile logs --tail=50 fastapi-backend
    
    Pop-Location
    exit 1
}

Pop-Location

# ==================== 回滚完成 ====================
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Success "生产环境回滚完成！"
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Info "服务信息:"
Write-Host "  - API 地址: http://localhost:8000"
Write-Host "  - API 文档: http://localhost:8000/docs"
Write-Host "  - 健康检查: http://localhost:8000/health"
Write-Host ""
Write-Info "恢复前备份已保存到:"
Write-Host "  $RestoreBackup"
Write-Host ""

Write-RollbackLog "生产环境回滚完成"

exit 0
