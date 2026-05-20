<template>
  <div class="method-editor">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>{{ pageTitle }}</span>
          <div class="header-actions">
            <el-button v-if="!isViewMode" type="primary" @click="handleSave" :loading="saving">
              <el-icon><Check /></el-icon>
              保存
            </el-button>
            <el-button @click="goBack">返回</el-button>
          </div>
        </div>
      </template>

      <div class="content" v-loading="loading">
        <el-form
          ref="formRef"
          :model="formData"
          :rules="formRules"
          label-width="120px"
          :disabled="isViewMode"
        >
          <!-- 基本信息 -->
          <el-card class="section-card" shadow="never">
            <template #header>
              <span class="section-title">基本信息</span>
            </template>
            
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="方法编号" prop="code">
                  <el-input v-model="formData.code" placeholder="请输入方法编号" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="方法名称" prop="name">
                  <el-input v-model="formData.name" placeholder="请输入方法名称" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="检测类别" prop="category">
                  <el-select v-model="formData.category" placeholder="请选择检测类别" style="width: 100%">
                    <el-option label="水质检测" value="水质检测" />
                    <el-option label="土壤检测" value="土壤检测" />
                    <el-option label="空气检测" value="空气检测" />
                    <el-option label="食品检测" value="食品检测" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="版本号" prop="version">
                  <el-input v-model="formData.version" placeholder="请输入版本号" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="状态" prop="status">
                  <el-select v-model="formData.status" placeholder="请选择状态" style="width: 100%">
                    <el-option label="草稿" value="DRAFT" />
                    <el-option label="有效" value="ACTIVE" />
                    <el-option label="已归档" value="ARCHIVED" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="适用范围">
                  <el-input v-model="formData.scope" placeholder="请输入适用范围" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="方法描述">
              <el-input
                v-model="formData.description"
                type="textarea"
                :rows="3"
                placeholder="请输入方法描述"
              />
            </el-form-item>
          </el-card>

          <!-- 检测设备 -->
          <el-card class="section-card" shadow="never">
            <template #header>
              <div class="section-header">
                <span class="section-title">检测设备</span>
                <el-button v-if="!isViewMode" size="small" type="primary" @click="handleAddEquipment">
                  <el-icon><Plus /></el-icon>
                  添加设备
                </el-button>
              </div>
            </template>

            <el-table :data="formData.equipment" style="width: 100%">
              <el-table-column prop="name" label="设备名称" />
              <el-table-column prop="model" label="设备型号" />
              <el-table-column prop="accuracy" label="精度要求" />
              <el-table-column prop="calibration" label="校准要求" />
              <el-table-column v-if="!isViewMode" label="操作" width="100">
                <template #default="{ $index }">
                  <el-button
                    size="small"
                    type="danger"
                    @click="handleRemoveEquipment($index)"
                  >
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>

          <!-- 检测步骤 -->
          <el-card class="section-card" shadow="never">
            <template #header>
              <div class="section-header">
                <span class="section-title">检测步骤</span>
                <el-button v-if="!isViewMode" size="small" type="primary" @click="handleAddStep">
                  <el-icon><Plus /></el-icon>
                  添加步骤
                </el-button>
              </div>
            </template>

            <div class="steps-container">
              <div
                v-for="(step, index) in formData.steps"
                :key="index"
                class="step-item"
              >
                <div class="step-number">{{ index + 1 }}</div>
                <div class="step-content">
                  <el-input
                    v-if="!isViewMode"
                    v-model="step.title"
                    placeholder="请输入步骤标题"
                    class="step-title"
                  />
                  <div v-else class="step-title-view">{{ step.title }}</div>
                  
                  <el-input
                    v-if="!isViewMode"
                    v-model="step.description"
                    type="textarea"
                    :rows="2"
                    placeholder="请输入步骤描述"
                    class="step-description"
                  />
                  <div v-else class="step-description-view">{{ step.description }}</div>
                </div>
                <div v-if="!isViewMode" class="step-actions">
                  <el-button
                    size="small"
                    type="danger"
                    @click="handleRemoveStep(index)"
                  >
                    删除
                  </el-button>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 质量控制 -->
          <el-card class="section-card" shadow="never">
            <template #header>
              <span class="section-title">质量控制</span>
            </template>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="精密度要求">
                  <el-input v-model="formData.precision" placeholder="请输入精密度要求" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="准确度要求">
                  <el-input v-model="formData.accuracy" placeholder="请输入准确度要求" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="检出限">
                  <el-input v-model="formData.detectionLimit" placeholder="请输入检出限" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="测定范围">
                  <el-input v-model="formData.measurementRange" placeholder="请输入测定范围" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="质控措施">
              <el-input
                v-model="formData.qualityControl"
                type="textarea"
                :rows="3"
                placeholder="请输入质控措施"
              />
            </el-form-item>
          </el-card>

          <!-- 注意事项 -->
          <el-card class="section-card" shadow="never">
            <template #header>
              <span class="section-title">注意事项</span>
            </template>

            <el-form-item label="安全注意事项">
              <el-input
                v-model="formData.safetyNotes"
                type="textarea"
                :rows="3"
                placeholder="请输入安全注意事项"
              />
            </el-form-item>

            <el-form-item label="操作注意事项">
              <el-input
                v-model="formData.operationNotes"
                type="textarea"
                :rows="3"
                placeholder="请输入操作注意事项"
              />
            </el-form-item>
          </el-card>
        </el-form>
      </div>
    </el-card>

    <!-- 添加设备对话框 -->
    <el-dialog
      v-model="equipmentDialogVisible"
      title="添加检测设备"
      width="500px"
    >
      <el-form
        ref="equipmentFormRef"
        :model="equipmentForm"
        :rules="equipmentRules"
        label-width="100px"
      >
        <el-form-item label="设备名称" prop="name">
          <el-input v-model="equipmentForm.name" placeholder="请输入设备名称" />
        </el-form-item>
        <el-form-item label="设备型号" prop="model">
          <el-input v-model="equipmentForm.model" placeholder="请输入设备型号" />
        </el-form-item>
        <el-form-item label="精度要求">
          <el-input v-model="equipmentForm.accuracy" placeholder="请输入精度要求" />
        </el-form-item>
        <el-form-item label="校准要求">
          <el-input v-model="equipmentForm.calibration" placeholder="请输入校准要求" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="equipmentDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmAddEquipment">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Check, Plus } from '@element-plus/icons-vue'
