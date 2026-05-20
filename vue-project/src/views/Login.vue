<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1>实验室智能管理系统</h1>
        <p>Laboratory Intelligent Management System</p>
      </div>
      
      <!-- 限流提示区域 -->
      <div v-if="rateLimitInfo.isActive" class="rate-limit-notice">
        <el-alert
          :title="rateLimitInfo.title"
          type="warning"
          :closable="false"
          show-icon
        >
          <template #default>
            <div class="rate-limit-content">
              <p>{{ rateLimitInfo.message }}</p>
              <div class="countdown-display">
                <el-icon class="countdown-icon"><Clock /></el-icon>
                <span class="countdown-text">剩余时间：{{ formatCountdown(rateLimitInfo.remainingTime) }}</span>
              </div>
              <div class="rate-limit-actions">
                <el-checkbox v-model="rateLimitInfo.autoRetry" size="small">
                  倒计时结束后自动重试
                </el-checkbox>
              </div>
            </div>
          </template>
        </el-alert>
      </div>
      
      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
            size="large"
            :prefix-icon="User"
            :disabled="rateLimitInfo.isActive"
            clearable
          />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            :prefix-icon="Lock"
            :disabled="rateLimitInfo.isActive"
            show-password
            clearable
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        
        <el-form-item>
          <el-checkbox v-model="loginForm.rememberMe" :disabled="rateLimitInfo.isActive">
            记住我
          </el-checkbox>
        </el-form-item>
        
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :disabled="loading || rateLimitInfo.isActive"
            class="login-button"
            @click="handleLogin"
          >
            {{ getLoginButtonText() }}
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="login-footer">
        <p>默认账号：admin / admin123</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { User, Lock, Clock } from '@element-plus/icons-vue'
import { authService } from '@/services/auth'
import { useAuthStore } from '@/stores/auth'
import type { RateLimitError } from '@/services/http'

const router = useRouter()
const authStore = useAuthStore()

const loginFormRef = ref<FormInstance>()
const loading = ref(false)

const loginForm = reactive({
  username: '',
  password: '',
  rememberMe: false
})

// 限流信息状态
const rateLimitInfo = reactive({
  isActive: false,
  title: '',
  message: '',
  remainingTime: 0,
  autoRetry: true,
  countdownTimer: null as NodeJS.Timeout | null
})

const loginRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 50, message: '用户名长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于 6 个字符', trigger: 'blur' }
  ]
}

/**
 * 格式化倒计时显示
 */
