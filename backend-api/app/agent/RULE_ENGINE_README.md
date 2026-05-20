# 规则引擎使用说明

## 概述

规则引擎用于评估实验结果数据，支持多种规则类型：
- **阈值规则（threshold）**：检查数值是否在指定范围内
- **范围规则（range）**：检查数值是否在最小值和最大值之间
- **枚举规则（enum）**：检查值是否在允许的枚举列表中
- **逻辑组合规则（logic）**：支持 AND/OR 逻辑组合多个规则

## 快速开始

### 1. 初始化规则引擎

```python
from app.agent.rule_engine import RuleEngine

# 使用默认配置文件路径
engine = RuleEngine()

# 或指定自定义配置文件路径
engine = RuleEngine(rules_config_path="path/to/rules_config.json")
```

### 2. 添加规则

#### 阈值规则示例

```python
from app.agent.rule_engine import Rule, Threshold, RuleType, SeverityLevel

# 创建阈值规则
threshold = Threshold(min=0.0, max=0.01, unit="mg/L")
rule = Rule(
    id="rule_001",
    name="铅含量阈值检查",
    indicator="铅含量",
    type=RuleType.THRESHOLD,
    threshold=threshold,
    severity=SeverityLevel.HIGH,
    message="铅含量超标",
    suggestion="建议重新采样检测，确认是否存在污染源"
)

# 添加规则
engine.add_rule(rule)
```

#### 范围规则示例

```python
# 创建范围规则
rule = Rule(
    id="rule_002",
    name="pH 值范围检查",
    indicator="pH",
    type=RuleType.RANGE,
    range_config={"min": 6.5, "max": 8.5},
    severity=SeverityLevel.MEDIUM,
    message="pH 值异常",
    suggestion="检查样品保存条件和测量仪器校准"
)

engine.add_rule(rule)
```

#### 枚举规则示例

```python
# 创建枚举规则
rule = Rule(
    id="rule_003",
    name="样品状态检查",
    indicator="样品状态",
    type=RuleType.ENUM,
    enum_values=["正常", "合格", "良好"],
    severity=SeverityLevel.LOW,
    message="样品状态异常",
    suggestion="检查样品质量"
)

engine.add_rule(rule)
```

#### 逻辑组合规则示例

```python
# 创建 AND 逻辑组合规则
rule = Rule(
    id="rule_004",
    name="水质综合检查",
    indicator="综合评估",
    type=RuleType.LOGIC,
    logic_config={
        "operator": "and",  # 或 "or"
        "rules": ["rule_001", "rule_002"]  # 子规则 ID 列表
    },
    severity=SeverityLevel.HIGH,
    message="水质检测不合格",
    suggestion="需要进一步处理"
)

engine.add_rule(rule)
```

### 3. 评估规则

```python
# 准备数据
data = {
    "铅含量": 0.005,
    "pH": 7.0,
    "样品状态": "正常"
}

# 评估单个规则
result = engine.evaluate(data, "rule_001")

# 检查结果
if result.passed:
    print("检测通过")
else:
    print(f"检测失败: {result.message}")
    print(f"建议: {result.details.get('suggestion', '')}")
```

### 4. 更新阈值

```python
# 更新指标的阈值
new_threshold = Threshold(min=0.0, max=0.02, unit="mg/L")
success = engine.update_threshold("铅含量", new_threshold)

if success:
    print("阈值更新成功")
```

### 5. 导入/导出规则

```python
# 导出规则配置
engine.export_to_json("rules_backup.json")

# 导入规则配置
engine.import_from_json("rules_backup.json")
```

## 规则配置文件格式

规则配置文件使用 JSON 格式，示例如下：

```json
{
  "rules": [
    {
      "id": "rule_001",
      "name": "铅含量阈值检查",
      "indicator": "铅含量",
      "type": "threshold",
      "threshold": {
        "min": 0.0,
        "max": 0.01,
        "unit": "mg/L"
      },
      "severity": "high",
      "message": "铅含量超标",
      "suggestion": "建议重新采样检测，确认是否存在污染源"
    },
    {
      "id": "rule_002",
      "name": "pH 值范围检查",
      "indicator": "pH",
      "type": "range",
      "range": {
        "min": 6.5,
        "max": 8.5
      },
      "severity": "medium",
      "message": "pH 值异常",
      "suggestion": "检查样品保存条件和测量仪器校准"
    },
    {
      "id": "rule_003",
      "name": "样品状态检查",
      "indicator": "样品状态",
      "type": "enum",
      "enum_values": ["正常", "合格", "良好"],
      "severity": "low",
      "message": "样品状态异常",
      "suggestion": "检查样品质量"
    },
    {
      "id": "rule_004",
      "name": "水质综合检查",
      "indicator": "综合评估",
      "type": "logic",
      "logic": {
        "operator": "and",
        "rules": ["rule_001", "rule_002"]
      },
      "severity": "high",
      "message": "水质检测不合格",
      "suggestion": "需要进一步处理"
    }
  ],
  "version": "1.0",
  "description": "规则引擎配置文件"
}
```

