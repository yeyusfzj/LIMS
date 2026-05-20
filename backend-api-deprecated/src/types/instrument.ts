/**
 * 仪器管理相关类型定义
 */

// ============================================
// 枚举类型 (与 Prisma Schema 保持一致)
// ============================================

/**
 * 仪器状态枚举
 */
export enum InstrumentStatus {
  IN_USE = 'IN_USE',                    // 在用
  STANDBY = 'STANDBY',                  // 备用
  MAINTENANCE = 'MAINTENANCE',          // 维修中
  CALIBRATING = 'CALIBRATING',          // 校准中
  PENDING_DISPOSAL = 'PENDING_DISPOSAL', // 待报废
  DISPOSED = 'DISPOSED'                 // 已报废
}

/**
 * 流转状态枚举
 */
export enum InstrumentTransferStatus {
  PENDING = 'PENDING',      // 待确认
  CONFIRMED = 'CONFIRMED',  // 已确认
  REJECTED = 'REJECTED',    // 已拒绝
  COMPLETED = 'COMPLETED'   // 已完成
}

/**
 * 报废状态枚举
 */
export enum DisposalStatus {
  PENDING = 'PENDING',      // 待审批
  APPROVED = 'APPROVED',    // 已批准
  REJECTED = 'REJECTED',    // 已拒绝
  COMPLETED = 'COMPLETED'   // 已完成
}

/**
 * 维护类型枚举
 */
export enum MaintenanceType {
  ROUTINE = 'ROUTINE',                  // 例行保养
  REPAIR = 'REPAIR',                    // 维修
  PARTS_REPLACEMENT = 'PARTS_REPLACEMENT', // 部件更换
  CLEANING = 'CLEANING',                // 清洁
  OTHER = 'OTHER'                       // 其他
}

/**
 * 校准结果枚举
 */
export enum CalibrationResult {
  QUALIFIED = 'QUALIFIED',      // 合格
  UNQUALIFIED = 'UNQUALIFIED',  // 不合格
  CONDITIONAL = 'CONDITIONAL'   // 有条件合格
}

// ============================================
// 仪器管理 - 实体接口
// ============================================

/**
 * 技术参数接口
 */
export interface TechnicalParams {
  measurementRange?: string  // 测量范围
  precision?: string         // 精度
  resolution?: string        // 分辨率
  accuracy?: string          // 准确度
  sensitivity?: string       // 灵敏度
  [key: string]: any        // 允许其他自定义参数
}

/**
 * 仪器实体
 */
