<template>
  <div class="role-management">
    <!-- 顶部操作栏 -->
    <el-card class="operation-bar" shadow="never">
      <div class="operation-buttons">
        <el-button type="primary" :icon="Plus" @click="handleCreate">
          新建角色
        </el-button>
      </div>
    </el-card>

    <!-- 角色列表 -->
    <el-row :gutter="20">
      <!-- 左侧角色列表 -->
      <el-col :span="8">
        <el-card class="role-list-card" shadow="never">
          <template #header>
            <div class="card-header">
              <span>角色列表</span>
            </div>
          </template>
          <el-input
            v-model="searchKeyword"
            placeholder="搜索角色"
            :prefix-icon="Search"
            clearable
            style="margin-bottom: 15px"
          />
          <el-scrollbar height="600px">
            <div
              v-for="role in filteredRoles"
              :key="role.id"
              class="role-item"
              :class="{ active: selectedRole?.id === role.id }"
              @click="handleSelectRole(role)"
            >
              <div class="role-info">
                <div class="role-name">{{ role.name }}</div>
                <div class="role-desc">{{ role.description }}</div>
                <div class="role-meta">
                  <el-tag size="small" type="info">
                    {{ role.userCount || 0 }} 个用户
                  </el-tag>
                </div>
              </div>
              <div class="role-actions">
                <el-button
                  link
                  type="primary"
                  size="small"
                  :icon="Edit"
                  @click.stop="handleEdit(role)"
                />
                <el-button
                  link
                  type="danger"
                  size="small"
                  :icon="Delete"
                  @click.stop="handleDelete(role)"
                />
              </div>
            </div>
          </el-scrollbar>
        </el-card>
      </el-col>

      <!-- 右侧权限配置 -->
      <el-col :span="16">
        <el-card class="permission-card" shadow="never" v-if="selectedRole">
          <template #header>
            <div class="card-header">
              <span>权限配置 - {{ selectedRole.name }}</span>
              <el-button type="primary" size="small" @click="handleSavePermissions">
                保存权限
              </el-button>
            </div>
          </template>
          <el-alert
            title="提示"
            type="info"
            :closable="false"
            style="margin-bottom: 20px"
          >
            勾选权限后,拥有该角色的用户将获得对应的操作权限
          </el-alert>
          <el-tree
            ref="permissionTreeRef"
            :data="permissionTree"
            :props="treeProps"
            show-checkbox
            node-key="id"
            :default-checked-keys="selectedRole.permissionIds"
            :default-expand-all="true"
          >
            <template #default="{ node, data }">
              <span class="custom-tree-node">
                <span>{{ node.label }}</span>
                <span class="permission-desc">{{ data.description }}</span>
              </span>
            </template>
          </el-tree>
        </el-card>
        <el-card class="permission-card" shadow="never" v-else>
          <el-empty description="请选择一个角色查看权限配置" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 新建/编辑角色对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新建角色' : '编辑角色'"
      width="500px"
      @close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="角色描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入角色描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 分配用户对话框 -->
    <el-dialog
      v-model="assignDialogVisible"
      title="分配用户"
      width="600px"
    >
      <el-transfer
        v-model="assignedUserIds"
        :data="allUsers"
        :titles="['未分配用户', '已分配用户']"
        filterable
        filter-placeholder="搜索用户"
      />
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="assignDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSaveAssignment">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, ElTree } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  Plus,
  Edit,
  Delete,
  Search
} from '@element-plus/icons-vue'

// 角色接口
interface Role {
  id: string
  name: string
  description?: string
  permissionIds: string[]
  userCount?: number
}

// 权限树节点接口
interface PermissionNode {
  id: string
  label: string
  description?: string
  children?: PermissionNode[]
}

// 用户接口（用于分配）
interface UserOption {
  key: string
  label: string
  disabled?: boolean
}

// 搜索关键词
const searchKeyword = ref('')

// 角色列表
const roles = ref<Role[]>([])
const selectedRole = ref<Role | null>(null)

// 对话框相关
const dialogVisible = ref(false)
const assignDialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const formRef = ref<FormInstance>()
const permissionTreeRef = ref<InstanceType<typeof ElTree>>()

// 表单数据
const formData = reactive({
  id: '',
  name: '',
  description: ''
})

// 表单验证规则
const formRules: FormRules = {
  name: [
    { required: true, message: '请输入角色名称', trigger: 'blur' }
  ]
}

// 权限树配置
const treeProps = {
  children: 'children',
  label: 'label'
}

