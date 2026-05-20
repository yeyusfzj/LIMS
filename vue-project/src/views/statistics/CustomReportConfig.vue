<template>
  <div class="custom-report-config">
    <!-- 顶部操作栏 -->
    <div class="header-actions">
      <el-button type="primary" @click="handleCreateReport">
        <el-icon><Plus /></el-icon>
        新建报表
      </el-button>
    </div>

    <!-- 已保存的报表列表 -->
    <el-card shadow="never" class="report-list-card">
      <template #header>
        <div class="card-header">
          <span>我的报表</span>
          <el-input
            v-model="searchKeyword"
            placeholder="搜索报表名称"
            style="width: 250px"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
      </template>

      <el-table :data="filteredReports" stripe>
        <el-table-column prop="name" label="报表名称" min-width="200" />
        <el-table-column prop="description" label="描述" min-width="250" show-overflow-tooltip />
        <el-table-column prop="metrics" label="指标数量" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small">{{ row.metrics.length }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="dimensions" label="维度数量" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" type="success">{{ row.dimensions.length }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column prop="updatedAt" label="更新时间" width="180" />
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleViewReport(row)">
              <el-icon><View /></el-icon>
              查看
            </el-button>
            <el-button link type="primary" @click="handleEditReport(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button link type="warning" @click="handleExportReport(row)">
              <el-icon><Download /></el-icon>
              导出
            </el-button>
            <el-button link type="danger" @click="handleDeleteReport(row)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 报表配置对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEditMode ? '编辑报表' : '新建报表'"
      width="900px"
      :close-on-click-modal="false"
    >
      <el-form :model="reportForm" :rules="formRules" ref="formRef" label-width="100px">
        <!-- 基本信息 -->
        <el-divider content-position="left">基本信息</el-divider>
        
        <el-form-item label="报表名称" prop="name">
          <el-input v-model="reportForm.name" placeholder="请输入报表名称" />
        </el-form-item>
        
        <el-form-item label="报表描述" prop="description">
          <el-input
            v-model="reportForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入报表描述"
          />
        </el-form-item>

        <!-- 指标选择 -->
        <el-divider content-position="left">指标选择</el-divider>
        
        <el-form-item label="选择指标" prop="metrics">
          <el-transfer
            v-model="reportForm.metrics"
            :data="availableMetrics"
            :titles="['可选指标', '已选指标']"
            :props="{
              key: 'value',
              label: 'label'
            }"
            filterable
            filter-placeholder="搜索指标"
          />
        </el-form-item>

        <!-- 维度配置 -->
        <el-divider content-position="left">维度配置</el-divider>
        
        <el-form-item label="选择维度" prop="dimensions">
          <el-checkbox-group v-model="reportForm.dimensions">
            <el-row :gutter="20">
              <el-col :span="8" v-for="dim in availableDimensions" :key="dim.value">
                <el-checkbox :label="dim.value">{{ dim.label }}</el-checkbox>
              </el-col>
            </el-row>
          </el-checkbox-group>
        </el-form-item>

        <!-- 筛选条件 -->
        <el-divider content-position="left">筛选条件</el-divider>
        
        <el-form-item label="时间范围">
          <el-radio-group v-model="reportForm.timeRange">
            <el-radio label="today">今天</el-radio>
            <el-radio label="week">本周</el-radio>
            <el-radio label="month">本月</el-radio>
            <el-radio label="quarter">本季度</el-radio>
            <el-radio label="year">本年</el-radio>
            <el-radio label="custom">自定义</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="样品类型">
          <el-select
            v-model="reportForm.sampleTypes"
            multiple
            placeholder="请选择样品类型"
            style="width: 100%"
          >
            <el-option label="全部" value="all" />
            <el-option label="水质样品" value="water" />
            <el-option label="土壤样品" value="soil" />
            <el-option label="空气样品" value="air" />
            <el-option label="食品样品" value="food" />
          </el-select>
        </el-form-item>

        <el-form-item label="检测项目">
          <el-select
            v-model="reportForm.testProjects"
            multiple
            placeholder="请选择检测项目"
            style="width: 100%"
          >
            <el-option label="全部" value="all" />
            <el-option label="重金属检测" value="heavy_metal" />
            <el-option label="微生物检测" value="microbe" />
            <el-option label="理化指标" value="physical" />
            <el-option label="有机物检测" value="organic" />
          </el-select>
        </el-form-item>

        <!-- 图表类型 -->
        <el-divider content-position="left">图表配置</el-divider>
        
        <el-form-item label="图表类型">
          <el-radio-group v-model="reportForm.chartType">
            <el-radio label="line">折线图</el-radio>
            <el-radio label="bar">柱状图</el-radio>
            <el-radio label="pie">饼图</el-radio>
            <el-radio label="table">表格</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handlePreview">
          <el-icon><View /></el-icon>
          预览
        </el-button>
        <el-button type="success" @click="handleSaveReport">
          <el-icon><Check /></el-icon>
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 报表预览对话框 -->
    <el-dialog
      v-model="previewVisible"
      title="报表预览"
      width="1000px"
      :close-on-click-modal="false"
    >
      <div class="preview-container">
        <div class="preview-header">
          <h3>{{ reportForm.name }}</h3>
          <p>{{ reportForm.description }}</p>
        </div>
        
        <div class="preview-info">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="指标数量">
              {{ reportForm.metrics.length }}
            </el-descriptions-item>
            <el-descriptions-item label="维度数量">
              {{ reportForm.dimensions.length }}
            </el-descriptions-item>
            <el-descriptions-item label="时间范围">
              {{ getTimeRangeLabel(reportForm.timeRange) }}
            </el-descriptions-item>
            <el-descriptions-item label="图表类型">
              {{ getChartTypeLabel(reportForm.chartType) }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="preview-chart">
          <div ref="previewChartRef" style="height: 400px; width: 100%;"></div>
        </div>
      </div>

      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleExportPreview">
          <el-icon><Download /></el-icon>
          导出数据
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  Plus,
  Search,
  View,
  Edit,
  Download,
  Delete,
  Check
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { exportToExcel, exportToPDF } from '@/utils/exportUtils'

// 搜索关键词
const searchKeyword = ref('')

// 已保存的报表列表
const savedReports = ref([
  {
    id: 1,
    name: '月度样品统计报表',
    description: '统计每月样品接收、检测、合格情况',
    metrics: ['sample_count', 'test_count', 'pass_rate'],
    dimensions: ['time', 'sample_type'],
    createdAt: '2024-01-15 10:30:00',
    updatedAt: '2024-01-20 14:20:00'
  },
  {
    id: 2,
    name: '检测项目分析报表',
    description: '分析各检测项目的工作量和合格率',
    metrics: ['test_count', 'pass_rate', 'avg_time'],
    dimensions: ['test_project', 'time'],
    createdAt: '2024-01-10 09:15:00',
    updatedAt: '2024-01-18 16:45:00'
  }
])

// 过滤后的报表列表
const filteredReports = computed(() => {
  if (!searchKeyword.value) return savedReports.value
  return savedReports.value.filter(report =>
    report.name.includes(searchKeyword.value) ||
    report.description.includes(searchKeyword.value)
  )
})

// 对话框显示状态
const dialogVisible = ref(false)
const previewVisible = ref(false)
const isEditMode = ref(false)

// 表单引用
const formRef = ref<FormInstance>()

// 报表表单
const reportForm = reactive({
  name: '',
  description: '',
  metrics: [] as string[],
  dimensions: [] as string[],
  timeRange: 'month',
  sampleTypes: [] as string[],
  testProjects: [] as string[],
  chartType: 'bar'
})

// 表单验证规则
const formRules: FormRules = {
  name: [
    { required: true, message: '请输入报表名称', trigger: 'blur' }
  ],
  metrics: [
    { required: true, message: '请至少选择一个指标', trigger: 'change' }
  ],
  dimensions: [
    { required: true, message: '请至少选择一个维度', trigger: 'change' }
  ]
}

// 可选指标
const availableMetrics = [
  { label: '样品数量', value: 'sample_count' },
  { label: '检测数量', value: 'test_count' },
  { label: '合格数量', value: 'pass_count' },
  { label: '不合格数量', value: 'fail_count' },
  { label: '合格率', value: 'pass_rate' },
  { label: '平均检测时长', value: 'avg_time' },
  { label: '任务完成率', value: 'task_completion_rate' },
  { label: '异常样品数', value: 'anomaly_count' },
  { label: '复测次数', value: 'retest_count' },
  { label: '报告生成数', value: 'report_count' }
]

// 可选维度
const availableDimensions = [
  { label: '时间', value: 'time' },
  { label: '样品类型', value: 'sample_type' },
  { label: '检测项目', value: 'test_project' },
  { label: '检测人员', value: 'tester' },
  { label: '委托方', value: 'client' },
  { label: '样品来源', value: 'source' }
]

// 预览图表引用
const previewChartRef = ref<HTMLElement>()

// 创建报表
const handleCreateReport = () => {
  isEditMode.value = false
  resetForm()
  dialogVisible.value = true
}

// 查看报表
const handleViewReport = (row: any) => {
  Object.assign(reportForm, row)
  previewVisible.value = true
  nextTick(() => {
    renderPreviewChart()
  })
}

// 编辑报表
const handleEditReport = (row: any) => {
  isEditMode.value = true
  Object.assign(reportForm, row)
  dialogVisible.value = true
}

// 导出报表
const handleExportReport = (row: any) => {
  ElMessageBox.confirm(
    '请选择导出格式',
    '导出报表',
    {
      distinguishCancelAndClose: true,
      confirmButtonText: 'Excel',
      cancelButtonText: 'PDF',
      type: 'info'
    }
  ).then(() => {
    // 导出为 Excel
    const exportData = [
      {
        报表名称: row.name,
        描述: row.description,
        指标数量: row.metrics.length,
        维度数量: row.dimensions.length,
        创建时间: row.createdAt,
        更新时间: row.updatedAt
      }
    ]
    exportToExcel(exportData, row.name)
  }).catch((action) => {
    if (action === 'cancel') {
      // 导出为 PDF
      const element = document.querySelector('.custom-report-config') as HTMLElement
      exportToPDF(element, row.name)
    }
  })
}

// 删除报表
const handleDeleteReport = (row: any) => {
  ElMessageBox.confirm(
    `确定要删除报表"${row.name}"吗？`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    const index = savedReports.value.findIndex(r => r.id === row.id)
    if (index > -1) {
      savedReports.value.splice(index, 1)
      ElMessage.success('删除成功')
    }
  }).catch(() => {
    // 取消删除
  })
}

