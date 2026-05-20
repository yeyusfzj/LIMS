<template>
  <div class="global-search">
    <el-popover
      :visible="showResults"
      placement="bottom-start"
      :width="500"
      trigger="manual"
      popper-class="search-popover"
    >
      <template #reference>
        <el-input
          v-model="searchQuery"
          placeholder="搜索样品、任务、报告..."
          :prefix-icon="Search"
          class="search-input"
          clearable
          @input="handleSearch"
          @focus="handleFocus"
          @blur="handleBlur"
          @keyup.enter="handleEnter"
        />
      </template>

      <div class="search-results">
        <!-- 搜索中 -->
        <div v-if="searching" class="search-loading">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>搜索中...</span>
        </div>

        <!-- 无结果 -->
        <el-empty 
          v-else-if="searchQuery && !searching && allResults.length === 0" 
          description="未找到相关结果" 
          :image-size="80" 
        />

        <!-- 搜索结果 -->
        <div v-else-if="allResults.length > 0" class="results-container">
          <!-- 样品结果 -->
          <div v-if="sampleResults.length > 0" class="result-section">
            <div class="section-title">
              <el-icon><Files /></el-icon>
              <span>样品 ({{ sampleResults.length }})</span>
            </div>
            <div
              v-for="item in sampleResults"
              :key="item.id"
              class="result-item"
              @click="navigateTo(item.link)"
            >
              <div class="item-icon" style="background-color: #409EFF;">
                <el-icon><Files /></el-icon>
              </div>
              <div class="item-content">
                <div class="item-title" v-html="highlightText(item.title)"></div>
                <div class="item-desc">{{ item.description }}</div>
              </div>
              <el-tag size="small" :type="item.statusType">{{ item.status }}</el-tag>
            </div>
          </div>

          <!-- 任务结果 -->
          <div v-if="taskResults.length > 0" class="result-section">
            <div class="section-title">
              <el-icon><Document /></el-icon>
              <span>任务 ({{ taskResults.length }})</span>
            </div>
            <div
              v-for="item in taskResults"
              :key="item.id"
              class="result-item"
              @click="navigateTo(item.link)"
            >
              <div class="item-icon" style="background-color: #E6A23C;">
                <el-icon><Document /></el-icon>
              </div>
              <div class="item-content">
                <div class="item-title" v-html="highlightText(item.title)"></div>
                <div class="item-desc">{{ item.description }}</div>
              </div>
              <el-tag size="small" :type="item.statusType">{{ item.status }}</el-tag>
            </div>
          </div>

          <!-- 报告结果 -->
          <div v-if="reportResults.length > 0" class="result-section">
            <div class="section-title">
              <el-icon><Tickets /></el-icon>
              <span>报告 ({{ reportResults.length }})</span>
            </div>
            <div
              v-for="item in reportResults"
              :key="item.id"
              class="result-item"
              @click="navigateTo(item.link)"
            >
              <div class="item-icon" style="background-color: #67C23A;">
                <el-icon><Tickets /></el-icon>
              </div>
              <div class="item-content">
                <div class="item-title" v-html="highlightText(item.title)"></div>
                <div class="item-desc">{{ item.description }}</div>
              </div>
              <el-tag size="small" :type="item.statusType">{{ item.status }}</el-tag>
            </div>
          </div>

          <!-- 查看全部 -->
          <div class="view-all">
            <el-link type="primary" :underline="false" @click="viewAllResults">
              查看全部结果 ({{ allResults.length }})
            </el-link>
          </div>
        </div>

        <!-- 搜索提示 -->
        <div v-else class="search-tips">
          <div class="tip-title">搜索提示</div>
          <div class="tip-item">
            <el-icon><Search /></el-icon>
            <span>输入样品编号、名称进行搜索</span>
          </div>
          <div class="tip-item">
            <el-icon><Document /></el-icon>
            <span>输入任务编号、名称进行搜索</span>
          </div>
          <div class="tip-item">
            <el-icon><Tickets /></el-icon>
            <span>输入报告编号进行搜索</span>
          </div>
        </div>
      </div>
    </el-popover>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Search,
  Loading,
  Files,
  Document,
  Tickets
} from '@element-plus/icons-vue'

const router = useRouter()

// 搜索状态
const searchQuery = ref('')
const showResults = ref(false)
const searching = ref(false)

// 搜索结果接口
interface SearchResult {
  id: string
  type: 'sample' | 'task' | 'report'
  title: string
  description: string
  status: string
  statusType: 'success' | 'warning' | 'danger' | 'info'
  link: string
}

