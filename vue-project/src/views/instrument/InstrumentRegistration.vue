<template>
  <div class="instrument-registration">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>{{ isEditMode ? '编辑仪器' : '新建仪器' }}</span>
          <el-button link @click="handleBack">返回列表</el-button>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="120px"
        @submit.prevent="handleSubmit"
      >
        <!-- 加载示例数据按钮（仅新建模式显示） -->
        <el-row v-if="!isEditMode" style="margin-bottom: 20px">
          <el-col :span="24">
            <el-button
              type="info"
              plain
              :icon="DocumentCopy"
              @click="loadSampleData"
            >
              加载示例数据
            </el-button>
            <span style="margin-left: 10px; color: #909399; font-size: 14px">
              点击可快速填充示例仪器信息
            </span>
          </el-col>
        </el-row>

        <!-- 基本信息 -->
        <el-divider content-position="left">基本信息</el-divider>
        
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12">
            <el-form-item label="仪器编码" prop="code">
              <el-input
                v-model="formData.code"
                placeholder="请输入仪器编码"
                :disabled="isEditMode"
              />
            </el-form-item>
          </el-col>
          
          <el-col :xs="24" :sm="12">
            <el-form-item label="仪器名称" prop="name">
              <el-input
                v-model="formData.name"
                placeholder="请输入仪器名称"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :xs="24" :sm="12">
            <el-form-item label="型号" prop="model">
              <el-input
                v-model="formData.model"
                placeholder="请输入型号"
              />
            </el-form-item>
          </el-col>
          
          <el-col :xs="24" :sm="12">
            <el-form-item label="制造商" prop="manufacturer">
              <el-input
                v-model="formData.manufacturer"
                placeholder="请输入制造商"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :xs="24" :sm="12">
            <el-form-item label="序列号" prop="serialNumber">
              <el-input
                v-model="formData.serialNumber"
                placeholder="请输入序列号"
              />
            </el-form-item>
          </el-col>
          
          <el-col :xs="24" :sm="12">
            <el-form-item label="状态" prop="status">
              <el-select
                v-model="formData.status"
                placeholder="请选择状态"
                style="width: 100%"
              >
                <el-option
                  v-for="(label, value) in InstrumentStatusLabels"
                  :key="value"
                  :label="label"
                  :value="value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 购置信息 -->
        <el-divider content-position="left">购置信息</el-divider>
        
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12">
            <el-form-item label="购置日期" prop="purchaseDate">
              <el-date-picker
                v-model="formData.purchaseDate"
                type="date"
                placeholder="请选择购置日期"
                style="width: 100%"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          
          <el-col :xs="24" :sm="12">
            <el-form-item label="购置价格" prop="purchasePrice">
              <el-input
                v-model.number="formData.purchasePrice"
                type="number"
                placeholder="请输入购置价格"
              >
                <template #append>元</template>
              </el-input>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :xs="24" :sm="12">
            <el-form-item label="保修到期日期" prop="warrantyExpiry">
              <el-date-picker
                v-model="formData.warrantyExpiry"
                type="date"
                placeholder="请选择保修到期日期"
                style="width: 100%"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </el-col>
          
          <el-col :xs="24" :sm="12">
            <el-form-item label="使用年限" prop="usageYears">
              <el-input
                v-model.number="formData.usageYears"
                type="number"
                placeholder="请输入使用年限"
              >
                <template #append>年</template>
              </el-input>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 技术参数 -->
        <el-divider content-position="left">技术参数</el-divider>
        
        <el-form-item label="技术参数">
          <div class="technical-params">
            <el-button
              type="primary"
              size="small"
              :icon="Plus"
              @click="addTechnicalParam"
            >
              添加参数
            </el-button>
            
            <div v-for="(param, index) in technicalParams" :key="index" class="param-item">
              <el-input
                v-model="param.key"
                placeholder="参数名称"
                style="width: 200px; margin-right: 10px"
              />
              <el-input
                v-model="param.value"
                placeholder="参数值"
                style="width: 300px; margin-right: 10px"
              />
              <el-button
                type="danger"
                size="small"
                :icon="Delete"
                @click="removeTechnicalParam(index)"
              >
                删除
              </el-button>
            </div>
          </div>
        </el-form-item>

        <!-- 使用信息 -->
        <el-divider content-position="left">使用信息</el-divider>
        
        <el-row :gutter="20">
          <el-col :xs="24" :sm="12">
            <el-form-item label="当前位置" prop="currentLocation">
              <el-input
                v-model="formData.currentLocation"
                placeholder="请输入当前位置"
              />
            </el-form-item>
          </el-col>
          
          <el-col :xs="24" :sm="12">
            <el-form-item label="所属部门" prop="currentDepartment">
              <el-input
                v-model="formData.currentDepartment"
                placeholder="请输入所属部门"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :xs="24" :sm="12">
            <el-form-item label="负责人" prop="currentResponsible">
              <el-input
                v-model="formData.currentResponsible"
                placeholder="请输入负责人"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 描述信息 -->
        <el-divider content-position="left">描述信息</el-divider>
        
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入描述"
          />
        </el-form-item>

        <el-form-item label="备注" prop="remarks">
          <el-input
            v-model="formData.remarks"
            type="textarea"
            :rows="3"
            placeholder="请输入备注"
          />
        </el-form-item>

        <!-- 文档上传 -->
        <el-divider content-position="left">相关文档</el-divider>
        
        <el-form-item label="文档上传">
          <DocumentUpload
            v-if="isEditMode && instrumentId"
            :instrument-id="instrumentId"
            @uploaded="handleDocumentUploaded"
          />
          <el-alert
            v-else
            type="info"
            :closable="false"
            show-icon
          >
            请先保存仪器信息后再上传文档
          </el-alert>
        </el-form-item>

        <!-- 操作按钮 -->
        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">
            {{ isEditMode ? '保存' : '创建' }}
          </el-button>
          <el-button @click="handleBack">
            取消
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Delete, DocumentCopy } from '@element-plus/icons-vue'
import { useInstrumentStore } from '@/stores/instrument'
import {
  InstrumentStatus,
  InstrumentStatusLabels,
  type CreateInstrumentDto,
  type UpdateInstrumentDto
} from '@/types/instrument'
import DocumentUpload from '@/components/instrument/DocumentUpload.vue'

