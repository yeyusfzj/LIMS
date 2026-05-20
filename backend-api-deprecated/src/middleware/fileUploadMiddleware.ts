/**
 * 文件上传安全中间件
 * 验证文件类型、大小和内容
 */

import multer, { FileFilterCallback } from 'multer'
import { Request } from 'express'
import path from 'path'
import { validateFileType, bodySizeConfig } from '../config/security'

/**
 * 文件过滤器
 * 验证文件类型和扩展名
 */
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
): void => {
  // 验证文件类型
  if (!validateFileType(file.mimetype, file.originalname)) {
    callback(new Error('不支持的文件类型'))
    return
  }

  callback(null, true)
}

/**
 * 磁盘存储配置
 * 用于持久化存储上传的文件
 */
const diskStorage = multer.diskStorage({
  destination: (req, file, callback) => {
    // 根据文件类型选择存储目录
    let uploadDir = 'uploads/others'

    if (file.mimetype.startsWith('image/')) {
      uploadDir = 'uploads/images'
    } else if (
      file.mimetype === 'text/csv' ||
      file.mimetype.includes('spreadsheet') ||
      file.mimetype.includes('excel')
    ) {
      uploadDir = 'uploads/data'
    } else if (file.mimetype === 'application/pdf') {
      uploadDir = 'uploads/documents'
    }

    callback(null, uploadDir)
  },

  filename: (req, file, callback) => {
    // 生成唯一文件名：时间戳-随机数-原始文件名
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    const ext = path.extname(file.originalname)
    const basename = path.basename(file.originalname, ext)
    const sanitizedBasename = basename.replace(/[^a-zA-Z0-9_-]/g, '_')
    callback(null, `${sanitizedBasename}-${uniqueSuffix}${ext}`)
  }
})

/**
 * 仪器文档存储配置
 * 专门用于仪器管理模块的文件上传
 */
const instrumentStorage = multer.diskStorage({
  destination: (req, file, callback) => {
    // 根据请求路径确定存储目录
    let uploadDir = 'uploads/instruments'

    // 从请求路径判断文档类型
    if (req.path.includes('/maintenance')) {
      uploadDir = 'uploads/instruments/maintenance'
    } else if (req.path.includes('/calibration')) {
      uploadDir = 'uploads/instruments/calibration'
    } else if (req.path.includes('/disposal')) {
      uploadDir = 'uploads/instruments/disposal'
    } else if (req.path.includes('/documents')) {
      uploadDir = 'uploads/instruments/documents'
    }

    callback(null, uploadDir)
  },

  filename: (req, file, callback) => {
    // 生成唯一文件名：时间戳-随机数-原始文件名
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    const ext = path.extname(file.originalname)
    const basename = path.basename(file.originalname, ext)
    const sanitizedBasename = basename.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, '_')
    callback(null, `${sanitizedBasename}-${uniqueSuffix}${ext}`)
  }
})

/**
 * 内存存储配置
 * 用于临时处理文件（如数据导入）
 */
const memoryStorage = multer.memoryStorage()

/**
 * 文件上传中间件（磁盘存储）
 * 用于需要持久化存储的文件
 */
export const uploadToDisk = multer({
  storage: diskStorage,
  fileFilter,
  limits: {
    fileSize: bodySizeConfig.fileUpload, // 文件大小限制
    files: 10 // 最多 10 个文件
  }
})

/**
 * 文件上传中间件（内存存储）
 * 用于临时处理的文件（如数据导入）
 */
export const uploadToMemory = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: bodySizeConfig.fileUpload, // 文件大小限制
    files: 5 // 最多 5 个文件
  }
})

/**
 * 仪器文档上传中间件（磁盘存储）
 * 专门用于仪器管理模块，限制文件大小为 20MB
 */
export const uploadInstrumentDocument = multer({
  storage: instrumentStorage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB 限制
    files: 10 // 最多 10 个文件
  }
})

/**
 * 单文件上传中间件（磁盘存储）
 * @param fieldName 表单字段名
 */
export const uploadSingleFile = (fieldName: string) => {
  return uploadToDisk.single(fieldName)
}

/**
 * 多文件上传中间件（磁盘存储）
 * @param fieldName 表单字段名
 * @param maxCount 最大文件数
 */
export const uploadMultipleFiles = (fieldName: string, maxCount: number = 10) => {
  return uploadToDisk.array(fieldName, maxCount)
}

/**
 * 单文件上传中间件（内存存储）
 * @param fieldName 表单字段名
 */
export const uploadSingleFileToMemory = (fieldName: string) => {
  return uploadToMemory.single(fieldName)
}

/**
 * 多文件上传中间件（内存存储）
 * @param fieldName 表单字段名
 * @param maxCount 最大文件数
 */
export const uploadMultipleFilesToMemory = (fieldName: string, maxCount: number = 5) => {
  return uploadToMemory.array(fieldName, maxCount)
}

/**
 * 仪器文档单文件上传中间件
 * @param fieldName 表单字段名
 */
export const uploadSingleInstrumentDocument = (fieldName: string) => {
  return uploadInstrumentDocument.single(fieldName)
}

/**
 * 仪器文档多文件上传中间件
 * @param fieldName 表单字段名
 * @param maxCount 最大文件数（默认10）
 */
export const uploadMultipleInstrumentDocuments = (fieldName: string, maxCount: number = 10) => {
  return uploadInstrumentDocument.array(fieldName, maxCount)
}
