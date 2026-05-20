# 仪器文档上传中间件使用指南

## 概述

仪器文档上传中间件专门用于处理仪器管理模块的文件上传需求,包括仪器文档、维护文档、报废文档和校准证书的上传。

## 功能特性

- **文件大小限制**: 最大 20MB
- **支持的文件类型**:
  - PDF文档 (.pdf)
  - Word文档 (.doc, .docx)
  - Excel文件 (.xls, .xlsx)
  - 图片文件 (.jpg, .jpeg, .png, .gif)
  - CSV文件 (.csv)
  - XML文件 (.xml)
- **自动目录分类**: 根据上传路径自动将文件存储到相应目录
- **文件名安全处理**: 自动清理文件名中的特殊字符,支持中文文件名
- **唯一文件名生成**: 使用时间戳和随机数避免文件名冲突

## 目录结构

```
uploads/
└── instruments/
    ├── documents/      # 仪器文档(说明书、合格证等)
    ├── maintenance/    # 维护文档
    ├── calibration/    # 校准证书
    └── disposal/       # 报废文档
```

## 使用方法

### 1. 导入中间件

```typescript
import {
  uploadSingleInstrumentDocument,
  uploadMultipleInstrumentDocuments
} from '../middleware/fileUploadMiddleware'
```

### 2. 单文件上传

```typescript
// 在路由中使用
router.post(
  '/api/instruments/:id/documents',
  authMiddleware,
  uploadSingleInstrumentDocument('file'),
  instrumentController.uploadDocument
)

// 在控制器中访问上传的文件
export const uploadDocument = async (req: Request, res: Response) => {
  const file = req.file
  
  if (!file) {
    return res.status(400).json({ error: '未上传文件' })
  }

  // 文件信息
  const fileInfo = {
    fileName: file.originalname,
    filePath: file.path,
    fileSize: file.size,
    fileType: file.mimetype
  }

  // 保存到数据库...
}
```

### 3. 多文件上传

```typescript
// 在路由中使用
router.post(
  '/api/instruments/:id/documents/batch',
  authMiddleware,
  uploadMultipleInstrumentDocuments('files', 10),
  instrumentController.uploadMultipleDocuments
)

// 在控制器中访问上传的文件
export const uploadMultipleDocuments = async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[]
  
  if (!files || files.length === 0) {
    return res.status(400).json({ error: '未上传文件' })
  }

  // 处理多个文件
  const fileInfos = files.map(file => ({
    fileName: file.originalname,
    filePath: file.path,
    fileSize: file.size,
    fileType: file.mimetype
  }))

  // 保存到数据库...
}
```

### 4. 维护记录文档上传

```typescript
router.post(
  '/api/maintenance/:id/documents',
  authMiddleware,
  uploadSingleInstrumentDocument('file'),
  maintenanceController.uploadDocument
)
```

### 5. 校准证书上传

```typescript
router.post(
  '/api/calibration/:id/certificate',
  authMiddleware,
  uploadSingleInstrumentDocument('certificate'),
  calibrationController.uploadCertificate
)
```

### 6. 报废文档上传

```typescript
router.post(
  '/api/disposals/:id/documents',
  authMiddleware,
  uploadMultipleInstrumentDocuments('files', 5),
  disposalController.uploadDocuments
)
```

## 错误处理

中间件会自动处理以下错误:

1. **文件类型不支持**: 返回 "不支持的文件类型" 错误
2. **文件过大**: 返回 "文件大小超过限制" 错误
3. **文件数量超限**: 返回 "文件数量超过限制" 错误

在路由中添加错误处理中间件:

```typescript
import { errorHandler } from '../middleware/errorHandler'

router.post(
  '/api/instruments/:id/documents',
  authMiddleware,
  uploadSingleInstrumentDocument('file'),
  instrumentController.uploadDocument,
  errorHandler
)
```

## 前端上传示例

### 使用 FormData

