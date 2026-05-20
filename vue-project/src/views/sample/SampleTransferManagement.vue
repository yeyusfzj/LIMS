<template>
  <div class="sample-transfer-management">
    <!-- 操作栏 -->
    <el-card class="operation-bar" shadow="never">
      <div class="operation-buttons">
        <el-button type="primary" :icon="Plus" @click="handleCreateTransfer">
          新建流转
        </el-button>
        <el-button :icon="Refresh" @click="handleRefresh">
          刷新
        </el-button>
      </div>
    </el-card>

    <!-- 搜索栏 -->
    <el-card class="search-bar" shadow="never">
      <el-form :model="searchForm" inline>
        <el-form-item label="样品编号">
          <el-input
            v-model="searchForm.sampleNumber"
            placeholder="请输入样品编号"
            clearable
          />
        </el-form-item>
        <el-form-item label="流转状态">
          <el-select v-model="searchForm.status" placeholder="请选择" clearable>
            <el-option label="待确认" value="PENDING" />
            <el-option label="运输中" value="IN_TRANSIT" />
            <el-option label="已接收" value="RECEIVED" />
            <el-option label="已取消" value="CANCELLED" />
          </el-select>
        </el-form-item>
        <el-form-item label="流转日期">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
          />
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

    <!-- 流转记录表格 -->
    <el-card class="table-card" shadow="never">
      <el-table
        :data="tableData"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
      >
        <el-table-column prop="sample.sampleNumber" label="样品编号" width="150" />
        <el-table-column prop="sample.sampleName" label="样品名称" width="150" />
        <el-table-column prop="fromLocation" label="发出地点" width="120" />
        <el-table-column prop="toLocation" label="接收地点" width="120" />
        <el-table-column prop="fromPerson" label="发出人" width="100" />
        <el-table-column prop="toPerson" label="接收人" width="100" />
        <el-table-column prop="transferDate" label="流转日期" width="180">
          <template #default="{ row }">
            {{ formatDate(row.transferDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="确认状态" width="150">
          <template #default="{ row }">
            <div class="confirm-status">
              <el-tag size="small" :type="row.senderConfirmed ? 'success' : 'info'">
                发送方{{ row.senderConfirmed ? '已确认' : '未确认' }}
              </el-tag>
              <el-tag size="small" :type="row.receiverConfirmed ? 'success' : 'info'">
                接收方{{ row.receiverConfirmed ? '已确认' : '未确认' }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="remarks" label="备注" min-width="150" show-overflow-tooltip />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              link
              @click="handleViewDetail(row)"
            >
              查看
            </el-button>
            <el-button
              v-if="canConfirm(row)"
              type="success"
              size="small"
              link
              @click="handleConfirm(row)"
            >
              确认
            </el-button>
            <el-button
              v-if="row.status === 'PENDING'"
              type="danger"
              size="small"
              link
              @click="handleCancel(row)"
            >
              取消
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 新建流转对话框 -->
    <el-dialog
      v-model="createDialogVisible"
      title="新建流转"
      width="600px"
      @close="handleDialogClose"
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="100px"
      >
        <el-form-item label="样品" prop="sampleId">
          <el-select
            v-model="createForm.sampleId"
            placeholder="请选择样品"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="sample in availableSamples"
              :key="sample.id"
              :label="`${sample.sampleNumber} - ${sample.sampleName}`"
              :value="sample.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="发出地点" prop="fromLocation">
          <el-input v-model="createForm.fromLocation" placeholder="请输入发出地点" />
        </el-form-item>
        <el-form-item label="接收地点" prop="toLocation">
          <el-input v-model="createForm.toLocation" placeholder="请输入接收地点" />
        </el-form-item>
        <el-form-item label="发出人" prop="fromPerson">
          <el-input v-model="createForm.fromPerson" placeholder="请输入发出人" />
        </el-form-item>
        <el-form-item label="接收人" prop="toPerson">
          <el-input v-model="createForm.toPerson" placeholder="请输入接收人" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="createForm.remarks"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitCreate">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 流转详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="流转详情"
      width="700px"
    >
      <el-descriptions v-if="currentTransfer" :column="2" border>
        <el-descriptions-item label="样品编号">
          {{ currentTransfer.sample?.sampleNumber }}
        </el-descriptions-item>
        <el-descriptions-item label="样品名称">
          {{ currentTransfer.sample?.sampleName }}
        </el-descriptions-item>
        <el-descriptions-item label="发出地点">
          {{ currentTransfer.fromLocation }}
        </el-descriptions-item>
        <el-descriptions-item label="接收地点">
          {{ currentTransfer.toLocation }}
        </el-descriptions-item>
        <el-descriptions-item label="发出人">
          {{ currentTransfer.fromPerson }}
        </el-descriptions-item>
        <el-descriptions-item label="接收人">
          {{ currentTransfer.toPerson }}
        </el-descriptions-item>
        <el-descriptions-item label="流转日期">
          {{ formatDate(currentTransfer.transferDate) }}
        </el-descriptions-item>
        <el-descriptions-item label="接收日期">
          {{ currentTransfer.receivedDate ? formatDate(currentTransfer.receivedDate) : '未接收' }}
        </el-descriptions-item>
        <el-descriptions-item label="流转状态">
          <el-tag :type="getStatusType(currentTransfer.status)">
            {{ getStatusText(currentTransfer.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="发送方确认">
          <el-tag :type="currentTransfer.senderConfirmed ? 'success' : 'info'">
            {{ currentTransfer.senderConfirmed ? '已确认' : '未确认' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="接收方确认">
          <el-tag :type="currentTransfer.receiverConfirmed ? 'success' : 'info'">
            {{ currentTransfer.receiverConfirmed ? '已确认' : '未确认' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">
          {{ currentTransfer.remarks || '无' }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>

    <!-- 确认流转对话框 -->
    <el-dialog
      v-model="confirmDialogVisible"
      title="确认流转"
      width="500px"
    >
      <el-form :model="confirmForm" label-width="100px">
        <el-form-item label="确认类型">
          <el-radio-group v-model="confirmForm.confirmationType">
            <el-radio label="sender">发送方确认</el-radio>
            <el-radio label="receiver">接收方确认</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="确认备注">
          <el-input
            v-model="confirmForm.remarks"
            type="textarea"
            :rows="3"
            placeholder="请输入确认备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="confirmDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmitConfirm">
          确认
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Refresh, Search, RefreshLeft } from '@element-plus/icons-vue'
import http from '@/services/http'

// 搜索表单
const searchForm = reactive({
  sampleNumber: '',
  status: '',
  dateRange: null as any
})

// 表格数据
const tableData = ref<any[]>([])
const loading = ref(false)

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 新建流转对话框
const createDialogVisible = ref(false)
const createFormRef = ref<FormInstance>()
const createForm = reactive({
  sampleId: '',
  fromLocation: '',
  toLocation: '',
  fromPerson: '',
  toPerson: '',
  remarks: ''
})

const createRules: FormRules = {
  sampleId: [{ required: true, message: '请选择样品', trigger: 'change' }],
  fromLocation: [{ required: true, message: '请输入发出地点', trigger: 'blur' }],
  toLocation: [{ required: true, message: '请输入接收地点', trigger: 'blur' }],
  fromPerson: [{ required: true, message: '请输入发出人', trigger: 'blur' }],
  toPerson: [{ required: true, message: '请输入接收人', trigger: 'blur' }]
}

// 可用样品列表
const availableSamples = ref<any[]>([])

// 详情对话框
const detailDialogVisible = ref(false)
const currentTransfer = ref<any>(null)

// 确认对话框
const confirmDialogVisible = ref(false)
const confirmForm = reactive({
  transferId: '',
  confirmationType: 'sender',
  remarks: ''
})

// 加载流转记录
const loadTransfers = async () => {
  loading.value = true
  try {
    // 构建查询参数，确保类型正确且移除空值
    const params: any = {}
    
    // 分页参数作为数字类型发送
    params.page = Number(pagination.page)
    params.pageSize = Number(pagination.pageSize)

    // 只添加非空的搜索参数
    if (searchForm.sampleNumber && searchForm.sampleNumber.trim()) {
      params.sampleNumber = searchForm.sampleNumber.trim()
    }
    if (searchForm.status) {
      params.status = searchForm.status
    }
    
    // 将dateRange数组转换为startDate和endDate，使用ISO日期格式
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      const [startDate, endDate] = searchForm.dateRange
      if (startDate) {
        params.startDate = new Date(startDate).toISOString().split('T')[0]
      }
      if (endDate) {
        params.endDate = new Date(endDate).toISOString().split('T')[0]
      }
    }

    const response = await http.get('/samples/transfers', { params })
    console.log('流转记录响应:', response)
    
    // FastAPI 返回格式: { success: true, data: { items: [...], pagination: {...} } }
    // http.ts 的响应拦截器已经提取了一层，所以这里直接使用 response.data
    const responseData = response.data || response
    const items = responseData.items || []
    
    // 转换后端蛇形命名为前端驼峰命名
    tableData.value = items.map((item: any) => ({
      id: item.id,
      sampleId: item.sample_id,
      sample: item.sample ? {
        sampleNumber: item.sample.sample_number,
        sampleName: item.sample.sample_name
      } : null,
      fromLocation: item.from_location,
      toLocation: item.to_location,
      fromPerson: item.from_person,
      toPerson: item.to_person,
      transferDate: item.transfer_date,
      receivedDate: item.received_date,
      status: item.status,
      remarks: item.remarks,
      senderConfirmed: item.sender_confirmed,
      receiverConfirmed: item.receiver_confirmed,
      createdAt: item.created_at
    }))
    
    pagination.total = responseData.pagination?.total || 0
    
    console.log('加载的流转记录数量:', tableData.value.length)
    console.log('转换后的第一条记录:', tableData.value[0])
  } catch (error: any) {
    // 404错误表示端点不存在，使用空数据
    if (error?.response?.status === 404) {
      console.warn('流转记录端点不存在，使用空数据')
      tableData.value = []
      pagination.total = 0
      return
    }
    
    // 更详细的400错误处理和用户友好提示
    if (error?.response?.status === 400) {
      const errorMessage = error?.response?.data?.message || '请求参数格式错误'
      ElMessage.error(`查询失败：${errorMessage}。请检查搜索条件格式是否正确。`)
    } else if (error?.response?.status === 403) {
      ElMessage.error('没有权限访问流转记录，请联系管理员')
    } else if (error?.response?.status >= 500) {
      ElMessage.error('服务器错误，请稍后重试')
    } else {
      ElMessage.error('加载流转记录失败，请检查网络连接')
    }
    console.error('加载流转记录失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载可用样品
const loadAvailableSamples = async () => {
  try {
    const response = await http.get('/samples', {
      params: { 
        pageSize: 1000  // 确保作为数字类型发送
      }
    })
    availableSamples.value = response.data || []
  } catch (error: any) {
    // 添加更详细的错误处理
    if (error?.response?.status === 400) {
      const errorMessage = error?.response?.data?.message || '请求参数格式错误'
      ElMessage.error(`加载样品列表失败：${errorMessage}`)
    } else if (error?.response?.status === 403) {
      ElMessage.error('没有权限访问样品列表，请联系管理员')
    } else {
      ElMessage.error('加载样品列表失败，请检查网络连接')
    }
    console.error('加载样品列表失败:', error)
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  loadTransfers()
}

// 重置
const handleReset = () => {
  searchForm.sampleNumber = ''
  searchForm.status = ''
  searchForm.dateRange = null
  pagination.page = 1
  loadTransfers()
}

// 刷新
const handleRefresh = () => {
  loadTransfers()
}

// 分页变化
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  loadTransfers()
}

const handlePageChange = (page: number) => {
  pagination.page = page
  loadTransfers()
}

// 新建流转
const handleCreateTransfer = () => {
  createDialogVisible.value = true
  loadAvailableSamples()
}

// 提交新建
const handleSubmitCreate = async () => {
  if (!createFormRef.value) return

  await createFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // 确保所有参数都是有效值，移除空值
        const requestData: any = {}
        if (createForm.fromLocation?.trim()) {
          requestData.fromLocation = createForm.fromLocation.trim()
        }
        if (createForm.toLocation?.trim()) {
          requestData.toLocation = createForm.toLocation.trim()
        }
        if (createForm.fromPerson?.trim()) {
          requestData.fromPerson = createForm.fromPerson.trim()
        }
        if (createForm.toPerson?.trim()) {
          requestData.toPerson = createForm.toPerson.trim()
        }
        if (createForm.remarks?.trim()) {
          requestData.remarks = createForm.remarks.trim()
        }

        // 正确的API路径：POST /api/samples/:id/transfer
        await http.post(`/samples/${createForm.sampleId}/transfer`, requestData)
        ElMessage.success('流转创建成功')
        createDialogVisible.value = false
        loadTransfers()
      } catch (error: any) {
        // 更详细的错误处理
        if (error?.response?.status === 400) {
          const errorMessage = error?.response?.data?.message || '请求参数格式错误'
          ElMessage.error(`流转创建失败：${errorMessage}。请检查输入信息格式是否正确。`)
        } else if (error?.response?.status === 403) {
          ElMessage.error('没有权限创建流转，请联系管理员')
        } else if (error?.response?.status === 404) {
          ElMessage.error('样品不存在，请重新选择样品')
        } else {
          ElMessage.error('流转创建失败，请检查网络连接')
        }
        console.error('流转创建失败:', error)
      }
    }
  })
}

// 对话框关闭
const handleDialogClose = () => {
  createFormRef.value?.resetFields()
  Object.assign(createForm, {
    sampleId: '',
    fromLocation: '',
    toLocation: '',
    fromPerson: '',
    toPerson: '',
    remarks: ''
  })
}

// 查看详情
const handleViewDetail = (row: any) => {
  currentTransfer.value = row
  detailDialogVisible.value = true
}

// 判断是否可以确认
const canConfirm = (row: any) => {
  return row.status === 'PENDING' || row.status === 'IN_TRANSIT'
}

// 确认流转
const handleConfirm = (row: any) => {
  confirmForm.transferId = row.id
  confirmForm.confirmationType = 'sender'
  confirmForm.remarks = ''
  confirmDialogVisible.value = true
}

// 提交确认
const handleSubmitConfirm = async () => {
  try {
    // 确保参数格式正确，移除空值
    const requestData: any = {
      confirmationType: confirmForm.confirmationType
    }
    
    if (confirmForm.remarks?.trim()) {
      requestData.remarks = confirmForm.remarks.trim()
    }

    // 正确的API路径：POST /api/samples/transfers/:transferId/confirm
    await http.post(`/samples/transfers/${confirmForm.transferId}/confirm`, requestData)
    ElMessage.success('确认成功')
    confirmDialogVisible.value = false
    loadTransfers()
  } catch (error: any) {
    // 更详细的错误处理
    if (error?.response?.status === 400) {
      const errorMessage = error?.response?.data?.message || '请求参数格式错误'
      ElMessage.error(`确认失败：${errorMessage}。请检查确认信息是否正确。`)
    } else if (error?.response?.status === 403) {
      ElMessage.error('没有权限确认此流转，请联系管理员')
    } else if (error?.response?.status === 404) {
      ElMessage.error('流转记录不存在，请刷新页面重试')
    } else if (error?.response?.status === 409) {
      ElMessage.error('流转状态已变更，请刷新页面查看最新状态')
    } else {
      ElMessage.error('确认失败，请检查网络连接')
    }
    console.error('确认失败:', error)
  }
}

// 取消流转
const handleCancel = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要取消此流转吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    // 正确的API路径：PUT /api/samples/transfers/:transferId/cancel
    await http.put(`/samples/transfers/${row.id}/cancel`)
    ElMessage.success('取消成功')
    loadTransfers()
  } catch (error: any) {
    if (error !== 'cancel') {
      // 更详细的错误处理
      if (error?.response?.status === 400) {
        const errorMessage = error?.response?.data?.message || '请求参数格式错误'
        ElMessage.error(`取消失败：${errorMessage}`)
      } else if (error?.response?.status === 403) {
        ElMessage.error('没有权限取消此流转，请联系管理员')
      } else if (error?.response?.status === 404) {
        ElMessage.error('流转记录不存在，请刷新页面重试')
      } else if (error?.response?.status === 409) {
        ElMessage.error('流转状态已变更，无法取消。请刷新页面查看最新状态')
      } else {
        ElMessage.error('取消失败，请检查网络连接')
      }
      console.error('取消失败:', error)
    }
  }
}

// 格式化日期
const formatDate = (date: string) => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN')
}

// 获取状态类型
const getStatusType = (status: string) => {
  const typeMap: Record<string, any> = {
    PENDING: 'warning',
    IN_TRANSIT: 'primary',
    RECEIVED: 'success',
    CANCELLED: 'info'
  }
  return typeMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    PENDING: '待确认',
    IN_TRANSIT: '运输中',
    RECEIVED: '已接收',
    CANCELLED: '已取消'
  }
  return textMap[status] || status
}

onMounted(() => {
  loadTransfers()
})
</script>

<style scoped lang="scss">
.sample-transfer-management {
  padding: 20px;

  .operation-bar {
    margin-bottom: 20px;

    .operation-buttons {
      display: flex;
      gap: 10px;
    }
  }

  .search-bar {
    margin-bottom: 20px;
  }

  .table-card {
    .confirm-status {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .pagination {
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
    }
  }
}
</style>
