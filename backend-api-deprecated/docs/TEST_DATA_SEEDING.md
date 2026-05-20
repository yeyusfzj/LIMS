# 测试数据填充工具使用指南

## 概述

测试数据填充工具为实验室管理系统提供了快速生成完整、一致且多样化测试数据的能力。该工具支持为所有主要模块生成测试数据,包括样品、流转记录、审核任务、检测结果、工作流实例、质量判定、报告和分发记录。

## 功能特性

- ✅ **完整性**: 为所有主要模块生成测试数据
- ✅ **一致性**: 确保数据之间的关联关系正确,符合业务逻辑
- ✅ **多样性**: 生成不同状态、类型和场景的数据
- ✅ **可控性**: 支持选择性填充和数据清除
- ✅ **安全性**: 禁止在生产环境运行

## 快速开始

### 1. 安装依赖

```bash
cd backend-api
npm install
```

### 2. 配置数据库

确保 `.env` 文件中的数据库连接配置正确:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/lab_db"
NODE_ENV="development"
```

### 3. 运行数据填充

```bash
npm run seed
```

## 使用方法

### 基本用法

#### 填充所有模块数据

```bash
npm run seed
```

#### 清除已有数据后重新填充

```bash
npm run seed -- --clear
```

#### 填充指定模块数据

```bash
npm run seed -- --modules=samples,transfers,audits
```

可用模块:
- `samples` - 样品数据
- `transfers` - 流转记录
- `audits` - 审核任务
- `results` - 检测结果
- `workflows` - 工作流实例
- `judgments` - 质量判定
- `reports` - 报告数据
- `distributions` - 分发记录

#### 自定义样品数量

```bash
npm run seed -- --sample-count=100
```

#### 显示详细信息

```bash
npm run seed -- --verbose
```

### 配置文件

#### 创建默认配置文件

```bash
npm run seed:init
```

这将创建 `seed.config.json` 文件,包含默认配置。

#### 配置文件示例

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

#### 使用自定义配置文件

```bash
npm run seed -- --config=custom-seed.config.json
```

## 配置参数说明

### 数据量配置

- `sampleCount`: 样品数量 (默认: 50)
- `transferPerSample`: 每个样品的流转记录数 (默认: 3)
- `auditTaskCount`: 审核任务数量 (默认: 60)
- `workflowInstanceRatio`: 工作流实例比例 (默认: 0.6, 即60%的样品创建工作流)
- `resultPerTestItem`: 每个检测项目的结果数 (默认: 4)

### 时间范围配置

- `dateRangeStart`: 开始日期 (默认: 3个月前)
- `dateRangeEnd`: 结束日期 (默认: 当前日期)

### 分布配置

- `sampleTypeDistribution`: 样品类型分布
- `statusDistribution`: 状态分布
- `priorityDistribution`: 优先级分布

### 选项

- `clearExisting`: 是否清除已有数据 (默认: false)
- `modules`: 要填充的模块列表 (默认: ["all"])
- `verbose`: 是否显示详细信息 (默认: true)

## 输出示例

```
🌱 开始数据填充...

✅ 环境检查通过 (development)

📊 配置信息:
  - 样品数量: 50
  - 流转记录/样品: 3
  - 审核任务数量: 60
  - 工作流实例比例: 60%
  - 检测结果/项目: 4
  - 时间范围: 2024-01-01 至 2024-03-31
  - 清除已有数据: 否
  - 模块: all

✅ 数据库连接成功

🔄 执行数据生成器...

🔄 开始生成样品数据...
✅ 样品数据生成完成: 50 条记录

🔄 开始生成流转记录数据...
✅ 流转记录数据生成完成: 142 条记录

🔄 开始生成审核任务数据...
✅ 审核任务数据生成完成: 63 条记录

🔄 开始生成检测结果数据...
✅ 检测结果数据生成完成: 198 条记录

🔄 开始生成工作流实例数据...
✅ 工作流实例数据生成完成: 30 个实例, 156 个任务

🔄 开始生成质量判定数据...
✅ 质量判定数据生成完成: 42 条记录

🔄 开始生成报告数据...
✅ 报告数据生成完成: 6 个模板, 38 个报告, 89 个签名

🔄 开始生成分发记录数据...
✅ 分发记录数据生成完成: 76 条记录

📈 统计摘要:
  - 总记录数: 884
  - 总耗时: 15.2s
  - 平均速度: 58 记录/秒

模块详情:
  - samples: 50
  - transfers: 142
  - auditTasks: 63
  - testItems: 50
  - results: 198
  - workflowInstances: 30
  - tasks: 156
  - qualityJudgments: 42
  - reportTemplates: 6
  - reports: 38
  - signatures: 89
  - distributions: 76

🎉 数据填充完成!
```

## 故障排除

### 数据库连接失败

**错误信息:**
```
❌ 数据库连接失败: Can't reach database server
```

**解决方法:**
1. 检查 `.env` 文件中的 `DATABASE_URL` 配置
2. 确保数据库服务正在运行
3. 检查网络连接和防火墙设置

### 外键约束错误

**错误信息:**
```
❌ 外键约束失败: Foreign key constraint failed
```

**解决方法:**
1. 使用 `--clear` 选项清除已有数据后重新填充
2. 确保依赖的数据已存在(如用户数据)

### 唯一约束冲突

**错误信息:**
```
❌ 唯一约束冲突: Unique constraint failed
```

**解决方法:**
1. 使用 `--clear` 选项清除已有测试数据
2. 检查是否有重复的数据

### 禁止在生产环境运行

**错误信息:**
```
❌ 禁止在生产环境运行数据填充脚本!
```

**解决方法:**
1. 确保 `NODE_ENV` 环境变量不是 `production`
2. 仅在开发或测试环境运行此工具

## 注意事项

### 安全警告

⚠️ **严禁在生产环境运行数据填充脚本!**

该工具会生成大量测试数据,可能会覆盖或删除现有数据。请确保:

1. 仅在开发或测试环境使用
2. 使用前备份重要数据
3. 检查 `NODE_ENV` 环境变量

### 数据标识

所有生成的测试数据都包含特定的标识模式:

- 样品编号: `S2024-MMDD-NNN`
- 样品条码: `SAMPLE-YYYY-NNNN`
- 报告编号: `REPORT-YYYY-NNNNNN`

### 性能建议

- 对于大量数据(>1000条样品),建议分批执行
- 使用 `--modules` 参数只填充需要的模块
- 在性能较低的机器上,可以减少 `sampleCount` 参数

## 高级用法

### 编程方式使用

```typescript
import { SeedController, ConfigManager } from './seeders';

async function seedData() {
  const config = ConfigManager.getDefaultConfig();
  config.sampleCount = 100;
  config.clearExisting = true;

  const controller = new SeedController();
  await controller.seed(config);
}

seedData().catch(console.error);
```

### 自定义数据生成器

如需添加新的数据生成器,请参考现有生成器的实现:

1. 实现 `ISeeder` 接口
2. 在 `SeedController` 中注册新的生成器
3. 添加相应的单元测试

## 技术支持

如遇到问题,请:

1. 查看本文档的故障排除部分
2. 检查日志输出中的错误信息
3. 联系开发团队获取支持

## 更新日志

### v1.0.0 (2024-01-01)

- ✅ 初始版本发布
- ✅ 支持8个核心模块的数据生成
- ✅ 命令行接口
- ✅ 配置文件支持
- ✅ 数据验证和错误处理
