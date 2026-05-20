# 批量导入功能使用指南

## 概述

批量导入功能允许用户从仪器数据文件（CSV、Excel、XML）快速导入大量检测结果。系统会自动解析文件、验证数据，并在事务中批量插入有效记录。

## 支持的文件格式

- **CSV** (.csv)
- **Excel** (.xlsx, .xls)
- **XML** (.xml)

## API 端点

```
POST /api/results/import
```

### 请求参数

- **file** (必填): 上传的文件（multipart/form-data）
- **mapping** (必填): 字段映射配置（JSON 字符串）

### 字段映射配置

字段映射配置用于指定文件中的列名与系统字段的对应关系：

```json
{
  "sampleId": "样品编号",
  "testItemId": "检测项编号",
  "parameter": "检测参数",
  "value": "检测值",
  "unit": "单位",
  "method": "检测方法",
  "instrumentId": "仪器编号"
}
```

**必填字段**：
- `parameter`: 检测参数名称
- `method`: 检测方法

**可选字段**：
- `sampleId`: 样品 ID（如果文件中没有，需要其他方式关联）
- `testItemId`: 检测项 ID
- `value`: 数值结果
- `textValue`: 文本结果
- `unit`: 单位
- `instrumentId`: 仪器 ID

## 使用示例

### 1. CSV 文件导入

**文件内容** (results.csv):
```csv
样品编号,检测项编号,检测参数,检测值,单位,检测方法
sample-001,test-001,pH,7.2,,GB/T 5750.4-2006
sample-001,test-002,浊度,0.5,NTU,GB/T 5750.4-2006
sample-002,test-003,余氯,0.3,mg/L,GB/T 5750.11-2006
```

**请求示例** (使用 curl):
```bash
curl -X POST http://localhost:3000/api/results/import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@results.csv" \
  -F 'mapping={"sampleId":"样品编号","testItemId":"检测项编号","parameter":"检测参数","value":"检测值","unit":"单位","method":"检测方法"}'
```

**请求示例** (使用 JavaScript):
```javascript
const formData = new FormData()
formData.append('file', fileInput.files[0])
formData.append('mapping', JSON.stringify({
  sampleId: '样品编号',
  testItemId: '检测项编号',
  parameter: '检测参数',
  value: '检测值',
  unit: '单位',
  method: '检测方法'
}))

const response = await fetch('/api/results/import', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
})

const result = await response.json()
console.log(result)
```

### 2. Excel 文件导入

Excel 文件的格式与 CSV 相同，第一行为表头，后续行为数据。

**文件结构**:
| 样品编号 | 检测项编号 | 检测参数 | 检测值 | 单位 | 检测方法 |
|---------|-----------|---------|--------|------|---------|
| sample-001 | test-001 | pH | 7.2 | | GB/T 5750.4-2006 |
| sample-001 | test-002 | 浊度 | 0.5 | NTU | GB/T 5750.4-2006 |

### 3. XML 文件导入

**文件内容** (results.xml):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<root>
  <record>
    <样品编号>sample-001</样品编号>
    <检测项编号>test-001</检测项编号>
    <检测参数>pH</检测参数>
    <检测值>7.2</检测值>
    <单位></单位>
    <检测方法>GB/T 5750.4-2006</检测方法>
  </record>
  <record>
    <样品编号>sample-001</样品编号>
    <检测项编号>test-002</检测项编号>
    <检测参数>浊度</检测参数>
    <检测值>0.5</检测值>
    <单位>NTU</单位>
    <检测方法>GB/T 5750.4-2006</检测方法>
  </record>
</root>
```

## 响应格式

### 成功响应 (200)

```json
{
  "success": true,
  "data": {
    "success": true,
    "totalRecords": 3,
    "successCount": 3,
    "failureCount": 0,
    "errors": [],
    "importedResults": [
      {
        "id": "result-uuid-1",
        "sampleId": "sample-001",
        "testItemId": "test-001",
        "parameter": "pH",
        "value": 7.2,
        "method": "GB/T 5750.4-2006",
        "source": "INSTRUMENT",
        "enteredBy": "user-uuid",
        "enteredAt": "2024-01-01T10:00:00.000Z",
        ...
      },
      ...
    ]
  },
  "message": "导入成功"
}
```

### 部分成功响应 (207 Multi-Status)

```json
{
  "success": false,
  "data": {
    "success": false,
    "totalRecords": 3,
    "successCount": 2,
    "failureCount": 1,
    "errors": [
      {
        "row": 3,
        "field": "sampleId",
        "value": "non-existent",
        "message": "样品不存在"
      }
    ],
    "importedResults": [...]
  },
  "message": "导入完成，但有 1 条记录失败"
}
```

### 错误响应 (400)

```json
{
  "success": false,
  "error": {
    "code": "FILE_REQUIRED",
    "message": "请上传文件"
  }
}
```

## 数据验证规则

系统会对导入的数据进行以下验证：

1. **必填字段验证**
   - 样品 ID 不能为空
   - 检测项 ID 不能为空
   - 检测参数不能为空
   - 检测方法不能为空
   - 数值结果或文本结果至少需要提供一个

2. **关联验证**
   - 样品必须在系统中存在
   - 检测项必须在系统中存在
   - 检测项必须属于指定的样品

3. **数据格式验证**
   - 数值字段必须是有效的数字

## 事务处理

所有有效的记录会在单个数据库事务中批量插入。如果任何记录插入失败，整个事务会回滚，确保数据一致性。

## 错误处理

导入过程中的错误会被详细记录，包括：
- 错误所在的行号
- 错误的字段名
- 错误的值
- 错误描述

这些错误信息会在响应中返回，帮助用户快速定位和修复问题。

## 性能建议

1. **文件大小限制**: 单个文件最大 10MB
2. **批量大小**: 建议每次导入不超过 1000 条记录
3. **数据准备**: 在导入前确保样品和检测项已经在系统中创建

## 常见问题

### Q: 如何处理中文列名？

A: 系统完全支持中文列名，在字段映射配置中直接使用中文即可。

### Q: 如果部分记录失败怎么办？

A: 系统会返回详细的错误报告，包括失败记录的行号和错误原因。您可以修复这些记录后重新导入。

### Q: 导入的结果来源是什么？

A: 批量导入的结果来源默认标记为 `INSTRUMENT`（仪器导入）。

### Q: 可以导入文本型结果吗？

A: 可以。在字段映射中配置 `textValue` 字段即可导入文本型结果。

### Q: 支持自定义列名吗？

A: 支持。通过字段映射配置，您可以将任意列名映射到系统字段。

## 安全注意事项

1. 所有导入操作都需要身份认证
2. 系统会记录导入操作的审计日志
3. 文件类型会被严格验证，只接受 CSV、Excel 和 XML 格式
4. 导入的数据会经过完整的业务规则验证

## 相关文档

- [检测结果管理 API](./RESULT_API.md)
- [数据验证规则](./VALIDATION_RULES.md)
- [错误码参考](./ERROR_CODES.md)
