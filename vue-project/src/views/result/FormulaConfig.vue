<template>
  <div class="formula-config">
    <el-page-header @back="handleBack" title="返回">
      <template #content>
        <span class="page-title">公式配置管理</span>
      </template>
    </el-page-header>

    <div class="content-wrapper">
      <!-- 公式列表 -->
      <el-card class="formula-list-card">
        <template #header>
          <div class="card-header">
            <span>已配置公式</span>
            <el-button type="primary" @click="handleCreateFormula">
              <el-icon><Plus /></el-icon>
              新建公式
            </el-button>
          </div>
        </template>

        <el-table :data="formulas" border stripe>
          <el-table-column prop="id" label="公式名称" width="150" />
          <el-table-column prop="expression" label="表达式" min-width="200" />
          <el-table-column prop="resultUnit" label="结果单位" width="100" />
          <el-table-column label="变量数量" width="100">
            <template #default="{ row }">
              {{ row.variables.length }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" link @click="handleEditFormula(row)">
                编辑
              </el-button>
              <el-button type="info" size="small" link @click="handleViewFormula(row)">
                查看
              </el-button>
              <el-button type="danger" size="small" link @click="handleDeleteFormula(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="formulas.length === 0" class="empty-state">
          <el-empty description="暂无公式配置，点击上方按钮创建新公式" />
        </div>
      </el-card>

      <!-- 公式编辑器对话框 -->
      <el-dialog
        v-model="editorDialogVisible"
        :title="editorMode === 'create' ? '新建公式' : '编辑公式'"
        width="80%"
        :close-on-click-modal="false"
      >
        <FormulaEditor
          :formula="currentFormula"
          :mode="editorMode"
          @save="handleSaveFormula"
          @cancel="handleCancelEdit"
        />
      </el-dialog>

      <!-- 公式详情对话框 -->
      <el-dialog
        v-model="detailDialogVisible"
        title="公式详情"
        width="60%"
      >
        <el-descriptions v-if="currentFormula" :column="1" border>
          <el-descriptions-item label="公式名称">
            {{ currentFormula.id }}
          </el-descriptions-item>
          <el-descriptions-item label="表达式">
            {{ currentFormula.expression }}
          </el-descriptions-item>
          <el-descriptions-item label="结果单位">
            {{ currentFormula.resultUnit || '无' }}
          </el-descriptions-item>
          <el-descriptions-item label="变量配置">
            <el-table :data="currentFormula.variables" border size="small">
              <el-table-column prop="name" label="变量名" width="100" />
              <el-table-column prop="source" label="数据来源" width="120">
                <template #default="{ row }">
                  <el-tag v-if="row.source === 'input'" type="primary">输入值</el-tag>
                  <el-tag v-else-if="row.source === 'result'" type="success">检测结果</el-tag>
                  <el-tag v-else type="info">常量</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="value" label="默认值/测试值" />
            </el-table>
          </el-descriptions-item>
        </el-descriptions>
      </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import FormulaEditor from '@/components/FormulaEditor.vue'
import type { Formula } from '@/types'

const router = useRouter()

// 公式列表（模拟数据）
const formulas = ref<Formula[]>([
  {
    id: '浓度计算',
    expression: '(a * b) / c',
    variables: [
      { name: 'a', value: 10, source: 'result' },
      { name: 'b', value: 2, source: 'constant' },
      { name: 'c', value: 5, source: 'result' }
    ],
    resultUnit: 'mg/L'
  },
  {
    id: '回收率',
    expression: '(measured / standard) * 100',
    variables: [
      { name: 'measured', value: 95, source: 'result' },
      { name: 'standard', value: 100, source: 'constant' }
    ],
    resultUnit: '%'
  }
])

// 对话框状态
const editorDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const editorMode = ref<'create' | 'edit'>('create')
const currentFormula = ref<Formula | undefined>(undefined)

// 返回
const handleBack = () => {
  router.back()
}

// 创建公式
const handleCreateFormula = () => {
  editorMode.value = 'create'
  currentFormula.value = undefined
  editorDialogVisible.value = true
}

// 编辑公式
const handleEditFormula = (formula: Formula) => {
  editorMode.value = 'edit'
  currentFormula.value = { ...formula }
  editorDialogVisible.value = true
}

// 查看公式
const handleViewFormula = (formula: Formula) => {
  currentFormula.value = formula
  detailDialogVisible.value = true
}

// 删除公式
const handleDeleteFormula = (formula: Formula) => {
  ElMessageBox.confirm(
    `确定要删除公式 "${formula.id}" 吗？`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    const index = formulas.value.findIndex(f => f.id === formula.id)
    if (index !== -1) {
      formulas.value.splice(index, 1)
      ElMessage.success('删除成功')
    }
  }).catch(() => {
    // 用户取消
  })
}

// 保存公式
const handleSaveFormula = (formula: Formula) => {
  if (editorMode.value === 'create') {
    // 检查是否已存在同名公式
    const exists = formulas.value.some(f => f.id === formula.id)
    if (exists) {
      ElMessage.warning('已存在同名公式，请使用其他名称')
      return
    }
    formulas.value.push(formula)
    ElMessage.success('公式创建成功')
  } else {
    // 编辑模式
    const index = formulas.value.findIndex(f => f.id === currentFormula.value?.id)
    if (index !== -1) {
      formulas.value[index] = formula
      ElMessage.success('公式更新成功')
    }
  }
  
  editorDialogVisible.value = false
  currentFormula.value = undefined
}

// 取消编辑
const handleCancelEdit = () => {
  editorDialogVisible.value = false
  currentFormula.value = undefined
}
</script>

<style scoped>
.formula-config {
  padding: 20px;
}

.page-title {
  font-size: 18px;
  font-weight: 500;
}

.content-wrapper {
  margin-top: 20px;
}

.formula-list-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.empty-state {
  padding: 40px 0;
}
</style>
