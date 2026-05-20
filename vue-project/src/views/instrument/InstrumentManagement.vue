<template>
  <div class="instrument-management">
    <!-- 操作栏 -->
    <el-card class="operation-bar" shadow="never">
      <el-space wrap>
        <el-button type="primary" :icon="Plus" @click="handleCreate">
          新建仪器
        </el-button>
        <el-button :icon="Download" @click="handleExport">
          导出
        </el-button>
        <el-button :icon="Refresh" @click="handleRefresh">
          刷新
        </el-button>
      </el-space>
    </el-card>

    <!-- 筛选栏 -->
    <el-card class="filter-bar" shadow="never">
      <el-form :inline="true" :model="filterForm" @submit.prevent="handleSearch">
        <el-form-item label="仪器编码">
          <el-input
            v-model="filterForm.code"
            placeholder="请输入仪器编码"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        
        <el-form-item label="仪器名称">
          <el-input
            v-model="filterForm.name"
            placeholder="请输入仪器名称"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        
        <el-form-item label="仪器状态">
          <el-select
            v-model="filterForm.status"
            placeholder="请选择状态"
            clearable
            style="width: 150px"
          >
            <el-option label="在用" value="在用" />
            <el-option label="备用" value="备用" />
            <el-option label="维修中" value="维修中" />
            <el-option label="校准中" value="校准中" />
            <el-option label="待报废" value="待报废" />
            <el-option label="已报废" value="已报废" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="所属部门">
          <el-input
            v-model="filterForm.department"
            placeholder="请输入部门"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">
            搜索
          </el-button>
          <el-button @click="handleReset">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格 -->
    <el-card shadow="never">
      <el-table
        v-loading="loading"
        :data="tableData"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="code" label="仪器编码" width="150" />
        <el-table-column prop="name" label="仪器名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="model" label="型号" width="120" />
        <el-table-column prop="manufacturer" label="制造商" width="120" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="currentLocation" label="当前位置" width="120" />
        <el-table-column prop="currentDepartment" label="所属部门" width="120" />
        <el-table-column prop="currentResponsible" label="负责人" width="100" />
        <el-table-column prop="purchaseDate" label="购置日期" width="120">
          <template #default="{ row }">
            {{ row.purchaseDate ? formatDate(row.purchaseDate) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleView(row)">
              查看
            </el-button>
            <el-button link type="primary" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button link type="danger" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Download, Refresh, Search } from '@element-plus/icons-vue'
import instrumentService from '@/services/instrumentService'
import type { Instrument } from '@/types/instrument'

const router = useRouter()

// 状态
const loading = ref(false)
const tableData = ref<Instrument[]>([])

// 筛选表单
const filterForm = reactive({
  code: '',
  name: '',
  status: '',
  department: ''
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 获取仪器列表
const fetchInstruments = async () => {
  loading.value = true
  try {
    const result = await instrumentService.getInstruments({
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...filterForm
    })
    
    tableData.value = result.items
    pagination.total = result.total
  } catch (error: any) {
    ElMessage.error(error.message || '获取仪器列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  fetchInstruments()
}

// 重置
const handleReset = () => {
  filterForm.code = ''
  filterForm.name = ''
  filterForm.status = ''
  filterForm.department = ''
  pagination.page = 1
  fetchInstruments()
}

// 刷新
const handleRefresh = () => {
  fetchInstruments()
}

// 新建仪器
const handleCreate = () => {
  router.push('/instrument/registration')
}

// 查看详情
const handleView = (row: Instrument) => {
  router.push(`/instrument/detail/${row.id}`)
}

// 编辑
const handleEdit = (row: Instrument) => {
  router.push(`/instrument/registration?id=${row.id}`)
}

// 删除
const handleDelete = async (row: Instrument) => {
  try {
    await ElMessageBox.confirm('确定要删除这台仪器吗?', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await instrumentService.deleteInstrument(row.id)
    ElMessage.success('删除成功')
    fetchInstruments()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

// 导出
const handleExport = async () => {
  try {
    ElMessage.info('导出功能开发中...')
  } catch (error: any) {
    ElMessage.error(error.message || '导出失败')
  }
}

// 分页变化
const handlePageChange = (page: number) => {
  pagination.page = page
  fetchInstruments()
}

const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.page = 1
  fetchInstruments()
}

// 获取状态类型
const getStatusType = (status: string) => {
  const typeMap: Record<string, any> = {
    '在用': 'success',
    '备用': 'info',
    '维修中': 'warning',
    '校准中': 'warning',
    '待报废': 'danger',
    '已报废': 'info'
  }
  return typeMap[status] || ''
}

// 获取状态标签
const getStatusLabel = (status: string) => {
  // 直接返回状态,因为mock数据已经是中文
  return status
}

// 格式化日期
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('zh-CN')
}

// 初始化
onMounted(() => {
  fetchInstruments()
})
</script>

<style scoped>
.instrument-management {
  padding: 20px;
}

.operation-bar,
.filter-bar {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
