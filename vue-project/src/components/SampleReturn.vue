<template>
  <el-dialog
    v-model="dialogVisible"
    title="样品退回"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="100px"
    >
      <!-- 样品信息展示 -->
      <el-form-item label="样品条码">
        <el-input v-model="sample?.barcode" disabled />
      </el-form-item>
      
      <el-form-item label="样品名称">
        <el-input v-model="sample?.name" disabled />
      </el-form-item>

      <!-- 退回原因 -->
      <el-form-item label="退回原因" prop="reason">
        <el-select
          v-model="formData.reason"
          placeholder="请选择退回原因"
          style="width: 100%"
        >
          <el-option label="检测结果不合格" value="test_failed" />
          <el-option label="审核未通过" value="audit_failed" />
          <el-option label="质量判定不合格" value="quality_failed" />
          <el-option label="报告签名不完整" value="signature_incomplete" />
          <el-option label="样品信息有误" value="info_error" />
          <el-option label="其他原因" value="other" />
        </el-select>
      </el-form-item>

      <!-- 详细说明 -->
      <el-form-item label="详细说明" prop="description">
        <el-input
          v-model="formData.description"
          type="textarea"
          :rows="4"
          placeholder="请输入退回的详细说明"
          maxlength="500"
          show-word-limit
        />
      </el-form-item>

      <!-- 通知人员 -->
      <el-form-item label="通知人员" prop="notifyUsers">
        <el-select
          v-model="formData.notifyUsers"
          multiple
          placeholder="请选择需要通知的人员"
          style="width: 100%"
          filterable
        >
          <el-option
            v-for="user in userList"
            :key="user.id"
            :label="user.name"
            :value="user.id"
          >
            <span>{{ user.name }}</span>
            <span style="color: #8492a6; font-size: 13px; margin-left: 10px">
              {{ user.department }}
            </span>
          </el-option>
        </el-select>
      </el-form-item>

      <!-- 通知方式 -->
      <el-form-item label="通知方式">
        <el-checkbox-group v-model="formData.notifyMethods">
          <el-checkbox label="email">邮件</el-checkbox>
          <el-checkbox label="sms">短信</el-checkbox>
          <el-checkbox label="system">系统通知</el-checkbox>
        </el-checkbox-group>
      </el-form-item>

      <!-- 是否需要重新检测 -->
      <el-form-item label="重新检测">
        <el-switch
          v-model="formData.requireRetest"
          active-text="需要"
          inactive-text="不需要"
        />
      </el-form-item>

      <!-- 优先级 -->
      <el-form-item v-if="formData.requireRetest" label="优先级">
        <el-radio-group v-model="formData.priority">
          <el-radio label="normal">普通</el-radio>
          <el-radio label="high">高</el-radio>
          <el-radio label="urgent">紧急</el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleConfirm" :loading="submitting">
          确认退回
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'

// Props
interface Props {
  visible: boolean
  sample: any
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  sample: null
})

// Emits
const emit = defineEmits<{
  'update:visible': [value: boolean]
  'confirm': [data: any]
}>()

// 对话框可见性
const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 表单引用
const formRef = ref<FormInstance>()

// 表单数据
const formData = reactive({
  reason: '',
  description: '',
  notifyUsers: [] as string[],
  notifyMethods: ['system'] as string[],
  requireRetest: false,
  priority: 'normal'
})

// 提交状态
const submitting = ref(false)

// 用户列表（模拟数据）
const userList = ref([
  { id: '1', name: '张三', department: '检测部' },
  { id: '2', name: '李四', department: '质量部' },
  { id: '3', name: '王五', department: '审核部' },
  { id: '4', name: '赵六', department: '技术部' },
  { id: '5', name: '钱七', department: '管理部' }
])

// 表单验证规则
const rules: FormRules = {
  reason: [
    { required: true, message: '请选择退回原因', trigger: 'change' }
  ],
  description: [
    { required: true, message: '请输入详细说明', trigger: 'blur' },
    { min: 10, message: '详细说明至少10个字符', trigger: 'blur' }
  ],
  notifyUsers: [
    { 
      type: 'array',
      required: true, 
      message: '请至少选择一个通知人员', 
      trigger: 'change' 
    }
  ]
}

// 监听对话框打开，重置表单
watch(() => props.visible, (newVal) => {
  if (newVal) {
    resetForm()
  }
})

// 重置表单
const resetForm = () => {
  formData.reason = ''
  formData.description = ''
  formData.notifyUsers = []
  formData.notifyMethods = ['system']
  formData.requireRetest = false
  formData.priority = 'normal'
  formRef.value?.clearValidate()
}

// 关闭对话框
const handleClose = () => {
  dialogVisible.value = false
}

// 确认退回
const handleConfirm = async () => {
  if (!formRef.value) return

  try {
    // 验证表单
    await formRef.value.validate()

    submitting.value = true

    // 准备提交数据
    const submitData = {
      sampleId: props.sample?.id,
      reason: formData.reason,
      description: formData.description,
      notifyUsers: formData.notifyUsers,
      notifyMethods: formData.notifyMethods,
      requireRetest: formData.requireRetest,
      priority: formData.requireRetest ? formData.priority : undefined
    }

    // 触发确认事件
    emit('confirm', submitData)

  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

:deep(.el-select) {
  width: 100%;
}

:deep(.el-checkbox-group) {
  display: flex;
  gap: 20px;
}
</style>
