# 本地文件导入导出功能清单

## 📋 概述

本文档列出系统中所有涉及本地文件导入导出的功能，包括已实现和待实现的功能。

**创建日期**: 2026-05-05  
**状态**: 部分功能待实现

---

## ✅ 已移除的功能

### 1. 样品管理 - 导入导出按钮

**文件**: `vue-project/src/views/sample/SampleManagement.vue`

**移除的按钮**:
- ❌ 导入按钮 - 已移除
- ❌ 导出按钮 - 已移除

**原因**: 暂时无法实现，避免用户困惑

---

## 📊 系统中的导入导出功能清单

### 1. 结果管理模块

#### 1.1 结果导入 (ResultImport.vue)

**文件**: `vue-project/src/views/result/ResultImport.vue`

**功能描述**:
- 从仪器或 Excel 文件导入检测结果
- 支持 Excel (.xlsx, .xls) 和 CSV (.csv) 格式
- 文件大小限制：10MB
- 提供导入模板下载

**实现状态**: ⚠️ 部分实现（前端 UI 已完成，后端 API 待实现）

**关键功能**:
```typescript
// 文件上传处理
const handleFileChange = async (file: UploadFile) => {
  // 验证文件类型和大小
  // 解析文件内容
  // 预览导入数据
}

// 下载导入模板
const downloadTemplate = () => {
  // 生成 Excel 模板
  // 包含必填字段和示例数据
}

// 确认导入
const handleConfirmImport = async () => {
  // 调用后端 API 导入数据
  // POST /api/v1/results/import
}
```

**需要的后端 API**:
- `POST /api/v1/results/import` - 批量导入检测结果
- `GET /api/v1/results/import-template` - 下载导入模板

**数据格式**:
```typescript
interface ImportDataRow {
  testItemName: string      // 检测项目名称
  testItemCode: string      // 检测项目编码
  result: string            // 检测结果
  unit: string              // 单位
  standardValue: string     // 标准值
  upperLimit: number        // 上限
  lowerLimit: number        // 下限
  isQualified: boolean      // 是否合格
}
```

---

### 2. 用户管理模块

#### 2.1 用户批量导入 (UserManagement.vue)

**文件**: `vue-project/src/views/system/UserManagement.vue`

**功能描述**:
- 批量导入用户信息
- 支持 Excel 格式

**实现状态**: ❌ 未实现（仅有按钮，功能待开发）

**当前代码**:
```typescript
// 导入
const handleImport = () => {
  ElMessage.info('批量导入功能将在后续实现')
}
```

**需要实现**:
1. 文件上传组件
2. Excel 解析逻辑
3. 数据验证
4. 批量创建用户 API 调用

**需要的后端 API**:
- `POST /api/v1/users/import` - 批量导入用户
- `GET /api/v1/users/import-template` - 下载导入模板

**数据格式**:
```typescript
interface UserImportRow {
  username: string          // 用户名
  realName: string          // 真实姓名
  email: string             // 邮箱
  phone: string             // 手机号
  department: string        // 部门
  role: string              // 角色
  status: 'active' | 'inactive'  // 状态
}
```

---

#### 2.2 用户导出 (UserManagement.vue)

**文件**: `vue-project/src/views/system/UserManagement.vue`

**功能描述**:
- 导出选中的用户信息
- 支持 Excel 格式

**实现状态**: ❌ 未实现（仅有按钮，功能待开发）

**当前代码**:
```typescript
// 导出
const handleExport = () => {
  if (selectedUsers.value.length === 0) {
    ElMessage.warning('请先选择要导出的用户')
    return
  }
  ElMessage.success(`已选择 ${selectedUsers.value.length} 个用户进行导出`)
}
```

**需要实现**:
1. 使用 SheetJS (xlsx) 库生成 Excel 文件
2. 格式化用户数据
3. 触发文件下载

