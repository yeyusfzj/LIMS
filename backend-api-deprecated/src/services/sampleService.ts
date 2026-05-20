// 样品服务

import { PrismaClient, Sample, SampleStatus, Transfer, TransferStatus } from '@prisma/client'
import { CreateSampleDto, UpdateSampleDto, SampleQuery, PaginatedResult, TransferSampleDto, ConfirmTransferDto, SplitSampleDto, MergeSamplesDto } from '../types/sample'
import { generateBarcode, generateSampleNumber } from '../utils/barcodeGenerator'
import logger from '../config/logger'

const prisma = new PrismaClient()

export class SampleService {
  /**
   * 创建样品
   */
  async createSample(data: CreateSampleDto): Promise<Sample> {
    try {
      // 生成唯一条码和样品编号
      const barcode = await generateBarcode()
      const sampleNumber = await generateSampleNumber()
      
      logger.info('Creating sample', { barcode, sampleNumber })
      
      // 创建样品记录
      const sample = await prisma.sample.create({
        data: {
          barcode,
          sampleNumber,
          clientName: data.clientName,
          clientContact: data.clientContact,
          sampleName: data.sampleName,
          sampleType: data.sampleType,
          sampleCategory: data.sampleCategory,
          quantity: data.quantity,
          unit: data.unit,
          receivedDate: data.receivedDate,
          samplingDate: data.samplingDate,
          samplingLocation: data.samplingLocation,
          samplingPerson: data.samplingPerson,
          storageLocation: data.storageLocation,
          storageCondition: data.storageCondition,
          priority: data.priority || 'NORMAL',
          description: data.description,
          remarks: data.remarks,
          status: 'REGISTERED',
          createdBy: data.createdBy
        }
      })
      
      logger.info('Sample created successfully', { id: sample.id, barcode: sample.barcode })
      
      return sample
    } catch (error) {
      logger.error('Failed to create sample', { error })
      throw error
    }
  }
  
  /**
   * 查询样品列表（分页）
   */
  async listSamples(query: SampleQuery): Promise<PaginatedResult<Sample>> {
    try {
      const page = query.page || 1
      const pageSize = query.pageSize || 20
      const skip = (page - 1) * pageSize
      
      // 构建查询条件
      const where: any = {}
      
      // 默认排除已归档的样品(软删除)
      // 除非明确指定要查询ARCHIVED状态
      if (query.status) {
        where.status = query.status
      } else {
        where.status = { not: 'ARCHIVED' }
      }
      
      if (query.barcode) {
        where.barcode = { contains: query.barcode }
      }
      
      if (query.sampleNumber) {
        where.sampleNumber = { contains: query.sampleNumber }
      }
      
      if (query.clientName) {
        where.clientName = { contains: query.clientName }
      }
      
      if (query.sampleType) {
        where.sampleType = query.sampleType
      }
      
      if (query.priority) {
        where.priority = query.priority
      }
      
      if (query.startDate || query.endDate) {
        where.receivedDate = {}
        if (query.startDate) {
          where.receivedDate.gte = query.startDate
        }
        if (query.endDate) {
          where.receivedDate.lte = query.endDate
        }
      }
      
      // 查询数据和总数
      const [items, total] = await Promise.all([
        prisma.sample.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          include: {
            testItems: true,
            transfers: {
              orderBy: { transferDate: 'desc' },
              take: 1
            }
          }
        }),
        prisma.sample.count({ where })
      ])
      
      const totalPages = Math.ceil(total / pageSize)
      
