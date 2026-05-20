<template>
  <div class="notification-center">
    <el-popover
      :visible="visible"
      placement="bottom-end"
      :width="400"
      trigger="click"
      popper-class="notification-popover"
    >
      <template #reference>
        <el-badge :value="unreadCount" :hidden="unreadCount === 0" class="notification-badge">
          <el-button :icon="Bell" circle @click="toggleNotification" />
        </el-badge>
      </template>

      <div class="notification-content">
        <!-- 头部 -->
        <div class="notification-header">
          <span class="header-title">通知中心</span>
          <div class="header-actions">
            <el-link type="primary" :underline="false" @click="markAllAsRead">
              全部已读
            </el-link>
          </div>
        </div>

        <!-- 标签页 -->
        <el-tabs v-model="activeTab" class="notification-tabs">
          <el-tab-pane label="全部" name="all">
            <div class="notification-list">
              <el-empty v-if="allNotifications.length === 0" description="暂无通知" :image-size="80" />
              <div
                v-else
                v-for="notification in allNotifications"
                :key="notification.id"
                :class="['notification-item', { unread: !notification.read }]"
                @click="handleNotificationClick(notification)"
              >
                <div class="notification-icon" :style="{ backgroundColor: notification.color }">
                  <el-icon :size="18">
                    <component :is="notification.icon" />
                  </el-icon>
                </div>
                <div class="notification-body">
                  <div class="notification-title">{{ notification.title }}</div>
                  <div class="notification-desc">{{ notification.content }}</div>
                  <div class="notification-time">{{ notification.time }}</div>
                </div>
                <div v-if="!notification.read" class="unread-dot"></div>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane name="unread">
            <template #label>
              未读 <el-badge :value="unreadCount" :hidden="unreadCount === 0" />
            </template>
            <div class="notification-list">
              <el-empty v-if="unreadNotifications.length === 0" description="暂无未读通知" :image-size="80" />
              <div
                v-else
                v-for="notification in unreadNotifications"
                :key="notification.id"
                :class="['notification-item', 'unread']"
                @click="handleNotificationClick(notification)"
              >
                <div class="notification-icon" :style="{ backgroundColor: notification.color }">
                  <el-icon :size="18">
                    <component :is="notification.icon" />
                  </el-icon>
                </div>
                <div class="notification-body">
                  <div class="notification-title">{{ notification.title }}</div>
                  <div class="notification-desc">{{ notification.content }}</div>
                  <div class="notification-time">{{ notification.time }}</div>
                </div>
                <div class="unread-dot"></div>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="系统" name="system">
            <div class="notification-list">
              <el-empty v-if="systemNotifications.length === 0" description="暂无系统通知" :image-size="80" />
              <div
                v-else
                v-for="notification in systemNotifications"
                :key="notification.id"
                :class="['notification-item', { unread: !notification.read }]"
                @click="handleNotificationClick(notification)"
              >
                <div class="notification-icon" :style="{ backgroundColor: notification.color }">
                  <el-icon :size="18">
                    <component :is="notification.icon" />
                  </el-icon>
                </div>
                <div class="notification-body">
                  <div class="notification-title">{{ notification.title }}</div>
                  <div class="notification-desc">{{ notification.content }}</div>
                  <div class="notification-time">{{ notification.time }}</div>
                </div>
                <div v-if="!notification.read" class="unread-dot"></div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>

        <!-- 底部 -->
        <div class="notification-footer">
          <el-link type="primary" :underline="false" @click="viewAllNotifications">
            查看全部通知
          </el-link>
        </div>
      </div>
    </el-popover>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Bell,
  Warning,
  Checked,
  Document,
  Message,
  InfoFilled,
  CircleCheck
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()

// 控制弹窗显示
const visible = ref(false)
const activeTab = ref('all')

// 通知数据接口
interface Notification {
  id: number
  title: string
  content: string
  time: string
  type: 'system' | 'audit' | 'task' | 'report'
  read: boolean
  icon: string
  color: string
  link?: string
}

