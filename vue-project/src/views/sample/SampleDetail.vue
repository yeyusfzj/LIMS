<template>
  <div class="sample-detail">
    <!-- 页面头部 -->
    <el-page-header @back="handleBack" class="page-header">
      <template #content>
        <div class="header-content">
          <span class="title">样品详情</span>
          <el-tag v-if="sampleData" :type="getStatusType(sampleData.status)" class="status-tag">
            {{ getStatusText(sampleData.status) }}
          </el-tag>
        </div>
      </template>
      <template #extra>
        <el-space>
          <el-button type="primary" :icon="Edit" @click="handleEdit">编辑</el-button>
          <el-button :icon="Share" @click="showTransferDialog">流转</el-button>
          <el-button :icon="CopyDocument" @click="handleSplit">分样</el-button>
          <el-button :icon="Folder" @click="handleMerge">合样</el-button>
          <el-button :icon="Box" @click="handleRetention">留样</el-button>
        </el-space>
      </template>
    </el-page-header>

    <!-- 主要内容区域 - 添加左右分栏布局 -->
    <el-card shadow="never" class="content-card" v-loading="loading">
      <div class="split-container">
        <!-- 左侧信息区域 -->
        <div class="left-panel" :style="{ width: leftPanelWidth + 'px' }">
          <el-tabs v-model="activeTab" class="detail-tabs">
        <!-- 基本信息标签页 -->
        <el-tab-pane label="基本信息" name="basic">
          <el-descriptions :column="2" border v-if="sampleData">
            <el-descriptions-item label="样品条码">
              <el-tag type="info">{{ sampleData.barcode }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="样品名称">
              {{ sampleData.sampleName }}
            </el-descriptions-item>
            <el-descriptions-item label="样品类别">
              {{ sampleData.sampleCategory }}
            </el-descriptions-item>
            <el-descriptions-item label="委托方">
              {{ sampleData.clientName }}
            </el-descriptions-item>
            <el-descriptions-item label="接收日期">
              {{ formatDate(sampleData.receivedDate) }}
            </el-descriptions-item>
            <el-descriptions-item label="样品类型">
              {{ sampleData.sampleType }}
            </el-descriptions-item>
            <el-descriptions-item label="数量">
              {{ sampleData.quantity }} {{ sampleData.unit }}
            </el-descriptions-item>
            <el-descriptions-item label="存储位置">
              {{ sampleData.storageLocation }}
            </el-descriptions-item>
            <el-descriptions-item label="样品状态">
              <el-tag :type="getStatusType(sampleData.status)">
                {{ getStatusText(sampleData.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="优先级">
              <el-tag :type="getPriorityType(sampleData.priority)">
                {{ getPriorityText(sampleData.priority) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">
              {{ formatDate(sampleData.createdAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="更新时间">
              {{ formatDate(sampleData.updatedAt) }}
            </el-descriptions-item>
            
            <!-- 描述信息 -->
            <el-descriptions-item label="描述" :span="2" v-if="sampleData.description">
              {{ sampleData.description }}
            </el-descriptions-item>
            
            <!-- 存储条件 -->
            <el-descriptions-item label="存储条件" :span="2" v-if="sampleData.storageCondition">
              {{ sampleData.storageCondition }}
            </el-descriptions-item>

            <!-- 关联样品信息 -->
            <el-descriptions-item label="母样品" :span="2" v-if="sampleData.parentSampleId">
              <el-link type="primary" @click="viewSample(sampleData.parentSampleId)">
                {{ sampleData.parentSampleId }}
              </el-link>
            </el-descriptions-item>
            <el-descriptions-item label="子样品" :span="2" v-if="sampleData.childSampleIds && sampleData.childSampleIds.length > 0">
              <el-space>
                <el-link 
                  v-for="childId in sampleData.childSampleIds" 
                  :key="childId"
                  type="primary" 
                  @click="viewSample(childId)"
                >
                  {{ childId }}
                </el-link>
              </el-space>
            </el-descriptions-item>
            <el-descriptions-item label="合并来源" :span="2" v-if="sampleData.mergedFromIds && sampleData.mergedFromIds.length > 0">
              <el-space>
                <el-link 
                  v-for="mergedId in sampleData.mergedFromIds" 
                  :key="mergedId"
                  type="primary" 
                  @click="viewSample(mergedId)"
                >
                  {{ mergedId }}
                </el-link>
              </el-space>
            </el-descriptions-item>

            <!-- 采样信息 -->
            <el-descriptions-item label="采样日期" v-if="sampleData.samplingDate">
              {{ formatDate(sampleData.samplingDate) }}
            </el-descriptions-item>
            <el-descriptions-item label="采样地点" v-if="sampleData.samplingLocation">
              {{ sampleData.samplingLocation }}
            </el-descriptions-item>
            <el-descriptions-item label="采样人" v-if="sampleData.samplingPerson">
              {{ sampleData.samplingPerson }}
            </el-descriptions-item>
            
            <!-- 留样信息 -->
            <el-descriptions-item label="留样信息" :span="2" v-if="sampleData.retentionInfo">
              <el-space direction="vertical" :size="5">
                <span>位置: {{ sampleData.retentionInfo.location }}</span>
                <span>到期日期: {{ formatDate(sampleData.retentionInfo.expiryDate) }}</span>
                <span>
                  状态: 
                  <el-tag :type="getRetentionStatusType(sampleData.retentionInfo.status)" size="small">
                    {{ getRetentionStatusText(sampleData.retentionInfo.status) }}
                  </el-tag>
                </span>
              </el-space>
            </el-descriptions-item>
          </el-descriptions>
          <el-empty v-else description="暂无数据" />
        </el-tab-pane>

        <!-- 流转记录标签页 -->
        <el-tab-pane label="流转记录" name="transfer">
          <ChainOfCustody 
            v-if="sampleData"
            :sample-id="sampleData.id"
            @refresh="handleRefreshCustody"
          />
        </el-tab-pane>

        <!-- 检测记录标签页 -->
        <el-tab-pane label="检测记录" name="test">
          <el-table :data="testRecords" border stripe>
            <el-table-column prop="testMethod" label="检测方法" />
            <el-table-column prop="testItem" label="检测项目" />
            <el-table-column prop="result" label="检测结果" />
            <el-table-column prop="operator" label="操作人员" />
            <el-table-column prop="timestamp" label="检测时间">
              <template #default="{ row }">
                {{ formatDateTime(row.timestamp) }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态">
              <template #default="{ row }">
                <el-tag :type="row.status === 'completed' ? 'success' : 'warning'">
                  {{ row.status === 'completed' ? '已完成' : '进行中' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="testRecords.length === 0" description="暂无检测记录" />
        </el-tab-pane>

        <!-- 审核记录标签页 -->
        <el-tab-pane label="审核记录" name="audit">
          <el-timeline v-if="auditRecords.length > 0">
            <el-timeline-item
              v-for="record in auditRecords"
              :key="record.id"
              :timestamp="formatDateTime(record.auditedAt)"
              placement="top"
              :type="getAuditTimelineType(record.status)"
            >
              <el-card>
                <p><strong>审核级别:</strong> {{ record.levelName }}</p>
                <p><strong>审核人:</strong> {{ record.auditor }}</p>
                <p>
                  <strong>审核结果:</strong> 
                  <el-tag :type="getAuditStatusType(record.status)" size="small">
                    {{ getAuditStatusText(record.status) }}
                  </el-tag>
                </p>
                <p v-if="record.comments"><strong>审核意见:</strong> {{ record.comments }}</p>
              </el-card>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="暂无审核记录" />
        </el-tab-pane>
      </el-tabs>
        </div>

        <!-- 可拖动的分隔条 -->
        <div 
          class="resizer" 
          @mousedown="startResize"
          :class="{ 'resizing': isResizing }"
        >
          <div class="resizer-line"></div>
        </div>

        <!-- 右侧操作按钮区域 -->
        <div class="right-panel">
          <div class="action-panel">
            <h3 class="panel-title">快捷操作</h3>
            <div class="action-buttons-vertical">
              <el-button type="primary" :icon="Edit" @click="handleEdit" size="large">
                编辑样品
              </el-button>
              <el-button :icon="Share" @click="showTransferDialog" size="large">
                样品流转
              </el-button>
              <el-button :icon="CopyDocument" @click="handleSplit" size="large">
                样品分样
              </el-button>
              <el-button :icon="Folder" @click="handleMerge" size="large">
                样品合样
              </el-button>
              <el-button :icon="Box" @click="handleRetention" size="large">
                样品留样
              </el-button>
            </div>

            <el-divider />

            <h3 class="panel-title">样品信息</h3>
            <div class="quick-info" v-if="sampleData">
              <div class="info-item">
                <span class="info-label">条码:</span>
                <el-tag type="info" size="small">{{ sampleData.barcode }}</el-tag>
              </div>
              <div class="info-item">
                <span class="info-label">状态:</span>
                <el-tag :type="getStatusType(sampleData.status)" size="small">
                  {{ getStatusText(sampleData.status) }}
                </el-tag>
              </div>
              <div class="info-item">
                <span class="info-label">数量:</span>
                <span class="info-value">{{ sampleData.quantity }} {{ sampleData.unit }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">位置:</span>
                <span class="info-value">{{ sampleData.storageLocation }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 样品流转对话框 -->
    <SampleTransfer
      v-model="transferDialogVisible"
      :sample-id="sampleData?.id"
      :current-location="sampleData?.currentLocation"
      @success="handleTransferSuccess"
    />

    <!-- 样品分样对话框 -->
    <SampleSplit
      v-model="splitDialogVisible"
      :sample-info="sampleData"
      @success="handleSplitSuccess"
    />

    <!-- 样品合样对话框 -->
    <SampleMerge
      v-model="mergeDialogVisible"
      :samples="availableSamplesForMerge"
      @success="handleMergeSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Edit, Share, CopyDocument, Folder, Box } from '@element-plus/icons-vue'
import ChainOfCustody from '@/components/ChainOfCustody.vue'
import SampleTransfer from '@/components/SampleTransfer.vue'
import SampleSplit from '@/components/SampleSplit.vue'
import SampleMerge from '@/components/SampleMerge.vue'
import { useSampleStore } from '@/stores/sample'
import type { Sample, TransferFormData } from '@/types'

const router = useRouter()
const route = useRoute()
const sampleStore = useSampleStore()

// 状态
const loading = ref(false)
const activeTab = ref('basic')
const sampleData = ref<Sample | null>(null)
const transferDialogVisible = ref(false)
const splitDialogVisible = ref(false)
const mergeDialogVisible = ref(false)

// 分隔条拖动相关状态
const leftPanelWidth = ref(800) // 左侧面板初始宽度
const isResizing = ref(false)
const startX = ref(0)
const startWidth = ref(0)

// 可用于合样的样品列表（模拟数据）
const availableSamplesForMerge = ref<Sample[]>([
  {
    id: 'S20240115002',
    barcode: 'S20240115002',
    name: '食品样品-小麦',
    source: '某农场',
    client: '某食品公司',
    receivedDate: new Date('2024-01-15'),
    sampleType: '食品',
    quantity: 300,
    unit: 'g',
    status: 'registered',
    currentLocation: '样品库',
    createdBy: '张三',
    createdAt: new Date('2024-01-15 09:30:00'),
    updatedAt: new Date('2024-01-15 09:30:00')
  },
  {
    id: 'S20240115003',
    barcode: 'S20240115003',
    name: '食品样品-玉米',
    source: '某农场',
    client: '某食品公司',
    receivedDate: new Date('2024-01-15'),
    sampleType: '食品',
    quantity: 400,
    unit: 'g',
    status: 'registered',
    currentLocation: '样品库',
    createdBy: '张三',
    createdAt: new Date('2024-01-15 10:00:00'),
    updatedAt: new Date('2024-01-15 10:00:00')
  }
])

// 模拟数据
const transferRecords = ref([
  {
    id: '1',
    fromLocation: '接收室',
    toLocation: '前处理室',
    fromPerson: '张三',
    toPerson: '李四',
    transferReason: '样品前处理',
    timestamp: new Date('2024-01-15 10:30:00')
  },
  {
    id: '2',
    fromLocation: '前处理室',
    toLocation: '检测室',
    fromPerson: '李四',
    toPerson: '王五',
    transferReason: '进行检测',
    timestamp: new Date('2024-01-15 14:20:00')
  }
])

const testRecords = ref([
  {
    id: '1',
    testMethod: 'GB/T 5009.11-2014',
    testItem: '总砷',
    result: '0.05 mg/kg',
    operator: '王五',
    timestamp: new Date('2024-01-15 15:30:00'),
    status: 'completed'
  },
  {
    id: '2',
    testMethod: 'GB/T 5009.12-2017',
    testItem: '铅',
    result: '0.02 mg/kg',
    operator: '王五',
    timestamp: new Date('2024-01-15 16:00:00'),
    status: 'completed'
  }
])

const auditRecords = ref([
  {
    id: '1',
    levelName: '分析审核',
    auditor: '赵六',
    status: 'approved',
    comments: '检测数据准确，符合要求',
    auditedAt: new Date('2024-01-16 09:00:00')
  },
  {
    id: '2',
    levelName: '技术审核',
    auditor: '孙七',
    status: 'approved',
    comments: '技术方法正确，结果可靠',
    auditedAt: new Date('2024-01-16 10:30:00')
  }
])

// 生命周期
onMounted(() => {
  console.log('🎬 SampleDetail 组件已挂载')
  loadSampleData()
})

// 监听路由变化，当从编辑页面返回时重新加载数据
watch(() => route.query.refresh, (newVal, oldVal) => {
  console.log('🔍 检测到 refresh 参数变化:', { 新值: newVal, 旧值: oldVal })
  if (newVal === 'true') {
    console.log('🔄 触发数据刷新...')
    loadSampleData()
  }
})

// 监听路由参数变化（当从一个样品详情跳转到另一个样品详情时）
watch(() => route.params.id, (newId, oldId) => {
  console.log('🔍 检测到样品ID变化:', { 新ID: newId, 旧ID: oldId })
  if (newId && newId !== oldId) {
    console.log('🔄 加载新样品数据...')
    loadSampleData()
  }
})

// 方法
const loadSampleData = async () => {
  console.log('📥 loadSampleData 开始执行')
  loading.value = true
  
  try {
    // 从路由参数获取样品ID
    const sampleId = route.params.id as string
    console.log('📋 当前样品ID:', sampleId)
    
    if (!sampleId) {
      ElMessage.error('样品ID不存在')
      loading.value = false
      return
    }
    
    // 调用真实API获取样品数据
    console.log('🌐 开始调用 API 获取样品数据...')
    const sample = await sampleStore.fetchSampleById(sampleId)
    console.log('✅ API 返回的样品数据:', sample)
    
    if (sample) {
      sampleData.value = sample
      console.log('✅ 样品数据已更新到页面:', {
        id: sample.id,
        sampleName: sample.sampleName,
        quantity: sample.quantity,
        version: sample.version,
        updatedAt: sample.updatedAt
      })
    } else {
      ElMessage.error('样品不存在')
      console.log('❌ 样品不存在')
    }
  } catch (error: any) {
    console.error('❌ 加载样品数据失败:', error)
    ElMessage.error(error.message || '加载样品数据失败')
  } finally {
    loading.value = false
    console.log('📥 loadSampleData 执行完成')
  }
}

const handleBack = () => {
  router.push('/sample/list')
}

const handleEdit = () => {
  if (!sampleData.value) {
    ElMessage.warning('样品数据未加载')
    return
  }
  router.push(`/sample/registration?id=${sampleData.value.id}&mode=edit`)
}

const showTransferDialog = () => {
  transferDialogVisible.value = true
}

const handleTransferSuccess = (data: TransferFormData) => {
  console.log('流转成功:', data)
  // 刷新样品数据
  loadSampleData()
  // 切换到流转记录标签页
  activeTab.value = 'transfer'
}

const handleRefreshCustody = () => {
  console.log('刷新监管链记录')
}

const handleSplit = () => {
  splitDialogVisible.value = true
}

const handleMerge = () => {
  mergeDialogVisible.value = true
}

const handleSplitSuccess = (data: any) => {
  console.log('分样成功:', data)
  ElMessage.success(`成功分样为 ${data.count} 个子样品`)
  // 刷新样品数据
  loadSampleData()
}

const handleMergeSuccess = (data: any) => {
  console.log('合样成功:', data)
  ElMessage.success(`成功合并 ${data.selectedSamples.length} 个样品`)
  // 刷新样品数据
  loadSampleData()
}

const handleRetention = () => {
  ElMessage.info('留样功能将在后续任务中实现')
}

const viewSample = (sampleId: string) => {
  router.push(`/sample/detail/${sampleId}`)
}

// 格式化日期
const formatDate = (date: Date | string) => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN')
}

const formatDateTime = (date: Date | string) => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('zh-CN')
}

// 状态相关
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    registered: '已登记',
    in_progress: '进行中',
    completed: '已完成',
    released: '已放行',
    returned: '已退回'
  }
  return statusMap[status] || status
}

const getStatusType = (status: string) => {
  const typeMap: Record<string, any> = {
    registered: 'info',
    in_progress: 'warning',
    completed: 'success',
    released: 'success',
    returned: 'danger'
  }
  return typeMap[status] || 'info'
}

// 优先级相关
const getPriorityText = (priority: string) => {
  const priorityMap: Record<string, string> = {
    LOW: '低',
    NORMAL: '普通',
    HIGH: '高',
    URGENT: '紧急'
  }
  return priorityMap[priority] || priority
}

const getPriorityType = (priority: string) => {
  const typeMap: Record<string, any> = {
    LOW: 'info',
    NORMAL: '',
    HIGH: 'warning',
    URGENT: 'danger'
  }
  return typeMap[priority] || ''
}

const getRetentionStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    active: '留样中',
    extended: '已延期',
    disposed: '已销毁'
  }
  return statusMap[status] || status
}

const getRetentionStatusType = (status: string) => {
  const typeMap: Record<string, any> = {
    active: 'success',
    extended: 'warning',
    disposed: 'info'
  }
  return typeMap[status] || 'info'
}

const getAuditStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
    returned: '已退回'
  }
  return statusMap[status] || status
}

const getAuditStatusType = (status: string) => {
  const typeMap: Record<string, any> = {
    pending: 'info',
    approved: 'success',
    rejected: 'danger',
    returned: 'warning'
  }
  return typeMap[status] || 'info'
}

const getAuditTimelineType = (status: string) => {
  const typeMap: Record<string, any> = {
    approved: 'success',
    rejected: 'danger',
    returned: 'warning',
    pending: 'info'
  }
  return typeMap[status] || 'primary'
}

// 分隔条拖动功能
const startResize = (e: MouseEvent) => {
  isResizing.value = true
  startX.value = e.clientX
  startWidth.value = leftPanelWidth.value
  
  document.addEventListener('mousemove', handleResize)
  document.addEventListener('mouseup', stopResize)
  
  // 防止文本选择
  e.preventDefault()
}

const handleResize = (e: MouseEvent) => {
  if (!isResizing.value) return
  
  const deltaX = e.clientX - startX.value
  const newWidth = startWidth.value + deltaX
  
  // 限制最小和最大宽度
  const minWidth = 400
  const maxWidth = window.innerWidth - 350 // 右侧面板至少保留350px
  
  if (newWidth >= minWidth && newWidth <= maxWidth) {
    leftPanelWidth.value = newWidth
  }
}

const stopResize = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', handleResize)
  document.removeEventListener('mouseup', stopResize)
}
</script>

<style scoped>
.sample-detail {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
  background: white;
  padding: 16px 20px;
  border-radius: 4px;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title {
  font-size: 18px;
  font-weight: 600;
}

.status-tag {
  font-size: 14px;
}

.content-card {
  margin-top: 20px;
}

.detail-tabs {
  margin-top: 20px;
}

:deep(.el-descriptions__label) {
  font-weight: 600;
}

:deep(.el-timeline-item__timestamp) {
  color: #909399;
  font-size: 13px;
}

/* 分栏布局样式 */
.split-container {
  display: flex;
  gap: 0;
  min-height: 600px;
}

.left-panel {
  flex-shrink: 0;
  overflow-y: auto;
  padding-right: 10px;
}

.resizer {
  width: 10px;
  cursor: col-resize;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
  user-select: none;
}

.resizer:hover .resizer-line,
.resizer.resizing .resizer-line {
  background: #409eff;
  width: 3px;
}

.resizer-line {
  width: 1px;
  height: 100%;
  background: #dcdfe6;
  transition: all 0.2s;
}

.right-panel {
  flex: 1;
  min-width: 280px;
  padding-left: 10px;
  overflow-y: auto;
}

.action-panel {
  position: sticky;
  top: 0;
  background: white;
  padding: 20px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px 0;
}

.action-buttons-vertical {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-buttons-vertical .el-button {
  width: 100%;
  justify-content: flex-start;
}

.quick-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.info-label {
  color: #909399;
  min-width: 50px;
}

.info-value {
  color: #303133;
  font-weight: 500;
}

/* 拖动时的全局样式 */
body.resizing {
  cursor: col-resize;
  user-select: none;
}
</style>
