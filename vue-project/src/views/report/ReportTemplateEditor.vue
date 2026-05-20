<template>
  <div class="report-template-editor">
    <!-- 页面标题 -->
    <el-card class="header-card" shadow="never">
      <div class="header-content">
        <div class="title-section">
          <h2>{{ isEditMode ? '编辑报告模板' : '新建报告模板' }}</h2>
          <p class="subtitle">
            {{ isEditMode ? `编辑模板: ${formData.name}` : '创建新的报告模板' }}
          </p>
        </div>
        <div class="action-section">
          <el-button @click="handleCancel">取消</el-button>
          <el-button type="info" @click="handleSaveDraft">保存草稿</el-button>
          <el-button type="primary" @click="handleSave">保存并启用</el-button>
        </div>
      </div>
    </el-card>

    <!-- 主要内容区域 -->
    <el-row :gutter="20">
      <!-- 左侧：模板配置和编辑器 -->
      <el-col :span="16">
        <!-- 基本信息配置 -->
        <el-card class="config-card" shadow="never">
          <template #header>
            <div class="card-header">
              <el-icon><Setting /></el-icon>
              <span>基本信息</span>
            </div>
          </template>
          
          <el-form
            ref="formRef"
            :model="formData"
            :rules="formRules"
            label-width="120px"
          >
            <el-form-item label="模板名称" prop="name">
              <el-input
                v-model="formData.name"
                placeholder="请输入模板名称"
                clearable
              />
            </el-form-item>

            <el-form-item label="版本号" prop="version">
              <el-input
                v-model="formData.version"
                placeholder="例如: v1.0"
                clearable
              />
            </el-form-item>

            <el-form-item label="适用范围" prop="applicableTypes">
              <el-select
                v-model="formData.applicableTypes"
                multiple
                placeholder="请选择适用范围"
                style="width: 100%"
              >
                <el-option label="水质检测" value="water" />
                <el-option label="土壤检测" value="soil" />
                <el-option label="空气检测" value="air" />
                <el-option label="食品检测" value="food" />
                <el-option label="通用模板" value="general" />
              </el-select>
            </el-form-item>

            <el-form-item label="模板描述">
              <el-input
                v-model="formData.description"
                type="textarea"
                :rows="3"
                placeholder="请输入模板描述"
              />
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 富文本编辑器 -->
        <el-card class="editor-card" shadow="never">
          <template #header>
            <div class="card-header">
              <el-icon><Document /></el-icon>
              <span>模板内容</span>
            </div>
          </template>
          
          <div class="editor-container">
            <QuillEditor
              v-model:content="formData.content"
              content-type="html"
              :toolbar="editorToolbar"
              theme="snow"
              placeholder="请输入报告模板内容..."
              style="height: 500px"
            />
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：变量占位符和预览 -->
      <el-col :span="8">
        <!-- 变量占位符工具 -->
        <el-card class="variables-card" shadow="never">
          <template #header>
            <div class="card-header">
              <el-icon><Tickets /></el-icon>
              <span>变量占位符</span>
            </div>
          </template>
          
          <div class="variables-content">
            <el-alert
              title="使用说明"
              type="info"
              :closable="false"
              style="margin-bottom: 16px"
            >
              点击下方变量可插入到模板中，系统会自动替换为实际数据
            </el-alert>

            <el-collapse v-model="activeVariableGroups" accordion>
              <!-- 样品信息变量 -->
              <el-collapse-item title="样品信息" name="sample">
                <div class="variable-list">
                  <el-tag
                    v-for="variable in sampleVariables"
                    :key="variable.name"
                    class="variable-tag"
                    @click="insertVariable(variable.name)"
                  >
                    {{ variable.label }}
                  </el-tag>
                </div>
              </el-collapse-item>

              <!-- 检测结果变量 -->
              <el-collapse-item title="检测结果" name="result">
                <div class="variable-list">
                  <el-tag
                    v-for="variable in resultVariables"
                    :key="variable.name"
                    class="variable-tag"
                    type="success"
                    @click="insertVariable(variable.name)"
                  >
                    {{ variable.label }}
                  </el-tag>
                </div>
              </el-collapse-item>

              <!-- 审核信息变量 -->
              <el-collapse-item title="审核信息" name="audit">
                <div class="variable-list">
                  <el-tag
                    v-for="variable in auditVariables"
                    :key="variable.name"
                    class="variable-tag"
                    type="warning"
                    @click="insertVariable(variable.name)"
                  >
                    {{ variable.label }}
                  </el-tag>
                </div>
              </el-collapse-item>

              <!-- 系统信息变量 -->
              <el-collapse-item title="系统信息" name="system">
                <div class="variable-list">
                  <el-tag
                    v-for="variable in systemVariables"
                    :key="variable.name"
                    class="variable-tag"
                    type="info"
                    @click="insertVariable(variable.name)"
                  >
                    {{ variable.label }}
                  </el-tag>
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>
        </el-card>

        <!-- 预览按钮 -->
        <el-card class="preview-card" shadow="never">
          <el-button
            type="primary"
            :icon="View"
            style="width: 100%"
            @click="handlePreview"
          >
            预览模板
          </el-button>
        </el-card>
      </el-col>
    </el-row>

    <!-- 预览对话框 -->
    <el-dialog
      v-model="previewDialogVisible"
      title="模板预览"
      width="80%"
      :close-on-click-modal="false"
    >
      <div class="preview-container">
        <el-alert
          title="预览说明"
          type="info"
          :closable="false"
          style="margin-bottom: 16px"
        >
          以下是使用示例数据渲染的模板效果，实际报告会使用真实数据
        </el-alert>
        
        <div class="preview-content" v-html="previewContent"></div>
      </div>
      
      <template #footer>
        <el-button @click="previewDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="handlePrint">打印预览</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Setting, Document, Tickets, View } from '@element-plus/icons-vue'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'