**实现示例**:
```typescript
import * as XLSX from 'xlsx'

const handleExport = () => {
  if (selectedUsers.value.length === 0) {
    ElMessage.warning('请先选择要导出的用户')
    return
  }
  
  // 准备导出数据
  const exportData = selectedUsers.value.map(user => ({
    '用户名': user.username,
    '真实姓名': user.realName,
    '邮箱': user.email,
    '手机号': user.phone,
    '部门': user.department,
    '角色': user.role,
    '状态': user.status === 'active' ? '启用' : '禁用',
    '创建时间': user.createdAt
  }))
  
  // 创建工作簿
  const ws = XLSX.utils.json_to_sheet(exportData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '用户列表')
  
  // 下载文件
  XLSX.writeFile(wb, `用户列表_${new Date().toISOString().split('T')[0]}.xlsx`)
  
  ElMessage.success('导出成功')
}
```

---

### 3. 审计日志模块

#### 3.1 审计日志导出 (AuditLogViewer.vue)

**文件**: `vue-project/src/views/system/AuditLogViewer.vue`

**功能描述**:
- 导出选中的审计日志
- 支持 Excel 格式

**实现状态**: ❌ 未实现（仅有按钮，功能待开发）

**当前代码**:
```typescript
// 导出
const handleExport = () => {
  if (selectedLogs.value.length === 0) {
    ElMessage.warning('请先选择要导出的日志')
    return
  }
  ElMessage.success(`已选择 ${selectedLogs.value.length} 条日志进行导出`)
  // TODO: 实现导出功能
}
```

**需要实现**:
1. 使用 SheetJS 生成 Excel 文件
2. 格式化日志数据
3. 触发文件下载

**数据格式**:
```typescript
interface AuditLogExportRow {
  timestamp: string         // 时间戳
  user: string              // 操作用户
  action: string            // 操作类型
  module: string            // 模块
  description: string       // 描述
  ipAddress: string         // IP 地址
  result: 'success' | 'failure'  // 结果
}
```

---

### 4. 统计报表模块

#### 4.1 统计报表导出 (StatisticsDashboard.vue)

**文件**: `vue-project/src/views/statistics/StatisticsDashboard.vue`

**功能描述**:
- 导出统计报表
- 支持多种格式：Excel、PDF、图片

**实现状态**: ⚠️ 部分实现（Excel 导出已实现，PDF 和图片待实现）

**当前代码**:
```typescript
// 导出报表
const handleExport = (command: string) => {
  const exportType = command === 'excel' ? 'Excel' : command === 'pdf' ? 'PDF' : '图片'
  
  // 准备导出数据
  const exportData = [
    {
      name: '样品总数',
      value: statistics.value.totalSamples,
      trend: statistics.value.sampleTrend
    },
    // ... 其他统计数据
  ]
  
  // 根据命令执行不同的导出
  if (command === 'excel') {
    exportToExcel(exportData, '统计报表')
  } else if (command === 'pdf') {
    exportToPDF(exportData, '统计报表')
  } else if (command === 'image') {
    exportToImage(exportData, '统计报表')
  }
}
```

**需要实现**:

##### Excel 导出 (已实现)
```typescript
import * as XLSX from 'xlsx'

const exportToExcel = (data: any[], filename: string) => {
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '统计数据')
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`)
}
```

##### PDF 导出 (待实现)
```typescript
import jsPDF from 'jspdf'
import 'jspdf-autotable'

