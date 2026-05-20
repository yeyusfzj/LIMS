# 数据库迁移指南

本文档介绍如何使用 Alembic 进行数据库迁移管理。

## 目录

- [概述](#概述)
- [迁移工具](#迁移工具)
- [常用操作](#常用操作)
- [最佳实践](#最佳实践)
- [故障排查](#故障排查)

## 概述

FastAPI 后端使用 Alembic 进行数据库版本管理。Alembic 是 SQLAlchemy 的数据库迁移工具，支持：

- 自动生成迁移脚本（基于模型变更）
- 版本控制和历史追踪
- 升级和降级操作
- 多环境支持

### 与 Prisma 的兼容性

由于 FastAPI 后端与 Node.js 后端共享同一个 PostgreSQL 数据库，数据库结构由 Prisma 管理。因此：

1. **初始状态**：数据库已由 Prisma 创建，包含所有表和索引
2. **迁移策略**：Alembic 用于管理 FastAPI 后端的增量变更
3. **兼容性**：确保 SQLAlchemy 模型与 Prisma schema 保持一致

## 迁移工具

项目提供了三个主要的迁移管理脚本：

### 1. db_migration.py - 迁移管理工具

用于创建、应用和管理数据库迁移。

**位置**: `scripts/db_migration.py`

**功能**:
- 创建新迁移
- 升级数据库
- 降级数据库
- 查看迁移历史
- 查看当前版本

### 2. test_migration.py - 迁移测试工具

用于测试迁移的正确性和完整性。

**位置**: `scripts/test_migration.py`

**功能**:
- 测试数据库连接
- 检查表结构
- 检查索引
- 检查外键约束
- 测试升级降级
- 测试数据完整性

### 3. rollback_migration.py - 迁移回滚工具

用于安全地回滚数据库迁移。

**位置**: `scripts/rollback_migration.py`

**功能**:
- 自动备份
- 安全回滚
- 回滚验证
- 备份恢复

## 常用操作

### 初始化迁移

如果数据库已由 Prisma 创建，需要创建初始迁移并标记当前状态：

```bash
# 创建初始迁移
python scripts/create_initial_migration.py
```

这将：
1. 检查数据库状态
2. 创建空的初始迁移
3. 标记数据库版本为 head

### 创建新迁移

当 SQLAlchemy 模型发生变更时，创建新的迁移：

```bash
# 自动检测模型变更并创建迁移
python scripts/db_migration.py create "添加新字段"

# 创建空迁移（手动编写）
python scripts/db_migration.py create "手动迁移" --no-autogenerate

# 创建迁移前先备份数据库
python scripts/db_migration.py create "重要变更" --backup
```

### 应用迁移

将数据库升级到最新版本：

```bash
# 升级到最新版本
python scripts/db_migration.py upgrade

# 升级到指定版本
python scripts/db_migration.py upgrade abc123

# 升级前先备份
python scripts/db_migration.py upgrade --backup
```

### 回滚迁移

回退到之前的版本：

```bash
# 回退一个版本（带备份）
python scripts/rollback_migration.py -1

# 回退到指定版本（带备份）
python scripts/rollback_migration.py abc123

# 回退一个版本（不备份，不推荐）
python scripts/rollback_migration.py -1 --no-backup

# 自动确认（用于脚本）
python scripts/rollback_migration.py -1 --auto
```

### 查看迁移状态

```bash
# 查看当前版本
python scripts/db_migration.py current

# 查看迁移历史
python scripts/db_migration.py history

# 查看详细历史
python scripts/db_migration.py history -v

# 查看所有头版本
python scripts/db_migration.py heads
```

### 测试迁移

在应用迁移前，建议先测试：

```bash
# 运行所有迁移测试
python scripts/test_migration.py
```

测试包括：
- 数据库连接测试
- 表结构检查
- 索引检查
- 外键约束检查
- 升级降级测试
- 数据完整性测试

### 标记版本

在某些情况下，需要手动标记数据库版本（不执行迁移）：

```bash
# 标记为最新版本
python scripts/db_migration.py stamp head

# 标记为指定版本
python scripts/db_migration.py stamp abc123
```

## 最佳实践

### 1. 迁移前备份

在执行重要迁移前，始终创建备份：

```bash
# 方式 1: 使用迁移工具的备份选项
python scripts/db_migration.py upgrade --backup

# 方式 2: 手动创建备份
python scripts/rollback_migration.py current  # 查看当前版本
# 然后使用备份服务创建备份
```

### 2. 测试迁移

在生产环境应用迁移前，在测试环境充分测试：

```bash
# 1. 在测试环境应用迁移
python scripts/db_migration.py upgrade

# 2. 运行迁移测试
python scripts/test_migration.py

# 3. 测试应用功能

# 4. 测试回滚
python scripts/rollback_migration.py -1

# 5. 再次升级
python scripts/db_migration.py upgrade
```

### 3. 版本控制

将迁移脚本纳入版本控制：

```bash
# 添加迁移文件到 Git
git add alembic/versions/*.py
git commit -m "Add migration: 添加新字段"
```

### 4. 团队协作

在团队环境中：

1. **拉取最新代码后**，检查是否有新的迁移：
   ```bash
   python scripts/db_migration.py history
   ```

2. **应用新迁移**：
   ```bash
   python scripts/db_migration.py upgrade
   ```

3. **创建新迁移前**，确保本地数据库是最新的：
   ```bash
   python scripts/db_migration.py current
   python scripts/db_migration.py upgrade
   ```

### 5. 迁移脚本审查

创建迁移后，审查生成的脚本：

1. 检查 `upgrade()` 函数的操作是否正确
2. 检查 `downgrade()` 函数是否能正确回滚
3. 确保没有遗漏的变更
4. 确保没有不必要的变更

### 6. 数据迁移

如果迁移涉及数据转换，在迁移脚本中添加数据迁移逻辑：

```python
def upgrade():
    # 结构变更
    op.add_column('users', sa.Column('full_name', sa.String(200)))
    
    # 数据迁移
    connection = op.get_bind()
    connection.execute(
        text("UPDATE users SET full_name = first_name || ' ' || last_name")
    )
    
    # 删除旧列
    op.drop_column('users', 'first_name')
    op.drop_column('users', 'last_name')
```

### 7. 生产环境部署

在生产环境部署迁移：

1. **创建备份**：
   ```bash
   python scripts/rollback_migration.py current
   # 使用备份服务创建完整备份
   ```

2. **维护模式**（可选）：
   - 如果迁移可能影响服务，启用维护模式

3. **应用迁移**：
   ```bash
   python scripts/db_migration.py upgrade --backup
   ```

4. **验证**：
   ```bash
   python scripts/test_migration.py
   ```

5. **监控**：
   - 监控应用日志
   - 监控数据库性能
   - 监控错误率

6. **回滚计划**：
   - 如果出现问题，立即回滚：
     ```bash
     python scripts/rollback_migration.py -1
     ```

## 故障排查

### 问题 1: 迁移失败

**症状**: 执行 `upgrade` 时报错

**解决方案**:

1. 查看错误信息，确定失败原因
2. 检查数据库连接
3. 检查迁移脚本语法
4. 如果是数据问题，修复数据后重试
5. 如果无法修复，回滚到之前的版本：
   ```bash
   python scripts/rollback_migration.py -1
   ```

### 问题 2: 版本不一致

**症状**: `alembic_version` 表中的版本与实际数据库结构不一致

**解决方案**:

1. 检查当前版本：
   ```bash
   python scripts/db_migration.py current
   ```

2. 检查迁移历史：
   ```bash
   python scripts/db_migration.py history
   ```

3. 如果版本标记错误，重新标记：
   ```bash
   python scripts/db_migration.py stamp <correct_version>
   ```

### 问题 3: 自动生成的迁移不正确

**症状**: `autogenerate` 生成了不需要的变更

**解决方案**:

1. 检查 SQLAlchemy 模型是否与 Prisma schema 一致
2. 检查模型的 `__tablename__` 是否正确
3. 检查字段类型映射是否正确
4. 手动编辑迁移脚本，删除不需要的变更
5. 或者创建空迁移，手动编写：
   ```bash
   python scripts/db_migration.py create "手动迁移" --no-autogenerate
   ```

### 问题 4: 回滚失败

**症状**: 执行 `downgrade` 时报错

**解决方案**:

1. 检查 `downgrade()` 函数是否正确实现
2. 如果回滚脚本有问题，从备份恢复：
   ```bash
   python scripts/rollback_migration.py restore <backup_id>
   ```

### 问题 5: 多个头版本

**症状**: 出现多个头版本（分支）

**解决方案**:

1. 查看所有头版本：
   ```bash
   python scripts/db_migration.py heads
   ```

2. 创建合并迁移：
   ```bash
   alembic merge -m "merge branches" <rev1> <rev2>
   ```

### 问题 6: 与 Prisma 冲突

**症状**: Alembic 迁移与 Prisma 迁移冲突

**解决方案**:

1. 确保 SQLAlchemy 模型与 Prisma schema 完全一致
2. 如果 Prisma 已经应用了变更，在 Alembic 中标记相应版本：
   ```bash
   python scripts/db_migration.py stamp head
   ```
3. 避免同时使用 Prisma 和 Alembic 修改数据库结构

## 高级用法

### 离线模式

生成 SQL 脚本而不直接执行：

```bash
# 生成升级 SQL
alembic upgrade head --sql > upgrade.sql

# 生成降级 SQL
alembic downgrade -1 --sql > downgrade.sql
```

### 多数据库支持

如果需要支持多个数据库：

1. 修改 `alembic.ini`，添加多个数据库配置
2. 在 `env.py` 中实现多数据库逻辑
3. 使用 `--name` 参数指定数据库

### 自定义迁移模板

修改 `alembic/script.py.mako` 自定义迁移脚本模板。

## 参考资料

- [Alembic 官方文档](https://alembic.sqlalchemy.org/)
- [SQLAlchemy 文档](https://docs.sqlalchemy.org/)
- [Prisma 文档](https://www.prisma.io/docs/)

## 联系支持

如有问题，请联系开发团队或查看项目文档。
