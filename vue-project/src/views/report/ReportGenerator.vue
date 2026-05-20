<template>
  <div class="report-generator">
    <!-- 页面标题和操作栏 -->
    <el-card class="header-card" shadow="never">
      <div class="header-content">
        <div class="title-section">
          <h2>报告生成</h2>
          <p class="subtitle">选择样品和模板生成检测报告</p>
        </div>
        <div class="action-section">
          <el-button @click="handleReset">重置</el-button>
          <el-button
            type="primary"
            :icon="Document"
            :disabled="!canGenerate"
            @click="handleGenerate"
          >
            生成报告
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 主要内容区域 -->
    <el-row :gutter="20">
      <!-- 左侧：样品和模板选择 -->
      <el-col :span="8">
        <!-- 样品选择 -->
        <el-card class="selection-card" shadow="never">
          <template #header>
            <div class="card-header">
              <el-icon><Box /></el-icon>
              <span>样品选择</span>
            </div>
          </template>

          <div class="selection-content">
            <!-- 搜索样品 -->
            <el-input
              v-model="sampleSearchKeyword"
              placeholder="搜索样品条码或名称"
              clearable
              :prefix-icon="Search"
              @input="handleSampleSearch"
              style="margin-bottom: 16px"
            />

            <!-- 样品列表 -->
            <div v-loading="loadingSamples" class="sample-list">
              <div
                v-for="sample in filteredSamples"
                :key="sample.id"
                class="sample-item"
                :class="{ active: selectedSample?.id === sample.id }"
                @click="handleSelectSample(sample)"
              >
                <div class="sample-info">
                  <div class="sample-barcode">
                    <el-icon><Barcode /></el-icon>
                    {{ sample.barcode }}
                  </div>
                  <div class="sample-name">{{ sample.name }}</div>
                  <div class="sample-meta">
                    <el-tag size="small" :type="getSampleStatusType(sample.status)">
                      {{ getSampleStatusLabel(sample.status) }}
                    </el-tag>
                    <span class="sample-type">{{ sample.sampleType }}</span>
                  </div>
                </div>
                <el-icon v-if="selectedSample?.id === sample.id" class="check-icon">
                  <Check />
                </el-icon>
              </div>

              <el-empty
                v-if="filteredSamples.length === 0"
                description="暂无可用样品"
                :image-size="80"
              />
            </div>
          </div>
        </el-card>

        <!-- 模板选择 -->
        <el-card class="selection-card" shadow="never">
          <template #header>
            <div class="card-header">
              <el-icon><Document /></el-icon>
              <span>模板选择</span>
            </div>
          </template>

          <div class="selection-content">
            <!-- 筛选模板 -->
            <el-select
              v-model="templateFilter"
              placeholder="筛选模板类型"
              clearable
              style="width: 100%; margin-bottom: 16px"
              @change="handleTemplateFilter"
            >
              <el-option label="全部模板" value="" />
              <el-option label="分析报告" value="ANALYSIS_REPORT" />
              <el-option label="样品报告" value="SAMPLE_REPORT" />
              <el-option label="技术报告" value="TECHNICAL_REPORT" />
              <el-option label="质量报告" value="QUALITY_REPORT" />
              <el-option label="综合报告" value="COMPREHENSIVE_REPORT" />
              <el-option label="水质检测" value="water" />
              <el-option label="土壤检测" value="soil" />
              <el-option label="空气检测" value="air" />
              <el-option label="食品检测" value="food" />
              <el-option label="通用模板" value="general" />
            </el-select>

            <!-- 模板列表 -->
            <div v-loading="loadingTemplates" class="template-list">
              <div
                v-for="template in filteredTemplates"
                :key="template.id"
                class="template-item"
                :class="{ active: selectedTemplate?.id === template.id }"
                @click="handleSelectTemplate(template)"
              >
                <div class="template-info">
                  <div class="template-name">{{ template.name }}</div>
                  <div class="template-meta">
                    <span class="template-version">{{ template.version }}</span>
                    <el-tag
                      v-for="type in template.applicableTypes"
                      :key="type"
                      size="small"
                      style="margin-left: 4px"
                    >
                      {{ getTypeLabel(type) }}
                    </el-tag>
                  </div>
                </div>
                <el-icon v-if="selectedTemplate?.id === template.id" class="check-icon">
                  <Check />
                </el-icon>
              </div>

              <el-empty
                v-if="filteredTemplates.length === 0"
                description="暂无可用模板"
                :image-size="80"
              />
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：报告预览和编辑 -->
      <el-col :span="16">
        <el-card class="preview-card" shadow="never">
          <template #header>
            <div class="card-header">
              <el-icon><View /></el-icon>
              <span>报告预览</span>
              <div class="header-actions">
                <el-button
                  v-if="generatedReport"
                  size="small"
                  :icon="Edit"
                  @click="toggleEditMode"
                >
                  {{ isEditMode ? '预览模式' : '编辑模式' }}
                </el-button>
                <el-button
                  v-if="generatedReport"
                  size="small"
                  :icon="Printer"
                  @click="handlePrint"
                >
                  打印
                </el-button>
                <el-button
                  v-if="generatedReport"
                  size="small"
                  :icon="Download"
                  @click="handleExport"
                >
                  导出
                </el-button>
              </div>
            </div>
          </template>

          <div class="preview-content">
            <!-- 未生成报告时的提示 -->
            <div v-if="!generatedReport" class="empty-state">
              <el-empty description="请选择样品和模板后生成报告">
                <template #image>
                  <el-icon :size="100" color="#909399">
                    <Document />
                  </el-icon>
                </template>
              </el-empty>
            </div>

            <!-- 报告预览/编辑区域 -->
            <div v-else class="report-container">
              <!-- 报告信息栏 -->
              <div class="report-info-bar">
                <div class="info-item">
                  <span class="label">报告编号：</span>
                  <span class="value">{{ generatedReport.reportNumber }}</span>
                </div>
                <div class="info-item">
                  <span class="label">生成时间：</span>
                  <span class="value">{{ formatDate(generatedReport.generatedAt) }}</span>
                </div>
                <div class="info-item">
                  <span class="label">状态：</span>
                  <el-tag :type="getReportStatusType(generatedReport.status)">
                    {{ getReportStatusLabel(generatedReport.status) }}
                  </el-tag>
                </div>
              </div>

              <el-divider />

              <!-- 标签页切换 -->
              <el-tabs v-model="activeTab" type="border-card">
                <el-tab-pane label="报告内容" name="content">
                  <!-- 编辑模式 -->
                  <div v-if="isEditMode" class="edit-mode">
                    <QuillEditor
                      v-model:content="editableContent"
                      content-type="html"
                      :toolbar="editorToolbar"
                      theme="snow"
                      placeholder="编辑报告内容..."
                      style="height: 600px"
                    />
                    <div class="edit-actions">
                      <el-button @click="handleCancelEdit">取消</el-button>
                      <el-button type="primary" @click="handleSaveEdit">
                        保存修改
                      </el-button>
                    </div>
                  </div>

                  <!-- 预览模式 -->
                  <div v-else class="preview-mode">
                    <div class="report-content" v-html="generatedReport.content"></div>
                  </div>
                </el-tab-pane>

                <el-tab-pane label="电子签名" name="signature">
                  <ElectronicSignature
                    :report-id="generatedReport.id"
                    :signatures="generatedReport.signatures"
                    :readonly="generatedReport.status === 'signed' || generatedReport.status === 'distributed'"
                    @sign="handleSign"
                    @complete="handleSignatureComplete"
                  />
                </el-tab-pane>
              </el-tabs>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import {
  Document,
  Search,
  Box,
  Check,
  View,
  Edit,
  Printer,
  Download
} from '@element-plus/icons-vue'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import type { Sample, ReportTemplate, GeneratedReport, Signature } from '@/types'
import ElectronicSignature from '@/components/ElectronicSignature.vue'
import * as reportService from '@/services/reportService'
import http from '@/services/http'

