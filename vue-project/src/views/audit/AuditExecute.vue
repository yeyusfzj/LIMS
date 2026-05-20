<template>
  <div class="audit-execute">
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="title">审核执行</span>
          <el-button @click="handleBack">
            <el-icon><Back /></el-icon>
            返回列表
          </el-button>
        </div>
      </template>

      <!-- 错误提示 -->
      <el-alert
        v-if="error"
        :title="error"
        type="error"
        :closable="false"
        style="margin-bottom: 20px"
      />

      <!-- 加载中 -->
      <div v-if="loading" v-loading="loading" style="min-height: 400px"></div>

      <!-- 审核任务信息 -->
      <div v-else-if="currentTask" class="audit-content">
        <!-- 任务基本信息 -->
        <el-descriptions title="审核任务信息" :column="2" border>
          <el-descriptions-item label="任务编号">
            {{ currentTask.id }}
          </el-descriptions-item>
          <el-descriptions-item label="审核级别">
            <el-tag :type="getLevelTagType(currentTask.level)">
              {{ currentTask.levelName }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="审核状态">
            <el-tag :type="getStatusTagType(currentTask.status)">
              {{ getStatusText(currentTask.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="优先级">
            <el-tag v-if="currentTask.priority === 'urgent'" type="danger" size="small">紧急</el-tag>
            <el-tag v-else-if="currentTask.priority === 'high'" type="warning" size="small">高</el-tag>
            <el-tag v-else type="info" size="small">普通</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="审核人">
            {{ currentTask.auditorName || currentTask.auditor }}
          </el-descriptions-item>
          <el-descriptions-item label="提交时间">
            {{ formatDateTime(currentTask.submittedAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 样品信息 -->
        <el-card class="mt-20" shadow="never">
          <template #header>
            <span>样品信息</span>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="样品条码">
              {{ currentTask.task?.instance?.sample?.barcode || currentTask.sampleBarcode || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="样品名称">
              {{ currentTask.task?.instance?.sample?.sampleName || currentTask.sampleName || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="样品类型">
              {{ currentTask.task?.instance?.sample?.sampleType || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="样品分类">
              {{ currentTask.task?.instance?.sample?.sampleCategory || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="客户名称">
              {{ currentTask.task?.instance?.sample?.clientName || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="客户联系方式">
              {{ currentTask.task?.instance?.sample?.clientContact || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="采样日期">
              {{ currentTask.task?.instance?.sample?.samplingDate ? formatDate(currentTask.task.instance.sample.samplingDate) : '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="接收日期">
              {{ currentTask.task?.instance?.sample?.receivedDate ? formatDate(currentTask.task.instance.sample.receivedDate) : '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="采样地点">
              {{ currentTask.task?.instance?.sample?.samplingLocation || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="采样人">
              {{ currentTask.task?.instance?.sample?.samplingPerson || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="存储位置">
              {{ currentTask.task?.instance?.sample?.storageLocation || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="存储条件">
              {{ currentTask.task?.instance?.sample?.storageCondition || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="样品状态">
              <el-tag :type="getSampleStatusType(currentTask.task?.instance?.sample?.status)">
                {{ getSampleStatusText(currentTask.task?.instance?.sample?.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="样品优先级">
              <el-tag v-if="currentTask.task?.instance?.sample?.priority === 'URGENT'" type="danger" size="small">紧急</el-tag>
              <el-tag v-else-if="currentTask.task?.instance?.sample?.priority === 'HIGH'" type="warning" size="small">高</el-tag>
              <el-tag v-else type="info" size="small">普通</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="样品描述" :span="2">
              {{ currentTask.task?.instance?.sample?.description || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="备注" :span="2" v-if="currentTask.task?.instance?.sample?.remarks">
              {{ currentTask.task.instance.sample.remarks }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <!-- 检测结果 -->
        <el-card class="mt-20" shadow="never">
          <template #header>
            <span>检测结果</span>
          </template>
          <el-table
            :data="testResults"
            border
            stripe
            v-loading="loadingResults"
          >
            <el-table-column prop="testItemName" label="检测项目" width="200" />
            <el-table-column prop="value" label="检测值" width="120" />
            <el-table-column prop="unit" label="单位" width="80" />
            <el-table-column prop="method" label="检测方法" min-width="150" show-overflow-tooltip />
            <el-table-column label="异常标记" width="100">
              <template #default="{ row }">
                <el-tag v-if="row.isAnomaly" type="danger" size="small">异常</el-tag>
                <el-tag v-else type="success" size="small">正常</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="operator" label="操作人" width="120" />
            <el-table-column label="录入时间" width="180">
              <template #default="{ row }">
                {{ formatDateTime(row.timestamp) }}
              </template>
            </el-table-column>
          </el-table>
        </el-card>

        <!-- 审核意见表单 -->
        <el-card class="mt-20" shadow="never" v-if="currentTask.status === 'pending'">
          <template #header>
            <span>审核意见</span>
          </template>
          <el-form
            ref="auditFormRef"
            :model="auditForm"
            :rules="auditRules"
            label-width="100px"
          >
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

          <div class="action-buttons">
            <el-button
              type="success"
              size="large"
              @click="handleApprove"
              :loading="submitting"
            >
              <el-icon><Check /></el-icon>
              通过
            </el-button>
            <el-button
              type="danger"
              size="large"
              @click="handleReject"
              :loading="submitting"
            >
              <el-icon><Close /></el-icon>
              退回
            </el-button>
            <el-button
              type="warning"
              size="large"
              @click="handleReturn"
              :loading="submitting"
            >
              <el-icon><Warning /></el-icon>
              要求补充
            </el-button>
          </div>
        </el-card>

        <!-- 审核历史 -->
        <el-card class="mt-20" shadow="never" v-if="auditHistory.length > 0">
          <template #header>
            <span>审核历史</span>
          </template>
          <el-timeline>
            <el-timeline-item
              v-for="record in auditHistory"
              :key="record.id"
              :timestamp="formatDateTime(record.timestamp)"
              placement="top"
            >
              <el-card>
                <div class="history-item">
                  <div class="history-header">
                    <span class="history-operator">{{ record.operator }}</span>
                    <el-tag :type="getHistoryTagType(record.result)" size="small">
                      {{ record.result }}
                    </el-tag>
                  </div>
                  <div class="history-level">审核级别: {{ record.levelName }}</div>
                  <div class="history-comments" v-if="record.comments">
                    意见: {{ record.comments }}
                  </div>
                </div>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </div>

      <!-- 无数据提示 -->
      <el-empty v-else description="未找到审核任务" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Back, Check, Close, Warning } from '@element-plus/icons-vue'
import type { AuditTask, AuditDecision } from '@/types/audit'
import { auditService } from '@/services/auditService'
import { useAuthStore } from '@/stores/auth'
import TemplateSelector from '@/components/audit/TemplateSelector.vue'
import type { CommentTemplate } from '@/stores/template'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// 权限判断
const canUseTemplate = computed(() => {
  return authStore.hasAnyRole(['auditor', 'senior_auditor', 'audit_supervisor', 'admin'])
})

// 数据
const loading = ref(false)
const loadingResults = ref(false)
const error = ref('')
const currentTask = ref<AuditTask | null>(null)
const testResults = ref<any[]>([])
const auditHistory = ref<any[]>([])

// 审核表单
const auditFormRef = ref<FormInstance>()
const submitting = ref(false)
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

// 获取审核级别标签类型
const getLevelTagType = (level: number) => {
  const types = ['', 'success', 'primary', 'warning', 'danger']
  return types[level] || 'info'
}

// 获取状态标签类型
const getStatusTagType = (status: string) => {
  const typeMap: Record<string, string> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    returned: 'info'
  }
  return typeMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已退回',
    returned: '要求补充'
  }
  return textMap[status] || status
}

// 获取历史记录标签类型
const getHistoryTagType = (result: string) => {
  if (!result) return 'info'
  const typeMap: Record<string, string> = {
    approved: 'success',
    rejected: 'danger',
    returned: 'warning'
  }
  return typeMap[result.toLowerCase()] || 'info'
}

// 获取样品状态类型
const getSampleStatusType = (status: string) => {
  if (!status) return 'info'
  const typeMap: Record<string, string> = {
    REGISTERED: 'info',
    IN_TESTING: 'warning',
    TESTING_COMPLETE: 'primary',
    IN_AUDIT: 'warning',
    AUDIT_COMPLETE: 'success',
    RELEASED: 'success',
    ARCHIVED: 'info'
  }
  return typeMap[status] || 'info'
}

// 获取样品状态文本
const getSampleStatusText = (status: string) => {
  if (!status) return '-'
  const textMap: Record<string, string> = {
    REGISTERED: '已登记',
    IN_TESTING: '检测中',
    TESTING_COMPLETE: '检测完成',
    IN_AUDIT: '审核中',
    AUDIT_COMPLETE: '审核完成',
    RELEASED: '已放行',
    ARCHIVED: '已归档'
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

// 加载审核任务详情
const loadAuditTask = async (taskId: string) => {
  console.log('[AuditExecute] 开始加载审核任务，taskId:', taskId)
  loading.value = true
  error.value = ''
  try {
    console.log('[AuditExecute] 调用 auditService.getAuditTask...')
    currentTask.value = await auditService.getAuditTask(taskId)
    console.log('[AuditExecute] 获取到审核任务:', currentTask.value)
    
    // 加载检测结果
    console.log('[AuditExecute] 加载检测结果...')
    await loadTestResults(taskId)
    console.log('[AuditExecute] 检测结果加载完成，数量:', testResults.value.length)
    
    // 加载审核历史
    console.log('[AuditExecute] 加载审核历史...')
    await loadAuditHistory(taskId)
    console.log('[AuditExecute] 审核历史加载完成，数量:', auditHistory.value.length)
    
    console.log('[AuditExecute] 所有数据加载完成')
  } catch (err: any) {
    console.error('[AuditExecute] 加载审核任务失败:', err)
    console.error('[AuditExecute] 错误详情:', {
      message: err?.message,
      response: err?.response?.data,
      stack: err?.stack
    })
    const errorMessage = err?.response?.data?.message || err?.message || '加载审核任务失败'
    error.value = errorMessage
    ElMessage.error(errorMessage)
  } finally {
    loading.value = false
    console.log('[AuditExecute] loading 设置为 false，currentTask:', currentTask.value ? '有数据' : '无数据')
  }
}

// 加载检测结果
const loadTestResults = async (taskId: string) => {
  loadingResults.value = true
  try {
    console.log('[loadTestResults] 开始加载检测结果')
    console.log('[loadTestResults] currentTask.value:', currentTask.value)
    console.log('[loadTestResults] currentTask.value.task:', currentTask.value?.task)
    console.log('[loadTestResults] currentTask.value.task.instance:', currentTask.value?.task?.instance)
    console.log('[loadTestResults] currentTask.value.task.instance.sample:', currentTask.value?.task?.instance?.sample)
    console.log('[loadTestResults] currentTask.value.task.instance.sample.results:', currentTask.value?.task?.instance?.sample?.results)
    
    // 从嵌套结构中获取检测结果
    if (currentTask.value?.task?.instance?.sample?.results) {
      const results = currentTask.value.task.instance.sample.results
      console.log('[loadTestResults] 找到检测结果，数量:', results.length)
      
      testResults.value = results.map((result: any) => ({
        id: result.id,
        testItemName: result.parameter || '未知项目',
        value: result.value !== undefined && result.value !== null ? result.value : result.textValue,
        unit: result.unit || '',
        method: result.method || '',
        source: result.source?.toLowerCase() || 'manual',
        operator: result.enteredBy || result.operator || '',
        timestamp: result.enteredAt || result.timestamp,
        isAnomaly: result.isAbnormal || result.isAnomaly || false
      }))
      
      console.log('[loadTestResults] 检测结果已映射:', testResults.value)
    } else {
      console.log('[loadTestResults] 未找到检测结果数据')
      testResults.value = []
    }
  } catch (err: any) {
    console.error('[loadTestResults] 加载检测结果失败:', err)
    testResults.value = []
  } finally {
    loadingResults.value = false
  }
}

// 加载审核历史
const loadAuditHistory = async (taskId: string) => {
  try {
    auditHistory.value = await auditService.getAuditHistory(taskId)
  } catch (err: any) {
    console.warn('加载审核历史失败:', err)
    // 审核历史加载失败不影响主要功能
  }
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
      decision: 'APPROVE',
      comments: auditForm.comments
    }
    
    const result = await auditService.performAudit(currentTask.value.id, decision)
    
    if (result.success) {
      ElMessage.success(result.message || '审核通过成功')
      // 返回列表
      router.push({ name: 'AuditTaskList' })
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
      decision: 'REJECT',
      comments: auditForm.comments
    }
    
    const result = await auditService.performAudit(currentTask.value.id, decision)
    
    if (result.success) {
      ElMessage.success(result.message || '审核退回成功')
      // 返回列表
      router.push({ name: 'AuditTaskList' })
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
      decision: 'RETURN',
      comments: auditForm.comments
    }
    
    const result = await auditService.performAudit(currentTask.value.id, decision)
    
    if (result.success) {
      ElMessage.success(result.message || '已要求补充信息')
      // 返回列表
      router.push({ name: 'AuditTaskList' })
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

// 返回列表
const handleBack = () => {
  router.push({ name: 'AuditTaskList' })
}

// 初始化
onMounted(() => {
  const taskId = route.query.taskId as string
  console.log('[AuditExecute] 组件挂载，route.query:', route.query)
  console.log('[AuditExecute] taskId:', taskId)
  
  if (taskId) {
    loadAuditTask(taskId)
  } else {
    console.error('[AuditExecute] 没有 taskId 参数')
    // 如果没有任务ID，跳转到审核任务列表
    ElMessage.warning('请从审核任务列表选择要执行的任务')
    router.push({ name: 'AuditTaskList' })
  }
})
</script>

<style scoped>
.audit-execute {
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

.audit-content {
  .mt-20 {
    margin-top: 20px;
  }
}

.comments-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 20px;
}

.history-item {
  .history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .history-operator {
    font-weight: bold;
    font-size: 14px;
  }

  .history-level {
    font-size: 12px;
    color: #909399;
    margin-bottom: 4px;
  }

  .history-comments {
    font-size: 13px;
    color: #606266;
    margin-top: 8px;
    padding: 8px;
    background-color: #f5f7fa;
    border-radius: 4px;
  }
}
</style>