// 模拟通知数据
const notifications = ref<Notification[]>([
  {
    id: 1,
    title: '样品审核提醒',
    content: '您有5个样品等待审核，请及时处理',
    time: '5分钟前',
    type: 'audit',
    read: false,
    icon: 'Warning',
    color: '#E6A23C',
    link: '/audit/tasks'
  },
  {
    id: 2,
    title: '检测任务分配',
    content: '您被分配了新的检测任务：样品 S20240123-001',
    time: '30分钟前',
    type: 'task',
    read: false,
    icon: 'Document',
    color: '#409EFF',
    link: '/workflow/tasks'
  },
  {
    id: 3,
    title: '报告签发通知',
    content: '报告 R20240123-001 已完成签发',
    time: '1小时前',
    type: 'report',
    read: false,
    icon: 'Checked',
    color: '#67C23A',
    link: '/report/distribution'
  },
  {
    id: 4,
    title: '留样到期提醒',
    content: '8个留样将在本周到期，请及时处理',
    time: '2小时前',
    type: 'system',
    read: true,
    icon: 'Warning',
    color: '#F56C6C',
    link: '/sample/retention'
  },
  {
    id: 5,
    title: '系统维护通知',
    content: '系统将于今晚22:00-23:00进行维护',
    time: '3小时前',
    type: 'system',
    read: true,
    icon: 'InfoFilled',
    color: '#909399'
  },
  {
    id: 6,
    title: '审核通过通知',
    content: '您提交的样品 S20240122-005 已通过审核',
    time: '昨天',
    type: 'audit',
    read: true,
    icon: 'CircleCheck',
    color: '#67C23A',
    link: '/sample/detail/5'
  }
])

// 计算属性
const allNotifications = computed(() => notifications.value)

const unreadNotifications = computed(() => 
  notifications.value.filter(n => !n.read)
)

const systemNotifications = computed(() => 
  notifications.value.filter(n => n.type === 'system')
)

const unreadCount = computed(() => unreadNotifications.value.length)

// 切换通知面板
const toggleNotification = () => {
  visible.value = !visible.value
}

// 处理通知点击
const handleNotificationClick = (notification: Notification) => {
  // 标记为已读
  notification.read = true
  
  // 如果有链接，跳转到对应页面
  if (notification.link) {
    visible.value = false
    router.push(notification.link)
  }
}

// 全部标记为已读
const markAllAsRead = () => {
  notifications.value.forEach(n => {
    n.read = true
  })
  ElMessage.success('已全部标记为已读')
}

// 查看全部通知
const viewAllNotifications = () => {
  visible.value = false
  // 这里可以跳转到通知列表页面
  ElMessage.info('跳转到通知列表页面')
}
</script>

<style scoped>
.notification-center {
  display: inline-block;
}

.notification-badge {
  cursor: pointer;
}

.notification-content {
  max-height: 600px;
  display: flex;
  flex-direction: column;
}

/* 头部 */
.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #EBEEF5;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 10px;
}

/* 标签页 */
.notification-tabs {
  flex: 1;
  overflow: hidden;
}

.notification-tabs :deep(.el-tabs__header) {
  margin: 0;
  padding: 0 15px;
}

.notification-tabs :deep(.el-tabs__content) {
  padding: 0;
}

/* 通知列表 */
.notification-list {
  max-height: 400px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  padding: 15px;
  cursor: pointer;
  transition: background-color 0.3s;
  border-bottom: 1px solid #F5F7FA;
  position: relative;
}

.notification-item:hover {
  background-color: #F5F7FA;
}

.notification-item.unread {
  background-color: #F0F9FF;
}

.notification-item.unread:hover {
  background-color: #E6F4FF;
}

.notification-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-right: 12px;
  flex-shrink: 0;
}

.notification-body {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 5px;
}

.notification-desc {
  font-size: 13px;
  color: #606266;
  margin-bottom: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.notification-time {
  font-size: 12px;
  color: #909399;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #F56C6C;
  position: absolute;
  top: 20px;
  right: 15px;
}

/* 底部 */
.notification-footer {
  padding: 12px 15px;
  border-top: 1px solid #EBEEF5;
  text-align: center;
}

/* 滚动条样式 */
.notification-list::-webkit-scrollbar {
  width: 6px;
}

.notification-list::-webkit-scrollbar-thumb {
  background-color: #DCDFE6;
  border-radius: 3px;
}

.notification-list::-webkit-scrollbar-thumb:hover {
  background-color: #C0C4CC;
}
</style>

<style>
.notification-popover {
  padding: 0 !important;
}
</style>
