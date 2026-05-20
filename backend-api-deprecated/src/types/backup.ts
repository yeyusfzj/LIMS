/**
 * 数据备份类型定义
 */

export enum BackupStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  VERIFIED = 'VERIFIED',
}

export enum BackupType {
  MANUAL = 'MANUAL',
  SCHEDULED = 'SCHEDULED',
}

export interface BackupRecord {
  id: string
  filename: string
  filepath: string
  size: number
  type: BackupType
  status: BackupStatus
  checksum?: string
  error?: string
  createdBy: string
  createdAt: Date
  completedAt?: Date
  verifiedAt?: Date
}

export interface CreateBackupDto {
  type?: BackupType
  description?: string
}

export interface BackupResult {
  id: string
  filename: string
  size: number
  checksum: string
  status: BackupStatus
  createdAt: Date
}

export interface BackupListQuery {
  page?: number
  pageSize?: number
  status?: BackupStatus
  type?: BackupType
  startDate?: Date
  endDate?: Date
}

export interface VerifyBackupResult {
  isValid: boolean
  checksum: string
  size: number
  error?: string
}
