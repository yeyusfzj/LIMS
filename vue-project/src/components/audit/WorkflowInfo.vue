<template>
  <div class="workflow-info">
    <div class="workflow-header">
      <h3 class="workflow-title">审核流程</h3>
      <el-button
        v-if="showDetails"
        type="text"
        :icon="isExpanded ? ArrowUp : ArrowDown"
        @click="toggleExpand"
      >
        {{ isExpanded ? '收起' : '展开' }}详情
      </el-button>
    </div>

    <div v-loading="loading" class="workflow-content">
      <!-- 当前审核级别信息 -->
      <div v-if="currentNode" class="current-level-info">
        <el-tag type="primary" size="large" effect="dark">
          当前级别：{{ currentNode.levelName }}
        </el-tag>
        <el-text type="info" size="small" class="current-auditor">
          审核人：{{ currentNode.auditorName || currentNode.auditor }}
        </el-text>
      </div>

      <!-- 流程时间线 -->
      <el-timeline v-if="workflowNodes.length > 0" class="workflow-timeline">
        <el-timeline-item
          v-for="node in workflowNodes"
          :key="node.level"
          :type="getNodeType(node.status)"
          :icon="getNodeIcon(node.status)"
          :hollow="node.status === 'pending'"
          :class="['workflow-node', { 'current-node': node.level === currentLevel }]"
        >
          <div class="node-header">
            <span class="node-level">{{ node.levelName }}</span>
            <el-tag :type="getStatusTagType(node.status)" size="small" effect="plain">
              {{ getStatusText(node.status) }}
            </el-tag>
          </div>

          <div v-if="isExpanded || node.level === currentLevel" class="node-details">
            <div class="node-info">
              <el-icon><User /></el-icon>
              <span>审核人：{{ node.auditorName || node.auditor || '未分配' }}</span>
            </div>

            <div v-if="node.startTime" class="node-info">
              <el-icon><Clock /></el-icon>
              <span>开始时间：{{ formatDateTime(node.startTime) }}</span>
            </div>

            <div v-if="node.endTime" class="node-info">
              <el-icon><Check /></el-icon>
              <span>完成时间：{{ formatDateTime(node.endTime) }}</span>
            </div>

            <div v-if="node.comments" class="node-comments">
              <el-icon><Document /></el-icon>
              <span>审核意见：</span>
              <p class="comments-text">{{ node.comments }}</p>
            </div>
          </div>
        </el-timeline-item>
      </el-timeline>

      <!-- 空状态 -->
      <el-empty
        v-if="!loading && workflowNodes.length === 0"
        description="暂无流程信息"
        :image-size="80"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ArrowUp, ArrowDown, User, Clock, Check, Document, CircleCheck, CircleClose, Clock as ClockIcon, Loading } from '@element-plus/icons-vue'
import { useWorkflowStore, type AuditWorkflowConfig } from '@/stores/workflow'
import { ElMessage } from 'element-plus'

// 流程节点接口
interface WorkflowNode {
  level: number
  levelName: string
  auditor: string
  auditorName?: string
  status: 'pending' | 'in_progress' | 'completed' | 'rejected'
  startTime?: Date
  endTime?: Date
  comments?: string
}

interface Props {
  taskId: string
  currentLevel: number
  workflowConfig?: AuditWorkflowConfig
  showDetails?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showDetails: true
})

const workflowStore = useWorkflowStore()

// 状态
const loading = ref(false)
const isExpanded = ref(false)
const workflowNodes = ref<WorkflowNode[]>([])

// 当前节点
const currentNode = computed(() => {
  return workflowNodes.value.find(node => node.level === props.currentLevel)
})

// 获取节点类型
const getNodeType = (status: string): 'primary' | 'success' | 'warning' | 'danger' | 'info' => {
  const types: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
    pending: 'info',
    in_progress: 'primary',
    completed: 'success',
    rejected: 'danger'
  }
  return types[status] || 'info'
}

