<template>
  <div class="workflow-config-manager">
    <!-- 工具栏 -->
    <div class="toolbar">
      <el-text type="info">
        配置审核流程的级别和审核人
      </el-text>
      <el-button
        v-if="!readonly"
        type="primary"
        :icon="Plus"
        @click="handleAddLevel"
      >
        添加审核级别
      </el-button>
    </div>

    <!-- 审核级别列表 -->
    <div v-loading="loading" class="levels-container">
      <el-empty
        v-if="!loading && levels.length === 0"
        description="暂无审核级别，请添加"
        :image-size="80"
      />

      <draggable
        v-else
        v-model="levels"
        item-key="id"
        handle=".drag-handle"
        :disabled="readonly"
        @end="handleDragEnd"
      >
        <template #item="{ element: level, index }">
          <div class="level-card">
            <div class="level-header">
              <div class="level-title">
                <el-icon v-if="!readonly" class="drag-handle">
                  <Rank />
                </el-icon>
                <span class="level-order">级别 {{ index + 1 }}</span>
                <el-tag v-if="level.required" type="danger" size="small" effect="plain">
                  必需
                </el-tag>
              </div>
              <div class="level-actions">
                <el-button
                  v-if="!readonly"
                  type="primary"
                  size="small"
                  text
                  @click="handleEditLevel(level, index)"
                >
                  编辑
                </el-button>
                <el-button
                  v-if="!readonly"
                  type="danger"
                  size="small"
                  text
                  @click="handleDeleteLevel(index)"
                >
                  删除
                </el-button>
              </div>
            </div>

            <div class="level-content">
              <div class="level-info">
                <el-icon><Document /></el-icon>
                <span class="info-label">级别名称：</span>
                <span class="info-value">{{ level.name }}</span>
              </div>

              <div v-if="level.description" class="level-info">
                <el-icon><InfoFilled /></el-icon>
                <span class="info-label">描述：</span>
                <span class="info-value">{{ level.description }}</span>
              </div>

              <div class="level-info">
                <el-icon><User /></el-icon>
                <span class="info-label">审核角色：</span>
                <span class="info-value">{{ level.roleName || level.role }}</span>
              </div>

              <div v-if="level.autoAssign" class="level-info">
                <el-icon><Check /></el-icon>
                <span class="info-value">自动分配</span>
              </div>
            </div>
          </div>
        </template>
      </draggable>
    </div>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditing ? '编辑审核级别' : '添加审核级别'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="级别名称" prop="name">
          <el-input
            v-model="formData.name"
            placeholder="例如：初审、复审、终审"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入级别描述（可选）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="审核角色" prop="role">
          <el-select
            v-model="formData.role"
            placeholder="请选择审核角色"
            style="width: 100%"
          >
            <el-option label="审核员" value="auditor" />
            <el-option label="高级审核员" value="senior_auditor" />
            <el-option label="审核主管" value="audit_supervisor" />
            <el-option label="质量经理" value="quality_manager" />
            <el-option label="技术负责人" value="technical_director" />
          </el-select>
        </el-form-item>

        <el-form-item label="是否必需">
          <el-switch v-model="formData.required" />
          <el-text type="info" size="small" style="margin-left: 12px">
            必需级别不能跳过
          </el-text>
        </el-form-item>

        <el-form-item label="自动分配">
          <el-switch v-model="formData.autoAssign" />
          <el-text type="info" size="small" style="margin-left: 12px">
            根据规则自动分配审核人
          </el-text>
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
import { Plus, Rank, Document, InfoFilled, User, Check } from '@element-plus/icons-vue'
import { useWorkflowStore, type AuditLevel } from '@/stores/workflow'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import draggable from 'vuedraggable'

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

const workflowStore = useWorkflowStore()

// 状态
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const isEditing = ref(false)
const editingIndex = ref(-1)
const levels = ref<AuditLevel[]>([])

// 表单
const formRef = ref<FormInstance>()
const formData = ref({
  id: '',
  order: 0,
  name: '',
  description: '',
  role: '',
  roleName: '',
  required: true,
  autoAssign: false
})