```typescript
const uploadDocument = async (instrumentId: string, file: File) => {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`/api/instruments/${instrumentId}/documents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  })

  return response.json()
}
```

### 使用 Element Plus Upload 组件

```vue
<template>
  <el-upload
    :action="`/api/instruments/${instrumentId}/documents`"
    :headers="{ Authorization: `Bearer ${token}` }"
    :on-success="handleSuccess"
    :on-error="handleError"
    :before-upload="beforeUpload"
    :limit="10"
    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
  >
    <el-button type="primary">上传文档</el-button>
  </el-upload>
</template>

<script setup lang="ts">
const beforeUpload = (file: File) => {
  const maxSize = 20 * 1024 * 1024 // 20MB
  
  if (file.size > maxSize) {
    ElMessage.error('文件大小不能超过 20MB')
    return false
  }
  
  return true
}

const handleSuccess = (response: any) => {
  ElMessage.success('文件上传成功')
}

const handleError = (error: any) => {
  ElMessage.error('文件上传失败')
}
</script>
```

## 文件下载

```typescript
// 下载文件路由
router.get(
  '/api/documents/:id',
  authMiddleware,
  documentController.downloadDocument
)

// 控制器实现
export const downloadDocument = async (req: Request, res: Response) => {
  const { id } = req.params
  
  // 从数据库获取文件信息
  const document = await prisma.instrumentDocument.findUnique({
    where: { id }
  })
  
  if (!document) {
    return res.status(404).json({ error: '文件不存在' })
  }
  
  // 设置响应头
  res.setHeader('Content-Type', document.fileType)
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.fileName)}"`)
  
  // 发送文件
  res.sendFile(path.join(process.cwd(), document.filePath))
}
```

## 安全注意事项

1. **文件类型验证**: 中间件会验证文件的 MIME 类型和扩展名
2. **文件大小限制**: 强制限制为 20MB
3. **文件名清理**: 自动移除文件名中的危险字符
4. **权限验证**: 所有上传接口都应该添加身份认证和权限验证中间件
5. **病毒扫描**: 建议在生产环境中集成病毒扫描服务

## 配置说明

相关配置位于 `src/config/security.ts`:

```typescript
// 文件大小限制
export const bodySizeConfig = {
  fileUpload: 50 * 1024 * 1024 // 通用上传限制 50MB
}

// 仪器文档上传限制为 20MB (在中间件中单独配置)

// 允许的文件类型
export const securityConstants = {
  ALLOWED_FILE_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    // ...
  ],
  
  ALLOWED_FILE_EXTENSIONS: [
    '.pdf', '.doc', '.docx', '.xlsx', '.jpg', '.png',
    // ...
  ]
}
```

## 测试

运行测试:

```bash
npm test -- instrumentFileUpload.test.ts
```

测试覆盖:
- 文件类型验证
- 文件大小限制
- 目录结构验证
- 文件名清理

## 故障排除

### 问题: 上传失败,提示 "不支持的文件类型"

**解决方案**: 检查文件的 MIME 类型和扩展名是否在允许列表中。可以在 `src/config/security.ts` 中添加新的文件类型。

### 问题: 上传失败,提示 "文件大小超过限制"

**解决方案**: 仪器文档上传限制为 20MB。如果需要上传更大的文件,请联系系统管理员。

### 问题: 上传目录不存在

**解决方案**: 应用启动时会自动创建所需的上传目录。如果目录被删除,重启应用即可重新创建。

## 相关文件

- `src/middleware/fileUploadMiddleware.ts` - 文件上传中间件
- `src/config/security.ts` - 安全配置
- `src/utils/initUploadDirs.ts` - 上传目录初始化
- `src/__tests__/instrumentFileUpload.test.ts` - 单元测试

## 更新日志

### 2024-01-15
- 添加仪器文档上传中间件
- 支持 doc/docx 文件类型
- 限制文件大小为 20MB
- 支持中文文件名
- 自动创建上传目录
