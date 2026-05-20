<template>
  <div class="audit-debug">
    <el-card>
      <template #header>
        <span>审核任务数据调试</span>
      </template>

      <el-form inline>
        <el-form-item label="任务ID">
          <el-input v-model="taskId" placeholder="输入审核任务ID" style="width: 400px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadTask">加载数据</el-button>
        </el-form-item>
      </el-form>

      <el-divider />

      <div v-if="loading" v-loading="loading" style="min-height: 200px"></div>

      <div v-else-if="taskData">
        <h3>原始API响应数据：</h3>
        <pre style="background: #f5f5f5; padding: 15px; border-radius: 4px; overflow: auto; max-height: 600px;">{{ JSON.stringify(taskData, null, 2) }}</pre>

        <el-divider />

        <h3>数据路径验证：</h3>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="taskData 存在">
            <el-tag :type="taskData ? 'success' : 'danger'">{{ taskData ? '是' : '否' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="taskData.task 存在">
            <el-tag :type="taskData?.task ? 'success' : 'danger'">{{ taskData?.task ? '是' : '否' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="taskData.task.instance 存在">
            <el-tag :type="taskData?.task?.instance ? 'success' : 'danger'">{{ taskData?.task?.instance ? '是' : '否' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="taskData.task.instance.sample 存在">
            <el-tag :type="taskData?.task?.instance?.sample ? 'success' : 'danger'">{{ taskData?.task?.instance?.sample ? '是' : '否' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="taskData.task.instance.sample.results 存在">
            <el-tag :type="taskData?.task?.instance?.sample?.results ? 'success' : 'danger'">{{ taskData?.task?.instance?.sample?.results ? '是' : '否' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="检测结果数量">
            {{ taskData?.task?.instance?.sample?.results?.length || 0 }} 条
          </el-descriptions-item>
        </el-descriptions>

        <el-divider />

        <h3>样品信息（task.instance.sample）：</h3>
        <el-descriptions v-if="taskData?.task?.instance?.sample" :column="2" border>
          <el-descriptions-item label="样品ID">{{ taskData.task.instance.sample.id }}</el-descriptions-item>
          <el-descriptions-item label="样品条码">{{ taskData.task.instance.sample.barcode }}</el-descriptions-item>
          <el-descriptions-item label="样品名称">{{ taskData.task.instance.sample.sampleName }}</el-descriptions-item>
          <el-descriptions-item label="样品类型">{{ taskData.task.instance.sample.sampleType }}</el-descriptions-item>
          <el-descriptions-item label="客户名称">{{ taskData.task.instance.sample.clientName }}</el-descriptions-item>
          <el-descriptions-item label="样品状态">{{ taskData.task.instance.sample.status }}</el-descriptions-item>
        </el-descriptions>
        <el-alert v-else type="warning" :closable="false">
          样品信息不存在
        </el-alert>

        <el-divider />

        <h3>检测结果（task.instance.sample.results）：</h3>
        <el-table
          v-if="taskData?.task?.instance?.sample?.results && taskData.task.instance.sample.results.length > 0"
          :data="taskData.task.instance.sample.results"
          border
          stripe
        >
          <el-table-column prop="parameter" label="检测项目" width="200" />
          <el-table-column prop="value" label="检测值" width="120" />
          <el-table-column prop="textValue" label="文本值" width="150" />
          <el-table-column prop="unit" label="单位" width="80" />
          <el-table-column prop="method" label="检测方法" min-width="150" />
          <el-table-column prop="source" label="来源" width="100" />
          <el-table-column prop="isAbnormal" label="是否异常" width="100">
            <template #default="{ row }">
              <el-tag :type="row.isAbnormal ? 'danger' : 'success'" size="small">
                {{ row.isAbnormal ? '异常' : '正常' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="enteredBy" label="录入人" width="120" />
        </el-table>
        <el-alert v-else type="warning" :closable="false">
          检测结果不存在或为空
        </el-alert>
      </div>

      <el-empty v-else description="请输入任务ID并点击加载数据" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { auditService } from '@/services/auditService'

const taskId = ref('67f2d198-f44e-4e36-be0c-b5f1c6bac890')
const loading = ref(false)
const taskData = ref<any>(null)

const loadTask = async () => {
  if (!taskId.value) {
    ElMessage.warning('请输入任务ID')
    return
  }

  loading.value = true
  taskData.value = null

  try {
    console.log('[AuditDebug] 开始加载任务:', taskId.value)
    const data = await auditService.getAuditTask(taskId.value)
    console.log('[AuditDebug] 加载成功:', data)
    taskData.value = data
    ElMessage.success('数据加载成功')
  } catch (error: any) {
    console.error('[AuditDebug] 加载失败:', error)
    ElMessage.error(error?.message || '加载失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.audit-debug {
  padding: 20px;
}

pre {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
}
</style>
