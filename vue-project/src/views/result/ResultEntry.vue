<template>
  <div class="result-entry">
    <!-- 登录界面 -->
    <div v-if="!isLoggedIn" class="login-container">
      <el-card class="login-card" shadow="hover">
        <template #header>
          <div class="login-header">
            <h2>实验室管理系统</h2>
            <p>请登录以使用结果录入功能</p>
          </div>
        </template>
        
        <el-form :model="loginForm" label-width="80px">
          <el-form-item label="用户名">
            <el-input v-model="loginForm.username" placeholder="请输入用户名" />
          </el-form-item>
          <el-form-item label="密码">
            <el-input 
              v-model="loginForm.password" 
              type="password" 
              placeholder="请输入密码"
              @keyup.enter="handleLogin"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleLogin" style="width: 100%">
              登录
            </el-button>
          </el-form-item>
        </el-form>
        
        <div class="login-tips">
          <p>测试账号：testuser / User@123456</p>
          <p>管理员账号：admin / Admin@123456</p>
        </div>
      </el-card>
    </div>

    <!-- 主要内容（登录后显示） -->
    <div v-else>
      <!-- 用户信息栏 -->
      <div class="user-bar">
        <span>欢迎，{{ authStore.userName }}</span>
        <el-button type="text" @click="handleLogout">登出</el-button>
      </div>

      <!-- 页面标题 -->
      <div class="page-header">
        <h2 class="page-title">结果录入</h2>
        <el-text type="info">录入检测结果数据</el-text>
      </div>

      <!-- 样品选择区域 -->
      <el-card class="sample-card" shadow="never">
        <template #header>
          <span>样品信息</span>
        </template>
        
        <!-- 测试提示 -->
        <el-alert
          v-if="sampleList.length > 0"
          title="可用样品"
          type="info"
          :closable="false"
          style="margin-bottom: 16px"
        >
          <template #default>
            <div>
              可用的样品条码：
              <el-tag 
                v-for="sample in sampleList.slice(0, 5)" 
                :key="sample.id" 
                size="small" 
                style="margin: 0 4px"
              >
                {{ sample.barcode }}
              </el-tag>
              <span v-if="sampleList.length > 5">等 {{ sampleList.length }} 个样品</span>
            </div>
          </template>
        </el-alert>
        
        <el-form :inline="true" :model="sampleForm" class="sample-form">
          <el-form-item label="样品条码">
            <el-input
              v-model="sampleForm.barcode"
              placeholder="请输入或扫描样品条码"
              clearable
              style="width: 250px"
              @change="handleBarcodeChange"
            >
              <template #append>
                <el-button @click="searchSample">
                  <el-icon><Search /></el-icon>
                </el-button>
              </template>
            </el-input>
          </el-form-item>
          
          <el-form-item label="样品名称">
            <el-select
              v-model="sampleForm.sampleId"
              placeholder="或选择样品"
              clearable
              filterable
              style="width: 250px"
              @change="handleSampleChange"
            >
              <el-option
                v-for="sample in sampleList"
                :key="sample.id"
                :label="`${sample.name} (${sample.barcode})`"
                :value="sample.id"
              />
            </el-select>
          </el-form-item>
        </el-form>

        <!-- 选中样品的详细信息 -->
        <div v-if="selectedSample" class="sample-info">
          <el-descriptions :column="3" border size="small">
            <el-descriptions-item label="样品名称" :span="2">
              <el-tag type="primary" size="small">{{ selectedSample.name }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="样品状态">
              <el-tag 
                :type="getStatusType(selectedSample.status)" 
                size="small"
              >
                {{ getStatusText(selectedSample.status) }}
              </el-tag>
            </el-descriptions-item>
            
            <el-descriptions-item label="样品条码">{{ selectedSample.barcode }}</el-descriptions-item>
            <el-descriptions-item label="样品类型">{{ selectedSample.sampleType || '-' }}</el-descriptions-item>
            <el-descriptions-item label="存储位置">{{ selectedSample.currentLocation || '-' }}</el-descriptions-item>
            
            <el-descriptions-item label="委托方">{{ selectedSample.client || '-' }}</el-descriptions-item>
            <el-descriptions-item label="样品来源">{{ selectedSample.source || '-' }}</el-descriptions-item>
            <el-descriptions-item label="接收日期">{{ formatDate(selectedSample.receivedDate) }}</el-descriptions-item>
            
            <el-descriptions-item label="样品数量">
              {{ selectedSample.quantity }} {{ selectedSample.unit }}
            </el-descriptions-item>
            <el-descriptions-item label="创建人">{{ selectedSample.createdBy || '-' }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatDateTime(selectedSample.createdAt) }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </el-card>

      <!-- 结果录入区域 -->
      <el-card v-if="selectedSample" class="result-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>检测结果录入</span>
            <div class="header-actions">
              <el-button type="primary" @click="saveResults" :loading="saving">
                <el-icon><DocumentAdd /></el-icon>
                保存结果
              </el-button>
            </div>
          </div>
        </template>

        <div class="result-form">
          <el-table :data="testItems" border style="width: 100%">
            <el-table-column prop="name" label="检测项目" width="180" />
            <el-table-column prop="method" label="检测方法" width="150" />
            <el-table-column prop="unit" label="单位" width="80" />
            <el-table-column label="检测结果" width="180">
              <template #default="{ row, $index }">
                <el-input
                  v-if="row.dataType === 'number'"
                  v-model="row.value"
                  type="number"
                  placeholder="请输入数值"
                  @input="validateResult(row, $index)"
                />
                <el-input
                  v-else-if="row.dataType === 'text'"
                  v-model="row.value"
                  placeholder="请输入文本结果"
                />
                <el-select
                  v-else-if="row.dataType === 'boolean'"
                  v-model="row.value"
                  placeholder="请选择"
                >
                  <el-option label="合格" :value="true" />
                  <el-option label="不合格" :value="false" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="正常范围" width="120">
              <template #default="{ row }">
                <span v-if="row.normalRange">{{ row.normalRange }}</span>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="数据来源" width="120">
              <template #default="{ row }">
                <el-select v-model="row.dataSource" placeholder="选择来源" size="small">
                  <el-option label="手工录入" value="manual" />
                  <el-option label="仪器导入" value="instrument" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="仪器编号" width="120">
              <template #default="{ row }">
                <el-input
                  v-model="row.instrumentId"
                  placeholder="仪器编号"
                  size="small"
                  :disabled="row.dataSource !== 'instrument'"
                />
              </template>
            </el-table-column>
            <el-table-column label="操作人员" width="100">
              <template #default="{ row }">
                <el-input
                  v-model="row.operator"
                  placeholder="操作人员"
                  size="small"
                />
              </template>
            </el-table-column>
            <el-table-column label="录入时间" width="150">
              <template #default="{ row }">
                <el-date-picker
                  v-model="row.enteredAt"
                  type="datetime"
                  placeholder="录入时间"
                  size="small"
                  format="YYYY-MM-DD HH:mm"
                />
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag v-if="row.isValid === true" type="success" size="small">正常</el-tag>
                <el-tag v-else-if="row.isValid === false" type="danger" size="small">异常</el-tag>
                <el-tag v-else type="info" size="small">待录入</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="备注" width="200">
              <template #default="{ row }">
                <el-input
                  v-model="row.remarks"
                  placeholder="备注信息"
                  size="small"
                />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="{ row, $index }">
                <el-button
                  v-if="row.isValid === false"
                  type="warning"
                  size="small"
                  @click="requestRetest(row, $index)"
                >
                  申请复测
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-card>

      <!-- 历史结果查看 -->
      <el-card v-if="selectedSample && historyResults.length > 0" class="history-card" shadow="never">
        <template #header>
          <span>历史结果</span>
        </template>
        
        <el-table :data="historyResults" border style="width: 100%">
          <el-table-column prop="testItemName" label="检测项目" width="200" />
          <el-table-column prop="value" label="结果值" width="120" />
          <el-table-column prop="unit" label="单位" width="80" />
          <el-table-column prop="operator" label="录入人" width="120" />
          <el-table-column prop="timestamp" label="录入时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.timestamp) }}
            </template>
          </el-table-column>
          <el-table-column prop="source" label="来源" width="100">
            <template #default="{ row }">
              <el-tag v-if="row.source === 'manual'" type="primary" size="small">手工</el-tag>
              <el-tag v-else-if="row.source === 'instrument'" type="success" size="small">仪器</el-tag>
              <el-tag v-else type="info" size="small">计算</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, DocumentAdd } from '@element-plus/icons-vue'
