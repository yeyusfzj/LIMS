import { Request, Response, NextFunction } from 'express'
import { documentService } from '../services/documentService'
import logger from '../config/logger'
import path from 'path'

/**
 * 文档控制器
 * 处理文档相关的HTTP请求
 */
export class DocumentController {
  /**
   * 上传仪器文档
   */
  async uploadInstrumentDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: instrumentId } = req.params
      const { documentType, description } = req.body
      const file = req.file
      const userId = req.user?.id

      if (!file) {
        res.status(400).json({
          success: false,
          error: {
            code: 'FILE_REQUIRED',
            message: '请上传文件'
          }
        })
        return
      }

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权'
          }
        })
        return
      }

      const document = await documentService.createInstrumentDocument(
        instrumentId,
        file,
        documentType || 'other',
        description,
        userId
      )

      res.status(201).json({
        success: true,
        data: document
      })
    } catch (error) {
      logger.error('Upload instrument document failed', { error })
      next(error)
    }
  }

  /**
   * 获取仪器文档列表
   */
  async getInstrumentDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: instrumentId } = req.params

      const documents = await documentService.getInstrumentDocuments(instrumentId)

      res.json({
        success: true,
        data: documents
      })
    } catch (error) {
      logger.error('Get instrument documents failed', { error })
      next(error)
    }
  }

  /**
   * 下载文档
   */
  async downloadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params

      const document = await documentService.getDocumentById(id)

      if (!document) {
        res.status(404).json({
          success: false,
          error: {
            code: 'DOCUMENT_NOT_FOUND',
            message: '文档不存在'
          }
        })
        return
      }

      // 检查文件是否存在
      const fileExists = await documentService.checkFileExists(document.filePath)
      if (!fileExists) {
        res.status(404).json({
          success: false,
          error: {
            code: 'FILE_NOT_FOUND',
            message: '文件不存在'
          }
        })
        return
      }

      // 设置响应头
      res.setHeader('Content-Type', document.fileType)
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(document.fileName)}"`)
      res.setHeader('Content-Length', document.fileSize.toString())

      // 发送文件
      const filePath = documentService.getFilePath(document)
      res.sendFile(filePath)
    } catch (error) {
      logger.error('Download document failed', { error })
      next(error)
    }
  }

  /**
   * 删除仪器文档
   */
  async deleteInstrumentDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params

      await documentService.deleteInstrumentDocument(id)

      res.json({
        success: true,
        message: '文档删除成功'
      })
    } catch (error) {
      logger.error('Delete instrument document failed', { error })
      next(error)
    }
  }

  /**
   * 上传维护文档
   */
  async uploadMaintenanceDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: maintenanceId } = req.params
      const { description } = req.body
      const file = req.file
      const userId = req.user?.id

      if (!file) {
        res.status(400).json({
          success: false,
          error: {
            code: 'FILE_REQUIRED',
            message: '请上传文件'
          }
        })
        return
      }

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权'
          }
        })
        return
      }

      const document = await documentService.createMaintenanceDocument(
        maintenanceId,
        file,
        description,
        userId
      )

      res.status(201).json({
        success: true,
        data: document
      })
    } catch (error) {
      logger.error('Upload maintenance document failed', { error })
      next(error)
    }
  }

  /**
   * 获取维护文档列表
   */
  async getMaintenanceDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: maintenanceId } = req.params

      const documents = await documentService.getMaintenanceDocuments(maintenanceId)

      res.json({
        success: true,
        data: documents
      })
    } catch (error) {
      logger.error('Get maintenance documents failed', { error })
      next(error)
    }
  }

  /**
   * 删除维护文档
   */
  async deleteMaintenanceDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params

      await documentService.deleteMaintenanceDocument(id)

      res.json({
        success: true,
        message: '文档删除成功'
      })
    } catch (error) {
      logger.error('Delete maintenance document failed', { error })
      next(error)
    }
  }

  /**
   * 上传报废文档
   */
  async uploadDisposalDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: disposalId } = req.params
      const { description } = req.body
      const file = req.file
      const userId = req.user?.id

      if (!file) {
        res.status(400).json({
          success: false,
          error: {
            code: 'FILE_REQUIRED',
            message: '请上传文件'
          }
        })
        return
      }

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权'
          }
        })
        return
      }

      const document = await documentService.createDisposalDocument(
        disposalId,
        file,
        description,
        userId
      )

      res.status(201).json({
        success: true,
        data: document
      })
    } catch (error) {
      logger.error('Upload disposal document failed', { error })
      next(error)
    }
  }

  /**
   * 获取报废文档列表
   */
  async getDisposalDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: disposalId } = req.params

      const documents = await documentService.getDisposalDocuments(disposalId)

      res.json({
        success: true,
        data: documents
      })
    } catch (error) {
      logger.error('Get disposal documents failed', { error })
      next(error)
    }
  }

  /**
   * 删除报废文档
   */
  async deleteDisposalDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params

      await documentService.deleteDisposalDocument(id)

      res.json({
        success: true,
        message: '文档删除成功'
      })
    } catch (error) {
      logger.error('Delete disposal document failed', { error })
      next(error)
    }
  }
}

export const documentController = new DocumentController()
