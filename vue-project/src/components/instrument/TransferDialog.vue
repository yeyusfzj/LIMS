<template>
  <el-dialog
    v-model="dialogVisible"
    title="创建流转申请"
    width="600px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="120px"
    >
      <el-form-item label="源部门" prop="fromDepartment">
        <el-input v-model="formData.fromDepartment" placeholder="请输入源部门" />
      </el-form-item>
      
      <el-form-item label="目标部门" prop="toDepartment">
        <el-input v-model="formData.toDepartment" placeholder="请输入目标部门" />
      </el-form-item>
      
      <el-form-item label="源负责人" prop="fromResponsible">
        <el-input v-model="formData.fromResponsible" placeholder="请输入源负责人" />
      </el-form-item>
      
      <el-form-item label="目标负责人" prop="toResponsible">
        <el-input v-model="formData.toResponsible" placeholder="请输入目标负责人" />
      </el-form-item>
      
      <el-form-item label="流转原因" prop="transferReason">
        <el-input
          v-model="formData.transferReason"
          type="textarea"
          :rows="3"
          placeholder="请输入流转原因"
        />
      </el-form-item>
      
      <el-form-item label="预计归还日期" prop="expectedReturnDate">
        <el-date-picker
          v-model="formData.expectedReturnDate"
          type="date"
          placeholder="请选择预计归还日期"
          style="width: 100%"
          value-format="YYYY-MM-DD"
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
import type { CreateTransferDto } from '@/types/instrument'

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

const formData = reactive<CreateTransferDto>({
  fromDepartment: '',
  toDepartment: '',
  fromResponsible: '',
  toResponsible: '',
  transferReason: '',
  expectedReturnDate: undefined
})

const formRules: FormRules = {
  fromDepartment: [{ required: true, message: '请输入源部门', trigger: 'blur' }],
  toDepartment: [{ required: true, message: '请输入目标部门', trigger: 'blur' }],
  fromResponsible: [{ required: true, message: '请输入源负责人', trigger: 'blur' }],
  toResponsible: [{ required: true, message: '请输入目标负责人', trigger: 'blur' }]
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
    
    await instrumentStore.createTransfer(props.instrumentId, formData)
    
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
