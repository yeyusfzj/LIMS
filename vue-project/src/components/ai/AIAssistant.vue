<template>
  <div class="ai-assistant" :class="{ 'is-float': mode === 'float' }">
    <!-- 头部 -->
    <div class="ai-header">
      <div class="ai-title">
        <el-icon class="ai-icon"><Service /></el-icon>
        <span>AI智能助手</span>
        <el-tag size="small" type="info" effect="plain">Beta</el-tag>
      </div>
      <div class="header-actions">
        <el-button text @click="clearMessages" title="清空对话">
          <el-icon><Delete /></el-icon>
        </el-button>
        <el-button v-if="mode === 'float'" text @click="$emit('close')" title="关闭">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
    </div>

    <!-- 消息列表 -->
    <div class="message-list" ref="messageListRef">
      <div v-if="messages.length === 0" class="empty-state">
        <el-icon :size="60" color="#909399"><ChatDotRound /></el-icon>
        <p>您好!我是实验室智能助手</p>
        <p class="empty-subtitle">有什么可以帮助您的吗?</p>
      </div>

      <MessageItem 
        v-for="msg in messages" 
        :key="msg.id"
        :message="msg"
      />

      <!-- AI输入中提示 -->
      <div v-if="isTyping" class="typing-indicator">
        <div class="typing-avatar">
          <el-icon><Service /></el-icon>
        </div>
        <div class="typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <QuickActions 
      v-if="messages.length === 0"
      @select="handleQuickAction" 
    />

    <!-- 输入框 -->
    <div class="input-area">
      <el-input
        v-model="inputText"
        type="textarea"
        :rows="2"
        :maxlength="500"
        show-word-limit
        placeholder="输入您的问题... (Ctrl+Enter发送)"
        @keydown.enter.ctrl="sendMessage"
        @keydown.enter.exact.prevent="sendMessage"
        :disabled="isTyping"
      />
      <el-button 
        type="primary" 
        @click="sendMessage"
        :loading="isTyping"
        :disabled="!inputText.trim()"
      >
        <el-icon v-if="!isTyping"><Promotion /></el-icon>
        <span>{{ isTyping ? '思考中...' : '发送' }}</span>
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, watch } from 'vue'
import { Service, Close, Delete, ChatDotRound, Promotion } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import MessageItem from './MessageItem.vue'
import QuickActions from './QuickActions.vue'
import { mockAIResponse } from '@/services/ai-mock'
import type { Message } from '@/types/ai'

interface Props {
  mode?: 'float' | 'page' | 'embed'
  height?: string
  context?: any
  initialMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'float',
  height: '600px'
})

const emit = defineEmits(['close'])

// 状态
const messages = ref<Message[]>([])
const inputText = ref('')
const isTyping = ref(false)
const messageListRef = ref<HTMLElement>()

// 发送消息
const sendMessage = async () => {
  const text = inputText.value.trim()
  if (!text || isTyping.value) return

  // 添加用户消息
  const userMessage: Message = {
    id: `user-${Date.now()}`,
    type: 'user',
    content: text,
    timestamp: new Date()
  }
  messages.value.push(userMessage)
  inputText.value = ''

  // 滚动到底部
  await nextTick()
  scrollToBottom()

  // 显示AI思考状态
  isTyping.value = true

  try {
    // 调用AI服务
    const response = await mockAIResponse(text, props.context)

    // 添加AI响应
    const aiMessage: Message = {
      id: `ai-${Date.now()}`,
      type: 'ai',
      content: response.data.message,
      timestamp: new Date(),
      data: response.data.analysis
    }
    messages.value.push(aiMessage)

    // 滚动到底部
    await nextTick()
    scrollToBottom()
  } catch (error) {
    console.error('AI响应错误:', error)
    ElMessage.error('AI助手暂时无法响应,请稍后再试')
  } finally {
    isTyping.value = false
  }
}

// 处理快捷操作
const handleQuickAction = (prompt: string) => {
  inputText.value = prompt
  sendMessage()
}

// 清空消息
const clearMessages = () => {
  messages.value = []
  ElMessage.success('对话已清空')
}

// 滚动到底部
const scrollToBottom = () => {
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

// 监听初始消息
watch(() => props.initialMessage, (newMessage) => {
  if (newMessage) {
    inputText.value = newMessage
    sendMessage()
  }
}, { immediate: true })

// 监听上下文变化
watch(() => props.context, (newContext) => {
  if (newContext && messages.value.length === 0) {
    // 如果有上下文且没有消息,可以自动发送问候
    // 这里可以根据需要实现
  }
})

onMounted(() => {
  // 组件挂载后的初始化
})
</script>

<style scoped>
.ai-assistant {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #ffffff;
  border-radius: 8px;
  overflow: hidden;
}

.ai-assistant.is-float {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

/* 头部 */
.ai-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.ai-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
}

.ai-icon {
  font-size: 24px;
}

.header-actions {
  display: flex;
  gap: 5px;
}

.header-actions .el-button {
  color: white;
}

.header-actions .el-button:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

/* 消息列表 */
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background-color: #f5f7fa;
}

.message-list::-webkit-scrollbar {
  width: 6px;
}

.message-list::-webkit-scrollbar-thumb {
  background-color: #dcdfe6;
  border-radius: 3px;
}

.message-list::-webkit-scrollbar-thumb:hover {
  background-color: #c0c4cc;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #909399;
  text-align: center;
}

.empty-state p {
  margin: 10px 0 0 0;
  font-size: 16px;
}

.empty-subtitle {
  font-size: 14px !important;
  color: #c0c4cc !important;
}

/* AI输入中动画 */
.typing-indicator {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 15px;
  animation: slideIn 0.3s ease-out;
}

.typing-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.typing-dots {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.typing-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #667eea;
  animation: typing 1.4s infinite;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.7;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
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

/* 输入区域 */
.input-area {
  display: flex;
  gap: 10px;
  padding: 16px 20px;
  background-color: white;
  border-top: 1px solid #e4e7ed;
}

.input-area .el-textarea {
  flex: 1;
}

.input-area .el-button {
  align-self: flex-end;
  height: 40px;
}

/* 响应式 */
@media (max-width: 768px) {
  .ai-header {
    padding: 12px 16px;
  }

  .message-list {
    padding: 16px;
  }

  .input-area {
    padding: 12px 16px;
  }
}
</style>
