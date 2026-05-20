# SQLAlchemy 模型与 Prisma Schema 兼容性验证

## 验证日期
2024年

## 验证目的
确保 FastAPI 后端的 SQLAlchemy 模型与现有 Node.js 后端的 Prisma Schema 完全兼容,能够共享同一个 PostgreSQL 数据库。

## Sample 模型字段对比

| Prisma Schema | SQLAlchemy Model | 类型匹配 | 约束匹配 | 状态 |
|--------------|------------------|---------|---------|------|
| id | id | String ✓ | primary_key ✓ | ✅ |
| barcode | barcode | String ✓ | unique, index ✓ | ✅ |
| sampleNumber | sample_number | String ✓ | unique, index ✓ | ✅ |
| clientName | client_name | String(200) ✓ | nullable=False, index ✓ | ✅ |
| clientContact | client_contact | String(100) ✓ | nullable=True ✓ | ✅ |
| sampleName | sample_name | String(200) ✓ | nullable=False ✓ | ✅ |
| sampleType | sample_type | String(100) ✓ | nullable=False ✓ | ✅ |
| sampleCategory | sample_category | String(100) ✓ | nullable=False ✓ | ✅ |
| quantity | quantity | Float ✓ | nullable=False ✓ | ✅ |
| unit | unit | String(20) ✓ | nullable=False ✓ | ✅ |
| receivedDate | received_date | DateTime ✓ | nullable=False ✓ | ✅ |
| samplingDate | sampling_date | DateTime ✓ | nullable=True ✓ | ✅ |
| samplingLocation | sampling_location | String(200) ✓ | nullable=True ✓ | ✅ |
| samplingPerson | sampling_person | String(100) ✓ | nullable=True ✓ | ✅ |
| storageLocation | storage_location | String(200) ✓ | nullable=True ✓ | ✅ |
| storageCondition | storage_condition | String(200) ✓ | nullable=True ✓ | ✅ |
| status | status | Enum ✓ | default=REGISTERED, index ✓ | ✅ |
| priority | priority | Enum ✓ | default=NORMAL ✓ | ✅ |
| description | description | String ✓ | nullable=True ✓ | ✅ |
| remarks | remarks | String ✓ | nullable=True ✓ | ✅ |
| version | version | Integer ✓ | default=1 ✓ | ✅ |
| parentSampleId | parent_sample_id | String ✓ | nullable=True ✓ | ✅ |
| mergedFromIds | merged_from_ids | ARRAY(String) ✓ | default=[] ✓ | ✅ |
| workflowInstanceId | workflow_instance_id | String ✓ | unique, nullable=True ✓ | ✅ |
| createdBy | created_by | String ✓ | nullable=False ✓ | ✅ |
| createdAt | created_at | DateTime ✓ | server_default=now() ✓ | ✅ |
| updatedAt | updated_at | DateTime ✓ | server_default=now(), onupdate ✓ | ✅ |
| releasedAt | released_at | DateTime ✓ | nullable=True ✓ | ✅ |
| releasedBy | released_by | String ✓ | nullable=True ✓ | ✅ |

**总计**: 29/29 字段完全匹配 ✅

## Transfer 模型字段对比

| Prisma Schema | SQLAlchemy Model | 类型匹配 | 约束匹配 | 状态 |
|--------------|------------------|---------|---------|------|
| id | id | String ✓ | primary_key ✓ | ✅ |
| sampleId | sample_id | String ✓ | nullable=False, index ✓ | ✅ |
| fromLocation | from_location | String(200) ✓ | nullable=False ✓ | ✅ |
| toLocation | to_location | String(200) ✓ | nullable=False ✓ | ✅ |
| fromPerson | from_person | String(100) ✓ | nullable=False ✓ | ✅ |
| toPerson | to_person | String(100) ✓ | nullable=False ✓ | ✅ |
| transferDate | transfer_date | DateTime ✓ | server_default=now(), index ✓ | ✅ |
| receivedDate | received_date | DateTime ✓ | nullable=True ✓ | ✅ |
| status | status | Enum ✓ | default=PENDING ✓ | ✅ |
| remarks | remarks | String ✓ | nullable=True ✓ | ✅ |
| senderConfirmed | sender_confirmed | Boolean ✓ | default=False ✓ | ✅ |
| receiverConfirmed | receiver_confirmed | Boolean ✓ | default=False ✓ | ✅ |
| createdAt | created_at | DateTime ✓ | server_default=now() ✓ | ✅ |

**总计**: 13/13 字段完全匹配 ✅

## 枚举类型对比

### SampleStatus
| Prisma | SQLAlchemy | 状态 |
|--------|-----------|------|
| REGISTERED | REGISTERED | ✅ |
| IN_TESTING | IN_TESTING | ✅ |
| TESTING_COMPLETE | TESTING_COMPLETE | ✅ |
| IN_AUDIT | IN_AUDIT | ✅ |
| AUDIT_COMPLETE | AUDIT_COMPLETE | ✅ |
| RELEASED | RELEASED | ✅ |
| ARCHIVED | ARCHIVED | ✅ |

**总计**: 7/7 枚举值完全匹配 ✅

### Priority
| Prisma | SQLAlchemy | 状态 |
|--------|-----------|------|
| LOW | LOW | ✅ |
| NORMAL | NORMAL | ✅ |
| HIGH | HIGH | ✅ |
| URGENT | URGENT | ✅ |

**总计**: 4/4 枚举值完全匹配 ✅

