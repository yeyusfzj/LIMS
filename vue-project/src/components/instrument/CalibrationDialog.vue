<template>
  <el-dialog
    v-model="dialogVisible"
    title="添加校准记录"
    width="600px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="120px"
    >
      <el-form-item label="校准日期" prop="calibrationDate">
        <el-date-picker
          v-model="formData.calibrationDate"
          type="date"
          placeholder="请选择校准日期"
          style="width: 100%"
          value-format="YYYY-MM-DD"
        />
      </el-form-item>
      
      <el-form-item label="校准机构" prop="calibrationOrg">
        <el-input v-model="formData.calibrationOrg" placeholder="请输入校准机构" />
      </el-form-item>
      
      <el-form-item label="证书编号" prop="certificateNumber">
        <el-input v-model="formData.certificateNumber" placeholder="请输入证书编号" />
      </el-form-item>
      
      <el-form-item label="校准结果" prop="calibrationResult">
        <el-select v-model="formData.calibrationResult" placeholder="请选择校准结果" style="width: 100%">
          <el-option
            v-for="(label, value) in CalibrationResultLabels"
            :key="value"
            :label="label"
            :value="value"
          />
        </el-select>
      </el-form-item>
      
      <el-form-item label="下次校准日期" prop="nextCalibrationDate">
        <el-date-picker
          v-model="formData.nextCalibrationDate"
          type="date"
          placeholder="请选择下次校准日期"
          style="width: 100%"
          value-format="YYYY-MM-DD"
        />
      </el-form-item>
      
      <el-form-item label="备注" prop="remarks">
        <el-input
          v-model="formData.remarks"
          type="textarea"
          :rows="2"
          placeholder="请输入备注"
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
import { CalibrationResultLabels, type CreateCalibrationDto } from '@/types/instrument'

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

const formData = reactive<CreateCalibrationDto>({
  calibrationDate: '',
  calibrationOrg: '',
  certificateNumber: '',
  calibrationResult: 'QUALIFIED' as any,
  nextCalibrationDate: undefined,
  remarks: ''
})

const formRules: FormRules = {
  calibrationDate: [{ required: true, message: '请选择校准日期', trigger: 'change' }],
  calibrationOrg: [{ required: true, message: '请输入校准机构', trigger: 'blur' }],
  calibrationResult: [{ required: true, message: '请选择校准结果', trigger: 'change' }]
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
    
    await instrumentStore.createCalibration(props.instrumentId, formData)
    
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
