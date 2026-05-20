<template>
  <el-dialog
    v-model="dialogVisible"
    title="样品合样"
    width="900px"
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
      <!-- 选择要合并的样品 -->
      <el-form-item label="选择样品" prop="selectedSamples">
        <el-transfer
          v-model="formData.selectedSamples"
          :data="availableSamples"
          :titles="['可选样品', '已选样品']"
          :button-texts="['移除', '添加']"
          :props="{
            key: 'id',
            label: 'displayName'
          }"
          filterable
          :filter-method="filterMethod"
          filter-placeholder="搜索样品名称或条码"
          style="width: 100%"
        >
          <template #default="{ option }">
            <div class="transfer-item">
              <div class="item-name">{{ option.name }}</div>
              <div class="item-info">
                <el-tag size="small" type="info">{{ option.barcode }}</el-tag>
                <span class="item-quantity">{{ option.quantity }} {{ option.unit }}</span>
              </div>
            </div>
          </template>
        </el-transfer>
        <div style="color: #909399; font-size: 12px; margin-top: 10px">
          请至少选择 2 个样品进行合样
        </div>
      </el-form-item>

      <!-- 合并样品信息 -->
      <el-divider content-position="left">合并样品信息</el-divider>

      <el-form-item label="合并样品名称" prop="mergedName">
        <el-input
          v-model="formData.mergedName"
          placeholder="请输入合并后的样品名称"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="样品类型" prop="sampleType">
        <el-select
          v-model="formData.sampleType"
          placeholder="请选择样品类型"
          style="width: 100%"
        >
          <el-option
            v-for="type in sampleTypeOptions"
            :key="type.value"
            :label="type.label"
            :value="type.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="合样说明" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="3"
          placeholder="请输入合样说明"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <!-- 合并后预览 -->
      <el-alert
        v-if="mergedPreview"
        title="合并后预览"
        type="success"
        :closable="false"
        style="margin-top: 15px"
      >
        <div style="margin-top: 10px">
          <p><strong>样品名称：</strong>{{ mergedPreview.name }}</p>
          <p><strong>条码：</strong><el-tag size="small">{{ mergedPreview.barcode }}</el-tag></p>
          <p><strong>总数量：</strong>{{ mergedPreview.totalQuantity }} {{ mergedPreview.unit }}</p>
          <p><strong>来源样品：</strong>{{ mergedPreview.sourceCount }} 个</p>
        </div>
      </el-alert>

      <!-- 来源样品列表 -->
      <el-divider content-position="left">来源样品列表</el-divider>

      <el-table
        :data="selectedSamplesList"
        border
        style="width: 100%"
        max-height="250"
      >
        <el-table-column
          type="index"
          label="序号"
          width="60"
          align="center"
        />
        <el-table-column
          prop="name"
          label="样品名称"
          min-width="150"
        />
        <el-table-column
          prop="barcode"
          label="条码"
          min-width="150"
        >
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ row.barcode }}</el-tag>
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
        <el-table-column
          prop="currentLocation"
          label="当前位置"
          width="120"
          align="center"
        />
      </el-table>

      <el-alert
        v-if="selectedSamplesList.length > 0"
        type="warning"
        :closable="false"
        style="margin-top: 15px"
      >
        <template #title>
          <div style="font-size: 13px">
            <i class="el-icon-warning-outline"></i>
            合样后，来源样品状态将更新，新样品将记录所有来源样品信息
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
          :disabled="formData.selectedSamples.length < 2"
          @click="handleSubmit"
        >
          确认合样
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
  samples?: Sample[]
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  samples: () => []
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'success': [data: MergeResult]
}>()

// 接口定义
interface MergeFormData {
  selectedSamples: string[]
  mergedName: string
  sampleType: string
  description: string
}

interface TransferOption {
  id: string
  name: string
  barcode: string
  quantity: number
  unit: string
  displayName: string
  currentLocation: string
}

interface MergedPreview {
  name: string
  barcode: string
  totalQuantity: number
  unit: string
  sourceCount: number
}

interface MergeResult {
  selectedSamples: string[]
  mergedName: string
  sampleType: string
  description: string
  mergedSample: MergedPreview
}

// 状态
const dialogVisible = ref(props.modelValue)
const formRef = ref<FormInstance>()
const submitting = ref(false)

