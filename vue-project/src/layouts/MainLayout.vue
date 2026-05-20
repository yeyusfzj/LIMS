<template>
  <el-container class="main-layout">
    <!-- 顶部导航栏 -->
    <el-header class="main-header">
      <div class="header-left">
        <el-icon class="menu-toggle" @click="toggleSidebar">
          <Fold v-if="!isCollapse" />
          <Expand v-else />
        </el-icon>
        <div class="logo-wrapper" @click="goToHome">
          <div class="logo">
            <el-icon><Operation /></el-icon>
          </div>
          <h1 class="system-name">实验室智能管理系统</h1>
        </div>
      </div>
      
      <div class="header-right">
        <!-- 全局搜索 -->
        <GlobalSearch />
        
        <!-- 通知中心 -->
        <NotificationCenter />
        
        <!-- 用户信息 -->
        <el-dropdown class="user-dropdown" @command="handleUserCommand">
          <div class="user-info">
            <el-avatar :size="32" class="user-avatar">
              <el-icon><User /></el-icon>
            </el-avatar>
            <span class="user-name">{{ userName }}</span>
            <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">
                <el-icon><User /></el-icon>
                个人信息
              </el-dropdown-item>
              <el-dropdown-item command="settings">
                <el-icon><Setting /></el-icon>
                系统设置
              </el-dropdown-item>
              <el-dropdown-item divided command="logout">
                <el-icon><SwitchButton /></el-icon>
                退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>

    <el-container class="main-container">
      <!-- 左侧菜单栏 -->
      <el-aside :width="isCollapse ? '64px' : '240px'" class="main-aside">
        <SideMenu :is-collapse="isCollapse" />
      </el-aside>

      <!-- 主内容区域 -->
      <el-main class="main-content">
        <!-- 面包屑导航 -->
        <el-breadcrumb class="breadcrumb" separator="/">
          <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.path" :to="item.path">
            {{ item.title }}
          </el-breadcrumb-item>
        </el-breadcrumb>

        <!-- 路由视图 -->
        <div class="content-wrapper">
          <router-view />
        </div>
      </el-main>
    </el-container>

    <!-- AI助手悬浮按钮 -->
    <AIAssistantFloat ref="aiAssistantRef" />
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import SideMenu from '@/components/SideMenu.vue'
import NotificationCenter from '@/components/NotificationCenter.vue'
import GlobalSearch from '@/components/GlobalSearch.vue'
import AIAssistantFloat from '@/components/ai/AIAssistantFloat.vue'

// 路由
const router = useRouter()
const authStore = useAuthStore()

// AI助手引用
const aiAssistantRef = ref()

// 侧边栏折叠状态
const isCollapse = ref(false)

// 用户信息
const userName = computed(() => authStore.userName || '用户')

// 当前路由
const route = useRoute()

// 面包屑导航
const breadcrumbs = computed(() => {
  const matched = route.matched.filter(item => item.meta && item.meta.title)
  return matched.map(item => ({
    path: item.path,
    title: item.meta.title as string
  }))
})

// 切换侧边栏
const toggleSidebar = () => {
  isCollapse.value = !isCollapse.value
}

// 返回主页
const goToHome = () => {
  router.push('/dashboard')
}

// 处理用户菜单命令
const handleUserCommand = async (command: string) => {
  switch (command) {
    case 'profile':
      console.log('个人信息')
      // TODO: 跳转到个人信息页面
      break
    case 'settings':
      router.push('/system/settings')
      break
    case 'logout':
      try {
        await ElMessageBox.confirm(
          '确定要退出登录吗？',
          '退出确认',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        )
        
        await authStore.logout()
        ElMessage.success('已退出登录')
        router.push('/login')
      } catch (error) {
        // 用户取消或退出失败
        if (error !== 'cancel') {
          console.error('退出登录失败:', error)
          ElMessage.error('退出登录失败')
        }
      }
      break
  }
}

// 监听打开AI助手事件
onMounted(() => {
  window.addEventListener('open-ai-assistant', () => {
    if (aiAssistantRef.value) {
      aiAssistantRef.value.openAssistant()
    }
  })
})
</script>

<style scoped>
.main-layout {
  width: 100%;
  height: 100vh;
}

/* 顶部导航栏 */
.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 20px;
  height: 60px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.menu-toggle {
  font-size: 20px;
  cursor: pointer;
  color: #606266;
  transition: color 0.3s;
}

.menu-toggle:hover {
  color: #409eff;
}

.logo-wrapper {
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: opacity 0.3s;
}

.logo-wrapper:hover {
  opacity: 0.8;
}

.logo {
  font-size: 28px;
  color: #409eff;
}

.system-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0;
  user-select: none;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 24px;
}

.user-dropdown {
  cursor: pointer;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  background-color: #409eff;
}

.user-name {
  font-size: 14px;
  color: #303133;
}

.dropdown-icon {
  font-size: 12px;
  color: #909399;
}

/* 主容器 */
.main-container {
  height: calc(100vh - 60px);
}

/* 侧边栏 */
.main-aside {
  background-color: #fff;
  border-right: 1px solid #e4e7ed;
  transition: width 0.3s;
  overflow-x: hidden;
}

/* 主内容区域 */
.main-content {
  background-color: #f5f7fa;
  padding: 16px;
  overflow-y: auto;
}

.breadcrumb {
  margin-bottom: 16px;
  padding: 12px 16px;
  background-color: #fff;
  border-radius: 4px;
}

.content-wrapper {
  background-color: #fff;
  border-radius: 4px;
  padding: 20px;
  min-height: calc(100vh - 60px - 32px - 52px);
}
</style>
