<template>
  <div class="statistics-dashboard">
    <!-- 顶部数据卡片 -->
    <el-row :gutter="20" class="stats-cards">
      <el-col :xs="24" :sm="12" :md="6" v-for="card in statsCards" :key="card.title">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" :style="{ backgroundColor: card.color }">
              <el-icon :size="32">
                <component :is="card.icon" />
              </el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ card.value }}</div>
              <div class="stat-title">{{ card.title }}</div>
              <div class="stat-trend" :class="card.trend > 0 ? 'up' : 'down'">
                <el-icon>
                  <component :is="card.trend > 0 ? 'ArrowUp' : 'ArrowDown'" />
                </el-icon>
                {{ Math.abs(card.trend) }}%
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 筛选区域 -->
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        
        <el-form-item label="样品类型">
          <el-select v-model="filterForm.sampleType" placeholder="请选择" clearable style="width: 180px">
            <el-option label="全部" value="" />
            <el-option label="水质样品" value="water" />
            <el-option label="土壤样品" value="soil" />
            <el-option label="空气样品" value="air" />
            <el-option label="食品样品" value="food" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="检测项目">
          <el-select v-model="filterForm.testProject" placeholder="请选择" clearable style="width: 180px">
            <el-option label="全部" value="" />
            <el-option label="重金属检测" value="heavy_metal" />
            <el-option label="微生物检测" value="microbe" />
            <el-option label="理化指标" value="physical" />
            <el-option label="有机物检测" value="organic" />
          </el-select>
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="handleFilter">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
          <el-dropdown @command="handleExport" style="margin-left: 10px">
            <el-button type="success">
              <el-icon><Download /></el-icon>
              导出报表
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="excel">
                  <el-icon><Document /></el-icon>
                  导出为 Excel
                </el-dropdown-item>
                <el-dropdown-item command="pdf">
                  <el-icon><Document /></el-icon>
                  导出为 PDF
                </el-dropdown-item>
                <el-dropdown-item command="image">
                  <el-icon><Picture /></el-icon>
                  导出为图片
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 图表展示区域 -->
    <el-row :gutter="20" class="charts-section">
      <!-- 样品趋势图 -->
      <el-col :xs="24" :md="12">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>样品数量趋势</span>
              <el-radio-group v-model="sampleTrendPeriod" size="small">
                <el-radio-button label="week">近7天</el-radio-button>
                <el-radio-button label="month">近30天</el-radio-button>
                <el-radio-button label="year">近一年</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div ref="sampleTrendChart" class="chart-container"></div>
        </el-card>
      </el-col>

      <!-- 样品类型分布 -->
      <el-col :xs="24" :md="12">
        <el-card shadow="never">
          <template #header>
            <span>样品类型分布</span>
          </template>
          <div ref="sampleTypeChart" class="chart-container"></div>
        </el-card>
      </el-col>

      <!-- 检测项目统计 -->
      <el-col :xs="24" :md="12">
        <el-card shadow="never">
          <template #header>
            <span>检测项目统计</span>
          </template>
          <div ref="testProjectChart" class="chart-container"></div>
        </el-card>
      </el-col>

      <!-- 合格率统计 -->
      <el-col :xs="24" :md="12">
        <el-card shadow="never">
          <template #header>
            <span>合格率统计</span>
          </template>
          <div ref="qualificationChart" class="chart-container"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Search, 
  Refresh,
  Document,
  Clock,
  Check,
  Warning,
  ArrowUp,
  ArrowDown,
  Download,
  Picture
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { exportToExcel, exportToPDF, exportToImage } from '@/utils/exportUtils'

// 统计卡片数据
const statsCards = ref([
  {
    title: '样品总数',
    value: '1,234',
    icon: 'Document',
    color: '#409EFF',
    trend: 12.5
  },
  {
    title: '待处理任务',
    value: '56',
    icon: 'Clock',
    color: '#E6A23C',
    trend: -8.3
  },
  {
    title: '合格率',
    value: '98.5%',
    icon: 'Check',
    color: '#67C23A',
    trend: 2.1
  },
  {
    title: '异常样品',
    value: '18',
    icon: 'Warning',
    color: '#F56C6C',
    trend: -15.2
  }
])

// 筛选表单
const filterForm = reactive({
  dateRange: [],
  sampleType: '',
  testProject: ''
})

// 样品趋势周期
const sampleTrendPeriod = ref('month')

// 图表引用
const sampleTrendChart = ref<HTMLElement>()
const sampleTypeChart = ref<HTMLElement>()
const testProjectChart = ref<HTMLElement>()
const qualificationChart = ref<HTMLElement>()

// 筛选处理
const handleFilter = () => {
  console.log('筛选条件:', filterForm)
  // 重新加载图表数据
  initCharts()
}

// 重置筛选
const handleReset = () => {
  filterForm.dateRange = []
  filterForm.sampleType = ''
  filterForm.testProject = ''
  initCharts()
}

