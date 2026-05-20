<template>
  <div class="system-settings">
    <el-card shadow="never">
      <el-tabs v-model="activeTab" type="border-card">
        <!-- 基本配置 -->
        <el-tab-pane label="基本配置" name="basic">
          <el-form
            ref="basicFormRef"
            :model="basicSettings"
            :rules="basicRules"
            label-width="150px"
            style="max-width: 800px"
          >
            <el-divider content-position="left">系统信息</el-divider>
            <el-form-item label="系统名称" prop="systemName">
              <el-input v-model="basicSettings.systemName" placeholder="请输入系统名称" />
            </el-form-item>
            <el-form-item label="系统版本" prop="systemVersion">
              <el-input v-model="basicSettings.systemVersion" placeholder="请输入系统版本" disabled />
            </el-form-item>
            <el-form-item label="实验室名称" prop="labName">
              <el-input v-model="basicSettings.labName" placeholder="请输入实验室名称" />
            </el-form-item>
            <el-form-item label="实验室地址" prop="labAddress">
              <el-input v-model="basicSettings.labAddress" placeholder="请输入实验室地址" />
            </el-form-item>
            <el-form-item label="联系电话" prop="contactPhone">
              <el-input v-model="basicSettings.contactPhone" placeholder="请输入联系电话" />
            </el-form-item>
            <el-form-item label="联系邮箱" prop="contactEmail">
              <el-input v-model="basicSettings.contactEmail" placeholder="请输入联系邮箱" />
            </el-form-item>

            <el-divider content-position="left">条码配置</el-divider>
            <el-form-item label="条码前缀" prop="barcodePrefix">
              <el-input v-model="basicSettings.barcodePrefix" placeholder="例如: S" />
              <template #extra>
                <span class="form-item-tip">样品条码的前缀字符,例如: S2024010001</span>
              </template>
            </el-form-item>
            <el-form-item label="条码长度" prop="barcodeLength">
              <el-input-number
                v-model="basicSettings.barcodeLength"
                :min="8"
                :max="20"
              />
              <template #extra>
                <span class="form-item-tip">条码总长度(包含前缀),建议10-15位</span>
              </template>
            </el-form-item>
            <el-form-item label="条码格式" prop="barcodeFormat">
              <el-select v-model="basicSettings.barcodeFormat" placeholder="请选择条码格式">
                <el-option label="CODE128" value="CODE128" />
                <el-option label="CODE39" value="CODE39" />
                <el-option label="EAN13" value="EAN13" />
                <el-option label="QR Code" value="QRCODE" />
              </el-select>
            </el-form-item>

            <el-divider content-position="left">数据保留</el-divider>
            <el-form-item label="日志保留天数" prop="logRetentionDays">
              <el-input-number
                v-model="basicSettings.logRetentionDays"
                :min="30"
                :max="3650"
              />
              <template #extra>
                <span class="form-item-tip">审计日志保留天数,建议至少365天</span>
              </template>
            </el-form-item>
            <el-form-item label="留样默认期限" prop="defaultRetentionDays">
              <el-input-number
                v-model="basicSettings.defaultRetentionDays"
                :min="30"
                :max="1825"
              />
              <template #extra>
                <span class="form-item-tip">样品留样的默认保存天数</span>
              </template>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="handleSaveBasic">保存配置</el-button>
              <el-button @click="handleResetBasic">重置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 通知配置 -->
        <el-tab-pane label="通知配置" name="notification">
          <el-form
            ref="notificationFormRef"
            :model="notificationSettings"
            label-width="180px"
            style="max-width: 800px"
          >
            <el-divider content-position="left">邮件通知</el-divider>
            <el-form-item label="启用邮件通知">
              <el-switch v-model="notificationSettings.emailEnabled" />
            </el-form-item>
            <template v-if="notificationSettings.emailEnabled">
              <el-form-item label="SMTP服务器" prop="smtpHost">
                <el-input v-model="notificationSettings.smtpHost" placeholder="例如: smtp.example.com" />
              </el-form-item>
              <el-form-item label="SMTP端口" prop="smtpPort">
                <el-input-number v-model="notificationSettings.smtpPort" :min="1" :max="65535" />
              </el-form-item>
              <el-form-item label="发件人邮箱" prop="senderEmail">
                <el-input v-model="notificationSettings.senderEmail" placeholder="例如: noreply@lab.com" />
              </el-form-item>
              <el-form-item label="发件人密码" prop="senderPassword">
                <el-input
                  v-model="notificationSettings.senderPassword"
                  type="password"
                  placeholder="请输入邮箱密码或授权码"
                  show-password
                />
              </el-form-item>
              <el-form-item label="使用SSL">
                <el-switch v-model="notificationSettings.smtpSSL" />
              </el-form-item>
            </template>

            <el-divider content-position="left">通知事件</el-divider>
            <el-form-item label="任务分配通知">
              <el-switch v-model="notificationSettings.notifyTaskAssignment" />
              <template #extra>
                <span class="form-item-tip">任务分配给用户时发送通知</span>
              </template>
            </el-form-item>
            <el-form-item label="审核退回通知">
              <el-switch v-model="notificationSettings.notifyAuditReturn" />
              <template #extra>
                <span class="form-item-tip">审核退回时通知原操作人员</span>
              </template>
            </el-form-item>
            <el-form-item label="报告分发通知">
              <el-switch v-model="notificationSettings.notifyReportDistribution" />
              <template #extra>
                <span class="form-item-tip">报告分发时通知接收方</span>
              </template>
            </el-form-item>
            <el-form-item label="留样到期提醒">
              <el-switch v-model="notificationSettings.notifyRetentionExpiry" />
              <template #extra>
                <span class="form-item-tip">留样期限临近时发送提醒</span>
              </template>
            </el-form-item>
            <el-form-item label="提前提醒天数" v-if="notificationSettings.notifyRetentionExpiry">
              <el-input-number
                v-model="notificationSettings.retentionExpiryDays"
                :min="1"
                :max="30"
              />
              <template #extra>
                <span class="form-item-tip">在留样到期前多少天发送提醒</span>
              </template>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="handleSaveNotification">保存配置</el-button>
              <el-button @click="handleTestEmail">测试邮件</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 安全配置 -->
        <el-tab-pane label="安全配置" name="security">
          <el-form
            ref="securityFormRef"
            :model="securitySettings"
            label-width="180px"
            style="max-width: 800px"
          >
            <el-divider content-position="left">密码策略</el-divider>
            <el-form-item label="最小密码长度">
              <el-input-number
                v-model="securitySettings.minPasswordLength"
                :min="6"
                :max="20"
              />
            </el-form-item>
            <el-form-item label="密码复杂度要求">
              <el-checkbox-group v-model="securitySettings.passwordComplexity">
                <el-checkbox label="uppercase">包含大写字母</el-checkbox>
                <el-checkbox label="lowercase">包含小写字母</el-checkbox>
                <el-checkbox label="number">包含数字</el-checkbox>
                <el-checkbox label="special">包含特殊字符</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            <el-form-item label="密码过期天数">
              <el-input-number
                v-model="securitySettings.passwordExpiryDays"
                :min="0"
                :max="365"
              />
              <template #extra>
                <span class="form-item-tip">0表示永不过期</span>
              </template>
            </el-form-item>

            <el-divider content-position="left">登录安全</el-divider>
            <el-form-item label="最大登录失败次数">
              <el-input-number
                v-model="securitySettings.maxLoginAttempts"
                :min="3"
                :max="10"
              />
            </el-form-item>
            <el-form-item label="账户锁定时长(分钟)">
              <el-input-number
                v-model="securitySettings.lockoutDuration"
                :min="5"
                :max="1440"
              />
            </el-form-item>
            <el-form-item label="会话超时时间(分钟)">
              <el-input-number
                v-model="securitySettings.sessionTimeout"
                :min="15"
                :max="480"
              />
            </el-form-item>
            <el-form-item label="启用双因素认证">
              <el-switch v-model="securitySettings.twoFactorEnabled" />
            </el-form-item>

            <el-divider content-position="left">数据安全</el-divider>
            <el-form-item label="启用数据加密">
              <el-switch v-model="securitySettings.dataEncryption" />
              <template #extra>
                <span class="form-item-tip">对敏感数据进行加密存储</span>
              </template>
            </el-form-item>
            <el-form-item label="启用审计日志">
              <el-switch v-model="securitySettings.auditLogEnabled" />
            </el-form-item>
            <el-form-item label="IP白名单">
              <el-input
                v-model="securitySettings.ipWhitelist"
                type="textarea"
                :rows="3"
                placeholder="每行一个IP地址或IP段,例如: 192.168.1.0/24"
              />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="handleSaveSecurity">保存配置</el-button>
              <el-button @click="handleResetSecurity">重置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 工作流配置 -->
        <el-tab-pane label="工作流配置" name="workflow">
          <el-form
            ref="workflowFormRef"
            :model="workflowSettings"
            label-width="180px"
            style="max-width: 800px"
          >
            <el-divider content-position="left">任务配置</el-divider>
            <el-form-item label="启用自动派工">
              <el-switch v-model="workflowSettings.autoAssignment" />
              <template #extra>
                <span class="form-item-tip">根据规则自动分配检测任务</span>
              </template>
            </el-form-item>
            <el-form-item label="派工策略" v-if="workflowSettings.autoAssignment">
              <el-select v-model="workflowSettings.assignmentStrategy" placeholder="请选择派工策略">
                <el-option label="按技能匹配" value="skill" />
                <el-option label="按工作负载" value="workload" />
                <el-option label="轮询分配" value="round_robin" />
              </el-select>
            </el-form-item>
            <el-form-item label="任务超时提醒">
              <el-switch v-model="workflowSettings.taskTimeoutAlert" />
            </el-form-item>
            <el-form-item label="超时阈值(小时)" v-if="workflowSettings.taskTimeoutAlert">
              <el-input-number
                v-model="workflowSettings.taskTimeoutHours"
                :min="1"
                :max="168"
              />
            </el-form-item>

            <el-divider content-position="left">审核配置</el-divider>
            <el-form-item label="默认审核级别数">
              <el-input-number
                v-model="workflowSettings.defaultAuditLevels"
                :min="1"
                :max="5"
              />
            </el-form-item>
            <el-form-item label="允许跳过审核">
              <el-switch v-model="workflowSettings.allowSkipAudit" />
              <template #extra>
                <span class="form-item-tip">特定情况下允许跳过某些审核级别</span>
              </template>
            </el-form-item>
            <el-form-item label="审核超时自动通过">
              <el-switch v-model="workflowSettings.auditAutoApprove" />
            </el-form-item>
            <el-form-item label="超时天数" v-if="workflowSettings.auditAutoApprove">
              <el-input-number
                v-model="workflowSettings.auditTimeoutDays"
                :min="1"
                :max="30"
              />
            </el-form-item>

            <el-divider content-position="left">质量控制</el-divider>
            <el-form-item label="启用自动质量判定">
              <el-switch v-model="workflowSettings.autoQualityJudgment" />
            </el-form-item>
            <el-form-item label="异常结果自动标记">
              <el-switch v-model="workflowSettings.autoAnomalyDetection" />
            </el-form-item>
            <el-form-item label="复测申请需审批">
              <el-switch v-model="workflowSettings.retestApprovalRequired" />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="handleSaveWorkflow">保存配置</el-button>
              <el-button @click="handleResetWorkflow">重置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 报告配置 -->
        <el-tab-pane label="报告配置" name="report">
          <el-form
            ref="reportFormRef"
            :model="reportSettings"
            label-width="180px"
            style="max-width: 800px"
          >
            <el-divider content-position="left">报告编号</el-divider>
            <el-form-item label="报告编号前缀">
              <el-input v-model="reportSettings.reportNumberPrefix" placeholder="例如: RPT" />
            </el-form-item>
            <el-form-item label="编号格式">
              <el-select v-model="reportSettings.reportNumberFormat" placeholder="请选择编号格式">
                <el-option label="前缀+年月日+序号" value="PREFIX-YYYYMMDD-SEQ" />
                <el-option label="前缀+年+序号" value="PREFIX-YYYY-SEQ" />
                <el-option label="前缀+序号" value="PREFIX-SEQ" />
              </el-select>
            </el-form-item>

            <el-divider content-position="left">电子签名</el-divider>
            <el-form-item label="必需签名角色">
              <el-checkbox-group v-model="reportSettings.requiredSignatures">
                <el-checkbox label="preparer">编制</el-checkbox>
                <el-checkbox label="reviewer">审核</el-checkbox>
                <el-checkbox label="approver">批准</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            <el-form-item label="签名顺序强制">
              <el-switch v-model="reportSettings.signatureOrderEnforced" />
              <template #extra>
                <span class="form-item-tip">必须按照编制→审核→批准的顺序签名</span>
              </template>
            </el-form-item>
            <el-form-item label="签名后锁定报告">
              <el-switch v-model="reportSettings.lockAfterSignature" />
            </el-form-item>

            <el-divider content-position="left">报告分发</el-divider>
            <el-form-item label="默认分发方式">
              <el-checkbox-group v-model="reportSettings.defaultDistributionMethods">
                <el-checkbox label="email">邮件</el-checkbox>
                <el-checkbox label="download">下载</el-checkbox>
                <el-checkbox label="print">打印</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            <el-form-item label="分发需审批">
              <el-switch v-model="reportSettings.distributionApprovalRequired" />
            </el-form-item>
            <el-form-item label="允许报告回收">
              <el-switch v-model="reportSettings.allowRecall" />
            </el-form-item>
            <el-form-item label="回收需审批" v-if="reportSettings.allowRecall">
              <el-switch v-model="reportSettings.recallApprovalRequired" />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="handleSaveReport">保存配置</el-button>
              <el-button @click="handleResetReport">重置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

