# -*- coding: utf-8 -*-
"""
更新模板引擎说明

当前的模板填充方法使用简单的正则替换，不支持循环和条件判断。
需要升级为使用Jinja2模板引擎。

修改文件: app/services/report_service.py

在文件顶部添加导入:
```python
from jinja2 import Template, Environment, select_autoescape
```

替换 _fill_report_template 方法:
```python
def _fill_report_template(
    self,
    template_content: str,
    variables: List[Dict[str, Any]],
    report_data: ReportData,
    report_number: Optional[str] = None
) -> str:
    \"\"\"
    使用Jinja2填充报告模板
    \"\"\"
    try:
        # 创建Jinja2环境
        env = Environment(autoescape=select_autoescape(['html', 'xml']))
        
        # 添加自定义过滤器
        env.filters['formatDate'] = lambda d: d.strftime('%Y-%m-%d') if d else ''
        env.filters['formatDateTime'] = lambda d: d.strftime('%Y-%m-%d %H:%M:%S') if d else ''
        
        # 构建数据上下文
        context = {
            # 报告基本信息
            "reportNumber": report_number or "预览",
            "generatedAt": report_data.generatedAt,
            "generatedBy": report_data.generatedBy,
            
            # 样品信息（扁平化，方便访问）
            "sampleBarcode": report_data.sample.get("barcode"),
            "sampleNumber": report_data.sample.get("sampleNumber"),
            "sampleName": report_data.sample.get("sampleName"),
            "sampleType": report_data.sample.get("sampleType"),
            "sampleCategory": report_data.sample.get("sampleCategory"),
            "sampleQuantity": report_data.sample.get("quantity"),
            "sampleUnit": report_data.sample.get("unit"),
            "clientName": report_data.sample.get("clientName"),
            "clientContact": report_data.sample.get("clientContact"),
            "receivedDate": report_data.sample.get("receivedDate"),
            "samplingDate": report_data.sample.get("samplingDate"),
            "samplingLocation": report_data.sample.get("samplingLocation"),
            "samplingPerson": report_data.sample.get("samplingPerson"),
            
            # 完整的样品对象（用于复杂访问）
            "sample": report_data.sample,
            
            # 检测结果列表
            "results": report_data.results,
            
            # 检测方法列表（如果有）
            "methods": getattr(report_data, 'methods', []),
            
            # 质量判定
            "qualityJudgment": report_data.qualityJudgment,
            
            # 审核任务
            "auditTasks": report_data.auditTasks,
            
            # 人员信息（需要从审核任务或其他地方提取）
            "analyst": self._get_personnel(report_data, "analyst"),
            "reviewer": self._get_personnel(report_data, "reviewer"),
            "tester": self._get_personnel(report_data, "tester"),
            "technicalLead": self._get_personnel(report_data, "technicalLead"),
            
            # 日期信息
            "testDate": report_data.generatedAt.date(),
            "analysisDate": report_data.generatedAt.date(),
            "reviewDate": report_data.generatedAt.date(),
            
            # 分析和结论（可以从质量判定中提取）
            "analysisDescription": report_data.qualityJudgment.get("basis") if report_data.qualityJudgment else "",
            "technicalAnalysis": "",
            "conclusion": report_data.qualityJudgment.get("result") if report_data.qualityJudgment else "",
            "recommendation": "",
            "remarks": report_data.sample.get("remarks", ""),
        }
        
        # 渲染模板
        template = env.from_string(template_content)
        content = template.render(**context)
        
        return content
        
    except Exception as e:
        logger.error(
            "填充报告模板失败",
            extra={"error": str(e), "report_number": report_number}
        )
        raise

def _get_personnel(self, report_data: ReportData, role: str) -> str:
    \"\"\"
    从报告数据中提取人员信息
    \"\"\"
    # 从审核任务中提取
    if report_data.auditTasks:
        for task in report_data.auditTasks:
            if role == "analyst" and task.get("level") == 1:
                return task.get("auditorId", "")
            elif role == "reviewer" and task.get("level") == 2:
                return task.get("auditorId", "")
            elif role == "technicalLead" and task.get("level") == 3:
                return task.get("auditorId", "")
    
    # 从检测结果中提取
    if role == "tester" and report_data.results:
        for result in report_data.results:
            if result.get("enteredBy"):
                return result.get("enteredBy")
    
    return report_data.generatedBy
```

## 使用说明

1. 备份原文件:
```bash
cp app/services/report_service.py app/services/report_service.py.bak
```

2. 手动修改 app/services/report_service.py:
   - 在顶部添加 Jinja2 导入
   - 替换 _fill_report_template 方法
   - 添加 _get_personnel 辅助方法

3. 重启FastAPI服务器

4. 测试报告生成功能

## 模板语法

### 变量替换
```html
<p>报告编号: {{reportNumber}}</p>
<p>样品名称: {{sampleName}}</p>
```

### 循环
```html
<table>
  {% for result in results %}
  <tr>
    <td>{{loop.index}}</td>
    <td>{{result.parameter}}</td>
    <td>{{result.value}}</td>
    <td>{{result.unit}}</td>
  </tr>
  {% endfor %}
</table>
```

### 条件判断
```html
{% if qualityJudgment %}
<p>判定结果: {{qualityJudgment.result}}</p>
{% endif %}
```

### 日期格式化
```html
<p>检测日期: {{testDate|formatDate}}</p>
<p>生成时间: {{generatedAt|formatDateTime}}</p>
```

## 注意事项

1. Jinja2使用 `{% %}` 而不是 `{{# }}`
2. 循环使用 `{% for %}` 而不是 `{{#each}}`
3. 条件使用 `{% if %}` 而不是 `{{#if}}`
4. 需要更新模板内容以匹配Jinja2语法

## 下一步

需要更新模板内容，将Handlebars语法转换为Jinja2语法。
"""

if __name__ == "__main__":
    print(__doc__)