// 表单数据
const formData = reactive<MergeFormData>({
  selectedSamples: [],
  mergedName: '',
  sampleType: '',
  description: ''
})

// 样品类型选项（模拟数据）
const sampleTypeOptions = ref([
  { label: '水样', value: '水样' },
  { label: '土壤样', value: '土壤样' },
  { label: '气体样', value: '气体样' },
  { label: '固体样', value: '固体样' },
  { label: '混合样', value: '混合样' },
  { label: '其他', value: '其他' }
])

// 验证规则
const rules: FormRules = {
  selectedSamples: [
    {
      type: 'array',
      required: true,
      min: 2,
      message: '请至少选择 2 个样品',
      trigger: 'change'
    }
  ],
  mergedName: [
    { required: true, message: '请输入合并样品名称', trigger: 'blur' },
    { min: 2, max: 100, message: '样品名称长度在 2 到 100 个字符', trigger: 'blur' }
  ],
  sampleType: [
    { required: true, message: '请选择样品类型', trigger: 'change' }
  ],
  description: [
    { required: true, message: '请输入合样说明', trigger: 'blur' },
    { min: 2, max: 200, message: '合样说明长度在 2 到 200 个字符', trigger: 'blur' }
  ]
}

// 可选样品列表（转换为 Transfer 组件需要的格式）
const availableSamples = computed<TransferOption[]>(() => {
  return props.samples.map(sample => ({
    id: sample.id,
    name: sample.name,
    barcode: sample.barcode,
    quantity: sample.quantity,
    unit: sample.unit,
    displayName: `${sample.name} (${sample.barcode})`,
    currentLocation: sample.currentLocation
  }))
})

// 已选样品列表
const selectedSamplesList = computed(() => {
  return availableSamples.value.filter(sample =>
    formData.selectedSamples.includes(sample.id)
  )
})

// 合并后预览
const mergedPreview = computed<MergedPreview | null>(() => {
  if (selectedSamplesList.value.length < 2 || !formData.mergedName) {
    return null
  }

  // 计算总数量（假设单位相同）
  const totalQuantity = selectedSamplesList.value.reduce(
    (sum, sample) => sum + sample.quantity,
    0
  )
  const unit = selectedSamplesList.value[0]?.unit || ''

  // 生成条码
  const timestamp = Date.now().toString().slice(-8)
  const barcode = `MRG-${timestamp}`

  return {
    name: formData.mergedName,
    barcode,
    totalQuantity: Math.floor(totalQuantity * 100) / 100,
    unit,
    sourceCount: selectedSamplesList.value.length
  }
})

// 监听 modelValue 变化
watch(() => props.modelValue, (val) => {
  dialogVisible.value = val
})

watch(dialogVisible, (val) => {
  emit('update:modelValue', val)
})

// Transfer 过滤方法
const filterMethod = (query: string, item: TransferOption) => {
  return (
    item.name.toLowerCase().includes(query.toLowerCase()) ||
    item.barcode.toLowerCase().includes(query.toLowerCase())
  )
}

// 方法
const handleClose = () => {
  dialogVisible.value = false
  resetForm()
}

const resetForm = () => {
  formRef.value?.resetFields()
  formData.selectedSamples = []
  formData.mergedName = ''
  formData.sampleType = ''
  formData.description = ''
}

const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    
    if (!mergedPreview.value) {
      ElMessage.warning('请完善合并样品信息')
      return
    }

    submitting.value = true

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 构建提交数据
    const submitData: MergeResult = {
      selectedSamples: formData.selectedSamples,
      mergedName: formData.mergedName,
      sampleType: formData.sampleType,
      description: formData.description,
      mergedSample: mergedPreview.value
    }

    ElMessage.success(`成功合并 ${formData.selectedSamples.length} 个样品`)
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
:deep(.el-transfer) {
  display: flex;
  justify-content: center;
}

:deep(.el-transfer-panel) {
  width: 45%;
}

:deep(.el-divider__text) {
  font-size: 14px;
  color: #909399;
}

:deep(.el-alert__title) {
  font-size: 14px;
}

.transfer-item {
  display: flex;
  flex-direction: column;
  padding: 5px 0;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 5px;
}

.item-info {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #909399;
}

.item-quantity {
  margin-left: 5px;
}

p {
  margin: 5px 0;
  font-size: 13px;
  line-height: 1.6;
}
</style>