import { methodService } from '@/services/methodService'

// 路由
const route = useRoute()
const router = useRouter()

// 响应式数据
const formRef = ref<FormInstance>()
const equipmentFormRef = ref<FormInstance>()
const loading = ref(false)
const saving = ref(false)
const equipmentDialogVisible = ref(false)

// 判断是否为查看模式
const isViewMode = computed(() => route.query.mode === 'view')
const isEditMode = computed(() => !!route.params.id && !isViewMode.value)
const pageTitle = computed(() => {
  if (isViewMode.value) return '查看检测方法'
  if (isEditMode.value) return '编辑检测方法'
  return '新建检测方法'
})

// 表单数据
const formData = reactive({
  code: '',
  name: '',
  category: '',
  version: 'V1.0',
  status: 'DRAFT',
  scope: '',
  description: '',
  equipment: [] as Array<{
    name: string
    model: string
    accuracy?: string
    calibration?: string
  }>,
  steps: [] as Array<{
    title: string
    description: string
  }>,
  precision: '',
  accuracy: '',
  detectionLimit: '',
  measurementRange: '',
  qualityControl: '',
  safetyNotes: '',
  operationNotes: ''
})

// 设备表单数据
const equipmentForm = reactive({
  name: '',
  model: '',
  accuracy: '',
  calibration: ''
})

