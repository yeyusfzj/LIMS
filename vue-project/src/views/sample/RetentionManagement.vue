<template>
  <div class="retention-management">
    <!-- 顶部操作栏 -->
    <el-card class="operation-bar" shadow="never">
      <div class="operation-buttons">
        <el-button type="primary" :icon="Refresh" @click="handleRefresh">
          刷新
        </el-button>
        <el-button :icon="Download" @click="handleExport">
          导出
        </el-button>
      </div>
    </el-card>

    <!-- 搜索和筛选区域 -->
    <el-card class="filter-bar" shadow="never">
      <el-form :model="filters" :inline="true" label-width="80px">
        <el-form-item label="条码">
          <el-input
            v-model="filters.barcode"
            placeholder="请输入条码"
            clearable
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item label="样品名称">
          <el-input
            v-model="filters.name"
            placeholder="请输入样品名称"
            clearable
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item label="留样状态">
          <el-select
            v-model="filters.retentionStatus"
            placeholder="请选择留样状态"
            clearable
            @clear="handleSearch"
          >
            <el-option label="活跃" value="active" />
            <el-option label="已延期" value="extended" />
            <el-option label="已销毁" value="disposed" />
          </el-select>
        </el-form-item>
        <el-form-item label="到期状态">
          <el-select
            v-model="filters.expiryStatus"
            placeholder="请选择到期状态"
            clearable
            @clear="handleSearch"
          >
            <el-option label="即将到期" value="expiring_soon" />
            <el-option label="已到期" value="expired" />
            <el-option label="正常" value="normal" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">
            搜索
          </el-button>
          <el-button :icon="RefreshLeft" @click="handleReset">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 留样列表表格 -->
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
        <el-table-column prop="barcode" label="条码" width="150" fixed />
        <el-table-column prop="name" label="样品名称" width="180" />
        <el-table-column prop="sampleType" label="样品类型" width="120" />
        <el-table-column prop="retentionInfo.location" label="留样位置" width="150" />
        <el-table-column prop="retentionInfo.expiryDate" label="到期日期" width="120">
          <template #default="{ row }">
            <span :class="getExpiryClass(row.retentionInfo?.expiryDate)">
              {{ formatDate(row.retentionInfo?.expiryDate) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="剩余天数" width="120">
          <template #default="{ row }">
            <el-tag :type="getRemainingDaysType(row.retentionInfo?.expiryDate)">
              {{ getRemainingDays(row.retentionInfo?.expiryDate) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="retentionInfo.status" label="留样状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getRetentionStatusType(row.retentionInfo?.status)">
              {{ getRetentionStatusLabel(row.retentionInfo?.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="storageConditions.temperature" label="温度(℃)" width="100">
          <template #default="{ row }">
            {{ row.storageConditions?.temperature || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="storageConditions.humidity" label="湿度(%)" width="100">
          <template #default="{ row }">
            {{ row.storageConditions?.humidity || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="createdBy" label="创建人" width="120" />
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              size="small"
              @click="handleView(row)"
            >
              查看
            </el-button>
            <el-button
              link
              type="warning"
              size="small"
              :disabled="row.retentionInfo?.status === 'disposed'"
              @click="handleExtend(row)"
            >
              延期
            </el-button>
            <el-button
              link
              type="info"
              size="small"
              :disabled="row.retentionInfo?.status === 'disposed'"
              @click="handleTransfer(row)"
            >
              转移
            </el-button>
            <el-button
              link
              type="danger"
              size="small"
              :disabled="row.retentionInfo?.status === 'disposed'"
              @click="handleDispose(row)"
            >
              销毁
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页组件 -->
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

    <!-- 延期对话框 -->
    <el-dialog
      v-model="extendDialogVisible"
      title="延期留样"
      width="500px"
      @close="resetExtendForm"
    >
      <el-form :model="extendForm" :rules="extendRules" ref="extendFormRef" label-width="100px">
        <el-form-item label="样品名称">
          <el-input :value="currentSample?.name" disabled />
        </el-form-item>
        <el-form-item label="当前到期日">
          <el-input :value="formatDate(currentSample?.retentionInfo?.expiryDate)" disabled />
        </el-form-item>
        <el-form-item label="新到期日期" prop="newExpiryDate">
          <el-date-picker
            v-model="extendForm.newExpiryDate"
            type="date"
            placeholder="选择新的到期日期"
            style="width: 100%"
            :disabled-date="disabledDate"
          />
        </el-form-item>
        <el-form-item label="延期原因" prop="reason">
          <el-input
            v-model="extendForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入延期原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="extendDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmExtend">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 转移对话框 -->
    <el-dialog
      v-model="transferDialogVisible"
      title="转移留样"
      width="500px"
      @close="resetTransferForm"
    >
      <el-form :model="transferForm" :rules="transferRules" ref="transferFormRef" label-width="100px">
        <el-form-item label="样品名称">
          <el-input :value="currentSample?.name" disabled />
        </el-form-item>
        <el-form-item label="当前位置">
          <el-input :value="currentSample?.retentionInfo?.location" disabled />
        </el-form-item>
        <el-form-item label="目标位置" prop="newLocation">
          <el-input
            v-model="transferForm.newLocation"
            placeholder="请输入目标位置"
          />
        </el-form-item>
        <el-form-item label="接收人" prop="receiver">
          <el-input
            v-model="transferForm.receiver"
            placeholder="请输入接收人"
          />
        </el-form-item>
        <el-form-item label="转移原因" prop="reason">
          <el-input
            v-model="transferForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入转移原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="transferDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmTransfer">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh,
  Download,
  Search,
  RefreshLeft
} from '@element-plus/icons-vue'
import type { Sample } from '@/types'
import type { FormInstance, FormRules } from 'element-plus'

const router = useRouter()

// 筛选条件
const filters = reactive({
  barcode: '',
  name: '',
  retentionStatus: '',
  expiryStatus: ''
})

// 分页配置
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 表格数据
const tableData = ref<Sample[]>([])
const loading = ref(false)
const selectedSamples = ref<Sample[]>([])

// 当前操作的样品
const currentSample = ref<Sample | null>(null)

// 延期对话框
const extendDialogVisible = ref(false)
const extendFormRef = ref<FormInstance>()
const extendForm = reactive({
  newExpiryDate: null as Date | null,
  reason: ''
})

const extendRules: FormRules = {
  newExpiryDate: [
    { required: true, message: '请选择新的到期日期', trigger: 'change' }
  ],
  reason: [
    { required: true, message: '请输入延期原因', trigger: 'blur' },
    { min: 5, message: '延期原因至少5个字符', trigger: 'blur' }
  ]
}

// 转移对话框
const transferDialogVisible = ref(false)
const transferFormRef = ref<FormInstance>()
const transferForm = reactive({
  newLocation: '',
  receiver: '',
  reason: ''
})

const transferRules: FormRules = {
  newLocation: [
    { required: true, message: '请输入目标位置', trigger: 'blur' }
  ],
  receiver: [
    { required: true, message: '请输入接收人', trigger: 'blur' }
  ],
  reason: [
    { required: true, message: '请输入转移原因', trigger: 'blur' }
  ]
}

// 模拟留样数据
const mockRetentionSamples: Sample[] = [
  {
    id: 'chem-x-001',
    barcode: 'SP20260514000001',
    name: '化学样品X',
    source: '化工厂A区',
    client: '某化工企业',
    receivedDate: new Date('2026-05-14'),
    sampleType: '化学品',
    quantity: 1000,
    unit: 'ml',
    status: 'released',
    currentLocation: '留样室-化学品专区-A01',
    retentionInfo: {
      location: '留样室-化学品专区-A01',
      expiryDate: new Date('2026-11-14'),
      status: 'active'
    },
    storageConditions: {
      temperature: 20,
      humidity: 45
    },
    createdBy: 'admin',
    createdAt: new Date('2026-05-14'),
    updatedAt: new Date('2026-05-14')
  },
  {
    id: '1',
    barcode: 'S2024010001',
    name: '水质样品-A',
    source: '某河流',
    client: '环保局',
    receivedDate: new Date('2024-01-15'),
    sampleType: '水质',
    quantity: 500,
    unit: 'ml',
    status: 'released',
    currentLocation: '留样室-01',
    retentionInfo: {
      location: '留样室-01',
      expiryDate: new Date('2024-03-15'),
      status: 'active'
    },
    storageConditions: {
      temperature: 4,
      humidity: 60
    },
    createdBy: '张三',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: '2',
    barcode: 'S2024010004',
    name: '土壤样品-B',
    source: '某农田',
    client: '农业局',
    receivedDate: new Date('2024-01-16'),
    sampleType: '土壤',
    quantity: 1000,
    unit: 'g',
    status: 'released',
    currentLocation: '留样室-02',
    retentionInfo: {
      location: '留样室-02',
      expiryDate: new Date('2024-02-25'),
      status: 'active'
    },
    storageConditions: {
      temperature: 20,
      humidity: 50
    },
    createdBy: '李四',
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16')
  },
  {
    id: '3',
    barcode: 'S2024010007',
    name: '空气样品-C',
    source: '某工厂',
    client: '工业园区',
    receivedDate: new Date('2024-01-10'),
    sampleType: '空气',
    quantity: 10,
    unit: 'L',
    status: 'released',
    currentLocation: '留样室-03',
    retentionInfo: {
      location: '留样室-03',
      expiryDate: new Date('2024-02-20'),
      status: 'active'
    },
    storageConditions: {
      temperature: -20,
      humidity: 40
    },
    createdBy: '王五',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10')
  },
  {
    id: '4',
    barcode: 'S2024010010',
    name: '水质样品-D',
    source: '某湖泊',
    client: '环保局',
    receivedDate: new Date('2024-01-05'),
    sampleType: '水质',
    quantity: 1000,
    unit: 'ml',
    status: 'released',
    currentLocation: '留样室-01',
    retentionInfo: {
      location: '留样室-01',
      expiryDate: new Date('2024-04-05'),
      status: 'extended'
    },
    storageConditions: {
      temperature: 4,
      humidity: 60
    },
    createdBy: '张三',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-20')
  },
  {
    id: '5',
    barcode: 'S2024010012',
    name: '土壤样品-E',
    source: '某矿区',
    client: '矿业公司',
    receivedDate: new Date('2023-12-20'),
    sampleType: '土壤',
    quantity: 2000,
    unit: 'g',
    status: 'released',
    currentLocation: '留样室-04',
    retentionInfo: {
      location: '留样室-04',
      expiryDate: new Date('2024-01-20'),
      status: 'disposed'
    },
    storageConditions: {
      temperature: 20,
      humidity: 50
    },
    createdBy: '李四',
    createdAt: new Date('2023-12-20'),
    updatedAt: new Date('2024-01-21')
  }
]

// 获取留样列表
const fetchRetentionSamples = (resetPage: boolean = false) => {
  loading.value = true
  
  // 只在搜索/重置时重置页码
  if (resetPage) {
    pagination.currentPage = 1
  }
  
  setTimeout(() => {
    let filteredData = [...mockRetentionSamples]
    
    // 应用筛选条件
    if (filters.barcode) {
      filteredData = filteredData.filter(item =>
        item.barcode.toLowerCase().includes(filters.barcode.toLowerCase())
      )
    }
    
    if (filters.name) {
      filteredData = filteredData.filter(item =>
        item.name.toLowerCase().includes(filters.name.toLowerCase())
      )
    }
    
    if (filters.retentionStatus) {
      filteredData = filteredData.filter(item =>
        item.retentionInfo?.status === filters.retentionStatus
      )
    }
    
    if (filters.expiryStatus) {
      filteredData = filteredData.filter(item => {
        const days = getRemainingDaysValue(item.retentionInfo?.expiryDate)
        if (filters.expiryStatus === 'expiring_soon') {
          return days > 0 && days <= 7
        } else if (filters.expiryStatus === 'expired') {
          return days <= 0
        } else if (filters.expiryStatus === 'normal') {
          return days > 7
        }
        return true
      })
    }
    
    // 更新总数
    pagination.total = filteredData.length
    
    // 分页
    const start = (pagination.currentPage - 1) * pagination.pageSize
    const end = start + pagination.pageSize
    tableData.value = filteredData.slice(start, end)
    
    loading.value = false
  }, 500)
}

// 搜索
const handleSearch = () => {
  fetchRetentionSamples(true)
}

// 重置
const handleReset = () => {
  filters.barcode = ''
  filters.name = ''
  filters.retentionStatus = ''
  filters.expiryStatus = ''
  fetchRetentionSamples(true)
}

// 刷新
const handleRefresh = () => {
  fetchRetentionSamples()
  ElMessage.success('刷新成功')
}

// 导出
const handleExport = () => {
  if (selectedSamples.value.length === 0) {
    ElMessage.warning('请先选择要导出的留样记录')
    return
  }
  ElMessage.success(`已选择 ${selectedSamples.value.length} 条留样记录进行导出`)
}

// 查看详情
const handleView = (row: Sample) => {
  router.push(`/sample/detail/${row.id}`)
}

// 延期
const handleExtend = (row: Sample) => {
  currentSample.value = row
  extendDialogVisible.value = true
}

// 确认延期
const confirmExtend = async () => {
  if (!extendFormRef.value) return
  
  await extendFormRef.value.validate((valid) => {
    if (valid) {
      ElMessage.success(`样品"${currentSample.value?.name}"延期成功`)
      extendDialogVisible.value = false
      fetchRetentionSamples()
    }
  })
}

// 重置延期表单
const resetExtendForm = () => {
  extendForm.newExpiryDate = null
  extendForm.reason = ''
  extendFormRef.value?.resetFields()
}

// 禁用日期（只能选择当前日期之后的日期）
const disabledDate = (time: Date) => {
  const currentDate = currentSample.value?.retentionInfo?.expiryDate
  if (!currentDate) return time.getTime() < Date.now()
  return time.getTime() < new Date(currentDate).getTime()
}

// 转移
const handleTransfer = (row: Sample) => {
  currentSample.value = row
  transferDialogVisible.value = true
}

// 确认转移
const confirmTransfer = async () => {
  if (!transferFormRef.value) return
  
  await transferFormRef.value.validate((valid) => {
    if (valid) {
      ElMessage.success(`样品"${currentSample.value?.name}"转移成功`)
      transferDialogVisible.value = false
      fetchRetentionSamples()
    }
  })
}

// 重置转移表单
const resetTransferForm = () => {
  transferForm.newLocation = ''
  transferForm.receiver = ''
  transferForm.reason = ''
  transferFormRef.value?.resetFields()
}

// 销毁
const handleDispose = (row: Sample) => {
  ElMessageBox.confirm(
    `确定要销毁留样"${row.name}"吗？此操作不可恢复。`,
    '销毁确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(() => {
      ElMessage.success('销毁成功')
      fetchRetentionSamples()
    })
    .catch(() => {
      ElMessage.info('已取消销毁')
    })
}

// 选择变化
const handleSelectionChange = (selection: Sample[]) => {
  selectedSamples.value = selection
}

// 分页大小变化
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  fetchRetentionSamples()
}

// 当前页变化
const handleCurrentChange = (page: number) => {
  pagination.currentPage = page
  fetchRetentionSamples()
}

// 获取剩余天数（数值）
const getRemainingDaysValue = (expiryDate?: Date): number => {
  if (!expiryDate) return 0
  const now = new Date()
  const expiry = new Date(expiryDate)
  const diff = expiry.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// 获取剩余天数（显示文本）
const getRemainingDays = (expiryDate?: Date): string => {
  const days = getRemainingDaysValue(expiryDate)
  if (days < 0) {
    return `已过期 ${Math.abs(days)} 天`
  } else if (days === 0) {
    return '今天到期'
  } else {
    return `剩余 ${days} 天`
  }
}

// 获取剩余天数标签类型
const getRemainingDaysType = (expiryDate?: Date): string => {
  const days = getRemainingDaysValue(expiryDate)
  if (days <= 0) {
    return 'danger'
  } else if (days <= 7) {
    return 'warning'
  } else {
    return 'success'
  }
}

// 获取到期日期样式类
const getExpiryClass = (expiryDate?: Date): string => {
  const days = getRemainingDaysValue(expiryDate)
  if (days <= 0) {
    return 'expiry-expired'
  } else if (days <= 7) {
    return 'expiry-warning'
  } else {
    return ''
  }
}

// 获取留样状态标签类型
const getRetentionStatusType = (status?: string): string => {
  const typeMap: Record<string, string> = {
    active: 'success',
    extended: 'warning',
    disposed: 'info'
  }
  return typeMap[status || ''] || ''
}

// 获取留样状态标签文本
const getRetentionStatusLabel = (status?: string): string => {
  const labelMap: Record<string, string> = {
    active: '活跃',
    extended: '已延期',
    disposed: '已销毁'
  }
  return labelMap[status || ''] || status || ''
}

// 格式化日期
const formatDate = (date?: Date | string): string => {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 组件挂载时获取数据
onMounted(() => {
  fetchRetentionSamples()
})

</script>

<style scoped>
.retention-management {
  padding: 20px;
}

.operation-bar {
  margin-bottom: 20px;
}

.operation-buttons {
  display: flex;
  gap: 10px;
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

.expiry-expired {
  color: #f56c6c;
  font-weight: bold;
}

.expiry-warning {
  color: #e6a23c;
  font-weight: bold;
}

:deep(.el-card__body) {
  padding: 20px;
}

:deep(.el-form--inline .el-form-item) {
  margin-right: 20px;
  margin-bottom: 10px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
