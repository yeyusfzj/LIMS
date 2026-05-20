<template>
  <div class="sample-result-analysis">
    <el-row :gutter="20">
      <!-- 左侧：输入和搜索 -->
      <el-col :xs="24" :lg="12">
        <el-card shadow="hover" class="search-card">
          <template #header>
            <div class="card-header">
              <el-icon><Search /></el-icon>
              <span class="card-title">样品搜索</span>
            </div>
          </template>

          <div class="search-input-wrapper">
            <el-input
              v-model="searchQuery"
              placeholder="请输入样品名称或样品编号，例如：河水样品 或 S202605080001"
              clearable
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button
              type="primary"
              :loading="searching"
              :disabled="!searchQuery.trim()"
              @click="handleSearch"
            >
              搜索
            </el-button>
          </div>

          <!-- 搜索结果列表 -->
          <div v-if="searchResults.length > 0" class="search-results">
            <div class="results-header">
              <span>找到 {{ searchResults.length }} 个匹配的样品</span>
            </div>
            <div class="results-list">
              <div
                v-for="sample in searchResults"
                :key="sample.sample_id"
                class="result-item"
                :class="{ active: selectedSample?.sample_id === sample.sample_id }"
                @click="selectSample(sample)"
              >
                <div class="result-header">
                  <el-icon><Document /></el-icon>
                  <span class="result-name">{{ sample.sample_name }}</span>
                  <el-tag size="small" :type="getStatusType(sample.status)">
                    {{ getStatusText(sample.status) }}
                  </el-tag>
                </div>
                <div class="result-details">
                  <p><strong>样品编号:</strong> {{ sample.sample_number }}</p>
                  <p><strong>样品类型:</strong> {{ sample.sample_type }}</p>
                  <p><strong>检测结果:</strong> {{ sample.result_count }} 项</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 无结果提示 -->
          <el-empty
            v-else-if="searched && !searching"
            description="未找到匹配的样品"
            :image-size="100"
          />

          <!-- 错误提示 -->
          <el-alert
            v-if="searchError"
            type="error"
            :title="searchError"
            :closable="true"
            @close="searchError = ''"
            show-icon
            class="error-alert"
          />
        </el-card>
      </el-col>

      <!-- 右侧：样品详情和分析结果 -->
      <el-col :xs="24" :lg="12">
        <!-- 样品详情 -->
        <el-card v-if="selectedSample" shadow="hover" class="sample-detail-card">
          <template #header>
            <div class="card-header">
              <el-icon><DataAnalysis /></el-icon>
              <span class="card-title">样品详情</span>
              <el-button
                type="primary"
                size="small"
                :loading="analyzing"
                @click="handleAnalyze"
              >
                <el-icon><MagicStick /></el-icon>
                AI 分析
              </el-button>
            </div>
          </template>

          <el-descriptions :column="1" border>
            <el-descriptions-item label="样品编号">
              {{ selectedSample.sample_number }}
            </el-descriptions-item>
            <el-descriptions-item label="样品名称">
              {{ selectedSample.sample_name }}
            </el-descriptions-item>
            <el-descriptions-item label="样品类型">
              {{ selectedSample.sample_type }}
            </el-descriptions-item>
            <el-descriptions-item label="样品状态">
              <el-tag :type="getStatusType(selectedSample.status)">
                {{ getStatusText(selectedSample.status) }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>

          <!-- 检测结果 -->
          <div class="result-data-section">
            <h3>检测结果</h3>
            <el-table :data="resultTableData" border stripe>
              <el-table-column prop="parameter" label="检测参数" />
              <el-table-column prop="value" label="检测值" />
              <el-table-column label="状态">
                <template #default="{ row }">
                  <el-tag :type="row.isNormal ? 'success' : 'danger'" size="small">
                    {{ row.isNormal ? '正常' : '异常' }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>

        <!-- AI 分析结果 -->
        <el-card v-if="analysisResult" shadow="hover" class="analysis-result-card">
          <template #header>
            <div class="card-header">
              <el-icon><TrendCharts /></el-icon>
              <span class="card-title">AI 分析结果</span>
            </div>
          </template>

          <div class="analysis-content">
            <!-- 状态概览 -->
            <div class="status-overview">
              <el-tag
                :type="analysisResult.status === 'normal' ? 'success' : analysisResult.status === 'warning' ? 'warning' : 'danger'"
                size="large"
              >
                {{ getAnalysisStatusText(analysisResult.status) }}
              </el-tag>
            </div>

            <!-- 分析摘要 -->
            <div class="analysis-section">
              <h3>分析摘要</h3>
              <p>{{ analysisResult.summary }}</p>
            </div>

            <!-- 异常列表 -->
            <div v-if="analysisResult.anomalies && analysisResult.anomalies.length > 0" class="analysis-section">
              <h3>异常检测</h3>
              <el-alert
                v-for="(anomaly, index) in analysisResult.anomalies"
                :key="index"
                :type="anomaly.severity === 'high' ? 'error' : 'warning'"
                :title="anomaly.message"
                :closable="false"
                show-icon
                class="anomaly-alert"
              >
                <template v-if="anomaly.suggestion">
                  <p><strong>建议:</strong> {{ anomaly.suggestion }}</p>
                </template>
              </el-alert>
            </div>

            <!-- 分析时间 -->
            <div class="analysis-meta">
              <el-text type="info" size="small">
                分析时间: {{ analysisResult.analyzed_at }}
              </el-text>
            </div>
          </div>
        </el-card>

        <!-- 空状态提示 -->
        <el-empty
          v-if="!selectedSample"
          description="请先搜索并选择一个样品"
          :image-size="150"
        />
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Search,
  Document,
  DataAnalysis,
  MagicStick,
  TrendCharts
} from '@element-plus/icons-vue'
import http from '@/services/http'

// 状态
const searchQuery = ref('')
const searching = ref(false)
const searched = ref(false)
const searchResults = ref<any[]>([])
const selectedSample = ref<any>(null)
const searchError = ref('')
const analyzing = ref(false)
const analysisResult = ref<any>(null)

// 检测结果表格数据
const resultTableData = computed(() => {
  if (!selectedSample.value || !selectedSample.value.result_data) {
    return []
  }

  return Object.entries(selectedSample.value.result_data).map(([parameter, value]) => ({
    parameter,
    value: typeof value === 'number' ? value.toFixed(4) : value,
    isNormal: true // 简化处理，实际应该根据阈值判断
  }))
})

/**
 * 搜索样品
 */
const handleSearch = async () => {
  if (!searchQuery.value.trim()) {
    ElMessage.warning('请输入搜索关键词')
    return
  }

  searching.value = true
  searched.value = false
  searchError.value = ''
  searchResults.value = []
  selectedSample.value = null
  analysisResult.value = null

  try {
    const response = await http.get('/agent/search-sample', {
      params: { query: searchQuery.value }
    })

    if (response.success && response.data) {
      searchResults.value = response.data.samples || []
      searched.value = true

      if (searchResults.value.length === 0) {
        ElMessage.info(`未找到匹配 "${searchQuery.value}" 的样品`)
      } else {
        ElMessage.success(`找到 ${searchResults.value.length} 个匹配的样品`)
        // 如果只有一个结果，自动选中
        if (searchResults.value.length === 1) {
          selectSample(searchResults.value[0])
        }
      }
    } else {
      searchError.value = response.error || '搜索失败'
    }
  } catch (error: any) {
    console.error('搜索失败:', error)
    searchError.value = error.message || '搜索失败，请稍后重试'
    ElMessage.error('搜索失败')
  } finally {
    searching.value = false
  }
}

/**
 * 选择样品
 */
const selectSample = (sample: any) => {
  selectedSample.value = sample
  analysisResult.value = null
  ElMessage.success(`已选择样品: ${sample.sample_name}`)
}

/**
 * AI 分析
 */
const handleAnalyze = async () => {
  if (!selectedSample.value) {
    ElMessage.warning('请先选择一个样品')
    return
  }

  if (!selectedSample.value.result_data || Object.keys(selectedSample.value.result_data).length === 0) {
    ElMessage.warning('该样品没有检测结果数据')
    return
  }

  analyzing.value = true
  analysisResult.value = null

  try {
    const response = await http.post('/agent/result-analysis', {
      result_data: selectedSample.value.result_data,
      experiment_type: 'general'
    })

    if (response.success && response.data) {
      analysisResult.value = response.data
      ElMessage.success('分析完成')
    } else {
      ElMessage.error(response.error || '分析失败')
    }
  } catch (error: any) {
    console.error('分析失败:', error)
    ElMessage.error(error.message || '分析失败，请稍后重试')
  } finally {
    analyzing.value = false
  }
}

/**
 * 获取状态类型
 */
const getStatusType = (status: string) => {
  const statusMap: Record<string, any> = {
    'REGISTERED': 'info',
    'IN_TESTING': 'warning',
    'TESTING_COMPLETE': 'success',
    'IN_AUDIT': 'warning',
    'AUDIT_COMPLETE': 'success',
    'RELEASED': 'success',
    'ARCHIVED': 'info'
  }
  return statusMap[status] || 'info'
}

/**
 * 获取状态文本
 */
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'REGISTERED': '已登记',
    'IN_TESTING': '检测中',
    'TESTING_COMPLETE': '检测完成',
    'IN_AUDIT': '审核中',
    'AUDIT_COMPLETE': '审核完成',
    'RELEASED': '已放行',
    'ARCHIVED': '已归档'
  }
  return statusMap[status] || status
}

