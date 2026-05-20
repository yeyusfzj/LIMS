<template>
  <div class="workflow-designer">
    <!-- 工具栏 -->
    <div class="toolbar">
      <el-button 
        v-if="!isViewMode" 
        type="primary" 
        :icon="Check" 
        @click="handleSave"
        :disabled="loading"
      >
        保存
      </el-button>
      <el-button 
        :icon="CircleCheck" 
        @click="handleValidate"
        :disabled="loading"
      >
        验证
      </el-button>
      <el-button 
        :icon="View" 
        @click="handlePreview"
        :disabled="loading"
      >
        预览
      </el-button>
      <el-divider direction="vertical" />
      <el-button :icon="ZoomIn" @click="handleZoomIn">放大</el-button>
      <el-button :icon="ZoomOut" @click="handleZoomOut">缩小</el-button>
      <el-button :icon="RefreshRight" @click="handleReset">重置</el-button>
      
      <!-- 查看模式提示 -->
      <div v-if="isViewMode" class="view-mode-indicator">
        <el-tag type="info" size="small">查看模式</el-tag>
      </div>
      
      <!-- 工作流信息 -->
      <div v-if="workflowData" class="workflow-info">
        <span class="workflow-name">{{ workflowData.name }}</span>
        <span class="workflow-version">v{{ workflowData.version }}</span>
      </div>
    </div>

    <div class="designer-content">
      <!-- 左侧节点面板 -->
      <div v-if="!isViewMode" class="node-panel">
        <div class="panel-header">节点类型</div>
        <div class="node-list">
          <div
            v-for="nodeType in nodeTypes"
            :key="nodeType.type"
            class="node-item"
            :class="{ 'dragging': draggedNodeType?.type === nodeType.type }"
            draggable="true"
            @dragstart="handleDragStart($event, nodeType)"
            @dragend="handleDragEnd"
          >
            <el-icon :size="20">
              <component :is="nodeType.icon" />
            </el-icon>
            <span>{{ nodeType.label }}</span>
          </div>
        </div>
      </div>

      <!-- 中间画布区域 -->
      <div 
        class="canvas-area" 
        :class="{ 'view-mode': isViewMode }"
        @drop="!isViewMode && handleDrop($event)" 
        @dragover.prevent="!isViewMode && handleDragOver($event)"
      >
        <div
          v-loading="loading"
          element-loading-text="加载工作流数据中..."
          class="canvas"
          :style="{ transform: `scale(${scale})` }"
          ref="canvasRef"
        >
          <!-- 工作流节点 -->
          <div
            v-for="node in nodes"
            :key="node.id"
            class="workflow-node"
            :class="{ 
              selected: selectedNode?.id === node.id,
              'view-mode': isViewMode 
            }"
            :style="{
              left: node.position.x + 'px',
              top: node.position.y + 'px'
            }"
            @click="handleSelectNode(node)"
            @mousedown="!isViewMode && handleNodeMouseDown($event, node)"
          >
            <div class="node-header" :class="`node-type-${node.type}`">
              <el-icon>
                <component :is="getNodeIcon(node.type)" />
              </el-icon>
              <span>{{ node.name }}</span>
            </div>
            <div class="node-body">
              <div class="node-info">{{ getNodeTypeLabel(node.type) }}</div>
            </div>
            <div v-if="!isViewMode" class="node-actions">
              <el-button
                type="danger"
                size="small"
                :icon="Delete"
                circle
                @click.stop="handleDeleteNode(node)"
              />
            </div>
          </div>

          <!-- 连接线 -->
          <svg class="connections" :style="{ width: '100%', height: '100%' }">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#409eff" />
              </marker>
            </defs>
            <line
              v-for="edge in edges"
              :key="edge.id"
              :x1="getNodeCenter(edge.source).x"
              :y1="getNodeCenter(edge.source).y"
              :x2="getNodeCenter(edge.target).x"
              :y2="getNodeCenter(edge.target).y"
              stroke="#409eff"
              stroke-width="2"
              marker-end="url(#arrowhead)"
            />
          </svg>
        </div>
      </div>

      <!-- 右侧属性面板 -->
      <div class="property-panel">
        <div class="panel-header">
          {{ isViewMode ? '节点信息' : '节点属性' }}
        </div>
        <div v-if="selectedNode" class="property-content">
          <el-form :model="selectedNode" label-width="80px" label-position="top">
            <el-form-item label="节点名称">
              <el-input 
                v-model="selectedNode.name" 
                placeholder="请输入节点名称"
                :disabled="isViewMode"
              />
            </el-form-item>

            <el-form-item label="节点类型">
              <el-tag>{{ getNodeTypeLabel(selectedNode.type) }}</el-tag>
            </el-form-item>

            <el-form-item v-if="isViewMode" label="节点ID">
              <el-text size="small" type="info">{{ selectedNode.id }}</el-text>
            </el-form-item>

            <!-- 节点配置组件 -->
            <NodeConfig
              v-if="selectedNode && !isViewMode"
              :node="selectedNode"
              @update="handleNodeConfigUpdate"
            />
            
            <!-- 查看模式下显示配置信息 -->
            <el-form-item v-else-if="selectedNode.config && Object.keys(selectedNode.config).length > 0" label="节点配置">
              <el-text size="small">
                <pre style="font-size: 12px; margin: 0;">{{ JSON.stringify(selectedNode.config, null, 2) }}</pre>
              </el-text>
            </el-form-item>

            <el-form-item v-if="!isViewMode" label="连接到">
              <el-select
                v-model="selectedTargetNode"
                placeholder="选择目标节点"
                @change="handleAddEdge"
              >
                <el-option
                  v-for="node in availableTargetNodes"
                  :key="node.id"
                  :label="node.name"
                  :value="node.id"
                />
              </el-select>
            </el-form-item>
          </el-form>
        </div>
        <div v-else class="empty-state">
          <el-empty description="请选择一个节点" />
        </div>
      </div>
    </div>

    <!-- 保存模板对话框 -->
    <el-dialog
      v-model="saveDialogVisible"
      title="保存工作流模板"
      width="500px"
      :close-on-click-modal="false"
      data-testid="save-dialog"
    >
      <el-form
        ref="templateFormRef"
        :model="templateForm"
        :rules="formRules"
        label-width="100px"
        label-position="top"
      >
        <el-form-item label="模板名称" prop="name">
          <el-input
            v-model="templateForm.name"
            placeholder="请输入模板名称"
            maxlength="50"
            show-word-limit
            data-testid="template-name-input"
          />
        </el-form-item>
        
        <el-form-item label="模板描述" prop="description">
          <el-input
            v-model="templateForm.description"
            type="textarea"
            placeholder="请输入模板描述（可选）"
            :rows="3"
            maxlength="200"
            show-word-limit
            data-testid="template-description-input"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleCancelSave">取消</el-button>
          <el-button type="primary" @click="handleConfirmSave" :loading="saving">
            {{ saving ? '保存中...' : '确定' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Check,
  CircleCheck,
  View,
  ZoomIn,
  ZoomOut,
  RefreshRight,
  Delete,
  Operation,
  DocumentChecked,
  Clock,
  Share
} from '@element-plus/icons-vue'
import NodeConfig from '@/components/workflow/NodeConfig.vue'
import http from '@/services/http'
import { workflowApi } from '@/services/api/workflow'

interface Position {
  x: number
  y: number
}

interface WorkflowNode {
  id: string
  type: 'START' | 'END' | 'TASK' | 'DECISION' | 'PARALLEL' | 'MERGE'
  name: string
  position: Position
  config: any
}

interface WorkflowEdge {
  id: string
  source: string
  target: string
  condition?: string
}

interface NodeType {
  type: string
  label: string
  icon: any
}

// 节点类型定义 - 与后端 NodeType 枚举保持一致
const nodeTypes: NodeType[] = [
  { type: 'START', label: '开始节点', icon: Operation },
  { type: 'TASK', label: '任务节点', icon: DocumentChecked },
  { type: 'DECISION', label: '决策节点', icon: Share },
  { type: 'END', label: '结束节点', icon: Clock }
]

// 路由相关
const route = useRoute()
const router = useRouter()

// 状态
const nodes = ref<WorkflowNode[]>([])
const edges = ref<WorkflowEdge[]>([])
const selectedNode = ref<WorkflowNode | null>(null)
const selectedTargetNode = ref<string>('')
const scale = ref(1)
const canvasRef = ref<HTMLElement | null>(null)
const draggedNodeType = ref<NodeType | null>(null)
const isDraggingNode = ref(false)
const dragOffset = ref<Position>({ x: 0, y: 0 })

// 工作流相关状态
const workflowId = ref<string | null>(null)
const isViewMode = ref(false)
const loading = ref(false)
const workflowData = ref<any>(null)

// 保存对话框相关状态
const saveDialogVisible = ref(false)
const saving = ref(false)
const templateFormRef = ref<any>(null)
const templateForm = ref({
  name: '',
  description: ''
})

// 表单验证规则
const formRules = {
  name: [
    { required: true, message: '请输入模板名称', trigger: 'blur' },
    { min: 2, max: 50, message: '模板名称长度应在 2-50 个字符之间', trigger: 'blur' },
    { 
      pattern: /^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/, 
      message: '模板名称只能包含中英文、数字、下划线和短横线', 
      trigger: 'blur' 
    }
  ],
  description: [
    { max: 200, message: '描述长度不能超过 200 个字符', trigger: 'blur' }
  ]
}

// 计算属性
const availableTargetNodes = computed(() => {
  if (!selectedNode.value) return []
  return nodes.value.filter(node => node.id !== selectedNode.value?.id)
})

// 获取节点图标
const getNodeIcon = (type: string) => {
  const nodeType = nodeTypes.find(nt => nt.type === type)
  return nodeType?.icon || Operation
}

// 获取节点类型标签
const getNodeTypeLabel = (type: string) => {
  const nodeType = nodeTypes.find(nt => nt.type === type)
  return nodeType?.label || '未知节点'
}

// 加载工作流数据
const loadWorkflowData = async (id: string) => {
  loading.value = true
  try {
    console.log('加载工作流数据，ID:', id)
    
    const workflow = await workflowApi.getById(id)
    console.log('获取到工作流数据:', workflow)
    
    workflowData.value = workflow
    
    // 转换后端数据格式为前端格式
    if (workflow.config && workflow.config.nodes) {
      // 转换节点数据
      nodes.value = workflow.config.nodes.map((node: any, index: number) => ({
        id: node.id,
        type: node.type,
        name: node.name || node.description || `节点-${index + 1}`,
        position: {
          x: 100 + (index % 3) * 250, // 自动布局
          y: 100 + Math.floor(index / 3) * 150
        },
        config: node.config || {}
      }))
      
      console.log('转换后的节点数据:', nodes.value)
    }
    
    if (workflow.config && workflow.config.edges) {
      // 转换边数据
      edges.value = workflow.config.edges.map((edge: any) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        condition: edge.condition
      }))
      
      console.log('转换后的边数据:', edges.value)
    }
    
    ElMessage.success('工作流数据加载成功')
    
  } catch (error) {
    console.error('加载工作流数据失败:', error)
    ElMessage.error('加载工作流数据失败: ' + (error as Error).message)
    
    // 如果加载失败，返回模板列表
    router.push({ name: 'workflow-templates' })
  } finally {
    loading.value = false
  }
}

