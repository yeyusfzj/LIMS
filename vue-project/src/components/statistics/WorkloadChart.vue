<template>
  <div ref="chartRef" class="workload-chart"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import type { WorkloadData } from '@/types/statistics'

const props = defineProps<{
  data: Array<{
    auditorId: string
    auditorName: string
    totalTasks: number
    completedTasks: number
    pendingTasks: number
  }>
}>()

const chartRef = ref<HTMLElement>()
let chartInstance: echarts.ECharts | null = null

const initChart = () => {
  if (!chartRef.value) return

  chartInstance = echarts.init(chartRef.value)

  updateChart()
}

const updateChart = () => {
  if (!chartInstance || !props.data || props.data.length === 0) return

  const auditorNames = props.data.map(item => item.auditorName)
  const totalTasks = props.data.map(item => item.totalTasks)
  const completedTasks = props.data.map(item => item.completedTasks)
  const pendingTasks = props.data.map(item => item.pendingTasks)

  const option: echarts.EChartsOption = {
    title: {
      text: '审核人员工作量统计',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    legend: {
      data: ['总任务数', '已完成', '待处理'],
      top: 30
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: auditorNames,
      axisLabel: {
        interval: 0,
        rotate: 30
      }
    },
    yAxis: {
      type: 'value',
      name: '任务数'
    },
    series: [
      {
        name: '总任务数',
        type: 'bar',
        data: totalTasks,
        itemStyle: {
          color: '#409EFF'
        }
      },
      {
        name: '已完成',
        type: 'bar',
        data: completedTasks,
        itemStyle: {
          color: '#67C23A'
        }
      },
      {
        name: '待处理',
        type: 'bar',
        data: pendingTasks,
        itemStyle: {
          color: '#E6A23C'
        }
      }
    ],
    dataZoom: [
      {
        type: 'slider',
        show: auditorNames.length > 10,
        start: 0,
        end: auditorNames.length > 10 ? 50 : 100
      }
    ]
  }

  chartInstance.setOption(option)
}

const handleResize = () => {
  chartInstance?.resize()
}

watch(() => props.data, () => {
  updateChart()
}, { deep: true })

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance?.dispose()
})
</script>

<style scoped>
.workload-chart {
  width: 100%;
  height: 400px;
}
</style>
