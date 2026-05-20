<template>
  <el-dialog
    :model-value="modelValue"
    title="报告回收"
    width="500px"
    @update:model-value="handleClose"
    @close="handleDialogClose"
  >
    <el-alert
      title="警告"
      type="warning"
      description="报告回收后，所有接收方将无法继续使用该报告。此操作不可撤销，请谨慎操作。"
      :closable="false"
      show-icon
      style="margin-bottom: 20px"
    />

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
    >
      <el-form-item label="报告编号">
        <el-input v-model="report.reportNumber" disabled />
      </el-form-item>

      <el-form-item label="样品名称">
        <el-input v-model="report.sampleName" disabled />
      </el-form-item>

      <el-form-item label="回收原因" prop="reason">
        <el-input
          v-model="form.reason"
          type="textarea"
          :rows="4"
          placeholder="请详细说明报告回收的原因"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="通知接收方" prop="notifyRecipients">
        <el-switch
          v-model="form.notifyRecipients"
          active-text="是"
          inactive-text="否"
        />
        <div class="form-tip">
          开启后，系统将通过邮件通知所有接收方该报告已被回收
        </div>
      </el-form-item>

      <el-form-item v-if="form.notifyRecipients" label="通知内容">
        <el-input
          v-model="form.notificationMessage"
          type="textarea"
          :rows="3"
          placeholder="请输入通知内容（可选）"
          maxlength="300"
          show-word-limit
        />
        <div class="form-tip">
          如不填写，将使用默认通知模板
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button
        type="danger"
        @click="handleConfirm"
        :loading="loading"
      >
        确认回收
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { ElMessageBox, type FormInstance, type FormRules } from 'element-plus'

// Props
interface Props {
  modelValue: boolean
  report: {
    id?: string
    reportNumber?: string
    sampleName?: string
  }
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  report: () => ({
    id: '',
    reportNumber: '',
    sampleName: ''
  })
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'confirm': [data: { reason: string; notifyRecipients: boolean; notificationMessage?: string }]
}>()

// 响应式数据
const loading = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  reason: '',
  notifyRecipients: true,
  notificationMessage: ''
})

// 表单验证规则
const rules: FormRules = {
  reason: [
    { required: true, message: '请输入回收原因', trigger: 'blur' },
    { min: 10, message: '回收原因至少需要10个字符', trigger: 'blur' }
  ]
}

// 方法
const handleClose = () => {
  emit('update:modelValue', false)
}

const handleDialogClose = () => {
  formRef.value?.resetFields()
  form.reason = ''
  form.notifyRecipients = true
  form.notificationMessage = ''
}

const handleConfirm = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        await ElMessageBox.confirm(
          '确认要回收此报告吗？此操作不可撤销。',
          '确认回收',
          {
            confirmButtonText: '确认',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )

        loading.value = true

        // 触发确认事件
        emit('confirm', {
          reason: form.reason,
          notifyRecipients: form.notifyRecipients,
          notificationMessage: form.notificationMessage || undefined
        })
      } catch (error) {
        // 用户取消操作
        console.log('用户取消回收操作')
      } finally {
        loading.value = false
      }
    }
  })
}

// 监听对话框打开，重置表单
watch(() => props.modelValue, (newVal) => {
  if (!newVal) {
    handleDialogClose()
  }
})
</script>

<style scoped>
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
  line-height: 1.5;
}
</style>
