# HTTPS 部署配置指南

本文档说明如何为 FastAPI 后端配置 HTTPS,确保数据传输安全。

## 概述

HTTPS (HTTP Secure) 是 HTTP 协议的安全版本,使用 TLS/SSL 加密传输数据,防止中间人攻击和数据窃听。

**安全要求:**
- 生产环境必须使用 HTTPS
- 开发环境可以使用 HTTP,但建议使用 HTTPS
- 所有敏感数据传输必须通过 HTTPS

## 部署方案

### 方案 1: 使用 Nginx 反向代理 (推荐)

这是最常用的生产环境部署方案,Nginx 处理 HTTPS 和 SSL 证书,FastAPI 在后端运行。

#### 1.1 获取 SSL 证书

**选项 A: 使用 Let's Encrypt (免费)**

```bash
# 安装 Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d api.example.com
```

**选项 B: 使用商业 SSL 证书**

从 SSL 证书提供商购买证书,并将证书文件放置在服务器上:
- 证书文件: `/etc/ssl/certs/api.example.com.crt`
- 私钥文件: `/etc/ssl/private/api.example.com.key`

#### 1.2 配置 Nginx

创建 Nginx 配置文件 `/etc/nginx/sites-available/fastapi-backend`:

```nginx
# HTTP 服务器 - 重定向到 HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name api.example.com;
    
    # 重定向所有 HTTP 请求到 HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS 服务器
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.example.com;
    
    # SSL 证书配置
    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;
    
    # SSL 协议和密码套件
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    
    # SSL 会话缓存
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    ssl_trusted_certificate /etc/letsencrypt/live/api.example.com/chain.pem;
    
    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # 日志
    access_log /var/log/nginx/fastapi_access.log;
    error_log /var/log/nginx/fastapi_error.log;
    
    # 客户端最大请求体大小
    client_max_body_size 100M;
    
    # 代理设置
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # WebSocket 支持
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    # 静态文件
    location /static/ {
        alias /opt/fastapi-backend/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # 健康检查
    location /health {
        proxy_pass http://127.0.0.1:8000/health;
        access_log off;
    }
}
```

#### 1.3 启用配置并重启 Nginx

```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/fastapi-backend /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

#### 1.4 自动续期 SSL 证书

Let's Encrypt 证书有效期为 90 天,需要定期续期:

```bash
# 测试续期
sudo certbot renew --dry-run

# 添加自动续期任务
sudo crontab -e

# 添加以下行(每天凌晨 2 点检查并续期)
0 2 * * * certbot renew --quiet --post-hook "systemctl reload nginx"
```

### 方案 2: 直接在 FastAPI 中配置 HTTPS

这种方案适用于开发环境或简单部署,不推荐用于生产环境。

#### 2.1 生成自签名证书(仅用于开发)

```bash
# 生成私钥和证书
openssl req -x509 -newkey rsa:4096 -nodes \
  -out cert.pem \
  -keyout key.pem \
  -days 365 \
  -subj "/C=CN/ST=Beijing/L=Beijing/O=Example/CN=localhost"
```

#### 2.2 修改启动脚本

```python
# app/main.py
if __name__ == "__main__":
    import uvicorn
    
    # 开发环境 - HTTPS
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        ssl_keyfile="./key.pem",
        ssl_certfile="./cert.pem"
    )
```

或使用命令行:

```bash
uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --ssl-keyfile=./key.pem \
  --ssl-certfile=./cert.pem
```

### 方案 3: 使用云服务提供商的负载均衡器

如果部署在云平台(AWS, Azure, GCP 等),可以使用云服务提供商的负载均衡器处理 HTTPS。

#### AWS Application Load Balancer (ALB)

1. 在 AWS Certificate Manager (ACM) 中申请或导入 SSL 证书
2. 创建 Application Load Balancer
3. 配置 HTTPS 监听器(端口 443)
4. 将证书关联到监听器
5. 配置目标组指向 FastAPI 实例(端口 8000)
6. 配置安全组允许 HTTPS 流量

#### Azure Application Gateway

1. 在 Azure Key Vault 中存储 SSL 证书
2. 创建 Application Gateway
3. 配置 HTTPS 监听器
4. 关联 SSL 证书
5. 配置后端池指向 FastAPI 实例

#### Google Cloud Load Balancer

1. 在 Google Cloud 中创建 SSL 证书
2. 创建 HTTPS 负载均衡器
3. 配置后端服务指向 FastAPI 实例
4. 关联 SSL 证书

## Docker 部署中的 HTTPS

### 使用 Docker Compose + Nginx

创建 `docker-compose.yml`:

```yaml
version: '3.8'

