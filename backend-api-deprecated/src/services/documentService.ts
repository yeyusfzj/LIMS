import { PrismaClient, InstrumentDocument, MaintenanceDocument, DisposalDocument } from '@prisma/client'
import { prisma } from '../config/database'
import logger from '../config/logger'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'

const unlinkAsync = promisify(fs.unlink)

/**
 * 文档服务
 * 负责仪器相关文档的管理,包括上传、下载、删除等功能
 */
export class DocumentService {
  /**
   * 创建仪器文档记录
   */
  async createInstrumentDocument(
    instrumentId: string,
    file: Express.Multer.File,
    documentType: string,
    description: string | undefined,
    uploadedBy: string
  ): Promise<InstrumentDocument> {
    try {
      logger.info('Creating instrument document', { instrumentId, fileName: file.originalname })

      // 验证仪器是否存在
      const instrument = await prisma.instrument.findUnique({
        where: { id: instrumentId }
      })

      if (!instrument) {
        throw new Error('仪器不存在')
      }

      // 创建文档记录
      const document = await prisma.instrumentDocument.create({
        data: {
          instrumentId,
          fileName: file.originalname,
          fileSize: file.size,
          filePath: file.path,
          fileType: file.mimetype,
          documentType,
          description,
          uploadedBy
        }
      })

      logger.info('Instrument document created successfully', { documentId: document.id })
      return document
    } catch (error) {
      logger.error('Failed to create instrument document', { error, instrumentId })
      throw error
    }
  }

  /**
   * 获取仪器的所有文档
   */
  async getInstrumentDocuments(instrumentId: string): Promise<InstrumentDocument[]> {
    try {
      const documents = await prisma.instrumentDocument.findMany({
        where: { instrumentId },
        orderBy: { uploadedAt: 'desc' }
      })

      return documents
    } catch (error) {
      logger.error('Failed to get instrument documents', { error, instrumentId })
      throw error
    }
  }

  /**
   * 根据ID获取文档
   */
  async getDocumentById(id: string): Promise<InstrumentDocument | null> {
    try {
      const document = await prisma.instrumentDocument.findUnique({
        where: { id },
        include: {
          instrument: {
            select: {
              id: true,
              code: true,
              name: true
            }
          }
        }
      })

      return document
    } catch (error) {
      logger.error('Failed to get document by id', { error, id })
      throw error
    }
  }

  /**
   * 删除仪器文档
   */
  async deleteInstrumentDocument(id: string): Promise<void> {
    try {
      logger.info('Deleting instrument document', { id })

      // 获取文档信息
      const document = await prisma.instrumentDocument.findUnique({
        where: { id }
      })

      if (!document) {
        throw new Error('文档不存在')
      }

      // 删除数据库记录
      await prisma.instrumentDocument.delete({
        where: { id }
      })

      // 删除文件
      if (fs.existsSync(document.filePath)) {
        await unlinkAsync(document.filePath)
        logger.info('Document file deleted', { filePath: document.filePath })
      }

      logger.info('Instrument document deleted successfully', { id })
    } catch (error) {
      logger.error('Failed to delete instrument document', { error, id })
      throw error
    }
  }

  /**
   * 创建维护文档记录
   */
  async createMaintenanceDocument(
    maintenanceId: string,
    file: Express.Multer.File,
    description: string | undefined,
    uploadedBy: string
  ): Promise<MaintenanceDocument> {
    try {
      logger.info('Creating maintenance document', { maintenanceId, fileName: file.originalname })

      // 验证维护记录是否存在
      const maintenance = await prisma.maintenanceRecord.findUnique({
        where: { id: maintenanceId }
      })

      if (!maintenance) {
        throw new Error('维护记录不存在')
      }

      // 创建文档记录
      const document = await prisma.maintenanceDocument.create({
        data: {
          maintenanceId,
          fileName: file.originalname,
          fileSize: file.size,
          filePath: file.path,
          fileType: file.mimetype,
          description,
          uploadedBy
        }
      })

      logger.info('Maintenance document created successfully', { documentId: document.id })
      return document
    } catch (error) {
      logger.error('Failed to create maintenance document', { error, maintenanceId })
      throw error
    }
  }

