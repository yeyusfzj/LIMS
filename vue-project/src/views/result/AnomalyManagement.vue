<template>
  <div class="anomaly-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">异常管理</h2>
      <el-text type="info">管理和处理检测结果异常</el-text>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon danger">
                <el-icon><Warning /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.total }}</div>
                <div class="stat-label">异常总数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon warning">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.pending }}</div>
                <div class="stat-label">待处理</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon primary">
                <el-icon><Refresh /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.retesting }}</div>
                <div class="stat-label">复测中</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon success">
                <el-icon><Check /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-number">{{ stats.resolved }}</div>
                <div class="stat-label">已解决</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
    <!-- 筛选区域 -->
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item label="样品条码">
          <el-input
            v-model="filters.barcode"
            placeholder="请输入样品条码"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        
        <el-form-item label="异常类型">
          <el-select
            v-model="filters.anomalyType"
            placeholder="请选择异常类型"
            clearable
            style="width: 180px"
          >
            <el-option label="超出范围" value="out_of_range" />
            <el-option label="偏差过大" value="deviation" />
            <el-option label="人工标记" value="manual" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="处理状态">
          <el-select
            v-model="filters.status"
            placeholder="请选择处理状态"
            clearable
            style="width: 150px"
          >
            <el-option label="待处理" value="pending" />
            <el-option label="复测中" value="retesting" />
            <el-option label="已解决" value="resolved" />
            <el-option label="已忽略" value="ignored" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="标记时间">
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 280px"
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
    </el-card>

    <!-- 异常列表 -->
    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>异常结果列表</span>
          <div class="header-actions">
            <el-button type="success" @click="handleExport">
              <el-icon><Download /></el-icon>
              导出异常
            </el-button>
            <el-button type="warning" @click="handleBatchProcess">
              <el-icon><Operation /></el-icon>
              批量处理
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        @selection-change="handleSelectionChange"
        style="width: 100%"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column type="index" label="序号" width="60" />
        
        <el-table-column prop="sampleBarcode" label="样品条码" min-width="140">
          <template #default="{ row }">
            <el-link type="primary" @click="handleViewSample(row.sampleId)">
              {{ row.sampleBarcode }}
            </el-link>
          </template>
        </el-table-column>
        
        <el-table-column prop="sampleName" label="样品名称" min-width="150" show-overflow-tooltip />
        
        <el-table-column prop="testItemName" label="检测项" min-width="120" />
        
        <el-table-column prop="value" label="异常值" min-width="120">
          <template #default="{ row }">
            <span class="anomaly-value">
              {{ formatValue(row.value) }} {{ row.unit }}
            </span>
          </template>
        </el-table-column>
        
        <el-table-column prop="normalRange" label="正常范围" min-width="120" />
        
        <el-table-column prop="anomalyType" label="异常类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getAnomalyTypeTag(row.anomalyType)" size="small">
              {{ getAnomalyTypeText(row.anomalyType) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="reason" label="异常原因" min-width="200" show-overflow-tooltip />
        
        <el-table-column prop="markedBy" label="标记人" width="100" />
        
        <el-table-column prop="markedAt" label="标记时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.markedAt) }}
          </template>
        </el-table-column>
        
        <el-table-column prop="status" label="处理状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending'"
              type="warning"
              link
              size="small"
              @click="handleRequestRetest(row)"
            >
              <el-icon><Refresh /></el-icon>
              申请复测
            </el-button>
            <el-button
              v-if="row.status === 'pending'"
              type="success"
              link
              size="small"
              @click="handleResolve(row)"
            >
              <el-icon><Check /></el-icon>
              标记解决
            </el-button>
            <el-button
              type="primary"
              link
              size="small"
              @click="handleViewDetail(row)"
            >
              <el-icon><View /></el-icon>
              查看详情
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
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
    <!-- 异常详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="异常详情"
      width="900px"
      :close-on-click-modal="false"
    >
      <div v-if="currentAnomaly" class="anomaly-detail">
        <!-- 样品信息 -->
        <el-divider content-position="left">样品信息</el-divider>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="样品条码">
            {{ currentAnomaly.sampleBarcode }}
          </el-descriptions-item>
          <el-descriptions-item label="样品名称">
            {{ currentAnomaly.sampleName }}
          </el-descriptions-item>
          <el-descriptions-item label="样品类型">
            {{ currentAnomaly.sampleType }}
          </el-descriptions-item>
          <el-descriptions-item label="委托方">
            {{ currentAnomaly.client }}
          </el-descriptions-item>
          <el-descriptions-item label="接收日期">
            {{ formatDate(currentAnomaly.receivedDate) }}
          </el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag :type="getSampleStatusType(currentAnomaly.sampleStatus)">
              {{ getSampleStatusText(currentAnomaly.sampleStatus) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 检测结果 -->
        <el-divider content-position="left">检测结果</el-divider>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="检测项">
            {{ currentAnomaly.testItemName }}
          </el-descriptions-item>
          <el-descriptions-item label="检测方法">
            {{ currentAnomaly.testMethodName }}
          </el-descriptions-item>
          <el-descriptions-item label="异常值">
            <span class="anomaly-value">
              {{ formatValue(currentAnomaly.value) }} {{ currentAnomaly.unit }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="正常范围">
            {{ currentAnomaly.normalRange || '未设置' }}
          </el-descriptions-item>
          <el-descriptions-item label="数据来源">
            <el-tag :type="currentAnomaly.source === 'manual' ? 'info' : 'success'" size="small">
              {{ currentAnomaly.source === 'manual' ? '手工录入' : '仪器导入' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="仪器编号">
            {{ currentAnomaly.instrumentId || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="操作人">
            {{ currentAnomaly.operator }}
          </el-descriptions-item>
          <el-descriptions-item label="录入时间">
            {{ formatDateTime(currentAnomaly.timestamp) }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 异常信息 -->
        <el-divider content-position="left">异常信息</el-divider>
        <el-alert
          :title="`异常类型：${getAnomalyTypeText(currentAnomaly.anomalyType)}`"
          type="error"
          :closable="false"
          style="margin-bottom: 16px"
        >
          <template #default>
            <div style="margin-top: 8px">
              <strong>异常原因：</strong>{{ currentAnomaly.reason }}
            </div>
            <div style="margin-top: 4px">
              <strong>标记人：</strong>{{ currentAnomaly.markedBy }}
              <span style="margin-left: 16px">
                <strong>标记时间：</strong>{{ formatDateTime(currentAnomaly.markedAt) }}
              </span>
            </div>
            <div style="margin-top: 4px">
              <strong>处理状态：</strong>
              <el-tag :type="getStatusTag(currentAnomaly.status)" size="small">
                {{ getStatusText(currentAnomaly.status) }}
              </el-tag>
            </div>
          </template>
        </el-alert>

        <!-- 处理记录 -->
        <template v-if="currentAnomaly.processRecords && currentAnomaly.processRecords.length > 0">
          <el-divider content-position="left">处理记录</el-divider>
          <el-timeline>
            <el-timeline-item
              v-for="(record, index) in currentAnomaly.processRecords"
              :key="index"
              :timestamp="formatDateTime(record.timestamp)"
              placement="top"
              :type="getProcessTimelineType(record.action)"
            >
              <el-card>
                <template #header>
                  <div class="timeline-card-header">
                    <span>{{ getProcessActionText(record.action) }}</span>
                    <el-tag :type="getProcessActionTag(record.action)" size="small">
                      {{ record.status }}
                    </el-tag>
                  </div>
                </template>
                
                <div>
                  <strong>操作人：</strong>{{ record.operator }}
                </div>
                <div v-if="record.comments" style="margin-top: 8px">
                  <strong>备注：</strong>{{ record.comments }}
                </div>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </template>
      </div>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
        <el-button
          v-if="currentAnomaly?.status === 'pending'"
          type="warning"
          @click="handleRequestRetestFromDetail"
        >
          <el-icon><Refresh /></el-icon>
          申请复测
        </el-button>
        <el-button
          v-if="currentAnomaly?.status === 'pending'"
          type="success"
          @click="handleResolveFromDetail"
        >
          <el-icon><Check /></el-icon>
          标记解决
        </el-button>
      </template>
    </el-dialog>
    <!-- 复测申请对话框 -->
    <el-dialog
      v-model="retestDialogVisible"
      title="申请复测"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="retestForm" :rules="retestRules" ref="retestFormRef" label-width="100px">
        <el-form-item label="异常信息">
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="样品条码">
              {{ currentAnomaly?.sampleBarcode }}
            </el-descriptions-item>
            <el-descriptions-item label="检测项">
              {{ currentAnomaly?.testItemName }}
            </el-descriptions-item>
            <el-descriptions-item label="异常值">
              <span class="anomaly-value">
                {{ formatValue(currentAnomaly?.value) }} {{ currentAnomaly?.unit }}
              </span>
            </el-descriptions-item>
          </el-descriptions>
        </el-form-item>
        
        <el-form-item label="复测原因" prop="reason">
          <el-input
            v-model="retestForm.reason"
            type="textarea"
            :rows="4"
            placeholder="请输入复测原因"
          />
        </el-form-item>
        
        <el-form-item label="优先级" prop="priority">
          <el-select v-model="retestForm.priority" placeholder="请选择优先级">
            <el-option label="普通" value="normal" />
            <el-option label="紧急" value="urgent" />
            <el-option label="高优先级" value="high" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="预期完成时间" prop="expectedDate">
          <el-date-picker
            v-model="retestForm.expectedDate"
            type="datetime"
            placeholder="选择预期完成时间"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="retestDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitRetest" :loading="submitting">
          提交申请
        </el-button>
      </template>
    </el-dialog>

    <!-- 批量处理对话框 -->
    <el-dialog
      v-model="batchDialogVisible"
      title="批量处理异常"
      width="700px"
      :close-on-click-modal="false"
    >
      <div class="batch-process">
        <el-alert
          :title="`已选择 ${selectedAnomalies.length} 个异常结果`"
          type="info"
          :closable="false"
          style="margin-bottom: 20px"
        />
        
        <el-form :model="batchForm" :rules="batchRules" ref="batchFormRef" label-width="100px">
          <el-form-item label="处理方式" prop="action">
            <el-radio-group v-model="batchForm.action">
              <el-radio value="retest">批量申请复测</el-radio>
              <el-radio value="resolve">批量标记解决</el-radio>
              <el-radio value="ignore">批量忽略</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item 
            v-if="batchForm.action === 'retest'" 
            label="复测原因" 
            prop="reason"
          >
            <el-input
              v-model="batchForm.reason"
              type="textarea"
              :rows="3"
              placeholder="请输入批量复测原因"
            />
          </el-form-item>
          
          <el-form-item 
            v-if="batchForm.action === 'resolve'" 
            label="解决说明" 
            prop="resolution"
          >
            <el-input
              v-model="batchForm.resolution"
              type="textarea"
              :rows="3"
              placeholder="请输入解决说明"
            />
          </el-form-item>
          
          <el-form-item 
            v-if="batchForm.action === 'ignore'" 
            label="忽略原因" 
            prop="ignoreReason"
          >
            <el-input
              v-model="batchForm.ignoreReason"
              type="textarea"
              :rows="3"
              placeholder="请输入忽略原因"
            />
          </el-form-item>
        </el-form>
        
        <!-- 选中的异常列表 -->
        <el-divider content-position="left">选中的异常</el-divider>
        <el-table :data="selectedAnomalies" border size="small" max-height="300">
          <el-table-column prop="sampleBarcode" label="样品条码" width="120" />
          <el-table-column prop="testItemName" label="检测项" width="120" />
          <el-table-column prop="value" label="异常值" width="100">
            <template #default="{ row }">
              <span class="anomaly-value">{{ formatValue(row.value) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="anomalyType" label="异常类型" width="100">
            <template #default="{ row }">
              <el-tag :type="getAnomalyTypeTag(row.anomalyType)" size="small">
                {{ getAnomalyTypeText(row.anomalyType) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="reason" label="异常原因" show-overflow-tooltip />
        </el-table>
      </div>

      <template #footer>
        <el-button @click="batchDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitBatch" :loading="submitting">
          确认处理
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>
<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search,
  Refresh,
  Download,
  Operation,
  Warning,
  Clock,
  Check,
  View
} from '@element-plus/icons-vue'
import type { Anomaly } from '@/types'

// 路由
const router = useRouter()

// 响应式数据
const loading = ref(false)
const submitting = ref(false)

// 统计数据
const stats = reactive({
  total: 0,
  pending: 0,
  retesting: 0,
  resolved: 0
})

// 筛选条件
const filters = reactive({
  barcode: '',
  anomalyType: '',
  status: '',
  dateRange: null as [Date, Date] | null
})

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 表格数据
const tableData = ref<any[]>([])
const selectedAnomalies = ref<any[]>([])

// 对话框状态
const detailDialogVisible = ref(false)
const retestDialogVisible = ref(false)
const batchDialogVisible = ref(false)

// 当前操作的异常
const currentAnomaly = ref<any>(null)

// 复测表单
const retestForm = reactive({
  reason: '',
  priority: 'normal',
  expectedDate: null as Date | null
})

const retestRules = {
  reason: [
    { required: true, message: '请输入复测原因', trigger: 'blur' }
  ],
  priority: [
    { required: true, message: '请选择优先级', trigger: 'change' }
  ]
}

// 批量处理表单
const batchForm = reactive({
  action: 'retest',
  reason: '',
  resolution: '',
  ignoreReason: ''
})

const batchRules = {
  action: [
    { required: true, message: '请选择处理方式', trigger: 'change' }
  ],
  reason: [
    { required: true, message: '请输入复测原因', trigger: 'blur' }
  ],
  resolution: [
    { required: true, message: '请输入解决说明', trigger: 'blur' }
  ],
  ignoreReason: [
    { required: true, message: '请输入忽略原因', trigger: 'blur' }
  ]
}

// 表单引用
const retestFormRef = ref()
const batchFormRef = ref()

// 模拟数据
const mockAnomalies = [
  {
    id: 'A001',
    resultId: 'R003',
    sampleId: 'S002',
    sampleBarcode: 'LAB2024010002',
    sampleName: '土壤样品-B',
    sampleType: '土壤',
    client: '农业检测中心',
    receivedDate: new Date('2024-01-16'),
    sampleStatus: 'in_progress',
    testItemId: 'TI003',
    testItemName: '重金属含量',
    testMethodName: '土壤重金属测定',
    value: 125.8,
    unit: 'mg/kg',
    normalRange: '0-100',
    anomalyType: 'out_of_range',
    reason: '重金属含量超出正常范围上限',
    markedBy: '李四',
    markedAt: new Date('2024-01-20 11:20:00'),
    status: 'pending',
    source: 'instrument',
    instrumentId: 'INST-002',
    operator: '李四',
    timestamp: new Date('2024-01-20 11:15:00'),
    processRecords: [
      {
        action: 'mark_anomaly',
        operator: '李四',
        timestamp: new Date('2024-01-20 11:20:00'),
        status: '已标记',
        comments: '检测值明显超出正常范围'
      }
    ]
  },
  {
    id: 'A002',
    resultId: 'R006',
    sampleId: 'S005',
    sampleBarcode: 'LAB2024010005',
    sampleName: '水质样品-E',
    sampleType: '水质',
    client: '环保监测站',
    receivedDate: new Date('2024-01-19'),
    sampleStatus: 'completed',
    testItemId: 'TI006',
    testItemName: 'COD',
    testMethodName: '化学需氧量测定',
    value: 85.2,
    unit: 'mg/L',
    normalRange: '≤40',
    anomalyType: 'out_of_range',
    reason: 'COD值超出标准限值',
    markedBy: '王五',
    markedAt: new Date('2024-01-21 09:15:00'),
    status: 'retesting',
    source: 'instrument',
    instrumentId: 'INST-004',
    operator: '王五',
    timestamp: new Date('2024-01-21 09:10:00'),
    processRecords: [
      {
        action: 'mark_anomaly',
        operator: '王五',
        timestamp: new Date('2024-01-21 09:15:00'),
        status: '已标记',
        comments: 'COD值异常偏高'
      },
      {
        action: 'request_retest',
        operator: '王五',
        timestamp: new Date('2024-01-21 10:30:00'),
        status: '复测中',
        comments: '申请复测确认结果'
      }
    ]
  },
  {
    id: 'A003',
    resultId: 'R007',
    sampleId: 'S006',
    sampleBarcode: 'LAB2024010006',
    sampleName: '空气样品-F',
    sampleType: '空气',
    client: '环境监测局',
    receivedDate: new Date('2024-01-20'),
    sampleStatus: 'completed',
    testItemId: 'TI007',
    testItemName: 'SO2浓度',
    testMethodName: '二氧化硫测定',
    value: 0.15,
    unit: 'mg/m³',
    normalRange: '≤0.50',
    anomalyType: 'manual',
    reason: '数据录入错误，实际值应为1.5',
    markedBy: '赵六',
    markedAt: new Date('2024-01-22 14:20:00'),
    status: 'resolved',
    source: 'manual',
    instrumentId: null,
    operator: '赵六',
    timestamp: new Date('2024-01-22 14:15:00'),
    processRecords: [
      {
        action: 'mark_anomaly',
        operator: '赵六',
        timestamp: new Date('2024-01-22 14:20:00'),
        status: '已标记',
        comments: '发现录入错误'
      },
      {
        action: 'resolve',
        operator: '赵六',
        timestamp: new Date('2024-01-22 15:00:00'),
        status: '已解决',
        comments: '已更正数据录入错误'
      }
    ]
  }
]

// 生成更多异常数据(扩充到50条)
for (let i = 4; i <= 50; i++) {
  const sampleTypes = ['水质', '土壤', '空气', '食品']
  const testItems = ['重金属含量', 'COD', 'BOD', 'pH值', '氨氮', '总磷', 'PM2.5', 'SO2浓度']
  const clients = ['环保监测站', '农业检测中心', '环境监测局', '自来水公司', '食品安全局']
  const operators = ['张三', '李四', '王五', '赵六', '孙七']
  const anomalyTypes = ['out_of_range', 'deviation', 'manual']
  const statuses = ['pending', 'retesting', 'resolved', 'ignored']
  
  const sampleType = sampleTypes[i % sampleTypes.length]
  const testItem = testItems[i % testItems.length]
  const client = clients[i % clients.length]
  const operator = operators[i % operators.length]
  const anomalyType = anomalyTypes[i % anomalyTypes.length]
  const status = statuses[i % statuses.length]
  
  const value = 100 + Math.random() * 100
  
  mockAnomalies.push({
    id: `A${String(i).padStart(3, '0')}`,
    resultId: `R${String(i + 100).padStart(3, '0')}`,
    sampleId: `S${String(Math.floor(i / 2) + 1).padStart(3, '0')}`,
    sampleBarcode: `LAB20240100${String(Math.floor(i / 2) + 1).padStart(2, '0')}`,
    sampleName: `${sampleType}样品-${String.fromCharCode(65 + (i % 26))}`,
    sampleType: sampleType,
    client: client,
    receivedDate: new Date(2024, 0, 10 + (i % 15)),
    sampleStatus: i % 2 === 0 ? 'completed' : 'in_progress',
    testItemId: `TI${String(i % 10).padStart(3, '0')}`,
    testItemName: testItem,
    testMethodName: `${sampleType}${testItem}测定`,
    value: parseFloat(value.toFixed(2)),
    unit: 'mg/L',
    normalRange: '0-50',
    anomalyType: anomalyType,
    reason: `${testItem}${anomalyType === 'out_of_range' ? '超出正常范围' : anomalyType === 'deviation' ? '偏差过大' : '人工标记异常'}`,
    markedBy: operator,
    markedAt: new Date(2024, 0, 20 + (i % 5), 9 + (i % 8), (i * 10) % 60),
    status: status,
    source: i % 2 === 0 ? 'instrument' : 'manual',
    instrumentId: i % 2 === 0 ? `INST-${String(i % 5 + 1).padStart(3, '0')}` : null,
    operator: operator,
    timestamp: new Date(2024, 0, 20 + (i % 5), 9 + (i % 8), (i * 10) % 60),
    processRecords: [
      {
        action: 'mark_anomaly',
        operator: operator,
        timestamp: new Date(2024, 0, 20 + (i % 5), 9 + (i % 8), (i * 10) % 60),
        status: '已标记',
        comments: `检测值异常,需要处理`
      }
    ]
  })
}

// 页面初始化
onMounted(() => {
  loadData()
  loadStats()
})

// 加载统计数据
const loadStats = async () => {
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // 计算统计数据
    const total = mockAnomalies.length
    const pending = mockAnomalies.filter(item => item.status === 'pending').length
    const retesting = mockAnomalies.filter(item => item.status === 'retesting').length
    const resolved = mockAnomalies.filter(item => item.status === 'resolved').length
    
    stats.total = total
    stats.pending = pending
    stats.retesting = retesting
    stats.resolved = resolved
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

// 加载数据
const loadData = async (resetPage: boolean = false) => {
  loading.value = true
  
  // 只在搜索/重置时重置页码
  if (resetPage) {
    pagination.currentPage = 1
  }
  
  try {
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 应用筛选条件
    let filteredData = [...mockAnomalies]
    
    if (filters.barcode) {
      filteredData = filteredData.filter(item => 
        item.sampleBarcode.includes(filters.barcode)
      )
    }
    
    if (filters.anomalyType) {
      filteredData = filteredData.filter(item => 
        item.anomalyType === filters.anomalyType
      )
    }
    
    if (filters.status) {
      filteredData = filteredData.filter(item => 
        item.status === filters.status
      )
    }
    
    if (filters.dateRange && filters.dateRange.length === 2) {
      const [start, end] = filters.dateRange
      filteredData = filteredData.filter(item => {
        const markedAt = new Date(item.markedAt)
        return markedAt >= start && markedAt <= end
      })
    }
    
    pagination.total = filteredData.length
    
    // 分页
    const start = (pagination.currentPage - 1) * pagination.pageSize
    const end = start + pagination.pageSize
    tableData.value = filteredData.slice(start, end)
  } catch (error) {
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  loadData(true)
}

// 重置
const handleReset = () => {
  filters.barcode = ''
  filters.anomalyType = ''
  filters.status = ''
  filters.dateRange = null
  loadData(true)
}

// 分页变化
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  loadData()
}

const handleCurrentChange = (page: number) => {
  pagination.currentPage = page
  loadData()
}

// 选择变化
const handleSelectionChange = (selection: any[]) => {
  selectedAnomalies.value = selection
}

// 导出异常
const handleExport = () => {
  ElMessage.info('正在导出异常数据...')
  // 实际应用中这里应该触发导出功能
}

// 批量处理
const handleBatchProcess = () => {
  if (selectedAnomalies.value.length === 0) {
    ElMessage.warning('请先选择要处理的异常')
    return
  }
  
  // 重置表单
  batchForm.action = 'retest'
  batchForm.reason = ''
  batchForm.resolution = ''
  batchForm.ignoreReason = ''
  
  batchDialogVisible.value = true
}

// 查看样品详情
const handleViewSample = (sampleId: string) => {
  router.push(`/sample/detail/${sampleId}`)
}

// 查看异常详情
const handleViewDetail = (row: any) => {
  currentAnomaly.value = row
  detailDialogVisible.value = true
}

// 申请复测
const handleRequestRetest = (row: any) => {
  currentAnomaly.value = row
  
  // 重置表单
  retestForm.reason = ''
  retestForm.priority = 'normal'
  retestForm.expectedDate = null
  
  retestDialogVisible.value = true
}

// 从详情页申请复测
const handleRequestRetestFromDetail = () => {
  detailDialogVisible.value = false
  handleRequestRetest(currentAnomaly.value)
}

// 标记解决
const handleResolve = async (row: any) => {
  try {
    const { value } = await ElMessageBox.prompt('请输入解决说明', '标记解决', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      inputPlaceholder: '请输入解决说明'
    })
    
    if (value) {
      console.log('标记解决:', row.id, value)
      ElMessage.success('已标记为解决')
      
      // 更新状态
      row.status = 'resolved'
      
      // 刷新统计数据
      loadStats()
    }
  } catch {
    // 用户取消
  }
}

// 从详情页标记解决
const handleResolveFromDetail = () => {
  detailDialogVisible.value = false
  handleResolve(currentAnomaly.value)
}

// 提交复测申请
const handleSubmitRetest = async () => {
  try {
    await retestFormRef.value.validate()
    
    submitting.value = true
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    console.log('提交复测申请:', {
      anomalyId: currentAnomaly.value?.id,
      ...retestForm
    })
    
    ElMessage.success('复测申请已提交')
    
    // 更新状态
    if (currentAnomaly.value) {
      currentAnomaly.value.status = 'retesting'
    }
    
    retestDialogVisible.value = false
    
    // 刷新数据
    loadData()
    loadStats()
  } catch (error) {
    console.error('提交复测申请失败:', error)
  } finally {
    submitting.value = false
  }
}

// 提交批量处理
const handleSubmitBatch = async () => {
  try {
    await batchFormRef.value.validate()
    
    submitting.value = true
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    console.log('批量处理:', {
      action: batchForm.action,
      anomalies: selectedAnomalies.value.map(item => item.id),
      ...batchForm
    })
    
    ElMessage.success(`已${getActionText(batchForm.action)} ${selectedAnomalies.value.length} 个异常`)
    
    // 更新状态
    selectedAnomalies.value.forEach(anomaly => {
      if (batchForm.action === 'retest') {
        anomaly.status = 'retesting'
      } else if (batchForm.action === 'resolve') {
        anomaly.status = 'resolved'
      } else if (batchForm.action === 'ignore') {
        anomaly.status = 'ignored'
      }
    })
    
    batchDialogVisible.value = false
    
    // 清空选择
    selectedAnomalies.value = []
    
    // 刷新数据
    loadData()
    loadStats()
  } catch (error) {
    console.error('批量处理失败:', error)
  } finally {
    submitting.value = false
  }
}
// 工具函数
const formatValue = (value: any) => {
  if (typeof value === 'number') {
    return value.toFixed(2)
  }
  return value
}

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('zh-CN')
}

const formatDateTime = (date: Date) => {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 异常类型相关
const getAnomalyTypeText = (type: string) => {
  const textMap: Record<string, string> = {
    out_of_range: '超出范围',
    deviation: '偏差过大',
    manual: '人工标记'
  }
  return textMap[type] || type
}

const getAnomalyTypeTag = (type: string) => {
  const tagMap: Record<string, string> = {
    out_of_range: 'danger',
    deviation: 'warning',
    manual: 'info'
  }
  return tagMap[type] || 'info'
}

// 状态相关
const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    pending: '待处理',
    retesting: '复测中',
    resolved: '已解决',
    ignored: '已忽略'
  }
  return textMap[status] || status
}

const getStatusTag = (status: string) => {
  const tagMap: Record<string, string> = {
    pending: 'warning',
    retesting: 'primary',
    resolved: 'success',
    ignored: 'info'
  }
  return tagMap[status] || 'info'
}

// 样品状态相关
const getSampleStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    registered: 'info',
    in_progress: 'warning',
    completed: 'success',
    released: 'success',
    returned: 'danger'
  }
  return typeMap[status] || 'info'
}

const getSampleStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    registered: '已登记',
    in_progress: '检测中',
    completed: '已完成',
    released: '已放行',
    returned: '已退回'
  }
  return textMap[status] || status
}

// 处理记录相关
const getProcessActionText = (action: string) => {
  const textMap: Record<string, string> = {
    mark_anomaly: '标记异常',
    request_retest: '申请复测',
    resolve: '标记解决',
    ignore: '忽略异常'
  }
  return textMap[action] || action
}

const getProcessActionTag = (action: string) => {
  const tagMap: Record<string, string> = {
    mark_anomaly: 'danger',
    request_retest: 'warning',
    resolve: 'success',
    ignore: 'info'
  }
  return tagMap[action] || 'info'
}

const getProcessTimelineType = (action: string) => {
  const typeMap: Record<string, string> = {
    mark_anomaly: 'danger',
    request_retest: 'warning',
    resolve: 'success',
    ignore: 'info'
  }
  return typeMap[action] || 'primary'
}

// 批量操作相关
const getActionText = (action: string) => {
  const textMap: Record<string, string> = {
    retest: '申请复测',
    resolve: '标记解决',
    ignore: '忽略'
  }
  return textMap[action] || action
}
</script>
<style scoped lang="scss">
.anomaly-management {
  padding: 20px;

  .page-header {
    margin-bottom: 20px;
    
    .page-title {
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 8px 0;
    }
  }

  .stats-cards {
    margin-bottom: 20px;

    .stat-card {
      .stat-content {
        display: flex;
        align-items: center;
        padding: 8px 0;

        .stat-icon {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 16px;
          font-size: 24px;

          &.danger {
            background-color: #fef0f0;
            color: #f56c6c;
          }

          &.warning {
            background-color: #fdf6ec;
            color: #e6a23c;
          }

          &.primary {
            background-color: #ecf5ff;
            color: #409eff;
          }

          &.success {
            background-color: #f0f9ff;
            color: #67c23a;
          }
        }

        .stat-info {
          flex: 1;

          .stat-number {
            font-size: 28px;
            font-weight: 600;
            color: var(--el-text-color-primary);
            line-height: 1;
          }

          .stat-label {
            font-size: 14px;
            color: var(--el-text-color-regular);
            margin-top: 4px;
          }
        }
      }
    }
  }

  .filter-card {
    margin-bottom: 20px;

    .filter-form {
      :deep(.el-form-item) {
        margin-bottom: 16px;
      }
    }
  }

  .table-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;

      .header-actions {
        display: flex;
        gap: 12px;
      }
    }

    .pagination-container {
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
    }

    .anomaly-value {
      color: #f56c6c;
      font-weight: 600;
    }
  }

  .anomaly-detail {
    .anomaly-value {
      color: #f56c6c;
      font-weight: 600;
    }

    .timeline-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
    }
  }

  .batch-process {
    .anomaly-value {
      color: #f56c6c;
      font-weight: 600;
    }
  }
}
</style>