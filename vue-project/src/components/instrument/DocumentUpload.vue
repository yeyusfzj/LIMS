<template>
  <div class="document-upload">
    <!-- 上传区域 -->
    <el-upload
      ref="uploadRef"
      :action="uploadAction"
      :headers="uploadHeaders"
      :data="uploadData"
      :before-upload="beforeUpload"
      :on-success="handleSuccess"
      :on-error="handleError"
      :file-list="fileList"
      :limit="10"
      multiple
      drag
    >
      <el-icon class="el-icon--upload"><upload-filled /></el-icon>
      <div class="el-upload__text">
        将文件拖到此处,或<em>点击上传</em>
      </div>
      <template #tip>
        <div class="el-upload__tip">
          支持 PDF、Word、Excel、图片格式,单个文件不超过 20MB
        </div>
      </template>
    </el-upload>

    <!-- 文档类型和描述 -->
    <el-form :model="uploadForm" label-width="100px" style="margin-top: 20px">
      <el-form-item label="文档类型">
        <el-select v-model="uploadForm.documentType" placeholder="请选择文档类型">
          <el-option label="说明书" value="manual" />
          <el-option label="合格证" value="certificate" />
          <el-option label="照片" value="photo" />
          <el-option label="报告" value="report" />
          <el-option label="其他" value="other" />
        </el-select>
      </el-form-item>
      
      <el-form-item label="文档描述">
        <el-input
          v-model="uploadForm.description"
          type="textarea"
          :rows="2"
          placeholder="请输入文档描述"
        />
      </el-form-item>
    </el-form>

    <!-- 已上传文档列表 -->
    <el-divider>已上传文档</el-divider>
    
    <el-table v-loading="loading" :data="documents" stripe>
      <el-table-column prop="fileName" label="文件名" min-width="200" show-overflow-tooltip />
      <el-table-column prop="documentType" label="类型" width="100">
        <template #default="{ row }">
          {{ getDocumentTypeLabel(row.documentType) }}
        </template>
      </el-table-column>
      <el-table-column prop="fileSize" label="大小" width="100">
        <template #default="{ row }">
          {{ formatFileSize(row.fileSize) }}
        </template>
      </el-table-column>
      <el-table-column prop="uploadedAt" label="上传时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.uploadedAt) }}
        </template>
      </el-table-column>
      <el-table-column prop="uploadedBy" label="上传人" width="100" />
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="handleDownload(row)">
            下载
          </el-button>
          <el-button link type="danger" size="small" @click="handleDelete(row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type UploadInstance } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import instrumentService from '@/services/instrumentService'
import { useAuthStore } from '@/stores/auth'
import type { InstrumentDocument } from '@/types/instrument'

interface Props {
  instrumentId: string
}

interface Emits {
  (e: 'uploaded'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const authStore = useAuthStore()
const uploadRef = ref<UploadInstance>()

// 加载状态
const loading = ref(false)

// 文档列表
const documents = ref<InstrumentDocument[]>([])

// 文件列表
const fileList = ref<any[]>([])

// 上传表单
const uploadForm = reactive({
  documentType: 'other',
  description: ''
})

// 上传地址
const uploadAction = computed(() => {
  return `${import.meta.env.VITE_API_BASE_URL}/instruments/${props.instrumentId}/documents`
})

// 上传请求头
const uploadHeaders = computed(() => {
  return {
    Authorization: `Bearer ${authStore.token}`
  }
})

// 上传数据
const uploadData = computed(() => {
  return {
    documentType: uploadForm.documentType,
    description: uploadForm.description
  }
})

// 上传前验证
const beforeUpload = (file: File) => {
  // 验证文件类型
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
  
  if (!allowedTypes.includes(file.type)) {
    ElMessage.error('不支持的文件类型')
    return false
  }
  
  // 验证文件大小 (20MB)
  const maxSize = 20 * 1024 * 1024
  if (file.size > maxSize) {
    ElMessage.error('文件大小不能超过 20MB')
    return false
  }
  
  return true
}

// 上传成功
const handleSuccess = (response: any, file: any) => {
  ElMessage.success('上传成功')
  
  // 清空文件列表
  fileList.value = []
  
  // 重新加载文档列表
  loadDocuments()
  
  // 触发上传事件
  emit('uploaded')
}

// 上传失败
const handleError = (error: any) => {
  ElMessage.error('上传失败: ' + error.message)
}

// 加载文档列表
const loadDocuments = async () => {
  loading.value = true
  try {
    documents.value = await instrumentService.getInstrumentDocuments(props.instrumentId)
  } catch (error: any) {
    ElMessage.error(error.message || '加载文档列表失败')
  } finally {
    loading.value = false
  }
}

// 下载文档
const handleDownload = async (row: InstrumentDocument) => {
  try {
    const blob = await instrumentService.downloadDocument(row.id)
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = row.fileName
    link.click()
    window.URL.revokeObjectURL(url)
    ElMessage.success('下载成功')
  } catch (error: any) {
    ElMessage.error(error.message || '下载失败')
  }
}

// 删除文档
const handleDelete = async (row: InstrumentDocument) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除文档 "${row.fileName}" 吗?`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await instrumentService.deleteDocument(row.id)
    ElMessage.success('删除成功')
    loadDocuments()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

// 获取文档类型标签
const getDocumentTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    manual: '说明书',
    certificate: '合格证',
    photo: '照片',
    report: '报告',
    other: '其他'
  }
  return labels[type] || type
}

// 格式化文件大小
const formatFileSize = (size: number): string => {
  if (size < 1024) {
    return size + ' B'
  } else if (size < 1024 * 1024) {
    return (size / 1024).toFixed(2) + ' KB'
  } else {
    return (size / (1024 * 1024)).toFixed(2) + ' MB'
  }
}

// 格式化日期
const formatDate = (date: string): string => {
  return new Date(date).toLocaleString('zh-CN')
}

// 组件挂载时加载文档列表
onMounted(() => {
  loadDocuments()
})
</script>

<style scoped>
.document-upload {
  width: 100%;
}

.el-icon--upload {
  font-size: 67px;
  color: #8c939d;
  margin: 40px 0 16px;
  line-height: 50px;
}

.el-upload__text {
  color: #606266;
  font-size: 14px;
  text-align: center;
}

.el-upload__text em {
  color: #409eff;
  font-style: normal;
}

.el-upload__tip {
  font-size: 12px;
  color: #606266;
  margin-top: 7px;
}
</style>