## 规则类型说明

### 1. 阈值规则（threshold）

检查数值是否在指定的最小值和最大值之间。

**必需字段**：
- `threshold`: 包含 `min`、`max` 和可选的 `unit`

**示例**：
```json
{
  "type": "threshold",
  "threshold": {
    "min": 0.0,
    "max": 0.01,
    "unit": "mg/L"
  }
}
```

### 2. 范围规则（range）

与阈值规则类似，但配置格式略有不同。

**必需字段**：
- `range`: 包含 `min` 和 `max`

**示例**：
```json
{
  "type": "range",
  "range": {
    "min": 6.5,
    "max": 8.5
  }
}
```

### 3. 枚举规则（enum）

检查值是否在允许的枚举列表中。

**必需字段**：
- `enum_values`: 允许的值列表

**示例**：
```json
{
  "type": "enum",
  "enum_values": ["正常", "合格", "良好"]
}
```

### 4. 逻辑组合规则（logic）

组合多个规则，支持 AND 和 OR 逻辑。

**必需字段**：
- `logic`: 包含 `operator`（"and" 或 "or"）和 `rules`（子规则 ID 列表）

**示例**：
```json
{
  "type": "logic",
  "logic": {
    "operator": "and",
    "rules": ["rule_001", "rule_002"]
  }
}
```

## 严重程度

规则支持三种严重程度：
- `low`: 低
- `medium`: 中
- `high`: 高

## API 参考

### RuleEngine 类

#### `__init__(rules_config_path: Optional[str] = None)`
初始化规则引擎。

**参数**：
- `rules_config_path`: 规则配置文件路径（可选）

#### `evaluate(data: Dict[str, Any], rule_id: str) -> RuleResult`
评估单个规则。

**参数**：
- `data`: 要评估的数据字典
- `rule_id`: 规则 ID

**返回**：
- `RuleResult`: 规则评估结果

#### `add_rule(rule: Rule) -> bool`
添加新规则。

**参数**：
- `rule`: 规则对象

**返回**：
- `bool`: 是否添加成功

#### `update_threshold(indicator: str, threshold: Threshold) -> bool`
更新指标的阈值。

**参数**：
- `indicator`: 指标名称
- `threshold`: 新的阈值配置

**返回**：
- `bool`: 是否更新成功

#### `export_to_json(output_path: str) -> bool`
导出规则配置为 JSON 格式。

**参数**：
- `output_path`: 输出文件路径

**返回**：
- `bool`: 是否导出成功

#### `import_from_json(input_path: str) -> bool`
从 JSON 文件导入规则配置。

**参数**：
- `input_path`: 输入文件路径

**返回**：
- `bool`: 是否导入成功

#### `get_rule(rule_id: str) -> Optional[Rule]`
获取指定规则。

**参数**：
- `rule_id`: 规则 ID

**返回**：
- `Rule`: 规则对象，如果不存在则返回 None

#### `get_all_rules() -> List[Rule]`
获取所有规则。

**返回**：
- `List[Rule]`: 规则列表

#### `get_rules_by_indicator(indicator: str) -> List[Rule]`
获取指定指标的所有规则。

**参数**：
- `indicator`: 指标名称

**返回**：
- `List[Rule]`: 规则列表

## 验证需求

本规则引擎实现验证了以下需求：
- 需求 6.2: 使用规则引擎评估结果数据
- 需求 11.1: 支持配置数值型阈值
- 需求 11.2: 支持配置范围型阈值
- 需求 11.3: 支持配置枚举型规则
- 需求 11.4: 支持配置逻辑组合规则
- 需求 11.5: 配置新规则时验证规则语法
- 需求 11.6: 配置新阈值时验证数值有效性
- 需求 11.7: 支持导出当前规则配置为 JSON 格式
- 需求 11.8: 支持导入 JSON 格式的规则配置
- 需求 11.9: 导入规则配置时验证配置完整性
- 需求 11.10: 应用新规则后立即生效

## 测试

运行测试：

```bash
# 基础功能测试
python test_rule_engine_basic.py

# 逻辑组合规则测试
python test_rule_engine_logic.py
```

## 注意事项

1. 规则配置文件默认位置：`app/agent/data/rules_config.json`
2. 添加或更新规则后会自动保存到配置文件
3. 逻辑组合规则的子规则必须已经存在
4. 阈值的 `min` 必须小于或等于 `max`
5. 规则 ID 必须唯一
