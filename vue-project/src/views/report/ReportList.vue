<template>
  <div class="report-list">
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="title">报告列表</span>
          <el-button type="primary" :icon="Plus" @click="handleCreate">
            生成报告
          </el-button>
        </div>
      </template>

      <!-- 筛选区域 -->
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item label="报告类型">
          <el-select v-model="filters.reportType" placeholder="全部类型" clearable style="width: 180px">
            <el-option label="分析报告" value="ANALYSIS_REPORT" />
            <el-option label="样品报告" value="SAMPLE_REPORT" />
            <el-option label="技术报告" value="TECHNICAL_REPORT" />
            <el-option label="质量报告" value="QUALITY_REPORT" />
            <el-option label="综合报告" value="COMPREHENSIVE_REPORT" />
          </el-select>
        </el-form-item>

        <el-form-item label="报告状态">
          <el-select v-model="filters.status" placeholder="全部状态" clearable style="width: 150px">
            <el-option label="草稿" value="DRAFT" />
            <el-option label="待签名" value="PENDING_SIGNATURE" />
            <el-option label="已签名" value="SIGNED" />
            <el-option label="已分发" value="DISTRIBUTED" />
            <el-option label="已撤回" value="RECALLED" />
          </el-select>
        </el-form-item>

        <el-form-item label="报告编号">
          <el-input
            v-model="filters.reportNumber"
            placeholder="输入报告编号"
            clearable
            style="width: 200px"
          />
        </el-form-item>

        <el-form-item label="样品条码">
          <el-input
            v-model="filters.sampleBarcode"
            placeholder="输入样品条码"
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
            <el-statistic title="总报告数" :value="statistics.total">
              <template #suffix>
                <span class="statistic-unit">份</span>
              </template>
            </el-statistic>
          </el-col>
          <el-col :span="6">
            <el-statistic title="待签名" :value="statistics.pendingSignature">
              <template #suffix>
                <span class="statistic-unit">份</span>
              </template>
            </el-statistic>
          </el-col>
          <el-col :span="6">
            <el-statistic title="已签名" :value="statistics.signed">
              <template #suffix>
                <span class="statistic-unit">份</span>
              </template>
            </el-statistic>
          </el-col>
          <el-col :span="6">
            <el-statistic title="已分发" :value="statistics.distributed">
              <template #suffix>
                <span class="statistic-unit">份</span>
              </template>
            </el-statistic>
          </el-col>
        </el-row>
      </div>

      <!-- 报告列表 -->
      <el-table
        :data="reports"
        v-loading="loading"
        stripe
        style="width: 100%; margin-top: 20px"
      >
        <el-table-column prop="reportNumber" label="报告编号" width="200" show-overflow-tooltip />
        
        <el-table-column label="报告类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getReportTypeTagType(row.reportType)">
              {{ getReportTypeText(row.reportType) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="样品信息" width="250">
          <template #default="{ row }">
            <div>
              <div><strong>{{ row.sample?.name || '未知样品' }}</strong></div>
              <div class="text-secondary">条码: {{ row.sample?.barcode || '-' }}</div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="委托单位" width="180" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.sample?.client || '-' }}
          </template>
        </el-table-column>

        <el-table-column label="报告状态" width="110">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="生成人员" width="120">
          <template #default="{ row }">
            {{ row.generatedBy || '-' }}
          </template>
        </el-table-column>

        <el-table-column label="生成时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.generatedAt) }}
          </template>
        </el-table-column>

        <el-table-column label="签名状态" width="100">
          <template #default="{ row }">
            <el-icon v-if="row.signatures && row.signatures.length > 0" color="#67c23a" :size="20">
              <Check />
            </el-icon>
            <el-icon v-else color="#909399" :size="20">
              <Close />
            </el-icon>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="handleView(row)"
            >
              查看
            </el-button>
            <el-button
              v-if="row.status === 'DRAFT'"
              type="warning"
              size="small"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              v-if="row.status === 'DRAFT'"
              type="danger"
              size="small"
              @click="handleDelete(row)"
            >
              删除
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

    <!-- 报告查看对话框 -->
    <el-dialog
      v-model="viewDialogVisible"
      :title="`报告详情 - ${currentReport?.reportNumber}`"
      width="80%"
      :close-on-click-modal="false"
      class="report-view-dialog"
    >
      <div v-if="currentReport" class="report-view-container">
        <!-- 报告信息栏 -->
        <div class="report-info-bar">
          <div class="info-item">
            <span class="label">报告编号：</span>
            <span class="value">{{ currentReport.reportNumber }}</span>
          </div>
          <div class="info-item">
            <span class="label">报告类型：</span>
            <el-tag :type="getReportTypeTagType(currentReport.reportType)">
              {{ getReportTypeText(currentReport.reportType) }}
            </el-tag>
          </div>
          <div class="info-item">
            <span class="label">生成时间：</span>
            <span class="value">{{ formatDateTime(currentReport.generatedAt) }}</span>
          </div>
          <div class="info-item">
            <span class="label">状态：</span>
            <el-tag :type="getStatusTagType(currentReport.status)">
              {{ getStatusText(currentReport.status) }}
            </el-tag>
          </div>
        </div>

        <el-divider />

        <!-- 报告内容 -->
        <div class="report-content-display" v-html="currentReport.content"></div>

        <!-- 签名信息 -->
        <div v-if="currentReport.signatures && currentReport.signatures.length > 0" class="signature-section">
          <el-divider />
          <h3>签名信息</h3>
          <el-table :data="currentReport.signatures" border>
            <el-table-column prop="signerName" label="签名人" width="150" />
            <el-table-column prop="signerRole" label="角色" width="150" />
            <el-table-column prop="signedAt" label="签名时间" width="180">
              <template #default="{ row }">
                {{ formatDateTime(row.signedAt) }}
              </template>
            </el-table-column>
            <el-table-column prop="comments" label="签名意见" show-overflow-tooltip />
          </el-table>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="viewDialogVisible = false">关闭</el-button>
          <el-button
            v-if="currentReport?.status === 'SIGNED' || currentReport?.status === 'DISTRIBUTED'"
            type="primary"
            :icon="Printer"
            @click="handlePrint"
          >
            打印
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Check, Close, Printer } from '@element-plus/icons-vue'
import http from '@/services/http'

