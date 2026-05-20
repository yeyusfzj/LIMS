<template>
  <div class="dashboard">
    <!-- 欢迎信息 -->
    <div class="welcome-section">
      <el-card shadow="never" class="welcome-card">
        <div class="welcome-content">
          <div class="welcome-text">
            <h2>欢迎回来，{{ currentUser }}</h2>
            <p class="welcome-subtitle">{{ currentDate }} {{ currentTime }}</p>
          </div>
          <el-icon class="welcome-icon" :size="60"><User /></el-icon>
        </div>
      </el-card>
    </div>

    <!-- 关键指标展示 -->
    <div class="metrics-section">
      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="6" v-for="metric in metrics" :key="metric.title">
          <el-card shadow="hover" class="metric-card">
            <div class="metric-content">
              <div class="metric-icon" :style="{ backgroundColor: metric.color }">
                <el-icon :size="24">
                  <component :is="metric.icon" />
                </el-icon>
              </div>
              <div class="metric-info">
                <div class="metric-value">{{ metric.value }}</div>
                <div class="metric-title">{{ metric.title }}</div>
              </div>
            </div>
            <div class="metric-footer">
              <span :class="['metric-trend', metric.trend > 0 ? 'up' : 'down']">
                <el-icon><component :is="metric.trend > 0 ? 'CaretTop' : 'CaretBottom'" /></el-icon>
                {{ Math.abs(metric.trend) }}%
              </span>
              <span class="metric-label">较上周</span>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 快捷入口和待办事项 -->
    <el-row :gutter="20" class="main-content">
      <!-- 快捷入口 -->
      <el-col :xs="24" :md="12">
        <el-card shadow="hover" class="section-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">
                <el-icon><Grid /></el-icon>
                快捷入口
              </span>
            </div>
          </template>
          <div class="quick-actions">
            <div 
              v-for="action in quickActions" 
              :key="action.title"
              class="quick-action-item"
              @click="navigateTo(action.path)"
            >
              <div class="action-icon" :style="{ backgroundColor: action.color }">
                <el-icon :size="28">
                  <component :is="action.icon" />
                </el-icon>
              </div>
              <div class="action-title">{{ action.title }}</div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 待办事项 -->
      <el-col :xs="24" :md="12">
        <el-card shadow="hover" class="section-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">
                <el-icon><List /></el-icon>
                待办事项
              </span>
              <el-badge :value="todoItems.length" class="badge" />
            </div>
          </template>
          <div class="todo-list">
            <el-empty v-if="todoItems.length === 0" description="暂无待办事项" :image-size="80" />
            <div 
              v-else
              v-for="item in todoItems" 
              :key="item.id"
              class="todo-item"
              @click="navigateTo(item.path)"
            >
              <div class="todo-icon">
                <el-icon :size="20" :color="item.color">
                  <component :is="item.icon" />
                </el-icon>
              </div>
              <div class="todo-content">
                <div class="todo-title">{{ item.title }}</div>
                <div class="todo-desc">{{ item.description }}</div>
              </div>
              <div class="todo-time">
                <el-tag :type="item.urgent ? 'danger' : 'info'" size="small">
                  {{ item.time }}
                </el-tag>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近操作记录 -->
    <el-row :gutter="20">
      <el-col :span="24">
        <el-card shadow="hover" class="section-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">
                <el-icon><Clock /></el-icon>
                最近操作记录
              </span>
              <el-link type="primary" :underline="false">查看全部</el-link>
            </div>
          </template>
          <el-timeline>
            <el-timeline-item
              v-for="activity in recentActivities"
              :key="activity.id"
              :timestamp="activity.timestamp"
              :color="activity.color"
              placement="top"
            >
              <el-card shadow="never" class="activity-card">
                <div class="activity-content">
                  <el-icon :size="18" :color="activity.color">
                    <component :is="activity.icon" />
                  </el-icon>
                  <span class="activity-text">{{ activity.content }}</span>
                  <el-tag size="small" :type="activity.tagType">{{ activity.tag }}</el-tag>
                </div>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  User,
  Grid,
  List,
  Clock,
  CaretTop,
  CaretBottom,
  Document,
  Files,
  Checked,
  Warning,
  DataAnalysis,
  Setting,
  Edit,
  View,
  Upload,
  Download
} from '@element-plus/icons-vue'

const router = useRouter()

// 当前用户和时间
const currentUser = ref('管理员')
const currentDate = ref('')
const currentTime = ref('')