// 表单验证规则
const formRules: FormRules = {
  name: [
    { required: true, message: '请输入级别名称', trigger: 'blur' },
    { min: 1, max: 50, message: '长度在 1 到 50 个字符', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择审核角色', trigger: 'change' }
  ]
}

// 角色名称映射
const roleNames: Record<string, string> = {
  auditor: '审核员',
  senior_auditor: '高级审核员',
  audit_supervisor: '审核主管',
  quality_manager: '质量经理',
  technical_director: '技术负责人'
}

// 加载流程配置
const loadWorkflowConfig = async () => {
  loading.value = true
  try {
    await workflowStore.fetchConfigs(true)
    
    // 获取当前配置的级别列表
    if (workflowStore.currentConfig) {
      levels.value = [...workflowStore.currentConfig.levels].sort((a, b) => a.order - b.order)
    } else if (workflowStore.activeConfigs.length > 0) {
      levels.value = [...workflowStore.activeConfigs[0].levels].sort((a, b) => a.order - b.order)
    }
  } catch (error) {
    ElMessage.error('加载流程配置失败')
  } finally {
    loading.value = false
  }
}

// 添加审核级别
const handleAddLevel = () => {
  isEditing.value = false
  editingIndex.value = -1
  formData.value = {
    id: '',
    order: levels.value.length + 1,
    name: '',
    description: '',
    role: '',
    roleName: '',
    required: true,
    autoAssign: false
  }
  dialogVisible.value = true
}

// 编辑审核级别
const handleEditLevel = (level: AuditLevel, index: number) => {
  isEditing.value = true
  editingIndex.value = index
  formData.value = {
    id: level.id,
    order: level.order,
    name: level.name,
    description: level.description || '',
    role: level.role,
    roleName: level.roleName || '',
    required: level.required,
    autoAssign: level.autoAssign
  }
  dialogVisible.value = true
}

// 删除审核级别
const handleDeleteLevel = async (index: number) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除"${levels.value[index].name}"吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    levels.value.splice(index, 1)
    
    // 重新排序
    levels.value.forEach((level, idx) => {
      level.order = idx + 1
    })

    await saveWorkflowConfig()
    ElMessage.success('删除成功')
    emit('change')
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 拖拽结束
const handleDragEnd = async () => {
  // 重新排序
  levels.value.forEach((level, index) => {
    level.order = index + 1
  })

  await saveWorkflowConfig()
  ElMessage.success('顺序已更新')
  emit('change')
}

// 保存审核级别
const handleSave = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch (error) {
    return
  }

  saving.value = true

  try {
    const levelData: AuditLevel = {
      id: formData.value.id || `level_${Date.now()}`,
      order: formData.value.order,
      name: formData.value.name,
      description: formData.value.description,
      role: formData.value.role,
      roleName: roleNames[formData.value.role] || formData.value.role,
      required: formData.value.required,
      autoAssign: formData.value.autoAssign,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    if (isEditing.value && editingIndex.value >= 0) {
      levels.value[editingIndex.value] = levelData
      ElMessage.success('更新成功')
    } else {
      levels.value.push(levelData)
      ElMessage.success('添加成功')
    }

    await saveWorkflowConfig()
    dialogVisible.value = false
    emit('change')
  } catch (error) {
    ElMessage.error(isEditing.value ? '更新失败' : '添加失败')
  } finally {
    saving.value = false
  }
}

// 保存流程配置
const saveWorkflowConfig = async () => {
  // 验证至少有一个级别
  if (levels.value.length === 0) {
    throw new Error('至少需要一个审核级别')
  }

  // 验证每个级别都有审核人
  const invalidLevel = levels.value.find(level => !level.role)
  if (invalidLevel) {
    throw new Error(`级别"${invalidLevel.name}"未指定审核角色`)
  }

  // 更新当前配置
  if (workflowStore.currentConfig) {
    await workflowStore.updateConfig(workflowStore.currentConfig.id, {
      levels: levels.value
    })
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadWorkflowConfig()
})

// 暴露方法给父组件
defineExpose({
  refresh: loadWorkflowConfig,
  validate: async () => {
    if (levels.value.length === 0) {
      ElMessage.error('至少需要一个审核级别')
      return false
    }
    
    const invalidLevel = levels.value.find(level => !level.role)
    if (invalidLevel) {
      ElMessage.error(`级别"${invalidLevel.name}"未指定审核角色`)
      return false
    }
    
    return true
  }
})
</script>

<style scoped>
.workflow-config-manager {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.levels-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 200px;
}

.level-card {
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 16px;
  transition: all 0.3s;
}

.level-card:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.level-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.level-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.drag-handle {
  cursor: move;
  color: var(--el-text-color-secondary);
}

.drag-handle:hover {
  color: var(--el-color-primary);
}

.level-order {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.level-actions {
  display: flex;
  gap: 8px;
}

.level-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.level-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.level-info .el-icon {
  color: var(--el-text-color-secondary);
}

.info-label {
  color: var(--el-text-color-secondary);
}

.info-value {
  color: var(--el-text-color-primary);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .level-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .level-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
