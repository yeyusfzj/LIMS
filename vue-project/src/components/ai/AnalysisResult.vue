<template>
  <div class="analysis-result">
    <!-- 指标卡片 -->
    <div v-if="data.metrics && data.metrics.length > 0" class="metrics-section">
      <div class="metrics-grid">
        <div 
          v-for="(metric, index) in data.metrics" 
          :key="index"
          class="metric-card"
        >
          <div class="metric-icon" v-if="metric.icon">{{ metric.icon }}</div>
          <div class="metric-info">
            <div class="metric-label">{{ metric.label }}</div>
            <div class="metric-value" :style="{ color: metric.color }">
              {{ metric.value }}
            </div>
            <div v-if="metric.change" class="metric-change" :class="`trend-${metric.trend}`">
              <el-icon v-if="metric.trend === 'up'"><CaretTop /></el-icon>
              <el-icon v-else-if="metric.trend === 'down'"><CaretBottom /></el-icon>
              <span>{{ metric.change }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 图表 -->
    <div v-if="data.charts && data.charts.length > 0" class="charts-section">
      <div v-for="(chart, index) in data.charts" :key="index" class="chart-item">
        <div class="chart-title">{{ chart.title }}</div>
        <div class="chart-placeholder">
          <el-icon :size="40" color="#c0c4cc"><TrendCharts /></el-icon>
          <p>图表展示区域</p>
          <p class="chart-note">{{ chart.type }}图 - 数据已准备</p>
        </div>
      </div>
    </div>

    <!-- 表格 -->
    <div v-if="data.tables && data.tables.length > 0" class="tables-section">
      <div v-for="(table, index) in data.tables" :key="index" class="table-item">
        <div class="table-title">{{ table.title }}</div>
        <el-table :data="table.data" size="small" stripe>
          <el-table-column
            v-for="col in table.columns"
            :key="col.prop"
            :prop="col.prop"
            :label="col.label"
            :width="col.width"
          />
        </el-table>
      </div>
    </div>

    <!-- 推荐建议 -->
    <div v-if="data.recommendations && data.recommendations.length > 0" class="recommendations-section">
      <div class="section-title">
        <el-icon><Opportunity /></el-icon>
        <span>智能建议</span>
      </div>
      <div class="recommendations-list">
        <div 
          v-for="(rec, index) in data.recommendations" 
          :key="index"
          class="recommendation-item"
        >
          <el-icon color="#67C23A"><Check /></el-icon>
          <span>{{ rec }}</span>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div v-if="data.actions && data.actions.length > 0" class="actions-section">
      <el-button
        v-for="(action, index) in data.actions"
        :key="index"
        :type="action.type"
        size="small"
        @click="handleAction(action)"
      >
        <el-icon v-if="action.icon">
          <component :is="action.icon" />
        </el-icon>
        {{ action.label }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CaretTop, CaretBottom, TrendCharts, Opportunity, Check } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import type { AnalysisData } from '@/types/ai'

interface Props {
  data: AnalysisData
}

defineProps<Props>()

const handleAction = (action: any) => {
  ElMessage.info(`执行操作: ${action.label}`)
  // 这里可以根据action.handler执行相应的操作
}
</script>

<style scoped>
.analysis-result {
  background-color: #f5f7fa;
  border-radius: 8px;
  padding: 12px;
}

/* 指标卡片 */
.metrics-section {
  margin-bottom: 12px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background-color: white;
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.metric-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.metric-info {
  flex: 1;
  min-width: 0;
}

.metric-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.metric-value {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 2px;
}

.metric-change {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
}

.metric-change.trend-up {
  color: #67C23A;
}

.metric-change.trend-down {
  color: #F56C6C;
}

.metric-change.trend-stable {
  color: #909399;
}

/* 图表 */
.charts-section {
  margin-bottom: 12px;
}

.chart-item {
  background-color: white;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 10px;
}

.chart-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
}

.chart-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  background-color: #f5f7fa;
  border-radius: 4px;
  color: #909399;
}

.chart-placeholder p {
  margin: 5px 0;
  font-size: 14px;
}

.chart-note {
  font-size: 12px !important;
  color: #c0c4cc !important;
}

/* 表格 */
.tables-section {
  margin-bottom: 12px;
}

.table-item {
  background-color: white;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 10px;
}

.table-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
}

/* 推荐建议 */
.recommendations-section {
  background-color: white;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 10px;
}

.recommendations-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recommendation-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
  background-color: #f0f9ff;
  border-radius: 4px;
  font-size: 13px;
  color: #606266;
  line-height: 1.5;
}

.recommendation-item .el-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

/* 操作按钮 */
.actions-section {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 响应式 */
@media (max-width: 768px) {
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .chart-placeholder {
    height: 150px;
  }
}
</style>
