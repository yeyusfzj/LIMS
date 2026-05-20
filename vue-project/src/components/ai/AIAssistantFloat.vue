<template>
  <div class="ai-assistant-float">
    <!-- 悬浮助手按钮 -->
    <transition name="float-button">
      <div 
        v-if="!isOpen"
        class="float-button"
        :class="{ 'has-notification': hasUnreadMessages }"
        @click="openAssistant"
      >
        <el-icon class="ai-icon" :size="28">
          <ChatDotRound />
        </el-icon>
        <div v-if="hasUnreadMessages" class="notification-badge">{{ unreadCount }}</div>
        <div class="pulse-ring"></div>
      </div>
    </transition>

    <!-- AI助手对话窗口 -->
    <transition name="assistant-panel">
      <div v-if="isOpen" class="assistant-panel">
        <!-- 头部 -->
        <div class="panel-header">
          <div class="header-left">
            <div class="ai-avatar">
              <el-icon :size="20"><ChatDotRound /></el-icon>
            </div>
            <div class="header-info">
              <div class="header-title">AI智能助手</div>
              <div class="header-status">
                <span class="status-dot"></span>
                在线
              </div>
            </div>
          </div>
          <div class="header-actions">
            <el-tooltip content="最小化" placement="top">
              <el-icon class="action-icon" @click="minimizeAssistant">
                <Minus />
              </el-icon>
            </el-tooltip>
            <el-tooltip content="关闭" placement="top">
              <el-icon class="action-icon" @click="closeAssistant">
                <Close />
              </el-icon>
            </el-tooltip>
          </div>
        </div>

        <!-- AI助手主组件 -->
        <div class="panel-body">
          <AIAssistant 
            :initial-context="dashboardContext"
            @message-sent="handleMessageSent"
          />
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ChatDotRound, Close, Minus } from '@element-plus/icons-vue'
import AIAssistant from './AIAssistant.vue'
import { aiContextService } from '@/services/ai-context'
import type { DashboardContext } from '@/types/ai'

// 助手状态
const isOpen = ref(false)
const hasUnreadMessages = ref(false)
const unreadCount = ref(0)
const dashboardContext = ref<DashboardContext | null>(null)

// 打开助手
const openAssistant = () => {
  isOpen.value = true
  hasUnreadMessages.value = false
  unreadCount.value = 0
  
  // 收集主页上下文
  collectDashboardContext()
}

// 关闭助手
const closeAssistant = () => {
  isOpen.value = false
}

// 最小化助手
const minimizeAssistant = () => {
  isOpen.value = false
}

// 收集主页上下文
const collectDashboardContext = () => {
  try {
    dashboardContext.value = aiContextService.collectDashboardContext()
  } catch (error) {
    console.error('Failed to collect dashboard context:', error)
  }
}

// 处理消息发送
const handleMessageSent = () => {
  // 可以在这里添加消息发送后的逻辑
}

// 组件挂载时的初始化
onMounted(() => {
  // 可以在这里添加初始化逻辑,比如检查是否有新消息
})
</script>

<style scoped>
.ai-assistant-float {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 9999;
}

/* 悬浮按钮 */
.float-button {
  position: relative;
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.float-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 30px rgba(102, 126, 234, 0.6);
}

.float-button:active {
  transform: scale(0.95);
}

.ai-icon {
  color: white;
}

/* 脉冲动画 */
.pulse-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid #667eea;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  opacity: 0;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

/* 通知徽章 */
.notification-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  background-color: #f56c6c;
  color: white;
  font-size: 12px;
  font-weight: bold;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  box-shadow: 0 2px 8px rgba(245, 108, 108, 0.4);
}

/* 助手面板 */
.assistant-panel {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 420px;
  height: 680px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 面板头部 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-avatar {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  opacity: 0.9;
}

.status-dot {
  width: 6px;
  height: 6px;
  background-color: #67c23a;
  border-radius: 50%;
  animation: blink 2s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.header-actions {
  display: flex;
  gap: 12px;
}

.action-icon {
  font-size: 18px;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.3s;
}

.action-icon:hover {
  opacity: 1;
}

/* 面板主体 */
.panel-body {
  flex: 1;
  overflow: hidden;
}

/* 过渡动画 */
.float-button-enter-active,
.float-button-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.float-button-enter-from,
.float-button-leave-to {
  opacity: 0;
  transform: scale(0.5);
}

.assistant-panel-enter-active {
  animation: slideInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.assistant-panel-leave-active {
  animation: slideOutDown 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes slideOutDown {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
}

/* 响应式适配 */
@media (max-width: 768px) {
  .assistant-panel {
    width: calc(100vw - 32px);
    height: calc(100vh - 100px);
    bottom: 16px;
    right: 16px;
  }

  .float-button {
    width: 56px;
    height: 56px;
  }
}
</style>