// 更新时间
const updateDateTime = () => {
  const now = new Date()
  const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  currentDate.value = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${days[now.getDay()]}`
  currentTime.value = now.toLocaleTimeString('zh-CN', { hour12: false })
}

let timer: number | null = null

onMounted(() => {
  updateDateTime()
  timer = window.setInterval(updateDateTime, 1000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})

// 关键指标
const metrics = ref([
  {
    title: '样品总数',
    value: '1,234',
    icon: 'Files',
    color: '#409EFF',
    trend: 12.5
  },
  {
    title: '待处理任务',
    value: '56',
    icon: 'Document',
    color: '#E6A23C',
    trend: -8.3
  },
  {
    title: '合格率',
    value: '98.5%',
    icon: 'Checked',
    color: '#67C23A',
    trend: 2.1
  },
  {
    title: '异常样品',
    value: '8',
    icon: 'Warning',
    color: '#F56C6C',
    trend: -15.2
  }
])

// 快捷入口
const quickActions = ref([
  {
    title: '样品登记',
    icon: 'Edit',
    path: '/sample/registration',
    color: '#409EFF'
  },
  {
    title: '样品管理',
    icon: 'Files',
    path: '/sample/list',
    color: '#67C23A'
  },
  {
    title: '任务列表',
    icon: 'List',
    path: '/workflow/tasks',
    color: '#E6A23C'
  },
  {
    title: '结果录入',
    icon: 'Edit',
    path: '/result/entry',
    color: '#F56C6C'
  },
  {
    title: '报告生成',
    icon: 'Document',
    path: '/report/generator',
    color: '#909399'
  },
  {
    title: '统计分析',
    icon: 'DataAnalysis',
    path: '/statistics/dashboard',
    color: '#9C27B0'
  }
])

// 待办事项
const todoItems = ref([
  {
    id: 1,
    title: '样品审核',
    description: '5个样品等待审核',
    time: '今天',
    urgent: true,
    icon: 'Checked',
    color: '#F56C6C',
    path: '/audit/tasks'
  },
  {
    id: 2,
    title: '结果录入',
    description: '12个检测结果待录入',
    time: '今天',
    urgent: true,
    icon: 'Edit',
    color: '#E6A23C',
    path: '/result/entry'
  },
  {
    id: 3,
    title: '报告签发',
    description: '3份报告等待签发',
    time: '明天',
    urgent: false,
    icon: 'Document',
    color: '#409EFF',
    path: '/report/generator'
  },
  {
    id: 4,
    title: '留样到期提醒',
    description: '8个留样即将到期',
    time: '本周',
    urgent: false,
    icon: 'Warning',
    color: '#909399',
    path: '/sample/retention'
  }
])

// 最近操作记录
const recentActivities = ref([
  {
    id: 1,
    content: '完成样品 S20240123-001 的检测结果录入',
    timestamp: '2024-01-23 14:30',
    icon: 'Edit',
    color: '#67C23A',
    tag: '结果录入',
    tagType: 'success'
  },
  {
    id: 2,
    content: '审核通过样品 S20240123-002',
    timestamp: '2024-01-23 13:15',
    icon: 'Checked',
    color: '#409EFF',
    tag: '审核',
    tagType: 'primary'
  },
  {
    id: 3,
    content: '生成检测报告 R20240123-001',
    timestamp: '2024-01-23 11:45',
    icon: 'Document',
    color: '#E6A23C',
    tag: '报告',
    tagType: 'warning'
  },
  {
    id: 4,
    content: '登记新样品 S20240123-005',
    timestamp: '2024-01-23 10:20',
    icon: 'Upload',
    color: '#909399',
    tag: '样品登记',
    tagType: 'info'
  },
  {
    id: 5,
    content: '导出统计报表',
    timestamp: '2024-01-23 09:30',
    icon: 'Download',
    color: '#9C27B0',
    tag: '统计',
    tagType: 'info'
  }
])

// 导航方法
const navigateTo = (path: string) => {
  router.push(path)
}
</script>

<style scoped>
.dashboard {
  padding: 20px;
}

/* 欢迎区域 */
.welcome-section {
  margin-bottom: 20px;
}

.welcome-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
}

.welcome-card :deep(.el-card__body) {
  padding: 30px;
}

.welcome-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.welcome-text h2 {
  margin: 0 0 10px 0;
  font-size: 28px;
  font-weight: 600;
}

.welcome-subtitle {
  margin: 0;
  font-size: 16px;
  opacity: 0.9;
}

.welcome-icon {
  color: rgba(255, 255, 255, 0.3);
}

/* 指标卡片 */
.metrics-section {
  margin-bottom: 20px;
}

.metric-card {
  cursor: pointer;
  transition: transform 0.3s;
}

.metric-card:hover {
  transform: translateY(-5px);
}

.metric-content {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.metric-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-right: 15px;
}

.metric-info {
  flex: 1;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.metric-title {
  font-size: 14px;
  color: #909399;
}

.metric-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid #EBEEF5;
}

.metric-trend {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
}

.metric-trend.up {
  color: #67C23A;
}

.metric-trend.down {
  color: #F56C6C;
}

.metric-label {
  font-size: 12px;
  color: #909399;
}

/* 主要内容区域 */
.main-content {
  margin-bottom: 20px;
}

.section-card {
  height: 100%;
  min-height: 400px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.badge {
  margin-left: 10px;
}

/* 快捷入口 */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
}

.quick-action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  background-color: #F5F7FA;
}

.quick-action-item:hover {
  background-color: #E4E7ED;
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.action-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-bottom: 10px;
}

.action-title {
  font-size: 14px;
  color: #606266;
  text-align: center;
}

/* 待办事项 */
.todo-list {
  max-height: 350px;
  overflow-y: auto;
}

.todo-item {
  display: flex;
  align-items: center;
  padding: 15px;
  margin-bottom: 10px;
  border-radius: 8px;
  background-color: #F5F7FA;
  cursor: pointer;
  transition: all 0.3s;
}

.todo-item:hover {
  background-color: #E4E7ED;
  transform: translateX(5px);
}

.todo-icon {
  margin-right: 15px;
}

.todo-content {
  flex: 1;
}

.todo-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 5px;
}

.todo-desc {
  font-size: 12px;
  color: #909399;
}

.todo-time {
  margin-left: 10px;
}

/* 最近操作 */
.activity-card {
  border: none;
  background-color: #F5F7FA;
}

.activity-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.activity-text {
  flex: 1;
  font-size: 14px;
  color: #606266;
}

/* 响应式 */
@media (max-width: 768px) {
  .dashboard {
    padding: 10px;
  }

  .welcome-text h2 {
    font-size: 20px;
  }

  .welcome-subtitle {
    font-size: 14px;
  }

  .quick-actions {
    grid-template-columns: repeat(2, 1fr);
  }

  .metric-value {
    font-size: 20px;
  }
}
</style>
