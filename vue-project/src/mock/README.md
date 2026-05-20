# 模拟数据使用说明

本目录包含用于前端展示的模拟数据，暂不实现真实后端集成。

## 数据文件

- `index.ts` - 所有模拟数据的集中导出

## 数据类型

### 1. 样品数据 (mockSamples)
包含样品的基本信息、状态、检测项目等。

### 2. 任务数据 (mockTasks)
包含检测任务的详细信息、进度、负责人等。

### 3. 报告数据 (mockReports)
包含检测报告的状态、签发信息等。

### 4. 用户数据 (mockUsers)
包含系统用户的基本信息、角色、状态等。

### 5. 检测方法数据 (mockMethods)
包含检测方法的标准、步骤、设备等。

### 6. 审核记录数据 (mockAuditRecords)
包含样品审核的历史记录。

### 7. 留样数据 (mockRetentionSamples)
包含留样的存储信息、到期时间等。

### 8. 统计数据 (mockStatistics)
包含系统的统计指标、趋势数据等。

## 使用方法

### 方式一：导入全部数据
```typescript
import mockData from '@/mock'

// 使用样品数据
const samples = mockData.samples

// 使用任务数据
const tasks = mockData.tasks
```

### 方式二：按需导入
```typescript
import { mockSamples, mockTasks } from '@/mock'

// 直接使用
const samples = mockSamples
const tasks = mockTasks
```

## 在组件中使用示例

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { mockSamples } from '@/mock'

// 将模拟数据赋值给响应式变量
const samples = ref(mockSamples)

// 或者在需要时获取
const loadData = () => {
  samples.value = mockSamples
}
</script>
```

## 注意事项

1. 这些数据仅用于前端展示和开发调试
2. 实际项目中应该替换为真实的 API 调用
3. 数据结构可以根据实际需求进行调整
4. 建议在开发完成后创建对应的 API 服务接口

## 后续集成建议

当需要集成真实后端时，建议：

1. 在 `src/services` 目录创建 API 服务文件
2. 使用 axios 或其他 HTTP 客户端进行请求
3. 保持数据结构一致，便于平滑过渡
4. 可以通过环境变量控制是否使用模拟数据

示例：
```typescript
// src/services/sampleService.ts
import axios from 'axios'
import { mockSamples } from '@/mock'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export const getSamples = async () => {
  if (USE_MOCK) {
    return Promise.resolve(mockSamples)
  }
  
  const response = await axios.get('/api/samples')
  return response.data
}
```