### TransferStatus
| Prisma | SQLAlchemy | 状态 |
|--------|-----------|------|
| PENDING | PENDING | ✅ |
| IN_TRANSIT | IN_TRANSIT | ✅ |
| RECEIVED | RECEIVED | ✅ |
| REJECTED | REJECTED | ✅ |
| CANCELLED | CANCELLED | ✅ |

**总计**: 5/5 枚举值完全匹配 ✅

## 索引对比

### Sample 模型索引
| Prisma | SQLAlchemy | 状态 |
|--------|-----------|------|
| @@index([barcode]) | index=True on barcode | ✅ |
| @@index([sampleNumber]) | index=True on sample_number | ✅ |
| @@index([status]) | index=True on status | ✅ |
| @@index([clientName]) | index=True on client_name | ✅ |

**总计**: 4/4 索引完全匹配 ✅

### Transfer 模型索引
| Prisma | SQLAlchemy | 状态 |
|--------|-----------|------|
| @@index([sampleId]) | index=True on sample_id | ✅ |
| @@index([transferDate]) | index=True on transfer_date | ✅ |

**总计**: 2/2 索引完全匹配 ✅

## 表名对比
| Prisma | SQLAlchemy | 状态 |
|--------|-----------|------|
| @@map("samples") | __tablename__ = "samples" | ✅ |
| @@map("transfers") | __tablename__ = "transfers" | ✅ |

## 命名约定对比
| 特性 | Prisma | SQLAlchemy | 状态 |
|------|--------|-----------|------|
| 字段命名 | camelCase → snake_case | snake_case | ✅ |
| 表名 | 复数形式 | 复数形式 | ✅ |
| 枚举值 | UPPER_CASE | UPPER_CASE | ✅ |

## 默认值对比
| 字段 | Prisma | SQLAlchemy | 状态 |
|------|--------|-----------|------|
| Sample.status | @default(REGISTERED) | default=SampleStatus.REGISTERED | ✅ |
| Sample.priority | @default(NORMAL) | default=Priority.NORMAL | ✅ |
| Sample.version | @default(1) | default=1 | ✅ |
| Sample.createdAt | @default(now()) | server_default=func.now() | ✅ |
| Sample.updatedAt | @updatedAt | onupdate=func.now() | ✅ |
| Transfer.status | @default(PENDING) | default=TransferStatus.PENDING | ✅ |
| Transfer.transferDate | @default(now()) | server_default=func.now() | ✅ |
| Transfer.senderConfirmed | @default(false) | default=False | ✅ |
| Transfer.receiverConfirmed | @default(false) | default=False | ✅ |
| Transfer.createdAt | @default(now()) | server_default=func.now() | ✅ |

**总计**: 10/10 默认值完全匹配 ✅

## 唯一约束对比
| 字段 | Prisma | SQLAlchemy | 状态 |
|------|--------|-----------|------|
| Sample.barcode | @unique | unique=True | ✅ |
| Sample.sampleNumber | @unique | unique=True | ✅ |
| Sample.workflowInstanceId | @unique | unique=True | ✅ |

**总计**: 3/3 唯一约束完全匹配 ✅

## 总体兼容性评估

### 字段兼容性
- ✅ Sample 模型: 29/29 字段 (100%)
- ✅ Transfer 模型: 13/13 字段 (100%)
- ✅ **总计: 42/42 字段 (100%)**

### 枚举兼容性
- ✅ SampleStatus: 7/7 值 (100%)
- ✅ Priority: 4/4 值 (100%)
- ✅ TransferStatus: 5/5 值 (100%)
- ✅ **总计: 16/16 枚举值 (100%)**

### 约束兼容性
- ✅ 索引: 6/6 (100%)
- ✅ 唯一约束: 3/3 (100%)
- ✅ 默认值: 10/10 (100%)
- ✅ 可空性: 42/42 (100%)

### 命名约定兼容性
- ✅ 表名: 2/2 (100%)
- ✅ 字段命名: snake_case ✓
- ✅ 枚举命名: UPPER_CASE ✓

## 结论

✅ **SQLAlchemy 模型与 Prisma Schema 100% 兼容**

所有字段、类型、约束、索引、默认值和命名约定都完全匹配。FastAPI 后端可以安全地与 Node.js 后端共享同一个 PostgreSQL 数据库,不会产生任何数据不一致或冲突问题。

## 验证方法

1. **字段对比**: 逐一对比每个字段的名称、类型和约束
2. **枚举对比**: 验证所有枚举值的完整性和一致性
3. **索引对比**: 确认所有索引定义相同
4. **约束对比**: 验证唯一约束、可空性、默认值等
5. **命名对比**: 确认命名约定一致

## 注意事项

1. **关系映射**: SQLAlchemy 模型暂未定义 relationship(),这是有意为之,以保持模型简洁。如需预加载关联数据,可以后续添加。

2. **外键约束**: SQLAlchemy 模型中的 sample_id 等字段未显式定义 ForeignKey,因为 Prisma 已经在数据库层面创建了外键约束。SQLAlchemy 可以直接使用这些约束。

3. **数组类型**: merged_from_ids 使用 ARRAY(String) 类型,这是 PostgreSQL 特有的类型,与 Prisma 的 String[] 完全兼容。

4. **时间戳**: 使用 server_default=func.now() 确保时间戳在数据库层面生成,与 Prisma 的 @default(now()) 行为一致。

## 下一步建议

1. ✅ 模型定义已完成
2. ⏭️ 实现 Pydantic Schema 用于 API 验证
3. ⏭️ 实现 Repository 层用于数据访问
4. ⏭️ 实现 Service 层用于业务逻辑
5. ⏭️ 编写单元测试验证模型行为
