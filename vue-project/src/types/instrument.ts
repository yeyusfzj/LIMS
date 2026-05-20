// 仪器管理模块类型定义

// 仪器状态枚举
export enum InstrumentStatus {
  IN_USE = 'IN_USE',                    // 在用
  STANDBY = 'STANDBY',                  // 备用
  MAINTENANCE = 'MAINTENANCE',          // 维修中
  CALIBRATING = 'CALIBRATING',          // 校准中
  PENDING_DISPOSAL = 'PENDING_DISPOSAL', // 待报废
  DISPOSED = 'DISPOSED'                 // 已报废
}

// 流转状态枚举
export enum InstrumentTransferStatus {
  PENDING = 'PENDING',      // 待确认
  CONFIRMED = 'CONFIRMED',  // 已确认
  REJECTED = 'REJECTED',    // 已拒绝
  COMPLETED = 'COMPLETED'   // 已完成
}

// 报废状态枚举
export enum DisposalStatus {
  PENDING = 'PENDING',      // 待审批
  APPROVED = 'APPROVED',    // 已批准
  REJECTED = 'REJECTED',    // 已拒绝
  COMPLETED = 'COMPLETED'   // 已完成
}

// 维护类型枚举
export enum MaintenanceType {
  ROUTINE = 'ROUTINE',                  // 例行保养
  REPAIR = 'REPAIR',                    // 维修
  PARTS_REPLACEMENT = 'PARTS_REPLACEMENT', // 部件更换
  CLEANING = 'CLEANING',                // 清洁
  OTHER = 'OTHER'                       // 其他
}

// 校准结果枚举
export enum CalibrationResult {
  QUALIFIED = 'QUALIFIED',      // 合格
  UNQUALIFIED = 'UNQUALIFIED',  // 不合格
  CONDITIONAL = 'CONDITIONAL'   // 有条件合格
}

