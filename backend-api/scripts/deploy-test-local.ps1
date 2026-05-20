# ==================== FastAPI 后端测试环境本地部署脚本 (PowerShell) ====================
# 此脚本用于在本地直接运行 FastAPI 后端（不使用 Docker）

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

# 检查 Python
function Check-Python {
    Write-Info "检查 Python 环境..."
    
    if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
        Write-Error "Python 未安装，请先安装 Python 3.11+"
        exit 1
    }
    
    $pythonVersion = python --version
    Write-Success "Python 版本: $pythonVersion"
}

# 检查虚拟环境
function Check-VirtualEnv {
    Write-Info "检查虚拟环境..."
    
    if (-not (Test-Path "venv")) {
        Write-Info "创建虚拟环境..."
        python -m venv venv
        Write-Success "虚拟环境创建完成"
    } else {
        Write-Success "虚拟环境已存在"
    }
}

# 激活虚拟环境并安装依赖
function Install-Dependencies {
    Write-Info "安装依赖包..."
    
    # 激活虚拟环境
    & ".\venv\Scripts\Activate.ps1"
    
    # 升级 pip
    python -m pip install --upgrade pip
    
    # 安装依赖
    pip install -r requirements.txt
    
    Write-Success "依赖包安装完成"
}

# 检查环境变量
function Check-EnvConfig {
    Write-Info "检查环境变量配置..."
    
    if (-not (Test-Path ".env.test")) {
        Write-Error ".env.test 文件不存在"
        exit 1
    }
    
    # 复制为 .env
    Copy-Item ".env.test" ".env" -Force
    Write-Success "环境变量配置完成"
}

# 检查数据库连接
function Check-Database {
    Write-Info "检查数据库连接..."
    
    try {
        $testConnection = Test-NetConnection -ComputerName localhost -Port 5432 -WarningAction SilentlyContinue
        if ($testConnection.TcpTestSucceeded) {
            Write-Success "数据库端口可访问"
        } else {
            Write-Warning "无法连接到数据库端口，请确保 PostgreSQL 正在运行"
        }
    } catch {
        Write-Warning "无法测试数据库连接"
    }
}

# 检查 Redis 连接
function Check-Redis {
    Write-Info "检查 Redis 连接..."
    
    try {
        $testConnection = Test-NetConnection -ComputerName localhost -Port 6379 -WarningAction SilentlyContinue
        if ($testConnection.TcpTestSucceeded) {
            Write-Success "Redis 端口可访问"
        } else {
            Write-Warning "无法连接到 Redis 端口（可选服务）"
        }
    } catch {
        Write-Warning "无法测试 Redis 连接"
    }
}

# 停止旧进程
function Stop-OldProcess {
    Write-Info "检查并停止旧进程..."
    
    $processes = Get-Process -Name "uvicorn" -ErrorAction SilentlyContinue
    
    if ($processes) {
        Write-Info "发现运行中的 uvicorn 进程，正在停止..."
        $processes | Stop-Process -Force
        Start-Sleep -Seconds 2
        Write-Success "旧进程已停止"
    } else {
        Write-Info "没有运行中的旧进程"
    }
}

# 启动服务
function Start-Service {
    Write-Info "启动 FastAPI 后端服务..."
    Write-Info "服务将在端口 8001 上运行"
    Write-Info "按 Ctrl+C 停止服务"
    Write-Host ""
    
    # 激活虚拟环境
    & ".\venv\Scripts\Activate.ps1"
    
    # 设置环境变量
    $env:PORT = "8001"
    
    # 启动服务
    uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
}

# 主函数
function Main {
    Write-Info "=========================================="
    Write-Info "开始部署 FastAPI 后端到测试环境（本地）"
    Write-Info "=========================================="
    Write-Host ""
    
    try {
        Check-Python
        Check-VirtualEnv
        Install-Dependencies
        Check-EnvConfig
        Check-Database
        Check-Redis
        Stop-OldProcess
        
        Write-Success "准备工作完成，正在启动服务..."
        Write-Host ""
        Write-Info "服务地址: http://localhost:8001"
        Write-Info "API 文档: http://localhost:8001/docs"
        Write-Info "健康检查: http://localhost:8001/health"
        Write-Host ""
        
        Start-Service
    } catch {
        Write-Error "部署过程中发生错误: $_"
        exit 1
    }
}

# 执行主函数
Main
