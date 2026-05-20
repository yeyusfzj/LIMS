<template>
  <div class="duration-chart">
    <div ref="boxChartRef" class="chart-item"></div>
    <div ref="barChartRef" class="chart-item"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import type { DurationData } from '@/types/statistics'

const props = defineProps<{
  data: DurationData | null
}>()

const boxChartRef = ref<HTMLElement>()
const barChartRef = ref<HTMLElement>()
let boxChartInstance: echarts.ECharts | null = null
let barChartInstance: echarts.ECharts | null = null

const initCharts = () => {
  if (boxChartRef.value) {
    boxChartInstance = echarts.init(boxChartRef.value)
  }
  if (barChartRef.value) {
    barChartInstance = echarts.init(barChartRef.value)
  }

  updateCharts()
}

const updateCharts = () => {
  if (!props.data) return

  updateBoxChart()
  updateBarChart()
}

const updateBoxChart = () => {
  if (!boxChartInstance || !props.data) return

  const option: echarts.EChartsOption = {
    title: {
      text: '审核时长统计指标',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        return `${params.name}: ${params.value.toFixed(2)} 小时`
      }
    },
    xAxis: {
      type: 'category',
      data: ['最短', '平均', '中位数', '最长'],
      axisLabel: {
        interval: 0
      }
    },
    yAxis: {
      type: 'value',
      name: '时长(小时)'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    series: [
      {
        name: '时长',
        type: 'bar',
        data: [
          { value: props.data.min, itemStyle: { color: '#67C23A' } },
          { value: props.data.average, itemStyle: { color: '#409EFF' } },
          { value: props.data.median, itemStyle: { color: '#E6A23C' } },
          { value: props.data.max, itemStyle: { color: '#F56C6C' } }
        ],
        label: {
          show: true,
          position: 'top',
          formatter: (params: any) => params.value.toFixed(2)
        }
      }
    ]
  }

  boxChartInstance.setOption(option)
}

const updateBarChart = () => {
  if (!barChartInstance || !props.data) return

  const ranges = props.data.distribution.map(item => item.range)
  const counts = props.data.distribution.map(item => item.count)

  const option: echarts.EChartsOption = {
    title: {
      text: '时长分布',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: (params: any) => {
        const param = params[0]
        return `${param.name}<br/>任务数: ${param.value}`
      }
    },
    xAxis: {
      type: 'category',
      data: ranges,
      axisLabel: {
        interval: 0,
        rotate: 30
      }
    },
    yAxis: {
      type: 'value',
      name: '任务数'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true
    },
    series: [
      {
        name: '任务数',
        type: 'bar',
        data: counts,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#83bff6' },
            { offset: 0.5, color: '#188df0' },
            { offset: 1, color: '#188df0' }
          ])
        },
        emphasis: {
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#2378f7' },
              { offset: 0.7, color: '#2378f7' },
              { offset: 1, color: '#83bff6' }
            ])
          }
        }
      }
    ]
  }

  barChartInstance.setOption(option)
}

const handleResize = () => {
  boxChartInstance?.resize()
  barChartInstance?.resize()
}

watch(() => props.data, () => {
  updateCharts()
}, { deep: true })

onMounted(() => {
  initCharts()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  boxChartInstance?.dispose()
  barChartInstance?.dispose()
})
</script>

<style scoped>
.duration-chart {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.chart-item {
  width: 100%;
  height: 400px;
}

@media (max-width: 768px) {
  .duration-chart {
    grid-template-columns: 1fr;
  }
}
</style>
