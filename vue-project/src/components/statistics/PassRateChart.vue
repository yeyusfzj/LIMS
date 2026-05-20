<template>
  <div class="pass-rate-chart">
    <div ref="pieChartRef" class="chart-item"></div>
    <div ref="lineChartRef" class="chart-item"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'
import type { PassRateData } from '@/types/statistics'

const props = defineProps<{
  data: PassRateData | null
}>()

const pieChartRef = ref<HTMLElement>()
const lineChartRef = ref<HTMLElement>()
let pieChartInstance: echarts.ECharts | null = null
let lineChartInstance: echarts.ECharts | null = null

const initCharts = () => {
  if (pieChartRef.value) {
    pieChartInstance = echarts.init(pieChartRef.value)
  }
  if (lineChartRef.value) {
    lineChartInstance = echarts.init(lineChartRef.value)
  }

  updateCharts()
}

const updateCharts = () => {
  if (!props.data) return

  updatePieChart()
  updateLineChart()
}

const updatePieChart = () => {
  if (!pieChartInstance || !props.data) return

  const option: echarts.EChartsOption = {
    title: {
      text: '整体通过率分布',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'middle'
    },
    series: [
      {
        name: '审核结果',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: '{b}: {d}%'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        data: [
          {
            value: props.data.overall.passed,
            name: '通过',
            itemStyle: { color: '#67C23A' }
          },
          {
            value: props.data.overall.rejected,
            name: '退回',
            itemStyle: { color: '#F56C6C' }
          }
        ]
      }
    ]
  }

  pieChartInstance.setOption(option)
}

const updateLineChart = () => {
  if (!lineChartInstance || !props.data) return

  const levelData = props.data.byLevel.map(item => ({
    level: `第${item.level}级`,
    passRate: item.passRate
  }))

  const option: echarts.EChartsOption = {
    title: {
      text: '各级别通过率趋势',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>{a}: {c}%'
    },
    xAxis: {
      type: 'category',
      data: levelData.map(item => item.level),
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      name: '通过率(%)',
      min: 0,
      max: 100,
      axisLabel: {
        formatter: '{value}%'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    series: [
      {
        name: '通过率',
        type: 'line',
        data: levelData.map(item => item.passRate.toFixed(2)),
        smooth: true,
        itemStyle: {
          color: '#409EFF'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.05)' }
          ])
        },
        markLine: {
          data: [
            { yAxis: 90, name: '优秀线', lineStyle: { color: '#67C23A' } },
            { yAxis: 70, name: '警戒线', lineStyle: { color: '#E6A23C' } }
          ],
          label: {
            formatter: '{b}: {c}%'
          }
        }
      }
    ]
  }

  lineChartInstance.setOption(option)
}

const handleResize = () => {
  pieChartInstance?.resize()
  lineChartInstance?.resize()
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
  pieChartInstance?.dispose()
  lineChartInstance?.dispose()
})
</script>

<style scoped>
.pass-rate-chart {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.chart-item {
  width: 100%;
  height: 400px;
}

@media (max-width: 768px) {
  .pass-rate-chart {
    grid-template-columns: 1fr;
  }
}
</style>