// 权限树数据
const permissionTree = ref<PermissionNode[]>([
  {
    id: 'sample',
    label: '样品管理',
    description: '样品相关功能权限',
    children: [
      { id: 'sample.create', label: '创建样品', description: '登记新样品' },
      { id: 'sample.read', label: '查看样品', description: '查看样品信息' },
      { id: 'sample.update', label: '编辑样品', description: '修改样品信息' },
      { id: 'sample.delete', label: '删除样品', description: '删除样品记录' },
      { id: 'sample.transfer', label: '样品流转', description: '执行样品流转操作' },
      { id: 'sample.split', label: '样品分样', description: '执行分样操作' },
      { id: 'sample.merge', label: '样品合样', description: '执行合样操作' }
    ]
  },
  {
    id: 'workflow',
    label: '工作流管理',
    description: '工作流相关功能权限',
    children: [
      { id: 'workflow.create', label: '创建工作流', description: '创建新工作流' },
      { id: 'workflow.read', label: '查看工作流', description: '查看工作流配置' },
      { id: 'workflow.update', label: '编辑工作流', description: '修改工作流配置' },
      { id: 'workflow.delete', label: '删除工作流', description: '删除工作流' },
      { id: 'workflow.assign', label: '任务分配', description: '分配检测任务' },
      { id: 'workflow.execute', label: '执行任务', description: '执行检测任务' }
    ]
  },
  {
    id: 'method',
    label: '检测方法',
    description: '检测方法相关功能权限',
    children: [
      { id: 'method.create', label: '创建方法', description: '创建检测方法' },
      { id: 'method.read', label: '查看方法', description: '查看检测方法' },
      { id: 'method.update', label: '编辑方法', description: '修改检测方法' },
      { id: 'method.delete', label: '删除方法', description: '删除检测方法' }
    ]
  },
  {
    id: 'result',
    label: '结果管理',
    description: '检测结果相关功能权限',
    children: [
      { id: 'result.entry', label: '录入结果', description: '手工录入检测结果' },
      { id: 'result.import', label: '导入结果', description: '从仪器导入结果' },
      { id: 'result.read', label: '查看结果', description: '查看检测结果' },
      { id: 'result.update', label: '修改结果', description: '修改检测结果' },
      { id: 'result.anomaly', label: '标记异常', description: '标记异常结果' },
      { id: 'result.retest', label: '申请复测', description: '申请复测' }
    ]
  },
  {
    id: 'audit',
    label: '审核管理',
    description: '审核相关功能权限',
    children: [
      { id: 'audit.config', label: '配置审核流程', description: '配置审核级别和流程' },
      { id: 'audit.execute', label: '执行审核', description: '执行审核任务' },
      { id: 'audit.approve', label: '审核通过', description: '审核通过操作' },
      { id: 'audit.reject', label: '审核退回', description: '审核退回操作' },
      { id: 'audit.judgment', label: '质量判定', description: '执行质量判定' }
    ]
  },
  {
    id: 'release',
    label: '样品放行',
    description: '样品放行相关功能权限',
    children: [
      { id: 'release.execute', label: '执行放行', description: '执行样品放行' },
      { id: 'release.return', label: '样品退回', description: '退回样品' },
      { id: 'release.batch', label: '批量放行', description: '批量放行样品' }
    ]
  },
  {
    id: 'report',
    label: '报告管理',
    description: '报告相关功能权限',
    children: [
      { id: 'report.template.create', label: '创建模板', description: '创建报告模板' },
      { id: 'report.template.update', label: '编辑模板', description: '编辑报告模板' },
      { id: 'report.generate', label: '生成报告', description: '生成检测报告' },
      { id: 'report.sign', label: '签署报告', description: '添加电子签名' },
      { id: 'report.distribute', label: '分发报告', description: '分发报告给客户' },
      { id: 'report.recall', label: '回收报告', description: '回收已分发报告' }
    ]
  },
  {
    id: 'statistics',
    label: '统计分析',
    description: '统计分析相关功能权限',
    children: [
      { id: 'statistics.view', label: '查看统计', description: '查看统计报表' },
      { id: 'statistics.export', label: '导出报表', description: '导出统计报表' },
      { id: 'statistics.custom', label: '自定义报表', description: '配置自定义报表' }
    ]
  },
  {
    id: 'system',
    label: '系统管理',
    description: '系统管理相关功能权限',
    children: [
      { id: 'system.user.create', label: '创建用户', description: '创建新用户' },
      { id: 'system.user.update', label: '编辑用户', description: '编辑用户信息' },
      { id: 'system.user.delete', label: '删除用户', description: '删除用户' },
      { id: 'system.role.manage', label: '角色管理', description: '管理角色和权限' },
      { id: 'system.log.view', label: '查看日志', description: '查看审计日志' },
      { id: 'system.config', label: '系统配置', description: '修改系统配置' }
    ]
  }
])

// 用户列表（用于分配）
const allUsers = ref<UserOption[]>([
  { key: '1', label: '系统管理员' },
  { key: '2', label: '张三' },
  { key: '3', label: '李四' },
  { key: '4', label: '王五' },
  { key: '5', label: '赵六' }
])

const assignedUserIds = ref<string[]>([])

