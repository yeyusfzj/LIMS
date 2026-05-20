#!/bin/bash

# 认证 API 测试脚本

API_URL="http://localhost:3000/api"

echo "=========================================="
echo "认证 API 测试"
echo "=========================================="
echo ""

# 测试登录
echo "1. 测试登录..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123456"}')

echo "登录响应:"
echo "$LOGIN_RESPONSE" | jq '.'
echo ""

# 提取访问令牌
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken')
REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.refreshToken')

if [ "$ACCESS_TOKEN" = "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ 登录失败，无法获取访问令牌"
  exit 1
fi

echo "✅ 登录成功"
echo "访问令牌: ${ACCESS_TOKEN:0:50}..."
echo ""

# 测试获取当前用户信息
echo "2. 测试获取当前用户信息..."
USER_RESPONSE=$(curl -s -X GET "$API_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "用户信息响应:"
echo "$USER_RESPONSE" | jq '.'
echo ""

if echo "$USER_RESPONSE" | jq -e '.success' > /dev/null; then
  echo "✅ 获取用户信息成功"
else
  echo "❌ 获取用户信息失败"
fi
echo ""

# 测试刷新令牌
echo "3. 测试刷新令牌..."
REFRESH_RESPONSE=$(curl -s -X POST "$API_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")

echo "刷新令牌响应:"
echo "$REFRESH_RESPONSE" | jq '.'
echo ""

NEW_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | jq -r '.data.accessToken')

if [ "$NEW_ACCESS_TOKEN" != "null" ] && [ -n "$NEW_ACCESS_TOKEN" ]; then
  echo "✅ 刷新令牌成功"
  echo "新访问令牌: ${NEW_ACCESS_TOKEN:0:50}..."
else
  echo "❌ 刷新令牌失败"
fi
echo ""

# 测试登出
echo "4. 测试登出..."
LOGOUT_RESPONSE=$(curl -s -X POST "$API_URL/auth/logout" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "登出响应:"
echo "$LOGOUT_RESPONSE" | jq '.'
echo ""

if echo "$LOGOUT_RESPONSE" | jq -e '.success' > /dev/null; then
  echo "✅ 登出成功"
else
  echo "❌ 登出失败"
fi
echo ""

# 测试登出后访问
echo "5. 测试登出后访问（应该失败）..."
AFTER_LOGOUT_RESPONSE=$(curl -s -X GET "$API_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "登出后访问响应:"
echo "$AFTER_LOGOUT_RESPONSE" | jq '.'
echo ""

if echo "$AFTER_LOGOUT_RESPONSE" | jq -e '.error' > /dev/null; then
  echo "✅ 正确拒绝了已登出的令牌"
else
  echo "❌ 未能正确拒绝已登出的令牌"
fi
echo ""

echo "=========================================="
echo "测试完成"
echo "=========================================="
