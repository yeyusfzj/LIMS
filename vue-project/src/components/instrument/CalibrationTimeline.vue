<template>
  <div class="calibration-timeline">
    <div style="margin-bottom: 10px">
      <el-button type="primary" size="small" @click="emit('add')">
        添加校准记录
      </el-button>
    </div>
    
    <el-timeline v-if="records.length > 0">
      <el-timeline-item
        v-for="record in records"
        :key="record.id"
        :timestamp="formatDateTime(record.calibrationDate)"
        placement="top"
      >
        <el-card>
          <div class="calibration-info">
            <div class="calibration-header">
              <span class="calibration-title">{{ record.calibrationOrg }}</span>
              <el-tag :type="getResultType(record.calibrationResult)">
                {{ CalibrationResultLabels[record.calibrationResult] }}
              </el-tag>
            </div>
            <div class="calibration-details">
              <p v-if="record.certificateNumber">
                <strong>证书编号:</strong> {{ record.certificateNumber }}
              </p>
              <p v-if="record.nextCalibrationDate">
                <strong>下次校准:</strong> {{ formatDate(record.nextCalibrationDate) }}
              </p>
              <p v-if="record.remarks"><strong>备注:</strong> {{ record.remarks }}</p>
            </div>
          </div>
        </el-card>
      </el-timeline-item>
    </el-timeline>
    <el-empty v-else description="暂无校准记录" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useInstrumentStore } from '@/stores/instrument'
import {
  CalibrationResult,
  CalibrationResultLabels,
  type CalibrationRecord
} from '@/types/instrument'

interface Props {
  instrumentId: string
}

interface Emits {
  (e: 'add'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const instrumentStore = useInstrumentStore()

const records = ref<CalibrationRecord[]>([])

const loadRecords = async () => {
  try {
    records.value = await instrumentStore.fetchInstrumentCalibration(props.instrumentId)
  } catch (error: any) {
    ElMessage.error(error.message || '加载校准记录失败')
  }
}

const getResultType = (result: CalibrationResult): string => {
  const typeMap: Record<CalibrationResult, string> = {
    [CalibrationResult.QUALIFIED]: 'success',
    [CalibrationResult.UNQUALIFIED]: 'danger',
    [CalibrationResult.CONDITIONAL]: 'warning'
  }
  return typeMap[result] || 'info'
}

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('zh-CN')
}

const formatDateTime = (date: string): string => {
  return new Date(date).toLocaleString('zh-CN')
}

onMounted(() => {
  loadRecords()
})
</script>

<style scoped>
.calibration-timeline {
  padding: 20px 0;
}

.calibration-info {
  padding: 10px;
}

.calibration-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.calibration-title {
  font-size: 16px;
  font-weight: bold;
}

.calibration-details p {
  margin: 5px 0;
  color: #606266;
}
</style>