export interface Instrument {
  id: string
  code: string
  name: string
  model?: string
  manufacturer?: string
  serialNumber?: string
  purchaseDate?: Date
  purchasePrice?: number
  technicalParams?: TechnicalParams
  status: InstrumentStatus
  currentLocation?: string
  currentDepartment?: string
  currentResponsible?: string
  usageYears?: number
  warrantyExpiry?: Date
  description?: string
  remarks?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

/**
 * 仪器流转记录实体
 */
export interface InstrumentTransfer {
  id: string
  instrumentId: string
  fromDepartment: string
  toDepartment: string
  fromResponsible: string
  toResponsible: string
  transferReason?: string
  expectedReturnDate?: Date
  status: InstrumentTransferStatus
  confirmedAt?: Date
  confirmedBy?: string
  rejectedAt?: Date
  rejectedBy?: string
  rejectionReason?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

/**
 * 维护记录实体
 */
export interface MaintenanceRecord {
  id: string
  instrumentId: string
  maintenanceDate: Date
  maintenanceType: MaintenanceType
  maintenanceContent: string
  maintenancePerson: string
  maintenanceCost?: number
  nextMaintenanceDate?: Date
  remarks?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

/**
 * 校准记录实体
 */
export interface CalibrationRecord {
  id: string
  instrumentId: string
  calibrationDate: Date
  calibrationOrg: string
  certificateNumber?: string
  calibrationResult: CalibrationResult
  nextCalibrationDate?: Date
  remarks?: string
  certificateFileId?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

/**
 * 报废记录实体
 */
export interface DisposalRecord {
  id: string
  instrumentId: string
  disposalReason: string
  disposalDate?: Date
  status: DisposalStatus
  approvedBy?: string
  approvedAt?: Date
  rejectedBy?: string
  rejectedAt?: Date
  rejectionReason?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

/**
 * 仪器文档实体
 */
export interface InstrumentDocument {
  id: string
  instrumentId: string
  fileName: string
  fileSize: number
  filePath: string
  fileType: string
  documentType: string  // manual, certificate, photo, report, other
  description?: string
  uploadedBy: string
  uploadedAt: Date
}

/**
 * 维护文档实体
 */
export interface MaintenanceDocument {
  id: string
  maintenanceId: string
  fileName: string
  fileSize: number
  filePath: string
  fileType: string
  description?: string
  uploadedBy: string
  uploadedAt: Date
}

/**
 * 报废文档实体
 */
export interface DisposalDocument {
  id: string
  disposalId: string
  fileName: string
  fileSize: number
  filePath: string
  fileType: string
  description?: string
  uploadedBy: string
  uploadedAt: Date
}

// ============================================
// 仪器管理 - DTO 接口
// ============================================

/**
 * 创建仪器 DTO
 */
export interface CreateInstrumentDto {
  code: string
  name: string
  model?: string
  manufacturer?: string
  serialNumber?: string
  purchaseDate?: Date | string
  purchasePrice?: number
  technicalParams?: TechnicalParams
  status?: InstrumentStatus
  currentLocation?: string
  currentDepartment?: string
  currentResponsible?: string
  usageYears?: number
  warrantyExpiry?: Date | string
  description?: string
  remarks?: string
}

/**
 * 更新仪器 DTO
 */
export interface UpdateInstrumentDto {
  name?: string
  model?: string
  manufacturer?: string
  serialNumber?: string
  purchaseDate?: Date | string
  purchasePrice?: number
  technicalParams?: TechnicalParams
  status?: InstrumentStatus
  currentLocation?: string
  currentDepartment?: string
  currentResponsible?: string
  usageYears?: number
  warrantyExpiry?: Date | string
  description?: string
  remarks?: string
}

/**
 * 仪器查询参数 DTO
 */
export interface InstrumentQueryDto {
  page?: number
  pageSize?: number
  code?: string
  name?: string
  status?: InstrumentStatus
  department?: string
  location?: string
  manufacturer?: string
  search?: string  // 模糊搜索(编码、名称、型号)
  startDate?: Date | string  // 购置日期范围
  endDate?: Date | string
}

/**
 * 仪器响应数据
 */
export interface InstrumentResponse extends Instrument {
  transferCount?: number      // 流转次数
  maintenanceCount?: number   // 维护次数
  calibrationCount?: number   // 校准次数
  documentCount?: number      // 文档数量
  lastMaintenanceDate?: Date  // 最后维护日期
  lastCalibrationDate?: Date  // 最后校准日期
  nextMaintenanceDate?: Date  // 下次维护日期
  nextCalibrationDate?: Date  // 下次校准日期
}

/**
 * 仪器详情响应数据
 */
export interface InstrumentDetailResponse extends InstrumentResponse {
  transfers?: InstrumentTransfer[]
  maintenanceRecords?: MaintenanceRecord[]
  calibrationRecords?: CalibrationRecord[]
  documents?: InstrumentDocument[]
  disposalRecord?: DisposalRecord
}

// ============================================
// 流转管理 - DTO 接口
// ============================================

/**
 * 创建流转申请 DTO
 */
export interface CreateTransferDto {
  instrumentId: string
  fromDepartment: string
  toDepartment: string
  fromResponsible: string
  toResponsible: string
  transferReason?: string
  expectedReturnDate?: Date | string
}

/**
 * 确认流转 DTO
 */
export interface ConfirmTransferDto {
  comments?: string
}

/**
 * 拒绝流转 DTO
 */
export interface RejectTransferDto {
  rejectionReason: string
}

/**
 * 流转查询参数 DTO
 */
export interface TransferQueryDto {
  page?: number
  pageSize?: number
  instrumentId?: string
  status?: InstrumentTransferStatus
  department?: string  // 来源或目标部门
  startDate?: Date | string
  endDate?: Date | string
}

/**
 * 流转响应数据
 */
export interface TransferResponse extends InstrumentTransfer {
  instrument?: {
    id: string
    code: string
    name: string
    model?: string
  }
}

// ============================================
// 维护管理 - DTO 接口
// ============================================

/**
 * 创建维护记录 DTO
 */
export interface CreateMaintenanceDto {
  instrumentId: string
  maintenanceDate: Date | string
  maintenanceType: MaintenanceType
  maintenanceContent: string
  maintenancePerson: string
  maintenanceCost?: number
  nextMaintenanceDate?: Date | string
  remarks?: string
}

/**
 * 更新维护记录 DTO
 */
export interface UpdateMaintenanceDto {
  maintenanceDate?: Date | string
  maintenanceType?: MaintenanceType
  maintenanceContent?: string
  maintenancePerson?: string
  maintenanceCost?: number
  nextMaintenanceDate?: Date | string
  remarks?: string
}

/**
 * 维护查询参数 DTO
 */
export interface MaintenanceQueryDto {
  page?: number
  pageSize?: number
  instrumentId?: string
  maintenanceType?: MaintenanceType
  startDate?: Date | string
  endDate?: Date | string
  maintenancePerson?: string
}

/**
 * 维护响应数据
 */
export interface MaintenanceResponse extends MaintenanceRecord {
  instrument?: {
    id: string
    code: string
    name: string
    model?: string
  }
  documents?: MaintenanceDocument[]
}

/**
 * 维护提醒数据
 */
export interface MaintenanceReminder {
  instrumentId: string
  instrumentCode: string
  instrumentName: string
  lastMaintenanceDate?: Date
  nextMaintenanceDate: Date
  daysUntilMaintenance: number
  isOverdue: boolean
}

// ============================================
// 校准管理 - DTO 接口
// ============================================

/**
 * 创建校准记录 DTO
 */
export interface CreateCalibrationDto {
  instrumentId: string
  calibrationDate: Date | string
  calibrationOrg: string
  certificateNumber?: string
  calibrationResult: CalibrationResult
  nextCalibrationDate?: Date | string
  remarks?: string
  certificateFileId?: string
}

/**
 * 更新校准记录 DTO
 */
export interface UpdateCalibrationDto {
  calibrationDate?: Date | string
  calibrationOrg?: string
  certificateNumber?: string
  calibrationResult?: CalibrationResult
  nextCalibrationDate?: Date | string
  remarks?: string
  certificateFileId?: string
}

/**
 * 校准查询参数 DTO
 */
export interface CalibrationQueryDto {
  page?: number
  pageSize?: number
  instrumentId?: string
  calibrationResult?: CalibrationResult
  startDate?: Date | string
  endDate?: Date | string
  calibrationOrg?: string
}

/**
 * 校准响应数据
 */
export interface CalibrationResponse extends CalibrationRecord {
  instrument?: {
    id: string
    code: string
    name: string
    model?: string
  }
  certificateFile?: InstrumentDocument
}

/**
 * 校准到期提醒数据
 */
export interface CalibrationReminder {
  instrumentId: string
  instrumentCode: string
  instrumentName: string
  lastCalibrationDate?: Date
  nextCalibrationDate: Date
  daysUntilExpiry: number
  isExpired: boolean
}

// ============================================
// 报废管理 - DTO 接口
// ============================================

/**
 * 创建报废申请 DTO
 */
export interface CreateDisposalDto {
  instrumentId: string
  disposalReason: string
  disposalDate?: Date | string
}

/**
 * 批准报废 DTO
 */
export interface ApproveDisposalDto {
  comments?: string
}

/**
 * 拒绝报废 DTO
 */
export interface RejectDisposalDto {
  rejectionReason: string
}

/**
 * 报废查询参数 DTO
 */
export interface DisposalQueryDto {
  page?: number
  pageSize?: number
  status?: DisposalStatus
  startDate?: Date | string
  endDate?: Date | string
}

/**
 * 报废响应数据
 */
export interface DisposalResponse extends DisposalRecord {
  instrument?: {
    id: string
    code: string
    name: string
    model?: string
    purchaseDate?: Date
    purchasePrice?: number
  }
  documents?: DisposalDocument[]
}

// ============================================
// 文档管理 - DTO 接口
// ============================================

/**
 * 上传文档 DTO
 */
export interface UploadDocumentDto {
  fileName: string
  fileSize: number
  filePath: string
  fileType: string
  documentType?: string
  description?: string
}

/**
 * 文档查询参数 DTO
 */
export interface DocumentQueryDto {
  page?: number
  pageSize?: number
  instrumentId?: string
  documentType?: string
  uploadedBy?: string
  startDate?: Date | string
  endDate?: Date | string
}

// ============================================
// 统计分析 - DTO 接口
// ============================================

/**
 * 仪器统计数据
 */
export interface InstrumentStatistics {
  totalCount: number
  statusDistribution: {
    status: InstrumentStatus
    count: number
    percentage: number
  }[]
  departmentDistribution: {
    department: string
    count: number
    percentage: number
  }[]
  manufacturerDistribution: {
    manufacturer: string
    count: number
    percentage: number
  }[]
  averageUsageYears: number
  totalValue: number
}

/**
 * 维护统计数据
 */
export interface MaintenanceStatistics {
  totalCount: number
  typeDistribution: {
    type: MaintenanceType
    count: number
    percentage: number
  }[]
  totalCost: number
  averageCost: number
  upcomingMaintenanceCount: number
  overdueMaintenanceCount: number
}

/**
 * 校准统计数据
 */
export interface CalibrationStatistics {
  totalCount: number
  resultDistribution: {
    result: CalibrationResult
    count: number
    percentage: number
  }[]
  upcomingCalibrationCount: number
  expiredCalibrationCount: number
  qualifiedRate: number
}

/**
 * 流转统计数据
 */
export interface TransferStatistics {
  totalCount: number
  statusDistribution: {
    status: InstrumentTransferStatus
    count: number
    percentage: number
  }[]
  departmentActivity: {
    department: string
    outgoingCount: number
    incomingCount: number
  }[]
}

/**
 * 综合统计数据
 */
export interface ComprehensiveStatistics {
  instrument: InstrumentStatistics
  maintenance: MaintenanceStatistics
  calibration: CalibrationStatistics
  transfer: TransferStatistics
}

// ============================================
// 分页结果类型
// ============================================

/**
 * 分页结果基础接口
 */
export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * 仪器分页结果
 */
export interface PaginatedInstrumentResult extends PaginatedResult<InstrumentResponse> {}

/**
 * 流转分页结果
 */
export interface PaginatedTransferResult extends PaginatedResult<TransferResponse> {}

/**
 * 维护分页结果
 */
export interface PaginatedMaintenanceResult extends PaginatedResult<MaintenanceResponse> {}

/**
 * 校准分页结果
 */
export interface PaginatedCalibrationResult extends PaginatedResult<CalibrationResponse> {}

/**
 * 报废分页结果
 */
export interface PaginatedDisposalResult extends PaginatedResult<DisposalResponse> {}

/**
 * 文档分页结果
 */
export interface PaginatedDocumentResult extends PaginatedResult<InstrumentDocument> {}
