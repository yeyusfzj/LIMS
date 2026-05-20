<template>
  <div class="audit-task-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="title">审核任务列表</span>
          <el-button
            v-if="isAdmin"
            type="primary"
            :icon="Setting"
            @click="handleOpenSettings"
          >
            设置
          </el-button>
        </div>
      </template>

      <!-- 筛选区域 -->
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item label="审核级别">
          <el-select v-model="filters.level" placeholder="全部级别" clearable style="width: 150px">
            <el-option label="分析审核" :value="1" />
            <el-option label="样品审核" :value="2" />
            <el-option label="技术审核" :value="3" />
            <el-option label="质量审核" :value="4" />
          </el-select>
        </el-form-item>

        <el-form-item label="审核状态">
          <el-select v-model="filters.status" placeholder="全部状态" clearable style="width: 150px">
            <el-option label="待审核" value="PENDING" />
            <el-option label="审核中" value="IN_PROGRESS" />
            <el-option label="已通过" value="APPROVED" />
            <el-option label="已退回" value="REJECTED" />
          </el-select>
        </el-form-item>

        <el-form-item label="任务名称">
          <el-input
            v-model="filters.taskName"
            placeholder="输入任务名称"
            clearable
            style="width: 200px"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>

      <!-- 统计信息 -->
      <div class="statistics">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-statistic title="待审核任务" :value="statistics.pending">
              <template #suffix>
                <span class="statistic-unit">个</span>
              </template>
            </el-statistic>
          </el-col>
          <el-col :span="6">
            <el-statistic title="今日已审核" :value="statistics.todayCompleted">
              <template #suffix>
                <span class="statistic-unit">个</span>
              </template>
            </el-statistic>
          </el-col>
          <el-col :span="6">
            <el-statistic title="本周已审核" :value="statistics.weekCompleted">
              <template #suffix>
                <span class="statistic-unit">个</span>
              </template>
            </el-statistic>
          </el-col>
          <el-col :span="6">
            <el-statistic title="审核通过率" :value="statistics.approvalRate" :precision="1">
              <template #suffix>
                <span class="statistic-unit">%</span>
              </template>
            </el-statistic>
          </el-col>
        </el-row>
      </div>

      <!-- 错误提示 -->
      <el-alert
        v-if="error"
        :title="error"
        type="error"
        :closable="false"
        style="margin-bottom: 20px"
      />

      <!-- 任务列表 -->
      <el-table
        :data="auditTasks"
        v-loading="loading"
        stripe
        style="width: 100%; margin-top: 20px"
      >
        <el-table-column prop="id" label="审核任务ID" width="280" show-overflow-tooltip />
        
        <el-table-column label="任务名称" width="200">
          <template #default="{ row }">
            <div>
              <div><strong>{{ row.task?.nodeName || '未知任务' }}</strong></div>
              <div class="text-secondary">{{ row.task?.nodeType || '-' }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="任务ID" width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.task?.id || '-' }}
          </template>
        </el-table-column>

        <el-table-column label="任务状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getTaskStatusTagType(row.task?.status)" size="small">
              {{ getTaskStatusText(row.task?.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="任务执行人" width="150">
          <template #default="{ row }">
            {{ row.task?.assignedTo || '未分配' }}
          </template>
        </el-table-column>

        <el-table-column label="任务完成时间" width="160">
          <template #default="{ row }">
            {{ row.task?.completedAt ? formatDateTime(row.task.completedAt) : '-' }}
          </template>
        </el-table-column>

        <el-table-column label="审核级别" width="110">
          <template #default="{ row }">
            <el-tag :type="getLevelTagType(row.level)">
              {{ row.levelName }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="审核状态" width="110">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="审核人" width="120">
          <template #default="{ row }">
            {{ row.auditorId || '未分配' }}
          </template>
        </el-table-column>

        <el-table-column label="提交审核时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.submittedAt) }}
          </template>
        </el-table-column>

        <el-table-column label="任务优先级" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.task?.priority === 'URGENT'" type="danger" size="small">紧急</el-tag>
            <el-tag v-else-if="row.task?.priority === 'HIGH'" type="warning" size="small">高</el-tag>
            <el-tag v-else type="info" size="small">普通</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="handleViewDetail(row)"
            >
              查看详情
            </el-button>
            <el-button
              v-if="row.status === 'PENDING' || row.status === 'pending'"
              type="success"
              size="small"
              @click="handleExecute(row)"
            >
              执行审核
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="pagination.currentPage"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        style="margin-top: 20px; justify-content: flex-end"
      />
    </el-card>

    <!-- 设置对话框 -->
    <SettingsDialog
      v-model:visible="settingsDialogVisible"
      @saved="handleSettingsSaved"
    />

    <!-- 审核对话框 -->
    <el-dialog
      v-model="auditDialogVisible"
      title="执行审核"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="auditForm" :rules="auditRules" ref="auditFormRef" label-width="100px">
        <el-form-item label="审核任务ID">
          <el-text>{{ currentTask?.id }}</el-text>
        </el-form-item>
        
        <el-form-item label="任务信息">
          <div>
            <div><strong>{{ currentTask?.task?.nodeName || '未知任务' }}</strong></div>
            <div class="text-secondary">任务ID: {{ currentTask?.task?.id }}</div>
            <div class="text-secondary">任务类型: {{ currentTask?.task?.nodeType }}</div>
            <div class="text-secondary">执行人: {{ currentTask?.task?.assignedTo }}</div>
          </div>
        </el-form-item>

        <el-form-item label="审核意见" prop="comments">
          <div class="comments-input-wrapper">
            <el-input
              v-model="auditForm.comments"
              type="textarea"
              :rows="4"
              placeholder="请输入审核意见"
              maxlength="500"
              show-word-limit
            />
            <TemplateSelector
              v-if="canUseTemplate"
              :show-search="true"
              @select="handleTemplateSelect"
            />
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button
            type="success"
            @click="handleApprove"
            :loading="submitting"
          >
            <el-icon><Check /></el-icon>
            通过
          </el-button>
          <el-button
            type="danger"
            @click="handleReject"
            :loading="submitting"
          >
            <el-icon><Close /></el-icon>
            退回
          </el-button>
          <el-button
            type="warning"
            @click="handleReturn"
            :loading="submitting"
          >
            <el-icon><Warning /></el-icon>
            要求补充
          </el-button>
          <el-button @click="auditDialogVisible = false">
            取消
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Search, Refresh, Setting, Check, Close, Warning } from '@element-plus/icons-vue'
import type { AuditTask } from '@/types/audit'
import { auditService } from '@/services/auditService'
import { useAuthStore } from '@/stores/auth'
import SettingsDialog from '@/components/audit/SettingsDialog.vue'
import TemplateSelector from '@/components/audit/TemplateSelector.vue'
import type { CommentTemplate } from '@/stores/template'
import type { AuditDecision } from '@/types/audit'

const router = useRouter()
const authStore = useAuthStore()

// 权限判断
const isAdmin = computed(() => {
  return authStore.hasAnyRole(['admin', 'audit_admin', 'quality_manager'])
})

const canUseTemplate = computed(() => {
  return authStore.hasAnyRole(['auditor', 'senior_auditor', 'audit_supervisor', 'admin'])
})

// 设置对话框
const settingsDialogVisible = ref(false)

// 审核对话框
const auditDialogVisible = ref(false)
const currentTask = ref<AuditTask | null>(null)
const auditFormRef = ref<FormInstance>()
const submitting = ref(false)

// 审核表单
const auditForm = reactive({
  comments: ''
})

// 表单验证规则
const auditRules: FormRules = {
  comments: [
    { required: true, message: '请输入审核意见', trigger: 'blur' },
    { min: 5, message: '审核意见至少5个字符', trigger: 'blur' }
  ]
}

// 筛选条件
const filters = reactive({
  level: null as number | null,
  status: '' as string,
  taskName: ''
})

// 统计信息
const statistics = reactive({
  pending: 0,
  todayCompleted: 0,
  weekCompleted: 0,
  approvalRate: 0
})

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 数据
const loading = ref(false)
const error = ref('')
const auditTasks = ref<AuditTask[]>([])

// 获取审核级别标签类型
const getLevelTagType = (level: number) => {
  const types = ['', 'success', 'primary', 'warning', 'danger']
  return types[level] || 'info'
}

// 获取任务状态标签类型
const getTaskStatusTagType = (status: string) => {
  const typeMap: Record<string, string> = {
    PENDING: 'info',
    IN_PROGRESS: 'warning',
    COMPLETED: 'success',
    REJECTED: 'danger',
    CANCELLED: 'info'
  }
  return typeMap[status] || 'info'
}

// 获取任务状态文本
const getTaskStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    PENDING: '待执行',
    IN_PROGRESS: '执行中',
    COMPLETED: '已完成',
    REJECTED: '已拒绝',
    CANCELLED: '已取消'
  }
  return textMap[status] || status
}

// 获取状态标签类型
const getStatusTagType = (status: string) => {
  const typeMap: Record<string, string> = {
    pending: 'warning',
    PENDING: 'warning',
    approved: 'success',
    APPROVED: 'success',
    rejected: 'danger',
    REJECTED: 'danger',
    returned: 'info',
    IN_PROGRESS: 'primary'
  }
  return typeMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    pending: '待审核',
    PENDING: '待审核',
    approved: '已通过',
    APPROVED: '已通过',
    rejected: '已退回',
    REJECTED: '已退回',
    returned: '要求补充',
    IN_PROGRESS: '审核中'
  }
  return textMap[status] || status
}

