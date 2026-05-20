<template>
  <el-dialog
    v-model="dialogVisible"
    title="创建报废申请"
    width="600px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="120px"
    >
      <el-form-item label="报废原因" prop="disposalReason">
        <el-input
          v-model="formData.disposalReason"
          type="textarea"
          :rows="5"
          placeholder="请输入报废原因"
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">
        提交
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useInstrumentStore } from '@/stores/instrument'
import type { CreateDisposalDto } from '@/types/instrument'

interface Props {
  modelValue: boolean
  instrumentId: string
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const instrumentStore = useInstrumentStore()
const formRef = ref<FormInstance>()
const submitting = ref(false)

const dialogVisible = ref(props.modelValue)

const formData = reactive<CreateDisposalDto>({
  disposalReason: ''
})

const formRules: FormRules = {
  disposalReason: [{ required: true, message: '请输入报废原因', trigger: 'blur' }]
}

watch(() => props.modelValue, (val) => {
  dialogVisible.value = val
})

watch(dialogVisible, (val) => {
  emit('update:modelValue', val)
})

const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    submitting.value = true
    
    await instrumentStore.createDisposal(props.instrumentId, formData)
    
    emit('success')
    handleClose()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '提交失败')
    }
  } finally {
    submitting.value = false
  }
}

const handleClose = () => {
  formRef.value?.resetFields()
  dialogVisible.value = false
}
</script>
