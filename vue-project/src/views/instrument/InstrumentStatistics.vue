<template>
  <div class="instrument-statistics">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>仪器统计分析</span>
          <el-button type="primary" @click="handleExport">导出报表</el-button>
        </div>
      </template>

      <el-row :gutter="20">
        <!-- 统计卡片 -->
        <el-col :xs="24" :sm="12" :md="6">
          <el-card shadow="hover">
            <el-statistic title="仪器总数" :value="statistics?.totalCount || 0" />
          </el-card>
        </el-col>
        
        <el-col :xs="24" :sm="12" :md="6">
          <el-card shadow="hover">
            <el-statistic title="总价值" :value="statistics?.totalValue || 0" prefix="¥" />
          </el-card>
        </el-col>
        
        <el-col :xs="24" :sm="12" :md="6">
          <el-card shadow="hover">
            <el-statistic
              title="即将到期校准"
              :value="statistics?.expiringCalibrations?.count || 0"
            />
          </el-card>
        </el-col>
        
        <el-col :xs="24" :sm="12" :md="6">
          <el-card shadow="hover">
            <el-statistic title="在用仪器" :value="getStatusCount('IN_USE')" />
          </el-card>
        </el-col>
      </el-row>

      <!-- 图表区域 -->
      <el-row :gutter="20" style="margin-top: 20px">
        <el-col :xs="24" :md="12">
          <el-card shadow="hover">
            <template #header>状态分布</template>
            <div ref="statusChartRef" style="height: 300px"></div>
          </el-card>
        </el-col>
        
        <el-col :xs="24" :md="12">
          <el-card shadow="hover">
            <template #header>部门分布</template>
            <div ref="departmentChartRef" style="height: 300px"></div>
          </el-card>
        </el-col>
      </el-row>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useInstrumentStore } from '@/stores/instrument'
import instrumentService from '@/services/instrumentService'
import * as echarts from 'echarts'

const instrumentStore = useInstrumentStore()

const statusChartRef = ref<HTMLElement>()
const departmentChartRef = ref<HTMLElement>()

const statistics = computed(() => instrumentStore.statistics)

const getStatusCount = (status: string): number => {
  const dist = statistics.value?.statusDistribution?.find(d => d.status === status)
  return dist?.count || 0
}

const loadStatistics = async () => {
  try {
    await instrumentStore.fetchStatistics()
    initCharts()
  } catch (error: any) {
    ElMessage.error(error.message || '加载统计数据失败')
  }
}

const initCharts = () => {
  if (!statistics.value) return

  // 状态分布图
  if (statusChartRef.value) {
    const statusChart = echarts.init(statusChartRef.value)
    statusChart.setOption({
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: '50%',
        data: statistics.value.statusDistribution?.map(d => ({
          name: d.status,
          value: d.count
        })) || []
      }]
    })
  }

  // 部门分布图
  if (departmentChartRef.value) {
    const departmentChart = echarts.init(departmentChartRef.value)
    departmentChart.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: statistics.value.departmentDistribution?.map(d => d.department) || []
      },
      yAxis: { type: 'value' },
      series: [{
        type: 'bar',
        data: statistics.value.departmentDistribution?.map(d => d.count) || []
      }]
    })
  }
}

const handleExport = async () => {
  try {
    const blob = await instrumentService.exportStatistics({}, 'xlsx')
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `仪器统计报表_${new Date().getTime()}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (error: any) {
    ElMessage.error(error.message || '导出失败')
  }
}

onMounted(() => {
  loadStatistics()
})
</script>

<style scoped>
.instrument-statistics {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