import http from '@/services/http'

// 路由
const router = useRouter()
const route = useRoute()

// 表单引用
const formRef = ref<FormInstance>()

// 是否为编辑模式
const isEditMode = computed(() => !!route.params.id)

// 表单数据
const formData = reactive({
  id: '',
  name: '',
  version: 'v1.0',
  applicableTypes: [] as string[],
  description: '',
  content: '',
  status: 'draft' as 'draft' | 'active' | 'archived'
})

// 表单验证规则
const formRules: FormRules = {
  name: [
    { required: true, message: '请输入模板名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  version: [
    { required: true, message: '请输入版本号', trigger: 'blur' }
  ],
  applicableTypes: [
    { required: true, message: '请选择适用范围', trigger: 'change', type: 'array' }
  ]
}

// 富文本编辑器工具栏配置
const editorToolbar = [
  ['bold', 'italic', 'underline', 'strike'],
  ['blockquote', 'code-block'],
  [{ 'header': 1 }, { 'header': 2 }],
  [{ 'list': 'ordered' }, { 'list': 'bullet' }],
  [{ 'script': 'sub' }, { 'script': 'super' }],
  [{ 'indent': '-1' }, { 'indent': '+1' }],
  [{ 'direction': 'rtl' }],
  [{ 'size': ['small', false, 'large', 'huge'] }],
  [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
  [{ 'color': [] }, { 'background': [] }],
  [{ 'font': [] }],
  [{ 'align': [] }],
  ['clean'],
  ['link', 'image']
]

// 变量占位符分组
const activeVariableGroups = ref(['sample'])

// 样品信息变量
const sampleVariables = [
  { name: '{{sample.barcode}}', label: '样品条码' },
  { name: '{{sample.name}}', label: '样品名称' },
  { name: '{{sample.source}}', label: '样品来源' },
  { name: '{{sample.client}}', label: '委托方' },
  { name: '{{sample.receivedDate}}', label: '接收日期' },
  { name: '{{sample.sampleType}}', label: '样品类型' },
  { name: '{{sample.quantity}}', label: '样品数量' },
  { name: '{{sample.location}}', label: '当前位置' }
]

// 检测结果变量
const resultVariables = [
  { name: '{{result.testMethod}}', label: '检测方法' },
  { name: '{{result.testItems}}', label: '检测项目' },
  { name: '{{result.values}}', label: '检测结果' },
  { name: '{{result.units}}', label: '结果单位' },
  { name: '{{result.operator}}', label: '操作人员' },
  { name: '{{result.timestamp}}', label: '检测时间' },
  { name: '{{result.judgment}}', label: '质量判定' }
]

// 审核信息变量
const auditVariables = [
  { name: '{{audit.reviewer}}', label: '审核人' },
  { name: '{{audit.reviewDate}}', label: '审核日期' },
  { name: '{{audit.approver}}', label: '批准人' },
  { name: '{{audit.approveDate}}', label: '批准日期' },
  { name: '{{audit.comments}}', label: '审核意见' }
]

// 系统信息变量
const systemVariables = [
  { name: '{{system.reportNumber}}', label: '报告编号' },
  { name: '{{system.generateDate}}', label: '生成日期' },
  { name: '{{system.labName}}', label: '实验室名称' },
  { name: '{{system.labAddress}}', label: '实验室地址' },
  { name: '{{system.labPhone}}', label: '联系电话' }
]

// 预览对话框
const previewDialogVisible = ref(false)
const previewContent = ref('')

// 插入变量到编辑器
const insertVariable = (variableName: string) => {
  // 在光标位置插入变量
  const currentContent = formData.content
  formData.content = currentContent + ' ' + variableName + ' '
  
  ElMessage.success(`已插入变量: ${variableName}`)
}

// 生成预览内容（使用示例数据）
const generatePreviewContent = () => {
  let content = formData.content

  // 替换样品信息变量
  content = content.replace(/\{\{sample\.barcode\}\}/g, 'S2024010001')
  content = content.replace(/\{\{sample\.name\}\}/g, '饮用水样品')
  content = content.replace(/\{\{sample\.source\}\}/g, '某市自来水厂')
  content = content.replace(/\{\{sample\.client\}\}/g, '某市环保局')
  content = content.replace(/\{\{sample\.receivedDate\}\}/g, '2024-01-15')
  content = content.replace(/\{\{sample\.sampleType\}\}/g, '水质检测')
  content = content.replace(/\{\{sample\.quantity\}\}/g, '500ml')
  content = content.replace(/\{\{sample\.location\}\}/g, '检测室A-01')

  // 替换检测结果变量
  content = content.replace(/\{\{result\.testMethod\}\}/g, 'GB 5749-2022')
  content = content.replace(/\{\{result\.testItems\}\}/g, 'pH值、浊度、余氯')
  content = content.replace(/\{\{result\.values\}\}/g, '7.2, 0.5 NTU, 0.3 mg/L')
  content = content.replace(/\{\{result\.units\}\}/g, '-, NTU, mg/L')
  content = content.replace(/\{\{result\.operator\}\}/g, '张三')
  content = content.replace(/\{\{result\.timestamp\}\}/g, '2024-01-16 14:30:00')
  content = content.replace(/\{\{result\.judgment\}\}/g, '合格')

  // 替换审核信息变量
  content = content.replace(/\{\{audit\.reviewer\}\}/g, '李四')
  content = content.replace(/\{\{audit\.reviewDate\}\}/g, '2024-01-17')
  content = content.replace(/\{\{audit\.approver\}\}/g, '王五')
  content = content.replace(/\{\{audit\.approveDate\}\}/g, '2024-01-18')
  content = content.replace(/\{\{audit\.comments\}\}/g, '检测结果符合标准要求')

  // 替换系统信息变量
  content = content.replace(/\{\{system\.reportNumber\}\}/g, 'R2024010001')
  content = content.replace(/\{\{system\.generateDate\}\}/g, '2024-01-18')
  content = content.replace(/\{\{system\.labName\}\}/g, '某市环境检测中心')
  content = content.replace(/\{\{system\.labAddress\}\}/g, '某市某区某街道123号')
  content = content.replace(/\{\{system\.labPhone\}\}/g, '0123-12345678')

  return content
}

// 预览模板
const handlePreview = async () => {
  if (!formData.content) {
    ElMessage.warning('请先输入模板内容')
    return
  }

  previewContent.value = generatePreviewContent()
  previewDialogVisible.value = true
}

// 打印预览
const handlePrint = () => {
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>报告模板预览</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              line-height: 1.6;
            }
            h1, h2, h3 { color: #333; }
            table { border-collapse: collapse; width: 100%; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          ${previewContent.value}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }
}

// 保存草稿
const handleSaveDraft = async () => {
  try {
    await formRef.value?.validate()
    
    formData.status = 'draft'
    
    // 准备保存数据
    const saveData = {
      name: formData.name,
      category: formData.applicableTypes[0] || 'general',
      content: formData.content,
      variables: extractVariables(formData.content),
      isActive: false
    }
    
    if (isEditMode.value) {
      // 更新模板
      await http.put(`/report-templates/${formData.id}`, saveData)
    } else {
      // 创建新模板
      await http.post('/report-templates', saveData)
    }
    
    ElMessage.success('草稿保存成功')
  } catch (error: any) {
    console.error('保存草稿失败:', error)
    ElMessage.error(error.message || '保存草稿失败')
  }
}

// 保存并启用
const handleSave = async () => {
  try {
    await formRef.value?.validate()
    
    if (!formData.content) {
      ElMessage.warning('请输入模板内容')
      return
    }

    await ElMessageBox.confirm(
      '保存后模板将立即启用，是否继续？',
      '确认保存',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    formData.status = 'active'
    
    // 准备保存数据
    const saveData = {
      name: formData.name,
      category: formData.applicableTypes[0] || 'general',
      content: formData.content,
      variables: extractVariables(formData.content),
      isActive: true
    }
    
    if (isEditMode.value) {
      // 更新模板
      await http.put(`/report-templates/${formData.id}`, saveData)
    } else {
      // 创建新模板
      await http.post('/report-templates', saveData)
    }
    
    ElMessage.success('模板保存成功')
    
    // 返回列表页
    setTimeout(() => {
      router.push('/report/templates')
    }, 1000)
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('保存失败:', error)
      ElMessage.error(error.message || '保存失败')
    }
  }
}

// 提取模板中的变量
const extractVariables = (content: string): any[] => {
  const regex = /\{\{([^}]+)\}\}/g
  const matches = content.match(regex) || []
  const uniqueVars = [...new Set(matches)]
  
  // 将变量字符串转换为后端期望的对象格式
  return uniqueVars.map(varStr => {
    // 移除 {{ 和 }}
    const varName = varStr.replace(/\{\{|\}\}/g, '').trim()
    
    return {
      name: varName,  // 保持原始格式，包括点号
      type: 'string',
      description: varStr,
      required: false
    }
  })
}

// 取消
const handleCancel = () => {
  ElMessageBox.confirm(
    '确定要取消吗？未保存的内容将丢失',
    '确认取消',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    router.push('/report/templates')
  }).catch(() => {
    // 用户取消
  })
}

