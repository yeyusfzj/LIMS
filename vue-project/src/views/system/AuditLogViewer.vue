<template>
  <div class="audit-log-viewer">
    <!-- 搜索和筛选区域 -->
    <el-card class="filter-bar" shadow="never">
      <el-form :model="filters" :inline="true" label-width="100px">
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filters.dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            @change="handleSearch"
          />
        </el-form-item>
        <el-form-item label="用户">
          <el-select
            v-model="filters.userId"
            placeholder="请选择用户"
            clearable
            filterable
            @clear="handleSearch"
          >
            <el-option
              v-for="user in userList"
              :key="user.id"
              :label="user.name"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="操作类型">
          <el-select
            v-model="filters.action"
            placeholder="请选择操作类型"
            clearable
            @clear="handleSearch"
          >
            <el-option label="创建" value="create" />
            <el-option label="更新" value="update" />
            <el-option label="删除" value="delete" />
            <el-option label="查看" value="read" />
            <el-option label="登录" value="login" />
            <el-option label="登出" value="logout" />
            <el-option label="审核" value="audit" />
            <el-option label="放行" value="release" />
            <el-option label="分发" value="distribute" />
          </el-select>
        </el-form-item>
        <el-form-item label="资源类型">
          <el-select
            v-model="filters.resource"
            placeholder="请选择资源类型"
            clearable
            @clear="handleSearch"
          >
            <el-option label="样品" value="sample" />
            <el-option label="任务" value="task" />
            <el-option label="结果" value="result" />
            <el-option label="报告" value="report" />
            <el-option label="用户" value="user" />
            <el-option label="角色" value="role" />
            <el-option label="工作流" value="workflow" />
            <el-option label="检测方法" value="method" />
          </el-select>
        </el-form-item>
        <el-form-item label="资源ID">
          <el-input
            v-model="filters.resourceId"
            placeholder="请输入资源ID"
            clearable
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">
            搜索
          </el-button>
          <el-button :icon="Refresh" @click="handleReset">
            重置
          </el-button>
          <el-button :icon="Download" @click="handleExport">
            导出
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 日志列表表格 -->
    <el-card class="table-card" shadow="never">
      <el-table
        :data="tableData"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="timestamp" label="时间" width="180" fixed>
          <template #default="{ row }">
            {{ formatDateTime(row.timestamp) }}
          </template>
        </el-table-column>
        <el-table-column prop="userName" label="用户" width="120" />
        <el-table-column prop="action" label="操作类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getActionType(row.action)" size="small">
              {{ getActionLabel(row.action) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="resource" label="资源类型" width="120">
          <template #default="{ row }">
            {{ getResourceLabel(row.resource) }}
          </template>
        </el-table-column>
        <el-table-column prop="resourceId" label="资源ID" width="150" />
        <el-table-column prop="description" label="操作描述" min-width="200" />
        <el-table-column prop="ipAddress" label="IP地址" width="140" />
        <el-table-column prop="userAgent" label="用户代理" width="200" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small">
              {{ row.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleViewDetail(row)">
              查看详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页组件 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[20, 50, 100, 200]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 日志详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="日志详情"
      width="700px"
    >
      <el-descriptions :column="2" border v-if="currentLog">
        <el-descriptions-item label="日志ID" :span="2">
          {{ currentLog.id }}
        </el-descriptions-item>
        <el-descriptions-item label="时间">
          {{ formatDateTime(currentLog.timestamp) }}
        </el-descriptions-item>
        <el-descriptions-item label="用户">
          {{ currentLog.userName }} ({{ currentLog.userId }})
        </el-descriptions-item>
        <el-descriptions-item label="操作类型">
          <el-tag :type="getActionType(currentLog.action)" size="small">
            {{ getActionLabel(currentLog.action) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="currentLog.status === 'success' ? 'success' : 'danger'" size="small">
            {{ currentLog.status === 'success' ? '成功' : '失败' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="资源类型">
          {{ getResourceLabel(currentLog.resource) }}
        </el-descriptions-item>
        <el-descriptions-item label="资源ID">
          {{ currentLog.resourceId }}
        </el-descriptions-item>
        <el-descriptions-item label="操作描述" :span="2">
          {{ currentLog.description }}
        </el-descriptions-item>
        <el-descriptions-item label="IP地址">
          {{ currentLog.ipAddress }}
        </el-descriptions-item>
        <el-descriptions-item label="用户代理" :span="2">
          {{ currentLog.userAgent }}
        </el-descriptions-item>
        <el-descriptions-item label="变更内容" :span="2" v-if="currentLog.changes">
          <el-scrollbar max-height="300px">
            <pre class="changes-content">{{ JSON.stringify(currentLog.changes, null, 2) }}</pre>
          </el-scrollbar>
        </el-descriptions-item>
        <el-descriptions-item label="错误信息" :span="2" v-if="currentLog.error">
          <el-alert :title="currentLog.error" type="error" :closable="false" />
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Search,
  Refresh,
  Download
} from '@element-plus/icons-vue'

// 审计日志接口
interface AuditLog {
  id: string
  userId: string
  userName: string
  action: string
  resource: string
  resourceId: string
  description: string
  changes?: Record<string, any>
  ipAddress: string
  userAgent: string
  timestamp: Date
  status: 'success' | 'failure'
  error?: string
}

// 用户选项接口
interface UserOption {
  id: string
  name: string
}

// 筛选条件
const filters = reactive({
  dateRange: null as [string, string] | null,
  userId: '',
  action: '',
  resource: '',
  resourceId: ''
})

// 分页配置
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 表格数据
const tableData = ref<AuditLog[]>([])
const loading = ref(false)
const selectedLogs = ref<AuditLog[]>([])

// 对话框相关
const detailDialogVisible = ref(false)
const currentLog = ref<AuditLog | null>(null)

// 用户列表
const userList = ref<UserOption[]>([
  { id: '1', name: '系统管理员' },
  { id: '2', name: '张三' },
  { id: '3', name: '李四' },
  { id: '4', name: '王五' },
  { id: '5', name: '赵六' }
])

// 模拟日志数据
const mockLogs: AuditLog[] = [
  {
    id: 'log-001',
    userId: '2',
    userName: '张三',
    action: 'create',
    resource: 'sample',
    resourceId: 'S2024010001',
    description: '创建样品：水质样品-A',
    changes: {
      name: '水质样品-A',
      source: '某河流',
      client: '环保局'
    },
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    timestamp: new Date('2024-01-23 09:15:30'),
    status: 'success'
  },
  {
    id: 'log-002',
    userId: '3',
    userName: '李四',
    action: 'update',
    resource: 'result',
    resourceId: 'R2024010001',
    description: '更新检测结果',
    changes: {
      before: { value: 5.2 },
      after: { value: 5.5 }
    },
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    timestamp: new Date('2024-01-23 10:30:15'),
    status: 'success'
  },
  {
    id: 'log-003',
    userId: '4',
    userName: '王五',
    action: 'audit',
    resource: 'sample',
    resourceId: 'S2024010002',
    description: '审核样品检测结果',
    changes: {
      status: 'approved',
      comments: '检测结果符合标准'
    },
    ipAddress: '192.168.1.102',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    timestamp: new Date('2024-01-23 11:45:20'),
    status: 'success'
  },
  {
    id: 'log-004',
    userId: '5',
    userName: '赵六',
    action: 'distribute',
    resource: 'report',
    resourceId: 'RPT-2024-001',
    description: '分发检测报告',
    changes: {
      recipients: ['client@example.com'],
      method: 'email'
    },
    ipAddress: '192.168.1.103',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    timestamp: new Date('2024-01-23 14:20:45'),
    status: 'success'
  },
  {
    id: 'log-005',
    userId: '1',
    userName: '系统管理员',
    action: 'create',
    resource: 'user',
    resourceId: 'U-006',
    description: '创建新用户：孙七',
    changes: {
      username: 'sunqi',
      fullName: '孙七',
      roles: ['检测员']
    },
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    timestamp: new Date('2024-01-23 15:10:00'),
    status: 'success'
  },
  {
    id: 'log-006',
    userId: '2',
    userName: '张三',
    action: 'delete',
    resource: 'sample',
    resourceId: 'S2024010003',
    description: '删除样品',
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    timestamp: new Date('2024-01-23 16:05:30'),
    status: 'failure',
    error: '样品已关联检测任务,无法删除'
  },
  {
    id: 'log-007',
    userId: '3',
    userName: '李四',
    action: 'login',
    resource: 'system',
    resourceId: 'login',
    description: '用户登录系统',
    ipAddress: '192.168.1.101',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    timestamp: new Date('2024-01-23 08:30:00'),
    status: 'success'
  },
  {
    id: 'log-008',
    userId: '4',
    userName: '王五',
    action: 'release',
    resource: 'sample',
    resourceId: 'S2024010004',
    description: '放行样品',
    changes: {
      status: 'released',
      releaseDate: '2024-01-23'
    },
    ipAddress: '192.168.1.102',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    timestamp: new Date('2024-01-23 17:30:00'),
    status: 'success'
  }
]

// 获取日志列表
const fetchLogs = (resetPage: boolean = false) => {
  loading.value = true
  
  // 只在搜索/重置时重置页码
  if (resetPage) {
    pagination.currentPage = 1
  }
  
  setTimeout(() => {
    let filteredData = [...mockLogs]
    
    if (filters.dateRange && filters.dateRange.length === 2) {
      const [startDate, endDate] = filters.dateRange
      filteredData = filteredData.filter(item => {
        const timestamp = new Date(item.timestamp).getTime()
        return timestamp >= new Date(startDate).getTime() && 
               timestamp <= new Date(endDate).getTime()
      })
    }
    
    if (filters.userId) {
      filteredData = filteredData.filter(item => item.userId === filters.userId)
    }
    
    if (filters.action) {
      filteredData = filteredData.filter(item => item.action === filters.action)
    }
    
    if (filters.resource) {
      filteredData = filteredData.filter(item => item.resource === filters.resource)
    }
    
    if (filters.resourceId) {
      filteredData = filteredData.filter(item =>
        item.resourceId.toLowerCase().includes(filters.resourceId.toLowerCase())
      )
    }
    
    // 按时间倒序排列
    filteredData.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    
    pagination.total = filteredData.length
    
    const start = (pagination.currentPage - 1) * pagination.pageSize
    const end = start + pagination.pageSize
    tableData.value = filteredData.slice(start, end)
    
    loading.value = false
  }, 500)
}

// 搜索
const handleSearch = () => {
  fetchLogs(true)
}

// 重置
const handleReset = () => {
  filters.dateRange = null
  filters.userId = ''
  filters.action = ''
  filters.resource = ''
  filters.resourceId = ''
  fetchLogs(true)
}

// 导出
const handleExport = () => {
  if (selectedLogs.value.length === 0) {
    ElMessage.warning('请先选择要导出的日志')
    return
  }
  ElMessage.success(`已选择 ${selectedLogs.value.length} 条日志进行导出`)
  // TODO: 实现导出功能
}

// 查看详情
const handleViewDetail = (row: AuditLog) => {
  currentLog.value = row
  detailDialogVisible.value = true
}

// 选择变化
const handleSelectionChange = (selection: AuditLog[]) => {
  selectedLogs.value = selection
}

// 分页大小变化
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  fetchLogs()
}

// 当前页变化
const handleCurrentChange = (page: number) => {
  pagination.currentPage = page
  fetchLogs()
}

// 获取操作类型标签类型
const getActionType = (action: string) => {
  const typeMap: Record<string, any> = {
    create: 'success',
    update: 'warning',
    delete: 'danger',
    read: 'info',
    login: '',
    logout: '',
    audit: 'warning',
    release: 'success',
    distribute: 'success'
  }
  return typeMap[action] || ''
}

// 获取操作类型标签文本
const getActionLabel = (action: string) => {
  const labelMap: Record<string, string> = {
    create: '创建',
    update: '更新',
    delete: '删除',
    read: '查看',
    login: '登录',
    logout: '登出',
    audit: '审核',
    release: '放行',
    distribute: '分发'
  }
  return labelMap[action] || action
}

// 获取资源类型标签文本
const getResourceLabel = (resource: string) => {
  const labelMap: Record<string, string> = {
    sample: '样品',
    task: '任务',
    result: '结果',
    report: '报告',
    user: '用户',
    role: '角色',
    workflow: '工作流',
    method: '检测方法',
    system: '系统'
  }
  return labelMap[resource] || resource
}

// 格式化日期时间
const formatDateTime = (date: Date | string) => {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 组件挂载时获取数据
onMounted(() => {
  fetchLogs()
})
</script>

<style scoped>
.audit-log-viewer {
  padding: 20px;
}

.filter-bar {
  margin-bottom: 20px;
}

.table-card {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.changes-content {
  background-color: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: #606266;
  margin: 0;
}

:deep(.el-card__body) {
  padding: 20px;
}

:deep(.el-form--inline .el-form-item) {
  margin-right: 20px;
  margin-bottom: 10px;
}

:deep(.el-descriptions__body .el-descriptions__table) {
  table-layout: fixed;
}

:deep(.el-descriptions__label) {
  width: 120px;
}
</style>