const router = useRouter()
const route = useRoute()
const instrumentStore = useInstrumentStore()

// 表单引用
const formRef = ref<FormInstance>()

// 是否编辑模式
const isEditMode = computed(() => !!route.query.id)

// 仪器ID
const instrumentId = computed(() => route.query.id as string)

// 提交状态
const submitting = ref(false)

// 表单数据
const formData = reactive<CreateInstrumentDto | UpdateInstrumentDto>({
  code: '',
  name: '',
  model: '',
  manufacturer: '',
  serialNumber: '',
  purchaseDate: undefined,
  purchasePrice: undefined,
  status: InstrumentStatus.IN_USE,
  currentLocation: '',
  currentDepartment: '',
  currentResponsible: '',
  usageYears: undefined,
  warrantyExpiry: undefined,
  description: '',
  remarks: '',
  technicalParams: {}
})

// 技术参数列表
const technicalParams = ref<Array<{ key: string; value: string }>>([])

// 表单验证规则
const formRules: FormRules = {
  code: [
    { required: true, message: '请输入仪器编码', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入仪器名称', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ]
}

// 添加技术参数
const addTechnicalParam = () => {
  technicalParams.value.push({ key: '', value: '' })
}

// 删除技术参数
const removeTechnicalParam = (index: number) => {
  technicalParams.value.splice(index, 1)
}

// 转换技术参数为对象
const convertTechnicalParams = () => {
  const params: Record<string, any> = {}
  technicalParams.value.forEach(param => {
    if (param.key && param.value) {
      params[param.key] = param.value
    }
  })
  return Object.keys(params).length > 0 ? params : undefined
}

// 从对象转换技术参数
const loadTechnicalParams = (params?: Record<string, any>) => {
  if (params) {
    technicalParams.value = Object.entries(params).map(([key, value]) => ({
      key,
      value: String(value)
    }))
  }
}

// 加载仪器数据
const loadInstrument = async () => {
  if (!instrumentId.value) return

  try {
    const instrument = await instrumentStore.fetchInstrumentById(instrumentId.value)
    
    // 填充表单数据
    Object.assign(formData, {
      name: instrument.name,
      model: instrument.model,
      manufacturer: instrument.manufacturer,
      serialNumber: instrument.serialNumber,
      purchaseDate: instrument.purchaseDate,
      purchasePrice: instrument.purchasePrice,
      status: instrument.status,
      currentLocation: instrument.currentLocation,
      currentDepartment: instrument.currentDepartment,
      currentResponsible: instrument.currentResponsible,
      usageYears: instrument.usageYears,
      warrantyExpiry: instrument.warrantyExpiry,
      description: instrument.description,
      remarks: instrument.remarks
    })
    
    // 加载技术参数
    loadTechnicalParams(instrument.technicalParams)
  } catch (error: any) {
    ElMessage.error(error.message || '加载仪器信息失败')
    handleBack()
  }
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    
    submitting.value = true
    
    // 转换技术参数
    formData.technicalParams = convertTechnicalParams()
    
    if (isEditMode.value) {
      // 更新仪器
      await instrumentStore.updateInstrument(instrumentId.value, formData as UpdateInstrumentDto)
      ElMessage.success('更新成功')
    } else {
      // 创建仪器
      const instrument = await instrumentStore.createInstrument(formData as CreateInstrumentDto)
      ElMessage.success('创建成功')
      
      // 跳转到详情页
      router.push(`/instrument/detail/${instrument.id}`)
      return
    }
    
    handleBack()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败')
    }
  } finally {
    submitting.value = false
  }
}