// 数据状态
const loadingSamples = ref(false)
const loadingTemplates = ref(false)
const sampleList = ref<Sample[]>([])
const templateList = ref<ReportTemplate[]>([])
const selectedSample = ref<Sample | null>(null)
const selectedTemplate = ref<ReportTemplate | null>(null)
const generatedReport = ref<GeneratedReport | null>(null)
const isEditMode = ref(false)
const editableContent = ref('')
const activeTab = ref('content') // 当前激活的标签页

// 搜索和筛选
const sampleSearchKeyword = ref('')
const templateFilter = ref('')

// 富文本编辑器工具栏配置
const editorToolbar = [
  ['bold', 'italic', 'underline', 'strike'],
  ['blockquote', 'code-block'],
  [{ 'header': 1 }, { 'header': 2 }],
  [{ 'list': 'ordered' }, { 'list': 'bullet' }],
  [{ 'indent': '-1' }, { 'indent': '+1' }],
  [{ 'size': ['small', false, 'large', 'huge'] }],
  [{ 'color': [] }, { 'background': [] }],
  [{ 'align': [] }],
  ['clean']
]

// 计算属性：是否可以生成报告
const canGenerate = computed(() => {
  return selectedSample.value !== null && selectedTemplate.value !== null
})

// 计算属性：过滤后的样品列表
const filteredSamples = computed(() => {
  if (!sampleSearchKeyword.value) {
    return sampleList.value
  }
  const keyword = sampleSearchKeyword.value.toLowerCase()
  return sampleList.value.filter(sample =>
    sample.barcode.toLowerCase().includes(keyword) ||
    sample.name.toLowerCase().includes(keyword)
  )
})

