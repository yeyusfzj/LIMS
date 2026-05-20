<template>
  <div class="agent-analysis-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-icon">
          <el-icon :size="32"><MagicStick /></el-icon>
        </div>
        <div class="header-text">
          <h1 class="page-title">AI Agent 智能体</h1>
          <p class="page-subtitle">本地轻量化实验需求解析与计划生成</p>
        </div>
      </div>
      <div class="header-actions">
        <el-button type="primary" :icon="Refresh" @click="handleReset">
          重置
        </el-button>
      </div>
    </div>

    <!-- 功能选择标签页 -->
    <el-tabs v-model="activeFeature" class="feature-tabs">
      <el-tab-pane label="样品检测结果分析" name="sample">
        <SampleResultAnalysis />
      </el-tab-pane>
      <el-tab-pane label="实验需求解析" name="experiment">
        <ExperimentAnalysis />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  MagicStick,
  Refresh
} from '@element-plus/icons-vue'
import ExperimentAnalysis from './components/ExperimentAnalysis.vue'
import SampleResultAnalysis from './components/SampleResultAnalysis.vue'

// 状态
const activeFeature = ref('sample') // 默认显示样品分析

// 重置
const handleReset = () => {
  // 重置逻辑
}
</script>

<style scoped>
.agent-analysis-page {
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

.feature-tabs {
  margin-top: 20px;
}

.feature-tabs :deep(.el-tabs__header) {
  margin-bottom: 20px;
}

.feature-tabs :deep(.el-tabs__item) {
  font-size: 16px;
  font-weight: 500;
}
</style>