services:
  fastapi:
    build: .
    container_name: fastapi-backend
    restart: unless-stopped
    environment:
      - DATABASE_URL=postgresql+asyncpg://user:password@postgres:5432/lab_db
      - REDIS_URL=redis://redis:6379/0
    networks:
      - backend

  nginx:
    image: nginx:alpine
    container_name: nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - fastapi
    networks:
      - backend

networks:
  backend:
    driver: bridge
```

## 安全最佳实践

### 1. 强制使用 HTTPS

在 FastAPI 应用中添加中间件,强制重定向 HTTP 到 HTTPS:

```python
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware

# 仅在生产环境启用
if not settings.DEBUG:
    app.add_middleware(HTTPSRedirectMiddleware)
```

### 2. 配置 HSTS (HTTP Strict Transport Security)

在 Nginx 配置中添加 HSTS 头:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

### 3. 使用强加密套件

只允许安全的 TLS 协议和密码套件:

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
ssl_prefer_server_ciphers off;
```

### 4. 启用 OCSP Stapling

提高 SSL 握手性能:

```nginx
ssl_stapling on;
ssl_stapling_verify on;
```

### 5. 配置安全头

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### 6. 定期更新证书

- Let's Encrypt 证书有效期 90 天,建议每 60 天自动续期
- 商业证书通常有效期 1-2 年,需要手动续期

### 7. 监控证书过期

使用监控工具(如 Prometheus + Alertmanager)监控证书过期时间:

```bash
# 检查证书过期时间
echo | openssl s_client -servername api.example.com -connect api.example.com:443 2>/dev/null | openssl x509 -noout -dates
```

## 测试 HTTPS 配置

### 1. 使用 curl 测试

```bash
# 测试 HTTPS 连接
curl -I https://api.example.com/health

# 测试 HTTP 重定向
curl -I http://api.example.com/health
```

### 2. 使用 SSL Labs 测试

访问 [SSL Labs](https://www.ssllabs.com/ssltest/) 测试 SSL 配置质量。

### 3. 使用 testssl.sh 测试

```bash
# 安装 testssl.sh
git clone https://github.com/drwetter/testssl.sh.git
cd testssl.sh

# 测试 SSL 配置
./testssl.sh https://api.example.com
```

## 故障排查

### 问题 1: 证书不受信任

**原因:** 使用自签名证书或证书链不完整

**解决方案:**
- 生产环境使用受信任的 CA 签发的证书
- 确保证书链完整(包含中间证书)

### 问题 2: 混合内容警告

**原因:** HTTPS 页面加载 HTTP 资源

**解决方案:**
- 确保所有资源(API、图片、脚本)都使用 HTTPS
- 在前端配置中使用相对路径或 HTTPS URL

### 问题 3: 证书过期

**原因:** 证书已过期且未续期

**解决方案:**
- 设置自动续期任务
- 配置证书过期监控和告警

### 问题 4: SSL 握手失败

**原因:** TLS 版本或密码套件不兼容

**解决方案:**
- 检查 SSL 协议配置
- 更新密码套件列表
- 确保客户端支持 TLS 1.2 或更高版本

## 环境变量配置

在 `.env` 文件中配置 HTTPS 相关设置:

```bash
# 是否强制使用 HTTPS
FORCE_HTTPS=true

# 是否启用 HSTS
ENABLE_HSTS=true

# HSTS 最大年龄(秒)
HSTS_MAX_AGE=31536000

# 是否包含子域名
HSTS_INCLUDE_SUBDOMAINS=true
```

## 参考资源

- [Let's Encrypt 官方文档](https://letsencrypt.org/docs/)
- [Nginx SSL 配置指南](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [Mozilla SSL 配置生成器](https://ssl-config.mozilla.org/)
- [OWASP TLS 备忘单](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html)
- [SSL Labs 测试工具](https://www.ssllabs.com/ssltest/)

## 总结

1. **生产环境必须使用 HTTPS**
2. **推荐使用 Nginx 反向代理处理 HTTPS**
3. **使用 Let's Encrypt 免费证书或商业证书**
4. **配置自动续期避免证书过期**
5. **启用 HSTS 和其他安全头**
6. **定期测试和监控 SSL 配置**
7. **保持 TLS 协议和密码套件更新**
