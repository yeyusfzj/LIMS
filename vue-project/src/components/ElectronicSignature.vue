<template>
  <div class="electronic-signature">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-icon><EditPen /></el-icon>
            <span>电子签名</span>
          </div>
          <div class="header-right">
            <el-tag v-if="allSignaturesComplete" type="success" :icon="Lock">
              签名已完成，报告已锁定
            </el-tag>
            <el-tag v-else type="warning" :icon="Warning">
              待签名
            </el-tag>
          </div>
        </div>
      </template>

      <!-- 签名进度 -->
      <div class="signature-progress">
        <el-steps :active="currentSignatureStep" finish-status="success" align-center>
          <el-step
            v-for="role in signatureRoles"
            :key="role.role"
            :title="role.title"
            :description="getStepDescription(role)"
          />
        </el-steps>
      </div>

      <el-divider />

      <!-- 签名列表 -->
      <div class="signature-list">
        <div
          v-for="role in signatureRoles"
          :key="role.role"
          class="signature-item"
          :class="{ completed: isRoleSigned(role.role), locked: allSignaturesComplete }"
        >
          <div class="signature-info">
            <div class="role-section">
              <div class="role-title">
                <el-icon :size="20">
                  <component :is="getRoleIcon(role.role)" />
                </el-icon>
                <span class="role-name">{{ role.title }}</span>
                <el-tag v-if="role.required" type="danger" size="small">必需</el-tag>
                <el-tag v-else type="info" size="small">可选</el-tag>
              </div>
              <div class="role-description">{{ role.description }}</div>
            </div>

            <div class="signature-status">
              <!-- 已签名状态 -->
              <div v-if="isRoleSigned(role.role)" class="signed-info">
                <el-icon class="success-icon" :size="24"><CircleCheck /></el-icon>
                <div class="signed-details">
                  <div class="signer-name">
                    <el-icon><User /></el-icon>
                    {{ getSignature(role.role)?.userName }}
                  </div>
                  <div class="signed-time">
                    <el-icon><Clock /></el-icon>
                    {{ formatDate(getSignature(role.role)?.signedAt) }}
                  </div>
                </div>
              </div>

              <!-- 未签名状态 -->
              <div v-else class="unsigned-info">
                <el-button
                  type="primary"
                  :icon="EditPen"
                  :disabled="!canSign(role.role) || allSignaturesComplete"
                  @click="handleSign(role)"
                >
                  {{ allSignaturesComplete ? '已锁定' : '添加签名' }}
                </el-button>
                <div v-if="!canSign(role.role) && !allSignaturesComplete" class="waiting-tip">
                  <el-icon><InfoFilled /></el-icon>
                  <span>等待前序签名完成</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 签名历史记录 -->
      <el-divider />
      <div class="signature-history">
        <h4>
          <el-icon><Clock /></el-icon>
          签名历史
        </h4>
        <el-timeline v-if="signatures.length > 0">
          <el-timeline-item
            v-for="(sig, index) in sortedSignatures"
            :key="index"
            :timestamp="formatDate(sig.signedAt)"
            placement="top"
            :type="getTimelineType(sig.role)"
            :icon="getRoleIcon(sig.role)"
          >
            <div class="timeline-content">
              <div class="timeline-role">{{ getRoleTitle(sig.role) }}</div>
              <div class="timeline-user">
                <el-icon><User /></el-icon>
                {{ sig.userName }}
              </div>
            </div>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-else description="暂无签名记录" :image-size="80" />
      </div>
    </el-card>

    <!-- 签名对话框 -->
    <el-dialog
      v-model="signDialogVisible"
      :title="`添加${currentRole?.title}签名`"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="signFormRef"
        :model="signForm"
        :rules="signFormRules"
        label-width="100px"
      >
        <el-form-item label="签名人" prop="userName">
          <el-input
            v-model="signForm.userName"
            placeholder="请输入签名人姓名"
            :prefix-icon="User"
          />
        </el-form-item>

        <el-form-item label="密码验证" prop="password">
          <el-input
            v-model="signForm.password"
            type="password"
            placeholder="请输入密码以验证身份"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>

        <el-form-item label="签名意见" prop="comments">
          <el-input
            v-model="signForm.comments"
            type="textarea"
            :rows="4"
            placeholder="请输入签名意见（可选）"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-alert
          title="签名说明"
          type="info"
          :closable="false"
          show-icon
        >
          <template #default>
            <ul style="margin: 0; padding-left: 20px;">
              <li>签名后将无法修改报告内容</li>
              <li>签名具有法律效力，请谨慎操作</li>
              <li>签名信息将被加密存储</li>
            </ul>
          </template>
        </el-alert>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="signDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="signing" @click="handleConfirmSign">
            确认签名
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  EditPen,
  Lock,
  Warning,
  CircleCheck,
  User,
  Clock,
  InfoFilled,
  Document,
  View,
  Checked
} from '@element-plus/icons-vue'
import type { Signature } from '@/types'