// 当前激活的标签页
const activeTab = ref('basic')

// 表单引用
const basicFormRef = ref<FormInstance>()
const notificationFormRef = ref<FormInstance>()
const securityFormRef = ref<FormInstance>()
const workflowFormRef = ref<FormInstance>()
const reportFormRef = ref<FormInstance>()

// 基本配置
const basicSettings = reactive({
  systemName: '实验室智能管理系统',
  systemVersion: 'v1.0.0',
  labName: '某某检测实验室',
  labAddress: '某市某区某街道123号',
  contactPhone: '010-12345678',
  contactEmail: 'contact@lab.com',
  barcodePrefix: 'S',
  barcodeLength: 12,
  barcodeFormat: 'CODE128',
  logRetentionDays: 365,
  defaultRetentionDays: 180
})

// 基本配置验证规则
const basicRules: FormRules = {
  systemName: [
    { required: true, message: '请输入系统名称', trigger: 'blur' }
  ],
  labName: [
    { required: true, message: '请输入实验室名称', trigger: 'blur' }
  ],
  contactEmail: [
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ]
}

// 通知配置
const notificationSettings = reactive({
  emailEnabled: true,
  smtpHost: 'smtp.example.com',
  smtpPort: 465,
  senderEmail: 'noreply@lab.com',
  senderPassword: '',
  smtpSSL: true,
  notifyTaskAssignment: true,
  notifyAuditReturn: true,
  notifyReportDistribution: true,
  notifyRetentionExpiry: true,
  retentionExpiryDays: 7
})

