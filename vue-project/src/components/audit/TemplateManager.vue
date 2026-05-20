<template>
  <div class="template-manager">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索模板名称或内容"
          clearable
          :prefix-icon="Search"
          style="width: 300px"
        />
        <el-select
          v-model="filterType"
          placeholder="按类型筛选"
          clearable
          style="width: 150px"
        >
          <el-option label="全部" value="" />
          <el-option label="通过" value="approved" />
          <el-option label="需修改" value="need_revision" />
          <el-option label="不通过" value="rejected" />
          <el-option label="其他" value="other" />
        </el-select>
      </div>
      <el-button
        v-if="!readonly"
        type="primary"
        :icon="Plus"
        @click="handleAdd"
      >
        添加模板
      </el-button>
    </div>

    <!-- 模板列表 -->
    <el-table
      v-loading="loading"
      :data="filteredTemplates"
      stripe
      border
      style="width: 100%"
      class="template-table"
    >
      <el-table-column prop="name" label="模板名称" min-width="150">
        <template #default="{ row }">
          <div class="template-name-cell">
            <span>{{ row.name }}</span>
            <el-icon v-if="row.isDefault" color="var(--el-color-warning)">
              <Star />
            </el-icon>
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="type" label="类型" width="120">
        <template #default="{ row }">
          <el-tag :type="getTypeTagType(row.type)" size="small">
            {{ getTypeName(row.type) }}
          </el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="content" label="模板内容" min-width="250">
        <template #default="{ row }">
          <div class="template-content-preview">
            {{ row.content }}
          </div>
        </template>
      </el-table-column>

      <el-table-column prop="usageCount" label="使用次数" width="100" align="center" />

      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="!readonly && !row.isDefault"
            type="primary"
            size="small"
            text
            @click="handleSetDefault(row)"
          >
            设为默认
          </el-button>
          <el-button
            v-if="!readonly"
            type="primary"
            size="small"
            text
            @click="handleEdit(row)"
          >
            编辑
          </el-button>
          <el-button
            v-if="!readonly"
            type="danger"
            size="small"
            text
            @click="handleDelete(row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑模板' : '添加模板'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="模板名称" prop="name">
          <el-input
            v-model="formData.name"
            placeholder="请输入模板名称"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="审核类型" prop="type">
          <el-select v-model="formData.type" placeholder="请选择审核类型" style="width: 100%">
            <el-option label="通过" value="approved" />
            <el-option label="需修改" value="need_revision" />
            <el-option label="不通过" value="rejected" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>

        <el-form-item label="模板内容" prop="content">
          <el-input
            v-model="formData.content"
            type="textarea"
            :rows="6"
            placeholder="请输入模板内容"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="设为默认">
          <el-switch v-model="formData.isDefault" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Search, Plus, Star } from '@element-plus/icons-vue'
import { useTemplateStore, type CommentTemplate } from '@/stores/template'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'

interface Props {
  readonly?: boolean
}

interface Emits {
  (e: 'change'): void
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
})

const emit = defineEmits<Emits>()

const templateStore = useTemplateStore()

// 状态
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const isEditing = ref(false)
const searchKeyword = ref('')
const filterType = ref('')

// 表单
const formRef = ref<FormInstance>()
const formData = ref({
  id: '',
  name: '',
  type: 'approved' as 'approved' | 'need_revision' | 'rejected' | 'other',
  content: '',
  isDefault: false
})

// 表单验证规则
const formRules: FormRules = {
  name: [
    { required: true, message: '请输入模板名称', trigger: 'blur' },
    { min: 1, max: 50, message: '长度在 1 到 50 个字符', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择审核类型', trigger: 'change' }
  ],
  content: [
    { required: true, message: '请输入模板内容', trigger: 'blur' },
    { min: 1, max: 500, message: '长度在 1 到 500 个字符', trigger: 'blur' }
  ]
}

// 过滤后的模板列表
const filteredTemplates = computed(() => {
  let templates = templateStore.templates

  // 按类型筛选
  if (filterType.value) {
    templates = templates.filter(t => t.type === filterType.value)
  }

  // 按关键词搜索
  if (searchKeyword.value) {
    templates = templateStore.searchTemplates(searchKeyword.value)
  }

  return templates
})

// 获取类型名称
const getTypeName = (type: string): string => {
  const names: Record<string, string> = {
    approved: '通过',
    need_revision: '需修改',
    rejected: '不通过',
    other: '其他'
  }
  return names[type] || type
}

// 获取类型标签类型
const getTypeTagType = (type: string): 'success' | 'warning' | 'danger' | 'info' => {
  const types: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    approved: 'success',
    need_revision: 'warning',
    rejected: 'danger',
    other: 'info'
  }
  return types[type] || 'info'
}

// 加载模板列表
const loadTemplates = async () => {
  loading.value = true
  try {
    await templateStore.fetchTemplates(true)
  } catch (error) {
    ElMessage.error('加载模板列表失败')
  } finally {
    loading.value = false
  }
}

// 添加模板
const handleAdd = () => {
  isEditing.value = false
  formData.value = {
    id: '',
    name: '',
    type: 'approved',
    content: '',
    isDefault: false
  }
  dialogVisible.value = true
}

// 编辑模板
const handleEdit = (template: CommentTemplate) => {
  isEditing.value = true
  formData.value = {
    id: template.id,
    name: template.name,
    type: template.type,
    content: template.content,
    isDefault: template.isDefault
  }
  dialogVisible.value = true
}

// 删除模板
const handleDelete = async (template: CommentTemplate) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除模板"${template.name}"吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await templateStore.deleteTemplate(template.id)
    ElMessage.success('删除成功')
    emit('change')
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 设为默认
const handleSetDefault = async (template: CommentTemplate) => {
  try {
    await templateStore.setDefaultTemplate(template.id, template.type)
    ElMessage.success('设置成功')
    emit('change')
  } catch (error) {
    ElMessage.error('设置失败')
  }
}

// 保存模板
const handleSave = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch (error) {
    return
  }

  saving.value = true

  try {
    if (isEditing.value) {
      await templateStore.updateTemplate(formData.value.id, {
        name: formData.value.name,
        type: formData.value.type,
        content: formData.value.content,
        isDefault: formData.value.isDefault
      })
      ElMessage.success('更新成功')
    } else {
      await templateStore.createTemplate({
        name: formData.value.name,
        type: formData.value.type,
        content: formData.value.content,
        isDefault: formData.value.isDefault
      })
      ElMessage.success('创建成功')
    }

    dialogVisible.value = false
    emit('change')
  } catch (error) {
    ElMessage.error(isEditing.value ? '更新失败' : '创建失败')
  } finally {
    saving.value = false
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadTemplates()
})

// 暴露方法给父组件
defineExpose({
  refresh: loadTemplates
})
</script>

<style scoped>
.template-manager {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  gap: 12px;
  flex: 1;
}

.template-table {
  flex: 1;
}

.template-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.template-content-preview {
  max-height: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  white-space: pre-wrap;
  line-height: 1.6;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar-left {
    flex-direction: column;
  }

  .toolbar-left .el-input,
  .toolbar-left .el-select {
    width: 100% !important;
  }
}
</style>