// 模拟角色数据
const mockRoles: Role[] = [
  {
    id: '1',
    name: '系统管理员',
    description: '拥有系统所有权限',
    permissionIds: ['system.user.create', 'system.user.update', 'system.user.delete', 'system.role.manage', 'system.log.view', 'system.config'],
    userCount: 1
  },
  {
    id: '2',
    name: '实验室主管',
    description: '实验室管理人员,负责工作流配置和任务分配',
    permissionIds: ['workflow.create', 'workflow.update', 'workflow.assign', 'method.create', 'method.update', 'statistics.view'],
    userCount: 2
  },
  {
    id: '3',
    name: '接样员',
    description: '负责样品登记和流转',
    permissionIds: ['sample.create', 'sample.read', 'sample.update', 'sample.transfer'],
    userCount: 3
  },
  {
    id: '4',
    name: '检测员',
    description: '负责执行检测任务和录入结果',
    permissionIds: ['workflow.execute', 'result.entry', 'result.import', 'result.read', 'result.anomaly', 'result.retest', 'sample.read'],
    userCount: 5
  },
  {
    id: '5',
    name: '审核员',
    description: '负责审核检测结果',
    permissionIds: ['audit.execute', 'audit.approve', 'audit.reject', 'audit.judgment', 'result.read', 'sample.read'],
    userCount: 3
  },
  {
    id: '6',
    name: '报告员',
    description: '负责生成和分发报告',
    permissionIds: ['report.generate', 'report.sign', 'report.distribute', 'result.read', 'sample.read'],
    userCount: 2
  },
  {
    id: '7',
    name: '质量负责人',
    description: '负责质量判定和样品放行',
    permissionIds: ['audit.judgment', 'release.execute', 'release.return', 'release.batch', 'report.sign', 'statistics.view'],
    userCount: 1
  }
]

// 过滤后的角色列表
const filteredRoles = computed(() => {
  if (!searchKeyword.value) {
    return roles.value
  }
  return roles.value.filter(role =>
    role.name.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchKeyword.value.toLowerCase())
  )
})

// 获取角色列表
const fetchRoles = () => {
  roles.value = [...mockRoles]
  if (roles.value.length > 0) {
    selectedRole.value = roles.value[0]
  }
}

// 选择角色
const handleSelectRole = (role: Role) => {
  selectedRole.value = role
}

// 新建角色
const handleCreate = () => {
  dialogMode.value = 'create'
  resetFormData()
  dialogVisible.value = true
}

// 编辑角色
const handleEdit = (role: Role) => {
  dialogMode.value = 'edit'
  formData.id = role.id
  formData.name = role.name
  formData.description = role.description || ''
  dialogVisible.value = true
}

// 删除角色
const handleDelete = (role: Role) => {
  ElMessageBox.confirm(
    `确定要删除角色"${role.name}"吗？此操作不可恢复。`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(() => {
      ElMessage.success('删除成功')
      fetchRoles()
    })
    .catch(() => {
      ElMessage.info('已取消删除')
    })
}

// 提交表单
const handleSubmit = () => {
  formRef.value?.validate((valid) => {
    if (valid) {
      if (dialogMode.value === 'create') {
        ElMessage.success('角色创建成功')
      } else {
        ElMessage.success('角色更新成功')
      }
      dialogVisible.value = false
      fetchRoles()
    }
  })
}

// 保存权限配置
const handleSavePermissions = () => {
  if (!selectedRole.value) return
  
  const checkedKeys = permissionTreeRef.value?.getCheckedKeys() as string[]
  const halfCheckedKeys = permissionTreeRef.value?.getHalfCheckedKeys() as string[]
  const allKeys = [...checkedKeys, ...halfCheckedKeys]
  
  selectedRole.value.permissionIds = checkedKeys
  
  ElMessage.success('权限配置保存成功')
}

// 分配用户
const handleAssignUsers = () => {
  if (!selectedRole.value) return
  assignDialogVisible.value = true
}

// 保存用户分配
const handleSaveAssignment = () => {
  ElMessage.success('用户分配成功')
  assignDialogVisible.value = false
}

// 对话框关闭
const handleDialogClose = () => {
  formRef.value?.resetFields()
  resetFormData()
}

// 重置表单数据
const resetFormData = () => {
  formData.id = ''
  formData.name = ''
  formData.description = ''
}

// 组件挂载时获取数据
onMounted(() => {
  fetchRoles()
})
</script>

<style scoped>
.role-management {
  padding: 20px;
}

.operation-bar {
  margin-bottom: 20px;
}

.operation-buttons {
  display: flex;
  gap: 10px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.role-list-card {
  height: 100%;
}

.role-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  margin-bottom: 10px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.role-item:hover {
  background-color: #f5f7fa;
  border-color: #409eff;
}

.role-item.active {
  background-color: #ecf5ff;
  border-color: #409eff;
}

.role-info {
  flex: 1;
}

.role-name {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 5px;
  color: #303133;
}

.role-desc {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
}

.role-meta {
  display: flex;
  gap: 10px;
}

.role-actions {
  display: flex;
  gap: 5px;
  opacity: 0;
  transition: opacity 0.3s;
}

.role-item:hover .role-actions {
  opacity: 1;
}

.permission-card {
  height: 100%;
}

.custom-tree-node {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-right: 20px;
}

.permission-desc {
  font-size: 12px;
  color: #909399;
  margin-left: 10px;
}

:deep(.el-card__body) {
  padding: 20px;
}

:deep(.el-tree-node__content) {
  height: 36px;
}

:deep(.el-transfer) {
  display: flex;
  justify-content: center;
}
</style>
