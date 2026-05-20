# 应急响应手册

本手册提供生产环境故障的应急响应流程和处理方法。

## 目录

- [应急响应流程](#应急响应流程)
- [常见故障处理](#常见故障处理)
- [快速诊断指南](#快速诊断指南)
- [回滚流程](#回滚流程)
- [联系人信息](#联系人信息)

## 应急响应流程

### 1. 故障发现

#### 发现渠道

- 监控告警 (Prometheus/Alertmanager)
- 用户反馈
- 日志异常
- 健康检查失败
- 性能监控异常

#### 初步评估

```bash
# 快速检查服务状态
docker-compose -f docker-compose.prod.yml ps

# 检查健康状态
curl http://localhost:8000/health/detailed

# 查看最近日志
docker-compose -f docker-compose.prod.yml logs --tail=100 fastapi-backend
```

### 2. 问题分级

#### P0 - 严重故障 (立即响应)

**定义**: 服务完全不可用,影响所有用户

**响应时间**: 5 分钟内

**处理流程**:
1. 立即通知技术负责人和运维负责人
2. 启动应急响应小组
3. 评估是否需要立即回滚
4. 执行紧急修复或回滚
5. 持续监控直到恢复

**示例**:
- 服务完全宕机
- 数据库连接完全失败
- 严重安全漏洞
- 数据丢失或损坏

#### P1 - 高优先级故障 (紧急响应)

**定义**: 核心功能不可用,影响大部分用户

**响应时间**: 15 分钟内

**处理流程**:
1. 通知相关技术人员
2. 分析问题原因
3. 制定修复方案
4. 执行修复
5. 验证修复效果

**示例**:
- 登录功能失败
- 关键 API 不可用
- 性能严重下降
- 部分数据不可访问

#### P2 - 中优先级故障 (常规响应)

**定义**: 非核心功能异常,影响部分用户

**响应时间**: 1 小时内

**处理流程**:
1. 记录问题
2. 分析影响范围
3. 安排修复时间
4. 执行修复
5. 通知用户

**示例**:
- 次要功能异常
- 性能轻微下降
- 非关键数据异常
- 日志错误

#### P3 - 低优先级故障 (计划响应)

**定义**: 轻微问题,不影响用户使用

**响应时间**: 24 小时内

**处理流程**:
1. 记录问题
2. 纳入修复计划
3. 定期修复
4. 验证修复

**示例**:
- UI 显示问题
- 文档错误
- 优化建议
- 功能改进

### 3. 应急响应小组

#### 角色和职责

| 角色 | 职责 | 联系方式 |
|------|------|----------|
| 应急指挥官 | 统筹协调,决策 | |
| 技术负责人 | 技术分析,方案制定 | |
| 运维负责人 | 系统操作,监控 | |
| 开发负责人 | 代码修复,部署 | |
| 沟通协调员 | 内外沟通,通知 | |

#### 沟通渠道

- **紧急电话**: +86-xxx-xxxx-xxxx
- **Slack/钉钉群**: #emergency-response
- **邮件**: emergency@yourdomain.com
- **会议室**: 应急响应会议室

## 常见故障处理

### 1. 服务不可用

#### 症状

- 健康检查失败
- API 请求超时
- 容器状态异常
- 无法访问服务

#### 快速诊断

```bash
# 1. 检查容器状态
docker-compose -f docker-compose.prod.yml ps

# 2. 检查容器日志
docker-compose -f docker-compose.prod.yml logs --tail=100 fastapi-backend

# 3. 检查资源使用
docker stats fastapi-backend-prod

# 4. 检查网络连接
curl -v http://localhost:8000/health
```

#### 处理步骤

**步骤 1: 尝试重启服务**

```bash
# 重启 FastAPI 服务
docker-compose -f docker-compose.prod.yml restart fastapi-backend

# 等待 30 秒
sleep 30

# 检查健康状态
curl http://localhost:8000/health
```

**步骤 2: 如果重启失败,检查配置**

```bash
# 检查环境变量
docker-compose -f docker-compose.prod.yml exec fastapi-backend env | grep -E "DATABASE|REDIS|JWT"

# 检查配置文件
cat .env.production
```

**步骤 3: 如果配置正确,检查依赖服务**

```bash
# 检查数据库
docker-compose -f docker-compose.prod.yml exec postgres pg_isready

# 检查 Redis
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
```

**步骤 4: 如果问题持续,执行回滚**

```bash
./scripts/rollback-production.sh
```

### 2. 数据库连接失败

#### 症状

- 日志显示数据库连接错误
- API 返回 500 错误
- 健康检查显示数据库不可用

#### 快速诊断

```bash
# 1. 检查数据库状态
docker-compose -f docker-compose.prod.yml ps postgres

# 2. 测试数据库连接
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d laboratory -c "SELECT 1"

# 3. 检查数据库日志
docker-compose -f docker-compose.prod.yml logs --tail=100 postgres

# 4. 检查连接数
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d laboratory -c "SELECT count(*) FROM pg_stat_activity"
```

#### 处理步骤

**步骤 1: 检查数据库服务**

```bash
# 重启数据库
docker-compose -f docker-compose.prod.yml restart postgres

# 等待数据库就绪
sleep 10

# 测试连接
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d laboratory -c "SELECT 1"
```

**步骤 2: 检查连接池**

```bash
# 查看连接池状态
docker-compose -f docker-compose.prod.yml logs fastapi-backend | grep "pool"

# 如果连接池耗尽,增加连接池大小
# 编辑 .env.production
DB_POOL_SIZE=30
DB_MAX_OVERFLOW=20

# 重启服务
docker-compose -f docker-compose.prod.yml restart fastapi-backend
```

**步骤 3: 检查数据库性能**

```bash
# 查看慢查询
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d laboratory -c "
    SELECT query, calls, total_time, mean_time
    FROM pg_stat_statements
    ORDER BY mean_time DESC
    LIMIT 10;
  "

# 如果有慢查询,考虑优化或添加索引
```

**步骤 4: 检查数据库磁盘空间**

```bash
# 检查磁盘空间
df -h

# 如果空间不足,清理旧数据或扩容
```

### 3. Redis 连接失败

#### 症状

- 缓存功能不可用
- 限流功能失效
- 日志显示 Redis 连接错误

#### 快速诊断

```bash
# 1. 检查 Redis 状态
docker-compose -f docker-compose.prod.yml ps redis

# 2. 测试 Redis 连接
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping

# 3. 检查 Redis 日志
docker-compose -f docker-compose.prod.yml logs --tail=100 redis

# 4. 检查 Redis 内存
docker-compose -f docker-compose.prod.yml exec redis redis-cli info memory
```

#### 处理步骤

**步骤 1: 重启 Redis**

```bash
# 重启 Redis
docker-compose -f docker-compose.prod.yml restart redis

# 等待 Redis 就绪
sleep 5

# 测试连接
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
```

**步骤 2: 检查 Redis 内存**

```bash
# 查看内存使用
docker-compose -f docker-compose.prod.yml exec redis redis-cli info memory

# 如果内存不足,清理缓存
docker-compose -f docker-compose.prod.yml exec redis redis-cli FLUSHDB

# 或增加内存限制
# 编辑 docker-compose.prod.yml
redis:
  command: redis-server --maxmemory 2gb
```

**步骤 3: 检查 Redis 配置**

```bash
# 查看 Redis 配置
docker-compose -f docker-compose.prod.yml exec redis redis-cli CONFIG GET "*"

# 检查密码配置
docker-compose -f docker-compose.prod.yml exec redis redis-cli AUTH <password>
```

### 4. 性能下降

#### 症状

- API 响应时间增加
- 请求超时
- CPU/内存使用率高
- 数据库查询慢

#### 快速诊断

```bash
# 1. 检查资源使用
docker stats fastapi-backend-prod

# 2. 检查 API 响应时间
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8000/health

# 3. 检查数据库性能
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d laboratory -c "
    SELECT * FROM pg_stat_activity WHERE state = 'active';
  "

# 4. 检查慢查询
docker-compose -f docker-compose.prod.yml logs fastapi-backend | grep "slow"
```

#### 处理步骤

**步骤 1: 识别瓶颈**

```bash
# 检查 CPU 使用
docker stats --no-stream fastapi-backend-prod | awk '{print $3}'

# 检查内存使用
docker stats --no-stream fastapi-backend-prod | awk '{print $7}'

# 检查数据库连接
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d laboratory -c "SELECT count(*) FROM pg_stat_activity"
```

**步骤 2: 临时缓解**

```bash
# 增加 Worker 数量
# 编辑 .env.production
UVICORN_WORKERS=8

# 重启服务
docker-compose -f docker-compose.prod.yml restart fastapi-backend

# 清理缓存
docker-compose -f docker-compose.prod.yml exec redis redis-cli FLUSHDB

# 重启数据库连接
docker-compose -f docker-compose.prod.yml restart postgres
```

**步骤 3: 长期优化**

```bash
# 添加数据库索引
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d laboratory -c "
    CREATE INDEX CONCURRENTLY idx_samples_barcode ON samples(barcode);
  "

# 优化查询
# 分析慢查询并优化

# 增加缓存
# 编辑 .env.production
CACHE_ENABLED=true
CACHE_TTL=600
```

### 5. 内存泄漏

#### 症状

- 内存使用持续增长
- 服务变慢
- 最终服务崩溃

#### 快速诊断

```bash
# 1. 监控内存使用趋势
docker stats fastapi-backend-prod

# 2. 检查进程内存
docker-compose -f docker-compose.prod.yml exec fastapi-backend ps aux

# 3. 检查 Python 内存
docker-compose -f docker-compose.prod.yml exec fastapi-backend \
  python -c "import psutil; print(psutil.virtual_memory())"
```

#### 处理步骤

**步骤 1: 临时重启**

```bash
# 重启服务释放内存
docker-compose -f docker-compose.prod.yml restart fastapi-backend

# 监控内存使用
watch -n 5 'docker stats --no-stream fastapi-backend-prod'
```

**步骤 2: 检查连接泄漏**

```bash
# 检查数据库连接
docker-compose -f docker-compose.prod.yml logs fastapi-backend | grep "pool"

# 检查未关闭的连接
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d laboratory -c "
    SELECT * FROM pg_stat_activity WHERE state != 'idle';
  "
```

**步骤 3: 配置自动重启**

```bash
# 编辑 docker-compose.prod.yml
services:
  fastapi-backend:
    restart: unless-stopped
    deploy:
      restart_policy:
        condition: on-failure
        max_attempts: 3
```

### 6. 磁盘空间不足

#### 症状

- 日志写入失败
- 数据库写入失败
- 服务崩溃

#### 快速诊断

```bash
# 1. 检查磁盘空间
df -h

# 2. 查找大文件
du -sh /* | sort -rh | head -10

# 3. 检查日志大小
du -sh logs/
```

#### 处理步骤

**步骤 1: 清理日志**

```bash
# 清理旧日志
find logs/ -name "*.log" -mtime +7 -delete

# 压缩日志
gzip logs/*.log

# 配置日志轮转
# 编辑 docker-compose.prod.yml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

**步骤 2: 清理 Docker**

```bash
# 清理未使用的镜像
docker image prune -a -f

# 清理未使用的容器
docker container prune -f

# 清理未使用的卷
docker volume prune -f

# 清理构建缓存
docker builder prune -a -f
```

**步骤 3: 清理数据库**

```bash
# 清理旧数据
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d laboratory -c "
    DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
  "

# 清理归档数据
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d laboratory -c "VACUUM FULL"
```

## 快速诊断指南

### 诊断命令速查表

```bash
# 服务状态
docker-compose -f docker-compose.prod.yml ps

# 健康检查
curl http://localhost:8000/health/detailed

# 查看日志
docker-compose -f docker-compose.prod.yml logs --tail=100 fastapi-backend

# 资源使用
docker stats fastapi-backend-prod

# 数据库连接
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d laboratory -c "SELECT 1"

# Redis 连接
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping

# 磁盘空间
df -h

# 网络连接
netstat -tuln | grep 8000

# 进程信息
docker-compose -f docker-compose.prod.yml exec fastapi-backend ps aux
```

### 日志分析

```bash
# 查找错误
docker-compose -f docker-compose.prod.yml logs fastapi-backend | grep -i error

# 查找警告
docker-compose -f docker-compose.prod.yml logs fastapi-backend | grep -i warning

# 查找慢查询
docker-compose -f docker-compose.prod.yml logs fastapi-backend | grep "slow"

# 统计错误数量
docker-compose -f docker-compose.prod.yml logs fastapi-backend | grep -c "ERROR"

# 查看最近的 500 错误
docker-compose -f docker-compose.prod.yml logs fastapi-backend | grep "500"
```

### 性能分析

```bash
# API 响应时间
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8000/api/v1/samples

# 数据库查询时间
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d laboratory -c "
    SELECT query, calls, total_time, mean_time
    FROM pg_stat_statements
    ORDER BY total_time DESC
    LIMIT 10;
  "

# 缓存命中率
docker-compose -f docker-compose.prod.yml exec redis redis-cli info stats | grep hits
```

## 回滚流程

### 快速回滚

```bash
# 执行自动回滚
./scripts/rollback-production.sh

# 选择特定备份回滚
./scripts/rollback-production.sh --backup-file backups/backup_20260419.sql

# 列出可用备份
./scripts/rollback-production.sh --list-backups
```

### 手动回滚步骤

```bash
# 1. 停止服务
docker-compose -f docker-compose.prod.yml down

# 2. 恢复数据库
docker-compose -f docker-compose.prod.yml up -d postgres
sleep 10
docker exec -i postgres-prod psql -U postgres laboratory < backups/latest_backup.sql

# 3. 切换到旧版本
git checkout <previous-commit>
docker-compose -f docker-compose.prod.yml build

# 4. 启动服务
docker-compose -f docker-compose.prod.yml up -d

# 5. 验证
curl http://localhost:8000/health
```

### 回滚验证

```bash
# 检查服务状态
docker-compose -f docker-compose.prod.yml ps

# 检查健康状态
curl http://localhost:8000/health/detailed

# 测试核心功能
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# 检查数据完整性
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d laboratory -c "SELECT COUNT(*) FROM samples"
```

## 联系人信息

### 紧急联系人

| 角色 | 姓名 | 电话 | 邮箱 | 备注 |
|------|------|------|------|------|
| 应急指挥官 | | | | 24/7 |
| 技术负责人 | | | | 24/7 |
| 运维负责人 | | | | 24/7 |
| 开发负责人 | | | | 工作时间 |
| DBA | | | | 24/7 |

### 升级路径

1. **L1 - 运维工程师** (首次响应)
   - 响应时间: 5 分钟
   - 处理: 基础故障排查和修复

2. **L2 - 高级运维/开发** (升级)
   - 响应时间: 15 分钟
   - 处理: 复杂问题分析和修复

3. **L3 - 技术负责人** (再次升级)
   - 响应时间: 30 分钟
   - 处理: 架构级问题和决策

4. **L4 - 应急指挥官** (最高级别)
   - 响应时间: 立即
   - 处理: 重大事故协调和决策

### 外部支持

| 服务 | 联系方式 | 说明 |
|------|----------|------|
| 云服务商 | | 基础设施支持 |
| 数据库厂商 | | 数据库技术支持 |
| 安全团队 | | 安全事件响应 |
| 法务团队 | | 法律咨询 |

## 事后处理

### 事故报告

每次 P0/P1 故障后需要编写事故报告,包括:

1. **事故概述**
   - 发生时间
   - 持续时间
   - 影响范围
   - 严重程度

2. **根本原因分析**
   - 直接原因
   - 根本原因
   - 触发因素

3. **处理过程**
   - 发现时间
   - 响应时间
   - 处理步骤
   - 恢复时间

4. **影响评估**
   - 用户影响
   - 业务影响
   - 数据影响
   - 财务影响

5. **改进措施**
   - 短期措施
   - 长期措施
   - 预防措施
   - 监控改进

### 经验总结

- 定期回顾事故案例
- 更新应急响应流程
- 改进监控和告警
- 加强团队培训
- 优化系统架构

## 附录

### curl-format.txt

创建 `curl-format.txt` 文件用于测试响应时间:

```
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_appconnect:  %{time_appconnect}\n
time_pretransfer:  %{time_pretransfer}\n
time_redirect:  %{time_redirect}\n
time_starttransfer:  %{time_starttransfer}\n
----------\n
time_total:  %{time_total}\n
```

### 常用脚本

```bash
# 快速健康检查
#!/bin/bash
curl -f http://localhost:8000/health || echo "Health check failed!"

# 快速性能检查
#!/bin/bash
response_time=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:8000/health)
echo "Response time: ${response_time}s"

# 快速日志检查
#!/bin/bash
docker-compose -f docker-compose.prod.yml logs --tail=100 fastapi-backend | grep -i error
```