// 模拟搜索数据
const mockData: SearchResult[] = [
  {
    id: 'S20240123-001',
    type: 'sample',
    title: 'S20240123-001',
    description: '水质样品 - 某某公司委托',
    status: '检测中',
    statusType: 'warning',
    link: '/sample/detail/1'
  },
  {
    id: 'S20240123-002',
    type: 'sample',
    title: 'S20240123-002',
    description: '土壤样品 - 某某项目',
    status: '已完成',
    statusType: 'success',
    link: '/sample/detail/2'
  },
  {
    id: 'T20240123-001',
    type: 'task',
    title: 'T20240123-001 - 水质检测',
    description: '样品 S20240123-001 的检测任务',
    status: '进行中',
    statusType: 'warning',
    link: '/workflow/tasks'
  },
  {
    id: 'T20240123-002',
    type: 'task',
    title: 'T20240123-002 - 土壤分析',
    description: '样品 S20240123-002 的分析任务',
    status: '已完成',
    statusType: 'success',
    link: '/workflow/tasks'
  },
  {
    id: 'R20240123-001',
    type: 'report',
    title: 'R20240123-001',
    description: '水质检测报告 - 某某公司',
    status: '已签发',
    statusType: 'success',
    link: '/report/generator'
  },
  {
    id: 'R20240123-002',
    type: 'report',
    title: 'R20240123-002',
    description: '土壤检测报告 - 某某项目',
    status: '待签发',
    statusType: 'warning',
    link: '/report/generator'
  }
]

// 搜索结果
const searchResults = ref<SearchResult[]>([])

// 计算属性
const allResults = computed(() => searchResults.value)

const sampleResults = computed(() => 
  searchResults.value.filter(r => r.type === 'sample').slice(0, 3)
)

const taskResults = computed(() => 
  searchResults.value.filter(r => r.type === 'task').slice(0, 3)
)

const reportResults = computed(() => 
  searchResults.value.filter(r => r.type === 'report').slice(0, 3)
)

// 搜索防抖定时器
let searchTimer: number | null = null

// 处理搜索
const handleSearch = () => {
  if (!searchQuery.value.trim()) {
    searchResults.value = []
    showResults.value = false
    return
  }

  showResults.value = true
  searching.value = true

  // 清除之前的定时器
  if (searchTimer) {
    clearTimeout(searchTimer)
  }

  // 防抖搜索
  searchTimer = window.setTimeout(() => {
    performSearch()
  }, 300)
}

// 执行搜索
const performSearch = () => {
  const query = searchQuery.value.toLowerCase().trim()
  
  // 模拟搜索
  searchResults.value = mockData.filter(item => 
    item.title.toLowerCase().includes(query) ||
    item.description.toLowerCase().includes(query)
  )

  searching.value = false
}

// 高亮搜索文本
const highlightText = (text: string) => {
  if (!searchQuery.value) return text
  
  const regex = new RegExp(`(${searchQuery.value})`, 'gi')
  return text.replace(regex, '<span class="highlight">$1</span>')
}

// 处理焦点
const handleFocus = () => {
  if (searchQuery.value.trim()) {
    showResults.value = true
  }
}

// 处理失焦
const handleBlur = () => {
  // 延迟关闭，以便点击结果项
  setTimeout(() => {
    showResults.value = false
  }, 200)
}

// 处理回车
const handleEnter = () => {
  if (allResults.value.length > 0) {
    navigateTo(allResults.value[0].link)
  }
}

// 导航到结果页面
const navigateTo = (link: string) => {
  showResults.value = false
  searchQuery.value = ''
  router.push(link)
}

// 查看全部结果
const viewAllResults = () => {
  showResults.value = false
  // 这里可以跳转到搜索结果页面
  console.log('查看全部结果')
}
</script>

<style scoped>
.global-search {
  width: 300px;
}

.search-input {
  width: 100%;
}

.search-input :deep(.el-input__wrapper) {
  background-color: #F5F7FA;
  box-shadow: none;
  transition: all 0.3s;
}

.search-input :deep(.el-input__wrapper:hover) {
  background-color: #E4E7ED;
}

.search-input :deep(.el-input__wrapper.is-focus) {
  background-color: #fff;
  box-shadow: 0 0 0 1px #409EFF inset;
}

/* 搜索结果 */
.search-results {
  max-height: 500px;
  overflow-y: auto;
}

/* 加载状态 */
.search-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px;
  color: #909399;
}

/* 结果容器 */
.results-container {
  padding: 10px 0;
}

/* 结果分组 */
.result-section {
  margin-bottom: 15px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 15px;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  background-color: #F5F7FA;
}

/* 结果项 */
.result-item {
  display: flex;
  align-items: center;
  padding: 12px 15px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.result-item:hover {
  background-color: #F5F7FA;
}

.item-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-right: 12px;
  flex-shrink: 0;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.item-title :deep(.highlight) {
  color: #409EFF;
  background-color: #ECF5FF;
  padding: 0 2px;
}

.item-desc {
  font-size: 12px;
  color: #909399;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 查看全部 */
.view-all {
  padding: 12px 15px;
  text-align: center;
  border-top: 1px solid #EBEEF5;
}

/* 搜索提示 */
.search-tips {
  padding: 20px 15px;
}

.tip-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 15px;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  font-size: 13px;
  color: #606266;
}

.tip-item .el-icon {
  color: #909399;
}

/* 滚动条样式 */
.search-results::-webkit-scrollbar {
  width: 6px;
}

.search-results::-webkit-scrollbar-thumb {
  background-color: #DCDFE6;
  border-radius: 3px;
}

.search-results::-webkit-scrollbar-thumb:hover {
  background-color: #C0C4CC;
}
</style>

<style>
.search-popover {
  padding: 0 !important;
}
</style>