// 获取节点中心点
const getNodeCenter = (nodeId: string): Position => {
  const node = nodes.value.find(n => n.id === nodeId)
  if (!node) return { x: 0, y: 0 }
  return {
    x: node.position.x + 100, // 节点宽度的一半
    y: node.position.y + 60   // 节点高度的一半
  }
}

// 拖拽开始
const handleDragStart = (event: DragEvent, nodeType: NodeType) => {
  console.log('开始拖拽节点类型:', nodeType)
  draggedNodeType.value = nodeType
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy'
    // 设置拖拽数据，便于调试
    event.dataTransfer.setData('text/plain', JSON.stringify(nodeType))
  }
}

// 拖拽结束
const handleDragEnd = () => {
  console.log('拖拽结束，清理状态')
  draggedNodeType.value = null
}

// 拖拽悬停处理
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy'
  }
}

// 放置节点
const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  console.log('处理节点放置事件')
  
  // 修复：增强条件检查和错误处理
  if (!draggedNodeType.value) {
    console.warn('没有拖拽的节点类型')
    return
  }

  // 修复：确保画布引用存在
  const canvas = canvasRef.value
  if (!canvas) {
    console.error('画布引用不存在，无法放置节点')
    ElMessage.error('画布未准备就绪，请稍后重试')
    return
  }

  try {
    // 获取画布位置信息
    const rect = canvas.getBoundingClientRect()
    console.log('画布位置信息:', rect)
    console.log('鼠标位置:', { x: event.clientX, y: event.clientY })
    console.log('当前缩放比例:', scale.value)
    
    // 计算相对于画布的坐标，考虑缩放比例
    const x = Math.max(0, (event.clientX - rect.left) / scale.value)
    const y = Math.max(0, (event.clientY - rect.top) / scale.value)
    
    console.log('计算后的节点位置:', { x, y })

    // 创建新节点
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: draggedNodeType.value.type as any,
      name: `${draggedNodeType.value.label}-${nodes.value.length + 1}`,
      position: { x, y },
      config: {}
    }

    console.log('创建新节点:', newNode)

    // 添加节点到列表
    nodes.value.push(newNode)
    
    // 自动选择新创建的节点
    selectedNode.value = newNode
    
    // 清理拖拽状态
    draggedNodeType.value = null
    
    console.log('节点创建成功，当前节点总数:', nodes.value.length)
    ElMessage.success(`${newNode.name} 已添加到画布`)
    
  } catch (error) {
    console.error('创建节点时发生错误:', error)
    ElMessage.error('创建节点失败，请重试')
  }
}

