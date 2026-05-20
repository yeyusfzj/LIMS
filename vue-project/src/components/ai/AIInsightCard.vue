<template>
  <el-card shadow="hover" class="ai-insight-card">
    <template #header>
      <div class="card-header">
        <div class="header-left">
          <div class="ai-icon-wrapper">
            <el-icon :size="20"><MagicStick /></el-icon>
          </div>
        </div>
        <el-button 
          type="primary" 
          size="small" 
          :icon="Refresh"
          @click="refreshInsights"
          :loading="loading"
        >
          刷新
        </el-button>
      </div>
    </template>

    <div v-loading="loading" class="insights-content">
      <!-- 智能问候 -->
      <div v-if="insights?.greeting" class="insight-section greeting-section">
        <div class="greeting-icon">
          <el-icon :size="24"><Sunny /></el-icon>
        </div>
        <div class="greeting-text">
          <div class="greeting-message">{{ insights.greeting.message }}</div>
          <div class="greeting-time">{{ insights.greeting.timeOfDay }}</div>
        </div>
      </div>

      <!-- 数据分析 -->
      <div v-if="insights?.dataAnalysis" class="insight-section">
        <div class="section-title">
          <el-icon><DataAnalysis /></el-icon>
          数据分析
        </div>
        <div class="analysis-grid">
          <div 
            v-for="item in insights.dataAnalysis" 
            :key="item.metric"
            class="analysis-item"
          >
            <div class="analysis-label">{{ item.metric }}</div>
            <div class="analysis-value" :class="getTrendClass(item.trend)">
              {{ item.value }}
              <el-icon v-if="item.trend !== 'stable'" class="trend-icon">
                <component :is="getTrendIcon(item.trend)" />
              </el-icon>
            </div>
            <div class="analysis-insight">{{ item.insight }}</div>
          </div>
        </div>
      </div>

      <!-- 告警信息 -->
      <div v-if="insights?.alerts && insights.alerts.length > 0" class="insight-section">
        <div class="section-title">
          <el-icon><Warning /></el-icon>
          重要提醒
        </div>
        <div class="alerts-list">
          <div 
            v-for="alert in insights.alerts" 
            :key="alert.id"
            class="alert-item"
            :class="`alert-${alert.severity}`"
          >
            <el-icon class="alert-icon">
              <component :is="getAlertIcon(alert.severity)" />
            </el-icon>
            <div class="alert-content">
              <div class="alert-message">{{ alert.message }}</div>
              <div class="alert-action" v-if="alert.action">
                <el-link type="primary" :underline="false" @click="handleAlertAction(alert)">
                  {{ alert.action }}
                </el-link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 智能建议 -->
      <div v-if="insights?.suggestions && insights.suggestions.length > 0" class="insight-section">
        <div class="section-title">
          <el-icon><Opportunity /></el-icon>
          智能建议
        </div>
        <div class="suggestions-list">
          <div 
            v-for="(suggestion, index) in insights.suggestions" 
            :key="index"
            class="suggestion-item"
          >
            <div class="suggestion-icon">
              <el-icon><Check /></el-icon>
            </div>
            <div class="suggestion-text">{{ suggestion }}</div>
          </div>
        </div>
      </div>

      <!-- 快捷操作 -->
      <div class="insight-actions">
        <el-button 
          type="primary" 
          size="small"
          @click="openAIAssistant"
        >
          <el-icon><ChatDotRound /></el-icon>
          与AI助手对话
        </el-button>
        <el-button 
          size="small"
          @click="viewDetailedAnalysis"
        >
          查看详细分析
        </el-button>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  MagicStick, 
  Refresh, 
  Sunny, 
  DataAnalysis, 
  Warning, 
  Opportunity,
  Check,
  ChatDotRound,
  CaretTop,
  CaretBottom,
  WarningFilled,
  InfoFilled
} from '@element-plus/icons-vue'
import { aiContextService } from '@/services/ai-context'
import type { AIInsights } from '@/types/ai'