// 计算属性：过滤后的模板列表
const filteredTemplates = computed(() => {
  if (!templateFilter.value) {
    return templateList.value
  }
  return templateList.value.filter(template =>
    template.applicableTypes.includes(templateFilter.value)
  )
})

// 获取样品列表
const fetchSamples = async () => {
  loadingSamples.value = true
  try {
    // 调用后端API获取已完成检测的样品
    const response = await http.get('/samples', {
      params: {
        status: 'TESTING_COMPLETE',
        pageSize: 100
      }
    })
    
    // 从响应中提取 items 数组
    sampleList.value = response.data?.items || []
  } catch (error) {
    ElMessage.error('获取样品列表失败')
    console.error(error)
  } finally {
    loadingSamples.value = false
  }
}

// 获取模板列表
const fetchTemplates = async () => {
  loadingTemplates.value = true
  try {
    // 调用后端API获取启用的模板
    const response = await http.get('/report-templates', {
      params: {
        isActive: 'true',
        pageSize: 100
      }
    })
    
    // 从响应中提取 items 数组
    const items = response.data?.items || []
    templateList.value = items.map((item: any) => ({
      id: item.id,
      name: item.name,
      version: `v${item.version}`,
      content: item.content,
      variables: item.variables,
      applicableTypes: [item.category],
      status: item.isActive ? 'active' : 'draft',
      createdBy: item.createdBy,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt)
    }))
  } catch (error) {
    ElMessage.error('获取模板列表失败')
    console.error(error)
  } finally {
    loadingTemplates.value = false
  }
}

// 选择样品
const handleSelectSample = (sample: Sample) => {
  selectedSample.value = sample
  // 清空已生成的报告
  generatedReport.value = null
  isEditMode.value = false
}

// 选择模板
const handleSelectTemplate = (template: ReportTemplate) => {
  selectedTemplate.value = template
  // 清空已生成的报告
  generatedReport.value = null
  isEditMode.value = false
}

// 样品搜索
const handleSampleSearch = () => {
  // 搜索逻辑已在 computed 中实现
}

// 模板筛选
const handleTemplateFilter = () => {
  // 筛选逻辑已在 computed 中实现
}

// 生成报告内容（替换变量）
const generateReportContent = (template: ReportTemplate, sample: Sample): string => {
  let content = template.content

  // 替换样品信息变量
  content = content.replace(/\{\{sample\.barcode\}\}/g, sample.barcode)
  content = content.replace(/\{\{sample\.name\}\}/g, sample.name)
  content = content.replace(/\{\{sample\.source\}\}/g, sample.source)
  content = content.replace(/\{\{sample\.client\}\}/g, sample.client)
  content = content.replace(/\{\{sample\.receivedDate\}\}/g, formatDate(sample.receivedDate))
  content = content.replace(/\{\{sample\.sampleType\}\}/g, sample.sampleType)
  content = content.replace(/\{\{sample\.quantity\}\}/g, `${sample.quantity}${sample.unit}`)

  return content
}

// 生成报告
const handleGenerate = async () => {
  if (!selectedSample.value || !selectedTemplate.value) {
    ElMessage.warning('请先选择样品和模板')
    return
  }

  const loading = ElLoading.service({
    lock: true,
    text: '正在生成报告...',
    background: 'rgba(0, 0, 0, 0.7)'
  })

  try {
    // 调用后端API生成报告
    const result = await reportService.generateReport({
      sampleId: selectedSample.value.id,
      templateId: selectedTemplate.value.id,
      preview: false
    })

    generatedReport.value = {
      id: result.reportId || result.id,
      reportNumber: result.reportNumber,
      sampleId: selectedSample.value.id,
      templateId: selectedTemplate.value.id,
      content: result.content,
      signatures: [],
      status: 'draft',
      distributionRecords: [],
      generatedBy: '当前用户',
      generatedAt: new Date()
    }

    isEditMode.value = false
    ElMessage.success('报告生成成功')
  } catch (error: any) {
    ElMessage.error(error.message || '报告生成失败')
    console.error(error)
  } finally {
    loading.close()
  }
}