// 表单验证规则
const formRules: FormRules = {
  code: [
    { required: true, message: '请输入方法编号', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入方法名称', trigger: 'blur' }
  ],
  category: [
    { required: true, message: '请选择检测类别', trigger: 'change' }
  ],
  version: [
    { required: true, message: '请输入版本号', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ]
}

const equipmentRules: FormRules = {
  name: [
    { required: true, message: '请输入设备名称', trigger: 'blur' }
  ],
  model: [
    { required: true, message: '请输入设备型号', trigger: 'blur' }
  ]
}

// 方法
const loadMethodData = async (id: string) => {
  loading.value = true
  try {
    const method = await methodService.getMethodById(id)
    
    Object.assign(formData, {
      code: method.code,
      name: method.name,
      category: method.category,
      version: method.version,
      status: method.status,
      scope: method.scope || '',
      description: method.description || '',
      equipment: method.equipment || [],
      steps: method.steps || [],
      precision: method.precision || '',
      accuracy: method.accuracy || '',
      detectionLimit: method.detectionLimit || '',
      measurementRange: method.measurementRange || '',
      qualityControl: method.qualityControl || '',
      safetyNotes: method.safetyNotes || '',
      operationNotes: method.operationNotes || ''
    })
  } catch (error) {
    ElMessage.error('加载方法数据失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    saving.value = true
    
    const data = {
      code: formData.code,
      name: formData.name,
      category: formData.category,
      version: formData.version,
      status: formData.status,
      scope: formData.scope,
      description: formData.description,
      equipment: formData.equipment,
      steps: formData.steps,
      precision: formData.precision,
      accuracy: formData.accuracy,
      detectionLimit: formData.detectionLimit,
      measurementRange: formData.measurementRange,
      qualityControl: formData.qualityControl,
      safetyNotes: formData.safetyNotes,
      operationNotes: formData.operationNotes
    }
    
    if (isEditMode.value) {
      await methodService.updateMethod(route.params.id as string, data)
      ElMessage.success('更新成功')
    } else {
      await methodService.createMethod(data)
      ElMessage.success('创建成功')
    }
    
    goBack()
    
  } catch (error) {
    ElMessage.error(isEditMode.value ? '更新失败' : '创建失败')
    console.error('保存失败:', error)
  } finally {
    saving.value = false
  }
}

const handleAddEquipment = () => {
  // 重置表单
  Object.assign(equipmentForm, {
    name: '',
    model: '',
    accuracy: '',
    calibration: ''
  })
  equipmentDialogVisible.value = true
}

const handleConfirmAddEquipment = async () => {
  if (!equipmentFormRef.value) return
  
  try {
    await equipmentFormRef.value.validate()
    
    formData.equipment.push({ ...equipmentForm })
    equipmentDialogVisible.value = false
    ElMessage.success('设备添加成功')
    
  } catch (error) {
    console.error('添加设备失败:', error)
  }
}

const handleRemoveEquipment = (index: number) => {
  formData.equipment.splice(index, 1)
  ElMessage.success('设备删除成功')
}

const handleAddStep = () => {
  formData.steps.push({
    title: '',
    description: ''
  })
}

const handleRemoveStep = (index: number) => {
  formData.steps.splice(index, 1)
  ElMessage.success('步骤删除成功')
}

const goBack = () => {
  router.back()
}

// 生命周期
onMounted(() => {
  const id = route.params.id as string
  if (id) {
    loadMethodData(id)
  }
})
</script>

<style scoped>
.method-editor {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.content {
  max-width: 1200px;
}

.section-card {
  margin-bottom: 20px;
}

.section-card :deep(.el-card__body) {
  padding: 20px;
}

.section-title {
  font-weight: 600;
  font-size: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.steps-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background-color: #fafafa;
}

.step-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #409eff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
  margin-top: 4px;
}

.step-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step-title {
  font-weight: 500;
}

.step-title-view {
  font-weight: 500;
  font-size: 14px;
  color: #303133;
}

.step-description-view {
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}

.step-actions {
  display: flex;
  align-items: flex-start;
  margin-top: 4px;
}
</style>
