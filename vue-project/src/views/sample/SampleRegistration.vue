<template>
  <div class="sample-registration">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span class="title">{{ isEditMode ? '编辑样品' : '样品登记' }}</span>
          <el-button link @click="handleBack">返回</el-button>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="120px"
        class="registration-form"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="样品名称" prop="name">
              <el-input
                v-model="formData.name"
                placeholder="请输入样品名称"
                clearable
              />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="样品来源" prop="source">
              <el-input
                v-model="formData.source"
                placeholder="请输入样品来源"
                clearable
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="委托方" prop="client">
              <el-input
                v-model="formData.client"
                placeholder="请输入委托方名称"
                clearable
              />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="接收日期" prop="receivedDate">
              <el-date-picker
                v-model="formData.receivedDate"
                type="date"
                placeholder="请选择接收日期"
                style="width: 100%"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="样品类型" prop="sampleType">
              <el-select
                v-model="formData.sampleType"
                placeholder="请选择样品类型"
                style="width: 100%"
                clearable
              >
                <el-option label="水质" value="水质" />
                <el-option label="土壤" value="土壤" />
                <el-option label="空气" value="空气" />
                <el-option label="固废" value="固废" />
                <el-option label="噪声" value="噪声" />
                <el-option label="生物样品" value="生物样品" />
                <el-option label="化学试剂" value="化学试剂" />
                <el-option label="食品" value="食品" />
                <el-option label="药品" value="药品" />
                <el-option label="材料" value="材料" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="样品用途" prop="purpose">
              <el-select
                v-model="formData.purpose"
                placeholder="请选择样品用途"
                style="width: 100%"
                clearable
              >
                <el-option label="检测" value="检测" />
                <el-option label="研发" value="研发" />
                <el-option label="留样" value="留样" />
                <el-option label="对比" value="对比" />
                <el-option label="培训" value="培训" />
                <el-option label="质控" value="质控" />
                <el-option label="备份" value="备份" />
                <el-option label="其他" value="其他" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="样品数量" prop="quantity">
              <el-input-number
                v-model="formData.quantity"
                :min="1"
                :precision="2"
                style="width: 100%"
                placeholder="请输入数量"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="数量单位" prop="unit">
              <el-select
                v-model="formData.unit"
                placeholder="请选择单位"
                style="width: 100%"
                clearable
              >
                <el-option label="ml (毫升)" value="ml" />
                <el-option label="L (升)" value="L" />
                <el-option label="g (克)" value="g" />
                <el-option label="kg (千克)" value="kg" />
                <el-option label="个" value="个" />
                <el-option label="份" value="份" />
              </el-select>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="当前位置" prop="currentLocation">
              <el-input
                v-model="formData.currentLocation"
                placeholder="请输入存放位置"
                clearable
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="样品描述" prop="description">
              <el-input
                v-model="formData.description"
                type="textarea"
                :rows="4"
                placeholder="请输入样品描述信息（选填）"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">保存条件（选填）</el-divider>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="温度要求">
              <el-input-number
                v-model="formData.temperature"
                :precision="1"
                style="width: 100%"
                placeholder="请输入温度（℃）"
              />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="湿度要求">
              <el-input-number
                v-model="formData.humidity"
                :min="0"
                :max="100"
                :precision="1"
                style="width: 100%"
                placeholder="请输入湿度（%）"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="特殊要求">
              <el-input
                v-model="formData.specialRequirements"
                type="textarea"
                :rows="2"
                placeholder="请输入特殊保存要求（选填）"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item>
          <el-button type="primary" @click="handleSubmit">
            {{ isEditMode ? '保存修改' : '提交登记' }}
          </el-button>
          <el-button @click="handleCancel">取消</el-button>
          <el-button v-if="!isEditMode" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 条码显示区域 -->
      <div v-if="generatedBarcode" class="barcode-section">
        <el-divider content-position="left">生成的条码</el-divider>
        <BarcodeDisplay :barcode="generatedBarcode" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import BarcodeDisplay from '@/components/BarcodeDisplay.vue'