// Props
interface Props {
  reportId: string
  signatures?: Signature[]
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  signatures: () => [],
  readonly: false
})

// Emits
const emit = defineEmits<{
  sign: [signature: Signature]
  complete: []
}>()

// 签名角色配置
interface SignatureRole {
  role: 'preparer' | 'reviewer' | 'approver'
  title: string
  description: string
  required: boolean
  order: number
}

const signatureRoles: SignatureRole[] = [
  {
    role: 'preparer',
    title: '编制人',
    description: '负责编制报告内容',
    required: true,
    order: 1
  },
  {
    role: 'reviewer',
    title: '审核人',
    description: '负责审核报告内容的准确性和完整性',
    required: true,
    order: 2
  },
  {
    role: 'approver',
    title: '批准人',
    description: '负责最终批准报告发布',
    required: true,
    order: 3
  }
]

// 签名对话框
const signDialogVisible = ref(false)
const currentRole = ref<SignatureRole | null>(null)
const signing = ref(false)

// 签名表单
const signFormRef = ref<FormInstance>()
const signForm = ref({
  userName: '',
  password: '',
  comments: ''
})

const signFormRules: FormRules = {
  userName: [
    { required: true, message: '请输入签名人姓名', trigger: 'blur' },
    { min: 2, max: 50, message: '姓名长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少 6 个字符', trigger: 'blur' }
  ]
}

// 计算属性：所有必需签名是否完成
const allSignaturesComplete = computed(() => {
  const requiredRoles = signatureRoles.filter(r => r.required)
  return requiredRoles.every(role => isRoleSigned(role.role))
})

// 计算属性：当前签名步骤
const currentSignatureStep = computed(() => {
  const signedCount = props.signatures.length
  return signedCount
})

// 计算属性：按时间排序的签名列表
const sortedSignatures = computed(() => {
  return [...props.signatures].sort((a, b) => {
    return new Date(a.signedAt).getTime() - new Date(b.signedAt).getTime()
  })
})

// 判断角色是否已签名
const isRoleSigned = (role: string): boolean => {
  return props.signatures.some(sig => sig.role === role)
}

// 获取角色的签名信息
const getSignature = (role: string): Signature | undefined => {
  return props.signatures.find(sig => sig.role === role)
}

// 判断是否可以签名
const canSign = (role: string): boolean => {
  if (props.readonly || allSignaturesComplete.value) {
    return false
  }

  // 如果该角色已签名，不能再次签名
  if (isRoleSigned(role)) {
    return false
  }

  // 获取当前角色的顺序
  const currentRoleConfig = signatureRoles.find(r => r.role === role)
  if (!currentRoleConfig) return false

  // 检查前序必需角色是否都已签名
  const previousRequiredRoles = signatureRoles.filter(
    r => r.required && r.order < currentRoleConfig.order
  )

  return previousRequiredRoles.every(r => isRoleSigned(r.role))
}

// 获取步骤描述
const getStepDescription = (role: SignatureRole): string => {
  const signature = getSignature(role.role)
  if (signature) {
    return signature.userName
  }
  return '待签名'
}

// 获取角色图标
const getRoleIcon = (role: string) => {
  const icons: Record<string, any> = {
    preparer: Document,
    reviewer: View,
    approver: Checked
  }
  return icons[role] || EditPen
}

// 获取角色标题
const getRoleTitle = (role: string): string => {
  const roleConfig = signatureRoles.find(r => r.role === role)
  return roleConfig?.title || role
}

// 获取时间线类型
const getTimelineType = (role: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' => {
  const types: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
    preparer: 'primary',
    reviewer: 'warning',
    approver: 'success'
  }
  return types[role] || 'info'
}

