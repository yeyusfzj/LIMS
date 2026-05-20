# 数据库迁移脚本

本目录包含数据库迁移管理的所有脚本。

## 脚本列表

### 1. verify_migration_setup.py
验证迁移设置是否正确。

```bash
python scripts/verify_migration_setup.py
```

### 2. create_initial_migration.py
创建初始迁移（仅首次使用）。

```bash
python scripts/create_initial_migration.py
```

### 3. db_migration.py
主迁移管理工具。

```bash
# 创建迁移
python scripts/db_migration.py create "描述"

# 升级数据库
python scripts/db_migration.py upgrade

# 降级数据库
python scripts/db_migration.py downgrade -1

# 查看状态
python scripts/db_migration.py current
python scripts/db_migration.py history
```

### 4. test_migration.py
测试迁移的正确性。

```bash
python scripts/test_migration.py
```

### 5. rollback_migration.py
安全回滚迁移。

```bash
# 回滚一个版本
python scripts/rollback_migration.py -1

# 从备份恢复
python scripts/rollback_migration.py restore <backup_id>
```

## 快速开始

### 首次设置

```bash
# 1. 验证设置
python scripts/verify_migration_setup.py

# 2. 初始化迁移
python scripts/create_initial_migration.py

# 3. 测试
python scripts/test_migration.py
```

### 日常使用

```bash
# 1. 修改模型后创建迁移
python scripts/db_migration.py create "添加新字段"

# 2. 应用迁移
python scripts/db_migration.py upgrade

# 3. 测试
python scripts/test_migration.py
```

## 文档

详细文档请参考:
- [DATABASE_MIGRATION_GUIDE.md](../docs/DATABASE_MIGRATION_GUIDE.md) - 详细指南
- [MIGRATION_QUICK_REFERENCE.md](../docs/MIGRATION_QUICK_REFERENCE.md) - 快速参考

## 注意事项

⚠️ **重要**:
1. 生产环境操作前必须备份
2. 测试环境充分测试后再部署生产
3. 审查自动生成的迁移脚本
4. 确保 downgrade() 函数正确实现

## 帮助

```bash
python scripts/db_migration.py --help
python scripts/rollback_migration.py --help
```
