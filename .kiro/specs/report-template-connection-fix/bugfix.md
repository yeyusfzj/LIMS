# Bugfix Requirements Document

## Introduction

本文档描述报告模板页面网络连接失败的 bug 修复需求。用户在访问报告模板列表页面（ReportTemplateList.vue）和报告模板编辑器页面（ReportTemplateEditor.vue）时，页面显示"网络连接失败"错误，导致无法加载报告模板数据和使用报告模板功能。

根本原因是这两个 Vue 组件文件中使用了 `http` 服务调用后端 API，但缺少 `import http from '@/services/http'` 导入语句，导致运行时 `http` 对象未定义，从而引发网络连接错误。

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN 用户访问报告模板列表页面（/report/templates）THEN 页面显示"网络连接失败"错误，控制台显示 `http is not defined` 错误

1.2 WHEN 用户访问报告模板编辑器页面（/report/template-editor）THEN 页面显示"网络连接失败"错误，控制台显示 `http is not defined` 错误

1.3 WHEN ReportTemplateList.vue 组件挂载时调用 `fetchTemplates()` 方法 THEN 由于 `http` 未定义导致请求失败

1.4 WHEN ReportTemplateEditor.vue 组件尝试保存或加载模板数据 THEN 由于 `http` 未定义导致操作失败

### Expected Behavior (Correct)

2.1 WHEN 用户访问报告模板列表页面（/report/templates）THEN 页面 SHALL 成功加载报告模板列表数据，显示模板信息

2.2 WHEN 用户访问报告模板编辑器页面（/report/template-editor）THEN 页面 SHALL 正常显示编辑器界面，能够创建和编辑模板

2.3 WHEN ReportTemplateList.vue 组件挂载时调用 `fetchTemplates()` 方法 THEN 系统 SHALL 成功调用 FastAPI 后端的 `/api/v1/report-templates` 接口获取模板列表

2.4 WHEN ReportTemplateEditor.vue 组件尝试保存或加载模板数据 THEN 系统 SHALL 成功调用相应的后端 API 接口完成操作

### Unchanged Behavior (Regression Prevention)

3.1 WHEN 其他页面使用 `http` 服务且已正确导入 THEN 这些页面 SHALL CONTINUE TO 正常工作，不受此修复影响

3.2 WHEN HTTP 服务的拦截器处理请求和响应 THEN 拦截器逻辑 SHALL CONTINUE TO 按照现有方式工作（认证、错误处理、日志记录等）

3.3 WHEN FastAPI 后端的报告模板路由接收请求 THEN 后端 SHALL CONTINUE TO 按照现有实现处理请求并返回响应

3.4 WHEN 用户在其他报告相关页面（如 ReportGenerator.vue、ReportDistribution.vue）操作 THEN 这些页面 SHALL CONTINUE TO 正常工作

3.5 WHEN HTTP 服务配置的基础 URL 和超时设置 THEN 这些配置 SHALL CONTINUE TO 保持不变

## Bug Condition and Property

### Bug Condition Function

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type VueComponent
  OUTPUT: boolean
  
  // 返回 true 当组件使用 http 服务但未导入时
  RETURN (X.usesHttpService = true) AND (X.hasHttpImport = false)
END FUNCTION
```

**具体实例：**
- `isBugCondition(ReportTemplateList.vue)` = true（使用 http 但未导入）
- `isBugCondition(ReportTemplateEditor.vue)` = true（使用 http 但未导入）
- `isBugCondition(SampleManagement.vue)` = false（已正确导入 http）

### Property Specification - Fix Checking

```pascal
// Property: Fix Checking - HTTP 服务导入修复
FOR ALL X WHERE isBugCondition(X) DO
  result ← addHttpImport'(X)
  ASSERT result.hasHttpImport = true AND 
         result.canCallHttpMethods = true AND
         no_runtime_error(result)
END FOR
```

**验证标准：**
- 组件文件包含 `import http from '@/services/http'` 语句
- 组件能够成功调用 `http.get()`, `http.post()`, `http.put()`, `http.delete()` 等方法
- 页面加载时不出现 `http is not defined` 错误
- 网络请求能够正常发送到后端 API

### Preservation Goal

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
END FOR
```

**保护范围：**
- 已正确导入 http 服务的其他组件保持不变
- HTTP 服务本身的实现和配置保持不变
- FastAPI 后端的路由和服务实现保持不变
- 其他报告相关功能保持不变

## Counterexample

**具体示例：**

```typescript
// ReportTemplateList.vue 中的 fetchTemplates 方法
const fetchTemplates = async () => {
  loading.value = true
  try {
    // ❌ Bug: http 未定义，导致运行时错误
    const response = await http.get('/report-templates', { params })
    // ...
  } catch (error: any) {
    console.error('获取模板列表失败:', error)
    ElMessage.error(error.message || '获取模板列表失败')
  }
}
```

**错误信息：**
```
Uncaught ReferenceError: http is not defined
    at fetchTemplates (ReportTemplateList.vue:xxx)
```

**修复后：**

```typescript
// ✅ 添加导入语句
import http from '@/services/http'

// 现在 http 服务可以正常使用
const fetchTemplates = async () => {
  loading.value = true
  try {
    const response = await http.get('/report-templates', { params })
    // 成功获取数据
  } catch (error: any) {
    // 正常的错误处理
  }
}
```