// 选择节点
const handleSelectNode = (node: WorkflowNode) => {
  selectedNode.value = node
  selectedTargetNode.value = ''
}

// 节点鼠标按下（用于拖动节点）
const handleNodeMouseDown = (event: MouseEvent, node: WorkflowNode) => {
  event.stopPropagation()
  isDraggingNode.value = true
  selectedNode.value = node
  dragOffset.value = {
    x: event.clientX - node.position.x * scale.value,
    y: event.clientY - node.position.y * scale.value
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDraggingNode.value || !selectedNode.value) return
    selectedNode.value.position = {
      x: (e.clientX - dragOffset.value.x) / scale.value,
      y: (e.clientY - dragOffset.value.y) / scale.value
    }
  }

  const handleMouseUp = () => {
    isDraggingNode.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// 删除节点
const handleDeleteNode = async (node: WorkflowNode) => {
  try {
    await ElMessageBox.confirm('确定要删除此节点吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    nodes.value = nodes.value.filter(n => n.id !== node.id)
    edges.value = edges.value.filter(e => e.source !== node.id && e.target !== node.id)
    if (selectedNode.value?.id === node.id) {
      selectedNode.value = null
    }
    ElMessage.success('节点已删除')
  } catch {
    // 用户取消
  }
}

// 添加连接线
const handleAddEdge = (targetId: string) => {
  if (!selectedNode.value || !targetId) return

  const edgeExists = edges.value.some(
    e => e.source === selectedNode.value!.id && e.target === targetId
  )

  if (edgeExists) {
    ElMessage.warning('连接已存在')
    return
  }

  const newEdge: WorkflowEdge = {
    id: `edge-${Date.now()}`,
    source: selectedNode.value.id,
    target: targetId
  }

  edges.value.push(newEdge)
  selectedTargetNode.value = ''
  ElMessage.success('连接已添加')
}

// 节点配置更新
const handleNodeConfigUpdate = (config: any) => {
  if (selectedNode.value) {
    selectedNode.value.config = config
  }
}

// 保存工作流
const handleSave = () => {
  if (nodes.value.length < 2) {
    ElMessage.warning('工作流至少需要2个节点')
    return
  }

  if (edges.value.length < 1) {
    ElMessage.warning('工作流至少需要1条连接线')
    return
  }

  // 检查是否有开始节点
  const hasStartNode = nodes.value.some(node => node.type === 'START')
  if (!hasStartNode) {
    ElMessage.warning('工作流必须包含至少一个开始节点')
    return
  }

  // 检查是否有结束节点
  const hasEndNode = nodes.value.some(node => node.type === 'END')
  if (!hasEndNode) {
    ElMessage.warning('工作流必须包含至少一个结束节点')
    return
  }

  // 重置表单数据
  templateForm.value = {
    name: '',
    description: ''
  }
  
  // 显示保存对话框
  saveDialogVisible.value = true
}

// 确认保存工作流
const handleConfirmSave = async () => {
  if (!templateFormRef.value) return
  
  try {
    // 验证表单
    await templateFormRef.value.validate()
    
    saving.value = true
    
    // 映射前端节点类型到后端 NodeType 枚举
    const mapNodeType = (frontendType: string): string => {
      const typeMapping: Record<string, string> = {
        'START': 'START',
        'END': 'END', 
        'TASK': 'TASK',
        'DECISION': 'DECISION',
        'PARALLEL': 'PARALLEL',
        'MERGE': 'MERGE'
      }
      return typeMapping[frontendType] || 'TASK' // 默认为 TASK 类型
    }
    
    // 构建请求数据 - 符合后端 WorkflowConfig 接口
    const workflow = {
      nodes: nodes.value.map(node => ({
        id: node.id,
        type: mapNodeType(node.type), // 映射节点类型
        name: node.name,
        description: node.name, // 使用节点名称作为描述
        config: node.config || {} // 节点特定配置
        // 注意：不包含 position 字段，这是前端UI专用的
      })),
      edges: edges.value.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        condition: edge.condition || undefined, // 条件表达式
        label: edge.condition || undefined // 边标签
      }))
    }
    
    const requestData = {
      name: templateForm.value.name,
      description: templateForm.value.description || undefined,
      config: workflow // 后端期望的 WorkflowConfig 格式
    }
    
    // 发送 API 请求
    const response = await http.post('/workflows', requestData)
    
    // 处理成功响应
    ElMessage.success(`模板 "${templateForm.value.name}" 保存成功！`)
    
    // 关闭对话框
    saveDialogVisible.value = false
    
    // 询问用户是否返回模板列表
    try {
      await ElMessageBox.confirm(
        '模板已成功保存，是否返回模板列表查看？',
        '保存成功',
        {
          confirmButtonText: '查看模板列表',
          cancelButtonText: '继续编辑',
          type: 'success'
        }
      )
      // 用户选择查看模板列表，跳转到工作流模板页面
      router.push({ name: 'workflow-templates' })
    } catch {
      // 用户选择继续编辑，不做任何操作
    }
    
  } catch (error: any) {
    // 处理错误响应
    if (error.response) {
      const status = error.response.status
      const message = error.response.data?.message || '保存失败'
      
      switch (status) {
        case 403:
          ElMessage.error('权限不足，请联系管理员获取工作流创建权限')
          break
        case 400:
          // 详细的 400 错误处理
          console.error('400 错误详情:', error.response.data)
          let errorMsg = '请求数据有误'
          
          // 尝试解析具体的验证错误
          if (error.response.data?.details) {
            const details = error.response.data.details
            if (Array.isArray(details)) {
              errorMsg = `数据验证失败：${details.map((d: any) => d.message || d).join('; ')}`
            } else if (typeof details === 'string') {
              errorMsg = `数据验证失败：${details}`
            }
          } else if (message && message !== '保存失败') {
            errorMsg = `请求数据有误：${message}`
          }
          
          ElMessage.error(errorMsg)
          break
        case 409:
          ElMessage.error(`模板名称 "${templateForm.value.name}" 已存在，请使用其他名称`)
          break
        case 500:
          ElMessage.error('服务器错误，请稍后重试')
          break
        default:
          ElMessage.error(`保存失败：${message}`)
      }
    } else if (error.message === 'Network Error') {
      ElMessage.error('网络连接失败，请检查网络连接后重试')
    } else {
      ElMessage.error('保存失败，请重试')
    }
    
    // 保留用户输入的表单数据，不关闭对话框
  } finally {
    saving.value = false
  }
}

