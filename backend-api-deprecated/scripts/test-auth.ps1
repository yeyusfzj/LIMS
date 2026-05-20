# 认证 API 测试脚本 (PowerShell)

$API_URL = "http://localhost:3000/api"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "认证 API 测试" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 测试登录
Write-Host "1. 测试登录..." -ForegroundColor Yellow
$loginBody = @{
    username = "admin"
    password = "Admin@123456"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$API_URL/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody

    Write-Host "登录响应:" -ForegroundColor Green
    $loginResponse | ConvertTo-Json -Depth 10
    Write-Host ""

    $accessToken = $loginResponse.data.accessToken
    $refreshToken = $loginResponse.data.refreshToken

    if ($accessToken) {
        Write-Host "✅ 登录成功" -ForegroundColor Green
        Write-Host "访问令牌: $($accessToken.Substring(0, [Math]::Min(50, $accessToken.Length)))..." -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host "❌ 登录失败，无法获取访问令牌" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ 登录请求失败: $_" -ForegroundColor Red
    exit 1
}

# 测试获取当前用户信息
Write-Host "2. 测试获取当前用户信息..." -ForegroundColor Yellow
try {
    $headers = @{
        Authorization = "Bearer $accessToken"
    }
    
    $userResponse = Invoke-RestMethod -Uri "$API_URL/auth/me" `
        -Method Get `
        -Headers $headers

    Write-Host "用户信息响应:" -ForegroundColor Green
    $userResponse | ConvertTo-Json -Depth 10
    Write-Host ""

    if ($userResponse.success) {
        Write-Host "✅ 获取用户信息成功" -ForegroundColor Green
    } else {
        Write-Host "❌ 获取用户信息失败" -ForegroundColor Red
    }
    Write-Host ""
} catch {
    Write-Host "❌ 获取用户信息失败: $_" -ForegroundColor Red
}

# 测试刷新令牌
Write-Host "3. 测试刷新令牌..." -ForegroundColor Yellow
try {
    $refreshBody = @{
        refreshToken = $refreshToken
    } | ConvertTo-Json

    $refreshResponse = Invoke-RestMethod -Uri "$API_URL/auth/refresh" `
        -Method Post `
        -ContentType "application/json" `
        -Body $refreshBody

    Write-Host "刷新令牌响应:" -ForegroundColor Green
    $refreshResponse | ConvertTo-Json -Depth 10
    Write-Host ""

    $newAccessToken = $refreshResponse.data.accessToken

    if ($newAccessToken) {
        Write-Host "✅ 刷新令牌成功" -ForegroundColor Green
        Write-Host "新访问令牌: $($newAccessToken.Substring(0, [Math]::Min(50, $newAccessToken.Length)))..." -ForegroundColor Gray
    } else {
        Write-Host "❌ 刷新令牌失败" -ForegroundColor Red
    }
    Write-Host ""
} catch {
    Write-Host "❌ 刷新令牌失败: $_" -ForegroundColor Red
}

# 测试登出
Write-Host "4. 测试登出..." -ForegroundColor Yellow
try {
    $headers = @{
        Authorization = "Bearer $accessToken"
    }

    $logoutResponse = Invoke-RestMethod -Uri "$API_URL/auth/logout" `
        -Method Post `
        -Headers $headers

    Write-Host "登出响应:" -ForegroundColor Green
    $logoutResponse | ConvertTo-Json -Depth 10
    Write-Host ""

    if ($logoutResponse.success) {
        Write-Host "✅ 登出成功" -ForegroundColor Green
    } else {
        Write-Host "❌ 登出失败" -ForegroundColor Red
    }
    Write-Host ""
} catch {
    Write-Host "❌ 登出失败: $_" -ForegroundColor Red
}

# 测试登出后访问
Write-Host "5. 测试登出后访问（应该失败）..." -ForegroundColor Yellow
try {
    $headers = @{
        Authorization = "Bearer $accessToken"
    }

    $afterLogoutResponse = Invoke-RestMethod -Uri "$API_URL/auth/me" `
        -Method Get `
        -Headers $headers

    Write-Host "❌ 未能正确拒绝已登出的令牌" -ForegroundColor Red
} catch {
    Write-Host "登出后访问响应: 401 Unauthorized" -ForegroundColor Green
    Write-Host "✅ 正确拒绝了已登出的令牌" -ForegroundColor Green
}
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "测试完成" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