// 加载模板数据（编辑模式）
const loadTemplateData = async () => {
  if (isEditMode.value) {
    try {
      const template = await http.get(`/report-templates/${route.params.id}`)
      
      // 填充表单数据
      formData.id = template.id
      formData.name = template.name
      formData.version = `v${template.version}`
      formData.applicableTypes = [template.category]
      formData.description = template.description || ''
      formData.content = template.content
      formData.status = template.isActive ? 'active' : 'draft'
    } catch (error: any) {
      console.error('加载模板数据失败:', error)
      ElMessage.error(error.message || '加载模板数据失败')
      // 加载失败返回列表页
      router.push('/report/templates')
    }
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadTemplateData()
})
</script>

<style scoped lang="scss">
.report-template-editor {
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

  .config-card,
  .editor-card,
  .variables-card,
  .preview-card {
    margin-bottom: 20px;

    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 16px;
    }
  }

  .editor-container {
    :deep(.ql-container) {
      font-size: 14px;
    }

    :deep(.ql-editor) {
      min-height: 500px;
    }
  }

  .variables-content {
    .variable-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 12px 0;

      .variable-tag {
        cursor: pointer;
        transition: all 0.3s;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
      }
    }
  }

  .preview-container {
    .preview-content {
      padding: 20px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      background-color: #fff;
      min-height: 400px;
      max-height: 600px;
      overflow-y: auto;

      :deep(h1) {
        font-size: 24px;
        margin-bottom: 16px;
      }

      :deep(h2) {
        font-size: 20px;
        margin-bottom: 12px;
      }

      :deep(p) {
        margin-bottom: 8px;
        line-height: 1.6;
      }

      :deep(table) {
        width: 100%;
        border-collapse: collapse;
        margin: 16px 0;

        th,
        td {
          border: 1px solid #dcdfe6;
          padding: 8px;
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
</style>

