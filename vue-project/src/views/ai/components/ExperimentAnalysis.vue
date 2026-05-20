<template>
  <div class="experiment-analysis">
    <el-row :gutter="20">
      <!-- 左侧：输入和操作 -->
      <el-col :xs="24" :lg="12">
        <!-- 输入区域 -->
        <el-card shadow="hover" class="input-card">
          <template #header>
            <div class="card-header">
              <el-icon><Edit /></el-icon>
              <span class="card-title">实验需求输入</span>
            </div>
          </template>

          <div class="input-section">
            <el-input
              v-model="experimentText"
              type="textarea"
              :rows="8"
              placeholder="请输入实验需求，例如：&#10;我需要检测水样中的重金属含量，包括铅、汞、镉&#10;&#10;或者：&#10;需要对土壤样品进行有机物分析，检测苯、甲苯等指标"
              clearable
            />

            <div class="button-group">
              <el-button
                type="primary"
                :icon="MagicStick"
                :loading="parsing"
                :disabled="!experimentText.trim()"
                @click="handleParse"
              >
                解析需求
              </el-button>
              <el-button
                type="success"
                :icon="Document"
                :loading="generating"
                :disabled="!parsedFields"
                @click="handleGeneratePlan"
              >
                生成计划
              </el-button>
              <el-button
                :icon="Refresh"
                @click="handleReset"
              >
                重置
              </el-button>
            </div>
          </div>

          <!-- 演示案例 -->
          <el-divider>快速演示</el-divider>
          <div class="demo-cases">
            <el-button
              v-for="demo in demoCases"
              :key="demo.id"
              size="small"
              @click="loadDemoCase(demo)"
            >
              {{ demo.name }}
            </el-button>
          </div>
        </el-card>

        <!-- 解析结果 -->
        <el-card v-if="parsedFields" shadow="hover" class="result-card">
          <template #header>
            <div class="card-header">
              <el-icon><DataAnalysis /></el-icon>
              <span class="card-title">解析结果</span>
              <el-tag :type="getConfidenceType(parsedFields.confidence)" size="small">
                置信度: {{ (parsedFields.confidence * 100).toFixed(0) }}%
              </el-tag>
            </div>
          </template>

          <el-descriptions :column="1" border>
            <el-descriptions-item label="实验目的">
              {{ parsedFields.purpose || '未识别' }}
            </el-descriptions-item>
            <el-descriptions-item label="样品类型">
              <el-tag v-if="parsedFields.sample_type" type="success">
                {{ parsedFields.sample_type }}
              </el-tag>
              <span v-else class="empty-text">未识别</span>
            </el-descriptions-item>
            <el-descriptions-item label="检测指标">
              <el-tag
                v-for="(indicator, index) in parsedFields.indicators"
                :key="index"
                type="primary"
                size="small"
                style="margin-right: 8px; margin-bottom: 4px;"
              >
                {{ indicator }}
              </el-tag>
              <span v-if="!parsedFields.indicators || parsedFields.indicators.length === 0" class="empty-text">
                未识别
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="所需设备">
              <el-tag
                v-for="(equipment, index) in parsedFields.equipment"
                :key="index"
                type="warning"
                size="small"
                style="margin-right: 8px; margin-bottom: 4px;"
              >
                {{ equipment }}
              </el-tag>
              <span v-if="!parsedFields.equipment || parsedFields.equipment.length === 0" class="empty-text">
                未识别
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="所需材料">
              <el-tag
                v-for="(material, index) in parsedFields.materials"
                :key="index"
                type="info"
                size="small"
                style="margin-right: 8px; margin-bottom: 4px;"
              >
                {{ material }}
              </el-tag>
              <span v-if="!parsedFields.materials || parsedFields.materials.length === 0" class="empty-text">
                未识别
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="预计时间">
              {{ parsedFields.estimated_time || '未识别' }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>

      <!-- 右侧：实验计划 -->
      <el-col :xs="24" :lg="12">
        <el-card v-if="experimentPlan" shadow="hover" class="plan-card">
          <template #header>
            <div class="card-header">
              <el-icon><Notebook /></el-icon>
              <span class="card-title">实验计划</span>
              <el-button
                type="primary"
                size="small"
                :icon="Download"
                @click="handleExportPlan"
              >
                导出
              </el-button>
            </div>
          </template>

          <div class="plan-content" v-html="renderedPlan"></div>
        </el-card>

        <!-- 空状态提示 -->
        <el-empty
          v-if="!experimentPlan"
          description="请先输入实验需求并解析，然后生成实验计划"
          :image-size="150"
        >
          <template #image>
            <el-icon :size="100" color="#909399"><Document /></el-icon>
          </template>
        </el-empty>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Edit,
  MagicStick,
  Document,
  Refresh,
  DataAnalysis,
  Notebook,
  Download
} from '@element-plus/icons-vue'
import http from '@/services/http'
import { marked } from 'marked'

// 状态
const experimentText = ref('')
const parsing = ref(false)
const generating = ref(false)
const parsedFields = ref<any>(null)
const experimentPlan = ref<any>(null)

// 演示案例
const demoCases = ref([
  {
    id: 1,
    name: '水样重金属检测',
    text: '我需要检测水样中的重金属含量，包括铅、汞、镉、铬、砷等指标，预计需要2小时'
  },
  {
    id: 2,
    name: '土壤有机物分析',
    text: '需要对土壤样品进行有机物分析，检测苯、甲苯、二甲苯等有机污染物'
  },
  {
    id: 3,
    name: '空气质量监测',
    text: '进行空气质量监测，测定PM2.5、PM10、SO2、NO2、CO、O3等指标'
  }
])

