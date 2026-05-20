<template>
  <div class="task-detail-container">
    <el-page-header @back="handleBack" title="返回任务列表">
      <template #content>
        <div class="header-content">
          <span class="task-title">{{ task?.nodeName || '任务详情' }}</span>
          <el-tag :type="getStatusType(task?.status)" size="large">
            {{ getStatusLabel(task?.status) }}
          </el-tag>
        </div>
      </template>
    </el-page-header>

    <div v-loading="loading" class="content-wrapper">
      <!-- 任务基本信息 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span class="card-title">任务基本信息</span>
            <el-tag :type="getPriorityType(task?.priority)" size="small">
              {{ getPriorityLabel(task?.priority) }}
            </el-tag>
          </div>
        </template>
        
        <el-descriptions :column="2" border>
          <el-descriptions-item label="任务ID">
            {{ task?.id }}
          </el-descriptions-item>
          <el-descriptions-item label="任务名称">
            {{ task?.nodeName }}
          </el-descriptions-item>
          <el-descriptions-item label="工作流">
            {{ task?.workflowName }}
          </el-descriptions-item>
          <el-descriptions-item label="执行人">
            {{ task?.assigneeName }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDate(task?.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="开始时间">
            {{ formatDate(task?.startedAt) || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="截止日期">
            <span v-if="task?.dueDate" :class="{ 'overdue': isOverdue(task.dueDate) }">
              {{ formatDate(task.dueDate) }}
            </span>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="完成时间">
            {{ formatDate(task?.completedAt) || '-' }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 样品信息 -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span class="card-title">样品信息</span>
            <el-button type="primary" size="small" @click="handleViewSample">
              查看样品详情
            </el-button>
          </div>
        </template>
        
        <el-descriptions :column="2" border>
          <el-descriptions-item label="样品条码">
            <el-tag type="primary">{{ sample?.barcode }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="样品名称">
            {{ sample?.name }}
          </el-descriptions-item>
          <el-descriptions-item label="样品类型">
            {{ sample?.sampleType }}
          </el-descriptions-item>
          <el-descriptions-item label="样品来源">
            {{ sample?.source }}
          </el-descriptions-item>
          <el-descriptions-item label="委托方">
            {{ sample?.client }}
          </el-descriptions-item>
          <el-descriptions-item label="接收日期">
            {{ formatDate(sample?.receivedDate) }}
          </el-descriptions-item>
          <el-descriptions-item label="当前位置">
            {{ sample?.currentLocation }}
          </el-descriptions-item>
          <el-descriptions-item label="样品状态">
            <el-tag :type="getSampleStatusType(sample?.status)">
              {{ getSampleStatusLabel(sample?.status) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 操作指引和 SOP -->
      <el-card class="info-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span class="card-title">操作指引</span>
          </div>
        </template>
        
        <div class="sop-content">
          <el-alert
            title="请按照以下步骤完成任务操作"
            type="info"
            :closable="false"
            show-icon
          />
          
          <div v-if="method" class="method-info">
            <h3>检测方法：{{ method.name }}</h3>
            <p class="method-meta">
              <span>方法编号：{{ method.code }}</span>
              <span>版本：{{ method.version }}</span>
              <span>预计时长：{{ method.estimatedDuration }} 分钟</span>
            </p>
            
            <div class="steps-section">
              <h4>操作步骤</h4>
              <el-steps direction="vertical" :active="currentStep">
                <el-step
                  v-for="(step, index) in method.steps"
                  :key="index"
                  :title="`步骤 ${step.order}`"
                  :description="step.description"
                />
              </el-steps>
            </div>
            
            <div v-if="method.equipment.length > 0" class="equipment-section">
              <h4>所需设备</h4>
              <el-tag
                v-for="equipment in method.equipment"
                :key="equipment.id"
                :type="equipment.required ? 'danger' : 'info'"
                class="equipment-tag"
              >
                {{ equipment.name }}
                <span v-if="equipment.required">（必需）</span>
              </el-tag>
            </div>
            
            <div v-if="method.sopDocuments.length > 0" class="sop-section">
              <h4>SOP 文档</h4>
              <el-table :data="method.sopDocuments" stripe>
                <el-table-column prop="name" label="文档名称" />
                <el-table-column prop="type" label="文件类型" width="120" />
                <el-table-column label="操作" width="150">
                  <template #default="{ row }">
                    <el-button type="primary" size="small" @click="handleDownloadSOP(row)">
                      下载
                    </el-button>
                    <el-button type="info" size="small" @click="handlePreviewSOP(row)">
                      预览
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </div>
          
          <el-empty v-else description="暂无操作指引" />
        </div>
      </el-card>

      <!-- 操作表单 -->
      <el-card
        v-if="task?.status === 'pending' || task?.status === 'in_progress'"
        class="info-card"
        shadow="never"
      >
        <template #header>
          <div class="card-header">
            <span class="card-title">任务操作</span>
          </div>
        </template>
        
        <el-form
          ref="formRef"
          :model="formData"
          :rules="formRules"
          label-width="120px"
        >
          <el-form-item label="操作类型" prop="action">
            <el-radio-group v-model="formData.action">
              <el-radio value="complete">完成任务</el-radio>
              <el-radio value="reject">拒绝任务</el-radio>
              <el-radio value="transfer">转交任务</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item
            v-if="formData.action === 'transfer'"
            label="转交给"
            prop="transferTo"
          >
            <el-select
              v-model="formData.transferTo"
              placeholder="请选择接收人"
              style="width: 100%"
            >
              <el-option label="张三" value="USER-001" />
              <el-option label="李四" value="USER-002" />
              <el-option label="王五" value="USER-003" />
              <el-option label="赵六" value="USER-004" />
            </el-select>
          </el-form-item>
          
          <el-form-item
            v-if="method && method.testItems.length > 0 && formData.action === 'complete'"
            label="检测结果"
          >
            <div class="test-items">
              <div
                v-for="item in method.testItems"
                :key="item.id"
                class="test-item"
              >
                <label>{{ item.name }}</label>
                <el-input
                  v-model="formData.testResults[item.id]"
                  :placeholder="`请输入${item.name}`"
                  style="width: 200px"
                >
                  <template v-if="item.unit" #append>{{ item.unit }}</template>
                </el-input>
              </div>
            </div>
          </el-form-item>
          
          <el-form-item label="备注" prop="remarks">
            <el-input
              v-model="formData.remarks"
              type="textarea"
              :rows="4"
              placeholder="请输入备注信息"
            />
          </el-form-item>
          
          <el-form-item label="附件">
            <el-upload
              v-model:file-list="formData.attachments"
              action="#"
              :auto-upload="false"
              multiple
            >
              <el-button type="primary">选择文件</el-button>
              <template #tip>
                <div class="el-upload__tip">
                  支持上传图片、文档等文件，单个文件不超过 10MB
                </div>
              </template>
            </el-upload>
          </el-form-item>
          
          <el-form-item>
            <el-button
              type="primary"
              size="large"
              :loading="submitting"
              @click="handleSubmit"
            >
              提交
            </el-button>
            <el-button size="large" @click="handleCancel">
              取消
            </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 已完成任务的结果展示 -->
      <el-card
        v-if="task?.status === 'completed' && task.data"
        class="info-card"
        shadow="never"
      >
        <template #header>
          <div class="card-header">
            <span class="card-title">任务结果</span>
          </div>
        </template>
        
        <el-descriptions :column="1" border>
          <el-descriptions-item label="操作类型">
            完成任务
          </el-descriptions-item>
          <el-descriptions-item v-if="task.data.remarks" label="备注">
            {{ task.data.remarks }}
          </el-descriptions-item>
          <el-descriptions-item v-if="task.data.testResults" label="检测结果">
            <div class="result-display">
              <div
                v-for="(value, key) in task.data.testResults"
                :key="key"
                class="result-item"
              >
                <span class="result-label">{{ key }}:</span>
                <span class="result-value">{{ value }}</span>
              </div>
            </div>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import type { Task, Sample, TestMethod } from '@/types'

const router = useRouter()
const route = useRoute()

// 状态管理
const loading = ref(false)
const submitting = ref(false)
const task = ref<Task | null>(null)
const sample = ref<Sample | null>(null)
const method = ref<TestMethod | null>(null)
const currentStep = ref(0)

// 表单
const formRef = ref<FormInstance>()
const formData = ref({
  action: 'complete',
  transferTo: '',
  remarks: '',
  testResults: {} as Record<string, string>,
  attachments: []
})

const formRules: FormRules = {
  action: [{ required: true, message: '请选择操作类型', trigger: 'change' }],
  transferTo: [
    {
      required: true,
      message: '请选择接收人',
      trigger: 'change',
      validator: (_rule, value, callback) => {
        if (formData.value.action === 'transfer' && !value) {
          callback(new Error('请选择接收人'))
        } else {
          callback()
        }
      }
    }
  ]
}

// 获取任务详情
async function fetchTaskDetail() {
  loading.value = true
  try {
    const taskId = route.params.id as string
    
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 模拟数据
    task.value = generateMockTask(taskId)
    sample.value = generateMockSample(task.value.sampleId)
    method.value = generateMockMethod()
    
  } catch (error) {
    console.error('获取任务详情失败:', error)
    ElMessage.error('获取任务详情失败')
  } finally {
    loading.value = false
  }
}

// 生成模拟任务数据
function generateMockTask(taskId: string): Task {
  const statuses: Task['status'][] = ['pending', 'in_progress', 'completed']
  const priorities: Task['priority'][] = ['normal', 'high', 'urgent']
  
  const status = statuses[Math.floor(Math.random() * statuses.length)]
  const createdAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
  
  return {
    id: taskId,
    sampleId: 'SAMPLE-0001',
    sampleName: '水质样品-001',
    sampleBarcode: 'BC00000001',
    workflowId: 'WF-001',
    workflowName: '水质检测流程',
    nodeId: 'NODE-002',
    nodeName: '仪器检测',
    assignee: 'USER-001',
    assigneeName: '张三',
    status,
    priority: priorities[Math.floor(Math.random() * priorities.length)],
    dueDate: new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000),
    startedAt: status !== 'pending' ? new Date(createdAt.getTime() + 60000) : undefined,
    completedAt: status === 'completed' ? new Date(createdAt.getTime() + 3600000) : undefined,
    createdAt,
    data: status === 'completed' ? {
      remarks: '检测完成，数据正常',
      testResults: {
        'pH值': '7.2',
        '溶解氧': '8.5 mg/L',
        '浊度': '3.2 NTU'
      }
    } : undefined
  }
}

// 生成模拟样品数据
function generateMockSample(sampleId: string): Sample {
  return {
    id: sampleId,
    barcode: 'BC00000001',
    name: '水质样品-001',
    source: '长江武汉段',
    client: '武汉市环保局',
    receivedDate: new Date('2024-01-15'),
    sampleType: '水质',
    quantity: 500,
    unit: 'mL',
    status: 'in_progress',
    currentLocation: '检测室A-01',
    createdBy: 'USER-001',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date()
  }
}

// 生成模拟检测方法数据
function generateMockMethod(): TestMethod {
  return {
    id: 'METHOD-001',
    name: '水质多参数检测',
    code: 'GB/T 5750-2006',
    version: 'v1.0',
    category: '水质检测',
    steps: [
      {
        order: 1,
        description: '样品前处理：取适量样品，过滤去除杂质',
        expectedResult: '样品清澈透明'
      },
      {
        order: 2,
        description: '仪器校准：使用标准溶液校准仪器',
        expectedResult: '仪器显示正常'
      },
      {
        order: 3,
        description: '样品测定：将样品放入仪器进行测定',
        expectedResult: '获得测定数据'
      },
      {
        order: 4,
        description: '数据记录：记录测定结果并保存',
        expectedResult: '数据完整准确'
      }
    ],
    equipment: [
      { id: 'EQ-001', name: '多参数水质分析仪', required: true },
      { id: 'EQ-002', name: '电子天平', required: true },
      { id: 'EQ-003', name: '移液器', required: false }
    ],
    estimatedDuration: 120,
    sopDocuments: [
      {
        id: 'DOC-001',
        name: '水质检测标准操作规程.pdf',
        url: '/sop/water-quality-sop.pdf',
        type: 'PDF',
        size: 2048000,
        uploadedAt: new Date('2024-01-01')
      },
      {
        id: 'DOC-002',
        name: '仪器操作手册.pdf',
        url: '/sop/instrument-manual.pdf',
        type: 'PDF',
        size: 5120000,
        uploadedAt: new Date('2024-01-01')
      }
    ],
    testItems: [
      {
        id: 'ITEM-001',
        name: 'pH值',
        unit: '',
        dataType: 'number',
        validationRule: {
          type: 'range',
          min: 0,
          max: 14
        }
      },
      {
        id: 'ITEM-002',
        name: '溶解氧',
        unit: 'mg/L',
        dataType: 'number',
        validationRule: {
          type: 'range',
          min: 0,
          max: 20
        }
      },
      {
        id: 'ITEM-003',
        name: '浊度',
        unit: 'NTU',
        dataType: 'number',
        validationRule: {
          type: 'range',
          min: 0,
          max: 100
        }
      }
    ],
    status: 'active',
    createdBy: 'ADMIN',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
}

// 事件处理
function handleBack() {
  router.push({ name: 'task-list' })
}

function handleViewSample() {
  if (sample.value) {
    router.push({ name: 'sample-detail', params: { id: sample.value.id } })
  }
}

function handleDownloadSOP(doc: any) {
  ElMessage.success(`正在下载：${doc.name}`)
  // 实际项目中这里应该触发文件下载
}

function handlePreviewSOP(doc: any) {
  ElMessage.info(`正在预览：${doc.name}`)
  // 实际项目中这里应该打开预览窗口
}

async function handleSubmit() {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    
    const actionText = {
      complete: '完成',
      reject: '拒绝',
      transfer: '转交'
    }[formData.value.action]
    
    try {
      await ElMessageBox.confirm(
        `确认${actionText}该任务吗？`,
        '确认操作',
        {
          confirmButtonText: '确认',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      
      submitting.value = true
      
      // 模拟 API 调用
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      ElMessage.success(`任务${actionText}成功`)
      
      // 返回任务列表
      setTimeout(() => {
        router.push({ name: 'task-list' })
      }, 1000)
      
    } catch (error) {
      if (error !== 'cancel') {
        console.error('提交失败:', error)
        ElMessage.error('操作失败，请重试')
      }
    } finally {
      submitting.value = false
    }
  })
}

function handleCancel() {
  router.push({ name: 'task-list' })
}

// 工具函数
function getStatusType(status?: Task['status']): string {
  if (!status) return 'info'
  const typeMap = {
    pending: 'warning',
    in_progress: 'primary',
    completed: 'success',
    rejected: 'danger'
  }
  return typeMap[status] || 'info'
}

function getStatusLabel(status?: Task['status']): string {
  if (!status) return ''
  const labelMap = {
    pending: '待处理',
    in_progress: '进行中',
    completed: '已完成',
    rejected: '已拒绝'
  }
  return labelMap[status] || status
}

function getPriorityType(priority?: Task['priority']): string {
  if (!priority) return ''
  const typeMap = {
    low: 'info',
    normal: '',
    high: 'warning',
    urgent: 'danger'
  }
  return typeMap[priority] || ''
}

function getPriorityLabel(priority?: Task['priority']): string {
  if (!priority) return ''
  const labelMap = {
    low: '低',
    normal: '普通',
    high: '高',
    urgent: '紧急'
  }
  return labelMap[priority] || priority
}

function getSampleStatusType(status?: Sample['status']): string {
  if (!status) return 'info'
  const typeMap = {
    registered: 'info',
    in_progress: 'primary',
    completed: 'success',
    released: 'success',
    returned: 'warning'
  }
  return typeMap[status] || 'info'
}

function getSampleStatusLabel(status?: Sample['status']): string {
  if (!status) return ''
  const labelMap = {
    registered: '已登记',
    in_progress: '检测中',
    completed: '已完成',
    released: '已放行',
    returned: '已退回'
  }
  return labelMap[status] || status
}

function formatDate(date?: Date): string {
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
  fetchTaskDetail()
})
</script>

<style scoped>
.task-detail-container {
  padding: 20px;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.task-title {
  font-size: 18px;
  font-weight: 600;
}

.content-wrapper {
  margin-top: 20px;
}

.info-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
}

.overdue {
  color: #f56c6c;
  font-weight: 600;
}

.sop-content {
  padding: 16px 0;
}

.method-info {
  margin-top: 20px;
}

.method-info h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
}

.method-meta {
  color: #909399;
  font-size: 14px;
  margin-bottom: 20px;
}

.method-meta span {
  margin-right: 20px;
}

.steps-section,
.equipment-section,
.sop-section {
  margin-top: 24px;
}

.steps-section h4,
.equipment-section h4,
.sop-section h4 {
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 600;
  color: #606266;
}

.equipment-tag {
  margin-right: 8px;
  margin-bottom: 8px;
}

.test-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.test-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.test-item label {
  min-width: 100px;
  font-weight: 500;
}

.result-display {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-item {
  display: flex;
  gap: 8px;
}

.result-label {
  font-weight: 500;
  min-width: 100px;
}

.result-value {
  color: #409eff;
}
</style>
