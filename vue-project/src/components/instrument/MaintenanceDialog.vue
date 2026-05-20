<template>
  <el-dialog
    v-model="dialogVisible"
    title="添加维护记录"
    width="600px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="120px"
    >
      <el-form-item label="维护日期" prop="maintenanceDate">
        <el-date-picker
          v-model="formData.maintenanceDate"
          type="date"
          placeholder="请选择维护日期"
          style="width: 100%"
          value-format="YYYY-MM-DD"
        />
      </el-form-item>
      
      <el-form-item label="维护类型" prop="maintenanceType">
        <el-select v-model="formData.maintenanceType" placeholder="请选择维护类型" style="width: 100%">
          <el-option
            v-for="(label, value) in MaintenanceTypeLabels"
            :key="value"
            :label="label"
            :value="value"
          />
        </el-select>
      </el-form-item>
      
      <el-form-item label="维护内容" prop="maintenanceContent">
        <el-input
          v-model="formData.maintenanceContent"
          type="textarea"
          :rows="3"
          placeholder="请输入维护内容"
        />
      </el-form-item>
      
      <el-form-item label="维护人员" prop="maintenancePerson">
        <el-input v-model="formData.maintenancePerson" placeholder="请输入维护人员" />
      </el-form-item>
      
      <el-form-item label="维护费用" prop="maintenanceCost">
        <el-input v-model.number="formData.maintenanceCost" type="number" placeholder="请输入维护费用">
          <template #append>元</template>
        </el-input>
      </el-form-item>
      
      <el-form-item label="下次维护日期" prop="nextMaintenanceDate">
        <el-date-picker
          v-model="formData.nextMaintenanceDate"
          type="date"
          placeholder="请选择下次维护日期"
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
import { MaintenanceTypeLabels, type CreateMaintenanceDto } from '@/types/instrument'

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

const formData = reactive<CreateMaintenanceDto>({
  maintenanceDate: '',
  maintenanceType: 'ROUTINE' as any,
  maintenanceContent: '',
  maintenancePerson: '',
  maintenanceCost: undefined,
  nextMaintenanceDate: undefined,
  remarks: ''
})

const formRules: FormRules = {
  maintenanceDate: [{ required: true, message: '请选择维护日期', trigger: 'change' }],
  maintenanceType: [{ required: true, message: '请选择维护类型', trigger: 'change' }],
  maintenanceContent: [{ required: true, message: '请输入维护内容', trigger: 'blur' }],
  maintenancePerson: [{ required: true, message: '请输入维护人员', trigger: 'blur' }]
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
    
    await instrumentStore.createMaintenance(props.instrumentId, formData)
    
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