const router = useRouter()
const loading = ref(false)
const insights = ref<AIInsights | null>(null)

// 刷新洞察
const refreshInsights = async () => {
  loading.value = true
  try {
    // 收集主页上下文（现在是异步的）
    const context = await aiContextService.collectDashboardContext()
    // 生成AI洞察
    insights.value = aiContextService.generateInsights(context)
  } catch (error) {
    console.error('Failed to refresh insights:', error)
  } finally {
    loading.value = false
  }
}

// 获取趋势样式类
const getTrendClass = (trend: string) => {
  return {
    'trend-up': trend === 'up',
    'trend-down': trend === 'down',
    'trend-stable': trend === 'stable'
  }
}

// 获取趋势图标
const getTrendIcon = (trend: string) => {
  return trend === 'up' ? CaretTop : CaretBottom
}

// 获取告警图标
const getAlertIcon = (severity: string) => {
  return severity === 'high' ? WarningFilled : InfoFilled
}

// 处理告警操作
const handleAlertAction = (alert: any) => {
  if (alert.actionPath) {
    router.push(alert.actionPath)
  }
}

// 打开AI助手
const openAIAssistant = () => {
  // 触发打开AI助手的事件
  window.dispatchEvent(new CustomEvent('open-ai-assistant'))
}

// 查看详细分析
const viewDetailedAnalysis = () => {
  router.push('/ai/analysis')
}

// 组件挂载时加载洞察
onMounted(() => {
  refreshInsights()
})
</script>

<style scoped>
.ai-insight-card {
  margin-bottom: 20px;
  border: 2px solid transparent;
  background: linear-gradient(white, white) padding-box,
              linear-gradient(135deg, #667eea 0%, #764ba2 100%) border-box;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-icon-wrapper {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

/* 洞察内容 */
.insights-content {
  min-height: 200px;
}

.insight-section {
  margin-bottom: 24px;
}

.insight-section:last-child {
  margin-bottom: 0;
}

/* 智能问候 */
.greeting-section {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border-radius: 12px;
}

.greeting-icon {
  color: #667eea;
}

.greeting-text {
  flex: 1;
}

.greeting-message {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.greeting-time {
  font-size: 14px;
  color: #909399;
}

/* 区块标题 */
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 12px;
}

/* 数据分析 */
.analysis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.analysis-item {
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 8px;
}

.analysis-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.analysis-value {
  font-size: 20px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.analysis-value.trend-up {
  color: #67c23a;
}

.analysis-value.trend-down {
  color: #f56c6c;
}

.trend-icon {
  font-size: 16px;
}

.analysis-insight {
  font-size: 12px;
  color: #606266;
}

/* 告警列表 */
.alerts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.alert-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  border-left: 3px solid;
}

.alert-item.alert-high {
  background-color: #fef0f0;
  border-left-color: #f56c6c;
}

.alert-item.alert-medium {
  background-color: #fdf6ec;
  border-left-color: #e6a23c;
}

.alert-item.alert-low {
  background-color: #f0f9ff;
  border-left-color: #409eff;
}

.alert-icon {
  font-size: 18px;
  margin-top: 2px;
}

.alert-item.alert-high .alert-icon {
  color: #f56c6c;
}

.alert-item.alert-medium .alert-icon {
  color: #e6a23c;
}

.alert-item.alert-low .alert-icon {
  color: #409eff;
}

.alert-content {
  flex: 1;
}

.alert-message {
  font-size: 14px;
  color: #303133;
  margin-bottom: 4px;
}

.alert-action {
  margin-top: 4px;
}

/* 建议列表 */
.suggestions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.suggestion-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  background-color: #f0f9ff;
  border-radius: 8px;
}

.suggestion-icon {
  width: 20px;
  height: 20px;
  background-color: #67c23a;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  flex-shrink: 0;
  margin-top: 2px;
}

.suggestion-text {
  flex: 1;
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
}

/* 快捷操作 */
.insight-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.insight-actions .el-button {
  flex: 1;
}
</style>
