<template>
  <div class="audit-statistics">
    <!-- 筛选条件 -->
    <StatisticsFilters @filter-change="handleFilterChange" />

    <!-- 统计标签页 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="title">审核统计分析</span>
          <el-button-group>
            <el-button 
              type="primary" 
              :icon="Refresh" 
              @click="refreshCurrentTab"
              :loading="loading"
            >
              刷新
            </el-button>
            <el-button 
              :icon="Download" 
              @click="handleExport"
              :loading="exporting"
            >
              导出
            </el-button>
          </el-button-group>
        </div>
      </template>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="6" animated />
      </div>

      <!-- 错误提示 -->
      <el-alert
        v-else-if="error"
        :title="error"
        type="error"
        :closable="false"
        style="margin-bottom: 20px"
      />

      <!-- 统计卡片 -->
      <div v-else class="statistics-grid">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon pending">
              <el-icon :size="32"><Clock /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">待审核任务</div>
              <div class="stat-value">{{ statistics.pending }}</div>
              <div class="stat-unit">个</div>
            </div>
          </div>
        </el-card>

        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon today">
              <el-icon :size="32"><Calendar /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">今日已审核</div>
              <div class="stat-value">{{ statistics.todayCompleted }}</div>
              <div class="stat-unit">个</div>
            </div>
          </div>
        </el-card>

        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon week">
              <el-icon :size="32"><TrendCharts /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">本周已审核</div>
              <div class="stat-value">{{ statistics.weekCompleted }}</div>
              <div class="stat-unit">个</div>
            </div>
          </div>
        </el-card>

        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon month">
              <el-icon :size="32"><DataLine /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">本月已审核</div>
              <div class="stat-value">{{ statistics.monthCompleted }}</div>
              <div class="stat-unit">个</div>
            </div>
          </div>
        </el-card>

        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon rate" :class="getRateClass(statistics.approvalRate)">
              <el-icon :size="32"><CircleCheck /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">审核通过率</div>
              <div class="stat-value">{{ statistics.approvalRate }}%</div>
              <div class="stat-unit">本月</div>
            </div>
          </div>
        </el-card>

        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon time">
              <el-icon :size="32"><Timer /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">平均处理时间</div>
              <div class="stat-value">{{ statistics.averageProcessingTime }}</div>
              <div class="stat-unit">小时</div>
            </div>
          </div>
        </el-card>
      </div>

      <!-- 说明文字 -->
      <div v-if="!loading && !error" class="statistics-note">
        <el-icon><InfoFilled /></el-icon>
        <span>统计数据每5分钟自动更新一次</span>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Refresh,
  Clock,
  Calendar,
  TrendCharts,
  DataLine,
  CircleCheck,
  Timer,
  InfoFilled
} from '@element-plus/icons-vue'
import { auditService } from '@/services/auditService'

// 统计数据
const statistics = ref({
  pending: 0,
  todayCompleted: 0,
  weekCompleted: 0,
  monthCompleted: 0,
  approvalRate: 0,
  averageProcessingTime: 0
})

const loading = ref(false)
const error = ref('')

// 获取通过率的样式类
const getRateClass = (rate: number) => {
  if (rate >= 90) return 'rate-high'
  if (rate >= 70) return 'rate-medium'
  return 'rate-low'
}

// 加载统计数据
const loadStatistics = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const data = await auditService.getAuditStatistics()
    statistics.value = data
  } catch (err: any) {
    console.error('加载审核统计失败:', err)
    const errorMessage = err?.response?.data?.message || err?.message || '加载统计数据失败'
    error.value = errorMessage
    ElMessage.error(errorMessage)
  } finally {
    loading.value = false
  }
}

// 初始化
onMounted(() => {
  loadStatistics()
  
  // 每5分钟自动刷新一次
  const refreshInterval = setInterval(() => {
    loadStatistics()
  }, 5 * 60 * 1000)
  
  // 组件卸载时清除定时器
  onUnmounted(() => {
    clearInterval(refreshInterval)
  })
})

// 导入 onUnmounted
import { onUnmounted } from 'vue'
</script>

<style scoped>
.audit-statistics {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 18px;
  font-weight: bold;
}

.loading-container {
  padding: 20px;
}

.statistics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-4px);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 10px;
}

.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon.pending {
  background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);
  color: #d63031;
}

.stat-icon.today {
  background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
  color: #fff;
}

.stat-icon.week {
  background: linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%);
  color: #fff;
}

.stat-icon.month {
  background: linear-gradient(135deg, #fd79a8 0%, #e84393 100%);
  color: #fff;
}

.stat-icon.rate {
  background: linear-gradient(135deg, #55efc4 0%, #00b894 100%);
  color: #fff;
}

.stat-icon.rate.rate-high {
  background: linear-gradient(135deg, #55efc4 0%, #00b894 100%);
}

.stat-icon.rate.rate-medium {
  background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);
  color: #d63031;
}

.stat-icon.rate.rate-low {
  background: linear-gradient(135deg, #ff7675 0%, #d63031 100%);
}

.stat-icon.time {
  background: linear-gradient(135deg, #dfe6e9 0%, #b2bec3 100%);
  color: #2d3436;
}

.stat-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  font-weight: 500;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
  line-height: 1;
}

.stat-unit {
  font-size: 12px;
  color: #c0c4cc;
}

.statistics-note {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
  color: #909399;
  font-size: 14px;
}

.statistics-note .el-icon {
  color: #409eff;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .statistics-grid {
    grid-template-columns: 1fr;
  }
  
  .stat-value {
    font-size: 28px;
  }
}
</style>
