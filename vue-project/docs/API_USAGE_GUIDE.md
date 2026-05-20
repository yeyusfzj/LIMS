# API服务和状态管理使用指南

## 📚 快速开始

### 1. 在组件中使用Store (推荐方式)

```vue
<template>
  <div>
    <el-button @click="loadSamples">加载样品</el-button>
    <div v-loading="sampleStore.loading">
      <div v-for="sample in sampleStore.samples" :key="sample.id">
        {{ sample.name }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useSampleStore } from '@/stores/sample'

const sampleStore = useSampleStore()

// 组件挂载时加载数据
onMounted(() => {
  sampleStore.fetchSamples()
})

// 手动刷新
const loadSamples = () => {
  sampleStore.fetchSamples(true) // force refresh
}
</script>
```

### 2. 直接调用API服务

```typescript
import { sampleApi } from '@/services'

// 获取列表
const response = await sampleApi.getList({
  page: 1,
  pageSize: 20,
  filters: {
    status: ['in_progress'],
    sampleType: '水质'
  }
})

// 创建样品
const newSample = await sampleApi.create({
  name: '测试样品',
  source: '某地',
  client: '某公司',
  sampleType: '水质',
  quantity: 100,
  unit: 'ml',
  receivedDate: '2024-01-27'
})

// 更新样品
await sampleApi.update({
  id: '1',
  name: '更新后的名称'
})

// 删除样品
await sampleApi.delete('1')
```

## 🎯 常见场景

### 场景1: 列表页面

```vue
<script setup lang="ts">
import { useSampleStore } from '@/stores/sample'

const sampleStore = useSampleStore()

// 初始加载
onMounted(() => {
  sampleStore.fetchSamples()
})

// 搜索
const handleSearch = () => {
  sampleStore.setFilters({
    name: searchKeyword.value,
    status: selectedStatus.value
  })
  sampleStore.fetchSamples(true)
}

// 分页
const handlePageChange = (page: number) => {
  sampleStore.setPage(page)
  sampleStore.fetchSamples()
}

// 排序
const handleSortChange = ({ prop, order }) => {
  sampleStore.setSort(prop, order)
  sampleStore.fetchSamples()
}
</script>
```

### 场景2: 详情页面

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useSampleStore } from '@/stores/sample'

const route = useRoute()
const sampleStore = useSampleStore()

onMounted(async () => {
  const id = route.params.id as string
  await sampleStore.fetchSampleById(id)
})

// 访问当前样品
const currentSample = computed(() => sampleStore.currentSample)
</script>
```

### 场景3: 表单提交

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSampleStore } from '@/stores/sample'
import { ElMessage } from 'element-plus'

const router = useRouter()
const sampleStore = useSampleStore()
const formData = ref({
  name: '',
  source: '',
  client: '',
  sampleType: '',
  quantity: 0,
  unit: 'ml',
  receivedDate: ''
})

const handleSubmit = async () => {
  try {
    await sampleStore.createSample(formData.value)
    ElMessage.success('创建成功')
    router.push('/sample/list')
  } catch (error) {
    // 错误已由HTTP客户端统一处理
    console.error(error)
  }
}
</script>
```

### 场景4: 批量操作

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { useSampleStore } from '@/stores/sample'
import { ElMessage, ElMessageBox } from 'element-plus'

const sampleStore = useSampleStore()
const selectedIds = ref<string[]>([])

const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm('确定要删除选中的样品吗?', '提示', {
      type: 'warning'
    })
    
    const result = await sampleStore.batchDelete(selectedIds.value)
    ElMessage.success(`成功删除 ${result.success} 个样品`)
    selectedIds.value = []
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
    }
  }
}
</script>
```

## 🔧 高级用法

### 自定义Loading状态

```typescript
import { sampleApi } from '@/services'

// 禁用全局Loading
const data = await sampleApi.getList(params, {
  showLoading: false
})

// 使用自定义Loading
const loading = ref(false)
loading.value = true
try {
  const data = await sampleApi.getList(params, {
    showLoading: false
  })
} finally {
  loading.value = false
}
```

### 自定义错误处理

```typescript
import { sampleApi } from '@/services'

// 禁用全局错误提示
try {
  const data = await sampleApi.getList(params, {
    showError: false
  })
} catch (error) {
  // 自定义错误处理
  console.error('获取数据失败:', error)
  ElMessage.error('自定义错误消息')
}
```

### 文件上传

```typescript
import { http } from '@/services'

const handleUpload = async (file: File) => {
  try {
    const result = await http.upload('/samples/import', file, (progress) => {
      console.log('上传进度:', progress)
    })
    ElMessage.success('上传成功')
  } catch (error) {
    console.error(error)
  }
}
```

### 文件下载

```typescript
import { http } from '@/services'

const handleDownload = async () => {
  try {
    await http.download('/samples/export', 'samples.xlsx')
    ElMessage.success('下载成功')
  } catch (error) {
    console.error(error)
  }
}
```

## 💡 最佳实践

### 1. 优先使用Store

```typescript
// ✅ 推荐: 使用Store
const sampleStore = useSampleStore()
await sampleStore.fetchSamples()

// ❌ 不推荐: 直接调用API (除非有特殊需求)
const data = await sampleApi.getList(params)
```

**原因**: Store提供缓存、状态管理、计算属性等额外功能

### 2. 合理使用缓存

```typescript
// 首次加载,使用缓存
await sampleStore.fetchSamples()

// 需要最新数据时,强制刷新
await sampleStore.fetchSamples(true)
```

### 3. 错误处理

```typescript
// ✅ 推荐: 让HTTP客户端统一处理
await sampleStore.fetchSamples()

// ✅ 特殊情况: 自定义处理
try {
  await sampleStore.fetchSamples()
} catch (error) {
  // 自定义逻辑
}
```

### 4. 类型安全

```typescript
// ✅ 使用类型定义
import type { Sample, SampleFilters } from '@/types'

const filters: SampleFilters = {
  status: ['in_progress'],
  sampleType: '水质'
}
```

## 🐛 常见问题

### Q1: 如何切换Mock数据和真实API?

**A**: 修改环境变量

```bash
# .env.development
VITE_USE_REAL_API=false  # 使用Mock数据
VITE_USE_REAL_API=true   # 使用真实API
```

### Q2: 如何清除缓存?

**A**: 调用Store的reset方法

```typescript
const sampleStore = useSampleStore()
sampleStore.reset()
```

### Q3: 如何处理401未授权错误?

**A**: HTTP客户端会自动处理,清除token并跳转登录页

### Q4: 如何添加新的API服务?

**A**: 参考现有服务创建新文件

```typescript
// src/services/api/newModule.ts
class NewModuleApi {
  private readonly baseUrl = '/new-module'
  
  async getList() {
    return http.get(this.baseUrl)
  }
}

export const newModuleApi = new NewModuleApi()
```

## 📖 参考资料

- [Axios文档](https://axios-http.com/)
- [Pinia文档](https://pinia.vuejs.org/)
- [Vue 3文档](https://vuejs.org/)
- [TypeScript文档](https://www.typescriptlang.org/)
