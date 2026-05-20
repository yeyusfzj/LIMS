<template>
  <div class="audit-statistics-report">
    <!-- 筛选条件 -->
    <StatisticsFilters @filter-change="handleFilterChange" />

    <!-- 统计标签页 -->
    <el-card>
      <template #header>
        <div class="card-header">
          <span class="title">审核统计分析</span>
          <el-button-group>
            <el-button 
              type="primary" 
              :icon="Refresh" 
              @click="refreshCurrentTab"
              :loading="loading"
            >
              刷新
            </el-button>
            <el-button 
              :icon="Download" 
              @click="handleExport"
              :loading="exporting"
            >
              导出
            </el-button>
          </el-button-group>
        </div>
      </template>

      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- 工作量统计 -->
        <el-tab-pane label="工作量统计" name="workload">
          <div v-loading="loading" class="tab-content">
            <div v-if="workloadData && workloadData.byAuditor.length > 0">
              <!-- 图表 -->
              <div class="chart-container">
                <WorkloadChart :data="workloadData.byAuditor" />
              </div>
              
              <!-- 数据表格 -->
              <el-table :data="workloadData.byAuditor" border stripe>
                <el-table-column prop="auditorName" label="审核人员" width="120" />
                <el-table-column prop="totalTasks" label="总任务数" width="100" align="center" />
                <el-table-column prop="completedTasks" label="已完成" width="100" align="center" />
                <el-table-column prop="pendingTasks" label="待处理" width="100" align="center" />
              </el-table>
            </div>
            <el-empty v-else description="暂无数据" />
          </div>
        </el-tab-pane>

        <!-- 通过率统计 -->
        <el-tab-pane label="通过率统计" name="passRate">
          <div v-loading="loading" class="tab-content">
            <div v-if="passRateData">
              <!-- 图表 -->
              <div class="chart-container">
                <PassRateChart :data="passRateData" />
              </div>

              <!-- 整体通过率 -->
              <el-descriptions title="整体统计" :column="4" border>
                <el-descriptions-item label="总任务数">
                  {{ passRateData.overall.totalTasks }}
                </el-descriptions-item>
                <el-descriptions-item label="通过数">
                  <el-tag type="success">{{ passRateData.overall.approvedTasks }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="退回数">
                  <el-tag type="danger">{{ passRateData.overall.rejectedTasks }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="通过率">
                  <el-tag :type="getPassRateType(passRateData.overall.passRate)">
                    {{ passRateData.overall.passRate.toFixed(2) }}%
                  </el-tag>
                </el-descriptions-item>
              </el-descriptions>

              <!-- 按级别统计 -->
              <div class="section-title">按审核级别统计</div>
              <el-table :data="passRateData.byLevel" border stripe>
                <el-table-column prop="levelName" label="审核级别" width="120" align="center" />
                <el-table-column prop="totalTasks" label="总任务数" width="120" align="center" />
                <el-table-column prop="approvedTasks" label="通过数" width="120" align="center" />
                <el-table-column prop="passRate" label="通过率" align="center">
                  <template #default="{ row }">
                    <el-tag :type="getPassRateType(row.passRate)">
                      {{ row.passRate.toFixed(2) }}%
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>

              <!-- 按样品类型统计 -->
              <div class="section-title">按样品类型统计</div>
              <el-table :data="passRateData.bySampleType" border stripe>
                <el-table-column prop="sampleType" label="样品类型" width="150" />
                <el-table-column prop="totalTasks" label="总任务数" width="120" align="center" />
                <el-table-column prop="approvedTasks" label="通过数" width="120" align="center" />
                <el-table-column prop="passRate" label="通过率" align="center">
                  <template #default="{ row }">
                    <el-tag :type="getPassRateType(row.passRate)">
                      {{ row.passRate.toFixed(2) }}%
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </div>
            <el-empty v-else description="暂无数据" />
          </div>
        </el-tab-pane>

        <!-- 时效性统计 -->
        <el-tab-pane label="时效性统计" name="duration">
          <div v-loading="loading" class="tab-content">
            <div v-if="durationData">
              <!-- 图表 -->
              <div class="chart-container">
                <DurationChart :data="durationData" />
              </div>

              <!-- 统计指标 -->
              <el-descriptions title="时效性指标" :column="3" border>
                <el-descriptions-item label="平均时长">
                  {{ durationData.overall.averageDuration.toFixed(2) }} 小时
                </el-descriptions-item>
                <el-descriptions-item label="中位数">
                  {{ durationData.overall.medianDuration.toFixed(2) }} 小时
                </el-descriptions-item>
                <el-descriptions-item label="最短时长">
                  {{ durationData.overall.minDuration.toFixed(2) }} 小时
                </el-descriptions-item>
                <el-descriptions-item label="最长时长">
                  {{ durationData.overall.maxDuration.toFixed(2) }} 小时
                </el-descriptions-item>
                <el-descriptions-item label="超时任务数">
                  <el-tag type="warning">{{ durationData.overall.overtimeTasks }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="超时率">
                  <el-tag :type="durationData.overall.overtimeRate > 10 ? 'danger' : 'success'">
                    {{ durationData.overall.overtimeRate.toFixed(2) }}%
                  </el-tag>
                </el-descriptions-item>
              </el-descriptions>

              <!-- 时长分布 -->
              <div class="section-title">时长分布</div>
              <el-table :data="durationData.distribution" border stripe>
                <el-table-column prop="range" label="时长范围" width="200" />
                <el-table-column prop="count" label="任务数量" align="center" />
                <el-table-column label="占比" align="center">
                  <template #default="{ row }">
                    {{ calculatePercentage(row.count, getTotalCount(durationData.distribution)) }}%
                  </template>
                </el-table-column>
              </el-table>
            </div>
            <el-empty v-else description="暂无数据" />
          </div>
        </el-tab-pane>

        <!-- 问题分类统计 -->
        <el-tab-pane label="问题分类统计" name="issues">
          <div v-loading="loading" class="tab-content">
            <div v-if="issueData && issueData.byReason.length > 0">
              <!-- 图表 -->
              <div class="chart-container">
                <IssueChart :data="issueData" />
              </div>

              <el-descriptions title="问题统计" :column="1" border>
                <el-descriptions-item label="问题总数">
                  {{ issueData.byReason.reduce((sum, item) => sum + item.count, 0) }}
                </el-descriptions-item>
              </el-descriptions>

              <div class="section-title">问题分类详情</div>
              <el-table :data="issueData.byReason" border stripe>
                <el-table-column type="index" label="排名" width="80" align="center" />
                <el-table-column prop="reason" label="退回原因" />
                <el-table-column prop="count" label="出现次数" width="120" align="center" />
                <el-table-column prop="percentage" label="占比" width="120" align="center">
                  <template #default="{ row }">
                    {{ row.percentage.toFixed(2) }}%
                  </template>
                </el-table-column>
              </el-table>
            </div>
            <el-empty v-else description="暂无数据" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Download } from '@element-plus/icons-vue'
import StatisticsFilters from '@/components/statistics/StatisticsFilters.vue'
import WorkloadChart from '@/components/statistics/WorkloadChart.vue'
import PassRateChart from '@/components/statistics/PassRateChart.vue'
import DurationChart from '@/components/statistics/DurationChart.vue'
import IssueChart from '@/components/statistics/IssueChart.vue'
import type { StatisticsFilters as Filters, WorkloadData, PassRateData, DurationData, IssueData } from '@/types/statistics'
import * as auditStatisticsService from '@/services/auditStatisticsService'

const activeTab = ref('workload')
const loading = ref(false)
const exporting = ref(false)
const currentFilters = ref<Filters>({})

// 统计数据
const workloadData = ref<WorkloadData | null>(null)
const passRateData = ref<PassRateData | null>(null)
const durationData = ref<DurationData | null>(null)
const issueData = ref<IssueData | null>(null)

// 处理筛选条件变化
const handleFilterChange = (filters: Filters) => {
  currentFilters.value = filters
  loadCurrentTabData()
}

// 处理标签页切换
const handleTabChange = () => {
  loadCurrentTabData()
}

// 加载当前标签页数据
const loadCurrentTabData = async () => {
  loading.value = true
  try {
    switch (activeTab.value) {
      case 'workload':
        await loadWorkloadData()
        break
      case 'passRate':
        await loadPassRateData()
        break
      case 'duration':
        await loadDurationData()
        break
      case 'issues':
        await loadIssueData()
        break
    }
  } catch (error: any) {
    ElMessage.error(error.message || '加载数据失败')
  } finally {
    loading.value = false
  }
}

// 加载工作量数据
const loadWorkloadData = async () => {
  const response = await auditStatisticsService.getWorkloadStatistics(currentFilters.value)
  workloadData.value = response || null
}

// 加载通过率数据
const loadPassRateData = async () => {
  const response = await auditStatisticsService.getPassRateStatistics(currentFilters.value)
  passRateData.value = response || null
}

// 加载时效性数据
const loadDurationData = async () => {
  const response = await auditStatisticsService.getDurationStatistics(currentFilters.value)
  durationData.value = response || null
}

// 加载问题分类数据
const loadIssueData = async () => {
  const response = await auditStatisticsService.getIssueStatistics(currentFilters.value)
  issueData.value = response || null
}

// 刷新当前标签页
const refreshCurrentTab = () => {
  loadCurrentTabData()
}

// 导出数据
const handleExport = async () => {
  exporting.value = true
  try {
    const typeMap: Record<string, 'workload' | 'passRate' | 'duration' | 'issues'> = {
      workload: 'workload',
      passRate: 'passRate',
      duration: 'duration',
      issues: 'issues'
    }
    await auditStatisticsService.exportStatistics(typeMap[activeTab.value], currentFilters.value)
    ElMessage.success('导出成功')
  } catch (error: any) {
    ElMessage.error(error.message || '导出失败')
  } finally {
    exporting.value = false
  }
}

// 获取通过率类型
const getPassRateType = (rate: number) => {
  if (rate >= 90) return 'success'
  if (rate >= 70) return 'warning'
  return 'danger'
}

// 计算百分比
const calculatePercentage = (count: number, total: number) => {
  if (total === 0) return '0.00'
  return ((count / total) * 100).toFixed(2)
}

// 获取总数
const getTotalCount = (distribution: Array<{ range: string; count: number }>) => {
  return distribution.reduce((sum, item) => sum + item.count, 0)
}

onMounted(() => {
  // 初始数据由 StatisticsFilters 组件触发加载
})
</script>

<style scoped>
.audit-statistics-report {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 18px;
  font-weight: bold;
}

.tab-content {
  min-height: 400px;
  padding: 20px 0;
}

.chart-container {
  margin-bottom: 30px;
}



.section-title {
  font-size: 16px;
  font-weight: bold;
  margin: 30px 0 15px;
  padding-left: 10px;
  border-left: 4px solid #409eff;
}

.el-descriptions {
  margin-bottom: 20px;
}

.el-table {
  margin-top: 10px;
}
</style>
