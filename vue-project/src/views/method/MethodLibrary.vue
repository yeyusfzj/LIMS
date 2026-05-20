<template>
  <div class="method-library">
    <div class="page-header">
      <h1>检测方法库</h1>
      <el-button type="primary" :icon="Plus" @click="handleCreate">新建方法</el-button>
    </div>

    <!-- 搜索筛选区 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="filters" class="search-form">
        <el-form-item label="关键词">
          <el-input
            v-model="filters.keyword"
            placeholder="方法编号/名称"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="检测类别">
          <el-select
            v-model="filters.category"
            placeholder="请选择"
            clearable
            style="width: 150px"
          >
            <el-option label="水质检测" value="水质检测" />
            <el-option label="土壤检测" value="土壤检测" />
            <el-option label="食品检测" value="食品检测" />
            <el-option label="环境检测" value="环境检测" />
            <el-option label="材料检测" value="材料检测" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="filters.status"
            placeholder="请选择"
            clearable
            style="width: 120px"
          >
            <el-option label="草稿" value="DRAFT" />
            <el-option label="启用" value="ACTIVE" />
            <el-option label="归档" value="ARCHIVED" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>


    <!-- 数据表格 -->
    <el-card class="table-card">
      <el-table
        :data="methodList"
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="code" label="方法编号" width="150" />
        <el-table-column prop="name" label="方法名称" min-width="200" />
        <el-table-column prop="category" label="检测类别" width="120" />
        <el-table-column prop="version" label="版本" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 'ACTIVE' ? 'success' : row.status === 'DRAFT' ? 'info' : 'warning'"
            >
              {{ row.status === 'ACTIVE' ? '启用' : row.status === 'DRAFT' ? '草稿' : '归档' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              :icon="View"
              size="small"
              link
              @click="handleView(row.id)"
            >
              查看
            </el-button>
            <el-button
              type="primary"
              :icon="Edit"
              size="small"
              link
              @click="handleEdit(row.id)"
            >
              编辑
            </el-button>
            <el-button
              type="primary"
              :icon="CopyDocument"
              size="small"
              link
              @click="handleCopy(row.id)"
            >
              复制
            </el-button>
            <el-button
              type="danger"
              :icon="Delete"
              size="small"
              link
              @click="handleDelete(row.id)"
            >
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
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
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
import { Plus, Search, Refresh, View, Edit, CopyDocument, Delete } from '@element-plus/icons-vue'
import { methodService } from '@/services/methodService'
import type { TestMethod } from '@/types'

const router = useRouter()

// 数据状态
const loading = ref(false)
const methodList = ref<TestMethod[]>([])

// 搜索筛选条件
const filters = reactive({
  keyword: '',
  category: '',
  status: ''
})

// 分页信息
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

/**
 * 加载检测方法列表
 */
const loadMethodList = async () => {
  try {
    loading.value = true
    console.log('开始加载检测方法列表，参数:', {
      ...filters,
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    
    const response = await methodService.getMethodList({
      ...filters,
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    
    console.log('检测方法列表响应:', response)
    
    methodList.value = response.data || []
    pagination.total = response.total || 0
    
    console.log('检测方法列表加载成功，共', pagination.total, '条数据')
  } catch (error) {
    console.error('加载检测方法列表失败:', error)
    ElMessage.error('加载检测方法列表失败')
  } finally {
    loading.value = false
  }
}

/**
 * 搜索
 */
const handleSearch = () => {
  pagination.page = 1
  loadMethodList()
}

/**
 * 重置
 */
const handleReset = () => {
  filters.keyword = ''
  filters.category = ''
  filters.status = ''
  pagination.page = 1
  loadMethodList()
}

/**
 * 新建方法
 */
const handleCreate = () => {
  router.push('/method/editor')
}

/**
 * 查看方法
 */
const handleView = (id: string) => {
  router.push(`/method/editor/${id}?mode=view`)
}

/**
 * 编辑方法
 */
const handleEdit = (id: string) => {
  router.push(`/method/editor/${id}`)
}



/**
 * 复制方法
 */
const handleCopy = async (id: string) => {
  try {
    const { value: newVersion } = await ElMessageBox.prompt('请输入新版本号', '复制检测方法', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /^v?\d+\.\d+(\.\d+)?$/,
      inputErrorMessage: '版本号格式不正确，例如: v1.0 或 1.0.0'
    })
    
    if (newVersion) {
      await methodService.copyMethod(id, newVersion)
      ElMessage.success('复制成功')
      loadMethodList()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('复制检测方法失败:', error)
      ElMessage.error('复制失败')
    }
  }
}

/**
 * 删除方法
 */
const handleDelete = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定要删除该检测方法吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await methodService.deleteMethod(id)
    ElMessage.success('删除成功')
    loadMethodList()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除检测方法失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

/**
 * 分页大小变化
 */
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.page = 1
  loadMethodList()
}

/**
 * 页码变化
 */
const handlePageChange = (page: number) => {
  pagination.page = page
  loadMethodList()
}

/**
 * 格式化日期
 */
const formatDate = (date: Date | string) => {
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

// 组件挂载时加载数据
onMounted(() => {
  console.log('MethodLibrary组件已挂载，开始加载数据')
  loadMethodList()
})
</script>



<style scoped>
.method-library {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.search-card {
  margin-bottom: 20px;
}

.search-form {
  margin-bottom: 0;
}

.table-card {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
