# 数据库迁移快速参考

## 常用命令速查表

### 初始化

```bash
# 创建初始迁移（仅首次）
python scripts/create_initial_migration.py
```

### 创建迁移

```bash
# 自动生成迁移
python scripts/db_migration.py create "描述"

# 手动创建空迁移
python scripts/db_migration.py create "描述" --no-autogenerate

# 创建前备份
python scripts/db_migration.py create "描述" --backup
```

### 应用迁移

```bash
# 升级到最新版本
python scripts/db_migration.py upgrade

# 升级到指定版本
python scripts/db_migration.py upgrade <version>

# 升级前备份
python scripts/db_migration.py upgrade --backup
```

### 回滚迁移

```bash
# 回退一个版本
python scripts/rollback_migration.py -1

# 回退到指定版本
python scripts/rollback_migration.py <version>

# 不创建备份（不推荐）
python scripts/rollback_migration.py -1 --no-backup
```

### 查看状态

```bash
# 当前版本
python scripts/db_migration.py current

# 迁移历史
python scripts/db_migration.py history

# 详细历史
python scripts/db_migration.py history -v

# 头版本
python scripts/db_migration.py heads
```

### 测试迁移

```bash
# 运行所有测试
python scripts/test_migration.py
```

### 备份恢复

```bash
# 从备份恢复
python scripts/rollback_migration.py restore <backup_id>
```

### 标记版本

```bash
# 标记为最新版本
python scripts/db_migration.py stamp head

# 标记为指定版本
python scripts/db_migration.py stamp <version>
```

## 典型工作流

### 开发环境

```bash
# 1. 修改 SQLAlchemy 模型
# 2. 创建迁移
python scripts/db_migration.py create "添加用户头像字段"

# 3. 审查生成的迁移脚本
# 4. 应用迁移
python scripts/db_migration.py upgrade

# 5. 测试
python scripts/test_migration.py

# 6. 提交代码
git add alembic/versions/*.py
git commit -m "Add migration: 添加用户头像字段"
```

### 测试环境

```bash
# 1. 拉取最新代码
git pull

# 2. 检查新迁移
python scripts/db_migration.py history

# 3. 备份并应用
python scripts/db_migration.py upgrade --backup

# 4. 测试
python scripts/test_migration.py

# 5. 测试应用功能
```

### 生产环境

```bash
# 1. 创建完整备份
# 使用备份服务或数据库工具

# 2. 启用维护模式（可选）

# 3. 应用迁移
python scripts/db_migration.py upgrade --backup

# 4. 验证
python scripts/test_migration.py

# 5. 监控应用

# 6. 如有问题，立即回滚
python scripts/rollback_migration.py -1
```

## 故障处理速查

### 迁移失败

```bash
# 1. 查看错误
python scripts/db_migration.py current

# 2. 回滚
python scripts/rollback_migration.py -1

# 3. 修复问题后重试
python scripts/db_migration.py upgrade
```

### 版本不一致

```bash
# 1. 检查当前状态
python scripts/db_migration.py current
python scripts/db_migration.py history

# 2. 重新标记
python scripts/db_migration.py stamp <correct_version>
```

### 需要恢复备份

```bash
# 1. 查找备份 ID
# 从备份服务或日志中获取

# 2. 恢复
python scripts/rollback_migration.py restore <backup_id>
```

## 环境变量

确保设置正确的数据库连接：

```bash
# .env 文件
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/dbname
```

## 注意事项

⚠️ **重要提示**:

1. **生产环境操作前必须备份**
2. **测试环境充分测试后再部署生产**
3. **团队协作时注意迁移冲突**
4. **审查自动生成的迁移脚本**
5. **确保 downgrade() 函数正确实现**

## 帮助信息

```bash
# 查看命令帮助
python scripts/db_migration.py --help
python scripts/rollback_migration.py --help
python scripts/test_migration.py --help
```

## 更多信息

详细文档请参考: [DATABASE_MIGRATION_GUIDE.md](./DATABASE_MIGRATION_GUIDE.md)