const formatCountdown = (seconds: number): string => {
  if (seconds <= 0) return '00:00'
  
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

/**
 * 获取登录按钮文本
 */
const getLoginButtonText = (): string => {
  if (rateLimitInfo.isActive) {
    return `请等待 ${formatCountdown(rateLimitInfo.remainingTime)}`
  }
  return loading.value ? '登录中...' : '登录'
}

/**
 * 启动限流倒计时
 */
const startRateLimitCountdown = (retryAfter: number, message: string, suggestion: string) => {
  // 清除之前的计时器
  if (rateLimitInfo.countdownTimer) {
    clearInterval(rateLimitInfo.countdownTimer)
  }
  
  // 设置限流信息
  rateLimitInfo.isActive = true
  rateLimitInfo.title = '登录请求过于频繁'
  rateLimitInfo.message = `${message} ${suggestion}`
  rateLimitInfo.remainingTime = retryAfter
  
  // 启动倒计时
  rateLimitInfo.countdownTimer = setInterval(() => {
    rateLimitInfo.remainingTime--
    
    if (rateLimitInfo.remainingTime <= 0) {
      // 倒计时结束
      clearInterval(rateLimitInfo.countdownTimer!)
      rateLimitInfo.countdownTimer = null
      rateLimitInfo.isActive = false
      
      // 显示可以重试的提示
      ElMessage.success('现在可以重新登录了')
      
      // 如果启用了自动重试，自动触发登录
      if (rateLimitInfo.autoRetry) {
        setTimeout(() => {
          handleLogin()
        }, 500) // 延迟500ms再重试，避免立即触发
      }
    }
  }, 1000)
}

/**
 * 清除限流状态
 */
const clearRateLimitState = () => {
  if (rateLimitInfo.countdownTimer) {
    clearInterval(rateLimitInfo.countdownTimer)
    rateLimitInfo.countdownTimer = null
  }
  rateLimitInfo.isActive = false
  rateLimitInfo.remainingTime = 0
}

/**
 * 检查错误是否为限流错误
 */
const isRateLimitError = (error: any): error is RateLimitError => {
  console.log('isRateLimitError检查:', {
    error: error,
    type: typeof error,
    isRateLimit: error?.isRateLimit,
    hasRetryAfter: 'retryAfter' in (error || {}),
    hasStatus: 'status' in (error || {}),
    status: error?.status
  })
  
  return error && 
         typeof error === 'object' && 
         error.isRateLimit === true &&
         typeof error.retryAfter === 'number' &&
         error.status === 429
}

const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  // 如果正在限流中，不允许登录
  if (rateLimitInfo.isActive) {
    ElMessage.warning('请等待限流时间结束后再试')
    return
  }
  
  try {
    const valid = await loginFormRef.value.validate()
    if (!valid) return
    
    loading.value = true
    
    console.log('=== 登录流程开始 ===')
    console.log('1. API基础URL:', import.meta.env.VITE_API_BASE_URL)
    console.log('2. 登录数据:', { username: loginForm.username, password: '***' })
    
    const result = await authService.login({
      username: loginForm.username,
      password: loginForm.password
    })
    
    console.log('3. 登录API响应:', result)
    console.log('4. 响应类型:', typeof result)
    console.log('5. 响应包含的字段:', Object.keys(result))
    
    // 清除任何限流状态
    clearRateLimitState()
    
    // 保存认证信息
    console.log('6. 调用 authStore.setAuth 保存认证信息')
    authStore.setAuth(result)
    
    console.log('7. 检查认证状态:')
    console.log('   - accessToken:', authStore.accessToken ? '已设置' : '未设置')
    console.log('   - user:', authStore.user)
    console.log('   - isAuthenticated:', authStore.isAuthenticated)
    
    // 检查 localStorage
    console.log('8. 检查 localStorage:')
    console.log('   - accessToken:', localStorage.getItem('accessToken') ? '已保存' : '未保存')
    console.log('   - user:', localStorage.getItem('user'))
    
    // 记住我功能
    if (loginForm.rememberMe) {
      localStorage.setItem('rememberMe', 'true')
      localStorage.setItem('username', loginForm.username)
    } else {
      localStorage.removeItem('rememberMe')
      localStorage.removeItem('username')
    }
    
    ElMessage.success('登录成功')
    
    console.log('9. 准备跳转到首页')
    // 跳转到首页
    await router.push('/')
    console.log('10. 路由跳转完成')
    
  } catch (error: any) {
    console.error('登录失败详细信息:', error)
    console.error('错误类型:', typeof error)
    console.error('错误消息:', error.message)
    console.error('错误堆栈:', error.stack)
    console.error('错误对象属性:', Object.keys(error))
    console.error('isRateLimit属性:', error.isRateLimit)
    console.error('retryAfter属性:', error.retryAfter)
    
    // 检查是否为限流错误
    if (isRateLimitError(error)) {
      console.log('Login.vue检测到限流错误:', {
        retryAfter: error.retryAfter,
        retryAfterMinutes: error.retryAfterMinutes,
        suggestion: error.suggestion,
        code: error.code,
        isRateLimit: error.isRateLimit
      })
      
      // 启动限流倒计时UI
      startRateLimitCountdown(
        error.retryAfter,
        error.message,
        error.suggestion
      )
      
      // 不显示通用错误消息，因为限流UI已经显示了详细信息
      return
    }
    
    // 处理其他类型的错误
    let errorMessage = '登录失败'
    if (error.message) {
      if (error.message.includes('网络连接失败')) {
        errorMessage = `网络连接失败，请检查：
1. 后端服务是否运行在 http://localhost:8000
2. 防火墙或代理设置
3. 浏览器控制台是否有CORS错误`
      } else {
        errorMessage = error.message
      }
    }
    
    ElMessage.error(errorMessage)
  } finally {
    loading.value = false
  }
}

// 初始化记住我功能
const initRememberMe = () => {
  const rememberMe = localStorage.getItem('rememberMe')
  const username = localStorage.getItem('username')
  
  if (rememberMe === 'true' && username) {
    loginForm.username = username
    loginForm.rememberMe = true
  }
}

// 组件卸载时清理计时器
onUnmounted(() => {
  clearRateLimitState()
})

initRememberMe()
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  padding: 40px;
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.login-header h1 {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}

.login-header p {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

/* 限流提示样式 */
.rate-limit-notice {
  margin-bottom: 20px;
}

.rate-limit-content {
  padding: 8px 0;
}

.rate-limit-content p {
  margin: 0 0 12px 0;
  font-size: 14px;
  line-height: 1.5;
}

.countdown-display {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 12px;
  background-color: #fdf6ec;
  border: 1px solid #fcdcb6;
  border-radius: 6px;
}

.countdown-icon {
  margin-right: 8px;
  color: #e6a23c;
  font-size: 16px;
}

.countdown-text {
  font-size: 14px;
  font-weight: 500;
  color: #e6a23c;
}

.rate-limit-actions {
  margin-top: 8px;
}

.rate-limit-actions .el-checkbox {
  font-size: 13px;
}

.login-form {
  width: 100%;
}

.login-button {
  width: 100%;
  height: 44px;
  font-size: 16px;
  font-weight: 500;
}

/* 限流状态下的按钮样式 */
.login-button:disabled {
  background-color: #f5f7fa !important;
  border-color: #e4e7ed !important;
  color: #c0c4cc !important;
  cursor: not-allowed !important;
}

.login-footer {
  text-align: center;
  margin-top: 20px;
}

.login-footer p {
  font-size: 12px;
  color: #909399;
  margin: 0;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .login-card {
    padding: 30px 20px;
  }
  
  .login-header h1 {
    font-size: 20px;
  }
  
  .countdown-display {
    padding: 6px 10px;
  }
  
  .countdown-text {
    font-size: 13px;
  }
}

/* 动画效果 */
.rate-limit-notice {
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 倒计时数字的脉冲效果 */
.countdown-text {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
  100% {
    opacity: 1;
  }
}
</style>