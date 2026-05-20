<template>
  <div class="result-import">
    <!-- 页面标题 -->
    <el-page-header @back="handleBack" class="page-header">
      <template #content>
        <span class="page-title">结果导入</span>
      </template>
    </el-page-header>

    <!-- 样品信息展示 -->
    <el-card class="info-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>样品信息</span>
        </div>
      </template>
      
      <el-descriptions :column="3" border>
        <el-descriptions-item label="样品条码">
          <el-tag>{{ sampleInfo.barcode }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="样品名称">
          {{ sampleInfo.name }}
        </el-descriptions-item>
        <el-descriptions-item label="样品类型">
          {{ sampleInfo.sampleType }}
        </el-descriptions-item>
        <el-descriptions-item label="委托方">
          {{ sampleInfo.client }}
        </el-descriptions-item>
        <el-descriptions-item label="接收日期">
          {{ formatDate(sampleInfo.receivedDate) }}
        </el-descriptions-item>
        <el-descriptions-item label="当前状态">
          <el-tag :type="getStatusType(sampleInfo.status)">
            {{ getStatusText(sampleInfo.status) }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 文件上传区域 -->
    <el-card class="upload-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>文件上传</span>
          <el-button type="primary" link @click="downloadTemplate">
            <el-icon><Download /></el-icon>
            下载导入模板
          </el-button>
        </div>
      </template>

      <el-alert
        title="导入说明"
        type="info"
        :closable="false"
        class="import-tips"
      >
        <template #default>
          <ul>
            <li>请先下载导入模板，按照模板格式填写检测结果数据</li>
            <li>支持 Excel (.xlsx, .xls) 和 CSV (.csv) 格式</li>
            <li>文件大小不超过 10MB</li>
            <li>确保检测项名称与系统中的检测项完全匹配</li>
            <li>数值类型的检测项请填写数字，文本类型请填写文本</li>
          </ul>
        </template>
      </el-alert>

      <el-upload
        ref="uploadRef"
        class="upload-area"
        drag
        :action="uploadAction"
        :auto-upload="false"
        :limit="1"
        :on-change="handleFileChange"
        :on-exceed="handleExceed"
        :on-remove="handleFileRemove"
        accept=".xlsx,.xls,.csv"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">
          将文件拖到此处，或<em>点击上传</em>
        </div>
        <template #tip>
          <div class="el-upload__tip">
            支持 Excel (.xlsx, .xls) 和 CSV (.csv) 格式，文件大小不超过 10MB
          </div>
        </template>
      </el-upload>

      <!-- 解析进度 -->
      <div v-if="parsing" class="parsing-progress">
        <el-progress :percentage="parseProgress" :status="parseStatus" />
        <p class="progress-text">正在解析文件，请稍候...</p>
      </div>
    </el-card>

    <!-- 导入预览 -->
    <el-card v-if="importData.length > 0" class="preview-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>导入预览</span>
          <div class="header-actions">
            <el-tag v-if="validCount > 0" type="success" size="large">
              有效记录: {{ validCount }}
            </el-tag>
            <el-tag v-if="invalidCount > 0" type="danger" size="large">
              无效记录: {{ invalidCount }}
            </el-tag>
            <el-button type="warning" link @click="clearImportData">
              <el-icon><Delete /></el-icon>
              清空数据
            </el-button>
          </div>
        </div>
      </template>

      <!-- 错误提示 -->
      <el-alert
        v-if="invalidCount > 0"
        title="数据验证失败"
        type="error"
        :closable="false"
        class="error-alert"
      >
        <template #default>
          <p>检测到 {{ invalidCount }} 条无效记录，请修正后重新上传文件</p>
          <p>常见错误：</p>
          <ul>
            <li>检测项名称不匹配</li>
            <li>数值超出允许范围</li>
            <li>数据格式不正确</li>
            <li>必填字段为空</li>
          </ul>
        </template>
      </el-alert>

      <!-- 数据预览表格 -->
      <el-table
        :data="paginatedData"
        border
        stripe
        max-height="500"
        class="preview-table"
      >
        <el-table-column type="index" label="序号" width="60" fixed />
        
        <el-table-column prop="testItemName" label="检测项" min-width="150" fixed>
          <template #default="{ row }">
            <div class="item-name">
              <span>{{ row.testItemName }}</span>
              <el-tag v-if="!row.testItemMatched" type="danger" size="small">
                未匹配
              </el-tag>
            </div>
          </template>
        </el-table-column>
        
        <el-table-column prop="value" label="检测值" min-width="120">
          <template #default="{ row }">
            <span :class="{ 'error-value': !row.valueValid }">
              {{ row.value }}
            </span>
          </template>
        </el-table-column>
        
        <el-table-column prop="unit" label="单位" width="100" />
        
        <el-table-column label="数据类型" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="getDataTypeTagType(row.dataType)">
              {{ getDataTypeText(row.dataType) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="验证状态" width="100" fixed="right">
          <template #default="{ row }">
            <el-tag v-if="row.valid" type="success" size="small">
              <el-icon><CircleCheck /></el-icon>
              有效
            </el-tag>
            <el-tag v-else type="danger" size="small">
              <el-icon><CircleClose /></el-icon>
              无效
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="error" label="错误信息" min-width="250" fixed="right" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.error" class="error-message">
              <el-icon><Warning /></el-icon>
              {{ row.error }}
            </span>
            <span v-else class="success-message">
              <el-icon><Check /></el-icon>
              验证通过
            </span>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-if="importData.length > pageSize"
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="importData.length"
        layout="total, sizes, prev, pager, next, jumper"
        class="pagination"
      />
    </el-card>

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <el-button @click="handleBack">
        <el-icon><Close /></el-icon>
        取消
      </el-button>
      <el-button
        type="primary"
        @click="handleConfirmImport"
        :loading="importing"
        :disabled="!canImport"
      >
        <el-icon><Check /></el-icon>
        确认导入
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ElMessage,
  ElMessageBox,
  type UploadInstance,
  type UploadUserFile,
  type UploadFile
} from 'element-plus'
import {
  Download,
  UploadFilled,
  Delete,
  CircleCheck,
  CircleClose,
  Warning,
  Check,
  Close
} from '@element-plus/icons-vue'
import type { Sample } from '@/types'

// 路由
const route = useRoute()
const router = useRouter()

// 上传组件引用
const uploadRef = ref<UploadInstance>()

// 上传配置
const uploadAction = ref('')

// 加载状态
const parsing = ref(false)
const parseProgress = ref(0)
const parseStatus = ref<'success' | 'exception' | 'warning' | undefined>(undefined)
const importing = ref(false)

// 样品信息（模拟数据）
const sampleInfo = ref<Sample>({
  id: route.query.sampleId as string || 'S001',
  barcode: 'LAB2024010001',
  name: '水质样品-A',
  source: '某工厂排放口',
  client: '环保监测站',
  receivedDate: new Date('2024-01-15'),
  sampleType: '水质',
  quantity: 500,
  unit: 'mL',
  status: 'in_progress',
  currentLocation: '检测室A',
  createdBy: 'user001',
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15')
})

// 导入数据接口
interface ImportDataRow {
  testItemName: string
  testItemMatched: boolean
  value: any
  valueValid: boolean
  unit?: string
  dataType: 'number' | 'text' | 'boolean'
  valid: boolean
  error: string
}

// 导入数据
const importData = ref<ImportDataRow[]>([])

// 分页
const currentPage = ref(1)
const pageSize = ref(20)

// 计算属性
const validCount = computed(() => importData.value.filter(item => item.valid).length)
const invalidCount = computed(() => importData.value.filter(item => !item.valid).length)
const canImport = computed(() => importData.value.length > 0 && invalidCount.value === 0)

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return importData.value.slice(start, end)
})

// 处理文件变化
const handleFileChange = async (file: UploadFile) => {
  console.log('文件选择:', file)
  
  // 验证文件大小
  if (file.size && file.size > 10 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过 10MB')
    uploadRef.value?.clearFiles()
    return
  }

  // 验证文件类型
  const validTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
  ]
  if (file.raw && !validTypes.includes(file.raw.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
    ElMessage.error('只支持 Excel 和 CSV 格式的文件')
    uploadRef.value?.clearFiles()
    return
  }

  // 开始解析文件
  await parseFile(file)
}

// 解析文件
const parseFile = async (file: UploadFile) => {
  parsing.value = true
  parseProgress.value = 0
  parseStatus.value = undefined
  importData.value = []

  try {
    // 模拟解析进度
    const progressInterval = setInterval(() => {
      if (parseProgress.value < 90) {
        parseProgress.value += 10
      }
    }, 200)

    // 模拟文件解析（实际应用中应该使用 xlsx 或 papaparse 库解析）
    await new Promise(resolve => setTimeout(resolve, 2000))

    clearInterval(progressInterval)
    parseProgress.value = 100
    parseStatus.value = 'success'

    // 模拟解析结果
    const mockData: ImportDataRow[] = [
      {
        testItemName: 'pH值',
        testItemMatched: true,
        value: 7.2,
        valueValid: true,
        unit: '',
        dataType: 'number',
        valid: true,
        error: ''
      },
      {
        testItemName: '温度',
        testItemMatched: true,
        value: 25,
        valueValid: true,
        unit: '℃',
        dataType: 'number',
        valid: true,
        error: ''
      },
      {
        testItemName: '浊度',
        testItemMatched: true,
        value: 15,
        valueValid: true,
        unit: 'NTU',
        dataType: 'number',
        valid: true,
        error: ''
      },
      {
        testItemName: '外观描述',
        testItemMatched: true,
        value: '无色透明',
        valueValid: true,
        unit: '',
        dataType: 'text',
        valid: true,
        error: ''
      },
      {
        testItemName: '是否合格',
        testItemMatched: true,
        value: true,
        valueValid: true,
        unit: '',
        dataType: 'boolean',
        valid: true,
        error: ''
      },
      // 添加一些错误示例
      {
        testItemName: 'pH值2',
        testItemMatched: false,
        value: 15,
        valueValid: false,
        unit: '',
        dataType: 'number',
        valid: false,
        error: '检测项名称不匹配，系统中不存在该检测项'
      },
      {
        testItemName: '温度',
        testItemMatched: true,
        value: 150,
        valueValid: false,
        unit: '℃',
        dataType: 'number',
        valid: false,
        error: '数值超出允许范围（0-100）'
      },
      {
        testItemName: '浊度',
        testItemMatched: true,
        value: 'abc',
        valueValid: false,
        unit: 'NTU',
        dataType: 'number',
        valid: false,
        error: '数据格式不正确，应为数字类型'
      }
    ]

    importData.value = mockData

    ElMessage.success(`文件解析成功，共解析 ${mockData.length} 条记录`)
  } catch (error) {
    parseStatus.value = 'exception'
    ElMessage.error('文件解析失败，请检查文件格式')
    console.error('文件解析错误:', error)
  } finally {
    parsing.value = false
  }
}

// 处理文件超出限制
const handleExceed = () => {
  ElMessage.warning('只能上传一个文件，请先删除已上传的文件')
}

// 处理文件移除
const handleFileRemove = () => {
  importData.value = []
  currentPage.value = 1
  ElMessage.info('已清空导入数据')
}

// 清空导入数据
const clearImportData = () => {
  ElMessageBox.confirm(
    '确定要清空当前导入的数据吗？',
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    uploadRef.value?.clearFiles()
    importData.value = []
    currentPage.value = 1
    ElMessage.success('已清空导入数据')
  }).catch(() => {
    // 用户取消
  })
}

