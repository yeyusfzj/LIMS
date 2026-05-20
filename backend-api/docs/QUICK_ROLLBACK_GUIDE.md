# 快速回滚指南

当生产环境部署出现严重问题时，使用本指南快速回滚到上一个稳定版本。

## 🚨 何时需要回滚

立即回滚的情况：

- ✗ 服务完全不可用（健康检查失败）
- ✗ 数据库迁移失败导致数据损坏
- ✗ 严重的安全漏洞被发现
- ✗ 核心功能完全失效
- ✗ 性能严重下降（响应时间 > 5 秒）
- ✗ 错误率超过 50%

考虑回滚的情况：

- ⚠ 部分功能异常
- ⚠ 性能下降明显（响应时间 > 2 秒）
- ⚠ 错误率超过 10%
- ⚠ 用户投诉增加
- ⚠ 监控告警频繁触发

## ⚡ 快速回滚步骤

### 方法 1: 使用自动化回滚脚本（推荐）

#### Linux/macOS

```bash
cd fastapi-backend
./scripts/rollback-production.sh
```

#### Windows PowerShell

```powershell
cd fastapi-backend
.\scripts\rollback-production.ps1
```

**预计时间**: 2-5 分钟

### 方法 2: 手动快速回滚

如果自动化脚本不可用，按以下步骤手动回滚：

#### 步骤 1: 停止当前服务（30 秒）

```bash
cd fastapi-backend
docker-compose -f docker-compose.prod.yml down
```

#### 步骤 2: 恢复 Docker 镜像（30 秒）

```bash
# 删除当前镜像
docker rmi fastapi-backend-prod:latest

# 恢复备份镜像
docker tag fastapi-backend-prod:backup fastapi-backend-prod:latest
```

#### 步骤 3: 恢复数据库（1-3 分钟）

```bash
# 启动数据库
docker-compose -f docker-compose.prod.yml up -d postgres

# 等待数据库就绪
sleep 10

# 恢复最新备份
LATEST_BACKUP=$(ls -t backups/*.sql | head -1)
docker exec -i postgres-prod psql -U postgres laboratory < $LATEST_BACKUP
```

#### 步骤 4: 启动服务（30 秒）

```bash
docker-compose -f docker-compose.prod.yml up -d
```

#### 步骤 5: 验证服务（30 秒）

```bash
# 等待服务就绪
sleep 30

# 检查健康状态
curl http://localhost:8000/health
```

**总预计时间**: 3-5 分钟

## 🔍 回滚后验证

### 1. 健康检查

```bash
# 基本健康检查
curl http://localhost:8000/health

# 详细健康检查
curl http://localhost:8000/health/detailed
```

**预期结果**:
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2026-04-11T10:30:00Z"
}
```

### 2. 功能验证

```bash
# 测试登录
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# 测试样品列表
curl http://localhost:8000/api/v1/samples \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. 性能检查

```bash
# 检查响应时间
time curl http://localhost:8000/health

# 检查监控指标
curl http://localhost:8000/metrics | grep http_request_duration
```

### 4. 错误率检查

```bash
# 查看错误日志
docker-compose -f docker-compose.prod.yml logs --tail=100 fastapi-backend | grep ERROR

# 查看错误统计
curl http://localhost:8000/metrics | grep http_requests_total | grep 5
```

## 📋 回滚检查清单

完成回滚后，请检查以下项目：

- [ ] 服务已启动
- [ ] 健康检查通过
- [ ] 数据库连接正常
- [ ] Redis 连接正常
- [ ] 登录功能正常
- [ ] 核心 API 正常
- [ ] 响应时间正常（< 200ms）
- [ ] 错误率正常（< 1%）
- [ ] 监控指标正常
- [ ] 用户可以正常访问

## 📝 回滚后操作

### 1. 记录回滚信息

```bash
# 记录回滚日志
echo "[$(date)] 回滚完成 - 原因: [填写原因]" >> logs/rollback.log

# 记录回滚版本
git log -1 --oneline >> logs/rollback.log
```

### 2. 通知相关人员

