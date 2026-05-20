<template>
  <div ref="chartRef" class="issue-chart"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import type { IssueData } from '@/types/statistics'

const props = defineProps<{
  data: IssueData | null
}>()

const chartRef = ref<HTMLElement>()
let chartInstance: echarts.ECharts | null = null

const initChart = () => {
  if (!chartRef.value) return

  chartInstance = echarts.init(chartRef.value)

  updateChart()
}

const updateChart = () => {
  if (!chartInstance || !props.data || props.data.byReason.length === 0) return

  const reasons = props.data.byReason.map(item => item.reason)
  const counts = props.data.byReason.map(item => item.count)
  
  // 计算累积百分比
  let cumulative = 0
  const cumulativePercentages = props.data.byReason.map(item => {
    cumulative += item.percentage
    return cumulative
  })

  const option: echarts.EChartsOption = {
    title: {
      text: '问题分类帕累托图',
      subtext: '按出现频率降序排列',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        crossStyle: {
          color: '#999'
        }
      }
    },
    legend: {
      data: ['出现次数', '累积占比'],
      top: 40
    },
    xAxis: [
      {
        type: 'category',
        data: reasons,
        axisPointer: {
          type: 'shadow'
        },
        axisLabel: {
          interval: 0,
          rotate: 30,
          formatter: (value: string) => {
            return value.length > 10 ? value.substring(0, 10) + '...' : value
          }
        }
      }
    ],
    yAxis: [
      {
        type: 'value',
        name: '出现次数',
        position: 'left'
      },
      {
        type: 'value',
        name: '累积占比(%)',
        position: 'right',
        min: 0,
        max: 100,
        axisLabel: {
          formatter: '{value}%'
        }
      }
    ],
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true
    },
    series: [
      {
        name: '出现次数',
        type: 'bar',
        data: counts,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#f56c6c' },
            { offset: 1, color: '#fca5a5' }
          ])
        }
      },
      {
        name: '累积占比',
        type: 'line',
        yAxisIndex: 1,
        data: cumulativePercentages.map(p => p.toFixed(2)),
        smooth: true,
        itemStyle: {
          color: '#409EFF'
        },
        lineStyle: {
          width: 3
        },
        markLine: {
          data: [
            { yAxis: 80, name: '80%线', lineStyle: { color: '#E6A23C', type: 'dashed' } }
          ],
          label: {
            formatter: '{b}'
          }
        }
      }
    ],
    dataZoom: [
      {
        type: 'slider',
        show: reasons.length > 10,
        start: 0,
        end: reasons.length > 10 ? 50 : 100
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
.issue-chart {
  width: 100%;
  height: 400px;
}
</style>