// 处理签名
const handleSign = (role: SignatureRole) => {
  if (!canSign(role.role)) {
    ElMessage.warning('当前无法签名，请等待前序签名完成')
    return
  }

  currentRole.value = role
  signForm.value = {
    userName: '',
    password: '',
    comments: ''
  }
  signDialogVisible.value = true
}

// 确认签名
const handleConfirmSign = async () => {
  if (!signFormRef.value || !currentRole.value) return

  try {
    // 验证表单
    await signFormRef.value.validate()

    signing.value = true

    // 模拟密码验证
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 简单的密码验证（实际项目中应该调用后端API）
    if (signForm.value.password !== '123456') {
      ElMessage.error('密码错误，请重新输入')
      signing.value = false
      return
    }

    // 创建签名对象
    const signature: Signature = {
      role: currentRole.value.role,
      userId: `user_${Date.now()}`,
      userName: signForm.value.userName,
      signedAt: new Date(),
      signatureData: btoa(`${currentRole.value.role}:${signForm.value.userName}:${Date.now()}`), // 简单的加密
      comments: signForm.value.comments
    }

    // 触发签名事件
    emit('sign', signature)

    ElMessage.success('签名成功')
    signDialogVisible.value = false

    // 检查是否所有必需签名都已完成
    setTimeout(() => {
      if (allSignaturesComplete.value) {
        emit('complete')
        ElMessageBox.alert(
          '所有必需签名已完成，报告已锁定，无法再修改内容',
          '签名完成',
          {
            confirmButtonText: '确定',
            type: 'success'
          }
        )
      }
    }, 500)
  } catch (error) {
    console.error('签名失败:', error)
  } finally {
    signing.value = false
  }
}

// 格式化日期
const formatDate = (date: Date | undefined): string => {
  if (!date) return ''
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 监听签名完成
watch(allSignaturesComplete, (newVal) => {
  if (newVal) {
    console.log('所有签名已完成，报告已锁定')
  }
})
</script>

<style scoped lang="scss">
.electronic-signature {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 16px;
    }

    .header-right {
      display: flex;
      align-items: center;
    }
  }

  .signature-progress {
    padding: 20px 0;
  }

  .signature-list {
    .signature-item {
      padding: 20px;
      border: 1px solid #dcdfe6;
      border-radius: 8px;
      margin-bottom: 16px;
      transition: all 0.3s;

      &:last-child {
        margin-bottom: 0;
      }

      &.completed {
        border-color: #67c23a;
        background-color: #f0f9ff;
      }

      &.locked {
        background-color: #f5f7fa;
        opacity: 0.9;
      }

      .signature-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 20px;

        .role-section {
          flex: 1;

          .role-title {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;

            .role-name {
              font-size: 16px;
              font-weight: 600;
              color: #303133;
            }
          }

          .role-description {
            font-size: 14px;
            color: #909399;
            margin-left: 28px;
          }
        }

        .signature-status {
          min-width: 200px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;

          .signed-info {
            display: flex;
            align-items: center;
            gap: 12px;

            .success-icon {
              color: #67c23a;
            }

            .signed-details {
              display: flex;
              flex-direction: column;
              gap: 4px;

              .signer-name,
              .signed-time {
                display: flex;
                align-items: center;
                gap: 4px;
                font-size: 14px;
                color: #606266;

                .el-icon {
                  font-size: 14px;
                  color: #909399;
                }
              }

              .signer-name {
                font-weight: 600;
              }

              .signed-time {
                font-size: 12px;
                color: #909399;
              }
            }
          }

          .unsigned-info {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 8px;

            .waiting-tip {
              display: flex;
              align-items: center;
              gap: 4px;
              font-size: 12px;
              color: #e6a23c;

              .el-icon {
                font-size: 14px;
              }
            }
          }
        }
      }
    }
  }

  .signature-history {
    h4 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 16px 0;
      font-size: 16px;
      color: #303133;
    }

    .timeline-content {
      .timeline-role {
        font-weight: 600;
        color: #303133;
        margin-bottom: 4px;
      }

      .timeline-user {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 14px;
        color: #606266;

        .el-icon {
          font-size: 14px;
          color: #909399;
        }
      }
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
