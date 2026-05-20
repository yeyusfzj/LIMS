# 测试数据填充模块

## 概述

测试数据填充模块为实验室管理系统提供了快速生成完整、一致且多样化测试数据的能力。

## 目录结构

```
src/seeders/
├── types.ts              # 核心类型定义
├── DataFactory.ts        # 数据工厂 - 通用数据生成方法
├── ConfigManager.ts      # 配置管理器
├── Validator.ts          # 数据验证器
├── SeedController.ts     # 主控制器
├── cli.ts               # 命令行接口
├── SampleSeeder.ts      # 样品数据生成器
├── TransferSeeder.ts    # 流转数据生成器
├── AuditSeeder.ts       # 审核数据生成器
├── ResultSeeder.ts      # 检测结果生成器
├── WorkflowSeeder.ts    # 工作流实例生成器
├── JudgmentSeeder.ts    # 质量判定生成器
├── ReportSeeder.ts      # 报告数据生成器
├── DistributionSeeder.ts # 分发数据生成器
├── index.ts             # 模块入口
└── README.md            # 本文件
```

## 快速开始

### 1. 填充所有模块数据

```bash
npm run seed
```

### 2. 清除已有数据后重新填充

```bash
npm run seed -- --clear
```

### 3. 填充指定模块

```bash
npm run seed -- --modules=sample,transfer
```

### 4. 创建配置文件

```bash
npm run seed:init
```

## 架构设计

### 核心组件

1. **SeedController**: 主控制器,负责协调整个数据填充流程
2. **DataFactory**: 数据工厂,提供通用的数据生成方法
3. **ConfigManager**: 配置管理器,管理数据填充的配置参数
4. **Validator**: 数据验证器,验证生成的数据是否符合约束

### 数据生成器

每个数据生成器负责特定模块的数据创建,遵循统一的 `ISeeder` 接口:

```typescript
interface ISeeder {
  name: string;
  dependencies: string[];
  seed(context: SeedContext): Promise<SeedResult>;
  clear(context: SeedContext): Promise<void>;
}
```

### 依赖关系

数据生成器按依赖关系顺序执行:

```
SampleSeeder (基础)
├── TransferSeeder
├── AuditSeeder
├── ResultSeeder
│   └── JudgmentSeeder
│       └── ReportSeeder
│           └── DistributionSeeder
└── WorkflowSeeder
```

## 生成的数据

### 样品数据 (SampleSeeder)
- 数量: 可配置 (默认 50)
- 类型: 水质、土壤、食品、空气
- 状态: REGISTERED, IN_TESTING, TESTING_COMPLETE, IN_AUDIT, AUDIT_COMPLETE, RELEASED
- 优先级: LOW, NORMAL, HIGH, URGENT

### 流转记录 (TransferSeeder)
- 每个样品 2-4 条记录
- 状态: PENDING, IN_TRANSIT, RECEIVED, REJECTED
- 包含发送方和接收方确认状态

### 审核任务 (AuditSeeder)
- 为状态 >= IN_AUDIT 的样品生成
- 审核级别: 1-3 级
- 状态: PENDING, IN_PROGRESS, APPROVED, REJECTED

### 检测结果 (ResultSeeder)
- 每个检测项目 3-6 个参数结果
- 来源: MANUAL, INSTRUMENT, CALCULATED
- 5% 异常率, 2% 复测率

### 工作流实例 (WorkflowSeeder)
- 为 60% 的样品创建工作流
- 每个实例 3-8 个任务
- 状态: RUNNING, COMPLETED, SUSPENDED, TERMINATED

### 质量判定 (JudgmentSeeder)
- 为状态 >= TESTING_COMPLETE 的样品生成
- 结果: QUALIFIED (75%), UNQUALIFIED (20%), PENDING (5%)
- 80% 自动判定

### 报告数据 (ReportSeeder)
- 6 个报告模板 (水质、土壤、食品等)
- 为状态 >= AUDIT_COMPLETE 的样品生成报告
- 包含 1-3 个签名记录

### 分发记录 (DistributionSeeder)
- 每个报告 1-3 条分发记录
- 方式: EMAIL (60%), DOWNLOAD (30%), PRINT (10%)
- 状态: PENDING, SENT, RECEIVED, FAILED

## 配置说明

配置文件 `seed.config.json`:

```json
{
  "sampleCount": 50,
  "transferPerSample": 3,
  "auditTaskCount": 60,
  "workflowInstanceRatio": 0.6,
  "resultPerTestItem": 4,
  "dateRangeStart": "2024-01-01",
  "dateRangeEnd": "2024-03-31",
  "clearExisting": false,
  "modules": ["all"],
  "verbose": true
}
```

## 安全注意事项

⚠️ **严禁在生产环境运行!**

- 工具会自动检查 `NODE_ENV` 环境变量
- 如果 `NODE_ENV=production`,将拒绝执行
- 仅在开发或测试环境使用

## 性能

- 平均速度: 800-1200 记录/秒
- 50 个样品约需 0.5-1 秒
- 使用批量插入优化性能

## 扩展

### 添加新的数据生成器

1. 创建新的 Seeder 类,实现 `ISeeder` 接口
2. 在 `SeedController` 中注册
3. 添加到 `index.ts` 导出

示例:

```typescript
export class CustomSeeder implements ISeeder {
  name = 'CustomSeeder';
  dependencies = ['SampleSeeder'];
  
  async seed(context: SeedContext): Promise<SeedResult> {
    // 实现数据生成逻辑
  }
  
  async clear(context: SeedContext): Promise<void> {
    // 实现清除逻辑
  }
}
```

## 故障排除

详见 [docs/TEST_DATA_SEEDING.md](../../docs/TEST_DATA_SEEDING.md)

## 许可证

MIT
