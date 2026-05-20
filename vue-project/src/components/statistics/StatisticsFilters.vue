<template>
  <div class="statistics-filters">
    <el-form :model="filters" :rules="rules" ref="filterForm" label-width="100px">
      <el-row :gutter="20">
        <!-- 时间范围 -->
        <el-col :span="12">
          <el-form-item label="时间范围" prop="dateRange">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              @change="handleDateChange"
            />
          </el-form-item>
        </el-col>

        <!-- 审核人员 -->
        <el-col :span="12">
          <el-form-item label="审核人员">
            <el-select
              v-model="filters.auditorId"
              placeholder="请选择审核人员"
              clearable
              filterable
            >
              <el-option
                v-for="auditor in auditors"
                :key="auditor.id"
                :label="auditor.name"
                :value="auditor.id"
              />
            </el-select>
          </el-form-item>
        </el-col>

        <!-- 审核级别 -->
        <el-col :span="12">
          <el-form-item label="审核级别">
            <el-select
              v-model="filters.level"
              placeholder="请选择审核级别"
              clearable
            >
              <el-option label="一级审核" :value="1" />
              <el-option label="二级审核" :value="2" />
              <el-option label="三级审核" :value="3" />
            </el-select>
          </el-form-item>
        </el-col>

        <!-- 样品类型 -->
        <el-col :span="12">
          <el-form-item label="样品类型">
            <el-select
              v-model="filters.sampleType"
              placeholder="请选择样品类型"
              clearable
              filterable
            >
              <el-option
                v-for="type in sampleTypes"
                :key="type"
                :label="type"
                :value="type"
              />
            </el-select>
          </el-form-item>
        </el-col>

        <!-- 审核状态 -->
        <el-col :span="12">
          <el-form-item label="审核状态">
            <el-select
              v-model="filters.status"
              placeholder="请选择审核状态"
              clearable
            >
              <el-option label="待审核" value="PENDING" />
              <el-option label="已通过" value="APPROVED" />
              <el-option label="已退回" value="REJECTED" />
            </el-select>
          </el-form-item>
        </el-col>

        <!-- 操作按钮 -->
        <el-col :span="12">
          <el-form-item>
            <el-button type="primary" @click="handleQuery" :loading="loading">
              <el-icon><Search /></el-icon>
              查询
            </el-button>
            <el-button @click="handleReset">
              <el-icon><Refresh /></el-icon>
              重置
            </el-button>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { StatisticsFilters } from '@/types/statistics'
import http from '@/services/http'

const emit = defineEmits<{
  (e: 'filter-change', filters: StatisticsFilters): void
}>()

const filterForm = ref<FormInstance>()
const loading = ref(false)
const dateRange = ref<[string, string]>()

const filters = reactive<StatisticsFilters>({
  startDate: undefined,
  endDate: undefined,
  auditorId: undefined,
  level: undefined,
  sampleType: undefined,
  status: undefined
})

const auditors = ref<Array<{ id: string; name: string }>>([])
const sampleTypes = ref<string[]>([
  '水质',
  '土壤',
  '空气',
  '食品',
  '其他'
])

// 表单验证规则
const rules: FormRules = {
  dateRange: [
    {
      validator: (rule, value, callback) => {
        if (dateRange.value && dateRange.value.length === 2) {
          const [start, end] = dateRange.value
          if (new Date(start) > new Date(end)) {
            callback(new Error('开始时间不能晚于结束时间'))
          } else {
            callback()
          }
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ]
}

// 处理日期范围变化
const handleDateChange = (value: [string, string] | null) => {
  if (value && value.length === 2) {
    filters.startDate = value[0]
    filters.endDate = value[1]
  } else {
    filters.startDate = undefined
    filters.endDate = undefined
  }
}

// 查询
const handleQuery = async () => {
  if (!filterForm.value) return
  
  await filterForm.value.validate((valid) => {
    if (valid) {
      loading.value = true
      try {
        emit('filter-change', { ...filters })
      } finally {
        loading.value = false
      }
    } else {
      ElMessage.warning('请检查筛选条件')
    }
  })
}

// 重置
const handleReset = () => {
  filterForm.value?.resetFields()
  dateRange.value = undefined
  filters.startDate = undefined
  filters.endDate = undefined
  filters.auditorId = undefined
  filters.level = undefined
  filters.sampleType = undefined
  filters.status = undefined
  
  emit('filter-change', { ...filters })
}

// 加载审核人员列表
const loadAuditors = async () => {
  try {
    const response = await http.get('/users', {
      params: { role: 'auditor' }
    })
    if (response.data && response.data.data) {
      auditors.value = response.data.data.map((user: any) => ({
        id: user.id,
        name: user.fullName || user.username
      }))
    }
  } catch (error) {
    console.error('加载审核人员列表失败:', error)
  }
}

// 初始化
onMounted(() => {
  loadAuditors()
  
  // 默认加载最近30天的数据
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 30)
  
  dateRange.value = [
    startDate.toISOString().slice(0, 10),
    endDate.toISOString().slice(0, 10)
  ]
  handleDateChange(dateRange.value)
  
  // 触发初始查询
  handleQuery()
})
</script>

<style scoped>
.statistics-filters {
  background: #fff;
  padding: 20px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.el-form-item {
  margin-bottom: 16px;
}

.el-date-picker {
  width: 100%;
}

.el-select {
  width: 100%;
}
</style>
