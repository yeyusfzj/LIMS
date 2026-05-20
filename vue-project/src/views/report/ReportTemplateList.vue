<template>
  <div class="report-template-list">
    <!-- 页面标题和操作栏 -->
    <el-card class="header-card" shadow="never">
      <div class="header-content">
        <div class="title-section">
          <h2>报告模板管理</h2>
          <p class="subtitle">管理和配置检测报告模板</p>
        </div>
        <div class="action-section">
          <el-button type="primary" :icon="Plus" @click="handleCreate">
            新建模板
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 搜索和筛选区域 -->
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="filters" class="filter-form">
        <el-form-item label="模板名称">
          <el-input
            v-model="filters.keyword"
            placeholder="请输入模板名称"
            clearable
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item label="报告类型">
          <el-select
            v-model="filters.applicableType"
            placeholder="请选择报告类型"
            clearable
            @clear="handleSearch"
          >
            <el-option label="分析报告" value="ANALYSIS_REPORT" />
            <el-option label="样品报告" value="SAMPLE_REPORT" />
            <el-option label="技术报告" value="TECHNICAL_REPORT" />
            <el-option label="质量报告" value="QUALITY_REPORT" />
            <el-option label="综合报告" value="COMPREHENSIVE_REPORT" />
            <el-option label="水质检测" value="water" />
            <el-option label="土壤检测" value="soil" />
            <el-option label="空气检测" value="air" />
            <el-option label="食品检测" value="food" />
            <el-option label="通用模板" value="general" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="filters.status"
            placeholder="请选择状态"
            clearable
            @clear="handleSearch"
          >
            <el-option label="草稿" value="draft" />
            <el-option label="启用" value="active" />
            <el-option label="归档" value="archived" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">
            搜索
          </el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 模板列表表格 -->
    <el-card class="table-card" shadow="never">
      <el-table
        v-loading="loading"
        :data="templateList"
        stripe
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="name" label="模板名称" min-width="180">
          <template #default="{ row }">
            <div class="template-name">
              <el-icon class="template-icon"><Document /></el-icon>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="version" label="版本" width="100" />
        <el-table-column prop="applicableTypes" label="报告类型" min-width="150">
          <template #default="{ row }">
            <el-tag
              v-for="type in row.applicableTypes"
              :key="type"
              size="small"
              :type="getTypeTagType(type)"
              style="margin-right: 5px"
            >
              {{ getTypeLabel(type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdBy" label="创建人" width="120" />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
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
              link
              :icon="View"
              @click="handlePreview(row)"
            >
              预览
            </el-button>
            <el-button
              type="primary"
              link
              :icon="Edit"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              type="primary"
              link
              :icon="CopyDocument"
              @click="handleCopy(row)"
            >
              复制
            </el-button>
            <el-button
              type="danger"
              link
              :icon="Delete"
              @click="handleDelete(row)"
            >
              删除
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

    <!-- 预览对话框 -->
    <el-dialog
      v-model="previewDialogVisible"
      title="模板预览"
      width="80%"
      :close-on-click-modal="false"
    >
      <div class="preview-container">
        <div class="preview-header">
          <h3>{{ currentTemplate?.name }}</h3>
          <div class="preview-meta">
            <span>版本: {{ currentTemplate?.version }}</span>
            <span>创建人: {{ currentTemplate?.createdBy }}</span>
          </div>
        </div>
        <el-divider />
        <div class="preview-content" v-html="currentTemplate?.content"></div>
      </div>
      <template #footer>
        <el-button @click="previewDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleEditFromPreview">
          编辑模板
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
  Plus,
  Search,
  Refresh,
  Edit,
  Delete,
  View,
  Document,
  CopyDocument
} from '@element-plus/icons-vue'
import type { ReportTemplate } from '@/types'
import http from '@/services/http'

const router = useRouter()

// 数据状态
const loading = ref(false)
const templateList = ref<ReportTemplate[]>([])
const selectedTemplates = ref<ReportTemplate[]>([])
const previewDialogVisible = ref(false)
const currentTemplate = ref<ReportTemplate | null>(null)

// 筛选条件
const filters = reactive({
  keyword: '',
  applicableType: '',
  status: ''
})

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 获取模板列表
const fetchTemplates = async () => {
  loading.value = true
  try {
    // 构建查询参数
    const params: any = {
      page: pagination.currentPage,
      pageSize: pagination.pageSize
    }
    
    if (filters.keyword) {
      params.search = filters.keyword
    }
    if (filters.applicableType) {
      params.category = filters.applicableType
    }
    if (filters.status) {
      if (filters.status === 'active') {
        params.isActive = 'true'
      } else if (filters.status === 'draft' || filters.status === 'archived') {
        params.isActive = 'false'
      }
    }
    
    // 调用后端API
    const response = await http.get('/report-templates', { params })
    
    // 处理 FastAPI 响应格式: { success: true, data: { items: [...], total, page, pageSize, totalPages } }
    const items = response.data?.items || []
    
    // 转换数据格式
    const templates = items.map((item: any) => ({
      id: item.id,
      name: item.name,
      version: `v${item.version}`,
      content: item.content,
      variables: item.variables,
      applicableTypes: [item.category],
      status: item.isActive ? 'active' : 'draft',
      createdBy: item.createdBy,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt)
    }))
    
    templateList.value = templates
    pagination.total = response.data?.total || 0
  } catch (error: any) {
    console.error('获取模板列表失败:', error)
    ElMessage.error(error.message || '获取模板列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.currentPage = 1
  fetchTemplates()
}

// 重置
const handleReset = () => {
  filters.keyword = ''
  filters.applicableType = ''
  filters.status = ''
  pagination.currentPage = 1
  fetchTemplates()
}

// 新建模板
const handleCreate = () => {
  router.push({ name: 'report-template-editor' })
}

// 编辑模板
const handleEdit = (template: ReportTemplate) => {
  router.push({
    name: 'report-template-editor',
    params: { id: template.id }
  })
}

// 预览模板
const handlePreview = (template: ReportTemplate) => {
  currentTemplate.value = template
  previewDialogVisible.value = true
}

// 从预览进入编辑
const handleEditFromPreview = () => {
  if (currentTemplate.value) {
    previewDialogVisible.value = false
    handleEdit(currentTemplate.value)
  }
}

// 复制模板
const handleCopy = async (template: ReportTemplate) => {
  try {
    await ElMessageBox.confirm(
      `确定要复制模板"${template.name}"吗？`,
      '复制确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    
    // 获取原模板详情
    const originalTemplate = await http.get(`/report-templates/${template.id}`)
    
    // 创建副本
    const copyData = {
      name: `${originalTemplate.name} - 副本`,
      category: originalTemplate.category,
      content: originalTemplate.content,
      variables: originalTemplate.variables,
      isActive: false
    }
    
    await http.post('/report-templates', copyData)
    ElMessage.success('模板复制成功')
    fetchTemplates()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('复制模板失败:', error)
      ElMessage.error(error.message || '复制模板失败')
    }
  }
}

// 删除模板
const handleDelete = async (template: ReportTemplate) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除模板"${template.name}"吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await http.delete(`/report-templates/${template.id}`)
    ElMessage.success('模板删除成功')
    fetchTemplates()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除模板失败:', error)
      ElMessage.error(error.message || '删除模板失败')
    }
  }
}