// 取消编辑
const handleCancelEdit = () => {
  ElMessageBox.confirm(
    '确定要取消编辑吗？未保存的修改将丢失',
    '确认取消',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    isEditMode.value = false
    editableContent.value = ''
  }).catch(() => {
    // 用户取消
  })
}

// 保存编辑
const handleSaveEdit = () => {
  if (!generatedReport.value) return

  generatedReport.value.content = editableContent.value
  isEditMode.value = false
  ElMessage.success('报告内容已更新')
}

// 打印报告
const handlePrint = () => {
  if (!generatedReport.value) return

  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>检测报告 - ${generatedReport.value.reportNumber}</title>
          <style>
            body {
              font-family: 'Microsoft YaHei', Arial, sans-serif;
              padding: 40px;
              line-height: 1.8;
            }
            h1 {
              text-align: center;
              color: #303133;
              margin-bottom: 30px;
            }
            h2 {
              color: #606266;
              margin-top: 30px;
              margin-bottom: 15px;
              border-bottom: 2px solid #409eff;
              padding-bottom: 8px;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid #dcdfe6;
              padding: 12px;
              text-align: left;
            }
            th {
              background-color: #f5f7fa;
              font-weight: 600;
            }
            p {
              margin: 10px 0;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          ${generatedReport.value.content}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }
}

// 导出报告
const handleExport = () => {
  if (!generatedReport.value) return

  ElMessageBox.confirm(
    '请选择导出格式',
    '导出报告',
    {
      distinguishCancelAndClose: true,
      confirmButtonText: '导出为 PDF',
      cancelButtonText: '导出为 Word',
      type: 'info'
    }
  ).then(() => {
    // 导出为 PDF
    ElMessage.success('正在导出为 PDF...')
    // 实际项目中这里会调用 PDF 生成库
    console.log('导出 PDF:', generatedReport.value)
  }).catch((action) => {
    if (action === 'cancel') {
      // 导出为 Word
      ElMessage.success('正在导出为 Word...')
      // 实际项目中这里会调用 Word 生成库
      console.log('导出 Word:', generatedReport.value)
    }
  })
}

// 重置
const handleReset = () => {
  ElMessageBox.confirm(
    '确定要重置吗？当前选择和生成的报告将被清空',
    '确认重置',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    selectedSample.value = null
    selectedTemplate.value = null
    generatedReport.value = null
    isEditMode.value = false
    editableContent.value = ''
    sampleSearchKeyword.value = ''
    templateFilter.value = ''
    ElMessage.success('已重置')
  }).catch(() => {
    // 用户取消
  })
}

// 获取样品状态标签
const getSampleStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    registered: '已登记',
    in_progress: '检测中',
    completed: '已完成',
    released: '已放行',
    returned: '已退回'
  }
  return labels[status] || status
}

// 获取样品状态类型
const getSampleStatusType = (status: string): 'success' | 'info' | 'warning' | 'danger' => {
  const types: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
    registered: 'info',
    in_progress: 'warning',
    completed: 'success',
    released: 'success',
    returned: 'danger'
  }
  return types[status] || 'info'
}

// 获取模板类型标签
const getTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    // 新的报告类型
    ANALYSIS_REPORT: '分析报告',
    SAMPLE_REPORT: '样品报告',
    TECHNICAL_REPORT: '技术报告',
    QUALITY_REPORT: '质量报告',
    COMPREHENSIVE_REPORT: '综合报告',
    // 旧的检测类型
    water: '水质检测',
    soil: '土壤检测',
    air: '空气检测',
    food: '食品检测',
    general: '通用模板'
  }
  return labels[type] || type
}

// 获取报告状态标签
const getReportStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    draft: '草稿',
    signed: '已签名',
    distributed: '已分发',
    recalled: '已回收'
  }
  return labels[status] || status
}

// 获取报告状态类型
const getReportStatusType = (status: string): 'info' | 'success' | 'warning' | 'danger' => {
  const types: Record<string, 'info' | 'success' | 'warning' | 'danger'> = {
    draft: 'info',
    signed: 'success',
    distributed: 'success',
    recalled: 'warning'
  }
  return types[status] || 'info'
}