// 预览报表
const handlePreview = () => {
  formRef.value?.validate((valid) => {
    if (valid) {
      previewVisible.value = true
      nextTick(() => {
        renderPreviewChart()
      })
    }
  })
}

// 保存报表
const handleSaveReport = () => {
  formRef.value?.validate((valid) => {
    if (valid) {
      if (isEditMode.value) {
        ElMessage.success('报表更新成功')
      } else {
        const newReport = {
          id: Date.now(),
          ...reportForm,
          createdAt: new Date().toLocaleString('zh-CN'),
          updatedAt: new Date().toLocaleString('zh-CN')
        }
        savedReports.value.unshift(newReport)
        ElMessage.success('报表保存成功')
      }
      dialogVisible.value = false
      resetForm()
    }
  })
}

// 导出预览数据
const handleExportPreview = () => {
  ElMessageBox.confirm(
    '请选择导出格式',
    '导出数据',
    {
      distinguishCancelAndClose: true,
      confirmButtonText: 'Excel',
      cancelButtonText: 'PDF',
      type: 'info'
    }
  ).then(() => {
    // 导出为 Excel
    const exportData = reportForm.metrics.map(metric => ({
      指标: availableMetrics.find(m => m.value === metric)?.label || metric,
      数值: Math.floor(Math.random() * 1000)
    }))
    exportToExcel(exportData, reportForm.name || '报表预览')
  }).catch((action) => {
    if (action === 'cancel') {
      // 导出为 PDF
      const element = document.querySelector('.preview-container') as HTMLElement
      exportToPDF(element, reportForm.name || '报表预览')
    }
  })
}

