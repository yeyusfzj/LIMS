<template>
  <div class="transfer-timeline">
    <el-timeline v-if="transfers.length > 0">
      <el-timeline-item
        v-for="transfer in transfers"
        :key="transfer.id"
        :timestamp="formatDateTime(transfer.createdAt)"
        placement="top"
      >
        <el-card>
          <div class="transfer-info">
            <div class="transfer-header">
              <span class="transfer-title">
                {{ transfer.fromDepartment }} → {{ transfer.toDepartment }}
              </span>
              <el-tag :type="getTransferStatusType(transfer.status)">
                {{ TransferStatusLabels[transfer.status] }}
              </el-tag>
            </div>
            <div class="transfer-details">
              <p><strong>流转人员:</strong> {{ transfer.fromResponsible }} → {{ transfer.toResponsible }}</p>
              <p v-if="transfer.transferReason"><strong>流转原因:</strong> {{ transfer.transferReason }}</p>
              <p v-if="transfer.expectedReturnDate">
                <strong>预计归还:</strong> {{ formatDate(transfer.expectedReturnDate) }}
              </p>
              <p v-if="transfer.confirmedAt">
                <strong>确认时间:</strong> {{ formatDateTime(transfer.confirmedAt) }}
              </p>
              <p v-if="transfer.rejectionReason">
                <strong>拒绝原因:</strong> {{ transfer.rejectionReason }}
              </p>
            </div>
          </div>
        </el-card>
      </el-timeline-item>
    </el-timeline>
    <el-empty v-else description="暂无流转记录" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useInstrumentStore } from '@/stores/instrument'
import {
  TransferStatusLabels,
  InstrumentTransferStatus,
  type InstrumentTransfer
} from '@/types/instrument'

interface Props {
  instrumentId: string
}

const props = defineProps<Props>()
const instrumentStore = useInstrumentStore()

const transfers = ref<InstrumentTransfer[]>([])

const loadTransfers = async () => {
  try {
    transfers.value = await instrumentStore.fetchInstrumentTransfers(props.instrumentId)
  } catch (error: any) {
    ElMessage.error(error.message || '加载流转记录失败')
  }
}

const getTransferStatusType = (status: InstrumentTransferStatus): string => {
  const typeMap: Record<InstrumentTransferStatus, string> = {
    [InstrumentTransferStatus.PENDING]: 'warning',
    [InstrumentTransferStatus.CONFIRMED]: 'primary',
    [InstrumentTransferStatus.REJECTED]: 'danger',
    [InstrumentTransferStatus.COMPLETED]: 'success'
  }
  return typeMap[status] || 'info'
}

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('zh-CN')
}

const formatDateTime = (date: string): string => {
  return new Date(date).toLocaleString('zh-CN')
}

onMounted(() => {
  loadTransfers()
})
</script>

<style scoped>
.transfer-timeline {
  padding: 20px 0;
}

.transfer-info {
  padding: 10px;
}

.transfer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.transfer-title {
  font-size: 16px;
  font-weight: bold;
}

.transfer-details p {
  margin: 5px 0;
  color: #606266;
}
</style>