// 格式化日期
const formatDate = (date: Date): string => {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 处理签名
const handleSign = (signature: Signature) => {
  if (!generatedReport.value) return

  // 添加签名到报告
  generatedReport.value.signatures.push(signature)
  
  ElMessage.success('签名已添加')
}

// 处理签名完成
const handleSignatureComplete = () => {
  if (!generatedReport.value) return

  // 更新报告状态为已签名
  generatedReport.value.status = 'signed'
  generatedReport.value.signedAt = new Date()

  ElMessage.success('所有签名已完成，报告已锁定')
}

// 切换编辑模式时检查签名状态
const toggleEditMode = () => {
  if (!generatedReport.value) return

  // 如果报告已签名，不允许编辑
  if (generatedReport.value.status === 'signed' || generatedReport.value.status === 'distributed') {
    ElMessage.warning('报告已签名或已分发，无法编辑')
    return
  }

  if (!isEditMode.value) {
    // 进入编辑模式
    editableContent.value = generatedReport.value.content
    isEditMode.value = true
  } else {
    // 退出编辑模式
    isEditMode.value = false
  }
}

// 初始化
onMounted(() => {
  fetchSamples()
  fetchTemplates()
})
</script>

<style scoped lang="scss">
.report-generator {
  padding: 20px;

  .header-card {
    margin-bottom: 20px;

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .title-section {
        h2 {
          margin: 0 0 8px 0;
          font-size: 24px;
          color: #303133;
        }

        .subtitle {
          margin: 0;
          font-size: 14px;
          color: #909399;
        }
      }

      .action-section {
        display: flex;
        gap: 12px;
      }
    }
  }

  .selection-card {
    margin-bottom: 20px;
    height: calc(50vh - 60px);

    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 16px;
    }

    .selection-content {
      height: calc(100% - 20px);
      display: flex;
      flex-direction: column;

      .sample-list,
      .template-list {
        flex: 1;
        overflow-y: auto;
        border: 1px solid #dcdfe6;
        border-radius: 4px;
        padding: 8px;

        .sample-item,
        .template-item {
          padding: 12px;
          border: 1px solid #dcdfe6;
          border-radius: 4px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          justify-content: space-between;
          align-items: center;

          &:hover {
            border-color: #409eff;
            background-color: #ecf5ff;
          }

          &.active {
            border-color: #409eff;
            background-color: #ecf5ff;
          }

          &:last-child {
            margin-bottom: 0;
          }

          .sample-info,
          .template-info {
            flex: 1;

            .sample-barcode {
              display: flex;
              align-items: center;
              gap: 4px;
              font-weight: 600;
              color: #303133;
              margin-bottom: 4px;
            }

            .sample-name,
            .template-name {
              font-size: 14px;
              color: #606266;
              margin-bottom: 4px;
            }

            .sample-meta,
            .template-meta {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 12px;
              color: #909399;

              .sample-type,
              .template-version {
                color: #909399;
              }
            }
          }

          .check-icon {
            color: #409eff;
            font-size: 20px;
          }
        }
      }
    }
  }

  .preview-card {
    height: calc(100vh - 160px);

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-weight: 600;
      font-size: 16px;

      .header-actions {
        display: flex;
        gap: 8px;
      }
    }

    .preview-content {
      height: calc(100% - 60px);
      overflow-y: auto;

      .empty-state {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .report-container {
        .report-info-bar {
          display: flex;
          gap: 24px;
          padding: 12px;
          background-color: #f5f7fa;
          border-radius: 4px;
          margin-bottom: 16px;

          .info-item {
            display: flex;
            align-items: center;
            gap: 8px;

            .label {
              color: #909399;
              font-size: 14px;
            }

            .value {
              color: #303133;
              font-weight: 600;
              font-size: 14px;
            }
          }
        }

        .edit-mode {
          .edit-actions {
            margin-top: 20px;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
          }
        }

        .preview-mode {
          .report-content {
            padding: 20px;
            border: 1px solid #dcdfe6;
            border-radius: 4px;
            background-color: #fff;
            min-height: 600px;

            :deep(h1) {
              font-size: 24px;
              margin-bottom: 20px;
              text-align: center;
            }

            :deep(h2) {
              font-size: 18px;
              margin-top: 24px;
              margin-bottom: 12px;
              color: #606266;
              border-bottom: 2px solid #409eff;
              padding-bottom: 8px;
            }

            :deep(p) {
              margin: 8px 0;
              line-height: 1.8;
            }

            :deep(table) {
              width: 100%;
              border-collapse: collapse;
              margin: 16px 0;

              th,
              td {
                border: 1px solid #dcdfe6;
                padding: 12px;
                text-align: left;
              }

              th {
                background-color: #f5f7fa;
                font-weight: 600;
              }
            }
          }
        }
      }
    }
  }
}
</style>
