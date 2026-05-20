<template>
  <div class="chain-of-custody">
    <!-- 标题和操作栏 -->
    <div class="header">
      <h3 class="title">监管链记录</h3>
      <el-space>
        <el-button :icon="Refresh" @click="handleRefresh" circle size="small" />
        <el-button :icon="Download" @click="handleExport" circle size="small" />
      </el-space>
    </div>

    <!-- 加载状态 -->
    <div v-loading="loading" class="content">
      <!-- 时间线展示 -->
      <el-timeline v-if="records.length > 0">
        <el-timeline-item
          v-for="(record, index) in records"
          :key="record.id"
          :timestamp="formatDateTime(record.timestamp)"
          placement="top"
          :type="getTimelineType(index)"
          :hollow="index !== 0"
        >
          <el-card shadow="hover" class="record-card">
            <div class="record-content">
              <!-- 流转信息 -->
              <div class="transfer-info">
                <div class="location-flow">
                  <div class="location-item from">
                    <el-icon class="location-icon"><LocationFilled /></el-icon>
                    <div class="location-details">
                      <div class="location-name">{{ record.fromLocation }}</div>
                      <div class="person-name">{{ record.fromPerson }}</div>
                    </div>
                  </div>
                  
                  <el-icon class="arrow-icon"><Right /></el-icon>
                  
                  <div class="location-item to">
                    <el-icon class="location-icon"><LocationFilled /></el-icon>
                    <div class="location-details">
                      <div class="location-name">{{ record.toLocation }}</div>
                      <div class="person-name">{{ record.toPerson }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 流转原因 -->
              <div class="transfer-reason">
                <el-icon class="reason-icon"><Document /></el-icon>
                <span class="reason-text">{{ record.transferReason }}</span>
              </div>

              <!-- 签名信息 -->
              <div v-if="record.signature" class="signature-info">
                <el-icon class="signature-icon"><EditPen /></el-icon>
                <span class="signature-text">已签名确认</span>
              </div>

              <!-- 记录编号 -->
              <div class="record-id">
                <el-tag size="small" type="info">记录编号: {{ record.id }}</el-tag>
              </div>
            </div>
          </el-card>
        </el-timeline-item>
      </el-timeline>

      <!-- 空状态 -->
      <el-empty v-else description="暂无监管链记录" />
    </div>

    <!-- 统计信息 -->
    <div v-if="records.length > 0" class="footer">
      <el-divider />
      <div class="statistics">
        <el-space :size="20">
          <div class="stat-item">
            <span class="stat-label">总流转次数:</span>
            <span class="stat-value">{{ records.length }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">当前位置:</span>
            <span class="stat-value highlight">{{ currentLocation }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">最后更新:</span>
            <span class="stat-value">{{ lastUpdateTime }}</span>
          </div>
        </el-space>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Refresh,
  Download,
  LocationFilled,
  Right,
  Document,
  EditPen
} from '@element-plus/icons-vue'
import type { CustodyRecord } from '@/types'

// Props
interface Props {
  sampleId: string
  autoLoad?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoLoad: true
})

// Emits
const emit = defineEmits<{
  'refresh': []
}>()

// 状态
const loading = ref(false)
const records = ref<CustodyRecord[]>([])

// 计算属性
const currentLocation = computed(() => {
  if (records.value.length === 0) return '-'
  return records.value[0].toLocation
})

const lastUpdateTime = computed(() => {
  if (records.value.length === 0) return '-'
  return formatDateTime(records.value[0].timestamp)
})

// 生命周期
onMounted(() => {
  if (props.autoLoad) {
    loadRecords()
  }
})

// 方法
const loadRecords = async () => {
  loading.value = true
  
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // 模拟数据（按时间倒序）
    records.value = [
      {
        id: 'COC-20240116-003',
        sampleId: props.sampleId,
        fromLocation: '前处理室',
        toLocation: '检测室',
        fromPerson: '李四',
        toPerson: '王五',
        transferReason: '样品前处理完成，送检测室进行仪器分析',
        timestamp: new Date('2024-01-16 14:20:00'),
        signature: 'signed'
      },
      {
        id: 'COC-20240116-002',
        sampleId: props.sampleId,
        fromLocation: '样品库',
        toLocation: '前处理室',
        fromPerson: '张三',
        toPerson: '李四',
        transferReason: '取样进行前处理',
        timestamp: new Date('2024-01-16 09:30:00'),
        signature: 'signed'
      },
      {
        id: 'COC-20240115-001',
        sampleId: props.sampleId,
        fromLocation: '接收室',
        toLocation: '样品库',
        fromPerson: '张三',
        toPerson: '张三',
        transferReason: '样品登记完成，入库保存',
        timestamp: new Date('2024-01-15 10:30:00'),
        signature: 'signed'
      }
    ]
  } catch (error) {
    console.error('加载监管链记录失败:', error)
    ElMessage.error('加载监管链记录失败')
  } finally {
    loading.value = false
  }
}

const handleRefresh = () => {
  loadRecords()
  emit('refresh')
  ElMessage.success('刷新成功')
}

const handleExport = () => {
  ElMessage.info('导出功能将在后续实现')
}

const formatDateTime = (date: Date | string) => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const getTimelineType = (index: number) => {
  // 最新的记录使用 primary，其他使用 info
  return index === 0 ? 'primary' : 'info'
}

// 暴露方法供父组件调用
defineExpose({
  loadRecords,
  refresh: handleRefresh
})
</script>

<style scoped>
.chain-of-custody {
  padding: 20px;
  background: #fff;
  border-radius: 4px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.content {
  min-height: 200px;
}

.record-card {
  margin-top: 8px;
}

.record-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.transfer-info {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.location-flow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.location-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.location-item.from {
  justify-content: flex-start;
}

.location-item.to {
  justify-content: flex-end;
}

.location-icon {
  font-size: 20px;
  color: #409eff;
}

.location-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.location-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.person-name {
  font-size: 12px;
  color: #909399;
}

.arrow-icon {
  font-size: 20px;
  color: #909399;
  flex-shrink: 0;
}

.transfer-reason {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  background: #fff;
  border-left: 3px solid #409eff;
}

.reason-icon {
  font-size: 16px;
  color: #409eff;
  margin-top: 2px;
  flex-shrink: 0;
}

.reason-text {
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}

.signature-info {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
}

.signature-icon {
  font-size: 14px;
  color: #67c23a;
}

.signature-text {
  font-size: 12px;
  color: #67c23a;
}

.record-id {
  display: flex;
  justify-content: flex-end;
}

.footer {
  margin-top: 20px;
}

.statistics {
  padding: 12px 0;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-label {
  font-size: 13px;
  color: #909399;
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.stat-value.highlight {
  color: #409eff;
}

:deep(.el-timeline-item__timestamp) {
  font-size: 13px;
  color: #909399;
  font-weight: 500;
}

:deep(.el-timeline-item__node) {
  width: 14px;
  height: 14px;
}

:deep(.el-timeline-item__wrapper) {
  padding-left: 24px;
}

:deep(.el-empty) {
  padding: 40px 0;
}
</style>