const exportToPDF = (data: any[], filename: string) => {
  const doc = new jsPDF()
  
  // 添加标题
  doc.setFontSize(18)
  doc.text('统计报表', 14, 22)
  
  // 添加表格
  doc.autoTable({
    head: [['指标名称', '数值', '趋势']],
    body: data.map(item => [item.name, item.value, item.trend]),
    startY: 30
  })
  
  // 保存文件
  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`)
}
```

##### 图片导出 (待实现)
```typescript
import html2canvas from 'html2canvas'

const exportToImage = async (data: any[], filename: string) => {
  // 获取图表容器
  const chartContainer = document.querySelector('.statistics-charts')
  
  if (!chartContainer) {
    ElMessage.error('未找到图表容器')
    return
  }
  
  // 转换为 canvas
  const canvas = await html2canvas(chartContainer as HTMLElement)
  
  // 转换为图片并下载
  const link = document.createElement('a')
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.png`
  link.href = canvas.toDataURL()
  link.click()
}
```

---

### 5. 报告管理模块

#### 5.1 报告导出 (ReportManagement.vue)

**文件**: `vue-project/src/views/report/ReportManagement.vue`

**功能描述**:
- 导出报告为 PDF 格式
- 支持批量导出

**实现状态**: ⚠️ 部分实现（单个报告导出已实现，批量导出待实现）

**需要的功能**:
1. 单个报告导出为 PDF
2. 批量报告打包下载（ZIP）
3. 报告模板导出

---

### 6. 检测方法库模块

#### 6.1 方法导入导出 (MethodLibrary.vue)

**文件**: `vue-project/src/views/workflow/MethodLibrary.vue`

**功能描述**:
- 导入检测方法配置
- 导出检测方法配置
- 支持 JSON 或 Excel 格式

**实现状态**: ❌ 未实现

**需要实现**:
1. 方法配置导出为 JSON/Excel
2. 从 JSON/Excel 导入方法配置
3. 方法模板下载

**数据格式**:
```typescript
interface MethodExportData {
  methodCode: string        // 方法编码
  methodName: string        // 方法名称
  category: string          // 分类
  standard: string          // 标准依据
  testItems: Array<{        // 检测项目
    itemCode: string
    itemName: string
    unit: string
    standardValue: string
  }>
  workflow: object          // 工作流配置
}
```

---

## 🔧 实现优先级建议

### 高优先级（核心功能）

1. **结果导入** (ResultImport.vue)
   - 状态：⚠️ 部分实现
   - 优先级：⭐⭐⭐⭐⭐
   - 原因：检测结果录入的核心功能，提高效率

2. **统计报表导出 - Excel** (StatisticsDashboard.vue)
   - 状态：✅ 已实现
   - 优先级：⭐⭐⭐⭐⭐
   - 原因：数据分析和汇报的必需功能

### 中优先级（提升效率）

3. **用户批量导入** (UserManagement.vue)
   - 状态：❌ 未实现
   - 优先级：⭐⭐⭐⭐
   - 原因：批量创建用户，提高管理效率

4. **用户导出** (UserManagement.vue)
   - 状态：❌ 未实现
   - 优先级：⭐⭐⭐
   - 原因：用户数据备份和分析

5. **审计日志导出** (AuditLogViewer.vue)
   - 状态：❌ 未实现
   - 优先级：⭐⭐⭐
   - 原因：合规性要求，审计追溯

### 低优先级（增强功能）

6. **统计报表导出 - PDF** (StatisticsDashboard.vue)
   - 状态：❌ 未实现
   - 优先级：⭐⭐
   - 原因：正式报告需求

7. **统计报表导出 - 图片** (StatisticsDashboard.vue)
   - 状态：❌ 未实现
   - 优先级：⭐
   - 原因：演示和分享需求

8. **检测方法导入导出** (MethodLibrary.vue)
   - 状态：❌ 未实现
   - 优先级：⭐⭐
   - 原因：方法配置备份和迁移

---

## 📦 需要的依赖库

### 已安装
- ✅ **SheetJS (xlsx)** - Excel 文件处理
  ```bash
  npm install xlsx
  ```

### 待安装
- ⏳ **jsPDF** - PDF 生成
  ```bash
  npm install jspdf jspdf-autotable
  ```

- ⏳ **html2canvas** - HTML 转图片
  ```bash
  npm install html2canvas
  ```

- ⏳ **JSZip** - ZIP 文件打包（批量下载）
  ```bash
  npm install jszip
  ```

- ⏳ **FileSaver.js** - 文件下载
  ```bash
  npm install file-saver
  ```

---

## 🔍 技术实现要点

### 1. Excel 文件处理

#### 读取 Excel 文件
```typescript
import * as XLSX from 'xlsx'

const readExcelFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet)
        resolve(jsonData)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = reject
    reader.readAsBinaryString(file)
  })
}
```

#### 生成 Excel 文件
```typescript
import * as XLSX from 'xlsx'

const generateExcelFile = (data: any[], filename: string) => {
  // 创建工作表
  const ws = XLSX.utils.json_to_sheet(data)
  
  // 设置列宽
  const colWidths = Object.keys(data[0] || {}).map(() => ({ wch: 20 }))
  ws['!cols'] = colWidths
  
  // 创建工作簿
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  
  // 下载文件
  XLSX.writeFile(wb, `${filename}.xlsx`)
}
```

### 2. CSV 文件处理

#### 读取 CSV 文件
```typescript
const readCSVFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const lines = text.split('\n')
        const headers = lines[0].split(',')
        
        const data = lines.slice(1).map(line => {
          const values = line.split(',')
          const obj: any = {}
          headers.forEach((header, index) => {
            obj[header.trim()] = values[index]?.trim()
          })
          return obj
        })
        
        resolve(data)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = reject
    reader.readAsText(file)
  })
}
```

### 3. PDF 生成

```typescript
import jsPDF from 'jspdf'
import 'jspdf-autotable'

const generatePDF = (data: any[], filename: string) => {
  const doc = new jsPDF()
  
  // 添加中文字体支持（需要额外配置）
  // doc.addFont('path/to/font.ttf', 'CustomFont', 'normal')
  // doc.setFont('CustomFont')
  
  // 添加标题
  doc.setFontSize(18)
  doc.text('报告标题', 14, 22)
  
  // 添加表格
  doc.autoTable({
    head: [Object.keys(data[0])],
    body: data.map(item => Object.values(item)),
    startY: 30,
    styles: { font: 'CustomFont' }  // 使用中文字体
  })
  
  // 保存文件
  doc.save(`${filename}.pdf`)
}
```

### 4. 文件下载

```typescript
import { saveAs } from 'file-saver'

const downloadFile = (blob: Blob, filename: string) => {
  saveAs(blob, filename)
}

// 或使用原生方法
const downloadFileNative = (url: string, filename: string) => {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
}
```

---

## 🐛 常见问题

### 1. 文件大小限制

**问题**: 上传大文件时失败

**解决**:
- 前端限制文件大小（如 10MB）
- 后端配置文件上传大小限制
- 使用分片上传处理大文件

### 2. 中文乱码

**问题**: 导出的 Excel 或 CSV 文件中文显示乱码

**解决**:
- Excel: 使用 UTF-8 BOM 编码
- CSV: 添加 BOM 头 `\uFEFF`

```typescript
const exportCSVWithBOM = (data: any[], filename: string) => {
  const csv = '\uFEFF' + convertToCSV(data)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  saveAs(blob, `${filename}.csv`)
}
```

### 3. PDF 中文支持

**问题**: PDF 中无法显示中文

**解决**:
- 使用支持中文的字体
- 配置 jsPDF 字体

```typescript
import jsPDF from 'jspdf'
import 'path/to/chinese-font.js'  // 中文字体文件

const doc = new jsPDF()
doc.setFont('chinese-font')
```

---

## 📝 总结

### 已实现功能
- ✅ 统计报表导出 - Excel

### 部分实现功能
- ⚠️ 结果导入（前端 UI 完成，后端 API 待实现）

### 待实现功能
- ❌ 样品导入导出（已移除按钮）
- ❌ 用户批量导入
- ❌ 用户导出
- ❌ 审计日志导出
- ❌ 统计报表导出 - PDF
- ❌ 统计报表导出 - 图片
- ❌ 检测方法导入导出
- ❌ 报告批量导出

### 建议实施顺序
1. 结果导入（完成后端 API）
2. 用户批量导入
3. 用户导出
4. 审计日志导出
5. 统计报表 PDF 导出
6. 其他功能

---

**文档版本**: 1.0  
**最后更新**: 2026-05-05