// 导出报表
const handleExport = (command: string) => {
  const exportType = command === 'excel' ? 'Excel' : command === 'pdf' ? 'PDF' : '图片'
  
  // 准备导出数据
  const exportData = [
    {
      指标: '样品总数',
      数值: statsCards.value[0].value,
      趋势: `${statsCards.value[0].trend}%`
    },
    {
      指标: '待处理任务',
      数值: statsCards.value[1].value,
      趋势: `${statsCards.value[1].trend}%`
    },
    {
      指标: '合格率',
      数值: statsCards.value[2].value,
      趋势: `${statsCards.value[2].trend}%`
    },
    {
      指标: '异常样品',
      数值: statsCards.value[3].value,
      趋势: `${statsCards.value[3].trend}%`
    }
  ]
  
  // 根据命令执行不同的导出
  if (command === 'excel') {
    exportToExcel(exportData, '统计报表')
  } else if (command === 'pdf') {
    const element = document.querySelector('.statistics-dashboard') as HTMLElement
    exportToPDF(element, '统计报表')
  } else if (command === 'image') {
    const element = document.querySelector('.statistics-dashboard') as HTMLElement
    exportToImage(element, '统计报表')
  }
}

// 初始化图表
const initCharts = () => {
  initSampleTrendChart()
  initSampleTypeChart()
  initTestProjectChart()
  initQualificationChart()
}

// 样品趋势图
const initSampleTrendChart = () => {
  if (!sampleTrendChart.value) return
  
  const chart = echarts.init(sampleTrendChart.value)
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['接收样品', '完成检测', '已出报告']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '接收样品',
        type: 'line',
        data: [120, 132, 101, 134, 90, 230, 210, 182, 191, 234, 290, 330],
        smooth: true
      },
      {
        name: '完成检测',
        type: 'line',
        data: [110, 125, 95, 128, 85, 220, 200, 175, 185, 225, 280, 320],
        smooth: true
      },
      {
        name: '已出报告',
        type: 'line',
        data: [105, 120, 90, 125, 80, 215, 195, 170, 180, 220, 275, 315],
        smooth: true
      }
    ]
  }
  chart.setOption(option)
  
  // 响应式调整
  window.addEventListener('resize', () => chart.resize())
}

// 样品类型分布图
const initSampleTypeChart = () => {
  if (!sampleTypeChart.value) return
  
  const chart = echarts.init(sampleTypeChart.value)
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '样品类型',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: [
          { value: 335, name: '水质样品' },
          { value: 310, name: '土壤样品' },
          { value: 234, name: '空气样品' },
          { value: 135, name: '食品样品' },
          { value: 220, name: '其他样品' }
        ]
      }
    ]
  }
  chart.setOption(option)
  
  window.addEventListener('resize', () => chart.resize())
}

// 检测项目统计图
const initTestProjectChart = () => {
  if (!testProjectChart.value) return
  
  const chart = echarts.init(testProjectChart.value)
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      boundaryGap: [0, 0.01]
    },
    yAxis: {
      type: 'category',
      data: ['有机物检测', '理化指标', '微生物检测', '重金属检测']
    },
    series: [
      {
        name: '检测数量',
        type: 'bar',
        data: [180, 245, 320, 410],
        itemStyle: {
          color: '#409EFF'
        }
      }
    ]
  }
  chart.setOption(option)
  
  window.addEventListener('resize', () => chart.resize())
}

// 合格率统计图
const initQualificationChart = () => {
  if (!qualificationChart.value) return
  
  const chart = echarts.init(qualificationChart.value)
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['合格率', '不合格率']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月']
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '{value}%'
      }
    },
    series: [
      {
        name: '合格率',
        type: 'bar',
        data: [98.2, 97.8, 98.5, 99.1, 98.7, 98.9],
        itemStyle: {
          color: '#67C23A'
        }
      },
      {
        name: '不合格率',
        type: 'bar',
        data: [1.8, 2.2, 1.5, 0.9, 1.3, 1.1],
        itemStyle: {
          color: '#F56C6C'
        }
      }
    ]
  }
  chart.setOption(option)
  
  window.addEventListener('resize', () => chart.resize())
}

onMounted(() => {
  initCharts()
})
</script>

<style scoped>
.statistics-dashboard {
  padding: 20px;
}

.stats-cards {
  margin-bottom: 20px;
}

.stat-card {
  cursor: pointer;
  transition: transform 0.3s;
}

.stat-card:hover {
  transform: translateY(-5px);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.stat-title {
  font-size: 14px;
  color: #909399;
  margin-bottom: 5px;
}

.stat-trend {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-trend.up {
  color: #67C23A;
}

.stat-trend.down {
  color: #F56C6C;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-form {
  margin: 0;
}

.charts-section {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  height: 350px;
  width: 100%;
}

@media (max-width: 768px) {
  .stat-content {
    flex-direction: column;
    text-align: center;
  }
  
  .chart-container {
    height: 300px;
  }
}
</style>
