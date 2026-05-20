<template>
  <div class="workflow-templates">
    <!-- 顶部操作栏 -->
    <div class="header-actions">
      <el-button type="primary" :icon="Plus" @click="handleCreate">
        新建模板
      </el-button>
      <el-button :icon="Refresh" @click="handleRefresh">刷新</el-button>
    </div>

    <!-- 搜索和筛选区域 -->
    <el-card class="search-card" shadow="never">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="模板名称">
          <el-input
            v-model="searchForm.name"
            placeholder="请输入模板名称"
            clearable
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="searchForm.status"
            placeholder="请选择状态"
            clearable
            @clear="handleSearch"
          >
            <el-option label="草稿" value="draft" />
            <el-option label="启用" value="active" />
            <el-option label="归档" value="archived" />
          </el-select>
        </el-form-item>
        <el-form-item label="适用类型">
          <el-select
            v-model="searchForm.applicableType"
            placeholder="请选择样品类型"
            clearable
            @clear="handleSearch"
          >
            <el-option
              v-for="type in sampleTypes"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">
            搜索
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 模板列表 -->
    <el-card class="table-card" shadow="never">
      <el-table
        v-loading="loading"
        :data="templates"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="name" label="模板名称" min-width="180">
          <template #default="{ row }">
            <el-link type="primary" @click="handleView(row)">
              {{ row.name }}
            </el-link>
          </template>
        </el-table-column>
        
        <el-table-column prop="version" label="版本" width="100" />
        
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        
        <el-table-column label="适用样品类型" min-width="200">
          <template #default="{ row }">
            <el-tag
              v-for="type in row.applicableTypes"
              :key="type"
              size="small"
              style="margin-right: 4px"
            >
              {{ getSampleTypeLabel(type) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="节点数量" width="100" align="center">
          <template #default="{ row }">
            <el-text>{{ row.nodes?.length || 0 }}</el-text>
          </template>
        </el-table-column>
        
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="getStatusType(row.status)"
              size="small"
            >
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
        
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              :icon="View"
              @click="handleView(row)"
            >
              查看
            </el-button>
            <el-button
              size="small"
              :icon="Edit"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              size="small"
              :icon="Setting"
              @click="handleConfigTypes(row)"
            >
              配置类型
            </el-button>
            <el-dropdown @command="(cmd) => handleMoreAction(cmd, row)">
              <el-button size="small" :icon="More">
                更多
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-if="row.status === 'draft'"
                    command="activate"
                    :icon="CircleCheck"
                  >
                    启用
                  </el-dropdown-item>
                  <el-dropdown-item
                    v-if="row.status === 'active'"
                    command="archive"
                    :icon="FolderOpened"
                  >
                    归档
                  </el-dropdown-item>
                  <el-dropdown-item command="copy" :icon="CopyDocument">
                    复制
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" :icon="Delete" divided>
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
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
          @size-change="handleSearch"
          @current-change="handleSearch"
        />
      </div>
    </el-card>

    <!-- 样品类型配置对话框 -->
    <el-dialog
      v-model="typeConfigDialog.visible"
      title="配置适用样品类型"
      width="600px"
      @close="handleTypeConfigClose"
    >
      <el-form :model="typeConfigDialog.form" label-width="120px">
        <el-form-item label="模板名称">
          <el-text>{{ typeConfigDialog.template?.name }}</el-text>
        </el-form-item>
        
        <el-form-item label="适用样品类型" required>
          <el-select
            v-model="typeConfigDialog.form.applicableTypes"
            multiple
            placeholder="请选择适用的样品类型"
            style="width: 100%"
          >
            <el-option
              v-for="type in sampleTypes"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            />
          </el-select>
          <div class="form-tip">
            选择后，该模板将自动应用于对应类型的样品
          </div>
        </el-form-item>
        
        <el-form-item label="自动应用">
          <el-switch
            v-model="typeConfigDialog.form.autoApply"
            active-text="启用"
            inactive-text="禁用"
          />
          <div class="form-tip">
            启用后，新建对应类型的样品时将自动使用此工作流模板
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="typeConfigDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="handleSaveTypeConfig">
          保存
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
  Refresh,
  Search,
  View,
  Edit,
  Setting,
  More,
  Delete,
  CircleCheck,
  FolderOpened,
  CopyDocument
} from '@element-plus/icons-vue'
import { workflowApi } from '@/services/api/workflow'

interface WorkflowTemplate {
  id: string
  name: string
  version: string
  description?: string
  applicableTypes: string[]
  nodes: any[]
  edges: any[]
  status: 'draft' | 'active' | 'archived'
  createdBy: string
  createdAt: string
  updatedAt: string
}

interface SearchForm {
  name: string
  status: string
  applicableType: string
}

interface Pagination {
  page: number
  pageSize: number
  total: number
}

const router = useRouter()

// 样品类型选项
const sampleTypes = [
  { label: '水质样品', value: 'water' },
  { label: '土壤样品', value: 'soil' },
  { label: '空气样品', value: 'air' },
  { label: '食品样品', value: 'food' },
  { label: '药品样品', value: 'medicine' },
  { label: '化工样品', value: 'chemical' },
  { label: '生物样品', value: 'biological' },
  { label: '其他样品', value: 'other' }
]

// 状态
const loading = ref(false)
const templates = ref<WorkflowTemplate[]>([])

const searchForm = reactive<SearchForm>({
  name: '',
  status: '',
  applicableType: ''
})

const pagination = reactive<Pagination>({
  page: 1,
  pageSize: 20,
  total: 0
})

// 类型配置对话框
const typeConfigDialog = reactive({
  visible: false,
  template: null as WorkflowTemplate | null,
  form: {
    applicableTypes: [] as string[],
    autoApply: true
  }
})

// 获取样品类型标签
const getSampleTypeLabel = (value: string): string => {
  const type = sampleTypes.find(t => t.value === value)
  return type?.label || value
}

// 获取状态类型
const getStatusType = (status: string) => {
  const typeMap: Record<string, any> = {
    draft: 'info',
    active: 'success',
    archived: 'warning'
  }
  return typeMap[status] || 'info'
}

// 获取状态标签
const getStatusLabel = (status: string): string => {
  const labelMap: Record<string, string> = {
    draft: '草稿',
    active: '启用',
    archived: '归档'
  }
  return labelMap[status] || status
}

// 格式化日期
const formatDate = (date: string): string => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

// 加载模板列表
const loadTemplates = async () => {
  loading.value = true
  try {
    console.log('开始加载工作流模板列表...')
    
    // 调用真实的后端API
    const response = await workflowApi.getList()
    console.log('API响应:', response)
    
    // 修复：正确处理API响应数据格式
    // 后端可能返回直接数组或包装对象格式
    let workflowList: any[] = []
    
    if (Array.isArray(response)) {
      // 直接数组格式
      workflowList = response
    } else if (response && typeof response === 'object') {
      // 包装对象格式，尝试多种可能的字段名
      workflowList = response.items || response.data || response.list || []
      
      // 如果还是没有找到数组，检查是否是单个对象
      if (!Array.isArray(workflowList) && workflowList.length === undefined) {
        workflowList = []
      }
    } else {
      // 其他情况，默认为空数组
      workflowList = []
    }
    
    console.log('解析后的工作流列表:', workflowList)
    
    // 确保 workflowList 是数组
    if (!Array.isArray(workflowList)) {
      console.warn('工作流数据格式异常，使用空数组')
      workflowList = []
    }
    
    // 转换数据格式以匹配前端界面
    const convertedTemplates: WorkflowTemplate[] = workflowList.map((workflow: any, index: number) => {
      // 安全地访问嵌套属性
      const config = workflow.config || {}
      const nodes = config.nodes || []
      const edges = config.edges || []
      
      // 确定状态映射
      let status: 'draft' | 'active' | 'archived' = 'draft'
      if (workflow.isActive === true) {
        status = 'active'
      } else if (workflow.status === 'ACTIVE') {
        status = 'active'
      } else if (workflow.status === 'ARCHIVED') {
        status = 'archived'
      }
      
      return {
        id: workflow.id || `workflow-${index}`,
        name: workflow.name || `未命名工作流-${index + 1}`,
        version: `v${workflow.version || '1.0'}`,
        description: workflow.description || '',
        applicableTypes: workflow.applicableTypes || ['other'], // 默认为其他类型
        nodes: nodes,
        edges: edges,
        status: status,
        createdBy: workflow.createdBy || '系统',
        createdAt: workflow.createdAt || new Date().toISOString(),
        updatedAt: workflow.updatedAt || new Date().toISOString()
      }
    })
    
    console.log('转换后的模板列表:', convertedTemplates)
    
    // 应用筛选
    let filtered = convertedTemplates
    
    if (searchForm.name) {
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(searchForm.name.toLowerCase())
      )
    }
    
    if (searchForm.status) {
      filtered = filtered.filter(t => t.status === searchForm.status)
    }
    
    if (searchForm.applicableType) {
      filtered = filtered.filter(t => 
        t.applicableTypes.includes(searchForm.applicableType)
      )
    }
    
    pagination.total = filtered.length
    
    // 分页
    const start = (pagination.page - 1) * pagination.pageSize
    const end = start + pagination.pageSize
    templates.value = filtered.slice(start, end)
    
    console.log('最终显示的模板:', templates.value)
    console.log(`成功加载 ${templates.value.length} 个模板，总计 ${pagination.total} 个`)
    
    // 如果没有数据，给出友好提示
    if (templates.value.length === 0 && pagination.total === 0) {
      console.log('未找到工作流模板数据')
      ElMessage.info('暂无工作流模板数据，请先创建模板')
    }
    
  } catch (error) {
    console.error('加载模板列表失败:', error)
    
    // 增强错误处理
    let errorMessage = '加载模板列表失败'
    
    if (error instanceof Error) {
      if (error.message.includes('Network Error')) {
        errorMessage = '网络连接失败，请检查网络连接'
      } else if (error.message.includes('404')) {
        errorMessage = '工作流服务不可用，请联系管理员'
      } else if (error.message.includes('403')) {
        errorMessage = '权限不足，无法访问工作流模板'
      } else {
        errorMessage = `加载失败: ${error.message}`
      }
    }
    
    ElMessage.error(errorMessage)
    
    // 如果API调用失败，显示空列表而不是模拟数据
    templates.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  loadTemplates()
}

// 重置搜索
const handleReset = () => {
  searchForm.name = ''
  searchForm.status = ''
  searchForm.applicableType = ''
  handleSearch()
}

// 刷新
const handleRefresh = () => {
  loadTemplates()
  ElMessage.success('已刷新')
}

// 新建模板
const handleCreate = () => {
  router.push({ name: 'workflow-designer' })
}

// 查看模板
const handleView = (template: WorkflowTemplate) => {
  router.push({
    name: 'workflow-designer',
    params: { id: template.id },
    query: { mode: 'view' }
  })
}

// 编辑模板
const handleEdit = (template: WorkflowTemplate) => {
  if (template.status === 'active') {
    ElMessageBox.confirm(
      '该模板当前处于启用状态，编辑后需要重新审核。是否继续？',
      '提示',
      {
        confirmButtonText: '继续编辑',
        cancelButtonText: '取消',
        type: 'warning'
      }
    ).then(() => {
      router.push({
        name: 'workflow-designer',
        params: { id: template.id }
      })
    }).catch(() => {
      // 用户取消
    })
  } else {
    router.push({
      name: 'workflow-designer',
      params: { id: template.id }
    })
  }
}

// 配置样品类型
const handleConfigTypes = (template: WorkflowTemplate) => {
  typeConfigDialog.template = template
  typeConfigDialog.form.applicableTypes = [...template.applicableTypes]
  typeConfigDialog.form.autoApply = true
  typeConfigDialog.visible = true
}

// 保存类型配置
const handleSaveTypeConfig = async () => {
  if (typeConfigDialog.form.applicableTypes.length === 0) {
    ElMessage.warning('请至少选择一个样品类型')
    return
  }
  
  try {
    // 模拟保存
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 更新本地数据
    if (typeConfigDialog.template) {
      const template = templates.value.find(t => t.id === typeConfigDialog.template!.id)
      if (template) {
        template.applicableTypes = [...typeConfigDialog.form.applicableTypes]
      }
    }
    
    ElMessage.success('样品类型配置已保存')
    typeConfigDialog.visible = false
  } catch (error) {
    console.error('保存配置失败:', error)
    ElMessage.error('保存配置失败')
  }
}

// 关闭类型配置对话框
const handleTypeConfigClose = () => {
  typeConfigDialog.template = null
  typeConfigDialog.form.applicableTypes = []
  typeConfigDialog.form.autoApply = true
}

// 更多操作
const handleMoreAction = async (command: string, template: WorkflowTemplate) => {
  switch (command) {
    case 'activate':
      await handleActivate(template)
      break
    case 'archive':
      await handleArchive(template)
      break
    case 'copy':
      await handleCopy(template)
      break
    case 'delete':
      await handleDelete(template)
      break
  }
}

// 启用模板
const handleActivate = async (template: WorkflowTemplate) => {
  try {
    await ElMessageBox.confirm(
      '启用后，该模板将可以应用于对应类型的样品。是否继续？',
      '确认启用',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    
    // 模拟启用
    await new Promise(resolve => setTimeout(resolve, 500))
    template.status = 'active'
    ElMessage.success('模板已启用')
  } catch {
    // 用户取消
  }
}

// 归档模板
const handleArchive = async (template: WorkflowTemplate) => {
  try {
    await ElMessageBox.confirm(
      '归档后，该模板将不再应用于新样品。是否继续？',
      '确认归档',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 模拟归档
    await new Promise(resolve => setTimeout(resolve, 500))
    template.status = 'archived'
    ElMessage.success('模板已归档')
  } catch {
    // 用户取消
  }
}

// 复制模板
const handleCopy = async (template: WorkflowTemplate) => {
  try {
    const { value: newName } = await ElMessageBox.prompt(
      '请输入新模板的名称',
      '复制模板',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputValue: `${template.name} - 副本`,
        inputPattern: /.+/,
        inputErrorMessage: '模板名称不能为空'
      }
    )
    
    // 模拟复制
    await new Promise(resolve => setTimeout(resolve, 500))
    ElMessage.success(`模板 "${newName}" 已创建`)
    loadTemplates()
  } catch {
    // 用户取消
  }
}

// 删除模板
const handleDelete = async (template: WorkflowTemplate) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除模板 "${template.name}" 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'error'
      }
    )
    
    // 模拟删除
    await new Promise(resolve => setTimeout(resolve, 500))
    templates.value = templates.value.filter(t => t.id !== template.id)
    pagination.total--
    ElMessage.success('模板已删除')
  } catch {
    // 用户取消
  }
}

// 初始化
onMounted(() => {
  loadTemplates()
})
</script>

<style scoped lang="scss">
.workflow-templates {
  padding: 20px;

  .header-actions {
    margin-bottom: 16px;
    display: flex;
    gap: 8px;
  }

  .search-card {
    margin-bottom: 16px;

    :deep(.el-card__body) {
      padding: 16px;
    }
  }

  .table-card {
    :deep(.el-card__body) {
      padding: 16px;
    }
  }

  .pagination-container {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
  }

  .form-tip {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
    line-height: 1.5;
  }
}
</style>