// 安全配置
const securitySettings = reactive({
  minPasswordLength: 8,
  passwordComplexity: ['uppercase', 'lowercase', 'number'],
  passwordExpiryDays: 90,
  maxLoginAttempts: 5,
  lockoutDuration: 30,
  sessionTimeout: 120,
  twoFactorEnabled: false,
  dataEncryption: true,
  auditLogEnabled: true,
  ipWhitelist: ''
})

// 工作流配置
const workflowSettings = reactive({
  autoAssignment: true,
  assignmentStrategy: 'skill',
  taskTimeoutAlert: true,
  taskTimeoutHours: 24,
  defaultAuditLevels: 2,
  allowSkipAudit: false,
  auditAutoApprove: false,
  auditTimeoutDays: 7,
  autoQualityJudgment: true,
  autoAnomalyDetection: true,
  retestApprovalRequired: true
})

// 报告配置
const reportSettings = reactive({
  reportNumberPrefix: 'RPT',
  reportNumberFormat: 'PREFIX-YYYYMMDD-SEQ',
  requiredSignatures: ['preparer', 'reviewer', 'approver'],
  signatureOrderEnforced: true,
  lockAfterSignature: true,
  defaultDistributionMethods: ['email'],
  distributionApprovalRequired: false,
  allowRecall: true,
  recallApprovalRequired: true
})