// 下载导入模板
const downloadTemplate = () => {
  ElMessage.info('正在下载导入模板...')
  // 实际应用中这里应该触发模板文件下载
  // 可以使用 Blob 和 URL.createObjectURL 创建下载链接
  setTimeout(() => {
    ElMessage.success('模板下载成功')
  }, 500)
}

// 确认导入
const handleConfirmImport = async () => {
  if (!canImport.value) {
    ElMessage.warning('存在无效记录，无法导入')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要导入 ${validCount.value} 条检测结果吗？`,
      '确认导入',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    importing.value = true

    // 模拟导入过程
    await new Promise(resolve => setTimeout(resolve, 2000))

    ElMessage.success('检测结果导入成功')
    
    // 导入成功后返回
    setTimeout(() => {
      router.back()
    }, 500)
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('导入失败，请重试')
      console.error('导入错误:', error)
    }
  } finally {
    importing.value = false
  }
}

// 返回
const handleBack = () => {
  if (importData.value.length > 0) {
    ElMessageBox.confirm(
      '当前有未导入的数据，确定要离开吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    ).then(() => {
      router.back()
    }).catch(() => {
      // 用户取消
    })
  } else {
    router.back()
  }
}

// 格式化日期
const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('zh-CN')
}

// 获取状态类型
const getStatusType = (status: string) => {
  const typeMap: Record<string, any> = {
    registered: 'info',
    in_progress: 'warning',
    completed: 'success',
    released: 'success',
    returned: 'danger'
  }
  return typeMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    registered: '已登记',
    in_progress: '检测中',
    completed: '已完成',
    released: '已放行',
    returned: '已退回'
  }
  return textMap[status] || status
}

// 获取数据类型标签类型
const getDataTypeTagType = (dataType: string) => {
  const typeMap: Record<string, any> = {
    number: 'primary',
    text: 'success',
    boolean: 'warning'
  }
  return typeMap[dataType] || 'info'
}

// 获取数据类型文本
const getDataTypeText = (dataType: string) => {
  const textMap: Record<string, string> = {
    number: '数字',
    text: '文本',
    boolean: '布尔'
  }
  return textMap[dataType] || dataType
}

// 组件挂载
onMounted(() => {
  console.log('ResultImport 组件已挂载')
})
</script>

<style scoped lang="scss">
.result-import {
  padding: 20px;

  .page-header {
    margin-bottom: 20px;
    
    .page-title {
      font-size: 20px;
      font-weight: 600;
    }
  }

  .info-card {
    margin-bottom: 20px;

    .card-header {
      font-weight: 600;
    }
  }

  .upload-card {
    margin-bottom: 20px;

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
    }

    .import-tips {
      margin-bottom: 20px;

      ul {
        margin: 8px 0 0 0;
        padding-left: 20px;

        li {
          margin: 4px 0;
          line-height: 1.6;
        }
      }
    }

    .upload-area {
      margin: 20px 0;

      :deep(.el-upload-dragger) {
        padding: 40px;
      }
    }

    .parsing-progress {
      margin: 20px 0;
      text-align: center;

      .progress-text {
        margin-top: 12px;
        color: #606266;
        font-size: 14px;
      }
    }
  }

  .preview-card {
    margin-bottom: 20px;

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;

      .header-actions {
        display: flex;
        align-items: center;
        gap: 12px;
      }
    }

    .error-alert {
      margin-bottom: 20px;

      ul {
        margin: 8px 0 0 0;
        padding-left: 20px;

        li {
          margin: 4px 0;
        }
      }
    }

    .preview-table {
      .item-name {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .error-value {
        color: #f56c6c;
        font-weight: 600;
      }

      .error-message {
        display: flex;
        align-items: center;
        gap: 4px;
        color: #f56c6c;
      }

      .success-message {
        display: flex;
        align-items: center;
        gap: 4px;
        color: #67c23a;
      }
    }

    .pagination {
      margin-top: 20px;
      display: flex;
      justify-content: center;
    }
  }

  .action-buttons {
    display: flex;
    justify-content: center;
    gap: 16px;
    padding: 20px 0;
  }
}
</style>
