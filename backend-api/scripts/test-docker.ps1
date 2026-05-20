# Docker 镜像测试脚本
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Docker Image Test Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

function Test-Passed {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Test-Failed {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
    exit 1
}

function Test-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

# 1. 检查必要的文件
Write-Host "`n1. Checking required files..." -ForegroundColor Cyan
$requiredFiles = @(
    ".\fastapi-backend\Dockerfile",
    ".\fastapi-backend\docker-compose.yml",
    ".\fastapi-backend\docker-compose.prod.yml",
    ".\fastapi-backend\requirements.txt",
    ".\fastapi-backend\app\main.py",
    ".\fastapi-backend\.dockerignore"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Test-Passed "Found: $file"
    } else {
        Test-Failed "Missing: $file"
    }
}

# 2. 检查 Nginx 配置
Write-Host "`n2. Checking Nginx configuration..." -ForegroundColor Cyan
if (Test-Path ".\fastapi-backend\nginx\nginx.conf") {
    Test-Passed "Nginx configuration exists"
} else {
    Test-Failed "Nginx configuration not found"
}

# 3. 检查环境变量模板
Write-Host "`n3. Checking environment variable templates..." -ForegroundColor Cyan
if (Test-Path ".\fastapi-backend\.env.example") {
    Test-Passed ".env.example exists"
} else {
    Test-Warning ".env.example not found"
}

if (Test-Path ".\fastapi-backend\.env.production") {
    Test-Passed ".env.production template exists"
} else {
    Test-Warning ".env.production template not found"
}

# 4. 检查启动脚本
Write-Host "`n4. Checking startup scripts..." -ForegroundColor Cyan
if (Test-Path ".\fastapi-backend\scripts\start.sh") {
    Test-Passed "Startup script exists"
} else {
    Test-Failed "Startup script not found"
}

# 5. 检查 Dockerfile 内容
Write-Host "`n5. Checking Dockerfile configuration..." -ForegroundColor Cyan
$dockerfileContent = Get-Content ".\fastapi-backend\Dockerfile" -Raw

if ($dockerfileContent -match "FROM.*AS builder") {
    Test-Passed "Multi-stage build is configured"
} else {
    Test-Failed "Multi-stage build not found in Dockerfile"
}

if ($dockerfileContent -match "HEALTHCHECK") {
    Test-Passed "Health check is configured in Dockerfile"
} else {
    Test-Warning "Health check not found in Dockerfile"
}

if ($dockerfileContent -match "USER appuser") {
    Test-Passed "Non-root user is configured"
} else {
    Test-Failed "Non-root user not configured"
}

# 6. 检查 docker-compose.prod.yml 内容
Write-Host "`n6. Checking docker-compose.prod.yml configuration..." -ForegroundColor Cyan
$composeContent = Get-Content ".\fastapi-backend\docker-compose.prod.yml" -Raw

if ($composeContent -match "healthcheck:") {
    Test-Passed "Health check is configured in docker-compose.prod.yml"
} else {
    Test-Warning "Health check not found in docker-compose.prod.yml"
}

if ($composeContent -match "resources:") {
    Test-Passed "Resource limits are configured"
} else {
    Test-Warning "Resource limits not configured"
}

if ($composeContent -match "restart:") {
    Test-Passed "Restart policy is configured"
} else {
    Test-Warning "Restart policy not configured"
}

# 7. 估算应用大小
Write-Host "`n7. Estimating application size..." -ForegroundColor Cyan
if (Test-Path ".\fastapi-backend\app") {
    $appSize = (Get-ChildItem -Path ".\fastapi-backend\app" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "   Application code size: $([math]::Round($appSize, 2)) MB" -ForegroundColor White
}

# 8. 检查 Docker 是否可用
Write-Host "`n8. Checking Docker availability..." -ForegroundColor Cyan
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Test-Passed "Docker is available: $dockerVersion"
    } else {
        Test-Warning "Docker command not found"
    }
} catch {
    Test-Warning "Docker is not available or not running"
}

# 总结
Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "Docker Configuration Test Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "All critical tests passed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Build the Docker image:" -ForegroundColor White
Write-Host "   docker build -t fastapi-backend:latest .\fastapi-backend" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Test the image locally:" -ForegroundColor White
Write-Host "   docker-compose -f .\fastapi-backend\docker-compose.yml up" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Deploy to production:" -ForegroundColor White
Write-Host "   docker-compose -f .\fastapi-backend\docker-compose.prod.yml up -d" -ForegroundColor Gray
Write-Host ""