// 保存基本配置
const handleSaveBasic = () => {
  basicFormRef.value?.validate((valid) => {
    if (valid) {
      ElMessage.success('基本配置保存成功')
    }
  })
}

// 重置基本配置
const handleResetBasic = () => {
  basicFormRef.value?.resetFields()
  ElMessage.info('已重置为默认配置')
}

// 保存通知配置
const handleSaveNotification = () => {
  ElMessage.success('通知配置保存成功')
}

// 测试邮件
const handleTestEmail = () => {
  ElMessage.info('正在发送测试邮件...')
  setTimeout(() => {
    ElMessage.success('测试邮件发送成功,请检查收件箱')
  }, 1000)
}

// 保存安全配置
const handleSaveSecurity = () => {
  ElMessage.success('安全配置保存成功')
}

// 重置安全配置
const handleResetSecurity = () => {
  securityFormRef.value?.resetFields()
  ElMessage.info('已重置为默认配置')
}

// 保存工作流配置
const handleSaveWorkflow = () => {
  ElMessage.success('工作流配置保存成功')
}

// 重置工作流配置
const handleResetWorkflow = () => {
  workflowFormRef.value?.resetFields()
  ElMessage.info('已重置为默认配置')
}

// 保存报告配置
const handleSaveReport = () => {
  ElMessage.success('报告配置保存成功')
}

// 重置报告配置
const handleResetReport = () => {
  reportFormRef.value?.resetFields()
  ElMessage.info('已重置为默认配置')
}
</script>

<style scoped>
.system-settings {
  padding: 20px;
}

.form-item-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
}

:deep(.el-card__body) {
  padding: 0;
}

:deep(.el-tabs--border-card) {
  border: none;
  box-shadow: none;
}

:deep(.el-tabs__content) {
  padding: 20px;
}

:deep(.el-divider__text) {
  font-weight: 500;
  color: #303133;
}

:deep(.el-form-item__content) {
  align-items: flex-start;
}

:deep(.el-checkbox-group) {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
