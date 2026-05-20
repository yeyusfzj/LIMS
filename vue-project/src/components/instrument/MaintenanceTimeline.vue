<template>
  <div class="maintenance-timeline">
    <div style="margin-bottom: 10px">
      <el-button type="primary" size="small" @click="emit('add')">
        添加维护记录
      </el-button>
    </div>
    
    <el-timeline v-if="records.length > 0">
      <el-timeline-item
        v-for="record in records"
        :key="record.id"
        :timestamp="formatDateTime(record.maintenanceDate)"
        placement="top"
      >
        <el-card>
          <div class="maintenance-info">
            <div class="maintenance-header">
              <span class="maintenance-title">
                {{ MaintenanceTypeLabels[record.maintenanceType] }}
              </span>
              <span class="maintenance-person">{{ record.maintenancePerson }}</span>
            </div>
            <div class="maintenance-details">
              <p><strong>维护内容:</strong> {{ record.maintenanceContent }}</p>
              <p v-if="record.maintenanceCost">
                <strong>维护费用:</strong> ¥{{ record.maintenanceCost.toLocaleString() }}
              </p>
              <p v-if="record.nextMaintenanceDate">
                <strong>下次维护:</strong> {{ formatDate(record.nextMaintenanceDate) }}
              </p>
              <p v-if="record.remarks"><strong>备注:</strong> {{ record.remarks }}</p>
            </div>
          </div>
        </el-card>
      </el-timeline-item>
    </el-timeline>
    <el-empty v-else description="暂无维护记录" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useInstrumentStore } from '@/stores/instrument'
import {
  MaintenanceTypeLabels,
  type MaintenanceRecord
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

const records = ref<MaintenanceRecord[]>([])

const loadRecords = async () => {
  try {
    records.value = await instrumentStore.fetchInstrumentMaintenance(props.instrumentId)
  } catch (error: any) {
    ElMessage.error(error.message || '加载维护记录失败')
  }
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
.maintenance-timeline {
  padding: 20px 0;
}

.maintenance-info {
  padding: 10px;
}

.maintenance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.maintenance-title {
  font-size: 16px;
  font-weight: bold;
}

.maintenance-person {
  color: #909399;
}

.maintenance-details p {
  margin: 5px 0;
  color: #606266;
}
</style>
