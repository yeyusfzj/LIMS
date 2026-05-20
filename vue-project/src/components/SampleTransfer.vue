<template>
  <el-dialog
    v-model="dialogVisible"
    title="样品流转"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="100px"
      @submit.prevent="handleSubmit"
    >
      <!-- 当前位置（只读） -->
      <el-form-item label="当前位置">
        <el-input :model-value="currentLocation" disabled />
      </el-form-item>

      <!-- 目标位置 -->
      <el-form-item label="目标位置" prop="toLocation">
        <el-select
          v-model="formData.toLocation"
          placeholder="请选择目标位置"
          style="width: 100%"
          filterable
        >
          <el-option
            v-for="location in locationOptions"
            :key="location.value"
            :label="location.label"
            :value="location.value"
          />
        </el-select>
      </el-form-item>

      <!-- 接收人 -->
      <el-form-item label="接收人" prop="receiver">
        <el-select
          v-model="formData.receiver"
          placeholder="请选择接收人"
          style="width: 100%"
          filterable
        >
          <el-option
            v-for="user in userOptions"
            :key="user.value"
            :label="user.label"
            :value="user.value"
          />
        </el-select>
      </el-form-item>

      <!-- 流转原因 -->
      <el-form-item label="流转原因" prop="transferReason">
        <el-input
          v-model="formData.transferReason"
          type="textarea"
          :rows="3"
          placeholder="请输入流转原因"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <!-- 保存条件 -->
      <el-divider content-position="left">保存条件（可选）</el-divider>

      <el-form-item label="温度">
        <el-input-number
          v-model="formData.storageConditions.temperature"
          :precision="1"
          :step="0.5"
          placeholder="温度"
          style="width: 100%"
        >
          <template #append>°C</template>
        </el-input-number>
      </el-form-item>

      <el-form-item label="湿度">
        <el-input-number
          v-model="formData.storageConditions.humidity"
          :min="0"
          :max="100"
          :precision="0"
          placeholder="湿度"
          style="width: 100%"
        >
          <template #append>%</template>
        </el-input-number>
      </el-form-item>

      <el-form-item label="特殊要求">
        <el-input
          v-model="formData.storageConditions.specialRequirements"
          type="textarea"
          :rows="2"
          placeholder="请输入特殊保存要求"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-space>
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">
          确认流转
        </el-button>
      </el-space>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

// Props
interface Props {
  modelValue: boolean
  sampleId?: string
  currentLocation?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  currentLocation: ''
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'success': [data: TransferFormData]
}>()

// 接口定义
interface TransferFormData {
  toLocation: string
  receiver: string
  transferReason: string
  storageConditions: {
    temperature?: number
    humidity?: number
    specialRequirements?: string
  }
}

// 状态
const dialogVisible = ref(props.modelValue)
const formRef = ref<FormInstance>()
const submitting = ref(false)

// 表单数据
const formData = reactive<TransferFormData>({
  toLocation: '',
  receiver: '',
  transferReason: '',
  storageConditions: {
    temperature: undefined,
    humidity: undefined,
    specialRequirements: ''
  }
})

// 验证规则
const rules: FormRules = {
  toLocation: [
    { required: true, message: '请选择目标位置', trigger: 'change' }
  ],
  receiver: [
    { required: true, message: '请选择接收人', trigger: 'change' }
  ],
  transferReason: [
    { required: true, message: '请输入流转原因', trigger: 'blur' },
    { min: 2, max: 200, message: '流转原因长度在 2 到 200 个字符', trigger: 'blur' }
  ]
}

// 位置选项（模拟数据）
const locationOptions = ref([
  { label: '接收室', value: '接收室' },
  { label: '前处理室', value: '前处理室' },
  { label: '检测室', value: '检测室' },
  { label: '样品库', value: '样品库' },
  { label: '留样室', value: '留样室' },
  { label: '废弃物处理室', value: '废弃物处理室' }
])

// 用户选项（模拟数据）
const userOptions = ref([
  { label: '张三', value: 'user001' },
  { label: '李四', value: 'user002' },
  { label: '王五', value: 'user003' },
  { label: '赵六', value: 'user004' },
  { label: '孙七', value: 'user005' }
])

// 监听 modelValue 变化
watch(() => props.modelValue, (val) => {
  dialogVisible.value = val
})

watch(dialogVisible, (val) => {
  emit('update:modelValue', val)
})

// 方法
const handleClose = () => {
  dialogVisible.value = false
  resetForm()
}

const resetForm = () => {
  formRef.value?.resetFields()
  formData.toLocation = ''
  formData.receiver = ''
  formData.transferReason = ''
  formData.storageConditions = {
    temperature: undefined,
    humidity: undefined,
    specialRequirements: ''
  }
}

const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    
    submitting.value = true

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 构建提交数据
    const submitData: TransferFormData = {
      toLocation: formData.toLocation,
      receiver: formData.receiver,
      transferReason: formData.transferReason,
      storageConditions: {
        temperature: formData.storageConditions.temperature,
        humidity: formData.storageConditions.humidity,
        specialRequirements: formData.storageConditions.specialRequirements
      }
    }

    ElMessage.success('样品流转成功')
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
</style>
