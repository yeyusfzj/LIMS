<template>
  <div class="quick-actions">
    <div class="quick-actions-title">
      <el-icon><MagicStick /></el-icon>
      <span>快捷操作</span>
    </div>
    <div class="actions-grid">
      <div
        v-for="action in quickActions"
        :key="action.id"
        class="action-item"
        :style="{ '--action-color': action.color }"
        @click="handleSelect(action)"
      >
        <div class="action-icon">
          <el-icon>
            <component :is="action.icon" />
          </el-icon>
        </div>
        <div class="action-label">{{ action.label }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { 
  MagicStick, 
  DataAnalysis, 
  Warning, 
  TrendCharts, 
  Document, 
  Setting 
} from '@element-plus/icons-vue'
import { quickActions } from '@/services/ai-mock'

const emit = defineEmits(['select'])

const handleSelect = (action: any) => {
  emit('select', action.prompt)
}
</script>

<style scoped>
.quick-actions {
  padding: 16px 20px;
  background-color: white;
  border-top: 1px solid #e4e7ed;
}

.quick-actions-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 12px;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  border-radius: 8px;
  background-color: #f5f7fa;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.action-item:hover {
  background-color: var(--action-color, #667eea);
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.action-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: rgba(102, 126, 234, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--action-color, #667eea);
  margin-bottom: 8px;
  transition: all 0.3s;
}

.action-item:hover .action-icon {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
}

.action-label {
  font-size: 12px;
  text-align: center;
  color: #606266;
  transition: color 0.3s;
}

.action-item:hover .action-label {
  color: white;
}

/* 响应式 */
@media (max-width: 768px) {
  .actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .actions-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .action-item {
    padding: 10px 6px;
  }

  .action-icon {
    width: 36px;
    height: 36px;
    font-size: 18px;
  }

  .action-label {
    font-size: 11px;
  }
}
</style>
