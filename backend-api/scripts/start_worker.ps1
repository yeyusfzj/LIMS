# ARQ Worker 启动脚本 (PowerShell)

Write-Host "启动 ARQ Worker..." -ForegroundColor Green

# 设置 Python 路径
$env:PYTHONPATH = "$env:PYTHONPATH;$(Get-Location)"

# 启动 worker
arq app.worker.WorkerSettings

Write-Host "ARQ Worker 已停止" -ForegroundColor Yellow