// 渲染Markdown格式的实验计划
const renderedPlan = computed(() => {
  if (!experimentPlan.value || !experimentPlan.value.markdown) {
    return ''
  }
  return marked(experimentPlan.value.markdown)
})

/**
 * 解析实验需求
 */
const handleParse = async () => {
  if (!experimentText.value.trim()) {
    ElMessage.warning('请输入实验需求')
    return
  }

  parsing.value = true
  parsedFields.value = null
  experimentPlan.value = null

  try {
    const response = await http.post('/api/agent/parse', {
      text: experimentText.value
    })

    if (response.success && response.data) {
      parsedFields.value = response.data
      ElMessage.success('解析成功')
    } else {
      ElMessage.error(response.error || '解析失败')
    }
  } catch (error: any) {
    console.error('解析失败:', error)
    ElMessage.error(error.message || '解析失败，请稍后重试')
  } finally {
    parsing.value = false
  }
}

/**
 * 生成实验计划
 */
const handleGeneratePlan = async () => {
  if (!parsedFields.value) {
    ElMessage.warning('请先解析实验需求')
    return
  }

  generating.value = true
  experimentPlan.value = null

  try {
    const response = await http.post('/api/agent/plan', {
      parsed_fields: parsedFields.value
    })

    if (response.success && response.data) {
      experimentPlan.value = response.data
      ElMessage.success('实验计划生成成功')
    } else {
      ElMessage.error(response.error || '生成失败')
    }
  } catch (error: any) {
    console.error('生成失败:', error)
    ElMessage.error(error.message || '生成失败，请稍后重试')
  } finally {
    generating.value = false
  }
}

/**
 * 重置
 */
const handleReset = () => {
  experimentText.value = ''
  parsedFields.value = null
  experimentPlan.value = null
  ElMessage.info('已重置')
}

/**
 * 加载演示案例
 */
const loadDemoCase = (demo: any) => {
  experimentText.value = demo.text
  parsedFields.value = null
  experimentPlan.value = null
  ElMessage.success(`已加载演示案例: ${demo.name}`)
}

/**
 * 导出实验计划
 */
const handleExportPlan = () => {
  if (!experimentPlan.value || !experimentPlan.value.markdown) {
    ElMessage.warning('没有可导出的实验计划')
    return
  }

  const blob = new Blob([experimentPlan.value.markdown], { type: 'text/markdown' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `实验计划_${new Date().getTime()}.md`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
  
  ElMessage.success('实验计划已导出')
}

/**
 * 获取置信度类型
 */
const getConfidenceType = (confidence: number) => {
  if (confidence >= 0.8) return 'success'
  if (confidence >= 0.6) return 'warning'
  return 'danger'
}
</script>

<style scoped>
.experiment-analysis {
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

/* 输入卡片 */
.input-card {
  margin-bottom: 20px;
}

.input-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.button-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.button-group .el-button {
  flex: 1;
  min-width: 120px;
}

/* 演示案例 */
.demo-cases {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 结果卡片 */
.result-card {
  margin-bottom: 20px;
}

.empty-text {
  color: #909399;
  font-style: italic;
}

/* 实验计划卡片 */
.plan-card {
  margin-bottom: 20px;
  min-height: 600px;
}

.plan-content {
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 8px;
  line-height: 1.8;
}

.plan-content :deep(h1) {
  font-size: 24px;
  font-weight: 600;
  margin: 16px 0;
  color: #303133;
  border-bottom: 2px solid #409eff;
  padding-bottom: 8px;
}

.plan-content :deep(h2) {
  font-size: 20px;
  font-weight: 600;
  margin: 16px 0 12px 0;
  color: #409eff;
}

.plan-content :deep(h3) {
  font-size: 16px;
  font-weight: 600;
  margin: 12px 0 8px 0;
  color: #606266;
}

.plan-content :deep(p) {
  margin: 8px 0;
  color: #606266;
}

.plan-content :deep(ul),
.plan-content :deep(ol) {
  margin: 8px 0;
  padding-left: 24px;
}

.plan-content :deep(li) {
  margin: 4px 0;
  color: #606266;
}

.plan-content :deep(strong) {
  color: #303133;
  font-weight: 600;
}

.plan-content :deep(code) {
  background-color: #f0f2f5;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  color: #e6a23c;
}

.plan-content :deep(pre) {
  background-color: #282c34;
  color: #abb2bf;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 12px 0;
}

.plan-content :deep(pre code) {
  background-color: transparent;
  color: inherit;
  padding: 0;
}

.plan-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
}

.plan-content :deep(table th),
.plan-content :deep(table td) {
  border: 1px solid #dcdfe6;
  padding: 8px 12px;
  text-align: left;
}

.plan-content :deep(table th) {
  background-color: #f0f2f5;
  font-weight: 600;
  color: #303133;
}

.plan-content :deep(blockquote) {
  border-left: 4px solid #409eff;
  padding-left: 16px;
  margin: 12px 0;
  color: #606266;
  font-style: italic;
}

/* 响应式 */
@media (max-width: 768px) {
  .button-group {
    flex-direction: column;
  }

  .button-group .el-button {
    width: 100%;
  }

  .demo-cases {
    flex-direction: column;
  }

  .demo-cases .el-button {
    width: 100%;
  }
}
</style>