// 返回列表
const handleBack = () => {
  router.push('/instrument/management')
}

// 文档上传成功
const handleDocumentUploaded = () => {
  ElMessage.success('文档上传成功')
}

// 加载示例数据
const loadSampleData = () => {
  // 生成当前年份的仪器编码
  const currentYear = new Date().getFullYear()
  const randomNum = Math.floor(Math.random() * 900) + 100
  
  // 填充基本信息
  formData.code = `INS-${currentYear}-${randomNum}`
  formData.name = '高效液相色谱仪'
  formData.model = 'LC-2030C Plus'
  formData.manufacturer = '岛津（Shimadzu）'
  formData.serialNumber = `C${currentYear}${randomNum}001`
  formData.status = InstrumentStatus.IN_USE
  
  // 填充购置信息
  const purchaseDate = new Date()
  purchaseDate.setMonth(purchaseDate.getMonth() - 3) // 3个月前购置
  formData.purchaseDate = purchaseDate.toISOString().split('T')[0]
  formData.purchasePrice = 380000
  
  const warrantyDate = new Date()
  warrantyDate.setFullYear(warrantyDate.getFullYear() + 3) // 3年保修
  formData.warrantyExpiry = warrantyDate.toISOString().split('T')[0]
  formData.usageYears = 10
  
  // 填充技术参数
  technicalParams.value = [
    { key: '波长范围', value: '190-800nm' },
    { key: '波长精度', value: '±0.3nm' },
    { key: '波长重复性', value: '±0.1nm' },
    { key: '基线噪声', value: '±0.5×10⁻⁵AU' },
    { key: '基线漂移', value: '±1.0×10⁻⁴AU/h' },
    { key: '流速范围', value: '0.001-10.000mL/min' },
    { key: '流速精度', value: '±1.0%' },
    { key: '最大压力', value: '40MPa' }
  ]
  
  // 填充使用信息
  formData.currentLocation = '理化检测室A-201'
  formData.currentDepartment = '理化检测部'
  formData.currentResponsible = '张三'
  
  // 填充描述信息
  formData.description = '用于水质、食品、药品等样品中有机物和无机离子的定性定量分析。配备紫外检测器（UV-VIS）和自动进样器，可实现高通量样品检测。'
  formData.remarks = '新购设备，已完成安装调试和性能验证，可正常投入使用。'
  
  ElMessage.success('示例数据已加载')
}

// 组件挂载时加载数据
onMounted(() => {
  if (isEditMode.value) {
    loadInstrument()
  }
})
</script>

<style scoped>
.instrument-registration {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.technical-params {
  width: 100%;
}

.param-item {
  margin-top: 10px;
  display: flex;
  align-items: center;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .instrument-registration {
    padding: 10px;
  }

  .param-item {
    flex-direction: column;
    align-items: stretch;
  }

  .param-item .el-input {
    width: 100% !important;
    margin-right: 0 !important;
    margin-bottom: 10px;
  }

  .param-item .el-button {
    width: 100%;
  }
}
</style>
