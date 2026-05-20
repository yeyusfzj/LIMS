// 样品相关类型定义

import { SampleStatus, Priority, TransferStatus, Transfer } from '@prisma/client'

// 创建样品 DTO
export interface CreateSampleDto {
  clientName: string
  clientContact?: string
  sampleName: string
  sampleType: string
  sampleCategory: string
  quantity: number
  unit: string
  receivedDate: Date
  samplingDate?: Date
  samplingLocation?: string
  samplingPerson?: string
  storageLocation?: string
  storageCondition?: string
  priority?: Priority
  description?: string
  remarks?: string
  createdBy: string
}

// 更新样品 DTO
export interface UpdateSampleDto {
  clientName?: string
  clientContact?: string
  sampleName?: string
  sampleType?: string
  sampleCategory?: string
  quantity?: number
  unit?: string
  samplingDate?: Date
  samplingLocation?: string
  samplingPerson?: string
  storageLocation?: string
  storageCondition?: string
  priority?: Priority
  description?: string
  remarks?: string
  status?: SampleStatus
}

// 样品查询参数
export interface SampleQuery {
  page?: number
  pageSize?: number
  barcode?: string
  sampleNumber?: string
  clientName?: string
  sampleType?: string
  status?: SampleStatus
  priority?: Priority
  startDate?: Date
  endDate?: Date
}

// 分页结果
export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 样品流转 DTO
export interface TransferSampleDto {
  sampleId: string
  fromLocation: string
  toLocation: string
  fromPerson: string
  toPerson: string
  remarks?: string
  createdBy: string
}

// 流转确认 DTO
export interface ConfirmTransferDto {
  transferId: string
  confirmationType: 'sender' | 'receiver'
  userId: string
}

// 分样 DTO
export interface SplitSampleDto {
  parentSampleId: string
  childSamples: {
    sampleName: string
    quantity: number
    unit: string
    storageLocation?: string
    storageCondition?: string
    description?: string
    remarks?: string
  }[]
  createdBy: string
}

// 合样 DTO
export interface MergeSamplesDto {
  sourceSampleIds: string[]
  mergedSample: {
    sampleName: string
    sampleType: string
    sampleCategory: string
    quantity: number
    unit: string
    storageLocation?: string
    storageCondition?: string
    description?: string
    remarks?: string
  }
  createdBy: string
}
