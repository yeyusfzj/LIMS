// 仪器管理状态管理

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import instrumentService from '@/services/instrumentService'
import type {
  Instrument,
  CreateInstrumentDto,
  UpdateInstrumentDto,
  InstrumentQuery,
  PaginatedResult,
  InstrumentTransfer,
  CreateTransferDto,
  MaintenanceRecord,
  CreateMaintenanceDto,
  CalibrationRecord,
  CreateCalibrationDto,
  DisposalRecord,
  CreateDisposalDto,
  InstrumentStatistics
} from '@/types/instrument'

export const useInstrumentStore = defineStore('instrument', () => {
  // ==================== State ====================
  
  // 仪器列表
  const instruments = ref<Instrument[]>([])
  
  // 当前仪器
  const currentInstrument = ref<Instrument | null>(null)
  
  // 加载状态
  const loading = ref(false)
  
  // 筛选条件
  const filters = ref<InstrumentQuery>({
    page: 1,
    pageSize: 20
  })
  
  // 分页信息
  const pagination = ref({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  })
  
  // 流转记录
  const transfers = ref<InstrumentTransfer[]>([])
  
  // 维护记录
  const maintenanceRecords = ref<MaintenanceRecord[]>([])
  
  // 校准记录
  const calibrationRecords = ref<CalibrationRecord[]>([])
  
  // 报废记录
  const disposalRecords = ref<DisposalRecord[]>([])
  
  // 统计数据
  const statistics = ref<InstrumentStatistics | null>(null)

  // ==================== Getters ====================
  
  // 是否有数据
  const hasInstruments = computed(() => instruments.value.length > 0)
  
  // 当前页数据
  const currentPageInstruments = computed(() => instruments.value)
  
  // 是否有下一页
  const hasNextPage = computed(() => pagination.value.page < pagination.value.totalPages)
  
  // 是否有上一页
  const hasPrevPage = computed(() => pagination.value.page > 1)

  // ==================== Actions ====================
  
  /**
   * 获取仪器列表
   */
  const fetchInstruments = async (query?: InstrumentQuery): Promise<PaginatedResult<Instrument>> => {
    loading.value = true
    try {
      const mergedQuery = {
        ...filters.value,
        ...query
      }
      
      const result = await instrumentService.getInstruments(mergedQuery)
      
      instruments.value = result.items
      pagination.value = {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages
      }
      
      return result
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取仪器详情
   */
  const fetchInstrumentById = async (id: string): Promise<Instrument> => {
    loading.value = true
    try {
      const instrument = await instrumentService.getInstrumentById(id)
      currentInstrument.value = instrument
      return instrument
    } finally {
      loading.value = false
    }
  }

  /**
   * 通过编码获取仪器
   */
  const fetchInstrumentByCode = async (code: string): Promise<Instrument> => {
    loading.value = true
    try {
      const instrument = await instrumentService.getInstrumentByCode(code)
      currentInstrument.value = instrument
      return instrument
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建仪器
   */
  const createInstrument = async (data: CreateInstrumentDto): Promise<Instrument> => {
    loading.value = true
    try {
      const instrument = await instrumentService.createInstrument(data)
      
      // 如果当前在第一页,添加到列表开头
      if (pagination.value.page === 1) {
        instruments.value.unshift(instrument)
        // 如果超过页大小,移除最后一个
        if (instruments.value.length > pagination.value.pageSize) {
          instruments.value.pop()
        }
      }
      
      // 更新总数
      pagination.value.total++
      
      return instrument
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新仪器
   */
  const updateInstrument = async (id: string, data: UpdateInstrumentDto): Promise<Instrument> => {
    loading.value = true
    try {
      const instrument = await instrumentService.updateInstrument(id, data)
      
      // 更新列表中的仪器
      const index = instruments.value.findIndex(i => i.id === id)
      if (index !== -1) {
        instruments.value[index] = instrument
      }
      
      // 更新当前仪器
      if (currentInstrument.value?.id === id) {
        currentInstrument.value = instrument
      }
      
      return instrument
    } finally {
      loading.value = false
    }
  }

  /**
   * 删除仪器
   */
  const deleteInstrument = async (id: string): Promise<void> => {
    loading.value = true
    try {
      await instrumentService.deleteInstrument(id)
      
      // 从列表中移除
      instruments.value = instruments.value.filter(i => i.id !== id)
      
      // 清除当前仪器
      if (currentInstrument.value?.id === id) {
        currentInstrument.value = null
      }
      
      // 更新总数
      pagination.value.total--
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取统计数据
   */
  const fetchStatistics = async (params?: { startDate?: string; endDate?: string }): Promise<InstrumentStatistics> => {
    loading.value = true
    try {
      const stats = await instrumentService.getStatistics(params)
      statistics.value = stats
      return stats
    } finally {
      loading.value = false
    }
  }

  // ==================== 流转管理 ====================

  /**
   * 创建流转申请
   */
  const createTransfer = async (instrumentId: string, data: CreateTransferDto): Promise<InstrumentTransfer> => {
    loading.value = true
    try {
      const transfer = await instrumentService.createTransfer(instrumentId, data)
      transfers.value.unshift(transfer)
      return transfer
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取仪器流转历史
   */
  const fetchInstrumentTransfers = async (instrumentId: string): Promise<InstrumentTransfer[]> => {
    loading.value = true
    try {
      const result = await instrumentService.getInstrumentTransfers(instrumentId)
      transfers.value = result
      return result
    } finally {
      loading.value = false
    }
  }

  /**
   * 确认流转
   */
  const confirmTransfer = async (id: string, confirmed: boolean, rejectionReason?: string): Promise<InstrumentTransfer> => {
    loading.value = true
    try {
      const transfer = await instrumentService.confirmTransfer(id, { confirmed, rejectionReason })
      
      // 更新列表中的流转记录
      const index = transfers.value.findIndex(t => t.id === id)
      if (index !== -1) {
        transfers.value[index] = transfer
      }
      
      return transfer
    } finally {
      loading.value = false
    }
  }

  // ==================== 维护管理 ====================

  /**
   * 添加维护记录
   */
  const createMaintenance = async (instrumentId: string, data: CreateMaintenanceDto): Promise<MaintenanceRecord> => {
    loading.value = true
    try {
      const record = await instrumentService.createMaintenance(instrumentId, data)
      maintenanceRecords.value.unshift(record)
      return record
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取仪器维护历史
   */
  const fetchInstrumentMaintenance = async (instrumentId: string): Promise<MaintenanceRecord[]> => {
    loading.value = true
    try {
      const result = await instrumentService.getInstrumentMaintenance(instrumentId)
      maintenanceRecords.value = result
      return result
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新维护记录
   */
  const updateMaintenance = async (id: string, data: any): Promise<MaintenanceRecord> => {
    loading.value = true
    try {
      const record = await instrumentService.updateMaintenance(id, data)
      
      // 更新列表中的维护记录
      const index = maintenanceRecords.value.findIndex(m => m.id === id)
      if (index !== -1) {
        maintenanceRecords.value[index] = record
      }
      
      return record
    } finally {
      loading.value = false
    }
  }

  /**
   * 删除维护记录
   */
  const deleteMaintenance = async (id: string): Promise<void> => {
    loading.value = true
    try {
      await instrumentService.deleteMaintenance(id)
      maintenanceRecords.value = maintenanceRecords.value.filter(m => m.id !== id)
    } finally {
      loading.value = false
    }
  }

  // ==================== 校准管理 ====================

  /**
   * 添加校准记录
   */
  const createCalibration = async (instrumentId: string, data: CreateCalibrationDto): Promise<CalibrationRecord> => {
    loading.value = true
    try {
      const record = await instrumentService.createCalibration(instrumentId, data)
      calibrationRecords.value.unshift(record)
      return record
    } finally {
      loading.value = false
    }
  }

  /**
   * 获取仪器校准历史
   */
  const fetchInstrumentCalibration = async (instrumentId: string): Promise<CalibrationRecord[]> => {
    loading.value = true
    try {
      const result = await instrumentService.getInstrumentCalibration(instrumentId)
      calibrationRecords.value = result
      return result
    } finally {
      loading.value = false
    }
  }

  /**
   * 更新校准记录
   */
  const updateCalibration = async (id: string, data: any): Promise<CalibrationRecord> => {
    loading.value = true
    try {
      const record = await instrumentService.updateCalibration(id, data)
      
      // 更新列表中的校准记录
      const index = calibrationRecords.value.findIndex(c => c.id === id)
      if (index !== -1) {
        calibrationRecords.value[index] = record
      }
      
      return record
    } finally {
      loading.value = false
    }
  }

  /**
   * 删除校准记录
   */
  const deleteCalibration = async (id: string): Promise<void> => {
    loading.value = true
    try {
      await instrumentService.deleteCalibration(id)
      calibrationRecords.value = calibrationRecords.value.filter(c => c.id !== id)
    } finally {
      loading.value = false
    }
  }

  // ==================== 报废管理 ====================

  /**
   * 创建报废申请
   */
  const createDisposal = async (instrumentId: string, data: CreateDisposalDto): Promise<DisposalRecord> => {
    loading.value = true
    try {
      const record = await instrumentService.createDisposal(instrumentId, data)
      disposalRecords.value.unshift(record)
      return record
    } finally {
      loading.value = false
    }
  }

  /**
   * 审批报废申请
   */
  const approveDisposal = async (id: string, approved: boolean, rejectionReason?: string): Promise<DisposalRecord> => {
    loading.value = true
    try {
      const record = await instrumentService.approveDisposal(id, { approved, rejectionReason })
      
      // 更新列表中的报废记录
      const index = disposalRecords.value.findIndex(d => d.id === id)
      if (index !== -1) {
        disposalRecords.value[index] = record
      }
      
      return record
    } finally {
      loading.value = false
    }
  }

  // ==================== 工具方法 ====================

  /**
   * 设置筛选条件
   */
  const setFilters = (newFilters: Partial<InstrumentQuery>) => {
    filters.value = { ...filters.value, ...newFilters }
  }

  /**
   * 重置筛选条件
   */
  const resetFilters = () => {
    filters.value = {
      page: 1,
      pageSize: 20
    }
  }

  /**
   * 设置页码
   */
  const setPage = (page: number) => {
    pagination.value.page = page
    filters.value.page = page
  }

  /**
   * 设置每页大小
   */
  const setPageSize = (pageSize: number) => {
    pagination.value.pageSize = pageSize
    filters.value.pageSize = pageSize
    // 重置到第一页
    setPage(1)
  }

  /**
   * 清除当前仪器
   */
  const clearCurrentInstrument = () => {
    currentInstrument.value = null
  }

  /**
   * 清除所有数据
   */
  const clearAll = () => {
    instruments.value = []
    currentInstrument.value = null
    transfers.value = []
    maintenanceRecords.value = []
    calibrationRecords.value = []
    disposalRecords.value = []
    statistics.value = null
    resetFilters()
  }

  return {
    // State
    instruments,
    currentInstrument,
    loading,
    filters,
    pagination,
    transfers,
    maintenanceRecords,
    calibrationRecords,
    disposalRecords,
    statistics,
    
    // Getters
    hasInstruments,
    currentPageInstruments,
    hasNextPage,
    hasPrevPage,
    
    // Actions - 仪器管理
    fetchInstruments,
    fetchInstrumentById,
    fetchInstrumentByCode,
    createInstrument,
    updateInstrument,
    deleteInstrument,
    fetchStatistics,
    
    // Actions - 流转管理
    createTransfer,
    fetchInstrumentTransfers,
    confirmTransfer,
    
    // Actions - 维护管理
    createMaintenance,
    fetchInstrumentMaintenance,
    updateMaintenance,
    deleteMaintenance,
    
    // Actions - 校准管理
    createCalibration,
    fetchInstrumentCalibration,
    updateCalibration,
    deleteCalibration,
    
    // Actions - 报废管理
    createDisposal,
    approveDisposal,
    
    // 工具方法
    setFilters,
    resetFilters,
    setPage,
    setPageSize,
    clearCurrentInstrument,
    clearAll
  }
})