// 仪器接口
export interface Instrument {
  id: string
  code: string
  name: string
  model?: string
  manufacturer?: string
  serialNumber?: string
  purchaseDate?: string
  purchasePrice?: number
  technicalParams?: Record<string, any>
  status: InstrumentStatus
  currentLocation?: string
  currentDepartment?: string
  currentResponsible?: string
  usageYears?: number
  warrantyExpiry?: string
  description?: string
  remarks?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

// 创建仪器DTO
export interface CreateInstrumentDto {
  code: string
  name: string
  model?: string
  manufacturer?: string
  serialNumber?: string
  purchaseDate?: string
  purchasePrice?: number
  technicalParams?: Record<string, any>
  status?: InstrumentStatus
  currentLocation?: string
  currentDepartment?: string
  currentResponsible?: string
  description?: string
  remarks?: string
}

// 更新仪器DTO
export interface UpdateInstrumentDto {
  name?: string
  model?: string
  manufacturer?: string
  serialNumber?: string
  purchaseDate?: string
  purchasePrice?: number
  technicalParams?: Record<string, any>
  status?: InstrumentStatus
  currentLocation?: string
  currentDepartment?: string
  currentResponsible?: string
  description?: string
  remarks?: string
}

// 仪器查询参数
export interface InstrumentQuery {
  page?: number
  pageSize?: number
  code?: string
  name?: string
  status?: InstrumentStatus
  department?: string
  search?: string
}

// 分页结果
export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 流转记录
export interface InstrumentTransfer {
  id: string
  instrumentId: string
  instrument?: Instrument
  fromDepartment: string
  toDepartment: string
  fromResponsible: string
  toResponsible: string
  transferReason?: string
  expectedReturnDate?: string
  status: InstrumentTransferStatus
  confirmedAt?: string
  confirmedBy?: string
  rejectedAt?: string
  rejectedBy?: string
  rejectionReason?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

// 创建流转DTO
export interface CreateTransferDto {
  fromDepartment: string
  toDepartment: string
  fromResponsible: string
  toResponsible: string
  transferReason?: string
  expectedReturnDate?: string
}

// 确认流转DTO
export interface ConfirmTransferDto {
  confirmed: boolean
  rejectionReason?: string
}

// 维护记录
export interface MaintenanceRecord {
  id: string
  instrumentId: string
  instrument?: Instrument
  maintenanceDate: string
  maintenanceType: MaintenanceType
  maintenanceContent: string
  maintenancePerson: string
  maintenanceCost?: number
  nextMaintenanceDate?: string
  remarks?: string
  documents?: MaintenanceDocument[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

// 创建维护记录DTO
export interface CreateMaintenanceDto {
  maintenanceDate: string
  maintenanceType: MaintenanceType
  maintenanceContent: string
  maintenancePerson: string
  maintenanceCost?: number
  nextMaintenanceDate?: string
  remarks?: string
}

// 更新维护记录DTO
export interface UpdateMaintenanceDto {
  maintenanceDate?: string
  maintenanceType?: MaintenanceType
  maintenanceContent?: string
  maintenancePerson?: string
  maintenanceCost?: number
  nextMaintenanceDate?: string
  remarks?: string
}

// 校准记录
export interface CalibrationRecord {
  id: string
  instrumentId: string
  instrument?: Instrument
  calibrationDate: string
  calibrationOrg: string
  certificateNumber?: string
  calibrationResult: CalibrationResult
  nextCalibrationDate?: string
  remarks?: string
  certificateFileId?: string
  certificateFile?: InstrumentDocument
  createdBy: string
  createdAt: string
  updatedAt: string
}

// 创建校准记录DTO
export interface CreateCalibrationDto {
  calibrationDate: string
  calibrationOrg: string
  certificateNumber?: string
  calibrationResult: CalibrationResult
  nextCalibrationDate?: string
  remarks?: string
}

// 更新校准记录DTO
export interface UpdateCalibrationDto {
  calibrationDate?: string
  calibrationOrg?: string
  certificateNumber?: string
  calibrationResult?: CalibrationResult
  nextCalibrationDate?: string
  remarks?: string
}

// 报废记录
export interface DisposalRecord {
  id: string
  instrumentId: string
  instrument?: Instrument
  disposalReason: string
  disposalDate?: string
  status: DisposalStatus
  approvedBy?: string
  approvedAt?: string
  rejectedBy?: string
  rejectedAt?: string
  rejectionReason?: string
  documents?: DisposalDocument[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

// 创建报废申请DTO
export interface CreateDisposalDto {
  disposalReason: string
}

// 审批报废DTO
export interface ApproveDisposalDto {
  approved: boolean
  rejectionReason?: string
}

// 仪器文档
export interface InstrumentDocument {
  id: string
  instrumentId: string
  fileName: string
  fileSize: number
  filePath: string
  fileType: string
  documentType: string
  description?: string
  uploadedBy: string
  uploadedAt: string
}

// 维护文档
export interface MaintenanceDocument {
  id: string
  maintenanceId: string
  fileName: string
  fileSize: number
  filePath: string
  fileType: string
  description?: string
  uploadedBy: string
  uploadedAt: string
}

// 报废文档
export interface DisposalDocument {
  id: string
  disposalId: string
  fileName: string
  fileSize: number
  filePath: string
  fileType: string
  description?: string
  uploadedBy: string
  uploadedAt: string
}

// 仪器统计数据
export interface InstrumentStatistics {
  totalCount: number
  statusDistribution: {
    status: InstrumentStatus
    count: number
  }[]
  departmentDistribution: {
    department: string
    count: number
    totalValue: number
  }[]
  totalValue: number
  usageYearsDistribution: {
    range: string
    count: number
  }[]
  expiringCalibrations: {
    count: number
    instruments: Instrument[]
  }
  maintenanceFrequency: {
    instrumentId: string
    instrumentName: string
    maintenanceCount: number
  }[]
}

// 维护提醒
export interface MaintenanceReminder {
  id: string
  instrumentId: string
  instrumentCode: string
  instrumentName: string
  nextMaintenanceDate: string
  daysUntilMaintenance: number
}

// 校准到期提醒
export interface CalibrationExpiring {
  id: string
  instrumentId: string
  instrumentCode: string
  instrumentName: string
  nextCalibrationDate: string
  daysUntilExpiry: number
}

// API响应格式
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
}

// 状态标签映射
export const InstrumentStatusLabels: Record<InstrumentStatus, string> = {
  [InstrumentStatus.IN_USE]: '在用',
  [InstrumentStatus.STANDBY]: '备用',
  [InstrumentStatus.MAINTENANCE]: '维修中',
  [InstrumentStatus.CALIBRATING]: '校准中',
  [InstrumentStatus.PENDING_DISPOSAL]: '待报废',
  [InstrumentStatus.DISPOSED]: '已报废'
}

// 流转状态标签映射
export const TransferStatusLabels: Record<InstrumentTransferStatus, string> = {
  [InstrumentTransferStatus.PENDING]: '待确认',
  [InstrumentTransferStatus.CONFIRMED]: '已确认',
  [InstrumentTransferStatus.REJECTED]: '已拒绝',
  [InstrumentTransferStatus.COMPLETED]: '已完成'
}

// 报废状态标签映射
export const DisposalStatusLabels: Record<DisposalStatus, string> = {
  [DisposalStatus.PENDING]: '待审批',
  [DisposalStatus.APPROVED]: '已批准',
  [DisposalStatus.REJECTED]: '已拒绝',
  [DisposalStatus.COMPLETED]: '已完成'
}

// 维护类型标签映射
export const MaintenanceTypeLabels: Record<MaintenanceType, string> = {
  [MaintenanceType.ROUTINE]: '例行保养',
  [MaintenanceType.REPAIR]: '维修',
  [MaintenanceType.PARTS_REPLACEMENT]: '部件更换',
  [MaintenanceType.CLEANING]: '清洁',
  [MaintenanceType.OTHER]: '其他'
}

// 校准结果标签映射
export const CalibrationResultLabels: Record<CalibrationResult, string> = {
  [CalibrationResult.QUALIFIED]: '合格',
  [CalibrationResult.UNQUALIFIED]: '不合格',
  [CalibrationResult.CONDITIONAL]: '有条件合格'
}
