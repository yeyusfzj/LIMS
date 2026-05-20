/**
 * 初始化上传目录
 * 确保所有必需的上传目录在应用启动时存在
 */

import fs from 'fs'
import path from 'path'
import { logger } from '../config/logger'

/**
 * 需要创建的上传目录列表
 */
const UPLOAD_DIRECTORIES = [
  'uploads/images',
  'uploads/data',
  'uploads/documents',
  'uploads/others',
  'uploads/instruments',
  'uploads/instruments/documents',
  'uploads/instruments/maintenance',
  'uploads/instruments/calibration',
  'uploads/instruments/disposal'
]

/**
 * 创建目录（如果不存在）
 * @param dirPath 目录路径
 */
function ensureDirectoryExists(dirPath: string): void {
  const fullPath = path.join(process.cwd(), dirPath)
  
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true })
    logger.info(`创建上传目录: ${dirPath}`)
  }
}

/**
 * 初始化所有上传目录
 */
export function initUploadDirectories(): void {
  logger.info('初始化上传目录...')
  
  try {
    UPLOAD_DIRECTORIES.forEach(dir => {
      ensureDirectoryExists(dir)
    })
    
    logger.info('上传目录初始化完成')
  } catch (error) {
    logger.error('上传目录初始化失败:', error)
    throw error
  }
}