// 取消保存
const handleCancelSave = () => {
  saveDialogVisible.value = false
  // 重置表单数据
  templateForm.value = {
    name: '',
    description: ''
  }
}

// 验证工作流
const handleValidate = () => {
  const errors: string[] = []

  // 检查是否有节点
  if (nodes.value.length === 0) {
    errors.push('工作流中没有节点')
  }

  // 检查孤立节点
  const connectedNodes = new Set<string>()
  edges.value.forEach(edge => {
    connectedNodes.add(edge.source)
    connectedNodes.add(edge.target)
  })

  const isolatedNodes = nodes.value.filter(node => !connectedNodes.has(node.id))
  if (isolatedNodes.length > 0 && nodes.value.length > 1) {
    errors.push(`发现 ${isolatedNodes.length} 个孤立节点`)
  }

  // 检查循环
  const hasCycle = detectCycle()
  if (hasCycle) {
    errors.push('工作流中存在循环')
  }

  if (errors.length > 0) {
    ElMessage.error(errors.join('；'))
  } else {
    ElMessage.success('工作流验证通过')
  }
}

// 检测循环
const detectCycle = (): boolean => {
  const visited = new Set<string>()
  const recStack = new Set<string>()

  const dfs = (nodeId: string): boolean => {
    visited.add(nodeId)
    recStack.add(nodeId)

    const outgoingEdges = edges.value.filter(e => e.source === nodeId)
    for (const edge of outgoingEdges) {
      if (!visited.has(edge.target)) {
        if (dfs(edge.target)) return true
      } else if (recStack.has(edge.target)) {
        return true
      }
    }

    recStack.delete(nodeId)
    return false
  }

  for (const node of nodes.value) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) return true
    }
  }

  return false
}

