<template>
  <div class="instrument-detail">
    <el-card v-loading="loading" shadow="never">
      <!-- 操作栏 -->
      <template #header>
        <div class="card-header">
          <span>仪器详情</span>
          <el-space>
            <el-button link @click="handleBack">返回列表</el-button>
            <el-button type="primary" @click="handleEdit">编辑</el-button>
            <el-button type="warning" @click="handleTransfer">流转</el-button>
            <el-button type="success" @click="handleMaintenance">维护</el-button>
            <el-button type="primary" @click="handleCalibration">校准</el-button>
            <el-button type="danger" @click="handleDisposal">报废</el-button>
          </el-space>
        </div>
      </template>

      <div v-if="instrument">
        <!-- 基本信息 -->
        <el-descriptions title="基本信息" :column="2" border>
          <el-descriptions-item label="仪器编码">
            {{ instrument.code }}
          </el-descriptions-item>
          <el-descriptions-item label="仪器名称">
            {{ instrument.name }}
          </el-descriptions-item>
          <el-descriptions-item label="型号">
            {{ instrument.model || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="制造商">
            {{ instrument.manufacturer || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="序列号">
            {{ instrument.serialNumber || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(instrument.status)">
              {{ InstrumentStatusLabels[instrument.status] }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="当前位置">
            {{ instrument.currentLocation || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="所属部门">
            {{ instrument.currentDepartment || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="负责人">
            {{ instrument.currentResponsible || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="购置日期">
            {{ instrument.purchaseDate ? formatDate(instrument.purchaseDate) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="购置价格">
            {{ instrument.purchasePrice ? `¥${instrument.purchasePrice.toLocaleString()}` : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="使用年限">
            {{ instrument.usageYears ? `${instrument.usageYears}年` : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="保修到期">
            {{ instrument.warrantyExpiry ? formatDate(instrument.warrantyExpiry) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDateTime(instrument.createdAt) }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 技术参数 -->
        <el-descriptions
          v-if="instrument.technicalParams && Object.keys(instrument.technicalParams).length > 0"
          title="技术参数"
          :column="2"
          border
          style="margin-top: 20px"
        >
          <el-descriptions-item
            v-for="(value, key) in instrument.technicalParams"
            :key="key"
            :label="String(key)"
          >
            {{ value }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 描述信息 -->
        <el-descriptions
          v-if="instrument.description || instrument.remarks"
          title="描述信息"
          :column="1"
          border
          style="margin-top: 20px"
        >
          <el-descriptions-item v-if="instrument.description" label="描述">
            {{ instrument.description }}
          </el-descriptions-item>
          <el-descriptions-item v-if="instrument.remarks" label="备注">
            {{ instrument.remarks }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 流转历史 -->
        <div style="margin-top: 30px">
          <el-divider content-position="left">
            <span style="font-size: 16px; font-weight: bold">流转历史</span>
          </el-divider>
          <TransferTimeline :instrument-id="instrumentId" />
        </div>

        <!-- 维护记录 -->
        <div style="margin-top: 30px">
          <el-divider content-position="left">
            <span style="font-size: 16px; font-weight: bold">维护记录</span>
          </el-divider>
          <MaintenanceTimeline :instrument-id="instrumentId" />
        </div>

        <!-- 校准记录 -->
        <div style="margin-top: 30px">
          <el-divider content-position="left">
            <span style="font-size: 16px; font-weight: bold">校准记录</span>
          </el-divider>
          <CalibrationTimeline :instrument-id="instrumentId" />
        </div>

        <!-- 关联文档 -->
        <div style="margin-top: 30px">
          <el-divider content-position="left">
            <span style="font-size: 16px; font-weight: bold">关联文档</span>
          </el-divider>
          <DocumentUpload :instrument-id="instrumentId" @uploaded="loadInstrument" />
        </div>
      </div>
    </el-card>

    <!-- 流转对话框 -->
    <TransferDialog
      v-model="transferDialogVisible"
      :instrument-id="instrumentId"
      @success="handleTransferSuccess"
    />

    <!-- 维护对话框 -->
    <MaintenanceDialog
      v-model="maintenanceDialogVisible"
      :instrument-id="instrumentId"
      @success="handleMaintenanceSuccess"
    />

    <!-- 校准对话框 -->
    <CalibrationDialog
      v-model="calibrationDialogVisible"
      :instrument-id="instrumentId"
      @success="handleCalibrationSuccess"
    />

    <!-- 报废对话框 -->
    <DisposalDialog
      v-model="disposalDialogVisible"
      :instrument-id="instrumentId"
      @success="handleDisposalSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useInstrumentStore } from '@/stores/instrument'
import {
  InstrumentStatus,
  InstrumentStatusLabels
} from '@/types/instrument'
import DocumentUpload from '@/components/instrument/DocumentUpload.vue'
import TransferTimeline from '@/components/instrument/TransferTimeline.vue'
import MaintenanceTimeline from '@/components/instrument/MaintenanceTimeline.vue'
import CalibrationTimeline from '@/components/instrument/CalibrationTimeline.vue'
import TransferDialog from '@/components/instrument/TransferDialog.vue'
import MaintenanceDialog from '@/components/instrument/MaintenanceDialog.vue'
import CalibrationDialog from '@/components/instrument/CalibrationDialog.vue'
import DisposalDialog from '@/components/instrument/DisposalDialog.vue'

const router = useRouter()
const route = useRoute()
const instrumentStore = useInstrumentStore()

// 仪器ID
const instrumentId = computed(() => route.params.id as string)

// 加载状态
const loading = computed(() => instrumentStore.loading)

// 当前仪器
const instrument = computed(() => instrumentStore.currentInstrument)

// 对话框显示状态
const transferDialogVisible = ref(false)
const maintenanceDialogVisible = ref(false)
const calibrationDialogVisible = ref(false)
const disposalDialogVisible = ref(false)

// 加载仪器信息
const loadInstrument = async () => {
  try {
    await instrumentStore.fetchInstrumentById(instrumentId.value)
  } catch (error: any) {
    ElMessage.error(error.message || '加载仪器信息失败')
    handleBack()
  }
}

// 返回列表
const handleBack = () => {
  router.push('/instrument/management')
}

// 编辑
const handleEdit = () => {
  router.push(`/instrument/registration?id=${instrumentId.value}`)
}

// 流转
const handleTransfer = () => {
  transferDialogVisible.value = true
}

// 维护
const handleMaintenance = () => {
  maintenanceDialogVisible.value = true
}

// 校准
const handleCalibration = () => {
  calibrationDialogVisible.value = true
}

// 报废
const handleDisposal = () => {
  disposalDialogVisible.value = true
}

// 流转成功
const handleTransferSuccess = () => {
  ElMessage.success('流转申请已提交')
  loadInstrument()
}

// 维护成功
const handleMaintenanceSuccess = () => {
  ElMessage.success('维护记录已添加')
  loadInstrument()
}

// 校准成功
const handleCalibrationSuccess = () => {
  ElMessage.success('校准记录已添加')
  loadInstrument()
}

// 报废成功
const handleDisposalSuccess = () => {
  ElMessage.success('报废申请已提交')
  loadInstrument()
}

// 获取状态标签类型
const getStatusType = (status: InstrumentStatus): string => {
  const typeMap: Record<InstrumentStatus, string> = {
    [InstrumentStatus.IN_USE]: 'success',
    [InstrumentStatus.STANDBY]: 'info',
    [InstrumentStatus.MAINTENANCE]: 'warning',
    [InstrumentStatus.CALIBRATING]: 'primary',
    [InstrumentStatus.PENDING_DISPOSAL]: 'warning',
    [InstrumentStatus.DISPOSED]: 'danger'
  }
  return typeMap[status] || 'info'
}

// 格式化日期
const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('zh-CN')
}

// 格式化日期时间
const formatDateTime = (date: string): string => {
  return new Date(date).toLocaleString('zh-CN')
}

// 组件挂载时加载数据
onMounted(() => {
  loadInstrument()
})
</script>

<style scoped>
.instrument-detail {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .instrument-detail {
    padding: 10px;
  }

  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .card-header .el-space {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
