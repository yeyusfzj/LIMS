<template>
  <div class="task-assignment-container">
    <!-- 顶部操作栏 -->
    <el-card class="header-card" shadow="never">
      <div class="header-content">
        <div class="title-section">
          <h2>任务派工</h2>
          <el-tag type="info" size="large">待分配 {{ selectedTasks.length }}/{{ unassignedTasks.length }} 个任务</el-tag>
        </div>
        <div class="action-section">
          <el-button 
            type="primary" 
            :disabled="selectedTasks.length === 0"
            @click="showBatchAssignDialog"
          >
            批量分配
          </el-button>
          <el-button :icon="Refresh" @click="handleRefresh">刷新</el-button>
        </div>
      </div>
    </el-card>

    <!-- 筛选区域 -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="filters" label-width="80px">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-form-item label="关键词">
              <el-input
                v-model="filters.keyword"
                placeholder="样品名称/条码"
                clearable
                @clear="handleSearch"
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="工作流">
              <el-select
                v-model="filters.workflowId"
                placeholder="选择工作流"
                clearable
                @change="handleSearch"
              >
                <el-option
                  v-for="workflow in workflows"
                  :key="workflow.id"
                  :label="workflow.name"
                  :value="workflow.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="优先级">
              <el-select
                v-model="filters.priority"
                placeholder="选择优先级"
                multiple
                clearable
                @change="handleSearch"
              >
                <el-option label="低" value="low" />
                <el-option label="普通" value="normal" />
                <el-option label="高" value="high" />
                <el-option label="紧急" value="urgent" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="创建时间">
              <el-date-picker
                v-model="filters.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                @change="handleSearch"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row>
          <el-col :span="24">
            <div class="button-group">
              <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
              <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>
            </div>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- 待分配任务列表 -->
    <el-card class="content-card" shadow="never">
      <div class="card-header">
        <span class="card-title">待分配任务列表</span>
        <el-checkbox 
          v-model="selectAll" 
          :indeterminate="isIndeterminate"
          @change="handleSelectAll"
        >
          全选
        </el-checkbox>
      </div>

      <el-table
        v-loading="loading"
        :data="displayTasks"
        stripe
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="任务ID" width="120" />
        <el-table-column prop="nodeName" label="任务名称" min-width="150" />
        <el-table-column prop="sampleBarcode" label="样品条码" width="150">
          <template #default="{ row }">
            <el-link type="primary" @click.stop="handleViewSample(row.sampleId)">
              {{ row.sampleBarcode }}
            </el-link>
          </template>
        </el-table-column>
        <el-table-column prop="sampleName" label="样品名称" min-width="150" />
        <el-table-column prop="workflowName" label="工作流" min-width="120" />
        <el-table-column prop="priority" label="优先级" width="100">
          <template #default="{ row }">
            <el-tag :type="getPriorityType(row.priority)" size="small">
              {{ getPriorityLabel(row.priority) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="showAssignDialog(row)"
            >
              分配
            </el-button>
            <el-button
              type="warning"
              size="small"
              @click="showPriorityDialog(row)"
            >
              设置优先级
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="filteredTasks.length"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 单个任务分配对话框 -->
    <el-dialog
      v-model="assignDialogVisible"
      title="分配任务"
      width="600px"
      @close="handleAssignDialogClose"
    >
      <el-form :model="assignForm" label-width="100px">
        <el-form-item label="任务信息">
          <div class="task-info">
            <p><strong>任务ID:</strong> {{ currentTask?.id }}</p>
            <p><strong>任务名称:</strong> {{ currentTask?.nodeName }}</p>
            <p><strong>样品:</strong> {{ currentTask?.sampleName }} ({{ currentTask?.sampleBarcode }})</p>
          </div>
        </el-form-item>
        <el-form-item label="分配给" required>
          <el-select
            v-model="assignForm.assignee"
            placeholder="选择执行人"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="user in availableUsers"
              :key="user.id"
              :label="`${user.fullName} (${user.department || '未分配部门'})`"
              :value="user.id"
            >
              <div class="user-option">
                <span>{{ user.fullName }}</span>
                <el-tag v-if="user.skills && user.skills.length > 0" size="small" type="info">
                  {{ user.skills.join(', ') }}
                </el-tag>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-radio-group v-model="assignForm.priority">
            <el-radio label="low">低</el-radio>
            <el-radio label="normal">普通</el-radio>
            <el-radio label="high">高</el-radio>
            <el-radio label="urgent">紧急</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="截止日期">
          <el-date-picker
            v-model="assignForm.dueDate"
            type="datetime"
            placeholder="选择截止日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="assignForm.notes"
            type="textarea"
            :rows="3"
            placeholder="输入备注信息（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAssignTask" :loading="assigning">确定分配</el-button>
      </template>
    </el-dialog>

    <!-- 批量分配对话框 -->
    <el-dialog
      v-model="batchAssignDialogVisible"
      title="批量分配任务"
      width="700px"
      @close="handleBatchAssignDialogClose"
    >
      <el-alert
        title="提示"
        type="info"
        :closable="false"
        style="margin-bottom: 20px"
      >
        已选择 {{ selectedTasks.length }} 个任务进行批量分配
      </el-alert>
      
      <el-form :model="batchAssignForm" label-width="100px">
        <el-form-item label="分配方式" required>
          <el-radio-group v-model="batchAssignForm.assignmentType">
            <el-radio label="single">分配给单个人员</el-radio>
            <el-radio label="auto">自动分配</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item 
          v-if="batchAssignForm.assignmentType === 'single'" 
          label="分配给" 
          required
        >
          <el-select
            v-model="batchAssignForm.assignee"
            placeholder="选择执行人"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="user in availableUsers"
              :key="user.id"
              :label="`${user.fullName} (${user.department || '未分配部门'})`"
              :value="user.id"
            >
              <div class="user-option">
                <span>{{ user.fullName }}</span>
                <el-tag v-if="user.skills && user.skills.length > 0" size="small" type="info">
                  {{ user.skills.join(', ') }}
                </el-tag>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item 
          v-if="batchAssignForm.assignmentType === 'auto'" 
          label="分配规则"
        >
          <el-select
            v-model="batchAssignForm.autoRule"
            placeholder="选择自动分配规则"
            style="width: 100%"
          >
            <el-option label="按工作负载均衡分配" value="workload" />
            <el-option label="按技能匹配分配" value="skill" />
            <el-option label="轮流分配" value="round_robin" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="统一优先级">
          <el-radio-group v-model="batchAssignForm.priority">
            <el-radio label="">保持原有</el-radio>
            <el-radio label="low">低</el-radio>
            <el-radio label="normal">普通</el-radio>
            <el-radio label="high">高</el-radio>
            <el-radio label="urgent">紧急</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="统一截止日期">
          <el-date-picker
            v-model="batchAssignForm.dueDate"
            type="datetime"
            placeholder="选择截止日期（可选）"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="batchAssignDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleBatchAssign" :loading="batchAssigning">
          确定分配
        </el-button>
      </template>
    </el-dialog>

    <!-- 优先级设置对话框 -->
    <el-dialog
      v-model="priorityDialogVisible"
      title="设置优先级"
      width="400px"
    >
      <el-form label-width="80px">
        <el-form-item label="任务">
          <div>{{ currentTask?.nodeName }}</div>
        </el-form-item>
        <el-form-item label="优先级" required>
          <el-radio-group v-model="priorityForm.priority">
            <el-radio label="low">低</el-radio>
            <el-radio label="normal">普通</el-radio>
            <el-radio label="high">高</el-radio>
            <el-radio label="urgent">紧急</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="priorityDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSetPriority">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, RefreshLeft } from '@element-plus/icons-vue'
import type { Task, User } from '@/types'

const router = useRouter()

// 状态管理
const loading = ref(false)
const assigning = ref(false)
const batchAssigning = ref(false)
const tasks = ref<Task[]>([])
const selectedTasks = ref<Task[]>([])
const selectAll = ref(false)
const workflows = ref([
  { id: 'WF-1', name: '水质检测流程' },
  { id: 'WF-2', name: '土壤检测流程' },
  { id: 'WF-3', name: '食品检测流程' },
  { id: 'WF-4', name: '药品检测流程' }
])

// 可用用户列表
const availableUsers = ref<User[]>([])

// 筛选条件
const filters = ref({
  keyword: '',
  workflowId: '',
  priority: [] as string[],
  dateRange: null as [Date, Date] | null
})

// 分页
const pagination = ref({
  currentPage: 1,
  pageSize: 20
})

// 对话框状态
const assignDialogVisible = ref(false)
const batchAssignDialogVisible = ref(false)
const priorityDialogVisible = ref(false)
const currentTask = ref<Task | null>(null)

// 表单数据
const assignForm = ref({
  assignee: '',
  priority: 'normal' as Task['priority'],
  dueDate: null as Date | null,
  notes: ''
})

const batchAssignForm = ref({
  assignmentType: 'single' as 'single' | 'auto',
  assignee: '',
  autoRule: 'workload' as 'workload' | 'skill' | 'round_robin',
  priority: '' as '' | Task['priority'],
  dueDate: null as Date | null
})

const priorityForm = ref({
  priority: 'normal' as Task['priority']
})

// 计算属性
const unassignedTasks = computed(() => {
  return tasks.value.filter(t => !t.assignee || t.assignee === '')
})

const filteredTasks = computed(() => {
  return unassignedTasks.value.filter(task => {
    // 关键词筛选
    if (filters.value.keyword) {
      const keyword = filters.value.keyword.toLowerCase()
      const matchKeyword = 
        task.sampleName.toLowerCase().includes(keyword) ||
        task.sampleBarcode.toLowerCase().includes(keyword)
      if (!matchKeyword) return false
    }
    
    // 工作流筛选
    if (filters.value.workflowId) {
      if (task.workflowId !== filters.value.workflowId) return false
    }
    
    // 优先级筛选
    if (filters.value.priority && filters.value.priority.length > 0) {
      if (!filters.value.priority.includes(task.priority)) return false
    }
    
    // 日期范围筛选
    if (filters.value.dateRange && filters.value.dateRange.length === 2) {
      const taskDate = new Date(task.createdAt)
      const [start, end] = filters.value.dateRange
      if (taskDate < start || taskDate > end) return false
    }
    
    return true
  })
})

const displayTasks = computed(() => {
  const start = (pagination.value.currentPage - 1) * pagination.value.pageSize
  const end = start + pagination.value.pageSize
  return filteredTasks.value.slice(start, end)
})

const isIndeterminate = computed(() => {
  return selectedTasks.value.length > 0 && selectedTasks.value.length < displayTasks.value.length
})

// 获取任务列表
async function fetchTasks() {
  loading.value = true
  try {
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 生成模拟数据 - 未分配的任务
    tasks.value = generateMockUnassignedTasks()
    
    ElMessage.success('任务列表加载成功')
  } catch (error) {
    console.error('获取任务列表失败:', error)
    ElMessage.error('获取任务列表失败')
  } finally {
    loading.value = false
  }
}

// 获取可用用户列表
async function fetchUsers() {
  try {
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // 生成模拟用户数据
    availableUsers.value = generateMockUsers()
  } catch (error) {
    console.error('获取用户列表失败:', error)
    ElMessage.error('获取用户列表失败')
  }
}

// 生成模拟未分配任务数据
function generateMockUnassignedTasks(): Task[] {
  const mockTasks: Task[] = []
  const priorities: Task['priority'][] = ['low', 'normal', 'high', 'urgent']
  const workflows = ['水质检测流程', '土壤检测流程', '食品检测流程', '药品检测流程']
  const nodes = ['样品前处理', '仪器检测', '数据分析', '结果审核', '报告编制']
  
  for (let i = 1; i <= 30; i++) {
    const priority = priorities[Math.floor(Math.random() * priorities.length)]
    const workflow = workflows[Math.floor(Math.random() * workflows.length)]
    const node = nodes[Math.floor(Math.random() * nodes.length)]
    
    const createdAt = new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000)
    
    mockTasks.push({
      id: `TASK-${String(i).padStart(4, '0')}`,
      sampleId: `SAMPLE-${String(i).padStart(4, '0')}`,
      sampleName: `样品-${i}`,
      sampleBarcode: `BC${String(i).padStart(8, '0')}`,
      workflowId: `WF-${Math.floor(Math.random() * 4) + 1}`,
      workflowName: workflow,
      nodeId: `NODE-${Math.floor(Math.random() * 5) + 1}`,
      nodeName: node,
      assignee: '', // 未分配
      assigneeName: '',
      status: 'pending',
      priority,
      createdAt
    })
  }
  
  return mockTasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

// 生成模拟用户数据
function generateMockUsers(): User[] {
  const departments = ['检测部', '质量部', '技术部', '分析部']
  const skills = [
    ['水质检测', '仪器操作'],
    ['土壤分析', '数据处理'],
    ['食品检测', '微生物检测'],
    ['药品检测', '化学分析'],
    ['仪器维护', '质量控制']
  ]
  
  return [
    {
      id: 'USER-001',
      username: 'zhangsan',
      email: 'zhangsan@lab.com',
      fullName: '张三',
      department: departments[0],
      skills: skills[0],
      roles: [],
      status: 'active',
      createdAt: new Date()
    },
    {
      id: 'USER-002',
      username: 'lisi',
      email: 'lisi@lab.com',
      fullName: '李四',
      department: departments[1],
      skills: skills[1],
      roles: [],
      status: 'active',
      createdAt: new Date()
    },
    {
      id: 'USER-003',
      username: 'wangwu',
      email: 'wangwu@lab.com',
      fullName: '王五',
      department: departments[2],
      skills: skills[2],
      roles: [],
      status: 'active',
      createdAt: new Date()
    },
    {
      id: 'USER-004',
      username: 'zhaoliu',
      email: 'zhaoliu@lab.com',
      fullName: '赵六',
      department: departments[3],
      skills: skills[3],
      roles: [],
      status: 'active',
      createdAt: new Date()
    },
    {
      id: 'USER-005',
      username: 'qianqi',
      email: 'qianqi@lab.com',
      fullName: '钱七',
      department: departments[0],
      skills: skills[4],
      roles: [],
      status: 'active',
      createdAt: new Date()
    }
  ]
}

// 事件处理
function handleSearch() {
  pagination.value.currentPage = 1
}

function handleReset() {
  filters.value = {
    keyword: '',
    workflowId: '',
    priority: [],
    dateRange: null
  }
  pagination.value.currentPage = 1
}

function handleRefresh() {
  fetchTasks()
}

function handleSizeChange() {
  pagination.value.currentPage = 1
}

function handleCurrentChange() {
  // 分页变化已在 computed 中处理
}

function handleSelectAll(value: boolean) {
  if (value) {
    selectedTasks.value = [...displayTasks.value]
  } else {
    selectedTasks.value = []
  }
}

function handleSelectionChange(selection: Task[]) {
  selectedTasks.value = selection
  selectAll.value = selection.length === displayTasks.value.length
}

function handleViewSample(sampleId: string) {
  router.push({ name: 'sample-detail', params: { id: sampleId } })
}

// 显示单个任务分配对话框
function showAssignDialog(task: Task) {
  currentTask.value = task
  assignForm.value = {
    assignee: '',
    priority: task.priority,
    dueDate: null,
    notes: ''
  }
  assignDialogVisible.value = true
}

function handleAssignDialogClose() {
  currentTask.value = null
  assignForm.value = {
    assignee: '',
    priority: 'normal',
    dueDate: null,
    notes: ''
  }
}

// 分配单个任务
async function handleAssignTask() {
  if (!assignForm.value.assignee) {
    ElMessage.warning('请选择执行人')
    return
  }
  
  assigning.value = true
  try {
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // 更新任务
    const taskIndex = tasks.value.findIndex(t => t.id === currentTask.value?.id)
    if (taskIndex !== -1) {
      const user = availableUsers.value.find(u => u.id === assignForm.value.assignee)
      tasks.value[taskIndex] = {
        ...tasks.value[taskIndex],
        assignee: assignForm.value.assignee,
        assigneeName: user?.fullName || '',
        priority: assignForm.value.priority,
        dueDate: assignForm.value.dueDate || undefined
      }
    }
    
    ElMessage.success('任务分配成功')
    assignDialogVisible.value = false
    
    // 从待分配列表中移除
    tasks.value = tasks.value.filter(t => t.id !== currentTask.value?.id)
  } catch (error) {
    console.error('分配任务失败:', error)
    ElMessage.error('分配任务失败')
  } finally {
    assigning.value = false
  }
}

// 显示批量分配对话框
function showBatchAssignDialog() {
  if (selectedTasks.value.length === 0) {
    ElMessage.warning('请先选择要分配的任务')
    return
  }
  
  batchAssignForm.value = {
    assignmentType: 'single',
    assignee: '',
    autoRule: 'workload',
    priority: '',
    dueDate: null
  }
  batchAssignDialogVisible.value = true
}

function handleBatchAssignDialogClose() {
  batchAssignForm.value = {
    assignmentType: 'single',
    assignee: '',
    autoRule: 'workload',
    priority: '',
    dueDate: null
  }
}

// 批量分配任务
async function handleBatchAssign() {
  // 验证
  if (batchAssignForm.value.assignmentType === 'single' && !batchAssignForm.value.assignee) {
    ElMessage.warning('请选择执行人')
    return
  }
  
  batchAssigning.value = true
  try {
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 根据分配方式处理
    if (batchAssignForm.value.assignmentType === 'single') {
      // 分配给单个人员
      const user = availableUsers.value.find(u => u.id === batchAssignForm.value.assignee)
      selectedTasks.value.forEach(task => {
        const taskIndex = tasks.value.findIndex(t => t.id === task.id)
        if (taskIndex !== -1) {
          tasks.value[taskIndex] = {
            ...tasks.value[taskIndex],
            assignee: batchAssignForm.value.assignee,
            assigneeName: user?.fullName || '',
            priority: batchAssignForm.value.priority || task.priority,
            dueDate: batchAssignForm.value.dueDate || undefined
          }
        }
      })
    } else {
      // 自动分配
      autoAssignTasks(selectedTasks.value, batchAssignForm.value.autoRule)
    }
    
    // 从待分配列表中移除已分配的任务
    const assignedIds = selectedTasks.value.map(t => t.id)
    tasks.value = tasks.value.filter(t => !assignedIds.includes(t.id))
    
    ElMessage.success(`成功分配 ${selectedTasks.value.length} 个任务`)
    batchAssignDialogVisible.value = false
    selectedTasks.value = []
    selectAll.value = false
  } catch (error) {
    console.error('批量分配失败:', error)
    ElMessage.error('批量分配失败')
  } finally {
    batchAssigning.value = false
  }
}

// 自动分配任务
function autoAssignTasks(tasksToAssign: Task[], rule: 'workload' | 'skill' | 'round_robin') {
  const users = availableUsers.value
  
  switch (rule) {
    case 'workload':
      // 按工作负载均衡分配（简化实现：轮流分配）
      tasksToAssign.forEach((task, index) => {
        const user = users[index % users.length]
        const taskIndex = tasks.value.findIndex(t => t.id === task.id)
        if (taskIndex !== -1) {
          tasks.value[taskIndex] = {
            ...tasks.value[taskIndex],
            assignee: user.id,
            assigneeName: user.fullName,
            priority: batchAssignForm.value.priority || task.priority,
            dueDate: batchAssignForm.value.dueDate || undefined
          }
        }
      })
      break
      
    case 'skill':
      // 按技能匹配分配（简化实现：随机分配）
      tasksToAssign.forEach(task => {
        const user = users[Math.floor(Math.random() * users.length)]
        const taskIndex = tasks.value.findIndex(t => t.id === task.id)
        if (taskIndex !== -1) {
          tasks.value[taskIndex] = {
            ...tasks.value[taskIndex],
            assignee: user.id,
            assigneeName: user.fullName,
            priority: batchAssignForm.value.priority || task.priority,
            dueDate: batchAssignForm.value.dueDate || undefined
          }
        }
      })
      break
      
    case 'round_robin':
      // 轮流分配
      tasksToAssign.forEach((task, index) => {
        const user = users[index % users.length]
        const taskIndex = tasks.value.findIndex(t => t.id === task.id)
        if (taskIndex !== -1) {
          tasks.value[taskIndex] = {
            ...tasks.value[taskIndex],
            assignee: user.id,
            assigneeName: user.fullName,
            priority: batchAssignForm.value.priority || task.priority,
            dueDate: batchAssignForm.value.dueDate || undefined
          }
        }
      })
      break
  }
}

// 显示优先级设置对话框
function showPriorityDialog(task: Task) {
  currentTask.value = task
  priorityForm.value.priority = task.priority
  priorityDialogVisible.value = true
}

// 设置优先级
async function handleSetPriority() {
  try {
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const taskIndex = tasks.value.findIndex(t => t.id === currentTask.value?.id)
    if (taskIndex !== -1) {
      tasks.value[taskIndex].priority = priorityForm.value.priority
    }
    
    ElMessage.success('优先级设置成功')
    priorityDialogVisible.value = false
  } catch (error) {
    console.error('设置优先级失败:', error)
    ElMessage.error('设置优先级失败')
  }
}

// 工具函数
function getPriorityType(priority: Task['priority']): string {
  const typeMap = {
    low: 'info',
    normal: '',
    high: 'warning',
    urgent: 'danger'
  }
  return typeMap[priority] || ''
}

function getPriorityLabel(priority: Task['priority']): string {
  const labelMap = {
    low: '低',
    normal: '普通',
    high: '高',
    urgent: '紧急'
  }
  return labelMap[priority] || priority
}

function formatDate(date: Date): string {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 生命周期
onMounted(() => {
  fetchTasks()
  fetchUsers()
})
</script>

<style scoped>
.task-assignment-container {
  padding: 20px;
}

.header-card {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-section h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.action-section {
  display: flex;
  gap: 12px;
}

.filter-card {
  margin-bottom: 20px;
}

.button-group {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.content-card {
  min-height: 600px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.task-info {
  background-color: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
}

.task-info p {
  margin: 8px 0;
  color: #606266;
}

.task-info strong {
  color: #303133;
  margin-right: 8px;
}

.user-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

:deep(.el-table__row) {
  cursor: pointer;
}

:deep(.el-table__row:hover) {
  background-color: #f5f7fa;
}

:deep(.el-dialog__body) {
  padding: 20px;
}
</style>
