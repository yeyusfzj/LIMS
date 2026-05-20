<template>
  <el-popover
    :visible="visible"
    :width="isMobile ? '100%' : 400"
    placement="bottom-start"
    trigger="manual"
    popper-class="template-selector-popover"
    @update:visible="handleVisibleChange"
  >
    <template #reference>
      <slot name="trigger">
        <el-button type="primary" :icon="Document" @click="handleOpen">
          选择模板
        </el-button>
      </slot>
    </template>

    <div class="template-selector">
      <!-- 搜索框 -->
      <el-input
        v-if="showSearch"
        v-model="searchKeyword"
        placeholder="搜索模板名称或内容"
        clearable
        :prefix-icon="Search"
        class="search-input"
        @keydown.up.prevent="handleKeyUp"
        @keydown.down.prevent="handleKeyDown"
        @keydown.enter.prevent="handleKeyEnter"
        @keydown.esc="handleClose"
      />

      <!-- 模板列表 -->
      <div v-loading="loading" class="template-list">
        <div
          v-for="(template, index) in filteredTemplates"
          :key="template.id"
          :class="['template-item', { active: selectedIndex === index }]"
          @click="handleSelect(template)"
          @mouseenter="selectedIndex = index"
        >
          <div class="template-header">
            <span class="template-name">{{ template.name }}</span>
            <el-tag :type="getTypeTagType(template.type)" size="small" effect="plain">
              {{ getTypeName(template.type) }}
            </el-tag>
          </div>
          <div class="template-preview">{{ template.content }}</div>
          <div v-if="template.isDefault" class="template-badge">
            <el-icon><Star /></el-icon>
            默认
          </div>
        </div>

        <!-- 空状态 -->
        <el-empty
          v-if="!loading && filteredTemplates.length === 0"
          description="暂无模板"
          :image-size="80"
        />
      </div>

      <!-- 底部操作 -->
      <div class="template-footer">
        <el-text size="small" type="info">
          共 {{ filteredTemplates.length }} 个模板
        </el-text>
        <el-button size="small" text @click="handleClose">
          取消
        </el-button>
      </div>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Document, Search, Star } from '@element-plus/icons-vue'
import { useTemplateStore, type CommentTemplate } from '@/stores/template'
import { ElMessage } from 'element-plus'

interface Props {
  auditType?: 'approved' | 'need_revision' | 'rejected' | 'other'
  showSearch?: boolean
  maxDisplay?: number
}

interface Emits {
  (e: 'select', template: CommentTemplate): void
  (e: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  showSearch: true,
  maxDisplay: 10
})

const emit = defineEmits<Emits>()

const templateStore = useTemplateStore()

// 状态
const visible = ref(false)
const searchKeyword = ref('')
const selectedIndex = ref(0)
const loading = ref(false)

// 响应式判断
const isMobile = computed(() => {
  return window.innerWidth < 768
})

// 过滤后的模板列表
const filteredTemplates = computed(() => {
  let templates = templateStore.templates

  // 按审核类型过滤
  if (props.auditType) {
    templates = templates.filter(t => t.type === props.auditType)
  }

  // 按关键词搜索
  if (searchKeyword.value) {
    templates = templateStore.searchTemplates(searchKeyword.value)
  }

  // 限制显示数量
  if (props.maxDisplay && templates.length > props.maxDisplay) {
    templates = templates.slice(0, props.maxDisplay)
  }

  return templates
})

// 获取类型名称
const getTypeName = (type: string): string => {
  const names: Record<string, string> = {
    approved: '通过',
    need_revision: '需修改',
    rejected: '不通过',
    other: '其他'
  }
  return names[type] || type
}

// 获取类型标签类型
const getTypeTagType = (type: string): 'success' | 'warning' | 'danger' | 'info' => {
  const types: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
    approved: 'success',
    need_revision: 'warning',
    rejected: 'danger',
    other: 'info'
  }
  return types[type] || 'info'
}

// 打开选择器
const handleOpen = async () => {
  visible.value = true
  loading.value = true
  
  try {
    await templateStore.fetchTemplates()
  } catch (error) {
    ElMessage.error('加载模板失败')
  } finally {
    loading.value = false
  }
}

// 关闭选择器
const handleClose = () => {
  visible.value = false
  searchKeyword.value = ''
  selectedIndex.value = 0
  emit('close')
}

// 可见性变化
const handleVisibleChange = (val: boolean) => {
  if (!val) {
    handleClose()
  }
}

// 选择模板
const handleSelect = (template: CommentTemplate) => {
  emit('select', template)
  handleClose()
}

// 键盘导航 - 上
const handleKeyUp = () => {
  if (selectedIndex.value > 0) {
    selectedIndex.value--
  }
}

// 键盘导航 - 下
const handleKeyDown = () => {
  if (selectedIndex.value < filteredTemplates.value.length - 1) {
    selectedIndex.value++
  }
}

// 键盘导航 - 回车
const handleKeyEnter = () => {
  if (filteredTemplates.value[selectedIndex.value]) {
    handleSelect(filteredTemplates.value[selectedIndex.value])
  }
}

// 监听搜索关键词变化，重置选中索引
watch(searchKeyword, () => {
  selectedIndex.value = 0
})

// 暴露方法给父组件
defineExpose({
  open: handleOpen,
  close: handleClose
})
</script>

<style scoped>
.template-selector {
  display: flex;
  flex-direction: column;
  max-height: 500px;
}

.search-input {
  margin-bottom: 12px;
}

.template-list {
  flex: 1;
  overflow-y: auto;
  min-height: 200px;
  max-height: 400px;
}

.template-item {
  position: relative;
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.template-item:hover,
.template-item.active {
  border-color: var(--el-color-primary);
  background-color: var(--el-color-primary-light-9);
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.template-name {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.template-preview {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  white-space: pre-wrap;
}

.template-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--el-color-warning);
}

.template-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  margin-top: 12px;
  border-top: 1px solid var(--el-border-color-light);
}

/* 移动端全屏样式 */
@media (max-width: 768px) {
  :deep(.template-selector-popover) {
    width: 100vw !important;
    max-width: 100vw !important;
    left: 0 !important;
    right: 0 !important;
  }
  
  .template-selector {
    max-height: 80vh;
  }
}
</style>