// 表格选择变化
const handleSelectionChange = (selection: ReportTemplate[]) => {
  selectedTemplates.value = selection
}

// 分页大小变化
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  fetchTemplates()
}

// 当前页变化
const handleCurrentChange = (page: number) => {
  pagination.currentPage = page
  fetchTemplates()
}

// 获取类型标签
const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    // 新的报告类型
    ANALYSIS_REPORT: '分析报告',
    SAMPLE_REPORT: '样品报告',
    TECHNICAL_REPORT: '技术报告',
    QUALITY_REPORT: '质量报告',
    COMPREHENSIVE_REPORT: '综合报告',
    // 旧的检测类型
    water: '水质检测',
    soil: '土壤检测',
    air: '空气检测',
    food: '食品检测',
    general: '通用模板'
  }
  return labels[type] || type
}

// 获取类型标签颜色
const getTypeTagType = (type: string): 'success' | 'info' | 'warning' | 'danger' | '' => {
  const types: Record<string, 'success' | 'info' | 'warning' | 'danger' | ''> = {
    ANALYSIS_REPORT: 'success',
    SAMPLE_REPORT: 'info',
    TECHNICAL_REPORT: 'warning',
    QUALITY_REPORT: 'danger',
    COMPREHENSIVE_REPORT: '',
    water: 'info',
    soil: 'warning',
    air: 'success',
    food: 'danger',
    general: ''
  }
  return types[type] || ''
}

// 获取状态标签
const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    draft: '草稿',
    active: '启用',
    archived: '归档'
  }
  return labels[status] || status
}

// 获取状态类型
const getStatusType = (status: string): 'success' | 'info' | 'warning' => {
  const types: Record<string, 'success' | 'info' | 'warning'> = {
    draft: 'info',
    active: 'success',
    archived: 'warning'
  }
  return types[status] || 'info'
}

// 格式化日期
const formatDate = (date: Date): string => {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 初始化
onMounted(() => {
  fetchTemplates()
})
</script>

<style scoped lang="scss">
.report-template-list {
  padding: 20px;

  .header-card {
    margin-bottom: 20px;

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .title-section {
        h2 {
          margin: 0 0 8px 0;
          font-size: 24px;
          color: #303133;
        }

        .subtitle {
          margin: 0;
          font-size: 14px;
          color: #909399;
        }
      }
    }
  }

  .filter-card {
    margin-bottom: 20px;

    .filter-form {
      margin-bottom: 0;
    }
  }

  .table-card {
    .template-name {
      display: flex;
      align-items: center;
      gap: 8px;

      .template-icon {
        color: #409eff;
        font-size: 18px;
      }
    }

    .pagination-container {
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
    }
  }

  .preview-container {
    .preview-header {
      margin-bottom: 16px;

      h3 {
        margin: 0 0 8px 0;
        font-size: 20px;
        color: #303133;
      }

      .preview-meta {
        display: flex;
        gap: 20px;
        font-size: 14px;
        color: #909399;
      }
    }

    .preview-content {
      padding: 20px;
      background-color: #f5f7fa;
      border-radius: 4px;
      min-height: 400px;
      max-height: 600px;
      overflow-y: auto;
    }
  }
}
</style>
