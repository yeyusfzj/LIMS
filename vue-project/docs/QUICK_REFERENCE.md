# 数据层架构 - 快速参考卡片

## 🚀 快速开始

### 1. 在组件中使用Store
```vue
<script setup lang="ts">
import { useSampleStore } from '@/stores/sample'

const sampleStore = useSampleStore()

// 加载数据
await sampleStore.fetchSamples()

// 访问数据
const samples = sampleStore.samples
const loading = sampleStore.loading
</script>
```

### 2. 直接调用API
```typescript
import { sampleApi } from '@/services'

// 获取列表
const data = await sampleApi.getList(params)

// 创建
const sample = await sampleApi.create(data)
```

---

## 📁 目录结构

```
src/
├── services/
│   ├── api/
│   │   ├── sample.ts      # 样品API
│   │   ├── workflow.ts    # 工作流API
│   │   └── user.ts        # 用户API
│   ├── http.ts            # HTTP客户端
│   └── index.ts           # 统一导出
├── stores/
│   ├── sample.ts          # 样品Store
│   ├── user.ts            # 用户Store
│   └── app.ts             # 应用Store
└── types/
    ├── index.ts           # 业务类型
    └── api.ts             # API类型
```

---

## 🔧 核心API

### HTTP客户端
```typescript
import { http } from '@/services'

// GET请求
http.get(url, config)

// POST请求
http.post(url, data, config)

// PUT请求
http.put(url, data, config)

// DELETE请求
http.delete(url, config)

// 上传文件
http.upload(url, file, onProgress)

// 下载文件
http.download(url, filename)
```

### Store方法
```typescript
const sampleStore = useSampleStore()

// 获取列表
await sampleStore.fetchSamples()

// 获取详情
await sampleStore.fetchSampleById(id)

// 创建
await sampleStore.createSample(data)

// 更新
await sampleStore.updateSample(data)

// 删除
await sampleStore.deleteSample(id)

// 批量删除
await sampleStore.batchDelete(ids)

// 设置筛选
sampleStore.setFilters(filters)

// 设置排序
sampleStore.setSort(sortBy, sortOrder)

// 设置分页
sampleStore.setPage(page)
sampleStore.setPageSize(pageSize)

// 重置
sampleStore.reset()
```

---

## 🎯 常用配置

### 禁用Loading
```typescript
await sampleApi.getList(params, {
  showLoading: false
})
```

### 禁用错误提示
```typescript
await sampleApi.getList(params, {
  showError: false
})
```

### 强制刷新
```typescript
await sampleStore.fetchSamples(true)
```

---

## 📊 类型定义

### 分页请求
```typescript
interface PageRequest {
  page: number
  pageSize: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}
```

### 分页响应
```typescript
interface PageResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
```

### 样品筛选
```typescript
interface SampleFilters {
  barcode?: string
  name?: string
  status?: string[]
  sampleType?: string
  client?: string
  location?: string
  createdBy?: string
  startDate?: string
  endDate?: string
}
```

---

## 🐛 常见问题

### Q: 如何切换Mock和真实API?
```bash
# .env.development
VITE_USE_REAL_API=false  # Mock
VITE_USE_REAL_API=true   # 真实API
```

### Q: 如何清除缓存?
```typescript
sampleStore.reset()
```

### Q: 如何自定义错误处理?
```typescript
try {
  await sampleApi.getList(params, {
    showError: false
  })
} catch (error) {
  // 自定义处理
}
```

---

## 💡 最佳实践

### ✅ 推荐
```typescript
// 使用Store
const sampleStore = useSampleStore()
await sampleStore.fetchSamples()
```

### ❌ 不推荐
```typescript
// 直接调用API (除非特殊需求)
const data = await sampleApi.getList(params)
```

---

## 🔗 相关文档

- [完整架构方案](./ARCHITECTURE_OPTIMIZATION.md)
- [实施过程详解](./OPTIMIZATION_PROCESS.md)
- [API使用指南](./API_USAGE_GUIDE.md)
- [PPT大纲](./PPT_OUTLINE.md)

---

**快速参考版本**: 1.0  
**最后更新**: 2024-01-27
