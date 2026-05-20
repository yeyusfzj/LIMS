<template>
  <el-dialog
    v-model="dialogVisible"
    title="样品分样"
    width="700px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="120px"
      @submit.prevent="handleSubmit"
    >
      <!-- 母样品信息 -->
      <el-alert
        title="母样品信息"
        type="info"
        :closable="false"
        style="margin-bottom: 20px"
      >
        <div style="margin-top: 10px">
          <p><strong>样品名称：</strong>{{ sampleInfo?.name || '-' }}</p>
          <p><strong>样品条码：</strong>{{ sampleInfo?.barcode || '-' }}</p>
          <p><strong>当前数量：</strong>{{ sampleInfo?.quantity || 0 }} {{ sampleInfo?.unit || '' }}</p>
        </div>
      </el-alert>

      <!-- 子样品数量 -->
      <el-form-item label="子样品数量" prop="count">
        <el-input-number
          v-model="formData.count"
          :min="2"
          :max="20"
          :step="1"
          placeholder="请输入子样品数量"
          style="width: 100%"
          @change="generateSubSamples"
        />
        <div style="color: #909399; font-size: 12px; margin-top: 5px">
          将母样品分为 {{ formData.count }} 个子样品
        </div>
      </el-form-item>

      <!-- 分样说明 -->
      <el-form-item label="分样说明" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="请输入分样说明（可选）"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <!-- 子样品信息预览 -->
      <el-divider content-position="left">子样品信息预览</el-divider>

      <el-table
        :data="subSamplePreview"
        border
        style="width: 100%"
        max-height="300"
      >
        <el-table-column
          prop="index"
          label="序号"
          width="80"
          align="center"
        />
        <el-table-column
          prop="name"
          label="子样品名称"
          min-width="150"
        />
        <el-table-column
          prop="barcode"
          label="条码（自动生成）"
          min-width="150"
        >
          <template #default="{ row }">
            <el-tag size="small">{{ row.barcode }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column
          prop="quantity"
          label="数量"
          width="120"
          align="center"
        >
          <template #default="{ row }">
            {{ row.quantity }} {{ row.unit }}
          </template>
        </el-table-column>
      </el-table>

      <el-alert
        v-if="subSamplePreview.length > 0"
        type="warning"
        :closable="false"
        style="margin-top: 15px"
      >
        <template #title>
          <div style="font-size: 13px">
            <i class="el-icon-warning-outline"></i>
            分样后，母样品状态将更新，子样品将继承母样品的基本信息
          </div>
        </template>
      </el-alert>
    </el-form>

    <template #footer>
      <el-space>
        <el-button @click="handleClose">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="subSamplePreview.length === 0"
          @click="handleSubmit"
        >
          确认分样
        </el-button>
      </el-space>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import type { Sample } from '@/types'

// Props
interface Props {
  modelValue: boolean
  sampleInfo?: Sample
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'success': [data: SplitResult]
}>()

// 接口定义
interface SplitFormData {
  count: number
  description: string
}

interface SubSamplePreview {
  index: number
  name: string
  barcode: string
  quantity: number
  unit: string
}

interface SplitResult {
  count: number
  description: string
  subSamples: SubSamplePreview[]
}

// 状态
const dialogVisible = ref(props.modelValue)
const formRef = ref<FormInstance>()
const submitting = ref(false)

// 表单数据
const formData = reactive<SplitFormData>({
  count: 2,
  description: ''
})

// 子样品预览数据
const subSamplePreview = ref<SubSamplePreview[]>([])

// 验证规则
const rules: FormRules = {
  count: [
    { required: true, message: '请输入子样品数量', trigger: 'change' },
    { type: 'number', min: 2, max: 20, message: '子样品数量应在 2 到 20 之间', trigger: 'change' }
  ]
}

// 监听 modelValue 变化
watch(() => props.modelValue, (val) => {
  dialogVisible.value = val
  if (val) {
    // 对话框打开时生成预览
    generateSubSamples()
  }
})

watch(dialogVisible, (val) => {
  emit('update:modelValue', val)
})

// 生成条码（模拟）
const generateBarcode = (parentBarcode: string, index: number): string => {
  const timestamp = Date.now().toString().slice(-6)
  return `${parentBarcode}-${index.toString().padStart(2, '0')}-${timestamp}`
}

// 生成子样品预览
const generateSubSamples = () => {
  if (!props.sampleInfo || formData.count < 2) {
    subSamplePreview.value = []
    return
  }

  const parentSample = props.sampleInfo
  const avgQuantity = Math.floor((parentSample.quantity / formData.count) * 100) / 100

  subSamplePreview.value = Array.from({ length: formData.count }, (_, i) => ({
    index: i + 1,
    name: `${parentSample.name}-子样品${i + 1}`,
    barcode: generateBarcode(parentSample.barcode, i + 1),
    quantity: avgQuantity,
    unit: parentSample.unit
  }))
}

// 方法
const handleClose = () => {
  dialogVisible.value = false
  resetForm()
}

const resetForm = () => {
  formRef.value?.resetFields()
  formData.count = 2
  formData.description = ''
  subSamplePreview.value = []
}

const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    
    if (subSamplePreview.value.length === 0) {
      ElMessage.warning('请先生成子样品预览')
      return
    }

    submitting.value = true

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 构建提交数据
    const submitData: SplitResult = {
      count: formData.count,
      description: formData.description,
      subSamples: subSamplePreview.value
    }

    ElMessage.success(`成功分样为 ${formData.count} 个子样品`)
    emit('success', submitData)
    handleClose()
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
:deep(.el-input-number) {
  width: 100%;
}

:deep(.el-divider__text) {
  font-size: 14px;
  color: #909399;
}

:deep(.el-alert__title) {
  font-size: 14px;
}

p {
  margin: 5px 0;
  font-size: 13px;
  line-height: 1.6;
}
</style>