  /**
   * 获取维护记录的所有文档
   */
  async getMaintenanceDocuments(maintenanceId: string): Promise<MaintenanceDocument[]> {
    try {
      const documents = await prisma.maintenanceDocument.findMany({
        where: { maintenanceId },
        orderBy: { uploadedAt: 'desc' }
      })

      return documents
    } catch (error) {
      logger.error('Failed to get maintenance documents', { error, maintenanceId })
      throw error
    }
  }

  /**
   * 删除维护文档
   */
  async deleteMaintenanceDocument(id: string): Promise<void> {
    try {
      logger.info('Deleting maintenance document', { id })

      // 获取文档信息
      const document = await prisma.maintenanceDocument.findUnique({
        where: { id }
      })

      if (!document) {
        throw new Error('文档不存在')
      }

      // 删除数据库记录
      await prisma.maintenanceDocument.delete({
        where: { id }
      })

      // 删除文件
      if (fs.existsSync(document.filePath)) {
        await unlinkAsync(document.filePath)
        logger.info('Document file deleted', { filePath: document.filePath })
      }

      logger.info('Maintenance document deleted successfully', { id })
    } catch (error) {
      logger.error('Failed to delete maintenance document', { error, id })
      throw error
    }
  }

  /**
   * 创建报废文档记录
   */
  async createDisposalDocument(
    disposalId: string,
    file: Express.Multer.File,
    description: string | undefined,
    uploadedBy: string
  ): Promise<DisposalDocument> {
    try {
      logger.info('Creating disposal document', { disposalId, fileName: file.originalname })

      // 验证报废记录是否存在
      const disposal = await prisma.disposalRecord.findUnique({
        where: { id: disposalId }
      })

      if (!disposal) {
        throw new Error('报废记录不存在')
      }

      // 创建文档记录
      const document = await prisma.disposalDocument.create({
        data: {
          disposalId,
          fileName: file.originalname,
          fileSize: file.size,
          filePath: file.path,
          fileType: file.mimetype,
          description,
          uploadedBy
        }
      })

      logger.info('Disposal document created successfully', { documentId: document.id })
      return document
    } catch (error) {
      logger.error('Failed to create disposal document', { error, disposalId })
      throw error
    }
  }

  /**
   * 获取报废记录的所有文档
   */
  async getDisposalDocuments(disposalId: string): Promise<DisposalDocument[]> {
    try {
      const documents = await prisma.disposalDocument.findMany({
        where: { disposalId },
        orderBy: { uploadedAt: 'desc' }
      })

      return documents
    } catch (error) {
      logger.error('Failed to get disposal documents', { error, disposalId })
      throw error
    }
  }

  /**
   * 删除报废文档
   */
  async deleteDisposalDocument(id: string): Promise<void> {
    try {
      logger.info('Deleting disposal document', { id })

      // 获取文档信息
      const document = await prisma.disposalDocument.findUnique({
        where: { id }
      })

      if (!document) {
        throw new Error('文档不存在')
      }

      // 删除数据库记录
      await prisma.disposalDocument.delete({
        where: { id }
      })

      // 删除文件
      if (fs.existsSync(document.filePath)) {
        await unlinkAsync(document.filePath)
        logger.info('Document file deleted', { filePath: document.filePath })
      }

      logger.info('Disposal document deleted successfully', { id })
    } catch (error) {
      logger.error('Failed to delete disposal document', { error, id })
      throw error
    }
  }

  /**
   * 检查文件是否存在
   */
  async checkFileExists(filePath: string): Promise<boolean> {
    return fs.existsSync(filePath)
  }

  /**
   * 获取文件路径
   */
  getFilePath(document: InstrumentDocument | MaintenanceDocument | DisposalDocument): string {
    return path.resolve(document.filePath)
  }
}

export const documentService = new DocumentService()
