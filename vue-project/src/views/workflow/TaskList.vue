<template>
  <div class="task-list-container">
    <!-- 顶部操作栏 -->
    <el-card class="header-card" shadow="never">
      <div class="header-content">
        <div class="title-section">
          <h2>任务列表</h2>
          <el-tag type="info" size="large">共 {{ totalTasks }} 个任务</el-tag>
        </div>
        <div class="action-section">
          <el-button type="primary" :icon="Refresh" @click="handleRefresh">刷新</el-button>
        </div>
      </div>
    </el-card>

    <!-- 搜索和筛选区域 -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="filters" label-width="80px">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-form-item label="关键词">
              <el-input
                v-model="filters.keyword"
                placeholder="样品名称/条码/任务名称"
                clearable
                @clear="handleSearch"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="状态">
              <el-select
                v-model="filters.status"
                placeholder="选择状态"
                multiple
                clearable
                @change="handleSearch"
              >
                <el-option label="待处理" value="pending" />
                <el-option label="进行中" value="in_progress" />
                <el-option label="已完成" value="completed" />
                <el-option label="已拒绝" value="rejected" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="优先级">
              <el-select
                v-model="filters.priority"
                placeholder="选择优先级"
                multiple
                clearable
                @change="handleSearch"
              >
                <el-option label="低" value="low" />
                <el-option label="普通" value="normal" />
                <el-option label="高" value="high" />
                <el-option label="紧急" value="urgent" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="执行人">
              <el-input
                v-model="filters.assignee"
                placeholder="执行人姓名"
                clearable
                @clear="handleSearch"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            <div class="button-group">
              <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
              <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>
            </div>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- 任务列表 - 按状态分组 -->
    <el-card class="content-card" shadow="never">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="全部" name="all">
          <el-badge :value="allTasks.length" class="tab-badge" />
        </el-tab-pane>
        <el-tab-pane label="待处理" name="pending">
          <el-badge :value="pendingTasks.length" class="tab-badge" type="warning" />
        </el-tab-pane>
        <el-tab-pane label="进行中" name="in_progress">
          <el-badge :value="inProgressTasks.length" class="tab-badge" type="primary" />
        </el-tab-pane>
        <el-tab-pane label="已完成" name="completed">
          <el-badge :value="completedTasks.length" class="tab-badge" type="success" />
        </el-tab-pane>
      </el-tabs>

      <!-- 表格视图 -->
      <el-table
        v-loading="loading"
        :data="displayTasks"
        stripe
        style="width: 100%"
        @row-click="handleRowClick"
      >
        <el-table-column prop="id" label="任务ID" width="120" />
        <el-table-column prop="nodeName" label="任务名称" min-width="150" />
        <el-table-column prop="sampleBarcode" label="样品条码" width="150">
          <template #default="{ row }">
            <el-link type="primary" @click.stop="handleViewSample(row.sampleId)">
              {{ row.sampleBarcode }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="sampleName" label="样品名称" min-width="150" />
        <el-table-column prop="workflowName" label="工作流" min-width="120" />
        <el-table-column prop="assigneeName" label="执行人" width="100" />
        <el-table-column prop="priority" label="优先级" width="100">
          <template #default="{ row }">
            <el-tag :type="getPriorityType(row.priority)" size="small">
              {{ getPriorityLabel(row.priority) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="dueDate" label="截止日期" width="180">
          <template #default="{ row }">
            <span v-if="row.dueDate" :class="{ 'overdue': isOverdue(row.dueDate) }">
              {{ formatDate(row.dueDate) }}
            </span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending' || row.status === 'in_progress'"
              type="primary"
              size="small"
              @click.stop="handleViewTask(row.id)"
            >
              处理
            </el-button>
            <el-button
              v-else
              type="info"
              size="small"
              @click.stop="handleViewTask(row.id)"
            >
              查看
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="totalTasks"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, Refresh, RefreshLeft } from '@element-plus/icons-vue'
import type { Task, TaskFilters } from '@/types'

const router = useRouter()

// 状态管理
const loading = ref(false)
const activeTab = ref('all')
const tasks = ref<Task[]>([])

// 筛选条件
const filters = ref<TaskFilters>({
  keyword: '',
  status: [],
  priority: [],
  assignee: ''
})

// 分页
const pagination = ref({
  currentPage: 1,
  pageSize: 20
})

// 计算属性 - 按状态分组的任务
const allTasks = computed(() => {
  return filterTasks(tasks.value)
})

const pendingTasks = computed(() => {
  return filterTasks(tasks.value.filter(t => t.status === 'pending'))
})

const inProgressTasks = computed(() => {
  return filterTasks(tasks.value.filter(t => t.status === 'in_progress'))
})

const completedTasks = computed(() => {
  return filterTasks(tasks.value.filter(t => t.status === 'completed'))
})

// 当前显示的任务列表
const displayTasks = computed(() => {
  let taskList: Task[] = []
  
  switch (activeTab.value) {
    case 'pending':
      taskList = pendingTasks.value
      break
    case 'in_progress':
      taskList = inProgressTasks.value
      break
    case 'completed':
      taskList = completedTasks.value
      break
    default:
      taskList = allTasks.value
  }
  
  // 分页
  const start = (pagination.value.currentPage - 1) * pagination.value.pageSize
  const end = start + pagination.value.pageSize
  return taskList.slice(start, end)
})

const totalTasks = computed(() => {
  switch (activeTab.value) {
    case 'pending':
      return pendingTasks.value.length
    case 'in_progress':
      return inProgressTasks.value.length
    case 'completed':
      return completedTasks.value.length
    default:
      return allTasks.value.length
  }
})

// 筛选任务
function filterTasks(taskList: Task[]): Task[] {
  return taskList.filter(task => {
    // 关键词筛选
    if (filters.value.keyword) {
      const keyword = filters.value.keyword.toLowerCase()
      const matchKeyword = 
        task.sampleName.toLowerCase().includes(keyword) ||
        task.sampleBarcode.toLowerCase().includes(keyword) ||
        task.nodeName.toLowerCase().includes(keyword)
      if (!matchKeyword) return false
    }
    
    // 状态筛选
    if (filters.value.status && filters.value.status.length > 0) {
      if (!filters.value.status.includes(task.status)) return false
    }
    
    // 优先级筛选
    if (filters.value.priority && filters.value.priority.length > 0) {
      if (!filters.value.priority.includes(task.priority)) return false
    }
    
    // 执行人筛选
    if (filters.value.assignee) {
      if (!task.assigneeName.includes(filters.value.assignee)) return false
    }
    
    return true
  })
}

// 获取任务列表
async function fetchTasks() {
  loading.value = true
  try {
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 模拟数据
    tasks.value = generateMockTasks()
    
    ElMessage.success('任务列表加载成功')
  } catch (error) {
    console.error('获取任务列表失败:', error)
    ElMessage.error('获取任务列表失败')
  } finally {
    loading.value = false
  }
}

// 生成模拟数据
function generateMockTasks(): Task[] {
  const mockTasks: Task[] = []
  const statuses: Task['status'][] = ['pending', 'in_progress', 'completed', 'rejected']
  const priorities: Task['priority'][] = ['low', 'normal', 'high', 'urgent']
  const workflows = ['水质检测流程', '土壤检测流程', '食品检测流程', '药品检测流程']
  const nodes = ['样品前处理', '仪器检测', '数据分析', '结果审核', '报告编制']
  const assignees = ['张三', '李四', '王五', '赵六', '钱七']
  
  for (let i = 1; i <= 50; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const priority = priorities[Math.floor(Math.random() * priorities.length)]
    const workflow = workflows[Math.floor(Math.random() * workflows.length)]
    const node = nodes[Math.floor(Math.random() * nodes.length)]
    const assignee = assignees[Math.floor(Math.random() * assignees.length)]
    
    const createdAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
    const dueDate = new Date(createdAt.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000)
    
    mockTasks.push({
      id: `TASK-${String(i).padStart(4, '0')}`,
      sampleId: `SAMPLE-${String(i).padStart(4, '0')}`,
      sampleName: `样品-${i}`,
      sampleBarcode: `BC${String(i).padStart(8, '0')}`,
      workflowId: `WF-${Math.floor(Math.random() * 4) + 1}`,
      workflowName: workflow,
      nodeId: `NODE-${Math.floor(Math.random() * 5) + 1}`,
      nodeName: node,
      assignee: `USER-${Math.floor(Math.random() * 5) + 1}`,
      assigneeName: assignee,
      status,
      priority,
      dueDate: status !== 'completed' ? dueDate : undefined,
      startedAt: status !== 'pending' ? new Date(createdAt.getTime() + 60000) : undefined,
      completedAt: status === 'completed' ? new Date(createdAt.getTime() + 3600000) : undefined,
      createdAt
    })
  }
  
  return mockTasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

// 事件处理
function handleSearch() {
  pagination.value.currentPage = 1
  // 筛选逻辑已在 computed 中实现
}

function handleReset() {
  filters.value = {
    keyword: '',
    status: [],
    priority: [],
    assignee: ''
  }
  pagination.value.currentPage = 1
}

function handleRefresh() {
  fetchTasks()
}

function handleTabChange() {
  pagination.value.currentPage = 1
}

function handleSizeChange() {
  pagination.value.currentPage = 1
}

function handleCurrentChange() {
  // 分页变化已在 computed 中处理
}

function handleRowClick(row: Task) {
  handleViewTask(row.id)
}

function handleViewTask(taskId: string) {
  router.push({ name: 'task-detail', params: { id: taskId } })
}

function handleViewSample(sampleId: string) {
  router.push({ name: 'sample-detail', params: { id: sampleId } })
}

// 工具函数
function getStatusType(status: Task['status']): string {
  const typeMap = {
    pending: 'warning',
    in_progress: 'primary',
    completed: 'success',
    rejected: 'danger'
  }
  return typeMap[status] || 'info'
}

function getStatusLabel(status: Task['status']): string {
  const labelMap = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
    rejected: '已拒绝'
  }
  return labelMap[status] || status
}

function getPriorityType(priority: Task['priority']): string {
  const typeMap = {
    low: 'info',
    normal: '',
    high: 'warning',
    urgent: 'danger'
  }
  return typeMap[priority] || ''
}

function getPriorityLabel(priority: Task['priority']): string {
  const labelMap = {
    low: '低',
    normal: '普通',
    high: '高',
    urgent: '紧急'
  }
  return labelMap[priority] || priority
}

function formatDate(date: Date): string {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function isOverdue(dueDate: Date): boolean {
  return new Date(dueDate) < new Date()
}

// 生命周期
onMounted(() => {
  fetchTasks()
})
</script>

<style scoped>
.task-list-container {
  padding: 20px;
}

.header-card {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-section h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.action-section {
  display: flex;
  gap: 12px;
}

.filter-card {
  margin-bottom: 20px;
}

.button-group {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.content-card {
  min-height: 600px;
}

.tab-badge {
  margin-left: 8px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.overdue {
  color: #f56c6c;
  font-weight: 600;
}

:deep(.el-table__row) {
  cursor: pointer;
}

:deep(.el-table__row:hover) {
  background-color: #f5f7fa;
}
</style>
