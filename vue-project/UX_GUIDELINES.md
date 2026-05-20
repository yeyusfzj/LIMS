# 用户体验优化指南

本文档说明了项目中已实现的用户体验优化措施。

## 1. 加载状态

### 已实现的加载状态

#### 全局搜索
- 搜索时显示加载图标和"搜索中..."提示
- 使用 Element Plus 的 `is-loading` 类实现旋转动画

#### 通知中心
- 通知数据加载时可显示骨架屏（可扩展）

### 使用示例

```vue
<template>
  <!-- 加载状态 -->
  <div v-if="loading" class="loading-container">
    <el-icon class="is-loading"><Loading /></el-icon>
    <span>加载中...</span>
  </div>
  
  <!-- 内容 -->
  <div v-else>
    <!-- 页面内容 -->
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Loading } from '@element-plus/icons-vue'

const loading = ref(false)

const loadData = async () => {
  loading.value = true
  try {
    // 加载数据
    await fetchData()
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px;
  color: var(--text-secondary);
}
</style>
```

## 2. 空状态提示

### 已实现的空状态

#### 通知中心
- 无通知时显示"暂无通知"
- 无未读通知时显示"暂无未读通知"
- 无系统通知时显示"暂无系统通知"

#### 全局搜索
- 无搜索结果时显示"未找到相关结果"
- 未搜索时显示搜索提示

#### 待办事项
- 无待办事项时显示"暂无待办事项"

### 使用示例

```vue
<template>
  <!-- 空状态 -->
  <el-empty 
    v-if="list.length === 0" 
    description="暂无数据" 
    :image-size="80"
  >
    <el-button type="primary" @click="handleAdd">
      添加数据
    </el-button>
  </el-empty>
  
  <!-- 列表内容 -->
  <div v-else>
    <!-- 数据列表 -->
  </div>
</template>
```

## 3. 错误提示

### 消息提示

使用 Element Plus 的 Message 组件提供即时反馈：

```typescript
import { ElMessage } from 'element-plus'

// 成功提示
ElMessage.success('操作成功')

// 警告提示
ElMessage.warning('请注意')

// 错误提示
ElMessage.error('操作失败')

// 信息提示
ElMessage.info('提示信息')
```

### 确认对话框

使用 Element Plus 的 MessageBox 组件：

```typescript
import { ElMessageBox } from 'element-plus'

// 确认对话框
ElMessageBox.confirm(
  '确定要删除这条数据吗？',
  '提示',
  {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }
).then(() => {
  // 确认操作
  ElMessage.success('删除成功')
}).catch(() => {
  // 取消操作
  ElMessage.info('已取消删除')
})
```

### 表单验证

使用 Element Plus 的 Form 验证：

```vue
<template>
  <el-form
    ref="formRef"
    :model="form"
    :rules="rules"
    label-width="100px"
  >
    <el-form-item label="名称" prop="name">
      <el-input v-model="form.name" />
    </el-form-item>
    
    <el-form-item>
      <el-button type="primary" @click="submitForm">
        提交
      </el-button>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'

const formRef = ref<FormInstance>()

const form = reactive({
  name: ''
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ]
}

const submitForm = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate((valid) => {
    if (valid) {
      // 提交表单
      ElMessage.success('提交成功')
    } else {
      ElMessage.error('请检查表单')
      return false
    }
  })
}
</script>
```

## 4. 交互反馈

### 悬停效果

已在全局样式中实现：

```css
/* 卡片悬停 */
.el-card:hover {
  box-shadow: var(--shadow-light);
  transform: translateY(-2px);
}

/* 按钮悬停 */
.el-button:hover {
  /* Element Plus 默认样式 */
}

/* 列表项悬停 */
.list-item:hover {
  background-color: var(--bg-page);
}
```

### 点击反馈

```vue
<template>
  <!-- 可点击的卡片 -->
  <div class="clickable-card" @click="handleClick">
    <el-icon><Document /></el-icon>
    <span>点击查看详情</span>
  </div>
</template>

<style scoped>
.clickable-card {
  cursor: pointer;
  transition: var(--transition-base);
}

.clickable-card:hover {
  background-color: var(--bg-page);
  transform: translateY(-2px);
}

.clickable-card:active {
  transform: translateY(0);
}
</style>
```

### 加载按钮

```vue
<template>
  <el-button 
    type="primary" 
    :loading="loading"
    @click="handleSubmit"
  >
    提交
  </el-button>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const loading = ref(false)

const handleSubmit = async () => {
  loading.value = true
  try {
    // 提交操作
    await submitData()
    ElMessage.success('提交成功')
  } catch (error) {
    ElMessage.error('提交失败')
  } finally {
    loading.value = false
  }
}
</script>
```

## 5. 导航体验

### 面包屑导航

已在主布局中实现，自动根据路由生成：