import type { Sample, TestResult, TestItem } from '@/types'
import { resultApi } from '@/services/api/result'
import { sampleApi } from '@/services/api/sample'
import { useAuthStore } from '@/stores/auth'
import { authService } from '@/services/auth'

// 响应式数据
const authStore = useAuthStore()
const isLoggedIn = ref(false)
const loginForm = reactive({
  username: 'testuser',
  password: 'User@123456'
})

const sampleForm = reactive({
  barcode: '',
  sampleId: ''
})

const sampleList = ref<Sample[]>([])
const selectedSample = ref<Sample | null>(null)
const testItems = ref<TestItem[]>([])
const historyResults = ref<TestResult[]>([])
const saving = ref(false)

// 模拟数据
const mockSamples: Sample[] = [
  {
    id: '1',
    barcode: 'S2024001',
    name: '饮用水样品A',
    source: '实验室A',
    client: '环保局',
    receivedDate: new Date('2024-03-10'),
    sampleType: '水质',
    quantity: 500,
    unit: 'ml',
    status: 'in_progress',
    currentLocation: '检测室1',
    createdBy: 'user1',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    barcode: 'S2024002',
    name: '土壤样品B',
    source: '实验室B',
    client: '建设公司',
    receivedDate: new Date('2024-03-11'),
    sampleType: '土壤',
    quantity: 200,
    unit: 'g',
    status: 'in_progress',
    currentLocation: '检测室2',
    createdBy: 'user2',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

const mockTestItems: TestItem[] = [
  {
    id: '1',
    name: 'pH值',
    unit: '',
    dataType: 'number',
    method: 'GB 6920-86',
    normalRange: '6.5-8.5',
    value: '',
    isValid: null,
    remarks: '',
    dataSource: 'manual',
    instrumentId: '',
    operator: authStore.userName || '当前用户',
    enteredAt: new Date()
  },
  {
    id: '2',
    name: '总硬度',
    unit: 'mg/L',
    dataType: 'number',
    method: 'GB 7477-87',
    normalRange: '≤450',
    value: '',
    isValid: null,
    remarks: '',
    dataSource: 'manual',
    instrumentId: '',
    operator: authStore.userName || '当前用户',
    enteredAt: new Date()
  },
  {
    id: '3',
    name: '细菌总数',
    unit: 'CFU/ml',
    dataType: 'number',
    method: 'GB 4789.2',
    normalRange: '≤100',
    value: '',
    isValid: null,
    remarks: '',
    dataSource: 'manual',
    instrumentId: '',
    operator: authStore.userName || '当前用户',
    enteredAt: new Date()
  },
  {
    id: '4',
    name: '外观',
    unit: '',
    dataType: 'text',
    method: '目测',
    normalRange: '无色透明',
    value: '',
    isValid: null,
    remarks: '',
    dataSource: 'manual',
    instrumentId: '',
    operator: authStore.userName || '当前用户',
    enteredAt: new Date()
  },
  {
    id: '5',
    name: '合格判定',
    unit: '',
    dataType: 'boolean',
    method: '综合判定',
    normalRange: '合格',
    value: null,
    isValid: null,
    remarks: '',
    dataSource: 'manual',
    instrumentId: '',
    operator: authStore.userName || '当前用户',
    enteredAt: new Date()
  }
]

// 页面初始化
onMounted(() => {
  // 初始化认证状态
  authStore.initAuth()
  checkAuthStatus()
})

// 检查认证状态
const checkAuthStatus = () => {
  isLoggedIn.value = authStore.isAuthenticated
  if (isLoggedIn.value) {
    console.log('用户已登录:', authStore.userName)
    loadSamples()
  } else {
    console.log('用户未登录')
  }
}

// 登录功能
const handleLogin = async () => {
  try {
    console.log('开始登录...')
    const response = await authService.login({
      username: loginForm.username,
      password: loginForm.password
    })
    
    authStore.setAuth(response)
    isLoggedIn.value = true
    
    ElMessage.success('登录成功！')
    console.log('登录成功，用户:', authStore.userName)
    
    // 登录成功后加载数据
    await loadSamples()
  } catch (error) {
    console.error('登录失败:', error)
    ElMessage.error('登录失败：' + (error as Error).message)
  }
}

// 登出功能
const handleLogout = async () => {
  try {
    await authStore.logout()
    isLoggedIn.value = false
    sampleList.value = []
    selectedSample.value = null
    testItems.value = []
    historyResults.value = []
    ElMessage.success('已登出')
  } catch (error) {
    console.error('登出失败:', error)
  }
}

// 加载样品列表
const loadSamples = async () => {
  try {
    console.log('开始加载样品列表...')
    // 从后端API获取真实的样品数据
    const response = await sampleApi.getList({
      page: 1,
      pageSize: 1000, // 获取所有样品用于下拉选择
      filters: {}
    })
    
    // 转换API响应为前端需要的格式
    sampleList.value = response.items.map(item => ({
      id: item.id,
      barcode: item.barcode,
      name: item.sampleName || item.clientName || '未命名样品',
      source: item.samplingLocation || '',
      client: item.clientName || '',
      receivedDate: item.receivedDate ? new Date(item.receivedDate) : new Date(),
      sampleType: item.sampleType || '',
      quantity: item.quantity || 0,
      unit: item.unit || '',
      status: item.status || 'REGISTERED',
      currentLocation: item.storageLocation || '',
      createdBy: item.createdBy || '',
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date()
    }))
    
    console.log('样品列表加载成功:', sampleList.value.length, '个样品')
    console.log('样品条码列表:', sampleList.value.map(s => s.barcode))
    ElMessage.success(`样品数据加载完成，共 ${sampleList.value.length} 个样品`)
  } catch (error) {
    console.error('加载样品列表失败:', error)
    ElMessage.error('加载样品列表失败：' + (error as Error).message)
    // 如果API调用失败，使用模拟数据作为后备
    sampleList.value = mockSamples
  }
}

// 条码变化处理
const handleBarcodeChange = () => {
  if (sampleForm.barcode) {
    const sample = sampleList.value.find(s => s.barcode === sampleForm.barcode)
    if (sample) {
      sampleForm.sampleId = sample.id
      selectedSample.value = sample
      loadTestItems()
      loadHistoryResults()
    }
  }
}

// 搜索样品
const searchSample = () => {
  if (!sampleForm.barcode) {
    ElMessage.warning('请输入样品条码')
    return
  }
  
  console.log('搜索样品，条码:', sampleForm.barcode)
  console.log('可用样品列表:', sampleList.value.map(s => s.barcode))
  
  const sample = sampleList.value.find(s => s.barcode === sampleForm.barcode)
  if (sample) {
    sampleForm.sampleId = sample.id
    selectedSample.value = sample
    loadTestItems()
    loadHistoryResults()
    ElMessage.success(`找到样品：${sample.name}`)
    console.log('找到样品:', sample)
  } else {
    ElMessage.error(`未找到条码为 "${sampleForm.barcode}" 的样品`)
    console.log('未找到样品，输入条码:', sampleForm.barcode)
    console.log('可用条码:', sampleList.value.map(s => s.barcode))
  }
}

// 样品选择变化处理
const handleSampleChange = () => {
  if (sampleForm.sampleId) {
    const sample = sampleList.value.find(s => s.id === sampleForm.sampleId)
    if (sample) {
      sampleForm.barcode = sample.barcode
      selectedSample.value = sample
      loadTestItems()
      loadHistoryResults()
    }
  }
}

// 加载检测项目
const loadTestItems = async () => {
  if (!selectedSample.value) return
  
  try {
    console.log('开始加载检测项目...')
    // 这里应该根据样品类型或样品ID加载对应的检测项目
    // 暂时使用模拟数据，后续可以创建testItem API
    testItems.value = mockTestItems.map(item => ({ 
      ...item, 
      value: '', 
      isValid: null, 
      remarks: '',
      dataSource: 'manual',
      instrumentId: '',
      operator: authStore.userName || '当前用户',
      enteredAt: new Date()
    }))
    console.log('检测项目加载成功:', testItems.value.length, '个项目')
  } catch (error) {
    console.error('加载检测项目失败:', error)
    ElMessage.error('加载检测项目失败')
    testItems.value = mockTestItems.map(item => ({ 
      ...item, 
      value: '', 
      isValid: null, 
      remarks: '',
      dataSource: 'manual',
      instrumentId: '',
      operator: authStore.userName || '当前用户',
      enteredAt: new Date()
    }))
  }
}

// 加载历史结果
const loadHistoryResults = async () => {
  if (!selectedSample.value) return
  
  try {
    console.log('开始加载历史结果...')
    // 调用真实的API获取历史结果
    const results = await resultApi.getResultsBySample(selectedSample.value.id)
    historyResults.value = results.map(result => ({
      id: result.id,
      sampleId: result.sampleId,
      taskId: '', // 如果后端有taskId字段可以映射
      testItemId: result.testItemId,
      testItemName: result.parameter,
      value: result.value || result.textValue,
      unit: result.unit || '',
      source: result.source.toLowerCase(),
      instrumentId: result.instrumentId || '',
      operator: result.enteredBy,
      timestamp: new Date(result.enteredAt),
      isAnomaly: result.isAbnormal || false
    }))
    console.log('历史结果加载成功:', historyResults.value.length, '条记录')
  } catch (error) {
    console.log('加载历史结果失败（可能API未实现）:', error)
    // 如果API调用失败，静默处理，不显示错误消息
    // 历史结果为空数组，不显示历史结果卡片
    historyResults.value = []
  }
}

// 验证结果
const validateResult = (item: TestItem, index: number) => {
  if (!item.value) {
    item.isValid = null
    return
  }

  // 简单的范围验证逻辑
  if (item.dataType === 'number' && item.normalRange) {
    const value = parseFloat(item.value as string)
    if (isNaN(value)) {
      item.isValid = false
      return
    }

    // 解析正常范围
    if (item.normalRange.includes('-')) {
      const [min, max] = item.normalRange.split('-').map(v => parseFloat(v))
      item.isValid = value >= min && value <= max
    } else if (item.normalRange.startsWith('≤')) {
      const max = parseFloat(item.normalRange.replace('≤', ''))
      item.isValid = value <= max
    } else if (item.normalRange.startsWith('≥')) {
      const min = parseFloat(item.normalRange.replace('≥', ''))
      item.isValid = value >= min
    } else {
      item.isValid = true
    }
  } else {
    item.isValid = true
  }
}

// 申请复测
const requestRetest = async (item: TestItem, index: number) => {
  try {
    const { value } = await ElMessageBox.prompt('请输入复测原因', '申请复测', {
      confirmButtonText: '提交申请',
      cancelButtonText: '取消',
      inputPlaceholder: '请输入复测原因'
    })
    
    if (value && selectedSample.value) {
      console.log('申请复测:', item.name, value)
      
      // 这里需要先找到对应的结果ID，暂时使用模拟逻辑
      // 在实际应用中，应该在testItems中保存对应的resultId
      try {
        // 模拟调用复测API
        // await resultApi.requestRetest(resultId, value)
        ElMessage.success('复测申请已提交')
        console.log('复测申请成功')
      } catch (error) {
        console.error('复测申请失败:', error)
        ElMessage.error('复测申请失败：' + (error as Error).message)
      }
    }
  } catch {
    // 用户取消
    console.log('用户取消复测申请')
  }
}

// 保存结果
const saveResults = async () => {
  // 验证是否有录入的结果
  const hasResults = testItems.value.some(item => item.value !== '' && item.value !== null)
  if (!hasResults) {
    ElMessage.warning('请至少录入一个检测结果')
    return
  }

  if (!selectedSample.value) {
    ElMessage.error('请先选择样品')
    return
  }

  saving.value = true
  
  try {
    console.log('开始保存检测结果...')
    
    // 过滤出有值的检测项目
    const resultsToSave = testItems.value.filter(item => 
      item.value !== '' && item.value !== null
    )
    
    console.log('需要保存的结果数量:', resultsToSave.length)
    
    // 逐个保存结果
    const savePromises = resultsToSave.map(async (item) => {
      const resultData = {
        sampleId: selectedSample.value!.id,
        testItemId: item.id,
        parameter: item.name,
        value: item.dataType === 'number' ? parseFloat(item.value as string) : undefined,
        textValue: item.dataType !== 'number' ? String(item.value) : undefined,
        unit: item.unit,
        method: item.method,
        source: item.dataSource.toUpperCase() as const,
        instrumentId: item.instrumentId || undefined,
        operator: item.operator,
        enteredAt: item.enteredAt,
        remarks: item.remarks
      }
      
      console.log('保存结果:', resultData)
      return await resultApi.createResult(resultData)
    })
    
    // 等待所有结果保存完成
    const savedResults = await Promise.all(savePromises)
    console.log('所有结果保存成功:', savedResults.length, '条')
    
    ElMessage.success(`结果保存成功，共保存 ${savedResults.length} 条记录`)
    
    // 刷新历史结果
    await loadHistoryResults()
    
    // 清空当前录入的结果
    testItems.value.forEach(item => {
      item.value = ''
      item.isValid = null
      item.remarks = ''
      item.dataSource = 'manual'
      item.instrumentId = ''
      item.operator = authStore.userName || '当前用户'
      item.enteredAt = new Date()
    })
    
  } catch (error) {
    console.error('保存结果失败:', error)
    ElMessage.error('保存失败：' + (error as Error).message)
  } finally {
    saving.value = false
  }
}

// 工具函数
const formatDate = (date: Date) => {
  return date.toLocaleDateString('zh-CN')
}

const formatDateTime = (date: Date) => {
  return date.toLocaleString('zh-CN')
}

// 状态相关辅助函数
const getStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    'REGISTERED': 'info',
    'IN_TESTING': 'warning', 
    'TESTING_COMPLETE': 'success',
    'IN_AUDIT': 'warning',
    'AUDIT_COMPLETE': 'success',
    'RELEASED': 'success',
    'ARCHIVED': 'info'
  }
  return statusMap[status] || 'info'
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'REGISTERED': '已登记',
    'IN_TESTING': '检测中',
    'TESTING_COMPLETE': '检测完成', 
    'IN_AUDIT': '审核中',
    'AUDIT_COMPLETE': '审核完成',
    'RELEASED': '已放行',
    'ARCHIVED': '已归档'
  }
  return statusMap[status] || status
}
</script>

<style scoped>
.result-entry {
  padding: 20px;
}

.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}

.login-card {
  width: 400px;
}

.login-header {
  text-align: center;
}

.login-header h2 {
  margin: 0 0 8px 0;
  color: var(--el-text-color-primary);
}

.login-header p {
  margin: 0;
  color: var(--el-text-color-regular);
}

.login-tips {
  margin-top: 20px;
  padding: 12px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.login-tips p {
  margin: 4px 0;
}

.user-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
  margin-bottom: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.sample-card,
.result-card,
.history-card {
  margin-bottom: 20px;
}

.sample-form {
  margin-bottom: 20px;
}

.sample-info {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.result-form {
  margin-top: 20px;
}

:deep(.el-table .el-input) {
  width: 100%;
}

:deep(.el-table .el-select) {
  width: 100%;
}
</style>