# FastAPI 后端运维文档

## 目录

1. [数据库迁移](#数据库迁移)
2. [备份和恢复](#备份和恢复)
3. [监控和日志](#监控和日志)
4. [故障排查](#故障排查)
5. [性能优化](#性能优化)
6. [安全维护](#安全维护)
7. [日常运维](#日常运维)

---

## 数据库迁移

### 1. 数据库版本管理

FastAPI 后端使用 SQLAlchemy 与 Node.js 后端共享 PostgreSQL 数据库。数据库 schema 由 Node.js 后端的 Prisma 管理。

#### 查看当前数据库版本

```bash
cd backend-api
npx prisma migrate status
```

#### 应用数据库迁移

```bash
cd backend-api
npx prisma migrate deploy
```

### 2. 数据迁移最佳实践

#### 迁移前检查清单

- [ ] 备份当前数据库
- [ ] 在测试环境验证迁移脚本
- [ ] 检查磁盘空间是否充足
- [ ] 通知相关人员计划停机时间
- [ ] 准备回滚方案

#### 迁移步骤

```bash
# 1. 停止 FastAPI 服务
sudo systemctl stop fastapi-backend

# 2. 备份数据库
pg_dump -h localhost -U postgres -d laboratory_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 3. 应用迁移
cd backend-api
npx prisma migrate deploy

# 4. 验证迁移
npx prisma db pull
npx prisma validate

# 5. 启动 FastAPI 服务
sudo systemctl start fastapi-backend

# 6. 验证服务状态
curl http://localhost:8000/health
```

### 3. 回滚迁移

如果迁移失败,需要回滚到之前的版本:

```bash
# 1. 停止服务
sudo systemctl stop fastapi-backend

# 2. 恢复数据库备份
psql -h localhost -U postgres -d laboratory_db < backup_YYYYMMDD_HHMMSS.sql

# 3. 启动服务
sudo systemctl start fastapi-backend
```

---

## 备份和恢复

### 1. 数据库备份

#### 手动备份

```bash
# 完整备份
pg_dump -h localhost -U postgres -d laboratory_db -F c -f backup_$(date +%Y%m%d_%H%M%S).dump

# 仅备份 schema
pg_dump -h localhost -U postgres -d laboratory_db -s -f schema_$(date +%Y%m%d_%H%M%S).sql

# 仅备份数据
pg_dump -h localhost -U postgres -d laboratory_db -a -f data_$(date +%Y%m%d_%H%M%S).sql
```

#### 自动备份脚本

创建 `/opt/fastapi-backend/scripts/backup.sh`:

```bash
#!/bin/bash

# 配置
BACKUP_DIR="/var/backups/laboratory_db"
DB_NAME="laboratory_db"
DB_USER="postgres"
DB_HOST="localhost"
RETENTION_DAYS=30

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份文件名
BACKUP_FILE="$BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).dump"

# 执行备份
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -F c -f $BACKUP_FILE

# 压缩备份
gzip $BACKUP_FILE

# 删除旧备份
find $BACKUP_DIR -name "backup_*.dump.gz" -mtime +$RETENTION_DAYS -delete

# 记录日志
echo "$(date): Backup completed - $BACKUP_FILE.gz" >> /var/log/fastapi-backend/backup.log
```

#### 配置定时备份

```bash
# 编辑 crontab
crontab -e

# 添加每天凌晨 2 点执行备份
0 2 * * * /opt/fastapi-backend/scripts/backup.sh
```

### 2. 数据库恢复

#### 从备份恢复

```bash
# 1. 停止服务
sudo systemctl stop fastapi-backend

# 2. 删除现有数据库（可选）
psql -h localhost -U postgres -c "DROP DATABASE laboratory_db;"
psql -h localhost -U postgres -c "CREATE DATABASE laboratory_db;"

# 3. 恢复备份
gunzip -c backup_YYYYMMDD_HHMMSS.dump.gz | pg_restore -h localhost -U postgres -d laboratory_db

# 4. 验证数据
psql -h localhost -U postgres -d laboratory_db -c "SELECT COUNT(*) FROM \"User\";"

# 5. 启动服务
sudo systemctl start fastapi-backend
```

### 3. Redis 备份

#### 手动备份

```bash
# 触发 RDB 快照
redis-cli BGSAVE

# 复制 RDB 文件
cp /var/lib/redis/dump.rdb /var/backups/redis/dump_$(date +%Y%m%d_%H%M%S).rdb
```

#### 恢复 Redis

```bash
# 1. 停止 Redis
sudo systemctl stop redis

# 2. 恢复 RDB 文件
cp /var/backups/redis/dump_YYYYMMDD_HHMMSS.rdb /var/lib/redis/dump.rdb

# 3. 启动 Redis
sudo systemctl start redis
```

---

## 监控和日志

### 1. 应用日志

#### 日志位置

```
/var/log/fastapi-backend/
├── app.log              # 应用日志
├── error.log            # 错误日志
├── access.log           # 访问日志
├── performance.log      # 性能日志
└── audit.log            # 审计日志
```

#### 查看日志

```bash
# 实时查看应用日志
tail -f /var/log/fastapi-backend/app.log

# 查看错误日志
tail -f /var/log/fastapi-backend/error.log

# 搜索特定错误
grep "ERROR" /var/log/fastapi-backend/app.log

# 查看最近 100 行
tail -n 100 /var/log/fastapi-backend/app.log
```

#### 日志轮转配置

创建 `/etc/logrotate.d/fastapi-backend`:

```
/var/log/fastapi-backend/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 fastapi-backend fastapi-backend
    sharedscripts
    postrotate
        systemctl reload fastapi-backend > /dev/null 2>&1 || true
    endscript
}
```

### 2. 系统监控

#### Prometheus 指标

FastAPI 后端暴露 Prometheus 指标端点:

```
http://localhost:8000/metrics
```

#### 关键指标

- `http_requests_total` - HTTP 请求总数
- `http_request_duration_seconds` - 请求响应时间
- `http_requests_in_progress` - 进行中的请求数
- `database_connections_active` - 活跃数据库连接数
- `redis_connections_active` - 活跃 Redis 连接数
- `cache_hits_total` - 缓存命中次数
- `cache_misses_total` - 缓存未命中次数

#### 配置 Prometheus

创建 `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'fastapi-backend'
    static_configs:
      - targets: ['localhost:8000']
```

### 3. 健康检查

#### 基础健康检查

```bash
curl http://localhost:8000/health
```

响应示例:
```json
{
  "status": "healthy",
  "timestamp": "2026-04-17T10:00:00Z"
}
```

#### 详细健康检查

```bash
curl http://localhost:8000/health/detailed
```

响应示例:
```json
{
  "status": "healthy",
  "timestamp": "2026-04-17T10:00:00Z",
  "services": {
    "database": {
      "status": "healthy",
      "response_time_ms": 5
    },
    "redis": {
      "status": "healthy",
      "response_time_ms": 2
    }
  }
}
```

### 4. 性能监控

#### 慢查询日志

查看慢查询:

```bash
# 查看性能日志
tail -f /var/log/fastapi-backend/performance.log

# 查询慢查询统计
curl http://localhost:8000/api/v1/performance/slow-queries
```

#### 数据库连接池监控

```bash
# 查看连接池状态
psql -h localhost -U postgres -d laboratory_db -c "SELECT * FROM pg_stat_activity;"
```

---

## 故障排查

### 1. 服务无法启动

#### 检查步骤

```bash
# 1. 查看服务状态
sudo systemctl status fastapi-backend

# 2. 查看错误日志
sudo journalctl -u fastapi-backend -n 50

# 3. 检查端口占用
sudo netstat -tlnp | grep 8000

# 4. 检查配置文件
cat /opt/fastapi-backend/.env

# 5. 测试数据库连接
psql -h localhost -U postgres -d laboratory_db -c "SELECT 1;"

# 6. 测试 Redis 连接
redis-cli ping
```

#### 常见问题

**问题 1: 端口被占用**

```bash
# 查找占用进程
sudo lsof -i :8000

# 终止进程
sudo kill -9 <PID>
```

**问题 2: 数据库连接失败**

```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 检查连接配置
cat /opt/fastapi-backend/.env | grep DATABASE_URL

# 测试连接
psql -h localhost -U postgres -d laboratory_db
```

**问题 3: Redis 连接失败**

```bash
# 检查 Redis 状态
sudo systemctl status redis

# 测试连接
redis-cli ping

# 检查 Redis 配置
cat /etc/redis/redis.conf
```

### 2. 性能问题

#### 诊断步骤

```bash
# 1. 查看系统资源
top
htop

# 2. 查看内存使用
free -h

# 3. 查看磁盘 I/O
iostat -x 1

# 4. 查看网络连接
netstat -an | grep 8000

# 5. 查看慢查询
curl http://localhost:8000/api/v1/performance/slow-queries
```

#### 性能优化建议

1. **数据库优化**
   - 添加索引
   - 优化查询
   - 增加连接池大小

2. **缓存优化**
   - 增加 Redis 内存
   - 优化缓存策略
   - 使用缓存预热

3. **应用优化**
   - 增加 worker 进程数
   - 启用异步处理
   - 优化批量操作

### 3. 内存泄漏

#### 检测内存泄漏

```bash
# 监控内存使用
watch -n 1 'ps aux | grep uvicorn'

# 使用 memory_profiler
pip install memory_profiler
python -m memory_profiler app/main.py
```

#### 解决方案

1. 重启服务释放内存
2. 检查代码中的循环引用
3. 优化数据库连接池
4. 增加服务器内存

### 4. 数据库死锁

#### 检测死锁

```sql
-- 查看锁等待
SELECT * FROM pg_stat_activity WHERE wait_event_type = 'Lock';

-- 查看死锁
SELECT * FROM pg_locks WHERE NOT granted;
```

#### 解决死锁

```sql
-- 终止阻塞查询
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = <PID>;
```

---

## 性能优化

### 1. 数据库优化

#### 添加索引

```sql
-- 为常用查询字段添加索引
CREATE INDEX idx_sample_barcode ON "Sample"(barcode);
CREATE INDEX idx_sample_status ON "Sample"(status);
CREATE INDEX idx_user_email ON "User"(email);
```

#### 查询优化

```sql
-- 使用 EXPLAIN ANALYZE 分析查询
EXPLAIN ANALYZE SELECT * FROM "Sample" WHERE status = 'TESTING';

-- 优化慢查询
CREATE INDEX idx_sample_status_created ON "Sample"(status, "createdAt");
```

### 2. 缓存优化

#### Redis 配置优化

编辑 `/etc/redis/redis.conf`:

```
# 增加最大内存
maxmemory 2gb

# 设置淘汰策略
maxmemory-policy allkeys-lru

# 启用持久化
save 900 1
save 300 10
save 60 10000
```

#### 缓存预热

```python
# 启动时预热常用数据
python -c "from app.services.cache_warmup import warmup_cache; warmup_cache()"
```

### 3. 应用优化

#### 增加 Worker 进程

编辑 `/etc/systemd/system/fastapi-backend.service`:

```ini
[Service]
ExecStart=/opt/fastapi-backend/venv/bin/gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000
```

#### 启用连接池

编辑 `.env`:

```
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=10
REDIS_POOL_SIZE=10
```

---

## 安全维护

### 1. 定期安全检查

#### 检查清单

- [ ] 更新系统补丁
- [ ] 更新 Python 依赖
- [ ] 检查安全漏洞
- [ ] 审查访问日志
- [ ] 检查异常登录
- [ ] 验证备份完整性

#### 更新依赖

```bash
# 检查过期依赖
pip list --outdated

# 更新依赖
pip install --upgrade -r requirements.txt

# 检查安全漏洞
pip-audit
```

### 2. 审计日志审查

#### 查看审计日志

```bash
# 查看最近的审计日志
tail -n 100 /var/log/fastapi-backend/audit.log

# 搜索特定用户的操作
grep "user_id: <USER_ID>" /var/log/fastapi-backend/audit.log

# 搜索失败的登录尝试
grep "LOGIN_FAILED" /var/log/fastapi-backend/audit.log
```

### 3. 密钥轮换

#### JWT 密钥轮换

```bash
# 1. 生成新密钥
openssl rand -hex 32

# 2. 更新 .env 文件
JWT_SECRET_KEY=<NEW_KEY>

# 3. 重启服务
sudo systemctl restart fastapi-backend
```

---

## 日常运维

### 1. 每日检查

```bash
#!/bin/bash
# daily_check.sh

echo "=== FastAPI Backend Daily Check ==="
echo "Date: $(date)"
echo ""

# 检查服务状态
echo "1. Service Status:"
systemctl status fastapi-backend | grep Active

# 检查磁盘空间
echo "2. Disk Space:"
df -h | grep -E '(Filesystem|/dev/)'

# 检查内存使用
echo "3. Memory Usage:"
free -h

# 检查错误日志
echo "4. Recent Errors:"
tail -n 10 /var/log/fastapi-backend/error.log

# 检查数据库连接
echo "5. Database Connection:"
psql -h localhost -U postgres -d laboratory_db -c "SELECT 1;" > /dev/null 2>&1 && echo "OK" || echo "FAILED"

# 检查 Redis 连接
echo "6. Redis Connection:"
redis-cli ping > /dev/null 2>&1 && echo "OK" || echo "FAILED"

echo ""
echo "=== Check Complete ==="
```

### 2. 每周维护

- 检查备份完整性
- 审查性能指标
- 清理旧日志
- 更新文档

### 3. 每月维护

- 数据库优化（VACUUM, ANALYZE）
- 安全审计
- 容量规划
- 灾难恢复演练

---

## 联系支持

如遇到无法解决的问题,请联系技术支持:

- **邮箱**: support@example.com
- **电话**: +86-xxx-xxxx-xxxx
- **工单系统**: https://support.example.com

提供以下信息以加快问题解决:

1. 错误描述和复现步骤
2. 错误日志（最近 100 行）
3. 系统环境信息
4. 服务配置文件
5. 最近的变更记录
