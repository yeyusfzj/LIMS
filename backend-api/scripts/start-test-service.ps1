# ==================== FastAPI 后端测试服务启动脚本 ====================
# 此脚本用于在后台启动 FastAPI 测试服务

param(
    [switch]$Stop,
    [switch]$Restart,
    [switch]$Status
)

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

# 获取服务进程
function Get-ServiceProcess {
    return Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -like "*uvicorn*app.main:app*--port*8001*"
    }
}

# 停止服务
function Stop-Service {
    Write-Info "停止 FastAPI 测试服务..."
    
    $processes = Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -like "*uvicorn*" -and $_.CommandLine -like "*8001*"
    }
    
    if ($processes) {
        $processes | Stop-Process -Force
        Start-Sleep -Seconds 2
        Write-Success "服务已停止"
    } else {
        Write-Info "服务未运行"
    }
}

# 检查服务状态
function Check-ServiceStatus {
    Write-Info "检查服务状态..."
    
    $processes = Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -like "*uvicorn*" -and $_.CommandLine -like "*8001*"
    }
    
    if ($processes) {
        Write-Success "服务正在运行"
        Write-Info "进程 ID: $($processes.Id)"
        Write-Info "内存使用: $([math]::Round($processes.WorkingSet64 / 1MB, 2)) MB"
        
        # 测试健康检查
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:8001/health" -Method Get -TimeoutSec 5
            Write-Success "健康检查: $($response.status)"
        } catch {
            Write-Warning "健康检查失败"
        }
    } else {
        Write-Warning "服务未运行"
    }
}

# 启动服务
function Start-Service {
    Write-Info "启动 FastAPI 测试服务..."
    
    # 检查是否已经运行
    $existingProcess = Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object {
        $_.CommandLine -like "*uvicorn*" -and $_.CommandLine -like "*8001*"
    }
    
    if ($existingProcess) {
        Write-Warning "服务已在运行中"
        Write-Info "进程 ID: $($existingProcess.Id)"
        return
    }
    
    # 检查环境变量文件
    if (-not (Test-Path ".env.test")) {
        Write-Error ".env.test 文件不存在"
        exit 1
    }
    
    # 复制环境变量文件
    Copy-Item ".env.test" ".env" -Force
    
    # 检查虚拟环境
    if (-not (Test-Path "venv\Scripts\python.exe")) {
        Write-Error "虚拟环境不存在，请先运行 deploy-test-local.ps1"
        exit 1
    }
    
    # 创建日志目录
    if (-not (Test-Path "logs")) {
        New-Item -ItemType Directory -Path "logs" | Out-Null
    }
    
    # 启动服务（后台运行）
    $logFile = "logs\test-service-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
    
    Write-Info "启动服务，日志文件: $logFile"
    
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = "venv\Scripts\python.exe"
    $startInfo.Arguments = "-m uvicorn app.main:app --host 0.0.0.0 --port 8001"
    $startInfo.UseShellExecute = $false
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.CreateNoWindow = $true
    $startInfo.WorkingDirectory = (Get-Location).Path
    
    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    
    # 启动进程
    $process.Start() | Out-Null
    
    Write-Success "服务已启动"
    Write-Info "进程 ID: $($process.Id)"
    Write-Host ""
    Write-Info "服务地址: http://localhost:8001"
    Write-Info "API 文档: http://localhost:8001/docs"
    Write-Info "健康检查: http://localhost:8001/health"
    Write-Host ""
    Write-Info "查看日志: Get-Content $logFile -Wait"
    Write-Info "停止服务: .\scripts\start-test-service.ps1 -Stop"
    Write-Info "查看状态: .\scripts\start-test-service.ps1 -Status"
    
    # 等待服务启动
    Write-Info "等待服务启动..."
    Start-Sleep -Seconds 5
    
    # 验证服务
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8001/health" -Method Get -TimeoutSec 10
        Write-Success "服务启动成功！"
        Write-Success "健康检查: $($response.status)"
    } catch {
        Write-Warning "服务可能还在启动中，请稍后检查"
    }
}

# 主函数
function Main {
    if ($Stop) {
        Stop-Service
    } elseif ($Status) {
        Check-ServiceStatus
    } elseif ($Restart) {
        Stop-Service
        Start-Sleep -Seconds 2
        Start-Service
    } else {
        Start-Service
    }
}

# 执行主函数
Main
