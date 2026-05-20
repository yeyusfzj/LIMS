<template>
  <div class="user-management">
    <!-- 顶部操作栏 -->
    <el-card class="operation-bar" shadow="never">
      <div class="operation-buttons">
        <el-button type="primary" :icon="Plus" @click="handleCreate">
          新建用户
        </el-button>
        <el-button :icon="Upload" @click="handleImport">
          批量导入
        </el-button>
        <el-button :icon="Download" @click="handleExport">
          导出
        </el-button>
      </div>
    </el-card>

    <!-- 搜索和筛选区域 -->
    <el-card class="filter-bar" shadow="never">
      <el-form :model="filters" :inline="true" label-width="80px">
        <el-form-item label="用户名">
          <el-input
            v-model="filters.username"
            placeholder="请输入用户名"
            clearable
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input
            v-model="filters.fullName"
            placeholder="请输入姓名"
            clearable
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item label="部门">
          <el-select
            v-model="filters.department"
            placeholder="请选择部门"
            clearable
            @clear="handleSearch"
          >
            <el-option label="样品管理部" value="sample" />
            <el-option label="检测部" value="testing" />
            <el-option label="质量部" value="quality" />
            <el-option label="报告部" value="report" />
            <el-option label="行政部" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="filters.status"
            placeholder="请选择状态"
            clearable
            @clear="handleSearch"
          >
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">
            搜索
          </el-button>
          <el-button :icon="Refresh" @click="handleReset">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 用户列表表格 -->
    <el-card class="table-card" shadow="never">
      <el-table
        :data="tableData"
        v-loading="loading"
        stripe
        border
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="username" label="用户名" width="150" fixed />
        <el-table-column prop="fullName" label="姓名" width="120" />
        <el-table-column prop="email" label="邮箱" width="200" />
        <el-table-column prop="department" label="部门" width="120">
          <template #default="{ row }">
            {{ getDepartmentLabel(row.department) }}
          </template>
        </el-table-column>
        <el-table-column prop="roles" label="角色" width="200">
          <template #default="{ row }">
            <el-tag
              v-for="role in row.roles"
              :key="role.id"
              size="small"
              style="margin-right: 5px"
            >
              {{ role.name }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="skills" label="技能" width="200">
          <template #default="{ row }">
            <el-tag
              v-for="skill in row.skills"
              :key="skill"
              size="small"
              type="info"
              style="margin-right: 5px"
            >
              {{ skill }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastLoginAt" label="最后登录" width="160">
          <template #default="{ row }">
            {{ row.lastLoginAt ? formatDateTime(row.lastLoginAt) : '从未登录' }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleView(row)">
              查看
            </el-button>
            <el-button link type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button
              link
              :type="row.status === 'active' ? 'warning' : 'success'"
              size="small"
              @click="handleToggleStatus(row)"
            >
              {{ row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页组件 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 新建/编辑用户对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新建用户' : '编辑用户'"
      width="600px"
      @close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="formData.username"
            placeholder="请输入用户名"
            :disabled="dialogMode === 'edit'"
          />
        </el-form-item>
        <el-form-item label="姓名" prop="fullName">
          <el-input v-model="formData.fullName" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="formData.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="dialogMode === 'create'">
          <el-input
            v-model="formData.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="部门" prop="department">
          <el-select v-model="formData.department" placeholder="请选择部门">
            <el-option label="样品管理部" value="sample" />
            <el-option label="检测部" value="testing" />
            <el-option label="质量部" value="quality" />
            <el-option label="报告部" value="report" />
            <el-option label="行政部" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="角色" prop="roleIds">
          <el-select
            v-model="formData.roleIds"
            placeholder="请选择角色"
            multiple
          >
            <el-option
              v-for="role in availableRoles"
              :key="role.id"
              :label="role.name"
              :value="role.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="技能">
          <el-select
            v-model="formData.skills"
            placeholder="请选择技能"
            multiple
            allow-create
            filterable
          >
            <el-option label="水质检测" value="水质检测" />
            <el-option label="土壤检测" value="土壤检测" />
            <el-option label="空气检测" value="空气检测" />
            <el-option label="仪器操作" value="仪器操作" />
            <el-option label="数据分析" value="数据分析" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="formData.status">
            <el-radio label="active">启用</el-radio>
            <el-radio label="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 查看用户详情对话框 -->
    <el-dialog
      v-model="viewDialogVisible"
      title="用户详情"
      width="600px"
    >
      <el-descriptions :column="2" border v-if="currentUser">
        <el-descriptions-item label="用户名">
          {{ currentUser.username }}
        </el-descriptions-item>
        <el-descriptions-item label="姓名">
          {{ currentUser.fullName }}
        </el-descriptions-item>
        <el-descriptions-item label="邮箱">
          {{ currentUser.email }}
        </el-descriptions-item>
        <el-descriptions-item label="部门">
          {{ getDepartmentLabel(currentUser.department) }}
        </el-descriptions-item>
        <el-descriptions-item label="角色" :span="2">
          <el-tag
            v-for="role in currentUser.roles"
            :key="role.id"
            size="small"
            style="margin-right: 5px"
          >
            {{ role.name }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="技能" :span="2">
          <el-tag
            v-for="skill in currentUser.skills"
            :key="skill"
            size="small"
            type="info"
            style="margin-right: 5px"
          >
            {{ skill }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="currentUser.status === 'active' ? 'success' : 'danger'">
            {{ currentUser.status === 'active' ? '启用' : '禁用' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="最后登录">
          {{ currentUser.lastLoginAt ? formatDateTime(currentUser.lastLoginAt) : '从未登录' }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ formatDateTime(currentUser.createdAt) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  Plus,
  Upload,
  Download,
  Search,
  Refresh
} from '@element-plus/icons-vue'
import type { User, Role } from '@/types'

// 筛选条件
const filters = reactive({
  username: '',
  fullName: '',
  department: '',
  status: ''
})

// 分页配置
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 表格数据
const tableData = ref<User[]>([])
const loading = ref(false)
const selectedUsers = ref<User[]>([])

// 对话框相关
const dialogVisible = ref(false)
const viewDialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const formRef = ref<FormInstance>()
const currentUser = ref<User | null>(null)

// 表单数据
const formData = reactive({
  id: '',
  username: '',
  fullName: '',
  email: '',
  password: '',
  department: '',
  roleIds: [] as string[],
  skills: [] as string[],
  status: 'active' as 'active' | 'inactive'
})

// 表单验证规则
const formRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  fullName: [
    { required: true, message: '请输入姓名', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少 6 个字符', trigger: 'blur' }
  ],
  department: [
    { required: true, message: '请选择部门', trigger: 'change' }
  ],
  roleIds: [
    { required: true, message: '请选择至少一个角色', trigger: 'change' }
  ]
}

// 可用角色列表
const availableRoles = ref<Role[]>([
  { id: '1', name: '系统管理员', permissions: [] },
  { id: '2', name: '实验室主管', permissions: [] },
  { id: '3', name: '接样员', permissions: [] },
  { id: '4', name: '检测员', permissions: [] },
  { id: '5', name: '审核员', permissions: [] },
  { id: '6', name: '报告员', permissions: [] },
  { id: '7', name: '质量负责人', permissions: [] }
])

// 模拟数据
const mockUsers: User[] = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@lab.com',
    fullName: '系统管理员',
    roles: [{ id: '1', name: '系统管理员', permissions: [] }],
    department: 'admin',
    skills: ['系统管理', '用户管理'],
    status: 'active',
    createdAt: new Date('2024-01-01'),
    lastLoginAt: new Date('2024-01-23')
  },
  {
    id: '2',
    username: 'zhangsan',
    email: 'zhangsan@lab.com',
    fullName: '张三',
    roles: [
      { id: '3', name: '接样员', permissions: [] },
      { id: '4', name: '检测员', permissions: [] }
    ],
    department: 'sample',
    skills: ['样品登记', '水质检测'],
    status: 'active',
    createdAt: new Date('2024-01-05'),
    lastLoginAt: new Date('2024-01-22')
  },
  {
    id: '3',
    username: 'lisi',
    email: 'lisi@lab.com',
    fullName: '李四',
    roles: [{ id: '4', name: '检测员', permissions: [] }],
    department: 'testing',
    skills: ['土壤检测', '仪器操作'],
    status: 'active',
    createdAt: new Date('2024-01-06'),
    lastLoginAt: new Date('2024-01-21')
  },
  {
    id: '4',
    username: 'wangwu',
    email: 'wangwu@lab.com',
    fullName: '王五',
    roles: [{ id: '5', name: '审核员', permissions: [] }],
    department: 'quality',
    skills: ['质量审核', '数据分析'],
    status: 'active',
    createdAt: new Date('2024-01-07'),
    lastLoginAt: new Date('2024-01-20')
  },
  {
    id: '5',
    username: 'zhaoliu',
    email: 'zhaoliu@lab.com',
    fullName: '赵六',
    roles: [{ id: '6', name: '报告员', permissions: [] }],
    department: 'report',
    skills: ['报告编制', '数据分析'],
    status: 'inactive',
    createdAt: new Date('2024-01-08'),
    lastLoginAt: new Date('2024-01-15')
  }
]

// 获取用户列表
const fetchUsers = (resetPage: boolean = false) => {
  loading.value = true
  
  // 只在搜索/重置时重置页码
  if (resetPage) {
    pagination.currentPage = 1
  }
  
  setTimeout(() => {
    let filteredData = [...mockUsers]
    
    if (filters.username) {
      filteredData = filteredData.filter(item =>
        item.username.toLowerCase().includes(filters.username.toLowerCase())
      )
    }
    
    if (filters.fullName) {
      filteredData = filteredData.filter(item =>
        item.fullName.includes(filters.fullName)
      )
    }
    
    if (filters.department) {
      filteredData = filteredData.filter(item =>
        item.department === filters.department
      )
    }
    
    if (filters.status) {
      filteredData = filteredData.filter(item =>
        item.status === filters.status
      )
    }
    
    pagination.total = filteredData.length
    
    const start = (pagination.currentPage - 1) * pagination.pageSize
    const end = start + pagination.pageSize
    tableData.value = filteredData.slice(start, end)
    
    loading.value = false
  }, 500)
}

// 搜索
const handleSearch = () => {
  fetchUsers(true)
}

// 重置
const handleReset = () => {
  filters.username = ''
  filters.fullName = ''
  filters.department = ''
  filters.status = ''
  fetchUsers(true)
}

// 新建用户
const handleCreate = () => {
  dialogMode.value = 'create'
  resetFormData()
  dialogVisible.value = true
}

// 导入
const handleImport = () => {
  ElMessage.info('批量导入功能将在后续实现')
}

// 导出
const handleExport = () => {
  if (selectedUsers.value.length === 0) {
    ElMessage.warning('请先选择要导出的用户')
    return
  }
  ElMessage.success(`已选择 ${selectedUsers.value.length} 个用户进行导出`)
}

// 查看详情
const handleView = (row: User) => {
  currentUser.value = row
  viewDialogVisible.value = true
}

// 编辑
const handleEdit = (row: User) => {
  dialogMode.value = 'edit'
  formData.id = row.id
  formData.username = row.username
  formData.fullName = row.fullName
  formData.email = row.email
  formData.department = row.department || ''
  formData.roleIds = row.roles.map(r => r.id)
  formData.skills = row.skills || []
  formData.status = row.status
  dialogVisible.value = true
}

// 切换状态
const handleToggleStatus = (row: User) => {
  const action = row.status === 'active' ? '禁用' : '启用'
  ElMessageBox.confirm(
    `确定要${action}用户"${row.fullName}"吗？`,
    `${action}确认`,
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(() => {
      row.status = row.status === 'active' ? 'inactive' : 'active'
      ElMessage.success(`${action}成功`)
      fetchUsers()
    })
    .catch(() => {
      ElMessage.info(`已取消${action}`)
    })
}

// 删除
const handleDelete = (row: User) => {
  ElMessageBox.confirm(
    `确定要删除用户"${row.fullName}"吗？此操作不可恢复。`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(() => {
      ElMessage.success('删除成功')
      fetchUsers()
    })
    .catch(() => {
      ElMessage.info('已取消删除')
    })
}

// 选择变化
const handleSelectionChange = (selection: User[]) => {
  selectedUsers.value = selection
}

// 分页大小变化
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  fetchUsers()
}

// 当前页变化
const handleCurrentChange = (page: number) => {
  pagination.currentPage = page
  fetchUsers()
}

// 提交表单
const handleSubmit = () => {
  formRef.value?.validate((valid) => {
    if (valid) {
      if (dialogMode.value === 'create') {
        ElMessage.success('用户创建成功')
      } else {
        ElMessage.success('用户更新成功')
      }
      dialogVisible.value = false
      fetchUsers()
    }
  })
}

// 对话框关闭
const handleDialogClose = () => {
  formRef.value?.resetFields()
  resetFormData()
}

// 重置表单数据
const resetFormData = () => {
  formData.id = ''
  formData.username = ''
  formData.fullName = ''
  formData.email = ''
  formData.password = ''
  formData.department = ''
  formData.roleIds = []
  formData.skills = []
  formData.status = 'active'
}

// 获取部门标签
const getDepartmentLabel = (department?: string) => {
  const labelMap: Record<string, string> = {
    sample: '样品管理部',
    testing: '检测部',
    quality: '质量部',
    report: '报告部',
    admin: '行政部'
  }
  return department ? labelMap[department] || department : '-'
}

// 格式化日期时间
const formatDateTime = (date: Date | string) => {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

// 组件挂载时获取数据
onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.user-management {
  padding: 20px;
}

.operation-bar {
  margin-bottom: 20px;
}

.operation-buttons {
  display: flex;
  gap: 10px;
}

.filter-bar {
  margin-bottom: 20px;
}

.table-card {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-card__body) {
  padding: 20px;
}

:deep(.el-form--inline .el-form-item) {
  margin-right: 20px;
  margin-bottom: 10px;
}

:deep(.el-select) {
  width: 100%;
}
</style>
