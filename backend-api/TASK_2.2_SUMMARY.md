# 任务 2.2 完成总结: 定义 SQLAlchemy 数据模型

## 执行时间
2024年执行

## 任务目标
实现 FastAPI 后端的 SQLAlchemy 数据模型,与现有 Prisma Schema 完全兼容。

## 完成的工作

### 1. 基础模型类 (app/models/base.py)
- ✅ 创建 SQLAlchemy 声明式基类
- ✅ 提供所有模型的基础类

### 2. 样品模型 (app/models/sample.py)
- ✅ 定义 `SampleStatus` 枚举 (7 个状态值)
  - REGISTERED, IN_TESTING, TESTING_COMPLETE, IN_AUDIT, AUDIT_COMPLETE, RELEASED, ARCHIVED
- ✅ 定义 `Priority` 枚举 (4 个优先级)
  - LOW, NORMAL, HIGH, URGENT
- ✅ 定义 `Sample` 模型类,包含:
  - 主键和唯一标识符 (id, barcode, sample_number)
  - 客户信息 (client_name, client_contact)
  - 样品信息 (sample_name, sample_type, sample_category, quantity, unit)
  - 日期信息 (received_date, sampling_date, sampling_location, sampling_person)
  - 存储信息 (storage_location, storage_condition)
  - 状态和优先级 (status, priority)
  - 描述和备注 (description, remarks)
  - 版本控制 (version - 乐观锁)
  - 分样/合样关系 (parent_sample_id, merged_from_ids)
  - 工作流关系 (workflow_instance_id)
  - 审计字段 (created_by, created_at, updated_at, released_at, released_by)
- ✅ 定义适当的索引 (barcode, sample_number, client_name, status)
- ✅ 使用 snake_case 命名约定

### 3. 流转模型 (app/models/transfer.py)
- ✅ 定义 `TransferStatus` 枚举 (5 个状态值)
  - PENDING, IN_TRANSIT, RECEIVED, REJECTED, CANCELLED
- ✅ 定义 `Transfer` 模型类,包含:
  - 主键 (id)
  - 外键 (sample_id)
  - 位置信息 (from_location, to_location)
  - 人员信息 (from_person, to_person)
  - 日期信息 (transfer_date, received_date)
  - 状态 (status)
  - 备注 (remarks)
  - 确认标志 (sender_confirmed, receiver_confirmed)
  - 审计字段 (created_at)
- ✅ 定义适当的索引 (sample_id, transfer_date)
- ✅ 使用 snake_case 命名约定

### 4. 模块导出 (app/models/__init__.py)
- ✅ 导出所有模型类和枚举
- ✅ 定义 `__all__` 列表
- ✅ 提供清晰的模块文档

## 技术规范

### 与 Prisma Schema 的兼容性
| 特性 | Prisma | SQLAlchemy | 状态 |
|------|--------|------------|------|
| 表名 | samples | samples | ✅ 一致 |
| 字段命名 | snake_case | snake_case | ✅ 一致 |
| 枚举类型 | SampleStatus | SampleStatus | ✅ 一致 |
| 数组字段 | String[] | ARRAY(String) | ✅ 兼容 |
| 时间戳 | DateTime | DateTime | ✅ 兼容 |
| 默认值 | @default() | default= | ✅ 兼容 |
| 索引 | @@index | index=True | ✅ 兼容 |

### 字段类型映射
| Prisma 类型 | SQLAlchemy 类型 | 示例字段 |
|------------|----------------|---------|
| String | String | barcode, client_name |
| String(n) | String(n) | client_name(200) |
| Float | Float | quantity |
| Int | Integer | version |
| Boolean | Boolean | sender_confirmed |
| DateTime | DateTime | created_at |
| Enum | SQLEnum | status, priority |
| String[] | ARRAY(String) | merged_from_ids |

### 关键设计决策

1. **使用 snake_case 命名**
   - 与 Prisma Schema 保持一致
   - 符合 Python 命名规范
   - 便于前后端数据交换

2. **枚举类型继承 str**
   - 便于 JSON 序列化
   - 与 Pydantic 模型兼容
   - 提供更好的类型提示

3. **UUID 主键**
   - 使用字符串类型存储 UUID
   - 通过 lambda 函数生成默认值
   - 与 Prisma 的 @default(uuid()) 兼容

4. **时间戳自动管理**
   - created_at: server_default=func.now()
   - updated_at: server_default=func.now(), onupdate=func.now()
   - 确保数据库层面的一致性

5. **乐观锁版本控制**
   - version 字段用于并发控制
   - 防止并发更新冲突
   - 符合需求 13.3

6. **索引优化**
   - 主要查询字段添加索引
   - barcode, sample_number: 唯一索引
   - client_name, status: 普通索引
   - 提升查询性能

## 验证需求覆盖

### 需求 2.2: 数据库集成
- ✅ 2.2.1: 使用 SQLAlchemy ORM
- ✅ 2.2.2: 与 Prisma Schema 兼容的数据模型
- ✅ 2.2.6: 使用相同的表结构和字段命名

### 需求 2.6: 数据模型映射
- ✅ 所有字段类型正确映射
- ✅ 枚举类型定义完整
- ✅ 索引和约束正确定义

## 文件清单

```
fastapi-backend/app/models/
├── __init__.py          # 模块导出 (18 行)
├── base.py              # 基础模型类 (11 行)
├── sample.py            # 样品模型 (117 行)
└── transfer.py          # 流转模型 (75 行)
```

## 代码统计
- 总行数: ~221 行
- 模型类: 2 个 (Sample, Transfer)
- 枚举类: 3 个 (SampleStatus, Priority, TransferStatus)
- 字段总数: 35+ 个

## 下一步工作
根据任务列表,下一步应该是:
- 任务 2.4: 实现 Pydantic Schema 模型
- 任务 2.5: 实现数据访问层 (Repository)
- 任务 2.6: 实现业务逻辑层 (Service)

## 注意事项
1. 模型定义完成后,需要通过 Alembic 生成数据库迁移
2. 实际使用前需要安装所有依赖 (requirements.txt)
3. 需要配置数据库连接字符串
4. 建议编写单元测试验证模型定义的正确性

## 技术债务
- [ ] 可选: 添加关系映射 (relationship) 用于预加载
- [ ] 可选: 添加自定义验证器
- [ ] 可选: 添加模型方法 (如 to_dict())