import type { Sample } from '@/types'
import { useSampleStore } from '@/stores/sample'

const router = useRouter()
const route = useRoute()
const sampleStore = useSampleStore()

// 表单引用
const formRef = ref<FormInstance>()

// 是否为编辑模式
const isEditMode = ref(false)
const sampleId = ref<string>('')

// 表单数据
const formData = reactive({
  name: '',
  source: '',
  client: '',
  receivedDate: '',
  sampleType: '',
  purpose: '',  // 新增：样品用途
  quantity: 1,  // 默认值改为 1，避免后端验证错误
  unit: '',
  currentLocation: '',
  description: '',
  temperature: undefined as number | undefined,
  humidity: undefined as number | undefined,
  specialRequirements: ''
})

// 表单验证规则
const rules: FormRules = {
  name: [
    { required: true, message: '请输入样品名称', trigger: 'blur' },
    { min: 2, max: 100, message: '长度在 2 到 100 个字符', trigger: 'blur' }
  ],
  source: [
    { required: true, message: '请输入样品来源', trigger: 'blur' },
    { min: 2, max: 100, message: '长度在 2 到 100 个字符', trigger: 'blur' }
  ],
  client: [
    { required: true, message: '请输入委托方名称', trigger: 'blur' },
    { min: 2, max: 100, message: '长度在 2 到 100 个字符', trigger: 'blur' }
  ],
  receivedDate: [
    { required: true, message: '请选择接收日期', trigger: 'change' }
  ],
  sampleType: [
    { required: true, message: '请选择样品类型', trigger: 'change' }
  ],
  purpose: [
    { required: true, message: '请选择样品用途', trigger: 'change' }
  ],
  quantity: [
    { required: true, message: '请输入样品数量', trigger: 'blur' },
    { type: 'number', min: 1, message: '数量必须大于0', trigger: 'blur' }
  ],
  unit: [
    { required: true, message: '请选择数量单位', trigger: 'change' }
  ],
  currentLocation: [
    { required: true, message: '请输入当前位置', trigger: 'blur' }
  ]
}

// 提交状态
const submitting = ref(false)

// 生成的条码
const generatedBarcode = ref('')

// 生成条码（模拟）
const generateBarcode = (): string => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `S${year}${month}${day}${random}`
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    // 验证表单
    await formRef.value.validate()

    if (isEditMode.value) {
      // 编辑模式 - 调用真实API
      console.log('💾 开始更新样品，ID:', sampleId.value)
      console.log('📝 更新数据:', {
        id: sampleId.value,
        clientName: formData.client,
        sampleName: formData.name,
        quantity: formData.quantity
      })
      
      // 将日期转换为 YYYY-MM-DD 格式的字符串
      const formatDate = (date: string | Date) => {
        if (!date) return undefined
        const d = typeof date === 'string' ? new Date(date) : date
        return d.toISOString().split('T')[0]
      }
      
      await sampleStore.updateSample({
        id: sampleId.value,
        clientName: formData.client,
        sampleName: formData.name,
        sampleType: formData.sampleType,
        quantity: formData.quantity,
        unit: formData.unit,
        receivedDate: formatDate(formData.receivedDate),
        storageLocation: formData.currentLocation,
        storageCondition: formData.temperature || formData.humidity || formData.specialRequirements 
          ? JSON.stringify({
              temperature: formData.temperature,
              humidity: formData.humidity,
              specialRequirements: formData.specialRequirements
            })
          : undefined,
        description: formData.description
      })
      
      console.log('✅ 样品更新成功')
      ElMessage.success('样品信息更新成功')
      
      // 跳转回详情页面并触发刷新
      const targetPath = `/sample/detail/${sampleId.value}`
      const targetQuery = { refresh: 'true' }
      console.log('🔄 准备跳转回详情页:', { path: targetPath, query: targetQuery })
      
      router.push({
        path: targetPath,
        query: targetQuery
      })
      
      console.log('✅ 路由跳转已触发')
    } else {
      // 新建模式 - 调用真实API
      console.log('开始创建样品，表单数据:', formData)
      
      // 将日期转换为 YYYY-MM-DD 格式的字符串
      const formatDate = (date: string | Date) => {
        if (!date) return undefined
        const d = typeof date === 'string' ? new Date(date) : date
        return d.toISOString().split('T')[0]
      }
      
      const createdSample = await sampleStore.createSample({
        clientName: formData.client,
        clientContact: '', // 可以添加联系方式字段
        sampleName: formData.name,
        sampleType: formData.sampleType,
        sampleCategory: formData.source, // 使用来源作为类别
        quantity: formData.quantity,
        unit: formData.unit,
        receivedDate: formatDate(formData.receivedDate),
        samplingDate: formatDate(formData.receivedDate), // 默认使用接收日期
        samplingLocation: formData.source,
        storageLocation: formData.currentLocation,
        storageCondition: formData.temperature || formData.humidity || formData.specialRequirements 
          ? JSON.stringify({
              temperature: formData.temperature,
              humidity: formData.humidity,
              specialRequirements: formData.specialRequirements
            })
          : undefined,
        priority: 'NORMAL',
        description: formData.description,
        remarks: formData.purpose ? `用途：${formData.purpose}` : undefined  // 将用途存储在备注中
      })

      console.log('样品创建成功:', createdSample)

      ElMessage.success(`样品登记成功！条码：${createdSample.barcode}`)

      // 立即跳转到列表页（按用户要求）
      router.push('/sample/list')
    }
  } catch (error: any) {
    console.error('提交失败:', error)
    ElMessage.error(error.message || '操作失败，请重试')
  }
}