/**
 * 获取分析状态文本
 */
const getAnalysisStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'normal': '正常',
    'warning': '警告',
    'error': '异常'
  }
  return statusMap[status] || status
}
</script>

<style scoped>
.sample-result-analysis {
  padding: 0;
}

/* 卡片头部 */
.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

/* 搜索卡片 */
.search-card {
  margin-bottom: 20px;
  min-height: 400px;
}

.search-input-wrapper {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.search-input-wrapper .el-input {
  flex: 1;
}

/* 搜索结果 */
.search-results {
  margin-top: 20px;
}

.results-header {
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 8px 8px 0 0;
  font-weight: 600;
  color: #606266;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.result-item {
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.result-item:hover {
  background-color: #ecf5ff;
  transform: translateX(4px);
}

.result-item.active {
  background-color: #ecf5ff;
  border-color: #409eff;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.result-name {
  flex: 1;
  font-weight: 600;
  color: #303133;
}

.result-details {
  font-size: 14px;
  color: #606266;
}

.result-details p {
  margin: 4px 0;
}

/* 样品详情卡片 */
.sample-detail-card {
  margin-bottom: 20px;
}

.result-data-section {
  margin-top: 20px;
}

.result-data-section h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  border-left: 4px solid #409eff;
  padding-left: 12px;
}

/* 分析结果卡片 */
.analysis-result-card {
  margin-bottom: 20px;
}

.analysis-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.status-overview {
  text-align: center;
  padding: 20px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
  border-radius: 12px;
}

.analysis-section h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  border-left: 4px solid #409eff;
  padding-left: 12px;
}

.analysis-section p {
  margin: 0;
  color: #606266;
  line-height: 1.6;
}

.anomaly-alert {
  margin-bottom: 8px;
}

.analysis-meta {
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
  text-align: right;
}

.error-alert {
  margin-top: 16px;
}

/* 响应式 */
@media (max-width: 768px) {
  .search-input-wrapper {
    flex-direction: column;
  }

  .search-input-wrapper .el-button {
    width: 100%;
  }
}
</style>
