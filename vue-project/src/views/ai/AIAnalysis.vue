<template>
  <div class="ai-analysis-page">
    <div class="page-header">
      <div class="header-content">
        <div class="header-icon">
          <el-icon :size="32"><MagicStick /></el-icon>
        </div>
        <div class="header-text">
          <h1 class="page-title">AI智能分析</h1>
          <p class="page-subtitle">基于实验室数据的智能洞察与分析建议</p>
        </div>
      </div>
      <div class="header-actions">
        <el-button type="primary" :icon="Refresh" @click="refreshAnalysis">
          刷新分析
        </el-button>
      </div>
    </div>

    <el-row :gutter="20">
      <!-- AI对话助手 -->
      <el-col :xs="24">
        <el-card shadow="hover" class="assistant-card">
          <template #header>
            <div class="card-header">
              <div class="header-left">
                <el-icon :size="20"><ChatDotRound /></el-icon>
                <span class="card-title">AI对话助手</span>
              </div>
              <el-tag type="success" size="small">
                <el-icon><Check /></el-icon>
                在线
              </el-tag>
            </div>
          </template>
          <div class="assistant-wrapper">
            <AIAssistant :initial-context="dashboardContext" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 功能说明 -->
    <el-row :gutter="20" class="features-section">
      <el-col :xs="24" :sm="12" :md="6" v-for="feature in features" :key="feature.title">
        <el-card shadow="hover" class="feature-card">
          <div class="feature-icon" :style="{ backgroundColor: feature.color }">
            <el-icon :size="28">
              <component :is="feature.icon" />
            </el-icon>
          </div>
          <h3 class="feature-title">{{ feature.title }}</h3>
          <p class="feature-desc">{{ feature.description }}</p>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { 
  MagicStick, 
  Refresh, 
  ChatDotRound, 
  Check,
  DataAnalysis,
  TrendCharts,
  Warning,
  Opportunity
} from '@element-plus/icons-vue'
import AIAssistant from '@/components/ai/AIAssistant.vue'
import { aiContextService } from '@/services/ai-context'
import type { DashboardContext } from '@/types/ai'

const dashboardContext = ref<DashboardContext | null>(null)

// 功能特点
const features = ref([
  {
    title: '智能数据分析',
    description: '自动分析实验室关键指标,识别异常趋势和潜在问题',
    icon: 'DataAnalysis',
    color: '#667eea'
  },
  {
    title: '趋势预测',
    description: '基于历史数据预测未来趋势,提前规划资源配置',
    icon: 'TrendCharts',
    color: '#764ba2'
  },
  {
    title: '异常检测',
    description: '实时监控样品和检测数据,快速发现异常情况',
    icon: 'Warning',
    color: '#f56c6c'
  },
  {
    title: '智能建议',
    description: '根据当前状态提供优化建议,提升实验室效率',
    icon: 'Opportunity',
    color: '#67c23a'
  }
])

// 刷新分析
const refreshAnalysis = () => {
  collectContext()
  // 触发洞察卡片刷新
  window.dispatchEvent(new CustomEvent('refresh-ai-insights'))
}

// 收集上下文
const collectContext = () => {
  try {
    dashboardContext.value = aiContextService.collectDashboardContext()
  } catch (error) {
    console.error('Failed to collect context:', error)
  }
}

onMounted(() => {
  collectContext()
})
</script>

<style scoped>
.ai-analysis-page {
  padding: 0;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 64px;
  height: 64px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

.header-text {
  flex: 1;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
}

.page-subtitle {
  margin: 0;
  font-size: 14px;
  opacity: 0.9;
}

.header-actions .el-button {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  backdrop-filter: blur(10px);
}

.header-actions .el-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 卡片头部 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

/* 助手卡片 */
.assistant-card {
  height: calc(100vh - 300px);
  min-height: 600px;
}

.assistant-card :deep(.el-card__body) {
  height: calc(100% - 60px);
  padding: 0;
}

.assistant-wrapper {
  height: 100%;
}

/* 功能特点区域 */
.features-section {
  margin-top: 24px;
}

.feature-card {
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.feature-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.feature-title {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.feature-desc {
  margin: 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

/* 响应式 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .header-content {
    flex-direction: column;
  }

  .page-title {
    font-size: 24px;
  }

  .assistant-card {
    height: 600px;
    min-height: auto;
  }
}
</style>
