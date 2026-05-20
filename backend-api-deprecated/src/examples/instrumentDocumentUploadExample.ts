/**
 * 仪器文档上传使用示例
 * 
 * 本文件展示如何在仪器管理API中使用文件上传中间件
 * 注意: 这是示例代码,实际使用时需要根据具体需求调整
 */

import { Router, Request, Response } from 'express'
import {
  uploadSingleInstrumentDocument,
  uploadMultipleInstrumentDocuments
} from '../middleware/fileUploadMiddleware'
// import { authMiddleware } from '../middleware/authMiddleware'
// import { errorHandler } from '../middleware/errorHandler'

const router = Router()

// 注意: 以下示例代码中的 authMiddleware 和 errorHandler 需要根据实际项目配置
// 这里仅展示文件上传中间件的使用方法

/**
 * 示例 1: 上传单个仪器文档
 * POST /api/instruments/:id/documents
 */
router.post(
  '/api/instruments/:id/documents',
  // authMiddleware,  // 实际使用时取消注释
  uploadSingleInstrumentDocument('file'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const file = req.file

      if (!file) {
        return res.status(400).json({
          success: false,
          error: '未上传文件'
        })
      }

      // 文件信息
      const fileInfo = {
        instrumentId: id,
        fileName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        fileType: file.mimetype,
        uploadedBy: req.user?.id
      }

      // 保存到数据库
      // const document = await prisma.instrumentDocument.create({
      //   data: fileInfo
      // })

      res.json({
        success: true,
        data: fileInfo,
        message: '文件上传成功'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: '文件上传失败'
      })
    }
  }
)

/**
 * 示例 2: 批量上传仪器文档
 * POST /api/instruments/:id/documents/batch
 */
router.post(
  '/api/instruments/:id/documents/batch',
  // authMiddleware,  // 实际使用时取消注释
  uploadMultipleInstrumentDocuments('files', 10),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const files = req.files as Express.Multer.File[]

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: '未上传文件'
        })
      }

      // 处理多个文件
      const fileInfos = files.map(file => ({
        instrumentId: id,
        fileName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        fileType: file.mimetype,
        uploadedBy: req.user?.id
      }))

      // 批量保存到数据库
      // const documents = await prisma.instrumentDocument.createMany({
      //   data: fileInfos
      // })

      res.json({
        success: true,
        data: fileInfos,
        message: `成功上传 ${files.length} 个文件`
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: '文件上传失败'
      })
    }
  }
)

/**
 * 示例 3: 上传维护记录文档
 * POST /api/maintenance/:id/documents
 */
router.post(
  '/api/maintenance/:id/documents',
  // authMiddleware,  // 实际使用时取消注释
  uploadSingleInstrumentDocument('file'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const file = req.file

      if (!file) {
        return res.status(400).json({
          success: false,
          error: '未上传文件'
        })
      }

      // 文件会自动存储到 uploads/instruments/maintenance/ 目录
      const fileInfo = {
        maintenanceId: id,
        fileName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        fileType: file.mimetype,
        uploadedBy: req.user?.id
      }

      // 保存到数据库
      // const document = await prisma.maintenanceDocument.create({
      //   data: fileInfo
      // })

      res.json({
        success: true,
        data: fileInfo,
        message: '维护文档上传成功'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: '文件上传失败'
      })
    }
  }
)

/**
 * 示例 4: 上传校准证书
 * POST /api/calibration/:id/certificate
 */
router.post(
  '/api/calibration/:id/certificate',
  // authMiddleware,  // 实际使用时取消注释
  uploadSingleInstrumentDocument('certificate'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const file = req.file

      if (!file) {
        return res.status(400).json({
          success: false,
          error: '未上传证书文件'
        })
      }

      // 文件会自动存储到 uploads/instruments/calibration/ 目录
      const fileInfo = {
        calibrationId: id,
        fileName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        fileType: file.mimetype,
        uploadedBy: req.user?.id
      }

      // 更新校准记录,关联证书文件
      // await prisma.calibrationRecord.update({
      //   where: { id },
      //   data: {
      //     certificateFile: {
      //       create: fileInfo
      //     }
      //   }
      // })

      res.json({
        success: true,
        data: fileInfo,
        message: '校准证书上传成功'
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: '文件上传失败'
      })
    }
  }
)

/**
 * 示例 5: 上传报废文档
 * POST /api/disposals/:id/documents
 */
router.post(
  '/api/disposals/:id/documents',
  // authMiddleware,  // 实际使用时取消注释
  uploadMultipleInstrumentDocuments('files', 5),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params
      const files = req.files as Express.Multer.File[]

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: '未上传文件'
        })
      }

      // 文件会自动存储到 uploads/instruments/disposal/ 目录
      const fileInfos = files.map(file => ({
        disposalId: id,
        fileName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        fileType: file.mimetype,
        uploadedBy: req.user?.id
      }))

      // 批量保存到数据库
      // const documents = await prisma.disposalDocument.createMany({
      //   data: fileInfos
      // })

      res.json({
        success: true,
        data: fileInfos,
        message: `成功上传 ${files.length} 个报废文档`
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: '文件上传失败'
      })
    }
  }
)

/**
 * 示例 6: 下载文档
 * GET /api/documents/:id
 */
router.get(
  '/api/documents/:id',
  // authMiddleware,  // 实际使用时取消注释
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params

      // 从数据库获取文件信息
      // const document = await prisma.instrumentDocument.findUnique({
      //   where: { id }
      // })

      // 模拟文档数据
      const document = {
        id,
        fileName: '仪器说明书.pdf',
        filePath: 'uploads/instruments/documents/仪器说明书-1234567890-123456789.pdf',
        fileType: 'application/pdf'
      }

      if (!document) {
        return res.status(404).json({
          success: false,
          error: '文件不存在'
        })
      }

      // 设置响应头
      res.setHeader('Content-Type', document.fileType)
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(document.fileName)}"`
      )

      // 发送文件
      res.sendFile(document.filePath, { root: process.cwd() })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: '文件下载失败'
      })
    }
  }
)

// 注意: errorHandler 在实际使用时需要取消注释
// router.use(errorHandler)

export default router
