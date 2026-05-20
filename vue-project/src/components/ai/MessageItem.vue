<template>
  <div class="message-item" :class="`message-${message.type}`">
    <!-- 用户消息 -->
    <template v-if="message.type === 'user'">
      <div class="message-content user-message">
        <div class="message-text">{{ message.content }}</div>
        <div class="message-time">{{ formatTime(message.timestamp) }}</div>
      </div>
      <div class="message-avatar user-avatar">
        <el-icon><User /></el-icon>
      </div>
    </template>

    <!-- AI消息 -->
    <template v-else-if="message.type === 'ai'">
      <div class="message-avatar ai-avatar">
        <el-icon><Service /></el-icon>
      </div>
      <div class="message-content ai-message">
        <div class="message-text">{{ message.content }}</div>
        
        <!-- 分析数据展示 -->
        <AnalysisResult 
          v-if="message.data" 
          :data="message.data"
          class="analysis-result"
        />
        
        <div class="message-time">{{ formatTime(message.timestamp) }}</div>
      </div>
    </template>

    <!-- 系统消息 -->
    <template v-else>
      <div class="system-message">
        <el-icon><InfoFilled /></el-icon>
        <span>{{ message.content }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { User, Service, InfoFilled } from '@element-plus/icons-vue'
import AnalysisResult from './AnalysisResult.vue'
import type { Message } from '@/types/ai'

interface Props {
  message: Message
}

defineProps<Props>()

// 格式化时间
const formatTime = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  // 小于1分钟
  if (diff < 60000) {
    return '刚刚'
  }
  
  // 小于1小时
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`
  }
  
  // 小于24小时
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`
  }
  
  // 显示具体时间
  return date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}
</script>

<style scoped>
.message-item {
  display: flex;
  margin-bottom: 20px;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 用户消息 */
.message-user {
  justify-content: flex-end;
}

.user-message {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  margin-left: 60px;
}

.user-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  margin-left: 10px;
}

/* AI消息 */
.message-ai {
  justify-content: flex-start;
}

.ai-message {
  background-color: white;
  color: #303133;
  margin-right: 60px;
}

.ai-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  margin-right: 10px;
}

/* 消息头像 */
.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 18px;
}

/* 消息内容 */
.message-content {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  word-wrap: break-word;
}

.message-text {
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.message-time {
  font-size: 12px;
  margin-top: 8px;
  opacity: 0.7;
}

.user-message .message-time {
  text-align: right;
}

/* 分析结果 */
.analysis-result {
  margin-top: 12px;
}

/* 系统消息 */
.system-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: #f0f2f5;
  border-radius: 16px;
  color: #909399;
  font-size: 13px;
  margin: 0 auto 20px;
  max-width: 80%;
}

/* 响应式 */
@media (max-width: 768px) {
  .message-content {
    max-width: 85%;
  }

  .user-message {
    margin-left: 40px;
  }

  .ai-message {
    margin-right: 40px;
  }
}
</style>