      return {
        items,
        total,
        page,
        pageSize,
        totalPages
      }
    } catch (error) {
      logger.error('Failed to list samples', { error, query })
      throw error
    }
  }
  
  /**
   * 获取样品详情
   */
  async getSample(id: string): Promise<Sample | null> {
    try {
      const sample = await prisma.sample.findUnique({
        where: { id },
        include: {
          testItems: true,
          results: true,
          transfers: {
            orderBy: { transferDate: 'desc' }
          },
          auditTasks: {
            orderBy: { submittedAt: 'desc' }
          },
          qualityJudgment: true,
          reports: true,
          parentSample: true,
          childSamples: true
        }
      })
      
      return sample
    } catch (error) {
      logger.error('Failed to get sample', { error, id })
      throw error
    }
  }
  
  /**
   * 通过条码获取样品
   */
  async getSampleByBarcode(barcode: string): Promise<Sample | null> {
    try {
      const sample = await prisma.sample.findUnique({
        where: { barcode },
        include: {
          testItems: true,
          results: true,
          transfers: {
            orderBy: { transferDate: 'desc' }
          }
        }
      })
      
      return sample
    } catch (error) {
      logger.error('Failed to get sample by barcode', { error, barcode })
      throw error
    }
  }
  
  /**
   * 更新样品
   */
  async updateSample(id: string, data: UpdateSampleDto): Promise<Sample> {
    try {
      logger.info('Updating sample', { id, data })
      
      const sample = await prisma.sample.update({
        where: { id },
        data: {
          clientName: data.clientName,
          clientContact: data.clientContact,
          sampleName: data.sampleName,
          sampleType: data.sampleType,
          sampleCategory: data.sampleCategory,
          quantity: data.quantity,
          unit: data.unit,
          samplingDate: data.samplingDate,
          samplingLocation: data.samplingLocation,
          samplingPerson: data.samplingPerson,
          storageLocation: data.storageLocation,
          storageCondition: data.storageCondition,
          priority: data.priority,
          description: data.description,
          remarks: data.remarks,
          status: data.status
        }
      })
      
      logger.info('Sample updated successfully', { id: sample.id })
      
      return sample
    } catch (error) {
      logger.error('Failed to update sample', { error, id })
      throw error
    }
  }
  
  /**
   * 更新样品状态
   */
  async updateSampleStatus(id: string, status: SampleStatus): Promise<Sample> {
    try {
      logger.info('Updating sample status', { id, status })
      
      const sample = await prisma.sample.update({
        where: { id },
        data: { status }
      })
      
      logger.info('Sample status updated successfully', { id: sample.id, status })
      
      return sample
    } catch (error) {
      logger.error('Failed to update sample status', { error, id, status })
      throw error
    }
  }
  
  /**
   * 检查条码是否存在
   */
  async barcodeExists(barcode: string): Promise<boolean> {
    try {
      const count = await prisma.sample.count({
        where: { barcode }
      })
      return count > 0
    } catch (error) {
      logger.error('Failed to check barcode existence', { error, barcode })
      throw error
    }
  }
  
  /**
   * 检查样品编号是否存在
   */
  async sampleNumberExists(sampleNumber: string): Promise<boolean> {
    try {
      const count = await prisma.sample.count({
        where: { sampleNumber }
      })
      return count > 0
    } catch (error) {
      logger.error('Failed to check sample number existence', { error, sampleNumber })
      throw error
    }
  }
  
  /**
   * 样品流转 - 创建流转记录并更新样品位置
   * 使用事务确保数据一致性
   */
  async transferSample(data: TransferSampleDto): Promise<Transfer> {
    try {
      logger.info('Transferring sample', { 
        sampleId: data.sampleId, 
        from: data.fromLocation, 
        to: data.toLocation 
      })
      
      // 使用事务确保流转记录创建和样品位置更新的原子性
      const result = await prisma.$transaction(async (tx) => {
        // 1. 检查样品是否存在
        const sample = await tx.sample.findUnique({
          where: { id: data.sampleId }
        })
        
        if (!sample) {
          throw new Error('样品不存在')
        }
        
        // 2. 创建流转记录（清洗输入数据）
        const transfer = await tx.transfer.create({
          data: {
            sampleId: data.sampleId,
            fromLocation: data.fromLocation?.trim(),
            toLocation: data.toLocation?.trim(),
            fromPerson: data.fromPerson?.trim(),
            toPerson: data.toPerson?.trim(),
            remarks: data.remarks?.trim(),
            status: 'PENDING',
            senderConfirmed: false,
            receiverConfirmed: false
          }
        })
        
        // 3. 更新样品当前位置（清洗输入数据）
        await tx.sample.update({
          where: { id: data.sampleId },
          data: {
            storageLocation: data.toLocation?.trim()
          }
        })
        
        logger.info('Sample transferred successfully', { 
          transferId: transfer.id,
          sampleId: data.sampleId 
        })
        
        return transfer
      })
      
      return result
    } catch (error) {
      logger.error('Failed to transfer sample', { error, data })
      throw error
    }
  }
  
  /**
   * 确认流转 - 发送方或接收方确认
   */
  async confirmTransfer(data: ConfirmTransferDto): Promise<Transfer> {
    try {
      logger.info('Confirming transfer', { 
        transferId: data.transferId, 
        type: data.confirmationType 
      })
      
      // 获取流转记录
      const transfer = await prisma.transfer.findUnique({
        where: { id: data.transferId }
      })
      
      if (!transfer) {
        throw new Error('流转记录不存在')
      }
      
      // 根据确认类型更新相应字段
      const updateData: any = {}
      
      if (data.confirmationType === 'sender') {
        updateData.senderConfirmed = true
      } else if (data.confirmationType === 'receiver') {
        updateData.receiverConfirmed = true
        updateData.receivedDate = new Date()
      }
      
      // 如果双方都确认，更新状态为已接收
      if (
        (data.confirmationType === 'sender' && transfer.receiverConfirmed) ||
        (data.confirmationType === 'receiver' && transfer.senderConfirmed)
      ) {
        updateData.status = 'RECEIVED'
      } else {
        updateData.status = 'IN_TRANSIT'
      }
      
      // 更新流转记录
      const updatedTransfer = await prisma.transfer.update({
        where: { id: data.transferId },
        data: updateData
      })
      
      logger.info('Transfer confirmed successfully', { 
        transferId: data.transferId,
        type: data.confirmationType,
        status: updatedTransfer.status
      })
      
      return updatedTransfer
    } catch (error) {
      logger.error('Failed to confirm transfer', { error, data })
      throw error
    }
  }
  
  /**
   * 获取样品监管链 - 按时间顺序返回完整流转历史
   */
  async getChainOfCustody(sampleId: string): Promise<Transfer[]> {
    try {
      logger.info('Getting chain of custody', { sampleId })
      
      // 检查样品是否存在
      const sample = await prisma.sample.findUnique({
        where: { id: sampleId }
      })
      
      if (!sample) {
        throw new Error('样品不存在')
      }
      
      // 查询所有流转记录，按时间顺序排列
      const transfers = await prisma.transfer.findMany({
        where: { sampleId },
        orderBy: { transferDate: 'asc' }
      })
      
      logger.info('Chain of custody retrieved', { 
        sampleId, 
        transferCount: transfers.length 
      })
      
      return transfers
    } catch (error) {
      logger.error('Failed to get chain of custody', { error, sampleId })
      throw error
    }
  }
  
  /**
   * 获取流转记录详情
   */
  async getTransfer(transferId: string): Promise<Transfer | null> {
    try {
      const transfer = await prisma.transfer.findUnique({
        where: { id: transferId },
        include: {
          sample: {
            select: {
              id: true,
              barcode: true,
              sampleNumber: true,
              sampleName: true
            }
          }
        }
      })
      
      return transfer
    } catch (error) {
      logger.error('Failed to get transfer', { error, transferId })
      throw error
    }
  }
  
  /**
   * 查询流转记录列表（分页）
   */
  async listTransfers(query: any): Promise<PaginatedResult<Transfer>> {
    try {
      const page = query.page || 1
      const pageSize = query.pageSize || 20
      const skip = (page - 1) * pageSize
      
      // 构建查询条件
      const where: any = {}
      
      if (query.sampleNumber) {
        where.sample = {
          sampleNumber: { contains: query.sampleNumber }
        }
      }
      
      if (query.status) {
        where.status = query.status
      }
      
      if (query.startDate || query.endDate) {
        where.transferDate = {}
        if (query.startDate) {
          where.transferDate.gte = query.startDate
        }
        if (query.endDate) {
          where.transferDate.lte = query.endDate
        }
      }
      
      // 查询数据和总数
      const [items, total] = await Promise.all([
        prisma.transfer.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { transferDate: 'desc' },
          include: {
            sample: {
              select: {
                id: true,
                barcode: true,
                sampleNumber: true,
                sampleName: true
              }
            }
          }
        }),
        prisma.transfer.count({ where })
      ])
      
      const totalPages = Math.ceil(total / pageSize)
      
      return {
        items,
        total,
        page,
        pageSize,
        totalPages
      }
    } catch (error) {
      logger.error('Failed to list transfers', { error, query })
      throw error
    }
  }
  
  /**
   * 取消流转
   */
  async cancelTransfer(transferId: string): Promise<Transfer> {
    try {
      logger.info('Cancelling transfer', { transferId })
      
      const transfer = await prisma.transfer.findUnique({
        where: { id: transferId }
      })
      
      if (!transfer) {
        throw new Error('流转记录不存在')
      }
      
      if (transfer.status !== 'PENDING') {
        throw new Error('只能取消待确认状态的流转记录')
      }
      
      const updatedTransfer = await prisma.transfer.update({
        where: { id: transferId },
        data: { status: 'CANCELLED' }
      })
      
      logger.info('Transfer cancelled successfully', { transferId })
      
      return updatedTransfer
    } catch (error) {
      logger.error('Failed to cancel transfer', { error, transferId })
      throw error
    }
  }
  
  /**
   * 分样操作 - 创建子样品并建立关联关系
   * 使用事务确保原子性
   */
  async splitSample(data: SplitSampleDto): Promise<Sample[]> {
    try {
      logger.info('Splitting sample', { 
        parentSampleId: data.parentSampleId, 
        childCount: data.childSamples.length 
      })
      
      // 使用事务确保分样操作的原子性
      const childSamples = await prisma.$transaction(async (tx) => {
        // 1. 检查母样品是否存在
        const parentSample = await tx.sample.findUnique({
          where: { id: data.parentSampleId }
        })
        
        if (!parentSample) {
          throw new Error('母样品不存在')
        }
        
        // 2. 验证母样品状态（可选：根据业务规则限制可分样的状态）
        if (parentSample.status === 'ARCHIVED') {
          throw new Error('已归档的样品不能进行分样操作')
        }
        
        // 3. 创建所有子样品
        const createdChildren: Sample[] = []
        
        for (const childData of data.childSamples) {
          // 在事务内部生成唯一条码和样品编号
          const date = new Date()
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          const datePrefix = `${year}${month}${day}`
          
          // 查询今天已有的最大序列号（包括事务中已创建的）
          const barcodePrefix = `SP${datePrefix}`
          const lastSample = await tx.sample.findFirst({
            where: {
              barcode: {
                startsWith: barcodePrefix
              }
            },
            orderBy: {
              barcode: 'desc'
            }
          })
          
          let barcodeSequence = 1
          if (lastSample) {
            const lastSequence = parseInt(lastSample.barcode.slice(-6))
            barcodeSequence = lastSequence + 1
          }
          
          const barcode = `${barcodePrefix}${String(barcodeSequence).padStart(6, '0')}`
          
          // 生成样品编号
          const yearPrefix = String(year)
          const lastSampleNumber = await tx.sample.findFirst({
            where: {
              sampleNumber: {
                startsWith: yearPrefix
              }
            },
            orderBy: {
              sampleNumber: 'desc'
            }
          })
          
          let numberSequence = 1
          if (lastSampleNumber) {
            const lastSequence = parseInt(lastSampleNumber.sampleNumber.slice(-6))
            numberSequence = lastSequence + 1
          }
          
          const sampleNumber = `${yearPrefix}${String(numberSequence).padStart(6, '0')}`
          
          // 创建子样品，继承母样品的部分信息
          const childSample = await tx.sample.create({
            data: {
              barcode,
              sampleNumber,
              clientName: parentSample.clientName,
              clientContact: parentSample.clientContact,
              sampleName: childData.sampleName,
              sampleType: parentSample.sampleType,
              sampleCategory: parentSample.sampleCategory,
              quantity: childData.quantity,
              unit: childData.unit,
              receivedDate: parentSample.receivedDate,
              samplingDate: parentSample.samplingDate,
              samplingLocation: parentSample.samplingLocation,
              samplingPerson: parentSample.samplingPerson,
              storageLocation: childData.storageLocation || parentSample.storageLocation,
              storageCondition: childData.storageCondition || parentSample.storageCondition,
              priority: parentSample.priority,
              description: childData.description,
              remarks: childData.remarks,
              status: 'REGISTERED',
              parentSampleId: data.parentSampleId, // 建立父子关联
              createdBy: data.createdBy
            }
          })
          
          createdChildren.push(childSample)
        }
        
        logger.info('Child samples created successfully', { 
          parentSampleId: data.parentSampleId,
          childCount: createdChildren.length,
          childIds: createdChildren.map(c => c.id)
        })
        
        return createdChildren
      })
      
      return childSamples
    } catch (error) {
      logger.error('Failed to split sample', { error, data })
      throw error
    }
  }
  
  /**
   * 合样操作 - 创建合并样品并记录来源样品
   * 使用事务确保原子性
   */
  async mergeSamples(data: MergeSamplesDto): Promise<Sample> {
    try {
      logger.info('Merging samples', { 
        sourceSampleIds: data.sourceSampleIds,
        sourceCount: data.sourceSampleIds.length 
      })
      
      // 使用事务确保合样操作的原子性
      const mergedSample = await prisma.$transaction(async (tx) => {
        // 1. 检查所有来源样品是否存在
        const sourceSamples = await tx.sample.findMany({
          where: {
            id: { in: data.sourceSampleIds }
          }
        })
        
        if (sourceSamples.length !== data.sourceSampleIds.length) {
          throw new Error('部分来源样品不存在')
        }
        
        // 2. 验证来源样品状态（可选：根据业务规则限制可合样的状态）
        const archivedSamples = sourceSamples.filter(s => s.status === 'ARCHIVED')
        if (archivedSamples.length > 0) {
          throw new Error('已归档的样品不能进行合样操作')
        }
        
        // 3. 验证来源样品的一致性（可选：确保样品类型、类别等一致）
        const sampleTypes = new Set(sourceSamples.map(s => s.sampleType))
        if (sampleTypes.size > 1) {
          logger.warn('Merging samples with different types', { 
            types: Array.from(sampleTypes) 
          })
        }
        
        // 4. 在事务内部生成唯一条码和样品编号
        const date = new Date()
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const datePrefix = `${year}${month}${day}`
        
        // 生成条码
        const barcodePrefix = `SP${datePrefix}`
        const lastSample = await tx.sample.findFirst({
          where: {
            barcode: {
              startsWith: barcodePrefix
            }
          },
          orderBy: {
            barcode: 'desc'
          }
        })
        
        let barcodeSequence = 1
        if (lastSample) {
          const lastSequence = parseInt(lastSample.barcode.slice(-6))
          barcodeSequence = lastSequence + 1
        }
        
        const barcode = `${barcodePrefix}${String(barcodeSequence).padStart(6, '0')}`
        
        // 生成样品编号
        const yearPrefix = String(year)
        const lastSampleNumber = await tx.sample.findFirst({
          where: {
            sampleNumber: {
              startsWith: yearPrefix
            }
          },
          orderBy: {
            sampleNumber: 'desc'
          }
        })
        
        let numberSequence = 1
        if (lastSampleNumber) {
          const lastSequence = parseInt(lastSampleNumber.sampleNumber.slice(-6))
          numberSequence = lastSequence + 1
        }
        
        const sampleNumber = `${yearPrefix}${String(numberSequence).padStart(6, '0')}`
        
        // 5. 使用第一个来源样品的客户信息
        const firstSource = sourceSamples[0]
        
        // 6. 创建合并样品
        const merged = await tx.sample.create({
          data: {
            barcode,
            sampleNumber,
            clientName: firstSource.clientName,
            clientContact: firstSource.clientContact,
            sampleName: data.mergedSample.sampleName,
            sampleType: data.mergedSample.sampleType,
            sampleCategory: data.mergedSample.sampleCategory,
            quantity: data.mergedSample.quantity,
            unit: data.mergedSample.unit,
            receivedDate: new Date(), // 合样时间作为接收时间
            samplingDate: firstSource.samplingDate,
            samplingLocation: firstSource.samplingLocation,
            samplingPerson: firstSource.samplingPerson,
            storageLocation: data.mergedSample.storageLocation || firstSource.storageLocation,
            storageCondition: data.mergedSample.storageCondition || firstSource.storageCondition,
            priority: firstSource.priority,
            description: data.mergedSample.description,
            remarks: data.mergedSample.remarks,
            status: 'REGISTERED',
            mergedFromIds: data.sourceSampleIds, // 记录来源样品ID
            createdBy: data.createdBy
          }
        })
        
        logger.info('Merged sample created successfully', { 
          mergedSampleId: merged.id,
          sourceSampleIds: data.sourceSampleIds
        })
        
        return merged
      })
      
      return mergedSample
    } catch (error) {
      logger.error('Failed to merge samples', { error, data })
      throw error
    }
  }

  /**
   * 删除样品(软删除)
   */
  async deleteSample(id: string): Promise<void> {
    try {
      // 检查样品是否存在
      const sample = await prisma.sample.findUnique({
        where: { id },
        include: {
          auditTasks: true,
          reports: true
        }
      })

      if (!sample) {
        throw new Error('样品不存在')
      }

      // 检查是否有关联数据
      if (sample.auditTasks && sample.auditTasks.length > 0) {
        throw new Error('该样品已有审核任务,无法删除')
      }

      if (sample.reports && sample.reports.length > 0) {
        throw new Error('该样品已生成报告,无法删除')
      }

      // 软删除:更新状态为ARCHIVED
      await prisma.sample.update({
        where: { id },
        data: {
          status: 'ARCHIVED',
          updatedAt: new Date()
        }
      })

      logger.info('Sample deleted (archived)', { id, barcode: sample.barcode })
    } catch (error: any) {
      logger.error('Error deleting sample', { id, error: error.message })
      throw error
    }
  }

  /**
   * 批量删除样品
   */
  async batchDeleteSamples(ids: string[]): Promise<{ success: number; failed: number; errors: string[] }> {
    const result = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    for (const id of ids) {
      try {
        await this.deleteSample(id)
        result.success++
      } catch (error: any) {
        result.failed++
        result.errors.push(`样品 ${id}: ${error.message}`)
      }
    }

    logger.info('Batch delete completed', result)
    return result
  }
}

export default new SampleService()