// 预览工作流
const handlePreview = () => {
  ElMessage.info('预览功能开发中')
}

// 缩放控制
const handleZoomIn = () => {
  scale.value = Math.min(scale.value + 0.1, 2)
}

const handleZoomOut = () => {
  scale.value = Math.max(scale.value - 0.1, 0.5)
}

const handleReset = () => {
  scale.value = 1
}

// 初始化
onMounted(() => {
  // 检查路由参数
  const id = route.params.id as string
  const mode = route.query.mode as string
  
  console.log('工作流设计器初始化，参数:', { id, mode })
  
  if (id) {
    workflowId.value = id
    isViewMode.value = mode === 'view'
    
    // 加载工作流数据
    loadWorkflowData(id)
  } else {
    // 新建模式
    console.log('新建工作流模式')
    isViewMode.value = false
  }
  
  // 修复：确保画布引用在下一个tick后可用
  nextTick(() => {
    const canvas = document.querySelector('.canvas') as HTMLElement
    if (canvas) {
      canvasRef.value = canvas
      console.log('画布引用设置成功:', canvasRef.value)
    } else {
      console.warn('未找到画布元素')
    }
  })
})
</script>

<style scoped lang="scss">
.workflow-designer {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;

  .toolbar {
    padding: 12px 16px;
    background: white;
    border-bottom: 1px solid #e4e7ed;
    display: flex;
    align-items: center;
    gap: 8px;
    
    .view-mode-indicator {
      margin-left: auto;
      margin-right: 16px;
    }
    
    .workflow-info {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 8px;
      
      .workflow-name {
        font-weight: 500;
        color: #303133;
      }
      
      .workflow-version {
        font-size: 12px;
        color: #909399;
      }
    }
  }

  .designer-content {
    flex: 1;
    display: flex;
    overflow: hidden;

    .node-panel {
      width: 200px;
      background: white;
      border-right: 1px solid #e4e7ed;
      display: flex;
      flex-direction: column;

      .panel-header {
        padding: 16px;
        font-weight: 600;
        border-bottom: 1px solid #e4e7ed;
      }

      .node-list {
        flex: 1;
        padding: 16px;
        overflow-y: auto;

        .node-item {
          padding: 12px;
          margin-bottom: 8px;
          background: #f5f7fa;
          border: 1px solid #e4e7ed;
          border-radius: 4px;
          cursor: move;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s;

          &:hover {
            background: #ecf5ff;
            border-color: #409eff;
          }

          &.dragging {
            opacity: 0.5;
            transform: scale(0.95);
          }

          span {
            font-size: 14px;
          }
        }
      }
    }

    .canvas-area {
      flex: 1;
      position: relative;
      overflow: auto;
      background: #fafafa;
      background-image: 
        linear-gradient(#e4e7ed 1px, transparent 1px),
        linear-gradient(90deg, #e4e7ed 1px, transparent 1px);
      background-size: 20px 20px;
      
      &.view-mode {
        .canvas {
          cursor: default;
        }
      }

      .canvas {
        position: relative;
        width: 2000px;
        height: 2000px;
        transform-origin: 0 0;

        .workflow-node {
          position: absolute;
          width: 200px;
          background: white;
          border: 2px solid #e4e7ed;
          border-radius: 8px;
          cursor: move;
          transition: all 0.3s;

          &:hover {
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
          }

          &.selected {
            border-color: #409eff;
            box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.2);
          }
          
          &.view-mode {
            cursor: pointer;
            
            .node-actions {
              display: none;
            }
          }

          .node-header {
            padding: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            border-bottom: 1px solid #e4e7ed;

            &.node-type-START {
              background: #ecf5ff;
              color: #409eff;
            }

            &.node-type-TASK {
              background: #f0f9ff;
              color: #67c23a;
            }

            &.node-type-DECISION {
              background: #fdf6ec;
              color: #e6a23c;
            }

            &.node-type-END {
              background: #fef0f0;
              color: #f56c6c;
            }
          }

          .node-body {
            padding: 12px;

            .node-info {
              font-size: 12px;
              color: #909399;
            }
          }

          .node-actions {
            padding: 8px 12px;
            border-top: 1px solid #e4e7ed;
            display: flex;
            justify-content: flex-end;
          }
        }

        .connections {
          position: absolute;
          top: 0;
          left: 0;
          pointer-events: none;
        }
      }
    }

    .property-panel {
      width: 300px;
      background: white;
      border-left: 1px solid #e4e7ed;
      display: flex;
      flex-direction: column;

      .panel-header {
        padding: 16px;
        font-weight: 600;
        border-bottom: 1px solid #e4e7ed;
      }

      .property-content {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
      }

      .empty-state {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }
  }
}
</style>
