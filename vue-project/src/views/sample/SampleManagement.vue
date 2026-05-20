<template>
  <div class="sample-management">
    <!-- 顶部操作栏 -->
    <el-card class="operation-bar" shadow="never">
      <div class="operation-header">
        <div class="operation-buttons">
          <el-button type="primary" :icon="Plus" @click="handleCreate">
            新建样品
          </el-button>
          <el-divider direction="vertical" />
          <el-button :icon="Refresh" @click="handleRefresh">
            刷新
          </el-button>
          <el-button :icon="Setting" @click="handleColumnSettings">
            列设置
          </el-button>
        </div>
        <div class="operation-stats">
          <el-tag type="info">总计: {{ sampleStore.pagination.total }}</el-tag>
          <el-tag v-if="selectedSamples.length > 0" type="primary">
            已选: {{ selectedSamples.length }}
          </el-tag>
        </div>
      </div>
    </el-card>

    <!-- 搜索和筛选区域 -->
    <el-card class="filter-bar" shadow="never">
      <div class="filter-header">
        <span class="filter-title">筛选条件</span>
        <div class="filter-actions">
          <el-button link type="primary" @click="toggleAdvancedFilter">
            {{ showAdvancedFilter ? '收起' : '高级筛选' }}
          </el-button>
          <el-button link type="primary" @click="handleSaveFilter" v-if="hasActiveFilters">
            保存筛选
          </el-button>
          <el-dropdown v-if="savedFilters.length > 0" @command="handleLoadFilter">
            <el-button link type="primary">
              加载筛选 <el-icon><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item 
                  v-for="filter in savedFilters" 
                  :key="filter.id" 
                  :command="filter.id"
                >
                  {{ filter.name }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
      
      <el-form :model="filters" :inline="true" label-width="80px" class="filter-form">
        <!-- 基础筛选 -->
        <el-form-item label="条码">
          <el-input
            v-model="filters.barcode"
            placeholder="请输入条码"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="名称">
          <el-input
            v-model="filters.name"
            placeholder="请输入样品名称"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="filters.status"
            placeholder="请选择状态"
            clearable
            multiple
            collapse-tags
            collapse-tags-tooltip
            style="width: 200px"
          >
            <el-option label="已登记" value="REGISTERED" />
            <el-option label="进行中" value="IN_PROGRESS" />
            <el-option label="已完成" value="COMPLETED" />
            <el-option label="已放行" value="RELEASED" />
            <el-option label="已退回" value="RETURNED" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 280px"
          />
        </el-form-item>
        
        <!-- 高级筛选 -->
        <template v-if="showAdvancedFilter">
          <el-form-item label="样品类型">
            <el-select
              v-model="filters.sampleType"
              placeholder="请选择样品类型"
              clearable
              style="width: 200px"
            >
              <el-option label="水质" value="水质" />
              <el-option label="土壤" value="土壤" />
              <el-option label="空气" value="空气" />
              <el-option label="其他" value="其他" />
            </el-select>
          </el-form-item>
          <el-form-item label="委托方">
            <el-input
              v-model="filters.client"
              placeholder="请输入委托方"
              clearable
              style="width: 200px"
            />
          </el-form-item>
          <el-form-item label="当前位置">
            <el-input
              v-model="filters.location"
              placeholder="请输入位置"
              clearable
              style="width: 200px"
            />
          </el-form-item>
          <el-form-item label="创建人">
            <el-input
              v-model="filters.createdBy"
              placeholder="请输入创建人"
              clearable
              style="width: 200px"
            />
          </el-form-item>
        </template>
        
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">
            搜索
          </el-button>
          <el-button :icon="Refresh" @click="handleReset">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 样品列表表格 -->
    <el-card class="table-card" shadow="never">
      <!-- 批量操作栏 -->
      <div v-if="selectedSamples.length > 0" class="batch-actions">
        <span class="batch-info">已选择 {{ selectedSamples.length }} 项</span>
        <el-button size="small" @click="handleBatchTransfer">批量流转</el-button>
        <el-button size="small" @click="handleBatchExport">批量导出</el-button>
        <el-button size="small" type="danger" @click="handleBatchDelete">批量删除</el-button>
      </div>
      
      <el-table
        ref="tableRef"
        :data="tableData"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
        @selection-change="handleSelectionChange"
        @sort-change="handleSortChange"
        :default-sort="{ prop: 'receivedDate', order: 'descending' }"
      >
        <el-table-column type="selection" width="55" fixed />
        <el-table-column 
          prop="barcode" 
          label="条码" 
          width="150" 
          fixed
          sortable="custom"
        >
          <template #default="{ row }">
            <el-link type="primary" @click="handleView(row)">
              {{ row.barcode }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column 
          prop="sampleName" 
          label="样品名称" 
          width="180"
          show-overflow-tooltip
        />
        <el-table-column prop="sampleCategory" label="来源" width="150" show-overflow-tooltip />
        <el-table-column prop="clientName" label="委托方" width="150" show-overflow-tooltip />
        <el-table-column prop="sampleType" label="样品类型" width="120" />
        <el-table-column prop="quantity" label="数量" width="100" align="right">
          <template #default="{ row }">
            {{ row.quantity }} {{ row.unit }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" :filters="statusFilters" :filter-method="filterStatus">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="storageLocation" label="当前位置" width="150" show-overflow-tooltip />
        <el-table-column 
          prop="receivedDate" 
          label="接收日期" 
          width="120"
          sortable="custom"
        >
          <template #default="{ row }">
            {{ formatDate(row.receivedDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="createdBy" label="创建人" width="120" />
        <el-table-column 
          label="操作" 
          :width="actionColumnWidth" 
          fixed="right"
          class-name="action-column"
        >
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button link type="primary" size="small" @click="handleView(row)">
                查看
              </el-button>
              <el-button link type="primary" size="small" @click="handleEdit(row)">
                编辑
              </el-button>
              <el-dropdown @command="(cmd) => handleMoreAction(cmd, row)">
                <el-button link type="primary" size="small">
                  更多<el-icon><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="transfer">流转</el-dropdown-item>
                    <el-dropdown-item command="split">分样</el-dropdown-item>
                    <el-dropdown-item command="print">打印条码</el-dropdown-item>
                    <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页组件 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="sampleStore.pagination.currentPage"
          v-model:page-size="sampleStore.pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="sampleStore.pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Upload,
  Download,
  Search,
  Refresh,
  Setting,
  ArrowDown
} from '@element-plus/icons-vue'
import type { Sample } from '@/types'
import { useSampleStore } from '@/stores/sample'

const router = useRouter()
const sampleStore = useSampleStore()

// 表格引用
const tableRef = ref()

// 操作列宽度（可调整）
const actionColumnWidth = ref(240)

// 筛选条件
const filters = reactive({
  barcode: '',
  name: '',
  status: [] as string[],
  dateRange: null as [string, string] | null,
  sampleType: '',
  client: '',
  location: '',
  createdBy: ''
})

// 高级筛选显示状态
const showAdvancedFilter = ref(false)

// 保存的筛选条件
const savedFilters = ref<Array<{ id: string; name: string; filters: any }>>([])

// 排序配置
const sortConfig = reactive({
  prop: 'receivedDate',
  order: 'descending'
})

// 表格数据 - 从 store 获取
const tableData = computed(() => sampleStore.samples)
const loading = computed(() => sampleStore.loading)
const selectedSamples = ref<Sample[]>([])

// 状态筛选器
const statusFilters = [
  { text: '已登记', value: 'REGISTERED' },
  { text: '进行中', value: 'IN_PROGRESS' },
  { text: '已完成', value: 'COMPLETED' },
  { text: '已放行', value: 'RELEASED' },
  { text: '已退回', value: 'RETURNED' }
]

// 计算是否有激活的筛选条件
const hasActiveFilters = computed(() => {
  return filters.barcode || filters.name || filters.status.length > 0 || 
         filters.dateRange || filters.sampleType || filters.client || 
         filters.location || filters.createdBy
})

// 获取样品列表 - 使用 store
const fetchSamples = async (resetPage: boolean = false) => {
  try {
    console.log('=== 开始获取样品列表 ===')
    console.log('当前筛选条件:', filters)
    
    // 设置筛选条件
    const filterParams: any = {}
    
    if (filters.barcode) {
      filterParams.barcode = filters.barcode
    }
    
    if (filters.name) {
      filterParams.sampleName = filters.name
    }
    
    if (filters.status.length > 0) {
      filterParams.status = filters.status[0] // 后端可能只支持单个状态
    }
    
    if (filters.dateRange && filters.dateRange.length === 2) {
      filterParams.startDate = filters.dateRange[0]
      filterParams.endDate = filters.dateRange[1]
    }
    
    if (filters.sampleType) {
      filterParams.sampleType = filters.sampleType
    }
    
    if (filters.client) {
      filterParams.clientName = filters.client
    }
    
    console.log('转换后的筛选参数:', filterParams)
    
    // 只在需要重置页码时才调用 setFilters (搜索/重置时)
    if (resetPage) {
      sampleStore.setFilters(filterParams)
    } else {
      // 直接更新筛选条件,不重置页码
      sampleStore.filters = filterParams
    }
    
    await sampleStore.fetchSamples(true) // 强制刷新
    
    console.log('样品列表获取成功')
    console.log('样品数量:', sampleStore.samples.length)
    console.log('总数:', sampleStore.pagination.total)
    console.log('=== 获取样品列表完成 ===')
  } catch (error: any) {
    console.error('获取样品列表失败:', error)
    ElMessage.error(error.message || '获取样品列表失败')
  }
}

// 搜索
const handleSearch = () => {
  // 搜索时重置到第一页
  fetchSamples(true)
}

// 重置
const handleReset = () => {
  filters.barcode = ''
  filters.name = ''
  filters.status = []
  filters.dateRange = null
  filters.sampleType = ''
  filters.client = ''
  filters.location = ''
  filters.createdBy = ''
  handleSearch()
}

// 刷新
const handleRefresh = () => {
  fetchSamples()
  ElMessage.success('数据已刷新')
}

// 切换高级筛选
const toggleAdvancedFilter = () => {
  showAdvancedFilter.value = !showAdvancedFilter.value
}

// 保存筛选条件
const handleSaveFilter = () => {
  ElMessageBox.prompt('请输入筛选条件名称', '保存筛选', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /\S+/,
    inputErrorMessage: '名称不能为空'
  }).then(({ value }) => {
    const filterId = Date.now().toString()
    savedFilters.value.push({
      id: filterId,
      name: value,
      filters: { ...filters }
    })
    ElMessage.success('筛选条件已保存')
  }).catch(() => {})
}

// 加载筛选条件
const handleLoadFilter = (filterId: string) => {
  const savedFilter = savedFilters.value.find(f => f.id === filterId)
  if (savedFilter) {
    Object.assign(filters, savedFilter.filters)
    handleSearch()
    ElMessage.success(`已加载筛选条件: ${savedFilter.name}`)
  }
}

// 列设置
const handleColumnSettings = () => {
  ElMessage.info('列设置功能将在后续版本中实现')
}

// 新建样品
const handleCreate = () => {
  router.push('/sample/registration')
}

// 导入
const handleImport = () => {
  ElMessage.info('导入功能将在后续任务中实现')
}

// 导出
const handleExport = () => {
  if (selectedSamples.value.length === 0) {
    ElMessage.warning('请先选择要导出的样品')
    return
  }
  ElMessage.success(`已选择 ${selectedSamples.value.length} 个样品进行导出`)
  // TODO: 实现导出功能
}

// 查看详情
const handleView = (row: Sample) => {
  router.push(`/sample/detail/${row.id}`)
}

// 编辑
const handleEdit = (row: Sample) => {
  router.push(`/sample/registration?id=${row.id}&mode=edit`)
}

// 删除
const handleDelete = async (row: Sample) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除样品"${row.sampleName}"吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await sampleStore.deleteSample(row.id)
    ElMessage.success('删除成功')
    await fetchSamples()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error(error.message || '删除失败')
    }
  }
}

// 更多操作
const handleMoreAction = (command: string, row: Sample) => {
  switch (command) {
    case 'transfer':
      ElMessage.info(`流转样品: ${row.sampleName}`)
      break
    case 'split':
      ElMessage.info(`分样操作: ${row.sampleName}`)
      break
    case 'print':
      ElMessage.info(`打印条码: ${row.barcode}`)
      break
    case 'delete':
      handleDelete(row)
      break
  }
}

// 批量流转
const handleBatchTransfer = () => {
  ElMessage.info(`批量流转 ${selectedSamples.value.length} 个样品`)
}

// 批量导出
const handleBatchExport = () => {
  ElMessage.success(`批量导出 ${selectedSamples.value.length} 个样品`)
}

// 批量删除
const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedSamples.value.length} 个样品吗？此操作不可恢复。`,
      '批量删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const ids = selectedSamples.value.map(s => s.id)
    await sampleStore.batchDelete(ids)
    ElMessage.success('批量删除成功')
    selectedSamples.value = []
    await fetchSamples()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error(error.message || '批量删除失败')
    }
  }
}

// 选择变化
const handleSelectionChange = (selection: Sample[]) => {
  selectedSamples.value = selection
}

// 排序变化
const handleSortChange = ({ prop, order }: any) => {
  sortConfig.prop = prop
  sortConfig.order = order
  fetchSamples()
}

// 状态筛选
const filterStatus = (value: string, row: Sample) => {
  return row.status === value
}

// 分页大小变化
const handleSizeChange = (size: number) => {
  console.log('📄 每页数量变化:', size)
  sampleStore.setPageSize(size)
  // 修改每页数量时会自动重置到第一页(在setPageSize中处理)
  fetchSamples(false)
}

// 当前页变化
const handleCurrentChange = (page: number) => {
  console.log('📄 页码变化:', page)
  sampleStore.setPage(page)
  // 翻页时不重置页码,保持当前页码
  fetchSamples(false)
}

// 获取状态标签类型
const getStatusType = (status: string) => {
  const typeMap: Record<string, any> = {
    REGISTERED: '',
    IN_PROGRESS: 'warning',
    COMPLETED: 'success',
    RELEASED: 'info',
    RETURNED: 'danger'
  }
  return typeMap[status] || ''
}

// 获取状态标签文本
const getStatusLabel = (status: string) => {
  const labelMap: Record<string, string> = {
    REGISTERED: '已登记',
    IN_PROGRESS: '进行中',
    COMPLETED: '已完成',
    RELEASED: '已放行',
    RETURNED: '已退回'
  }
  return labelMap[status] || status
}

// 格式化日期
const formatDate = (date: Date | string) => {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 组件挂载时获取数据
onMounted(async () => {
  console.log('=== 样品管理页面已挂载 ===')
  console.log('开始加载样品列表...')
  await fetchSamples()
  console.log('样品列表加载完成')
  
  // 添加列宽调整功能
  setTimeout(() => {
    enableColumnResize()
  }, 500)
})

// 启用列宽调整功能
const enableColumnResize = () => {
  if (!tableRef.value) return
  
  const table = tableRef.value.$el
  const actionColumn = table.querySelector('.action-column')
  
  if (!actionColumn) return
  
  // 查找操作列的表头单元格
  const headerCell = table.querySelector('thead .action-column')
  
  if (!headerCell) return
  
  // 创建拖动手柄
  const resizeHandle = document.createElement('div')
  resizeHandle.className = 'column-resize-handle'
  resizeHandle.style.cssText = `
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 10px;
    cursor: col-resize;
    z-index: 10;
    background: transparent;
  `
  
  // 添加悬停效果线条
  const resizeLine = document.createElement('div')
  resizeLine.className = 'resize-line'
  resizeLine.style.cssText = `
    position: absolute;
    left: 3px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: transparent;
    transition: background 0.2s;
  `
  resizeHandle.appendChild(resizeLine)
  
  // 设置表头单元格为相对定位
  headerCell.style.position = 'relative'
  headerCell.appendChild(resizeHandle)
  
  let isResizing = false
  let startX = 0
  let startWidth = 0
  
  // 鼠标按下
  resizeHandle.addEventListener('mousedown', (e: MouseEvent) => {
    isResizing = true
    startX = e.clientX
    startWidth = actionColumnWidth.value
    
    resizeLine.style.background = '#409eff'
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    
    e.preventDefault()
    e.stopPropagation()
  })
  
  // 鼠标移动
  document.addEventListener('mousemove', (e: MouseEvent) => {
    if (!isResizing) return
    
    const deltaX = startX - e.clientX // 注意：操作列在右侧，所以是反向的
    const newWidth = startWidth + deltaX
    
    // 限制最小和最大宽度
    if (newWidth >= 180 && newWidth <= 400) {
      actionColumnWidth.value = newWidth
    }
  })
  
  // 鼠标释放
  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false
      resizeLine.style.background = 'transparent'
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  })
  
  // 悬停效果
  resizeHandle.addEventListener('mouseenter', () => {
    if (!isResizing) {
      resizeLine.style.background = '#dcdfe6'
    }
  })
  
  resizeHandle.addEventListener('mouseleave', () => {
    if (!isResizing) {
      resizeLine.style.background = 'transparent'
    }
  })
}
</script>

<style scoped>
.sample-management {
  padding: 20px;
}

.operation-bar {
  margin-bottom: 20px;
}

.operation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.operation-buttons {
  display: flex;
  gap: 10px;
  align-items: center;
}

.operation-stats {
  display: flex;
  gap: 10px;
}

.filter-bar {
  margin-bottom: 20px;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.filter-title {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

.filter-actions {
  display: flex;
  gap: 10px;
}

.filter-form {
  margin-top: 16px;
}

.table-card {
  margin-bottom: 20px;
}

.batch-actions {
  padding: 12px 16px;
  background-color: #ecf5ff;
  border: 1px solid #d9ecff;
  border-radius: 4px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.batch-info {
  font-size: 14px;
  color: #409eff;
  font-weight: 500;
  margin-right: auto;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-card__body) {
  padding: 20px;
}

:deep(.el-form--inline .el-form-item) {
  margin-right: 20px;
  margin-bottom: 10px;
}

:deep(.el-table .el-link) {
  font-weight: 500;
}

:deep(.el-divider--vertical) {
  height: 1.5em;
  margin: 0 12px;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-buttons .el-button {
  margin: 0;
}

/* 列宽调整相关样式 */
:deep(.action-column) {
  position: relative;
}

:deep(.column-resize-handle) {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 10px;
  cursor: col-resize;
  z-index: 10;
}

:deep(.column-resize-handle:hover .resize-line) {
  background: #dcdfe6 !important;
}
</style>