// 取消
const handleCancel = () => {
  router.push('/sample/list')
}

// 重置表单
const handleReset = () => {
  formRef.value?.resetFields()
  generatedBarcode.value = ''
}

// 返回
const handleBack = () => {
  router.push('/sample/list')
}

// 加载样品数据（编辑模式）
const loadSampleData = async (id: string) => {
  try {
    // 从store获取样品数据
    const sample = await sampleStore.fetchSampleById(id)
    
    if (sample) {
      // 填充表单
      formData.name = sample.sampleName
      formData.source = sample.sampleCategory
      formData.client = sample.clientName
      formData.receivedDate = new Date(sample.receivedDate).toISOString().split('T')[0]
      formData.sampleType = sample.sampleType
      formData.quantity = sample.quantity
      formData.unit = sample.unit
      formData.currentLocation = sample.storageLocation
      
      // 解析存储条件
      if (sample.storageCondition) {
        try {
          // 尝试解析 JSON 格式的存储条件
          const conditions = JSON.parse(sample.storageCondition)
          formData.temperature = conditions.temperature
          formData.humidity = conditions.humidity
          formData.specialRequirements = conditions.specialRequirements || ''
        } catch (e) {
          // 如果不是 JSON 格式，说明是纯文本，直接作为特殊要求
          console.log('存储条件为纯文本格式:', sample.storageCondition)
          formData.specialRequirements = sample.storageCondition
        }
      }
      
      formData.description = sample.description || ''
    }
  } catch (error) {
    ElMessage.error('加载样品数据失败')
    console.error(error)
  }
}

// 组件挂载时检查是否为编辑模式
onMounted(() => {
  const id = route.query.id as string
  if (id) {
    isEditMode.value = true
    sampleId.value = id
    loadSampleData(id)
  }
})
</script>

<style scoped>
.sample-registration {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 18px;
  font-weight: 600;
}

.registration-form {
  margin-top: 20px;
}

.barcode-section {
  margin-top: 30px;
  padding-top: 20px;
}

:deep(.el-card__body) {
  padding: 20px;
}

:deep(.el-form-item) {
  margin-bottom: 22px;
}

:deep(.el-divider__text) {
  font-weight: 600;
  color: #606266;
}
</style>