// 格式化日期时间
const formatDateTime = (date: Date | string) => {
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

// 格式化日期
const formatDate = (date: Date | string) => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 加载审核任务列表
const loadAuditTasks = async () => {
  loading.value = true
  error.value = ''
  try {
    const params = {
      level: filters.level || undefined,
      status: filters.status || undefined,
      taskName: filters.taskName || undefined,
      page: pagination.currentPage,
      pageSize: pagination.pageSize
    }
    
    const response = await auditService.listAuditTasks(params)
    
    if (response.success) {
      auditTasks.value = response.data || []
      pagination.total = response.pagination?.total || 0
      
      // 同时获取统计信息
      try {
        const stats = await auditService.getAuditStatistics()
        Object.assign(statistics, stats)
      } catch (statsError) {
        console.warn('获取统计信息失败:', statsError)
        // 统计信息获取失败不影响主要功能
      }
    } else {
      throw new Error(response.message || '获取审核任务失败')
    }
    
  } catch (error: any) {
    console.error('加载审核任务失败:', error)
    const errorMessage = error?.response?.data?.message || error?.message || '加载审核任务失败'
    ElMessage.error(errorMessage)
    error.value = errorMessage
    auditTasks.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// 查询
const handleSearch = () => {
  pagination.currentPage = 1
  loadAuditTasks()
}

// 重置
const handleReset = () => {
  filters.level = null
  filters.status = ''
  filters.taskName = ''
  pagination.currentPage = 1
  loadAuditTasks()
}

// 查看详情
const handleViewDetail = (task: AuditTask) => {
  router.push({
    name: 'AuditTaskDetail',
    params: { id: task.id }
  })
}

// 打开审核对话框
const handleAudit = (task: AuditTask) => {
  currentTask.value = task
  auditForm.comments = ''
  auditDialogVisible.value = true
}

// 执行审核 - 跳转到审核执行页面
const handleExecute = (task: AuditTask) => {
  router.push({
    name: 'audit-execute',
    query: { taskId: task.id }
  })
}

// 选择模板
const handleTemplateSelect = (template: CommentTemplate) => {
  if (auditForm.comments) {
    auditForm.comments += '\n' + template.content
  } else {
    auditForm.comments = template.content
  }
  ElMessage.success('模板已插入')
}

// 通过审核
const handleApprove = async () => {
  if (!auditFormRef.value || !currentTask.value) return
  
  try {
    await auditFormRef.value.validate()
    
    await ElMessageBox.confirm(
      '确认通过此审核任务？',
      '通过审核',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'success'
      }
    )
    
    submitting.value = true
    
    const decision: AuditDecision = {
      taskId: currentTask.value.id,
      decision: 'approved',
      comments: auditForm.comments
    }
    
    const result = await auditService.performAudit(currentTask.value.id, decision)
    
    if (result.success) {
      ElMessage.success(result.message || '审核通过成功')
      auditDialogVisible.value = false
      await loadAuditTasks()
    } else {
      throw new Error(result.message || '审核操作失败')
    }
    
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('审核通过失败:', error)
      const errorMessage = error?.response?.data?.message || error?.message || '操作失败'
      ElMessage.error(errorMessage)
    }
  } finally {
    submitting.value = false
  }
}

// 退回
const handleReject = async () => {
  if (!auditFormRef.value || !currentTask.value) return
  
  try {
    await auditFormRef.value.validate()
    
    await ElMessageBox.confirm(
      '确认退回此审核任务？退回后需要重新提交审核。',
      '退回审核',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    submitting.value = true
    
    const decision: AuditDecision = {
      taskId: currentTask.value.id,
      decision: 'rejected',
      comments: auditForm.comments
    }
    
    const result = await auditService.performAudit(currentTask.value.id, decision)
    
    if (result.success) {
      ElMessage.success(result.message || '审核退回成功')
      auditDialogVisible.value = false
      await loadAuditTasks()
    } else {
      throw new Error(result.message || '审核操作失败')
    }
    
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('审核退回失败:', error)
      const errorMessage = error?.response?.data?.message || error?.message || '操作失败'
      ElMessage.error(errorMessage)
    }
  } finally {
    submitting.value = false
  }
}

// 要求补充
const handleReturn = async () => {
  if (!auditFormRef.value || !currentTask.value) return
  
  try {
    await auditFormRef.value.validate()
    
    await ElMessageBox.confirm(
      '确认要求补充信息？操作人员将收到通知。',
      '要求补充',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    submitting.value = true
    
    const decision: AuditDecision = {
      taskId: currentTask.value.id,
      decision: 'returned',
      comments: auditForm.comments
    }
    
    const result = await auditService.performAudit(currentTask.value.id, decision)
    
    if (result.success) {
      ElMessage.success(result.message || '已要求补充信息')
      auditDialogVisible.value = false
      await loadAuditTasks()
    } else {
      throw new Error(result.message || '审核操作失败')
    }
    
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('要求补充失败:', error)
      const errorMessage = error?.response?.data?.message || error?.message || '操作失败'
      ElMessage.error(errorMessage)
    }
  } finally {
    submitting.value = false
  }
}

// 分页处理
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  loadAuditTasks()
}

const handleCurrentChange = (page: number) => {
  pagination.currentPage = page
  loadAuditTasks()
}

// 打开设置对话框
const handleOpenSettings = () => {
  settingsDialogVisible.value = true
}

// 设置保存后的处理
const handleSettingsSaved = () => {
  ElMessage.success('设置已保存')
  // 可以选择刷新任务列表
  loadAuditTasks()
}

// 初始化
onMounted(() => {
  loadAuditTasks()
})
</script>

<style scoped>
.audit-task-list {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 18px;
  font-weight: bold;
}

.filter-form {
  margin-bottom: 20px;
}

.statistics {
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 20px;
}

.statistic-unit {
  font-size: 14px;
  color: #909399;
  margin-left: 4px;
}

.text-secondary {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.comments-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.dialog-footer {
  display: flex;
  justify-content: center;
  gap: 12px;
}
</style>
