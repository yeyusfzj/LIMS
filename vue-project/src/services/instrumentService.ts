// 仪器管理 API 服务

import http from './http'
import { mockInstruments, mockInstrumentTransfers, mockMaintenanceRecords } from '@/mock'
import type {
  Instrument,
  CreateInstrumentDto,
  UpdateInstrumentDto,
  InstrumentQuery,
  PaginatedResult,
  InstrumentTransfer,
  CreateTransferDto,
  ConfirmTransferDto,
  MaintenanceRecord,
  CreateMaintenanceDto,
  UpdateMaintenanceDto,
  CalibrationRecord,
  CreateCalibrationDto,
  UpdateCalibrationDto,
  DisposalRecord,
  CreateDisposalDto,
  ApproveDisposalDto,
  InstrumentDocument,
  InstrumentStatistics,
  MaintenanceReminder,
  CalibrationExpiring,
  ApiResponse
} from '@/types/instrument'

// 是否使用Mock数据 (开发环境默认使用Mock)
const USE_MOCK = import.meta.env.DEV

class InstrumentService {
  // Mock数据存储
  private mockInstruments: Instrument[] = [...mockInstruments]
  private mockTransfers: InstrumentTransfer[] = [...mockInstrumentTransfers]
  private mockMaintenance: MaintenanceRecord[] = [...mockMaintenanceRecords]
  private mockCalibration: CalibrationRecord[] = []
  private mockDisposal: DisposalRecord[] = []
  // ==================== 仪器管理 ====================
  
  /**
   * 获取仪器列表
   */
  async getInstruments(query?: InstrumentQuery): Promise<PaginatedResult<Instrument>> {
    if (USE_MOCK) {
      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // 筛选数据
      let filtered = [...this.mockInstruments]
      
      if (query?.code) {
        filtered = filtered.filter(i => i.code.includes(query.code!))
      }
      if (query?.name) {
        filtered = filtered.filter(i => i.name.includes(query.name!))
      }
      if (query?.status) {
        filtered = filtered.filter(i => i.status === query.status)
      }
      if (query?.department) {
        filtered = filtered.filter(i => i.currentDepartment?.includes(query.department!))
      }
      
      // 分页
      const page = query?.page || 1
      const pageSize = query?.pageSize || 20
      const start = (page - 1) * pageSize
      const end = start + pageSize
      const items = filtered.slice(start, end)
      
      return {
        items,
        total: filtered.length,
        page,
        pageSize,
        totalPages: Math.ceil(filtered.length / pageSize)
      }
    }
    
    const response = await http.get<ApiResponse<PaginatedResult<Instrument>>>('/instruments', {
      params: query
    })
    return response.data.data!
  }

