# 批量导入模板使用说明

## 文件格式

支持以下两种文件格式：
- Excel (.xlsx, .xls)
- CSV (.csv)

## 字段说明

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| sampleId | 字符串 | 是 | 样品 ID，必须在系统中存在 |
| testItemId | 字符串 | 是 | 检测项 ID |
| parameter | 字符串 | 是 | 检测参数名称 |
| value | 数值 | 否* | 数值型结果 |
| textValue | 字符串 | 否* | 文本型结果 |
| unit | 字符串 | 否 | 单位 |
| method | 字符串 | 是 | 检测方法 |
| instrumentId | 字符串 | 否 | 仪器 ID |

**注意**: value 和 textValue 至少需要填写一个

## 使用步骤

1. **下载模板**
   - Excel 模板: `results_import_template.xlsx`
   - CSV 模板: `results_import_template.csv`

2. **填写数据**
   - 保留表头行（第一行）
   - 从第二行开始填写数据
   - 确保必填字段不为空
   - 数值型结果填写在 value 列
   - 文本型结果填写在 textValue 列

3. **上传导入**
   - 访问系统的批量导入页面
   - 选择填写好的文件
   - 点击上传按钮
   - 等待导入完成

4. **查看结果**
   - 系统会显示导入统计信息
   - 成功数量、失败数量
   - 如有错误，会显示详细的错误信息（行号、字段、原因）

## 示例数据

### 数值型结果示例

```
sampleId,testItemId,parameter,value,textValue,unit,method,instrumentId
sample-001,item-001,pH,7.5,,pH,GB/T 5750.4-2006,instrument-001
sample-001,item-003,浊度,2.3,,NTU,GB/T 5750.4-2006,instrument-002
```

### 文本型结果示例

```
sampleId,testItemId,parameter,value,textValue,unit,method,instrumentId
sample-001,item-002,外观,,无色透明,,目测法,
sample-002,item-005,气味,,无异味,,嗅觉法,
```

## 常见错误

### 1. 样品不存在
**错误信息**: "样品不存在"
**解决方法**: 确保 sampleId 在系统中已经注册

### 2. 必填字段为空
**错误信息**: "XXX 不能为空"
**解决方法**: 填写必填字段（sampleId, testItemId, parameter, method）

### 3. 数值格式不正确
**错误信息**: "数值格式不正确"
**解决方法**: 确保 value 列填写的是有效的数字

### 4. 缺少结果值
**错误信息**: "数值结果或文本结果至少需要提供一个"
**解决方法**: 至少填写 value 或 textValue 中的一个

## 性能建议

- 单次导入建议不超过 1000 条记录
- 文件大小不超过 10MB
- 对于大批量数据，建议分批导入

## API 调用示例

### Python

```python
import httpx

async with httpx.AsyncClient() as client:
    with open('results.xlsx', 'rb') as f:
        files = {'file': ('results.xlsx', f)}
        response = await client.post(
            'http://localhost:8000/api/v1/results/import',
            files=files,
            headers={'Authorization': f'Bearer {token}'}
        )
        print(response.json())
```

### cURL

```bash
curl -X POST "http://localhost:8000/api/v1/results/import" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@results.xlsx"
```

## 技术支持

如有问题，请联系系统管理员或查看系统文档。
