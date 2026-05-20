/**
 * 样品状态管理Store
 * 
 * 设计理念:
 * 1. 参考Thermo Fisher SampleManager的状态管理模式
 * 2. 使用Pinia的Composition API风格
 * 3. 实现数据缓存和自动刷新机制
 * 
 * 架构优势:
 * - 集中式状态管理: 避免组件间props drilling
 * - 响应式更新: 状态变化自动通知所有订阅者
 * - 缓存优化: 减少不必要的API请求
 * - 类型安全: 完整的TypeScript支持
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { sampleApi } from '@/services'
import type { Sample } from '@/types'
import type { SampleListRequest, SampleFilters } from '@/types/api'

export const useSampleStore = defineStore('sample', () => {
  // ========== State ==========
  
  // 样品列表
  const samples = ref<Sample[]>([])
  
  // 当前选中的样品
  const currentSample = ref<Sample | null>(null)
  
  // 加载状态
  const loading = ref(false)
  
  // 分页信息
  const pagination = ref({
    currentPage: 1,  // 改为 currentPage 以匹配 Element Plus 的命名
    pageSize: 20,
    total: 0,
    totalPages: 0
  })
  
  // 筛选条件
  const filters = ref<SampleFilters>({})
  
  // 排序配置
  const sortConfig = ref({
    sortBy: 'receivedDate',
    sortOrder: 'desc' as 'asc' | 'desc'
  })
  
  // 缓存时间戳(用于判断是否需要刷新)
  const lastFetchTime = ref<number>(0)
  const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

  // ========== Getters ==========
  
  // 是否需要刷新数据
  const needsRefresh = computed(() => {
    return Date.now() - lastFetchTime.value > CACHE_DURATION
  })
  
  // 按状态分组的样品
  const samplesByStatus = computed(() => {
    const grouped: Record<string, Sample[]> = {}
    samples.value.forEach(sample => {
      if (!grouped[sample.status]) {
        grouped[sample.status] = []
      }
      grouped[sample.status].push(sample)
    })
    return grouped
  })
  
  // 统计信息
  const statistics = computed(() => {
    return {
      total: pagination.value.total,
      byStatus: Object.entries(samplesByStatus.value).reduce((acc, [status, items]) => {
        acc[status] = items.length
        return acc
      }, {} as Record<string, number>)
    }
  })

  // ========== Actions ==========
  
  /**
   * 获取样品列表
   * 
   * 设计说明:
   * - 支持缓存,避免重复请求
   * - 自动处理加载状态
   * - 错误处理由HTTP客户端统一处理
   */
  async function fetchSamples(force: boolean = false) {
    // BUG FIX: 移除缓存检查逻辑，确保每次调用都发送API请求
    // 原因：分页、筛选、排序变化时都需要重新请求数据
    // 缓存机制会导致页码变化时不发送请求，始终返回第1页数据

    loading.value = true
    try {
      const request: SampleListRequest = {
        page: pagination.value.currentPage,  // 使用 currentPage
        pageSize: pagination.value.pageSize,
        sortBy: sortConfig.value.sortBy,
        sortOrder: sortConfig.value.sortOrder,
        filters: filters.value
      }

      console.log('📡 发送API请求:', request)
      const response = await sampleApi.getList(request)
      console.log('📡 API响应:', response)
      
      samples.value = response.items
      // 只更新 total 和 totalPages，不更新 currentPage 和 pageSize
      // 因为这两个值已经通过 setPage() 和 setPageSize() 设置了
      pagination.value.total = response.total
      pagination.value.totalPages = response.totalPages
      
      console.log('✅ 更新store数据完成')
      console.log('  - samples数量:', samples.value.length)
      console.log('  - pagination:', pagination.value)
      
      lastFetchTime.value = Date.now()
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取样品详情
   */
  async function fetchSampleById(id: string) {
    loading.value = true
    try {
      const sample = await sampleApi.getById(id)
      currentSample.value = sample
      return sample
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建样品
   */
  async function createSample(data: any) {
    const sample = await sampleApi.create(data)
    // 创建成功后刷新列表
    await fetchSamples(true)
    return sample
  }

  /**
   * 更新样品
   */
  async function updateSample(data: any) {
    const sample = await sampleApi.update(data)
    // 更新本地缓存
    const index = samples.value.findIndex(s => s.id === sample.id)
    if (index !== -1) {
      samples.value[index] = sample
    }
    if (currentSample.value?.id === sample.id) {
      currentSample.value = sample
    }
    return sample
  }

  /**
   * 删除样品
   */
  async function deleteSample(id: string) {
    await sampleApi.delete(id)
    // 从列表中移除
    samples.value = samples.value.filter(s => s.id !== id)
    if (currentSample.value?.id === id) {
      currentSample.value = null
    }
    pagination.value.total--
  }

  /**
   * 批量删除
   */
  async function batchDelete(ids: string[]) {
    const result = await sampleApi.batchOperation({
      ids,
      operation: 'delete'
    })
    // 刷新列表
    await fetchSamples(true)
    return result
  }

  /**
   * 设置筛选条件
   */
  function setFilters(newFilters: SampleFilters) {
    filters.value = newFilters
    pagination.value.currentPage = 1 // 重置到第一页
  }

  /**
   * 设置排序
   */
  function setSort(sortBy: string, sortOrder: 'asc' | 'desc') {
    sortConfig.value = { sortBy, sortOrder }
  }

  /**
   * 设置分页
   */
  function setPage(page: number) {
    pagination.value.currentPage = page
  }

  /**
   * 设置每页数量
   */
  function setPageSize(pageSize: number) {
    pagination.value.pageSize = pageSize
    pagination.value.currentPage = 1 // 重置到第一页
  }

  /**
   * 重置状态
   */
  function reset() {
    samples.value = []
    currentSample.value = null
    filters.value = {}
    pagination.value = {
      currentPage: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0
    }
    lastFetchTime.value = 0
  }

  return {
    // State
    samples,
    currentSample,
    loading,
    pagination,
    filters,
    sortConfig,
    
    // Getters
    needsRefresh,
    samplesByStatus,
    statistics,
    
    // Actions
    fetchSamples,
    fetchSampleById,
    createSample,
    updateSample,
    deleteSample,
    batchDelete,
    setFilters,
    setSort,
    setPage,
    setPageSize,
    reset
  }
})
