# 监控和日志系统快速开始

## 快速启动

### 1. 启动监控服务

```bash
# Windows
docker-compose -f docker-compose.monitoring.yml up -d

# Linux/Mac
./scripts/start_monitoring.sh
```

### 2. 访问 Web 界面

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)
- **Alertmanager**: http://localhost:9093

### 3. 查看仪表板

1. 访问 Grafana: http://localhost:3000
2. 登录 (admin/admin)
3. 导航到 "Dashboards" → "Laboratory System"
4. 选择仪表板:
   - FastAPI 应用概览
   - 数据库监控
   - 系统资源监控

### 4. 运行测试

```bash
# 测试监控系统
python scripts/test_monitoring.py

# 测试日志系统
python scripts/test_logging.py
```

## 常用命令

### 查看服务状态

```bash
docker-compose -f docker-compose.monitoring.yml ps
```

### 查看日志

```bash
# 所有服务
docker-compose -f docker-compose.monitoring.yml logs -f

# 特定服务
docker-compose -f docker-compose.monitoring.yml logs -f prometheus
docker-compose -f docker-compose.monitoring.yml logs -f grafana
```

### 停止服务

```bash
# Windows
docker-compose -f docker-compose.monitoring.yml down

# Linux/Mac
./scripts/stop_monitoring.sh
```

### 重启服务

```bash
docker-compose -f docker-compose.monitoring.yml restart
```

## 常见问题

### Q: Grafana 无法连接 Prometheus？

**A**: 检查服务是否都在运行：
```bash
docker-compose -f docker-compose.monitoring.yml ps
```

### Q: 看不到日志？

**A**: 等待 10-15 秒让 Promtail 收集日志，然后在 Grafana Explore 中查询：
```logql
{job="fastapi-backend"}
```

### Q: 告警未触发？

**A**: 检查 Prometheus 告警规则：http://localhost:9090/alerts

## 更多信息

详细文档请参考: [docs/MONITORING_AND_LOGGING.md](docs/MONITORING_AND_LOGGING.md)