const router = useRouter()

// 筛选条件
const filters = reactive({
  reportType: '',
  status: '',
  reportNumber: '',
  sampleBarcode: ''
})

// 统计信息
const statistics = reactive({
  total: 0,
  pendingSignature: 0,
  signed: 0,
  distributed: 0
})

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 数据
const loading = ref(false)
const reports = ref<any[]>([])
const viewDialogVisible = ref(false)
const currentReport = ref<any>(null)

// 获取报告类型标签类型
const getReportTypeTagType = (type: string) => {
  const typeMap: Record<string, string> = {
    ANALYSIS_REPORT: 'success',
    SAMPLE_REPORT: 'primary',
    TECHNICAL_REPORT: 'warning',
    QUALITY_REPORT: 'danger',
    COMPREHENSIVE_REPORT: 'info'
  }
  return typeMap[type] || 'info'
}

// 获取报告类型文本
const getReportTypeText = (type: string) => {
  const textMap: Record<string, string> = {
    ANALYSIS_REPORT: '分析报告',
    SAMPLE_REPORT: '样品报告',
    TECHNICAL_REPORT: '技术报告',
    QUALITY_REPORT: '质量报告',
    COMPREHENSIVE_REPORT: '综合报告'
  }
  return textMap[type] || type
}

// 获取状态标签类型
const getStatusTagType = (status: string) => {
  const typeMap: Record<string, string> = {
    DRAFT: 'info',
    PENDING_SIGNATURE: 'warning',
    SIGNED: 'success',
    DISTRIBUTED: 'primary',
    RECALLED: 'danger'
  }
  return typeMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    DRAFT: '草稿',
    PENDING_SIGNATURE: '待签名',
    SIGNED: '已签名',
    DISTRIBUTED: '已分发',
    RECALLED: '已撤回'
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

// 加载报告列表
const loadReports = async (resetPage: boolean = false) => {
  loading.value = true
  
  // 只在搜索/重置时重置页码
  if (resetPage) {
    pagination.currentPage = 1
  }
  
  try {
    const params: any = {
      page: pagination.currentPage,
      pageSize: pagination.pageSize
    }
    
    if (filters.reportType) params.reportType = filters.reportType
    if (filters.status) params.status = filters.status
    if (filters.reportNumber) params.search = filters.reportNumber
    if (filters.sampleBarcode) params.sampleBarcode = filters.sampleBarcode
    
    const response = await http.get('/reports', { params })
    
    if (response.data?.data) {
      reports.value = response.data.data.items || []
      pagination.total = response.data.data.total || 0
      
      // 更新统计信息
      updateStatistics()
    }
  } catch (error: any) {
    console.error('加载报告列表失败:', error)
    ElMessage.error(error?.response?.data?.message || '加载报告列表失败')
    reports.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// 更新统计信息
const updateStatistics = () => {
  statistics.total = reports.value.length
  statistics.pendingSignature = reports.value.filter(r => r.status === 'PENDING_SIGNATURE').length
  statistics.signed = reports.value.filter(r => r.status === 'SIGNED').length
  statistics.distributed = reports.value.filter(r => r.status === 'DISTRIBUTED').length
}

// 查询
const handleSearch = () => {
  loadReports(true)
}

// 重置
const handleReset = () => {
  filters.reportType = ''
  filters.status = ''
  filters.reportNumber = ''
  filters.sampleBarcode = ''
  loadReports(true)
}

// 创建报告
const handleCreate = () => {
  router.push({ name: 'report-generator' })
}

// 查看报告
const handleView = async (report: any) => {
  try {
    const response = await http.get(`/reports/${report.id}`)
    currentReport.value = response.data?.data
    viewDialogVisible.value = true
  } catch (error: any) {
    console.error('获取报告详情失败:', error)
    ElMessage.error(error?.response?.data?.message || '获取报告详情失败')
  }
}

// 编辑报告
const handleEdit = (report: any) => {
  router.push({
    name: 'report-generator',
    query: { reportId: report.id }
  })
}

// 删除报告
const handleDelete = async (report: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除报告 "${report.reportNumber}" 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await http.delete(`/reports/${report.id}`)
    ElMessage.success('报告已删除')
    await loadReports()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除报告失败:', error)
      ElMessage.error(error?.response?.data?.message || '删除报告失败')
    }
  }
}

// 打印报告
const handlePrint = () => {
  if (!currentReport.value) return

  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>检测报告 - ${currentReport.value.reportNumber}</title>
          <style>
            body {
              font-family: 'Microsoft YaHei', Arial, sans-serif;
              padding: 40px;
              line-height: 1.8;
            }
            h1 {
              text-align: center;
              color: #303133;
              margin-bottom: 30px;
            }
            h2 {
              color: #606266;
              margin-top: 30px;
              margin-bottom: 15px;
              border-bottom: 2px solid #409eff;
              padding-bottom: 8px;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid #dcdfe6;
              padding: 12px;
              text-align: left;
            }
            th {
              background-color: #f5f7fa;
              font-weight: 600;
            }
            p {
              margin: 10px 0;
            }
            .conclusion-text {
              font-size: 16px;
              font-weight: 600;
              color: #303133;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          ${currentReport.value.content}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }
}

// 分页处理
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  loadReports()
}

const handleCurrentChange = (page: number) => {
  pagination.currentPage = page
  loadReports()
}

// 初始化
onMounted(() => {
  loadReports()
})
</script>

<style scoped lang="scss">
.report-list {
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

.report-view-dialog {
  :deep(.el-dialog__body) {
    max-height: 70vh;
    overflow-y: auto;
  }
}

.report-view-container {
  .report-info-bar {
    display: flex;
    gap: 24px;
    padding: 12px;
    background-color: #f5f7fa;
    border-radius: 4px;
    margin-bottom: 16px;
    flex-wrap: wrap;

    .info-item {
      display: flex;
      align-items: center;
      gap: 8px;

      .label {
        color: #909399;
        font-size: 14px;
      }

      .value {
        color: #303133;
        font-weight: 600;
        font-size: 14px;
      }
    }
  }

  .report-content-display {
    padding: 20px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    background-color: #fff;
    min-height: 400px;

    :deep(h1) {
      font-size: 24px;
      margin-bottom: 20px;
      text-align: center;
      color: #303133;
    }

    :deep(h2) {
      font-size: 18px;
      margin-top: 24px;
      margin-bottom: 12px;
      color: #606266;
      border-bottom: 2px solid #409eff;
      padding-bottom: 8px;
    }

    :deep(p) {
      margin: 8px 0;
      line-height: 1.8;
      color: #606266;
    }

    :deep(table) {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;

      th,
      td {
        border: 1px solid #dcdfe6;
        padding: 12px;
        text-align: left;
      }

      th {
        background-color: #f5f7fa;
        font-weight: 600;
        color: #303133;
      }

      td {
        color: #606266;
      }
    }

    :deep(.conclusion-text) {
      font-size: 16px;
      font-weight: 600;
      color: #303133;
      padding: 12px;
      background-color: #f0f9ff;
      border-left: 4px solid #409eff;
      margin: 16px 0;
    }
  }

  .signature-section {
    margin-top: 20px;

    h3 {
      font-size: 16px;
      color: #303133;
      margin-bottom: 12px;
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: center;
  gap: 12px;
}
</style>