```typescript
// router/index.ts
{
  path: 'sample/detail/:id',
  name: 'sample-detail',
  component: () => import('@/views/sample/SampleDetail.vue'),
  meta: { title: '样品详情' }  // 用于面包屑
}
```

### 页面标题

路由守卫自动设置页面标题：

```typescript
router.beforeEach((to, _from, next) => {
  if (to.meta.title) {
    document.title = `${to.meta.title} - 实验室智能管理系统`
  }
  next()
})
```

### 返回按钮

```vue
<template>
  <el-page-header @back="goBack" content="详情页面" />
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const goBack = () => {
  router.back()
}
</script>
```

## 6. 数据展示优化

### 分页

```vue
<template>
  <el-table :data="paginatedData">
    <!-- 表格列 -->
  </el-table>
  
  <el-pagination
    v-model:current-page="currentPage"
    v-model:page-size="pageSize"
    :page-sizes="[10, 20, 50, 100]"
    :total="total"
    layout="total, sizes, prev, pager, next, jumper"
    @size-change="handleSizeChange"
    @current-change="handleCurrentChange"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(100)

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return allData.value.slice(start, end)
})

const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1
}

const handleCurrentChange = (val: number) => {
  currentPage.value = val
}
</script>
```

### 搜索和筛选

```vue
<template>
  <div class="filter-bar">
    <el-input
      v-model="searchQuery"
      placeholder="搜索..."
      clearable
      @input="handleSearch"
    >
      <template #prefix>
        <el-icon><Search /></el-icon>
      </template>
    </el-input>
    
    <el-select v-model="statusFilter" placeholder="状态" clearable>
      <el-option label="全部" value="" />
      <el-option label="进行中" value="processing" />
      <el-option label="已完成" value="completed" />
    </el-select>
    
    <el-date-picker
      v-model="dateRange"
      type="daterange"
      range-separator="至"
      start-placeholder="开始日期"
      end-placeholder="结束日期"
    />
  </div>
</template>
```

### 状态标签

```vue
<template>
  <el-tag :type="getStatusType(status)">
    {{ getStatusText(status) }}
  </el-tag>
</template>

<script setup lang="ts">
const getStatusType = (status: string) => {
  const typeMap: Record<string, any> = {
    'success': 'success',
    'warning': 'warning',
    'danger': 'danger',
    'info': 'info'
  }
  return typeMap[status] || 'info'
}

const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    'processing': '进行中',
    'completed': '已完成',
    'pending': '待处理'
  }
  return textMap[status] || status
}
</script>
```

## 7. 响应式设计

### 移动端适配

已在 `responsive.css` 中实现：

- 小屏幕 (< 768px)：单列布局，隐藏次要信息
- 平板 (768px - 1024px)：两列布局
- 桌面 (> 1024px)：多列布局

### 触摸优化

- 增大可点击区域（最小 40px）
- 禁用悬停效果
- 优化滚动体验

## 8. 性能优化

### 路由懒加载

已在路由配置中实现：

```typescript
{
  path: 'sample/management',
  component: () => import('@/views/sample/SampleManagement.vue')
}
```

### 防抖和节流

搜索防抖示例：

```typescript
let searchTimer: number | null = null

const handleSearch = () => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  
  searchTimer = window.setTimeout(() => {
    performSearch()
  }, 300)
}
```

## 9. 可访问性

### 键盘导航

- 支持 Tab 键切换焦点
- 支持 Enter 键确认操作
- 支持 Esc 键关闭对话框

### 语义化 HTML

使用正确的 HTML 标签：

```html
<header>头部</header>
<nav>导航</nav>
<main>主内容</main>
<aside>侧边栏</aside>
<footer>底部</footer>
```

### ARIA 属性

```html
<button aria-label="关闭">
  <el-icon><Close /></el-icon>
</button>

<input aria-describedby="help-text" />
<span id="help-text">请输入有效的邮箱地址</span>
```

## 10. 最佳实践建议

### 1. 及时反馈
- 操作后立即显示结果
- 使用 Message 提示成功或失败
- 长时间操作显示进度

### 2. 清晰的视觉层次
- 使用合适的字体大小和颜色
- 重要信息突出显示
- 保持一致的间距

### 3. 减少用户输入
- 提供默认值
- 使用下拉选择代替输入
- 记住用户的选择

### 4. 错误预防
- 表单验证
- 确认对话框
- 禁用不可用的操作

### 5. 帮助和文档
- 提供工具提示
- 添加帮助文档链接
- 使用占位符文本

## 总结

本项目已实现了基础的用户体验优化，包括：

✅ 加载状态提示
✅ 空状态展示
✅ 错误提示和验证
✅ 交互反馈
✅ 响应式设计
✅ 性能优化

后续可以继续优化：

- 添加骨架屏
- 实现虚拟滚动
- 添加更多动画效果
- 完善可访问性
- 添加用户引导
