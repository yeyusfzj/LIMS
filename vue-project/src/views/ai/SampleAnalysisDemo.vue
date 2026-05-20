<template>
  <div class="sample-analysis-demo">
    <h1>样品检测结果 AI 分析</h1>
    <p>使用真实数据库数据进行智能分析</p>
    
    <el-button type="primary" @click="testAnalysis">测试分析</el-button>
    
    <div v-if="result">
      <h2>分析结果</h2>
      <pre>{{ JSON.stringify(result, null, 2) }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { agentApi } from '@/services/api/agent'

const result = ref<any>(null)

const testAnalysis = async () => {
  try {
    ElMessage.info('正在分析...')
    const sampleId = '4f81f49d-c941-4c92-95f7-e4e54023bd16'
    const analysis = await agentApi.analyzeSample(sampleId)
    result.value = analysis
    ElMessage.success('分析完成！')
  } catch (error: any) {
    ElMessage.error(error.message)
  }
}
</script>

<style scoped>
.sample-analysis-demo {
  padding: 20px;
}
</style>
