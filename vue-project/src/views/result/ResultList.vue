<template>
  <div class="result-list">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">结果查询</h2>
      <el-text type="info">查询和管理检测结果数据</el-text>
    </div>

    <!-- 搜索和筛选区域 -->
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
        
        <el-form-item label="样品名称">
          <el-input
            v-model="filters.sampleName"
            placeholder="请输入样品名称"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        
        <el-form-item label="检测项">
          <el-input
            v-model="filters.testItem"
            placeholder="请输入检测项名称"
            clearable
            style="width: 180px"
          />
        </el-form-item>
        
        <el-form-item label="结果状态">
          <el-select
            v-model="filters.status"
            placeholder="请选择结果状态"
            clearable
            style="width: 180px"
          >
            <el-option label="正常" value="normal" />
            <el-option label="异常" value="anomaly" />
            <el-option label="已复测" value="retested" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="录入时间">
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

    <!-- 结果列表 -->
    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>检测结果列表</span>
          <div class="header-actions">
            <el-button type="success" @click="handleExport">
              <el-icon><Download /></el-icon>
              导出结果
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="tableData"
        border
        stripe
        :row-class-name="getRowClassName"
        style="width: 100%"
      >
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
        
        <el-table-column prop="value" label="检测值" min-width="120">
          <template #default="{ row }">
            <span :class="{ 'anomaly-value': row.isAnomaly }">
              {{ formatValue(row.value) }} {{ row.unit }}
            </span>
          </template>
        </el-table-column>
        
        <el-table-column prop="calculatedValue" label="计算结果" min-width="120">
          <template #default="{ row }">
            <span v-if="row.calculatedValue !== null && row.calculatedValue !== undefined">
              {{ formatValue(row.calculatedValue) }} {{ row.calculatedUnit }}
              <el-tooltip placement="top">
                <template #content>
                  <div>计算公式: {{ row.formula }}</div>
                </template>
                <el-icon class="formula-icon"><Operation /></el-icon>
              </el-tooltip>
            </span>
            <el-text v-else type="info" size="small">-</el-text>
          </template>
        </el-table-column>
        
        <el-table-column prop="source" label="数据来源" width="100">
          <template #default="{ row }">
            <el-tag :type="row.source === 'manual' ? 'info' : 'success'" size="small">
              {{ row.source === 'manual' ? '手工录入' : '仪器导入' }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="operator" label="操作人" width="100" />
        
        <el-table-column prop="timestamp" label="录入时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.timestamp) }}
          </template>
        </el-table-column>
        
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.isAnomaly" type="danger" size="small">
              异常
            </el-tag>
            <el-tag v-else-if="row.retestCount > 0" type="warning" size="small">
              已复测
            </el-tag>
            <el-tag v-else type="success" size="small">
              正常
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleViewDetail(row)">
              <el-icon><View /></el-icon>
              查看详情
            </el-button>
            <el-button
              v-if="row.retestCount > 0"
              type="info"
              link
              size="small"
              @click="handleViewRetestHistory(row)"
            >
              <el-icon><Clock /></el-icon>
              复测历史
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


    <!-- 结果详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="结果详情"
      width="900px"
      :close-on-click-modal="false"
    >
      <div v-if="currentResult" class="result-detail">
        <!-- 样品信息 -->
        <el-divider content-position="left">样品信息</el-divider>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="样品条码">
            {{ currentResult.sampleBarcode }}
          </el-descriptions-item>
          <el-descriptions-item label="样品名称">
            {{ currentResult.sampleName }}
          </el-descriptions-item>
          <el-descriptions-item label="样品类型">
            {{ currentResult.sampleType }}
          </el-descriptions-item>
          <el-descriptions-item label="委托方">
            {{ currentResult.client }}
          </el-descriptions-item>
          <el-descriptions-item label="接收日期">
            {{ formatDate(currentResult.receivedDate) }}
          </el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag :type="getStatusType(currentResult.sampleStatus)">
              {{ getStatusText(currentResult.sampleStatus) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 检测结果 -->
        <el-divider content-position="left">检测结果</el-divider>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="检测项">
            {{ currentResult.testItemName }}
          </el-descriptions-item>
          <el-descriptions-item label="检测方法">
            {{ currentResult.testMethodName }} ({{ currentResult.testMethodCode }})
          </el-descriptions-item>
          <el-descriptions-item label="检测值">
            <span :class="{ 'anomaly-value': currentResult.isAnomaly }">
              {{ formatValue(currentResult.value) }} {{ currentResult.unit }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="正常范围">
            {{ currentResult.normalRange || '未设置' }}
          </el-descriptions-item>
          <el-descriptions-item label="数据来源">
            <el-tag :type="currentResult.source === 'manual' ? 'info' : 'success'" size="small">
              {{ currentResult.source === 'manual' ? '手工录入' : '仪器导入' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="仪器编号">
            {{ currentResult.instrumentId || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="操作人">
            {{ currentResult.operator }}
          </el-descriptions-item>
          <el-descriptions-item label="录入时间">
            {{ formatDateTime(currentResult.timestamp) }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 计算结果（如果有） -->
        <template v-if="currentResult.calculatedValue !== null && currentResult.calculatedValue !== undefined">
          <el-divider content-position="left">计算结果</el-divider>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="计算值">
              {{ formatValue(currentResult.calculatedValue) }} {{ currentResult.calculatedUnit }}
            </el-descriptions-item>
            <el-descriptions-item label="计算公式">
              {{ currentResult.formula }}
            </el-descriptions-item>
            <el-descriptions-item label="计算依据" :span="2">
              <el-tag
                v-for="(dep, index) in currentResult.calculatedFrom"
                :key="index"
                size="small"
                style="margin-right: 8px"
              >
                {{ dep }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </template>


        <!-- 异常信息（如果有） -->
        <template v-if="currentResult.isAnomaly && currentResult.anomalyInfo">
          <el-divider content-position="left">异常信息</el-divider>
          <el-alert
            :title="`异常类型：${getAnomalyTypeText(currentResult.anomalyInfo.type)}`"
            :type="'error'"
            :closable="false"
            style="margin-bottom: 16px"
          >
            <template #default>
              <div style="margin-top: 8px">
                <strong>异常原因：</strong>{{ currentResult.anomalyInfo.reason }}
              </div>
              <div style="margin-top: 4px">
                <strong>标记人：</strong>{{ currentResult.anomalyInfo.markedBy }}
                <span style="margin-left: 16px">
                  <strong>标记时间：</strong>{{ formatDateTime(currentResult.anomalyInfo.markedAt) }}
                </span>
              </div>
            </template>
          </el-alert>
        </template>

        <!-- 备注信息 -->
        <template v-if="currentResult.remarks">
          <el-divider content-position="left">备注信息</el-divider>
          <el-input
            v-model="currentResult.remarks"
            type="textarea"
            :rows="3"
            readonly
          />
        </template>
      </div>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
        <el-button
          v-if="currentResult?.isAnomaly"
          type="warning"
          @click="handleGoToAnomaly"
        >
          <el-icon><Warning /></el-icon>
          查看异常管理
        </el-button>
      </template>
    </el-dialog>

    <!-- 复测历史对话框 -->
    <el-dialog
      v-model="retestHistoryDialogVisible"
      title="复测历史"
      width="1000px"
      :close-on-click-modal="false"
    >
      <div v-if="currentResult" class="retest-history">
        <el-alert
          :title="`样品：${currentResult.sampleName} (${currentResult.sampleBarcode}) - 检测项：${currentResult.testItemName}`"
          type="info"
          :closable="false"
          style="margin-bottom: 20px"
        />

        <el-timeline>
          <el-timeline-item
            v-for="(record, index) in retestHistory"
            :key="index"
            :timestamp="formatDateTime(record.timestamp)"
            placement="top"
            :type="getRetestTimelineType(record.type)"
            :icon="getRetestTimelineIcon(record.type)"
          >
            <el-card>
              <template #header>
                <div class="timeline-card-header">
                  <span>{{ getRetestTypeText(record.type) }}</span>
                  <el-tag :type="getRetestResultTag(record)" size="small">
                    {{ record.isAnomaly ? '异常' : '正常' }}
                  </el-tag>
                </div>
              </template>
              
              <el-descriptions :column="3" size="small">
                <el-descriptions-item label="检测值">
                  <span :class="{ 'anomaly-value': record.isAnomaly }">
                    {{ formatValue(record.value) }} {{ record.unit }}
                  </span>
                </el-descriptions-item>
                <el-descriptions-item label="操作人">
                  {{ record.operator }}
                </el-descriptions-item>
                <el-descriptions-item label="数据来源">
                  <el-tag :type="record.source === 'manual' ? 'info' : 'success'" size="small">
                    {{ record.source === 'manual' ? '手工录入' : '仪器导入' }}
                  </el-tag>
                </el-descriptions-item>
              </el-descriptions>
              
              <div v-if="record.remarks" style="margin-top: 12px">
                <el-text type="info" size="small">备注：</el-text>
                <el-text size="small">{{ record.remarks }}</el-text>
              </div>
            </el-card>
          </el-timeline-item>
        </el-timeline>
      </div>

      <template #footer>
        <el-button @click="retestHistoryDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>


<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Search,
  Refresh,
  Download,
  View,
  Clock,
  Operation,
  Warning,
  Check,
  Close,
  QuestionFilled
} from '@element-plus/icons-vue'
import type { TestResult } from '@/types'
import { sampleApi } from '@/services/api/sample'

// 路由
const router = useRouter()

// 加载状态
const loading = ref(false)

// 筛选条件
const filters = reactive({
  barcode: '',
  sampleName: '',
  testItem: '',
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

// 对话框状态
const detailDialogVisible = ref(false)
const retestHistoryDialogVisible = ref(false)

// 当前操作的结果
const currentResult = ref<any>(null)

// 复测历史数据
const retestHistory = ref<any[]>([])

// 模拟数据
const mockData = [
  {
    id: 'R001',
    sampleId: 'S001',
    sampleBarcode: 'LAB2024010001',
    sampleName: '水质样品-A',
    sampleType: '水质',
    client: '环保监测站',
    receivedDate: new Date('2024-01-15'),
    sampleStatus: 'completed',
    testItemId: 'TI001',
    testItemName: 'pH值',
    testMethodName: '水质pH值测定',
    testMethodCode: 'GB/T 6920-1986',
    value: 7.2,
    unit: '',
    normalRange: '6.5-8.5',
    calculatedValue: null,
    calculatedUnit: null,
    formula: null,
    calculatedFrom: [],
    source: 'manual',
    instrumentId: null,
    operator: '张三',
    timestamp: new Date('2024-01-20 10:30:00'),
    isAnomaly: false,
    anomalyInfo: null,
    retestCount: 0,
    remarks: '样品外观正常，检测过程顺利'
  },
  {
    id: 'R002',
    sampleId: 'S001',
    sampleBarcode: 'LAB2024010001',
    sampleName: '水质样品-A',
    sampleType: '水质',
    client: '环保监测站',
    receivedDate: new Date('2024-01-15'),
    sampleStatus: 'completed',
    testItemId: 'TI002',
    testItemName: '温度',
    testMethodName: '水质pH值测定',
    testMethodCode: 'GB/T 6920-1986',
    value: 25,
    unit: '℃',
    normalRange: '0-100',
    calculatedValue: null,
    calculatedUnit: null,
    formula: null,
    calculatedFrom: [],
    source: 'instrument',
    instrumentId: 'INST-001',
    operator: '张三',
    timestamp: new Date('2024-01-20 10:35:00'),
    isAnomaly: false,
    anomalyInfo: null,
    retestCount: 0,
    remarks: null
  },
  {
    id: 'R003',
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
    testMethodCode: 'GB 15618-2018',
    value: 125.8,
    unit: 'mg/kg',
    normalRange: '0-100',
    calculatedValue: 1.258,
    calculatedUnit: 'g/kg',
    formula: '重金属含量(mg/kg) / 1000',
    calculatedFrom: ['重金属含量'],
    source: 'instrument',
    instrumentId: 'INST-002',
    operator: '李四',
    timestamp: new Date('2024-01-20 11:15:00'),
    isAnomaly: true,
    anomalyInfo: {
      type: 'out_of_range',
      reason: '重金属含量超出正常范围上限',
      markedBy: '李四',
      markedAt: new Date('2024-01-20 11:20:00')
    },
    retestCount: 1,
    remarks: '样品来源为工业区附近，需要复测确认'
  },
  {
    id: 'R004',
    sampleId: 'S003',
    sampleBarcode: 'LAB2024010003',
    sampleName: '空气样品-C',
    sampleType: '空气',
    client: '环境监测局',
    receivedDate: new Date('2024-01-17'),
    sampleStatus: 'completed',
    testItemId: 'TI004',
    testItemName: 'PM2.5浓度',
    testMethodName: '环境空气PM2.5测定',
    testMethodCode: 'HJ 618-2011',
    value: 35.2,
    unit: 'μg/m³',
    normalRange: '0-75',
    calculatedValue: null,
    calculatedUnit: null,
    formula: null,
    calculatedFrom: [],
    source: 'instrument',
    instrumentId: 'INST-003',
    operator: '王五',
    timestamp: new Date('2024-01-20 14:20:00'),
    isAnomaly: false,
    anomalyInfo: null,
    retestCount: 0,
    remarks: null
  },
  {
    id: 'R005',
    sampleId: 'S004',
    sampleBarcode: 'LAB2024010004',
    sampleName: '水质样品-D',
    sampleType: '水质',
    client: '自来水公司',
    receivedDate: new Date('2024-01-18'),
    sampleStatus: 'in_progress',
    testItemId: 'TI005',
    testItemName: '浊度',
    testMethodName: '水质浊度测定',
    testMethodCode: 'GB/T 13200-1991',
    value: 15.5,
    unit: 'NTU',
    normalRange: '0-1000',
    calculatedValue: null,
    calculatedUnit: null,
    formula: null,
    calculatedFrom: [],
    source: 'manual',
    instrumentId: null,
    operator: '赵六',
    timestamp: new Date('2024-01-20 15:45:00'),
    isAnomaly: false,
    anomalyInfo: null,
    retestCount: 0,
    remarks: '水样清澈，浊度在正常范围内'
  }
]

// 生成更多模拟数据(扩充到60条)
for (let i = 6; i <= 60; i++) {
  const sampleTypes = ['水质', '土壤', '空气', '食品']
  const testItems = ['pH值', '温度', '重金属含量', 'PM2.5浓度', '浊度', 'COD', 'BOD', '氨氮', '总磷', '总氮']
  const clients = ['环保监测站', '农业检测中心', '环境监测局', '自来水公司', '食品安全局']
  const operators = ['张三', '李四', '王五', '赵六', '孙七']
  const sources = ['manual', 'instrument']
  
  const sampleType = sampleTypes[i % sampleTypes.length]
  const testItem = testItems[i % testItems.length]
  const client = clients[i % clients.length]
  const operator = operators[i % operators.length]
  const source = sources[i % sources.length]
  
  const isAnomaly = i % 7 === 0 // 每7条有一条异常
  const value = isAnomaly ? 150 + Math.random() * 50 : 20 + Math.random() * 50
  
  mockData.push({
    id: `R${String(i).padStart(3, '0')}`,
    sampleId: `S${String(Math.floor(i / 3) + 1).padStart(3, '0')}`,
    sampleBarcode: `LAB20240100${String(Math.floor(i / 3) + 1).padStart(2, '0')}`,
    sampleName: `${sampleType}样品-${String.fromCharCode(65 + (i % 26))}`,
    sampleType: sampleType,
    client: client,
    receivedDate: new Date(2024, 0, 10 + (i % 15)),
    sampleStatus: i % 3 === 0 ? 'completed' : 'in_progress',
    testItemId: `TI${String(i % 10).padStart(3, '0')}`,
    testItemName: testItem,
    testMethodName: `${sampleType}${testItem}测定`,
    testMethodCode: `GB/T ${6000 + i}-2020`,
    value: parseFloat(value.toFixed(2)),
    unit: testItem === 'pH值' ? '' : (testItem === '温度' ? '℃' : 'mg/L'),
    normalRange: isAnomaly ? '0-100' : '0-200',
    calculatedValue: null,
    calculatedUnit: null,
    formula: null,
    calculatedFrom: [],
    source: source,
    instrumentId: source === 'instrument' ? `INST-${String(i % 5 + 1).padStart(3, '0')}` : null,
    operator: operator,
    timestamp: new Date(2024, 0, 20, 8 + (i % 10), (i * 15) % 60),
    isAnomaly: isAnomaly,
    anomalyInfo: isAnomaly ? {
      type: 'out_of_range',
      reason: `${testItem}超出正常范围`,
      markedBy: operator,
      markedAt: new Date(2024, 0, 20, 8 + (i % 10), (i * 15) % 60 + 5)
    } : null,
    retestCount: isAnomaly ? 1 : 0,
    remarks: isAnomaly ? '需要复测确认' : null
  })
}

// 模拟复测历史数据
const mockRetestHistory = [
  {
    type: 'original',
    value: 125.8,
    unit: 'mg/kg',
    source: 'instrument',
    operator: '李四',
    timestamp: new Date('2024-01-20 11:15:00'),
    isAnomaly: true,
    remarks: '初次检测，结果异常'
  },
  {
    type: 'retest',
    value: 118.5,
    unit: 'mg/kg',
    source: 'instrument',
    operator: '李四',
    timestamp: new Date('2024-01-21 09:30:00'),
    isAnomaly: true,
    remarks: '复测结果仍然超标，但数值有所下降'
  }
];


// 加载数据
const loadData = async (resetPage: boolean = false) => {
  loading.value = true
  
  // 只在搜索/重置时重置页码
  if (resetPage) {
    pagination.currentPage = 1
  }
  
  try {
    // 从样品数据库获取真实的样品信息
    let realSamples: any[] = []
    try {
      const sampleResponse = await sampleApi.getList({
        page: 1,
        pageSize: 1000,
        filters: {}
      })
      
      realSamples = sampleResponse.items.map(sample => ({
        id: sample.id,
        barcode: sample.barcode,
        name: sample.sampleName || sample.clientName || '未命名样品',
        type: sample.sampleType || '未知类型',
        client: sample.clientName || '未知委托方',
        receivedDate: sample.receivedDate ? new Date(sample.receivedDate) : new Date(),
        status: sample.status || 'REGISTERED'
      }))
      
      console.log('从数据库获取样品信息，共', realSamples.length, '个样品')
    } catch (error) {
      console.log('获取样品信息失败，使用模拟数据:', error)
    }
    
    // 如果有真实样品数据，为每个样品生成模拟的检测结果
    let allResults = [...mockData]
    
    if (realSamples.length > 0) {
      const testItems = ['pH值', '温度', '重金属含量', 'PM2.5浓度', '浊度', 'COD', 'BOD', '氨氮', '总磷', '总氮']
      const operators = ['张三', '李四', '王五', '赵六', '孙七']
      const sources = ['manual', 'instrument']
      
      // 为每个真实样品生成2-3个检测结果
      const generatedResults: any[] = []
      realSamples.forEach((sample, sampleIndex) => {
        const resultCount = 2 + (sampleIndex % 2) // 每个样品2-3个结果
        
        for (let i = 0; i < resultCount; i++) {
          const testItem = testItems[(sampleIndex * 3 + i) % testItems.length]
          const operator = operators[(sampleIndex + i) % operators.length]
          const source = sources[(sampleIndex + i) % sources.length]
          const isAnomaly = (sampleIndex * 3 + i) % 7 === 0 // 每7条有一条异常
          const value = isAnomaly ? 150 + Math.random() * 50 : 20 + Math.random() * 50
          
          generatedResults.push({
            id: `R${String(sampleIndex * 10 + i + 1).padStart(3, '0')}`,
            sampleId: sample.id,
            sampleBarcode: sample.barcode,
            sampleName: sample.name,
            sampleType: sample.type,
            client: sample.client,
            receivedDate: sample.receivedDate,
            sampleStatus: sample.status,
            testItemId: `TI${String((sampleIndex * 3 + i) % 10).padStart(3, '0')}`,
            testItemName: testItem,
            testMethodName: `${sample.type}${testItem}测定`,
            testMethodCode: `GB/T ${6000 + sampleIndex * 3 + i}-2020`,
            value: parseFloat(value.toFixed(2)),
            unit: testItem === 'pH值' ? '' : (testItem === '温度' ? '℃' : 'mg/L'),
            normalRange: isAnomaly ? '0-100' : '0-200',
            calculatedValue: null,
            calculatedUnit: null,
            formula: null,
            calculatedFrom: [],
            source: source,
            instrumentId: source === 'instrument' ? `INST-${String((i % 5) + 1).padStart(3, '0')}` : null,
            operator: operator,
            timestamp: new Date(2024, 0, 20, 8 + (i % 10), (i * 15) % 60),
            isAnomaly: isAnomaly,
            anomalyInfo: isAnomaly ? {
              type: 'out_of_range',
              reason: `${testItem}超出正常范围`,
              markedBy: operator,
              markedAt: new Date(2024, 0, 20, 8 + (i % 10), (i * 15) % 60 + 5)
            } : null,
            retestCount: isAnomaly ? 1 : 0,
            remarks: isAnomaly ? '需要复测确认' : null
          })
        }
      })
      
      console.log('为真实样品生成检测结果，共', generatedResults.length, '条')
      allResults = generatedResults
    }
    
    // 应用筛选条件
    let filteredData = allResults
    
    if (filters.barcode) {
      filteredData = filteredData.filter(item => 
        item.sampleBarcode.includes(filters.barcode)
      )
    }
    
    if (filters.sampleName) {
      filteredData = filteredData.filter(item => 
        item.sampleName.includes(filters.sampleName)
      )
    }
    
    if (filters.testItem) {
      filteredData = filteredData.filter(item => 
        item.testItemName.includes(filters.testItem)
      )
    }
    
    if (filters.status) {
      if (filters.status === 'normal') {
        filteredData = filteredData.filter(item => !item.isAnomaly && item.retestCount === 0)
      } else if (filters.status === 'anomaly') {
        filteredData = filteredData.filter(item => item.isAnomaly)
      } else if (filters.status === 'retested') {
        filteredData = filteredData.filter(item => item.retestCount > 0)
      }
    }
    
    if (filters.dateRange && filters.dateRange.length === 2) {
      const [start, end] = filters.dateRange
      filteredData = filteredData.filter(item => {
        const timestamp = new Date(item.timestamp)
        return timestamp >= start && timestamp <= end
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
  filters.sampleName = ''
  filters.testItem = ''
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

// 导出结果
const handleExport = () => {
  ElMessage.info('正在导出检测结果...')
  // 实际应用中这里应该触发导出功能
}

// 查看样品详情
const handleViewSample = (sampleId: string) => {
  router.push(`/sample/detail/${sampleId}`)
}

// 查看结果详情
const handleViewDetail = (row: any) => {
  currentResult.value = row
  detailDialogVisible.value = true
}

// 查看复测历史
const handleViewRetestHistory = (row: any) => {
  currentResult.value = row
  retestHistory.value = [...mockRetestHistory]
  retestHistoryDialogVisible.value = true
}

// 跳转到异常管理
const handleGoToAnomaly = () => {
  detailDialogVisible.value = false
  router.push('/result/anomaly')
}


// 获取行类名（用于高亮异常结果）
const getRowClassName = ({ row }: { row: any }) => {
  if (row.isAnomaly) {
    return 'anomaly-row'
  }
  return ''
}

// 格式化值
const formatValue = (value: any) => {
  if (typeof value === 'number') {
    return value.toFixed(2)
  }
  return value
}

// 格式化日期
const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('zh-CN')
}

// 格式化日期时间
const formatDateTime = (date: Date) => {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取状态类型
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

// 获取状态文本
const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    registered: '已登记',
    in_progress: '检测中',
    completed: '已完成',
    released: '已放行',
    returned: '已退回'
  }
  return textMap[status] || status
}

// 获取异常类型文本
const getAnomalyTypeText = (type: string) => {
  const textMap: Record<string, string> = {
    out_of_range: '超出范围',
    deviation: '偏差过大',
    manual: '人工标记'
  }
  return textMap[type] || type
}

// 获取复测类型文本
const getRetestTypeText = (type: string) => {
  const textMap: Record<string, string> = {
    original: '初次检测',
    retest: '复测'
  }
  return textMap[type] || type
}

// 获取复测时间线类型
const getRetestTimelineType = (type: string) => {
  return type === 'original' ? 'primary' : 'warning'
}

// 获取复测时间线图标
const getRetestTimelineIcon = (type: string) => {
  return type === 'original' ? QuestionFilled : Check
}

// 获取复测结果标签
const getRetestResultTag = (record: any) => {
  return record.isAnomaly ? 'danger' : 'success'
}

// 组件挂载
onMounted(() => {
  loadData()
})
</script>


<style scoped lang="scss">
.result-list {
  padding: 20px;

  .page-header {
    margin-bottom: 20px;
    
    .page-title {
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 8px 0;
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

    // 异常行高亮
    :deep(.anomaly-row) {
      background-color: #fef0f0;
      
      &:hover > td {
        background-color: #fde2e2 !important;
      }
    }

    .anomaly-value {
      color: #f56c6c;
      font-weight: 600;
    }

    .formula-icon {
      margin-left: 4px;
      color: #409eff;
      cursor: help;
      vertical-align: middle;
    }
  }

  .result-detail {
    .anomaly-value {
      color: #f56c6c;
      font-weight: 600;
    }
  }

  .retest-history {
    .timeline-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
    }

    .anomaly-value {
      color: #f56c6c;
      font-weight: 600;
    }
  }
}
</style>
