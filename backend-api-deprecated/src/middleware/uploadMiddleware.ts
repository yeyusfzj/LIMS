/**
 * 文件上传中间件
 * 
 * 使用 multer 处理文件上传
 */

import multer from 'multer'
import { Request } from 'express'

/**
 * 文件过滤器
 * 只允许特定格式的文件
 */
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // 允许的文件类型
  const allowedMimeTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/xml',
    'text/xml'
  ]

  const allowedExtensions = ['.csv', '.xls', '.xlsx', '.xml']

  // 检查 MIME 类型
  const mimeTypeValid = allowedMimeTypes.includes(file.mimetype)
  
  // 检查文件扩展名
  const extname = file.originalname.toLowerCase()
  const extensionValid = allowedExtensions.some(ext => extname.endsWith(ext))

  if (mimeTypeValid || extensionValid) {
    cb(null, true)
  } else {
    cb(new Error('不支持的文件格式，仅支持 CSV、Excel 和 XML 文件'))
  }
}

/**
 * 配置 multer
 * 使用内存存储，文件大小限制为 10MB
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter
})
