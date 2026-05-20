<template>
  <div class="node-config">
    <!-- 检测节点配置 -->
    <div v-if="node.type === 'test'" class="config-section">
      <el-form-item label="检测方法">
        <el-select
          v-model="localConfig.methodId"
          placeholder="选择检测方法"
          @change="emitUpdate"
        >
          <el-option
            v-for="method in testMethods"
            :key="method.id"
            :label="method.name"
            :value="method.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="自动派工">
        <el-switch
          v-model="localConfig.autoAssign"
          @change="emitUpdate"
        />
      </el-form-item>

      <el-form-item v-if="localConfig.autoAssign" label="派工规则">
        <el-select
          v-model="localConfig.assignmentRule.type"
          placeholder="选择派工规则"
          @change="emitUpdate"
        >
          <el-option label="按技能" value="skill" />
          <el-option label="按工作负载" value="workload" />
          <el-option label="轮询" value="round_robin" />
        </el-select>
      </el-form-item>

      <el-form-item label="预期时长（分钟）">
        <el-input-number
          v-model="localConfig.estimatedDuration"
          :min="1"
          :max="1440"
          @change="emitUpdate"
        />
      </el-form-item>
    </div>

    <!-- 审核节点配置 -->
    <div v-if="node.type === 'audit'" class="config-section">
      <el-form-item label="审核级别">
        <el-select
          v-model="localConfig.auditLevel"
          placeholder="选择审核级别"
          @change="emitUpdate"
        >
          <el-option label="分析审核" :value="1" />
          <el-option label="样品审核" :value="2" />
          <el-option label="技术审核" :value="3" />
          <el-option label="质量审核" :value="4" />
        </el-select>
      </el-form-item>

      <el-form-item label="审核角色">
        <el-select
          v-model="localConfig.role"
          placeholder="选择审核角色"
          @change="emitUpdate"
        >
          <el-option
            v-for="role in auditRoles"
            :key="role.id"
            :label="role.name"
            :value="role.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="必需审核">
        <el-switch
          v-model="localConfig.required"
          @change="emitUpdate"
        />
      </el-form-item>

      <el-form-item label="审核说明">
        <el-input
          v-model="localConfig.description"
          type="textarea"
          :rows="3"
          placeholder="输入审核说明"
          @change="emitUpdate"
        />
      </el-form-item>
    </div>

    <!-- 等待节点配置 -->
    <div v-if="node.type === 'wait'" class="config-section">
      <el-form-item label="等待时长">
        <el-input-number
          v-model="localConfig.waitDuration"
          :min="1"
          :max="10080"
          @change="emitUpdate"
        />
        <span class="unit-text">分钟</span>
      </el-form-item>

      <el-form-item label="等待原因">
        <el-input
          v-model="localConfig.reason"
          placeholder="输入等待原因"
          @change="emitUpdate"
        />
      </el-form-item>

      <el-form-item label="超时处理">
        <el-select
          v-model="localConfig.timeoutAction"
          placeholder="选择超时处理方式"
          @change="emitUpdate"
        >
          <el-option label="继续流程" value="continue" />
          <el-option label="发送通知" value="notify" />
          <el-option label="暂停流程" value="pause" />
        </el-select>
      </el-form-item>
    </div>

    <!-- 决策节点配置 -->
    <div v-if="node.type === 'decision'" class="config-section">
      <el-form-item label="决策条件">
        <el-input
          v-model="localConfig.condition"
          type="textarea"
          :rows="3"
          placeholder="输入决策条件表达式，例如：result.value > 100"
          @change="emitUpdate"
        />
      </el-form-item>

      <el-form-item label="条件类型">
        <el-select
          v-model="localConfig.conditionType"
          placeholder="选择条件类型"
          @change="emitUpdate"
        >
          <el-option label="结果判断" value="result" />
          <el-option label="状态判断" value="status" />
          <el-option label="时间判断" value="time" />
          <el-option label="自定义" value="custom" />
        </el-select>
      </el-form-item>

      <el-form-item label="分支数量">
        <el-input-number
          v-model="localConfig.branchCount"
          :min="2"
          :max="5"
          @change="emitUpdate"
        />
      </el-form-item>

      <el-divider content-position="left">分支配置</el-divider>

      <div
        v-for="(branch, index) in localConfig.branches"
        :key="index"
        class="branch-item"
      >
        <el-form-item :label="`分支 ${index + 1}`">
          <el-input
            v-model="branch.label"
            placeholder="分支标签"
            @change="emitUpdate"
          />
        </el-form-item>
        <el-form-item label="分支条件">
          <el-input
            v-model="branch.condition"
            placeholder="分支条件表达式"
            @change="emitUpdate"
          />
        </el-form-item>
      </div>
    </div>

    <!-- 通用配置 -->
    <el-divider content-position="left">通用配置</el-divider>

    <el-form-item label="节点描述">
      <el-input
        v-model="localConfig.nodeDescription"
        type="textarea"
        :rows="2"
        placeholder="输入节点描述"
        @change="emitUpdate"
      />
    </el-form-item>

    <el-form-item label="通知设置">
      <el-checkbox-group v-model="localConfig.notifications" @change="emitUpdate">
        <el-checkbox label="start">开始时通知</el-checkbox>
        <el-checkbox label="complete">完成时通知</el-checkbox>
        <el-checkbox label="error">出错时通知</el-checkbox>
      </el-checkbox-group>
    </el-form-item>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

