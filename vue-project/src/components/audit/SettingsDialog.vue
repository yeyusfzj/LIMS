<template>
  <el-dialog
    :model-value="visible"
    title="审核设置"
    :width="isMobile ? '100%' : '800px'"
    :fullscreen="isMobile"
    :close-on-click-modal="false"
    @update:model-value="handleVisibleChange"
    @close="handleClose"
  >
    <el-tabs v-model="activeTab" class="settings-tabs">
      <el-tab-pane label="审核意见模板" name="templates">
        <TemplateManager
          ref="templateManagerRef"
          @change="handleTemplateChange"
        />
      </el-tab-pane>

      <el-tab-pane label="审核流程配置" name="workflow">
        <WorkflowConfigManager
          ref="workflowConfigManagerRef"
          @change="handleWorkflowChange"
        />
      </el-tab-pane>
    </el-tabs>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import TemplateManager from './TemplateManager.vue'
import WorkflowConfigManager from './WorkflowConfigManager.vue'

interface Props {
  visible: boolean
  defaultTab?: 'templates' | 'workflow'
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'saved'): void
}

const props = withDefaults(defineProps<Props>(), {
  defaultTab: 'templates'
})

const emit = defineEmits<Emits>()

// 状态
const activeTab = ref<'templates' | 'workflow'>(props.defaultTab)
const templateManagerRef = ref<InstanceType<typeof TemplateManager>>()
const workflowConfigManagerRef = ref<InstanceType<typeof WorkflowConfigManager>>()

// 响应式判断
const isMobile = computed(() => {
  return window.innerWidth < 768
})

// 可见性变化
const handleVisibleChange = (value: boolean) => {
  emit('update:visible', value)
}

// 关闭对话框
const handleClose = () => {
  emit('update:visible', false)
}

// 模板变化
const handleTemplateChange = () => {
  emit('saved')
}

// 流程配置变化
const handleWorkflowChange = () => {
  emit('saved')
}

// 监听默认标签页变化
watch(() => props.defaultTab, (newTab) => {
  activeTab.value = newTab
})

// 监听对话框打开，刷新数据
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    // 刷新当前标签页的数据
    if (activeTab.value === 'templates' && templateManagerRef.value) {
      templateManagerRef.value.refresh()
    } else if (activeTab.value === 'workflow' && workflowConfigManagerRef.value) {
      workflowConfigManagerRef.value.refresh()
    }
  }
})

// 暴露方法给父组件
defineExpose({
  refreshTemplates: () => {
    templateManagerRef.value?.refresh()
  },
  refreshWorkflow: () => {
    workflowConfigManagerRef.value?.refresh()
  }
})
</script>

<style scoped>
.settings-tabs {
  min-height: 500px;
}

.settings-tabs :deep(.el-tabs__content) {
  padding: 16px 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}

/* 移动端全屏样式 */
@media (max-width: 768px) {
  .settings-tabs {
    min-height: calc(100vh - 200px);
  }
}
</style>