// 获取节点图标
const getNodeIcon = (status: string) => {
  const icons: Record<string, any> = {
    pending: ClockIcon,
    in_progress: Loading,
    completed: CircleCheck,
    rejected: CircleClose
  }
  return icons[status] || ClockIcon
}

// 获取状态标签类型
const getStatusTagType = (status: string): 'success' | 'warning' | 'danger' | 'info' => {
  const types: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    pending: 'info',
    in_progress: 'warning',
    completed: 'success',
    rejected: 'danger'
  }
  return types[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string): string => {
  const texts: Record<string, string> = {
    pending: '待审核',
    in_progress: '审核中',
    completed: '已通过',
    rejected: '已驳回'
  }
  return texts[status] || status
}

// 格式化日期时间
const formatDateTime = (date: Date): string => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 切换展开/收起
const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

// 加载流程信息
const loadWorkflowInfo = async () => {
  loading.value = true
  
  try {
    // 如果传入了工作流配置，直接使用
    if (props.workflowConfig) {
      buildWorkflowNodes(props.workflowConfig)
    } else {
      // 否则从store获取
      await workflowStore.fetchConfigs()
      
      // 这里需要根据taskId获取对应的工作流配置
      // 暂时使用第一个激活的配置作为示例
      const config = workflowStore.activeConfigs[0]
      if (config) {
        buildWorkflowNodes(config)
      }
    }
  } catch (error) {
    ElMessage.error('加载流程信息失败')
    console.error('加载流程信息失败:', error)
  } finally {
    loading.value = false
  }
}

// 构建流程节点
const buildWorkflowNodes = (config: AuditWorkflowConfig) => {
  workflowNodes.value = config.levels
    .sort((a, b) => a.order - b.order)
    .map(level => {
      // 根据当前级别判断节点状态
      let status: 'pending' | 'in_progress' | 'completed' | 'rejected' = 'pending'
      
      if (level.order < props.currentLevel) {
        status = 'completed'
      } else if (level.order === props.currentLevel) {
        status = 'in_progress'
      }
      
      return {
        level: level.order,
        levelName: level.name,
        auditor: level.role,
        auditorName: level.roleName,
        status,
        startTime: undefined,
        endTime: undefined,
        comments: undefined
      }
    })
}

// 监听props变化
watch(() => [props.taskId, props.currentLevel, props.workflowConfig], () => {
  loadWorkflowInfo()
}, { deep: true })

// 组件挂载时加载数据
onMounted(() => {
  loadWorkflowInfo()
})

// 暴露方法给父组件
defineExpose({
  refresh: loadWorkflowInfo
})
</script>

<style scoped>
.workflow-info {
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  padding: 20px;
}

.workflow-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.workflow-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.workflow-content {
  min-height: 200px;
}

.current-level-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  margin-bottom: 20px;
  background-color: var(--el-color-primary-light-9);
  border-radius: 6px;
  border-left: 4px solid var(--el-color-primary);
}

.current-auditor {
  margin-left: auto;
}

.workflow-timeline {
  padding-left: 8px;
}

.workflow-node {
  margin-bottom: 16px;
}

.workflow-node.current-node {
  background-color: var(--el-color-primary-light-9);
  margin-left: -12px;
  padding: 12px;
  border-radius: 6px;
}

.node-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.node-level {
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.node-details {
  margin-top: 12px;
  padding-left: 8px;
}

.node-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.node-info .el-icon {
  color: var(--el-text-color-secondary);
}

.node-comments {
  margin-top: 12px;
  padding: 12px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
}

.node-comments .el-icon {
  vertical-align: middle;
  margin-right: 4px;
}

.comments-text {
  margin: 8px 0 0 0;
  padding-left: 20px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  white-space: pre-wrap;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .workflow-info {
    padding: 16px;
  }

  .workflow-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .current-level-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .current-auditor {
    margin-left: 0;
  }

  .node-level {
    font-size: 14px;
  }

  .node-info {
    font-size: 13px;
  }
}
</style>