interface WorkflowNode {
  id: string
  type: 'test' | 'audit' | 'wait' | 'decision'
  name: string
  position: { x: number; y: number }
  config: any
}

interface Props {
  node: WorkflowNode
}

interface Emits {
  (e: 'update', config: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 本地配置状态
const localConfig = ref<any>({
  // 检测节点
  methodId: '',
  autoAssign: false,
  assignmentRule: {
    type: 'skill',
    criteria: {}
  },
  estimatedDuration: 60,

  // 审核节点
  auditLevel: 1,
  role: '',
  required: true,
  description: '',

  // 等待节点
  waitDuration: 60,
  reason: '',
  timeoutAction: 'continue',

  // 决策节点
  condition: '',
  conditionType: 'result',
  branchCount: 2,
  branches: [
    { label: '是', condition: 'true' },
    { label: '否', condition: 'false' }
  ],

  // 通用
  nodeDescription: '',
  notifications: []
})

// 模拟数据
const testMethods = ref([
  { id: '1', name: '水质检测' },
  { id: '2', name: '土壤检测' },
  { id: '3', name: '空气检测' },
  { id: '4', name: '食品检测' }
])

const auditRoles = ref([
  { id: 'analyst', name: '分析员' },
  { id: 'reviewer', name: '审核员' },
  { id: 'approver', name: '批准人' },
  { id: 'quality', name: '质量负责人' }
])

// 监听分支数量变化
watch(() => localConfig.value.branchCount, (newCount, oldCount) => {
  if (newCount > oldCount) {
    // 添加分支
    for (let i = oldCount; i < newCount; i++) {
      localConfig.value.branches.push({
        label: `分支 ${i + 1}`,
        condition: ''
      })
    }
  } else if (newCount < oldCount) {
    // 删除分支
    localConfig.value.branches = localConfig.value.branches.slice(0, newCount)
  }
})

// 发送更新事件
const emitUpdate = () => {
  emit('update', { ...localConfig.value })
}

// 初始化配置
onMounted(() => {
  if (props.node.config && Object.keys(props.node.config).length > 0) {
    localConfig.value = { ...localConfig.value, ...props.node.config }
  }
})

// 监听节点变化
watch(() => props.node, (newNode) => {
  if (newNode.config && Object.keys(newNode.config).length > 0) {
    localConfig.value = { ...localConfig.value, ...newNode.config }
  }
}, { deep: true })
</script>

<style scoped lang="scss">
.node-config {
  .config-section {
    margin-bottom: 16px;
  }

  .unit-text {
    margin-left: 8px;
    color: #909399;
    font-size: 14px;
  }

  .branch-item {
    padding: 12px;
    margin-bottom: 12px;
    background: #f5f7fa;
    border-radius: 4px;
    border: 1px solid #e4e7ed;
  }

  :deep(.el-form-item) {
    margin-bottom: 16px;
  }

  :deep(.el-divider) {
    margin: 16px 0;
  }
}
</style>