// 重置表单
const resetForm = () => {
  reportForm.name = ''
  reportForm.description = ''
  reportForm.metrics = []
  reportForm.dimensions = []
  reportForm.timeRange = 'month'
  reportForm.sampleTypes = []
  reportForm.testProjects = []
  reportForm.chartType = 'bar'
  formRef.value?.clearValidate()
}

// 渲染预览图表
const renderPreviewChart = () => {
  if (!previewChartRef.value) return

  const chart = echarts.init(previewChartRef.value)
  
  // 根据图表类型生成不同的配置
  let option: any = {}
  
  if (reportForm.chartType === 'bar') {
    option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: {},
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
        type: 'value'
      },
      series: reportForm.metrics.map(metric => ({
        name: availableMetrics.find(m => m.value === metric)?.label,
        type: 'bar',
        data: [120, 200, 150, 80, 70, 110]
      }))
    }
  } else if (reportForm.chartType === 'line') {
    option = {
      tooltip: {
        trigger: 'axis'
      },
      legend: {},
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
        type: 'value'
      },
      series: reportForm.metrics.map(metric => ({
        name: availableMetrics.find(m => m.value === metric)?.label,
        type: 'line',
        data: [120, 200, 150, 80, 70, 110],
        smooth: true
      }))
    }
  } else if (reportForm.chartType === 'pie') {
    option = {
      tooltip: {
        trigger: 'item'
      },
      legend: {
        orient: 'vertical',
        left: 'left'
      },
      series: [
        {
          name: '数据分布',
          type: 'pie',
          radius: '50%',
          data: [
            { value: 335, name: '水质样品' },
            { value: 310, name: '土壤样品' },
            { value: 234, name: '空气样品' },
            { value: 135, name: '食品样品' }
          ]
        }
      ]
    }
  }
  
  chart.setOption(option)
  window.addEventListener('resize', () => chart.resize())
}

// 获取时间范围标签
const getTimeRangeLabel = (value: string) => {
  const labels: Record<string, string> = {
    today: '今天',
    week: '本周',
    month: '本月',
    quarter: '本季度',
    year: '本年',
    custom: '自定义'
  }
  return labels[value] || value
}

// 获取图表类型标签
const getChartTypeLabel = (value: string) => {
  const labels: Record<string, string> = {
    line: '折线图',
    bar: '柱状图',
    pie: '饼图',
    table: '表格'
  }
  return labels[value] || value
}
</script>

<style scoped>
.custom-report-config {
  padding: 20px;
}

.header-actions {
  margin-bottom: 20px;
}

.report-list-card {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-container {
  padding: 20px;
}

.preview-header {
  margin-bottom: 20px;
  text-align: center;
}

.preview-header h3 {
  margin: 0 0 10px 0;
  font-size: 24px;
  color: #303133;
}

.preview-header p {
  margin: 0;
  color: #909399;
}

.preview-info {
  margin-bottom: 30px;
}

.preview-chart {
  margin-top: 20px;
}
</style>
