/**
 * 全局应用状态Store
 */

import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  // 侧边栏折叠状态
  const sidebarCollapsed = ref(false)
  
  // 全局加载状态
  const globalLoading = ref(false)
  
  // 系统配置
  const config = ref({
    systemName: '实验室智能管理系统',
    version: '1.0.0',
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1'
  })

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function setGlobalLoading(loading: boolean) {
    globalLoading.value = loading
  }

  return {
    sidebarCollapsed,
    globalLoading,
    config,
    toggleSidebar,
    setGlobalLoading
  }
})
