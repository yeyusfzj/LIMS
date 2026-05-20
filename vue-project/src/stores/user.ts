/**
 * 用户状态管理Store
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userApi } from '@/services'
import type { User } from '@/types'

export const useUserStore = defineStore('user', () => {
  // State
  const currentUser = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('access_token'))
  const loading = ref(false)

  // Getters
  const isLoggedIn = computed(() => !!token.value && !!currentUser.value)
  const userRoles = computed(() => currentUser.value?.roles || [])
  const userPermissions = computed(() => {
    const permissions: string[] = []
    userRoles.value.forEach(role => {
      role.permissions.forEach(permission => {
        permission.actions.forEach(action => {
          permissions.push(`${permission.resource}:${action}`)
        })
      })
    })
    return permissions
  })

  // Actions
  async function login(username: string, password: string) {
    loading.value = true
    try {
      const response = await userApi.login(username, password)
      token.value = response.token
      currentUser.value = response.user
      localStorage.setItem('access_token', response.token)
      return response
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      await userApi.logout()
    } finally {
      token.value = null
      currentUser.value = null
      localStorage.removeItem('access_token')
    }
  }

  async function fetchCurrentUser() {
    if (!token.value) return
    
    loading.value = true
    try {
      currentUser.value = await userApi.getCurrentUser()
    } finally {
      loading.value = false
    }
  }

  function hasPermission(permission: string): boolean {
    return userPermissions.value.includes(permission)
  }

  function hasRole(roleName: string): boolean {
    return userRoles.value.some(role => role.name === roleName)
  }

  return {
    currentUser,
    token,
    loading,
    isLoggedIn,
    userRoles,
    userPermissions,
    login,
    logout,
    fetchCurrentUser,
    hasPermission,
    hasRole
  }
})