- 通知开发团队
- 通知运维团队
- 通知项目经理
- 通知用户（如需要）

### 3. 分析问题原因

- 收集错误日志
- 分析监控数据
- 复现问题
- 确定根本原因

### 4. 制定修复计划

- 确定修复方案
- 评估修复时间
- 制定测试计划
- 安排下次部署

## 🔧 常见回滚问题

### 问题 1: 备份镜像不存在

**症状**: `docker tag` 命令失败，提示镜像不存在

**解决方案**:

```bash
# 方法 1: 从备份文件恢复镜像
docker load < fastapi-backend-prod_YYYYMMDD_HHMMSS.tar.gz

# 方法 2: 从 Git 重新构建
git checkout <previous-commit>
docker-compose -f docker-compose.prod.yml build
```

### 问题 2: 数据库备份不存在

**症状**: 找不到数据库备份文件

**解决方案**:

```bash
# 检查备份目录
ls -lh backups/

# 如果没有备份，尝试从数据库恢复点恢复
# 或联系数据库管理员
```

### 问题 3: 回滚后服务仍然异常

**症状**: 回滚完成但服务仍然不正常

**排查步骤**:

```bash
# 1. 查看详细日志
docker-compose -f docker-compose.prod.yml logs --tail=200 fastapi-backend

# 2. 检查依赖服务
docker-compose -f docker-compose.prod.yml ps

# 3. 检查网络连接
docker network inspect lab-network

# 4. 检查资源使用
docker stats
```

### 问题 4: 数据库恢复失败

**症状**: 数据库恢复命令失败

**解决方案**:

```bash
# 1. 检查备份文件完整性
file backups/backup_YYYYMMDD_HHMMSS.sql

# 2. 尝试手动恢复
docker exec -it postgres-prod bash
psql -U postgres laboratory < /backups/backup_YYYYMMDD_HHMMSS.sql

# 3. 如果仍然失败，联系数据库管理员
```

## 🆘 紧急联系

如果回滚过程中遇到问题，请立即联系：

### 技术支持

- **邮箱**: support@yourdomain.com
- **电话**: +86-xxx-xxxx-xxxx
- **Slack**: #ops-emergency

### 运维团队

- **邮箱**: ops@yourdomain.com
- **电话**: +86-xxx-xxxx-xxxx
- **值班人员**: [查看值班表]

### 数据库管理员

- **邮箱**: dba@yourdomain.com
- **电话**: +86-xxx-xxxx-xxxx

## 📚 相关文档

- [生产环境部署指南](PRODUCTION_DEPLOYMENT_GUIDE.md)
- [部署前检查清单](PRE_DEPLOYMENT_CHECKLIST.md)
- [故障排查指南](PRODUCTION_DEPLOYMENT_GUIDE.md#故障排查)
- [监控和告警](PRODUCTION_DEPLOYMENT_GUIDE.md#监控和告警)

## 📊 回滚统计

记录每次回滚的信息，用于改进部署流程：

| 日期 | 版本 | 原因 | 回滚时间 | 影响范围 | 负责人 |
|------|------|------|----------|----------|--------|
| | | | | | |

## 💡 预防措施

为了减少回滚的需要，建议：

1. **充分测试**: 在测试环境充分测试后再部署
2. **灰度发布**: 使用灰度发布逐步切换流量
3. **监控告警**: 及时发现和处理问题
4. **自动化测试**: 增加自动化测试覆盖率
5. **代码审查**: 严格执行代码审查流程
6. **性能测试**: 部署前进行性能测试
7. **安全扫描**: 部署前进行安全扫描
8. **文档完善**: 保持文档更新和完善

## ✅ 回滚完成确认

回滚完成后，请填写以下信息：

- **回滚时间**: _______________
- **回滚版本**: _______________
- **回滚原因**: _______________
- **影响时长**: _______________
- **执行人员**: _______________
- **验证人员**: _______________
- **确认签名**: _______________

---

**注意**: 本指南仅用于紧急情况下的快速回滚。回滚完成后，请务必分析问题原因并制定修复计划。
