<template>
  <div class="audit-task-detail">
    <el-page-header @back="handleBack" title="返回">
      <template #content>
        <span class="page-title">审核任务详情</span>
      </template>
    </el-page-header>

    <el-card v-loading="loading" style="margin-top: 20px">
      <!-- 流程信息展示 -->
      <WorkflowInfo
        v-if="auditTask.id"
        :task-id="auditTask.id"
        :current-level="auditTask.level"
        :show-details="true"
        style="margin-bottom: 20px"
      />

      <!-- 审核任务基本信息 -->
      <template #header>
        <div class="card-header">
          <span class="title">审核任务信息</span>
          <el-tag :type="getStatusTagType(auditTask.status)">
            {{ getStatusText(auditTask.status) }}
          </el-tag>
        </div>
      </template>

      <el-descriptions :column="2" border>
        <el-descriptions-item label="审核任务ID" :span="2">{{ auditTask.id }}</el-descriptions-item>
        <el-descriptions-item label="审核级别">
          <el-tag :type="getLevelTagType(auditTask.level)">
            {{ auditTask.levelName }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="审核状态">
          <el-tag :type="getStatusTagType(auditTask.status)">
            {{ getStatusText(auditTask.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="审核人">{{ auditTask.auditor || auditTask.auditorId }}</el-descriptions-item>
        <el-descriptions-item label="提交时间">
          {{ formatDateTime(auditTask.submittedAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="审核时间" v-if="auditTask.completedAt">
          {{ formatDateTime(auditTask.completedAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="审核决策" v-if="auditTask.decision">
          <el-tag :type="getDecisionTagType(auditTask.decision)">
            {{ getDecisionText(auditTask.decision) }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 关联任务信息 -->
    <el-card style="margin-top: 20px">
      <template #header>
        <span class="title">关联任务信息</span>
      </template>

      <el-descriptions :column="2" border>
        <el-descriptions-item label="任务ID" :span="2">{{ auditTask.task?.id || auditTask.taskId }}</el-descriptions-item>
        <el-descriptions-item label="任务名称">{{ auditTask.task?.nodeName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="任务类型">{{ auditTask.task?.nodeType || '-' }}</el-descriptions-item>
        <el-descriptions-item label="任务状态">
          <el-tag :type="getTaskStatusTagType(auditTask.task?.status)" size="small">
            {{ getTaskStatusText(auditTask.task?.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="任务优先级">
          <el-tag v-if="auditTask.task?.priority === 'URGENT'" type="danger" size="small">紧急</el-tag>
          <el-tag v-else-if="auditTask.task?.priority === 'HIGH'" type="warning" size="small">高</el-tag>
          <el-tag v-else type="info" size="small">普通</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="任务执行人">{{ auditTask.task?.assignedTo || '未分配' }}</el-descriptions-item>
        <el-descriptions-item label="任务分配时间">
          {{ auditTask.task?.assignedAt ? formatDateTime(auditTask.task.assignedAt) : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="任务完成时间">
          {{ auditTask.task?.completedAt ? formatDateTime(auditTask.task.completedAt) : '-' }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 关联样品信息（可选，可折叠） -->
    <el-card style="margin-top: 20px" v-if="auditTask.task?.instance?.sample">
      <template #header>
        <div class="card-header">
          <span class="title">关联样品信息（参考）</span>
          <el-button text @click="showSampleInfo = !showSampleInfo">
            {{ showSampleInfo ? '收起' : '展开' }}
          </el-button>
        </div>
      </template>

      <el-collapse-transition>
        <el-descriptions :column="2" border v-show="showSampleInfo">
          <el-descriptions-item label="样品名称">{{ auditTask.task.instance.sample.sampleName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="样品条码">{{ auditTask.task.instance.sample.barcode || '-' }}</el-descriptions-item>
          <el-descriptions-item label="样品类型">{{ auditTask.task.instance.sample.sampleType || '-' }}</el-descriptions-item>
          <el-descriptions-item label="样品分类">{{ auditTask.task.instance.sample.sampleCategory || '-' }}</el-descriptions-item>
          <el-descriptions-item label="委托方">{{ auditTask.task.instance.sample.clientName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="接收日期">
            {{ formatDate(auditTask.task.instance.sample.receivedDate) }}
          </el-descriptions-item>
          <el-descriptions-item label="样品状态">
            <el-tag :type="getSampleStatusType(auditTask.task.instance.sample.status)">
              {{ getSampleStatusText(auditTask.task.instance.sample.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="样品优先级">
            <el-tag v-if="auditTask.task.instance.sample.priority === 'URGENT'" type="danger" size="small">紧急</el-tag>
            <el-tag v-else-if="auditTask.task.instance.sample.priority === 'HIGH'" type="warning" size="small">高</el-tag>
            <el-tag v-else type="info" size="small">普通</el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </el-collapse-transition>
    </el-card>

    <!-- 任务相关数据（根据任务类型动态显示） -->
    <el-card style="margin-top: 20px" v-if="taskRelatedData">
      <template #header>
        <div class="card-header">
          <span class="title">{{ getTaskDataTitle() }}</span>
          <el-tag size="small">{{ auditTask.task?.nodeType || '任务类型' }}</el-tag>
        </div>
      </template>

      <!-- 检测任务：显示检测结果 -->
      <div v-if="isTestTask()">
        <el-table :data="testResults" border stripe v-if="testResults.length > 0">
          <el-table-column prop="parameter" label="检测参数" width="200" />
          <el-table-column label="检测结果" width="150">
            <template #default="{ row }">
              <span :class="{ 'anomaly-value': row.isAnomaly }">
                {{ row.value !== undefined && row.value !== null ? row.value : row.textValue || '-' }} {{ row.unit || '' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="method" label="检测方法" width="200" />
          <el-table-column label="数据来源" width="120">
            <template #default="{ row }">
              <el-tag :type="row.source === 'MANUAL' ? 'info' : 'success'" size="small">
                {{ row.source === 'MANUAL' ? '手工录入' : row.source === 'INSTRUMENT' ? '仪器导入' : '公式计算' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="operator" label="操作人" width="120" />
          <el-table-column label="录入时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.timestamp || row.enteredAt) }}
            </template>
          </el-table-column>
          <el-table-column label="异常标记" width="100">
            <template #default="{ row }">
              <el-tag v-if="row.isAnomaly || row.isAbnormal" type="danger" size="small">异常</el-tag>
              <el-tag v-else type="success" size="small">正常</el-tag>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="暂无检测结果数据" />
      </div>

      <!-- 研发任务：显示产品信息 -->
      <div v-else-if="isResearchTask()">
        <el-descriptions :column="2" border v-if="taskRelatedData.productInfo">
          <el-descriptions-item label="产品名称">{{ taskRelatedData.productInfo.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="产品编号">{{ taskRelatedData.productInfo.code || '-' }}</el-descriptions-item>
          <el-descriptions-item label="产品类型">{{ taskRelatedData.productInfo.type || '-' }}</el-descriptions-item>
          <el-descriptions-item label="研发阶段">{{ taskRelatedData.productInfo.stage || '-' }}</el-descriptions-item>
          <el-descriptions-item label="负责人">{{ taskRelatedData.productInfo.owner || '-' }}</el-descriptions-item>
          <el-descriptions-item label="开始日期">{{ formatDate(taskRelatedData.productInfo.startDate) }}</el-descriptions-item>
          <el-descriptions-item label="产品描述" :span="2">{{ taskRelatedData.productInfo.description || '-' }}</el-descriptions-item>
        </el-descriptions>
        <el-empty v-else description="暂无产品信息数据" />
      </div>

      <!-- 审批任务：显示审批信息 -->
      <div v-else-if="isApprovalTask()">
        <el-descriptions :column="2" border v-if="taskRelatedData.approvalInfo">
          <el-descriptions-item label="审批类型">{{ taskRelatedData.approvalInfo.type || '-' }}</el-descriptions-item>
          <el-descriptions-item label="申请人">{{ taskRelatedData.approvalInfo.applicant || '-' }}</el-descriptions-item>
          <el-descriptions-item label="申请时间">{{ formatDateTime(taskRelatedData.approvalInfo.applyTime) }}</el-descriptions-item>
          <el-descriptions-item label="审批状态">
            <el-tag :type="getApprovalStatusType(taskRelatedData.approvalInfo.status)">
              {{ taskRelatedData.approvalInfo.status || '-' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="审批内容" :span="2">{{ taskRelatedData.approvalInfo.content || '-' }}</el-descriptions-item>
          <el-descriptions-item label="审批金额" v-if="taskRelatedData.approvalInfo.amount">
            {{ taskRelatedData.approvalInfo.amount?.toLocaleString() }} {{ taskRelatedData.approvalInfo.currency || 'CNY' }}
          </el-descriptions-item>
          <el-descriptions-item label="审批原因" v-if="taskRelatedData.approvalInfo.reason" :span="2">
            {{ taskRelatedData.approvalInfo.reason }}
          </el-descriptions-item>
        </el-descriptions>
        
        <!-- 审批项目列表 -->
        <div v-if="taskRelatedData.items && taskRelatedData.items.length > 0" style="margin-top: 20px">
          <h4 style="margin-bottom: 10px">审批项目清单</h4>
          <el-table :data="taskRelatedData.items" border stripe>
            <el-table-column prop="name" label="项目名称" />
            <el-table-column prop="model" label="规格型号" />
            <el-table-column prop="quantity" label="数量" width="100" />
            <el-table-column label="单价" width="150">
              <template #default="{ row }">
                {{ row.unitPrice?.toLocaleString() }} 元
              </template>
            </el-table-column>
          </el-table>
        </div>
        
        <el-empty v-if="!taskRelatedData.approvalInfo" description="暂无审批信息数据" />
      </div>

      <!-- 校准任务：显示校准信息 -->
      <div v-else-if="isCalibrationTask()">
        <el-descriptions :column="2" border v-if="taskRelatedData.calibrationInfo">
          <el-descriptions-item label="设备名称">{{ taskRelatedData.calibrationInfo.equipmentName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="设备编号">{{ taskRelatedData.calibrationInfo.equipmentId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="校准日期">{{ formatDate(taskRelatedData.calibrationInfo.calibrationDate) }}</el-descriptions-item>
          <el-descriptions-item label="下次校准日期">{{ formatDate(taskRelatedData.calibrationInfo.nextCalibrationDate) }}</el-descriptions-item>
          <el-descriptions-item label="校准人员">{{ taskRelatedData.calibrationInfo.calibrator || '-' }}</el-descriptions-item>
          <el-descriptions-item label="校准结果">
            <el-tag :type="taskRelatedData.calibrationInfo.result === 'qualified' ? 'success' : 'danger'">
              {{ taskRelatedData.calibrationInfo.result === 'qualified' ? '合格' : '不合格' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="精度">{{ taskRelatedData.calibrationInfo.accuracy || '-' }}</el-descriptions-item>
          <el-descriptions-item label="证书编号">{{ taskRelatedData.calibrationInfo.certificate || '-' }}</el-descriptions-item>
        </el-descriptions>
        
        <!-- 校准测试点 -->
        <div v-if="taskRelatedData.testPoints && taskRelatedData.testPoints.length > 0" style="margin-top: 20px">
          <h4 style="margin-bottom: 10px">校准测试点</h4>
          <el-table :data="taskRelatedData.testPoints" border stripe>
            <el-table-column prop="weight" label="标准值" width="120" />
            <el-table-column prop="measured" label="测量值" width="120" />
            <el-table-column prop="deviation" label="偏差" width="120" />
            <el-table-column label="结果" width="100">
              <template #default="{ row }">
                <el-tag :type="row.result === 'pass' ? 'success' : 'danger'" size="small">
                  {{ row.result === 'pass' ? '通过' : '不通过' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
        
        <el-empty v-if="!taskRelatedData.calibrationInfo" description="暂无校准信息数据" />
      </div>

      <!-- 生产任务：显示生产信息 -->
      <div v-else-if="isProductionTask()">
        <el-descriptions :column="2" border v-if="taskRelatedData.productionInfo">
          <el-descriptions-item label="批次号">{{ taskRelatedData.productionInfo.batchNumber || '-' }}</el-descriptions-item>
          <el-descriptions-item label="产品名称">{{ taskRelatedData.productionInfo.productName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="生产数量">
            {{ taskRelatedData.productionInfo.quantity || '-' }} {{ taskRelatedData.productionInfo.unit || '' }}
          </el-descriptions-item>
          <el-descriptions-item label="质量状态">
            <el-tag :type="taskRelatedData.productionInfo.qualityStatus === 'qualified' ? 'success' : 'warning'">
              {{ taskRelatedData.productionInfo.qualityStatus === 'qualified' ? '合格' : '待检验' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="开始时间">{{ formatDateTime(taskRelatedData.productionInfo.startTime) }}</el-descriptions-item>
          <el-descriptions-item label="预计完成时间">{{ formatDateTime(taskRelatedData.productionInfo.expectedEndTime) }}</el-descriptions-item>
          <el-descriptions-item label="当前进度" :span="2">
            <el-progress :percentage="taskRelatedData.productionInfo.currentProgress || 0" />
          </el-descriptions-item>
        </el-descriptions>
        
        <!-- 工艺优化项 -->
        <div v-if="taskRelatedData.optimizations && taskRelatedData.optimizations.length > 0" style="margin-top: 20px">
          <h4 style="margin-bottom: 10px">工艺优化项</h4>
          <el-table :data="taskRelatedData.optimizations" border stripe>
            <el-table-column prop="item" label="优化项目" width="150" />
            <el-table-column prop="before" label="优化前" width="150" />
            <el-table-column prop="after" label="优化后" width="150" />
            <el-table-column prop="improvement" label="改进效果" />
          </el-table>
        </div>
        
        <el-empty v-if="!taskRelatedData.productionInfo" description="暂无生产信息数据" />
      </div>

      <!-- 评审任务：显示文档信息 -->
      <div v-else-if="isReviewTask()">
        <el-descriptions :column="2" border v-if="taskRelatedData.documentInfo">
          <el-descriptions-item label="文档标题" :span="2">{{ taskRelatedData.documentInfo.title || '-' }}</el-descriptions-item>
          <el-descriptions-item label="文档类型">{{ taskRelatedData.documentInfo.documentType || '-' }}</el-descriptions-item>
          <el-descriptions-item label="版本号">{{ taskRelatedData.documentInfo.version || '-' }}</el-descriptions-item>
          <el-descriptions-item label="作者">{{ taskRelatedData.documentInfo.author || '-' }}</el-descriptions-item>
          <el-descriptions-item label="提交日期">{{ formatDate(taskRelatedData.documentInfo.submitDate) }}</el-descriptions-item>
          <el-descriptions-item label="页数">{{ taskRelatedData.documentInfo.pageCount || '-' }} 页</el-descriptions-item>
        </el-descriptions>
        
        <!-- 变更内容 -->
        <div v-if="taskRelatedData.documentInfo.changes && taskRelatedData.documentInfo.changes.length > 0" style="margin-top: 20px">
          <h4 style="margin-bottom: 10px">主要变更内容</h4>
          <ul style="padding-left: 20px">
            <li v-for="(change, index) in taskRelatedData.documentInfo.changes" :key="index" style="margin: 8px 0">
              {{ change }}
            </li>
          </ul>
        </div>
        
        <!-- 评审人员 -->
        <div v-if="taskRelatedData.reviewers && taskRelatedData.reviewers.length > 0" style="margin-top: 20px">
          <h4 style="margin-bottom: 10px">评审人员</h4>
          <el-table :data="taskRelatedData.reviewers" border stripe>
            <el-table-column prop="name" label="评审人" />
            <el-table-column label="评审状态" width="120">
              <template #default="{ row }">
                <el-tag :type="row.status === 'approved' ? 'success' : row.status === 'rejected' ? 'danger' : 'warning'" size="small">
                  {{ row.status === 'approved' ? '已通过' : row.status === 'rejected' ? '已拒绝' : '待评审' }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
        
        <el-empty v-if="!taskRelatedData.documentInfo" description="暂无文档信息数据" />
      </div>

      <!-- 通用任务：显示任务结果（JSON格式） -->
      <div v-else>
        <el-descriptions :column="1" border v-if="auditTask.task?.result">
          <el-descriptions-item label="任务结果数据">
            <pre style="margin: 0; white-space: pre-wrap; max-height: 400px; overflow-y: auto;">{{ JSON.stringify(auditTask.task.result, null, 2) }}</pre>
          </el-descriptions-item>
        </el-descriptions>
        <el-empty v-else description="暂无任务相关数据" />
      </div>
    </el-card>

    <!-- 历史记录时间线 -->
    <el-card style="margin-top: 20px">
      <template #header>
        <span class="title">审核历史</span>
      </template>

      <el-timeline>
        <el-timeline-item
          v-for="record in auditHistory"
          :key="record.id"
          :timestamp="formatDateTime(record.timestamp)"
          :type="getTimelineType(record.action)"
          placement="top"
        >
          <el-card>
            <div class="history-item">
              <div class="history-header">
                <span class="history-action">{{ record.action }}</span>
                <el-tag :type="getHistoryTagType(record.result)" size="small">
                  {{ record.result }}
                </el-tag>
              </div>
              <div class="history-content">
                <p><strong>操作人：</strong>{{ record.operator }}</p>
                <p><strong>审核级别：</strong>{{ record.levelName }}</p>
                <p v-if="record.comments"><strong>审核意见：</strong>{{ record.comments }}</p>
              </div>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>
    </el-card>

    <!-- 审核操作区域 - 已隐藏 -->
    <!--
    <el-card v-if="auditTask.status === 'pending'" style="margin-top: 20px">
      <template #header>
        <span class="title">审核操作</span>
      </template>

      <el-form :model="auditForm" :rules="auditRules" ref="auditFormRef" label-width="100px">
        <el-form-item label="审核意见" prop="comments">
          <div class="comments-input-wrapper">
            <el-input
              v-model="auditForm.comments"
              type="textarea"
              :rows="4"
              placeholder="请输入审核意见"
              maxlength="500"
              show-word-limit
            />
            <TemplateSelector
              v-if="canUseTemplate"
              :show-search="true"
              @select="handleTemplateSelect"
            />
          </div>
        </el-form-item>

        <el-form-item label="附件">
          <el-upload
            v-model:file-list="auditForm.attachments"
            action="#"
            :auto-upload="false"
            :limit="5"
          >
            <el-button type="primary">
              <el-icon><Upload /></el-icon>
              上传附件
            </el-button>
            <template #tip>
              <div class="el-upload__tip">
                支持上传 PDF、Word、Excel、图片等文件，单个文件不超过 10MB
              </div>
            </template>
          </el-upload>
        </el-form-item>

        <el-form-item>
          <el-button
            type="success"
            size="large"
            @click="handleApprove"
            :loading="submitting"
          >
            <el-icon><Check /></el-icon>
            通过审核
          </el-button>
          <el-button
            type="danger"
            size="large"
            @click="handleReject"
            :loading="submitting"
          >
            <el-icon><Close /></el-icon>
            退回
          </el-button>
          <el-button
            type="warning"
            size="large"
            @click="handleReturn"
            :loading="submitting"
          >
            <el-icon><Warning /></el-icon>
            要求补充
          </el-button>
          <el-button size="large" @click="handleBack">
            取消
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
    -->

    <!-- 已审核的意见展示 -->
    <el-card style="margin-top: 20px">
      <template #header>
        <span class="title">审核意见</span>
      </template>

      <el-descriptions :column="1" border>
        <el-descriptions-item label="审核结果">
          <el-tag :type="getStatusTagType(auditTask.status)" size="large">
            {{ getStatusText(auditTask.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="审核意见">
          {{ auditTask.comments || '无' }}
        </el-descriptions-item>
        <el-descriptions-item label="审核时间" v-if="auditTask.completedAt">
          {{ formatDateTime(auditTask.completedAt) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Upload, Check, Close, Warning } from '@element-plus/icons-vue'
import type { AuditTask, Sample, TestResult } from '@/types'
import { auditService } from '@/services/auditService'
import type { AuditDecision } from '@/types/audit'
import { useAuthStore } from '@/stores/auth'
import WorkflowInfo from '@/components/audit/WorkflowInfo.vue'
import TemplateSelector from '@/components/audit/TemplateSelector.vue'
import type { CommentTemplate } from '@/stores/template'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// 权限判断
const canUseTemplate = computed(() => {
  return authStore.hasAnyRole(['auditor', 'senior_auditor', 'audit_supervisor', 'admin'])
})

// 表单引用
const auditFormRef = ref<FormInstance>()

// 数据
const loading = ref(false)
const submitting = ref(false)
const showSampleInfo = ref(false) // 控制样品信息的展开/收起

const auditTask = ref<AuditTask>({
  id: '',
  taskId: '',
  sampleName: '',
  sampleBarcode: '',
  level: 1,
  levelName: '',
  auditor: '',
  status: 'pending',
  priority: 'normal',
  submittedAt: new Date(),
  auditedAt: null,
  comments: ''
})

const sampleInfo = ref<Sample>({
  id: '',
  barcode: '',
  name: '',
  source: '',
  client: '',
  receivedDate: new Date(),
  sampleType: '',
  quantity: 0,
  unit: '',
  status: 'registered',
  currentLocation: '',
  createdBy: '',
  createdAt: new Date(),
  updatedAt: new Date()
})

const testResults = ref<TestResult[]>([])

const testItems = ref<any[]>([])

const auditHistory = ref<any[]>([])

// 判断是否为检测任务
const isTestTask = () => {
  const nodeType = auditTask.value.task?.nodeType?.toUpperCase() || ''
  const nodeName = auditTask.value.task?.nodeName?.toLowerCase() || ''
  return nodeType === 'TASK' || nodeType.includes('TEST') || nodeName.includes('检测') || nodeName.includes('测试')
}

// 判断是否为研发任务
const isResearchTask = () => {
  const nodeType = auditTask.value.task?.nodeType?.toUpperCase() || ''
  const nodeName = auditTask.value.task?.nodeName?.toLowerCase() || ''
  return nodeType.includes('RESEARCH') || nodeType.includes('RD') || nodeName.includes('研发') || nodeName.includes('开发')
}

// 判断是否为审批任务
const isApprovalTask = () => {
  const nodeType = auditTask.value.task?.nodeType?.toUpperCase() || ''
  const nodeName = auditTask.value.task?.nodeName?.toLowerCase() || ''
  return nodeType.includes('APPROVAL') || nodeName.includes('审批') || nodeName.includes('批准')
}

// 判断是否为校准任务
const isCalibrationTask = () => {
  const nodeType = auditTask.value.task?.nodeType?.toUpperCase() || ''
  const nodeName = auditTask.value.task?.nodeName?.toLowerCase() || ''
  return nodeType.includes('CALIBRATION') || nodeName.includes('校准') || nodeName.includes('校验')
}

// 判断是否为生产任务
const isProductionTask = () => {
  const nodeType = auditTask.value.task?.nodeType?.toUpperCase() || ''
  const nodeName = auditTask.value.task?.nodeName?.toLowerCase() || ''
  return nodeType.includes('PRODUCTION') || nodeName.includes('生产') || nodeName.includes('制造')
}

// 判断是否为评审任务
const isReviewTask = () => {
  const nodeType = auditTask.value.task?.nodeType?.toUpperCase() || ''
  const nodeName = auditTask.value.task?.nodeName?.toLowerCase() || ''
  return nodeType.includes('REVIEW') || nodeName.includes('评审') || nodeName.includes('审查')
}

// 获取任务数据标题
const getTaskDataTitle = () => {
  if (isTestTask()) return '检测数据'
  if (isResearchTask()) return '产品信息'
  if (isApprovalTask()) return '审批信息'
  if (isCalibrationTask()) return '校准信息'
  if (isProductionTask()) return '生产信息'
  if (isReviewTask()) return '评审信息'
  return '任务相关数据'
}

// 任务相关数据（根据任务类型动态加载）
const taskRelatedData = computed(() => {
  if (!auditTask.value.task) return null
  
  // 如果任务结果中有数据，返回
  if (auditTask.value.task.result) {
    console.log('=== 任务数据调试 ===')
    console.log('任务类型 (nodeType):', auditTask.value.task.nodeType)
    console.log('任务名称 (nodeName):', auditTask.value.task.nodeName)
    console.log('任务结果数据:', auditTask.value.task.result)
    console.log('是否为校准任务:', isCalibrationTask())
    console.log('是否为生产任务:', isProductionTask())
    console.log('是否为评审任务:', isReviewTask())
    console.log('==================')
    return auditTask.value.task.result
  }
  
  // 如果有检测结果，返回
  if (testResults.value.length > 0) {
    return { testResults: testResults.value }
  }
  
  return null
})

// 审核表单
const auditForm = reactive({
  comments: '',
  attachments: [] as any[]
})

// 表单验证规则
const auditRules: FormRules = {
  comments: [
    { required: true, message: '请输入审核意见', trigger: 'blur' },
    { min: 5, message: '审核意见至少5个字符', trigger: 'blur' }
  ]
}

// 获取审核级别标签类型
const getLevelTagType = (level: number) => {
  const types = ['', 'success', 'primary', 'warning', 'danger']
  return types[level] || 'info'
}

// 获取任务状态标签类型
const getTaskStatusTagType = (status: string) => {
  const typeMap: Record<string, string> = {
    PENDING: 'info',
    IN_PROGRESS: 'warning',
    COMPLETED: 'success',
    REJECTED: 'danger',
    CANCELLED: 'info'
  }
  return typeMap[status] || 'info'
}

// 获取任务状态文本
const getTaskStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    PENDING: '待执行',
    IN_PROGRESS: '执行中',
    COMPLETED: '已完成',
    REJECTED: '已拒绝',
    CANCELLED: '已取消'
  }
  return textMap[status] || status
}

// 获取审核决策标签类型
const getDecisionTagType = (decision: string) => {
  const typeMap: Record<string, string> = {
    APPROVE: 'success',
    REJECT: 'danger',
    RETURN: 'warning'
  }
  return typeMap[decision] || 'info'
}

// 获取审核决策文本
const getDecisionText = (decision: string) => {
  const textMap: Record<string, string> = {
    APPROVE: '通过',
    REJECT: '退回',
    RETURN: '要求补充'
  }
  return textMap[decision] || decision
}

// 获取状态标签类型
const getStatusTagType = (status: string) => {
  const typeMap: Record<string, string> = {
    pending: 'warning',
    PENDING: 'warning',
    approved: 'success',
    APPROVED: 'success',
    rejected: 'danger',
    REJECTED: 'danger',
    returned: 'info',
    IN_PROGRESS: 'primary'
  }
  return typeMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    pending: '待审核',
    PENDING: '待审核',
    approved: '已通过',
    APPROVED: '已通过',
    rejected: '已退回',
    REJECTED: '已退回',
    returned: '要求补充',
    IN_PROGRESS: '审核中'
  }
  return textMap[status] || status
}

// 获取样品状态类型
const getSampleStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    registered: 'info',
    in_progress: 'warning',
    completed: 'primary',
    released: 'success',
    returned: 'danger'
  }
  return typeMap[status] || 'info'
}

// 获取样品状态文本
const getSampleStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    registered: '已登记',
    REGISTERED: '已登记',
    in_progress: '检测中',
    IN_TESTING: '检测中',
    completed: '已完成',
    TESTING_COMPLETE: '检测完成',
    IN_AUDIT: '审核中',
    AUDIT_COMPLETE: '审核完成',
    released: '已放行',
    RELEASED: '已放行',
    returned: '已退回',
    ARCHIVED: '已归档'
  }
  return textMap[status] || status
}

// 获取检测项目状态类型
const getTestItemStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    PENDING: 'info',
    IN_PROGRESS: 'warning',
    COMPLETED: 'success',
    ABNORMAL: 'danger'
  }
  return typeMap[status] || 'info'
}

// 获取检测项目状态文本
const getTestItemStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    PENDING: '待检测',
    IN_PROGRESS: '检测中',
    COMPLETED: '已完成',
    ABNORMAL: '异常'
  }
  return textMap[status] || status
}

// 获取时间线类型
const getTimelineType = (action: string) => {
  if (action.includes('通过')) return 'success'
  if (action.includes('退回')) return 'danger'
  if (action.includes('补充')) return 'warning'
  return 'primary'
}

// 获取历史记录标签类型
const getHistoryTagType = (result: string) => {
  const typeMap: Record<string, string> = {
    '通过': 'success',
    '退回': 'danger',
    '要求补充': 'warning',
    '提交': 'info'
  }
  return typeMap[result] || 'info'
}

// 格式化日期时间
const formatDateTime = (date: Date | string | null) => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 格式化日期
const formatDate = (date: Date | string) => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}



// 获取审批状态类型
const getApprovalStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    'pending': 'warning',
    'approved': 'success',
    'rejected': 'danger'
  }
  return typeMap[status?.toLowerCase()] || 'info'
}

// 加载审核任务详情
const loadAuditTaskDetail = async () => {
  loading.value = true
  try {
    const taskId = route.params.id as string
    
    // 调用真实API获取审核任务详情
    const taskData = await auditService.getAuditTask(taskId)
    auditTask.value = taskData
    
    console.log('=== 审核任务数据 ===')
    console.log('完整数据:', taskData)
    console.log('task:', taskData.task)
    console.log('task.instance:', taskData.task?.instance)
    console.log('task.instance.sample:', taskData.task?.instance?.sample)
    console.log('task.instance.sample.results:', taskData.task?.instance?.sample?.results)
    console.log('==================')
    
    // 如果任务数据包含任务信息和样品信息,直接使用
    if (taskData.task) {
      // 从嵌套结构中提取样品信息
      if (taskData.task.instance?.sample) {
        const sample = taskData.task.instance.sample
        Object.assign(sampleInfo.value, {
          id: sample.id,
          barcode: sample.barcode,
          name: sample.sampleName || sample.clientName || '未命名样品',
          source: sample.samplingLocation || '',
          client: sample.clientName || '',
          receivedDate: sample.receivedDate ? new Date(sample.receivedDate) : new Date(),
          sampleType: sample.sampleType || '',
          quantity: 0,
          unit: '',
          status: sample.status || 'REGISTERED',
          currentLocation: sample.storageLocation || '',
          createdBy: '',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        
        console.log('样品信息已提取:', sampleInfo.value)
        
        // 提取检测结果
        if (sample.results && Array.isArray(sample.results)) {
          testResults.value = sample.results.map((result: any) => ({
            id: result.id,
            sampleId: result.sampleId,
            taskId: '',
            testItemId: result.testItemId,
            testItemName: result.parameter,
            parameter: result.parameter,
            value: result.value,
            textValue: result.textValue,
            unit: result.unit || '',
            method: result.method || '',
            source: result.source || 'MANUAL',
            instrumentId: result.instrumentId || '',
            operator: result.enteredBy || '',
            enteredBy: result.enteredBy || '',
            timestamp: result.enteredAt ? new Date(result.enteredAt) : new Date(),
            enteredAt: result.enteredAt,
            isAnomaly: result.isAbnormal || false,
            isAbnormal: result.isAbnormal || false,
            abnormalReason: result.abnormalReason || ''
          }))
          
          console.log('检测结果已提取:', testResults.value.length, '条')
          console.log('检测结果详情:', testResults.value)
        } else {
          console.log('未找到检测结果数据')
          testResults.value = []
        }
      }
    } else if (taskData.sample) {
      // 兼容旧版本API,直接使用样品信息
      Object.assign(sampleInfo.value, taskData.sample)
      
      // 提取检测结果
      if (taskData.sample.results) {
        testResults.value = taskData.sample.results
      }
    }
    
    // 获取审核历史
    try {
      const historyData = await auditService.getAuditHistory(taskId)
      auditHistory.value = historyData
    } catch (error) {
      console.log('获取审核历史失败（可能API未实现）:', error)
      auditHistory.value = []
    }
    
  } catch (error) {
    console.error('加载审核任务详情失败:', error)
    ElMessage.error('加载审核任务详情失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 选择模板
const handleTemplateSelect = (template: CommentTemplate) => {
  // 将模板内容插入到审核意见输入框
  if (auditForm.comments) {
    auditForm.comments += '\n' + template.content
  } else {
    auditForm.comments = template.content
  }
  ElMessage.success('模板已插入')
}

// 通过审核
const handleApprove = async () => {
  if (!auditFormRef.value) return
  
  try {
    await auditFormRef.value.validate()
    
    await ElMessageBox.confirm(
      '确认通过此审核任务？',
      '通过审核',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'success'
      }
    )
    
    submitting.value = true
    
    // 调用真实API执行审核操作
    const decision: AuditDecision = {
      taskId: auditTask.value.id,
      decision: 'approved',
      comments: auditForm.comments,
      attachments: auditForm.attachments.map(item => item.raw).filter(Boolean)
    }
    
    const result = await auditService.performAudit(auditTask.value.id, decision)
    
    if (result.success) {
      ElMessage.success(result.message || '审核通过成功')
      router.push({ name: 'AuditTaskList' })
    } else {
      ElMessage.error(result.message || '审核操作失败')
    }
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('审核通过失败:', error)
      ElMessage.error('操作失败，请稍后重试')
    }
  } finally {
    submitting.value = false
  }
}

// 退回
const handleReject = async () => {
  if (!auditFormRef.value) return
  
  try {
    await auditFormRef.value.validate()
    
    await ElMessageBox.confirm(
      '确认退回此审核任务？退回后需要重新提交审核。',
      '退回审核',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    submitting.value = true
    
    // 调用真实API执行审核操作
    const decision: AuditDecision = {
      taskId: auditTask.value.id,
      decision: 'rejected',
      comments: auditForm.comments,
      attachments: auditForm.attachments.map(item => item.raw).filter(Boolean)
    }
    
    const result = await auditService.performAudit(auditTask.value.id, decision)
    
    if (result.success) {
      ElMessage.success(result.message || '审核退回成功')
      router.push({ name: 'AuditTaskList' })
    } else {
      ElMessage.error(result.message || '审核操作失败')
    }
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('审核退回失败:', error)
      ElMessage.error('操作失败，请稍后重试')
    }
  } finally {
    submitting.value = false
  }
}

// 要求补充
const handleReturn = async () => {
  if (!auditFormRef.value) return
  
  try {
    await auditFormRef.value.validate()
    
    await ElMessageBox.confirm(
      '确认要求补充信息？操作人员将收到通知。',
      '要求补充',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    submitting.value = true
    
    // 调用真实API执行审核操作
    const decision: AuditDecision = {
      taskId: auditTask.value.id,
      decision: 'returned',
      comments: auditForm.comments,
      attachments: auditForm.attachments.map(item => item.raw).filter(Boolean)
    }
    
    const result = await auditService.performAudit(auditTask.value.id, decision)
    
    if (result.success) {
      ElMessage.success(result.message || '已要求补充信息')
      router.push({ name: 'AuditTaskList' })
    } else {
      ElMessage.error(result.message || '审核操作失败')
    }
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('要求补充失败:', error)
      ElMessage.error('操作失败，请稍后重试')
    }
  } finally {
    submitting.value = false
  }
}

// 返回
const handleBack = () => {
  router.back()
}

// 初始化
onMounted(() => {
  loadAuditTaskDetail()
})
</script>

<style scoped>
.audit-task-detail {
  padding: 20px;
}

.page-title {
  font-size: 18px;
  font-weight: bold;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 16px;
  font-weight: bold;
}

.anomaly-value {
  color: #f56c6c;
  font-weight: bold;
}

.history-item {
  padding: 10px;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.history-action {
  font-size: 16px;
  font-weight: bold;
}

.history-content p {
  margin: 5px 0;
  color: #606266;
}

.comments-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comments-input-wrapper :deep(.el-textarea) {
  flex: 1;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .audit-task-detail {
    padding: 12px;
  }

  .comments-input-wrapper {
    gap: 8px;
  }
}
</style>