  /**
   * 获取仪器详情
   */
  async getInstrumentById(id: string): Promise<Instrument> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 200))
      const instrument = this.mockInstruments.find(i => i.id === id)
      if (!instrument) {
        throw new Error('仪器不存在')
      }
      return instrument
    }
    
    const response = await http.get<ApiResponse<Instrument>>(`/instruments/${id}`)
    return response.data.data!
  }

  /**
   * 通过编码获取仪器
   */
  async getInstrumentByCode(code: string): Promise<Instrument> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 200))
      const instrument = this.mockInstruments.find(i => i.code === code)
      if (!instrument) {
        throw new Error('仪器不存在')
      }
      return instrument
    }
    
    const response = await http.get<ApiResponse<Instrument>>(`/instruments/code/${code}`)
    return response.data.data!
  }

  /**
   * 创建仪器
   */
  async createInstrument(data: CreateInstrumentDto): Promise<Instrument> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 检查编码是否已存在
      if (this.mockInstruments.some(i => i.code === data.code)) {
        throw new Error('仪器编码已存在')
      }
      
      const newInstrument: Instrument = {
        id: `mock-${Date.now()}`,
        ...data,
        createdBy: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as Instrument
      
      this.mockInstruments.unshift(newInstrument)
      return newInstrument
    }
    
    const response = await http.post<ApiResponse<Instrument>>('/instruments', data)
    return response.data.data!
  }

  /**
   * 更新仪器
   */
  async updateInstrument(id: string, data: UpdateInstrumentDto): Promise<Instrument> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const index = this.mockInstruments.findIndex(i => i.id === id)
      if (index === -1) {
        throw new Error('仪器不存在')
      }
      
      const updated = {
        ...this.mockInstruments[index],
        ...data,
        updatedAt: new Date().toISOString()
      }
      
      this.mockInstruments[index] = updated
      return updated
    }
    
    const response = await http.put<ApiResponse<Instrument>>(`/instruments/${id}`, data)
    return response.data.data!
  }

  /**
   * 删除仪器
   */
  async deleteInstrument(id: string): Promise<void> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const index = this.mockInstruments.findIndex(i => i.id === id)
      if (index === -1) {
        throw new Error('仪器不存在')
      }
      
      this.mockInstruments.splice(index, 1)
      return
    }
    
    await http.delete(`/instruments/${id}`)
  }

  /**
   * 获取仪器统计数据
   */
  async getStatistics(params?: { startDate?: string; endDate?: string }): Promise<InstrumentStatistics> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // 计算统计数据
      const stats: InstrumentStatistics = {
        totalCount: this.mockInstruments.length,
        byStatus: {
          '在用': this.mockInstruments.filter(i => i.status === '在用').length,
          '备用': this.mockInstruments.filter(i => i.status === '备用').length,
          '维修中': this.mockInstruments.filter(i => i.status === '维修中').length,
          '校准中': this.mockInstruments.filter(i => i.status === '校准中').length,
          '待报废': this.mockInstruments.filter(i => i.status === '待报废').length,
          '已报废': this.mockInstruments.filter(i => i.status === '已报废').length
        },
        totalValue: this.mockInstruments.reduce((sum, i) => sum + (i.purchasePrice || 0), 0),
        averageAge: 3.5,
        maintenanceCount: this.mockMaintenance.length,
        transferCount: this.mockTransfers.length
      }
      
      return stats
    }
    
    const response = await http.get<ApiResponse<InstrumentStatistics>>('/instruments/statistics', {
      params
    })
    return response.data.data!
  }

  // ==================== 流转管理 ====================

  /**
   * 创建流转申请
   */
  async createTransfer(instrumentId: string, data: CreateTransferDto): Promise<InstrumentTransfer> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const instrument = this.mockInstruments.find(i => i.id === instrumentId)
      if (!instrument) {
        throw new Error('仪器不存在')
      }
      
      const newTransfer: InstrumentTransfer = {
        id: `transfer-${Date.now()}`,
        instrumentId,
        instrument,
        ...data,
        status: '待确认',
        createdBy: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as InstrumentTransfer
      
      this.mockTransfers.unshift(newTransfer)
      return newTransfer
    }
    
    const response = await http.post<ApiResponse<InstrumentTransfer>>(
      `/instruments/${instrumentId}/transfers`,
      data
    )
    return response.data.data!
  }

  /**
   * 获取仪器流转历史
   */
  async getInstrumentTransfers(instrumentId: string): Promise<InstrumentTransfer[]> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 200))
      return this.mockTransfers.filter(t => t.instrumentId === instrumentId)
    }
    
    const response = await http.get<ApiResponse<InstrumentTransfer[]>>(
      `/instruments/${instrumentId}/transfers`
    )
    return response.data.data!
  }

  /**
   * 获取流转列表
   */
  async getTransfers(query?: {
    page?: number
    pageSize?: number
    status?: string
  }): Promise<PaginatedResult<InstrumentTransfer>> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 300))
      
      let filtered = [...this.mockTransfers]
      
      if (query?.status) {
        filtered = filtered.filter(t => t.status === query.status)
      }
      
      const page = query?.page || 1
      const pageSize = query?.pageSize || 20
      const start = (page - 1) * pageSize
      const end = start + pageSize
      const items = filtered.slice(start, end)
      
      return {
        items,
        total: filtered.length,
        page,
        pageSize,
        totalPages: Math.ceil(filtered.length / pageSize)
      }
    }
    
    const response = await http.get<ApiResponse<PaginatedResult<InstrumentTransfer>>>('/transfers', {
      params: query
    })
    return response.data.data!
  }

  /**
   * 获取流转详情
   */
  async getTransferById(id: string): Promise<InstrumentTransfer> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 200))
      const transfer = this.mockTransfers.find(t => t.id === id)
      if (!transfer) {
        throw new Error('流转记录不存在')
      }
      return transfer
    }
    
    const response = await http.get<ApiResponse<InstrumentTransfer>>(`/transfers/${id}`)
    return response.data.data!
  }

  /**
   * 确认流转
   */
  async confirmTransfer(id: string, data: ConfirmTransferDto): Promise<InstrumentTransfer> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const index = this.mockTransfers.findIndex(t => t.id === id)
      if (index === -1) {
        throw new Error('流转记录不存在')
      }
      
      const updated = {
        ...this.mockTransfers[index],
        status: data.confirmed ? '已确认' : '已拒绝',
        confirmedBy: 'admin',
        confirmedAt: new Date().toISOString(),
        rejectionReason: data.rejectionReason,
        updatedAt: new Date().toISOString()
      }
      
      this.mockTransfers[index] = updated
      
      // 如果确认,更新仪器位置
      if (data.confirmed) {
        const instrument = this.mockInstruments.find(i => i.id === updated.instrumentId)
        if (instrument) {
          instrument.currentDepartment = updated.toDepartment
          instrument.currentLocation = updated.toLocation
        }
      }
      
      return updated
    }
    
    const response = await http.put<ApiResponse<InstrumentTransfer>>(
      `/transfers/${id}/confirm`,
      data
    )
    return response.data.data!
  }

  /**
   * 拒绝流转
   */
  async rejectTransfer(id: string, rejectionReason: string): Promise<InstrumentTransfer> {
    if (USE_MOCK) {
      return this.confirmTransfer(id, { confirmed: false, rejectionReason })
    }
    
    const response = await http.put<ApiResponse<InstrumentTransfer>>(
      `/transfers/${id}/reject`,
      { rejectionReason }
    )
    return response.data.data!
  }

  // ==================== 维护管理 ====================

  /**
   * 添加维护记录
   */
  async createMaintenance(instrumentId: string, data: CreateMaintenanceDto): Promise<MaintenanceRecord> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const instrument = this.mockInstruments.find(i => i.id === instrumentId)
      if (!instrument) {
        throw new Error('仪器不存在')
      }
      
      const newRecord: MaintenanceRecord = {
        id: `maintenance-${Date.now()}`,
        instrumentId,
        instrument,
        ...data,
        createdBy: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as MaintenanceRecord
      
      this.mockMaintenance.unshift(newRecord)
      return newRecord
    }
    
    const response = await http.post<ApiResponse<MaintenanceRecord>>(
      `/instruments/${instrumentId}/maintenance`,
      data
    )
    return response.data.data!
  }

  /**
   * 获取仪器维护历史
   */
  async getInstrumentMaintenance(instrumentId: string): Promise<MaintenanceRecord[]> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 200))
      return this.mockMaintenance.filter(m => m.instrumentId === instrumentId)
    }
    
    const response = await http.get<ApiResponse<MaintenanceRecord[]>>(
      `/instruments/${instrumentId}/maintenance`
    )
    return response.data.data!
  }

  /**
   * 获取维护记录详情
   */
  async getMaintenanceById(id: string): Promise<MaintenanceRecord> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 200))
      const record = this.mockMaintenance.find(m => m.id === id)
      if (!record) {
        throw new Error('维护记录不存在')
      }
      return record
    }
    
    const response = await http.get<ApiResponse<MaintenanceRecord>>(`/maintenance/${id}`)
    return response.data.data!
  }

  /**
   * 更新维护记录
   */
  async updateMaintenance(id: string, data: UpdateMaintenanceDto): Promise<MaintenanceRecord> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const index = this.mockMaintenance.findIndex(m => m.id === id)
      if (index === -1) {
        throw new Error('维护记录不存在')
      }
      
      const updated = {
        ...this.mockMaintenance[index],
        ...data,
        updatedAt: new Date().toISOString()
      }
      
      this.mockMaintenance[index] = updated
      return updated
    }
    
    const response = await http.put<ApiResponse<MaintenanceRecord>>(`/maintenance/${id}`, data)
    return response.data.data!
  }

  /**
   * 删除维护记录
   */
  async deleteMaintenance(id: string): Promise<void> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const index = this.mockMaintenance.findIndex(m => m.id === id)
      if (index === -1) {
        throw new Error('维护记录不存在')
      }
      
      this.mockMaintenance.splice(index, 1)
      return
    }
    
    await http.delete(`/maintenance/${id}`)
  }

  /**
   * 获取维护提醒列表
   */
  async getMaintenanceReminders(): Promise<MaintenanceReminder[]> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 200))
      // 返回空数组,实际应用中可以根据维护周期计算
      return []
    }
    
    const response = await http.get<ApiResponse<MaintenanceReminder[]>>('/maintenance/reminders')
    return response.data.data!
  }

  // ==================== 校准管理 ====================

  /**
   * 添加校准记录
   */
  async createCalibration(instrumentId: string, data: CreateCalibrationDto): Promise<CalibrationRecord> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const instrument = this.mockInstruments.find(i => i.id === instrumentId)
      if (!instrument) {
        throw new Error('仪器不存在')
      }
      
      const newRecord: CalibrationRecord = {
        id: `calibration-${Date.now()}`,
        instrumentId,
        instrument,
        ...data,
        createdBy: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as CalibrationRecord
      
      this.mockCalibration.unshift(newRecord)
      
      // 如果校准不合格,更新仪器状态
      if (data.result === '不合格') {
        const instIndex = this.mockInstruments.findIndex(i => i.id === instrumentId)
        if (instIndex !== -1) {
          this.mockInstruments[instIndex].status = '待报废'
        }
      }
      
      return newRecord
    }
    
    const response = await http.post<ApiResponse<CalibrationRecord>>(
      `/instruments/${instrumentId}/calibration`,
      data
    )
    return response.data.data!
  }

  /**
   * 获取仪器校准历史
   */
  async getInstrumentCalibration(instrumentId: string): Promise<CalibrationRecord[]> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 200))
      return this.mockCalibration.filter(c => c.instrumentId === instrumentId)
    }
    
    const response = await http.get<ApiResponse<CalibrationRecord[]>>(
      `/instruments/${instrumentId}/calibration`
    )
    return response.data.data!
  }

  /**
   * 获取校准记录详情
   */
  async getCalibrationById(id: string): Promise<CalibrationRecord> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 200))
      const record = this.mockCalibration.find(c => c.id === id)
      if (!record) {
        throw new Error('校准记录不存在')
      }
      return record
    }
    
    const response = await http.get<ApiResponse<CalibrationRecord>>(`/calibration/${id}`)
    return response.data.data!
  }

  /**
   * 更新校准记录
   */
  async updateCalibration(id: string, data: UpdateCalibrationDto): Promise<CalibrationRecord> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const index = this.mockCalibration.findIndex(c => c.id === id)
      if (index === -1) {
        throw new Error('校准记录不存在')
      }
      
      const updated = {
        ...this.mockCalibration[index],
        ...data,
        updatedAt: new Date().toISOString()
      }
      
      this.mockCalibration[index] = updated
      return updated
    }
    
    const response = await http.put<ApiResponse<CalibrationRecord>>(`/calibration/${id}`, data)
    return response.data.data!
  }

  /**
   * 删除校准记录
   */
  async deleteCalibration(id: string): Promise<void> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const index = this.mockCalibration.findIndex(c => c.id === id)
      if (index === -1) {
        throw new Error('校准记录不存在')
      }
      
      this.mockCalibration.splice(index, 1)
      return
    }
    
    await http.delete(`/calibration/${id}`)
  }

  /**
   * 获取即将到期的校准列表
   */
  async getExpiringCalibrations(): Promise<CalibrationExpiring[]> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 200))
      // 返回空数组,实际应用中可以根据校准周期计算
      return []
    }
    
    const response = await http.get<ApiResponse<CalibrationExpiring[]>>('/calibration/expiring')
    return response.data.data!
  }

  // ==================== 报废管理 ====================

  /**
   * 创建报废申请
   */
  async createDisposal(instrumentId: string, data: CreateDisposalDto): Promise<DisposalRecord> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const instrument = this.mockInstruments.find(i => i.id === instrumentId)
      if (!instrument) {
        throw new Error('仪器不存在')
      }
      
      const newRecord: DisposalRecord = {
        id: `disposal-${Date.now()}`,
        instrumentId,
        instrument,
        ...data,
        status: '待审批',
        createdBy: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      } as DisposalRecord
      
      this.mockDisposal.unshift(newRecord)
      
      // 更新仪器状态为待报废
      const instIndex = this.mockInstruments.findIndex(i => i.id === instrumentId)
      if (instIndex !== -1) {
        this.mockInstruments[instIndex].status = '待报废'
      }
      
      return newRecord
    }
    
    const response = await http.post<ApiResponse<DisposalRecord>>(
      `/instruments/${instrumentId}/disposal`,
      data
    )
    return response.data.data!
  }

  /**
   * 获取报废申请列表
   */
  async getDisposals(query?: {
    page?: number
    pageSize?: number
    status?: string
  }): Promise<PaginatedResult<DisposalRecord>> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 300))
      
      let filtered = [...this.mockDisposal]
      
      if (query?.status) {
        filtered = filtered.filter(d => d.status === query.status)
      }
      
      const page = query?.page || 1
      const pageSize = query?.pageSize || 20
      const start = (page - 1) * pageSize
      const end = start + pageSize
      const items = filtered.slice(start, end)
      
      return {
        items,
        total: filtered.length,
        page,
        pageSize,
        totalPages: Math.ceil(filtered.length / pageSize)
      }
    }
    
    const response = await http.get<ApiResponse<PaginatedResult<DisposalRecord>>>('/disposals', {
      params: query
    })
    return response.data.data!
  }

  /**
   * 获取报废申请详情
   */
  async getDisposalById(id: string): Promise<DisposalRecord> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 200))
      const record = this.mockDisposal.find(d => d.id === id)
      if (!record) {
        throw new Error('报废记录不存在')
      }
      return record
    }
    
    const response = await http.get<ApiResponse<DisposalRecord>>(`/disposals/${id}`)
    return response.data.data!
  }

  /**
   * 批准报废申请
   */
  async approveDisposal(id: string, data: ApproveDisposalDto): Promise<DisposalRecord> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const index = this.mockDisposal.findIndex(d => d.id === id)
      if (index === -1) {
        throw new Error('报废记录不存在')
      }
      
      const updated = {
        ...this.mockDisposal[index],
        status: data.approved ? '已批准' : '已拒绝',
        approvedBy: 'admin',
        approvedAt: new Date().toISOString(),
        rejectionReason: data.rejectionReason,
        updatedAt: new Date().toISOString()
      }
      
      this.mockDisposal[index] = updated
      
      // 如果批准,更新仪器状态为已报废
      if (data.approved) {
        const instrument = this.mockInstruments.find(i => i.id === updated.instrumentId)
        if (instrument) {
          instrument.status = '已报废'
        }
      }
      
      return updated
    }
    
    const response = await http.put<ApiResponse<DisposalRecord>>(`/disposals/${id}/approve`, data)
    return response.data.data!
  }

  /**
   * 拒绝报废申请
   */
  async rejectDisposal(id: string, rejectionReason: string): Promise<DisposalRecord> {
    if (USE_MOCK) {
      return this.approveDisposal(id, { approved: false, rejectionReason })
    }
    
    const response = await http.put<ApiResponse<DisposalRecord>>(
      `/disposals/${id}/reject`,
      { rejectionReason }
    )
    return response.data.data!
  }

  // ==================== 文档管理 ====================

  /**
   * 上传仪器文档
   */
  async uploadInstrumentDocument(
    instrumentId: string,
    file: File,
    documentType: string,
    description?: string
  ): Promise<InstrumentDocument> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      // Mock返回文档对象
      return {
        id: `doc-${Date.now()}`,
        instrumentId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        documentType,
        description,
        uploadedBy: 'admin',
        uploadedAt: new Date().toISOString()
      } as InstrumentDocument
    }
    
    const formData = new FormData()
    formData.append('file', file)
    formData.append('documentType', documentType)
    if (description) {
      formData.append('description', description)
    }

    const response = await http.post<ApiResponse<InstrumentDocument>>(
      `/instruments/${instrumentId}/documents`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    )
    return response.data.data!
  }

  /**
   * 获取仪器文档列表
   */
  async getInstrumentDocuments(instrumentId: string): Promise<InstrumentDocument[]> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 200))
      // 返回空数组,文档管理功能暂不实现mock
      return []
    }
    
    const response = await http.get<ApiResponse<InstrumentDocument[]>>(
      `/instruments/${instrumentId}/documents`
    )
    return response.data.data!
  }

  /**
   * 下载文档
   */
  async downloadDocument(id: string): Promise<Blob> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 500))
      // Mock返回空Blob
      return new Blob(['Mock document content'], { type: 'text/plain' })
    }
    
    const response = await http.get(`/documents/${id}`, {
      responseType: 'blob'
    })
    return response.data
  }

  /**
   * 删除文档
   */
  async deleteDocument(id: string): Promise<void> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 300))
      return
    }
    
    await http.delete(`/documents/${id}`)
  }

  /**
   * 上传维护文档
   */
  async uploadMaintenanceDocument(
    maintenanceId: string,
    file: File,
    description?: string
  ): Promise<any> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return {
        id: `doc-${Date.now()}`,
        maintenanceId,
        fileName: file.name,
        fileSize: file.size,
        uploadedBy: 'admin',
        uploadedAt: new Date().toISOString()
      }
    }
    
    const formData = new FormData()
    formData.append('file', file)
    if (description) {
      formData.append('description', description)
    }

    const response = await http.post<ApiResponse<any>>(
      `/maintenance/${maintenanceId}/documents`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    )
    return response.data.data!
  }

  /**
   * 上传报废文档
   */
  async uploadDisposalDocument(
    disposalId: string,
    file: File,
    description?: string
  ): Promise<any> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return {
        id: `doc-${Date.now()}`,
        disposalId,
        fileName: file.name,
        fileSize: file.size,
        uploadedBy: 'admin',
        uploadedAt: new Date().toISOString()
      }
    }
    
    const formData = new FormData()
    formData.append('file', file)
    if (description) {
      formData.append('description', description)
    }

    const response = await http.post<ApiResponse<any>>(
      `/disposals/${disposalId}/documents`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    )
    return response.data.data!
  }

  // ==================== 导出功能 ====================

  /**
   * 导出仪器列表
   */
  async exportInstruments(query?: InstrumentQuery, format: 'xlsx' | 'csv' = 'xlsx'): Promise<Blob> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      // Mock返回空Blob
      const content = '仪器编码,仪器名称,状态,部门\n'
      return new Blob([content], { type: 'text/csv' })
    }
    
    const response = await http.get('/instruments/export', {
      params: { ...query, format },
      responseType: 'blob'
    })
    return response.data
  }

  /**
   * 导出流转记录
   */
  async exportTransfers(instrumentId: string, format: 'xlsx' | 'csv' = 'xlsx'): Promise<Blob> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      const content = '流转时间,源部门,目标部门,状态\n'
      return new Blob([content], { type: 'text/csv' })
    }
    
    const response = await http.get(`/instruments/${instrumentId}/transfers/export`, {
      params: { format },
      responseType: 'blob'
    })
    return response.data
  }

  /**
   * 导出维护记录
   */
  async exportMaintenance(instrumentId: string, format: 'xlsx' | 'csv' = 'xlsx'): Promise<Blob> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      const content = '维护时间,维护类型,维护内容,维护人员\n'
      return new Blob([content], { type: 'text/csv' })
    }
    
    const response = await http.get(`/instruments/${instrumentId}/maintenance/export`, {
      params: { format },
      responseType: 'blob'
    })
    return response.data
  }

  /**
   * 导出统计报表
   */
  async exportStatistics(params?: { startDate?: string; endDate?: string }, format: 'xlsx' | 'csv' = 'xlsx'): Promise<Blob> {
    if (USE_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      const content = '统计项,数值\n总数量,' + this.mockInstruments.length + '\n'
      return new Blob([content], { type: 'text/csv' })
    }
    
    const response = await http.get('/instruments/statistics/export', {
      params: { ...params, format },
      responseType: 'blob'
    })
    return response.data
  }
}

export default new InstrumentService()
