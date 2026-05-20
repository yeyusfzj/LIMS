import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { LoginResponse, UserInfo, UserBasicInfo } from '@/services/auth'
import { authService } from '@/services/auth'

export const useAuthStore = defineStore('auth', () => {
  // 状态
  const accessToken = ref<string>('')
  const refreshToken = ref<string>('')
  const user = ref<UserBasicInfo | UserInfo | null>(null)
  const isLoading = ref(false)

  // 计算属性
  const isAuthenticated = computed(() => !!accessToken.value && !!user.value)
  const userRoles = computed(() => user.value?.roles || [])
  const userName = computed(() => user.value?.fullName || user.value?.username || '')

  // 方法
  const setAuth = (authData: LoginResponse) => {
    console.log('[authStore.setAuth] 开始保存认证信息')
    console.log('[authStore.setAuth] 接收到的数据:', authData)
    
    accessToken.value = authData.accessToken
    refreshToken.value = authData.refreshToken
    user.value = authData.user
    
    console.log('[authStore.setAuth] 状态已更新:')
    console.log('  - accessToken:', accessToken.value ? '已设置' : '未设置')
    console.log('  - refreshToken:', refreshToken.value ? '已设置' : '未设置')
    console.log('  - user:', user.value)
    console.log('  - isAuthenticated:', isAuthenticated.value)
    
    // 保存到 localStorage
    localStorage.setItem('accessToken', authData.accessToken)
    localStorage.setItem('refreshToken', authData.refreshToken)
    localStorage.setItem('user', JSON.stringify(authData.user))
    
    console.log('[authStore.setAuth] localStorage 已保存')
  }

  const clearAuth = () => {
    accessToken.value = ''
    refreshToken.value = ''
    user.value = null
    
    // 清除 localStorage
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
  }

  const initAuth = () => {
    const token = localStorage.getItem('accessToken')
    const refresh = localStorage.getItem('refreshToken')
    const userData = localStorage.getItem('user')
    
    // 验证数据有效性
    if (token && refresh && userData && userData !== 'undefined' && userData !== 'null') {
      accessToken.value = token
      refreshToken.value = refresh
      try {
        user.value = JSON.parse(userData)
      } catch (error) {
        console.error('解析用户数据失败:', error)
        clearAuth()
      }
    } else {
      // 如果数据无效，清除所有认证信息
      clearAuth()
    }
  }

  const refreshAuthToken = async () => {
    if (!refreshToken.value) {
      throw new Error('没有刷新令牌')
    }
    
    try {
      const result = await authService.refreshToken(refreshToken.value)
      accessToken.value = result.accessToken
      refreshToken.value = result.refreshToken
      
      // 更新 localStorage
      localStorage.setItem('accessToken', result.accessToken)
      localStorage.setItem('refreshToken', result.refreshToken)
      
      return result.accessToken
    } catch (error) {
      clearAuth()
      throw error
    }
  }

  const logout = async () => {
    try {
      if (accessToken.value) {
        await authService.logout()
      }
    } catch (error) {
      console.error('登出请求失败:', error)
    } finally {
      clearAuth()
    }
  }

  const fetchUserInfo = async () => {
    if (!accessToken.value) return
    
    try {
      isLoading.value = true
      const userInfo = await authService.getCurrentUser()
      user.value = userInfo
      localStorage.setItem('user', JSON.stringify(userInfo))
    } catch (error) {
      console.error('获取用户信息失败:', error)
      clearAuth()
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const hasRole = (role: string) => {
    return userRoles.value.includes(role)
  }

  const hasAnyRole = (roles: string[]) => {
    return roles.some(role => userRoles.value.includes(role))
  }

  const hasAllRoles = (roles: string[]) => {
    return roles.every(role => userRoles.value.includes(role))
  }

  return {
    // 状态
    accessToken,
    refreshToken,
    user,
    isLoading,
    
    // 计算属性
    isAuthenticated,
    userRoles,
    userName,
    
    // 方法
    setAuth,
    clearAuth,
    initAuth,
    refreshAuthToken,
    logout,
    fetchUserInfo,
    hasRole,
    hasAnyRole,
    hasAllRoles
  }
})