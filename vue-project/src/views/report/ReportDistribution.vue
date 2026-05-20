<template>
  <div class="report-distribution">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>报告分发管理</span>
        </div>
      </template>

      <!-- 搜索和筛选区域 -->
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item label="报告编号">
          <el-input
            v-model="filters.reportNumber"
            placeholder="请输入报告编号"
            clearable
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item label="样品名称">
          <el-input
            v-model="filters.sampleName"
            placeholder="请输入样品名称"
            clearable
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item label="分发状态">
          <el-select
            v-model="filters.status"
            placeholder="请选择状态"
            clearable
            @clear="handleSearch"
          >
            <el-option label="未分发" value="draft" />
            <el-option label="已分发" value="distributed" />
            <el-option label="已回收" value="recalled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 报告列表 -->
      <el-table
        :data="reportList"
        style="width: 100%"
        v-loading="loading"
      >
        <el-table-column prop="reportNumber" label="报告编号" width="150" />
        <el-table-column prop="sampleName" label="样品名称" width="150" />
        <el-table-column prop="templateName" label="报告模板" width="150" />
        <el-table-column label="分发状态" width="120">
          <template #default="{ row }">
            <el-tag
              :type="getStatusType(row.status)"
              size="small"
            >
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="generatedAt" label="生成时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.generatedAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="distributedAt" label="分发时间" width="180">
          <template #default="{ row }">
            {{ row.distributedAt ? formatDate(row.distributedAt) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'signed'"
              type="primary"
              size="small"
              @click="handleDistribute(row)"
            >
              分发
            </el-button>
            <el-button
              size="small"
              @click="handleViewHistory(row)"
            >
              分发历史
            </el-button>
            <el-button
              v-if="row.status === 'distributed'"
              type="danger"
              size="small"
              @click="handleRecall(row)"
            >
              回收
            </el-button>
            <el-button
              size="small"
              @click="handlePreview(row)"
            >
              预览
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
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

    <!-- 分发对话框 -->
    <el-dialog
      v-model="distributeDialogVisible"
      title="报告分发"
      width="600px"
      @close="handleDistributeDialogClose"
    >
      <el-form
        ref="distributeFormRef"
        :model="distributeForm"
        :rules="distributeRules"
        label-width="100px"
      >
        <el-form-item label="报告编号">
          <el-input v-model="currentReport.reportNumber" disabled />
        </el-form-item>
        <el-form-item label="样品名称">
          <el-input v-model="currentReport.sampleName" disabled />
        </el-form-item>
        <el-form-item label="分发方式" prop="method">
          <el-radio-group v-model="distributeForm.method">
            <el-radio label="email">邮件</el-radio>
            <el-radio label="download">下载</el-radio>
            <el-radio label="print">打印</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          v-if="distributeForm.method === 'email'"
          label="接收方"
          prop="recipients"
        >
          <el-select
            v-model="distributeForm.recipients"
            multiple
            filterable
            allow-create
            placeholder="请输入或选择接收方邮箱"
            style="width: 100%"
          >
            <el-option
              v-for="contact in contactList"
              :key="contact.email"
              :label="`${contact.name} (${contact.email})`"
              :value="contact.email"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="distributeForm.notes"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="distributeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmDistribute" :loading="distributing">
          确认分发
        </el-button>
      </template>
    </el-dialog>

    <!-- 分发历史对话框 -->
    <el-dialog
      v-model="historyDialogVisible"
      title="分发历史"
      width="800px"
    >
      <el-timeline>
        <el-timeline-item
          v-for="record in distributionHistory"
          :key="record.id"
          :timestamp="formatDate(record.distributedAt)"
          placement="top"
        >
          <el-card>
            <div class="history-item">
              <div class="history-info">
                <p><strong>分发方式：</strong>{{ getMethodText(record.method) }}</p>
                <p v-if="record.method === 'email'">
                  <strong>接收方：</strong>{{ record.recipient }}
                </p>
                <p><strong>操作人：</strong>{{ record.distributedBy }}</p>
                <p v-if="record.notes"><strong>备注：</strong>{{ record.notes }}</p>
              </div>
              <div v-if="record.status === 'recalled'" class="recall-badge">
                <el-tag type="danger" size="small">已回收</el-tag>
                <p class="recall-reason">回收原因：{{ record.recallReason }}</p>
              </div>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>
      <el-empty v-if="distributionHistory.length === 0" description="暂无分发记录" />
    </el-dialog>

    <!-- 报告回收对话框 -->
    <ReportRecall
      v-model="recallDialogVisible"
      :report="currentReport"
      @confirm="handleConfirmRecall"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import ReportRecall from '@/components/ReportRecall.vue'

// 类型定义
interface Report {
  id: string
  reportNumber: string
  sampleId: string
  sampleName: string
  templateId: string
  templateName: string
  status: 'draft' | 'signed' | 'distributed' | 'recalled'
  generatedAt: string
  distributedAt?: string
  generatedBy: string
}

interface DistributionRecord {
  id: string
  reportId: string
  recipient: string
  method: 'email' | 'download' | 'print'
  distributedAt: string
  distributedBy: string
  notes?: string
  status?: 'active' | 'recalled'
  recallReason?: string
}

interface Contact {
  name: string
  email: string
}

// 响应式数据
const loading = ref(false)
const distributing = ref(false)
const reportList = ref<Report[]>([])
const distributionHistory = ref<DistributionRecord[]>([])
const contactList = ref<Contact[]>([])

const filters = reactive({
  reportNumber: '',
  sampleName: '',
  status: ''
})

const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

const distributeDialogVisible = ref(false)
const historyDialogVisible = ref(false)
const recallDialogVisible = ref(false)

const currentReport = ref<Report>({
  id: '',
  reportNumber: '',
  sampleId: '',
  sampleName: '',
  templateId: '',
  templateName: '',
  status: 'draft',
  generatedAt: '',
  generatedBy: ''
})

const distributeForm = reactive({
  method: 'email' as 'email' | 'download' | 'print',
  recipients: [] as string[],
  notes: ''
})

const distributeFormRef = ref<FormInstance>()

const distributeRules: FormRules = {
  method: [
    { required: true, message: '请选择分发方式', trigger: 'change' }
  ],
  recipients: [
    {
      required: true,
      message: '请选择接收方',
      trigger: 'change',
      validator: (rule, value, callback) => {
        if (distributeForm.method === 'email' && (!value || value.length === 0)) {
          callback(new Error('请选择接收方'))
        } else {
          callback()
        }
      }
    }
  ]
}

// 方法
const fetchReportList = async () => {
  loading.value = true
  try {
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 模拟数据
    reportList.value = [
      {
        id: '1',
        reportNumber: 'RPT-2024-001',
        sampleId: 'S001',
        sampleName: '水质样品A',
        templateId: 'T001',
        templateName: '水质检测报告模板',
        status: 'signed',
        generatedAt: '2024-01-20 10:30:00',
        generatedBy: '张三'
      },
      {
        id: '2',
        reportNumber: 'RPT-2024-002',
        sampleId: 'S002',
        sampleName: '土壤样品B',
        templateId: 'T002',
        templateName: '土壤检测报告模板',
        status: 'distributed',
        generatedAt: '2024-01-19 14:20:00',
        distributedAt: '2024-01-19 16:00:00',
        generatedBy: '李四'
      },
      {
        id: '3',
        reportNumber: 'RPT-2024-003',
        sampleId: 'S003',
        sampleName: '空气样品C',
        templateId: 'T003',
        templateName: '空气质量报告模板',
        status: 'recalled',
        generatedAt: '2024-01-18 09:15:00',
        distributedAt: '2024-01-18 11:00:00',
        generatedBy: '王五'
      }
    ]
    
    pagination.total = reportList.value.length
  } catch (error) {
    ElMessage.error('获取报告列表失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

const fetchContactList = async () => {
  try {
    // 模拟 API 调用
    contactList.value = [
      { name: '客户A', email: 'clienta@example.com' },
      { name: '客户B', email: 'clientb@example.com' },
      { name: '客户C', email: 'clientc@example.com' }
    ]
  } catch (error) {
    console.error('获取联系人列表失败', error)
  }
}

const handleSearch = () => {
  pagination.currentPage = 1
  fetchReportList()
}

const handleReset = () => {
  filters.reportNumber = ''
  filters.sampleName = ''
  filters.status = ''
  handleSearch()
}

const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  fetchReportList()
}

const handleCurrentChange = (page: number) => {
  pagination.currentPage = page
  fetchReportList()
}

const handleDistribute = (report: Report) => {
  currentReport.value = { ...report }
  distributeForm.method = 'email'
  distributeForm.recipients = []
  distributeForm.notes = ''
  distributeDialogVisible.value = true
}

const handleDistributeDialogClose = () => {
  distributeFormRef.value?.resetFields()
}

const handleConfirmDistribute = async () => {
  if (!distributeFormRef.value) return
  
  await distributeFormRef.value.validate(async (valid) => {
    if (valid) {
      distributing.value = true
      try {
        // 模拟 API 调用
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        ElMessage.success('报告分发成功')
        distributeDialogVisible.value = false
        fetchReportList()
      } catch (error) {
        ElMessage.error('报告分发失败')
        console.error(error)
      } finally {
        distributing.value = false
      }
    }
  })
}

const handleViewHistory = async (report: Report) => {
  currentReport.value = { ...report }
  
  try {
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // 模拟分发历史数据
    distributionHistory.value = [
      {
        id: '1',
        reportId: report.id,
        recipient: 'clienta@example.com',
        method: 'email',
        distributedAt: '2024-01-19 16:00:00',
        distributedBy: '张三',
        notes: '首次分发',
        status: 'active'
      },
      {
        id: '2',
        reportId: report.id,
        recipient: 'clientb@example.com',
        method: 'email',
        distributedAt: '2024-01-19 16:05:00',
        distributedBy: '张三',
        status: report.status === 'recalled' ? 'recalled' : 'active',
        recallReason: report.status === 'recalled' ? '报告内容有误，需要修正' : undefined
      }
    ]
    
    historyDialogVisible.value = true
  } catch (error) {
    ElMessage.error('获取分发历史失败')
    console.error(error)
  }
}

const handleRecall = (report: Report) => {
  currentReport.value = { ...report }
  recallDialogVisible.value = true
}

const handleConfirmRecall = async (data: { reason: string; notifyRecipients: boolean }) => {
  try {
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    ElMessage.success('报告回收成功')
    recallDialogVisible.value = false
    fetchReportList()
  } catch (error) {
    ElMessage.error('报告回收失败')
    console.error(error)
  }
}

const handlePreview = (report: Report) => {
  ElMessage.info('预览功能开发中')
}

const getStatusType = (status: string) => {
  const typeMap: Record<string, any> = {
    draft: 'info',
    signed: 'warning',
    distributed: 'success',
    recalled: 'danger'
  }
  return typeMap[status] || 'info'
}

const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    draft: '草稿',
    signed: '已签名',
    distributed: '已分发',
    recalled: '已回收'
  }
  return textMap[status] || status
}

const getMethodText = (method: string) => {
  const methodMap: Record<string, string> = {
    email: '邮件',
    download: '下载',
    print: '打印'
  }
  return methodMap[method] || method
}

const formatDate = (date: string) => {
  if (!date) return '-'
  return date
}

// 生命周期
onMounted(() => {
  fetchReportList()
  fetchContactList()
})
</script>

<style scoped>
.report-distribution {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-form {
  margin-bottom: 20px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.history-info p {
  margin: 5px 0;
}

.recall-badge {
  text-align: right;
}

.recall-reason {
  margin-top: 5px;
  font-size: 12px;
  color: #909399;
}
</style>
