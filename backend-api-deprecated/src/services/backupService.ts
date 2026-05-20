/**
 * 数据备份服务
 * 实现数据库备份、验证和历史记录管理
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as crypto from 'crypto'
import prisma from '../config/database'
import { logger } from '../config/logger'
import {
  BackupRecord,
  BackupResult,
  BackupStatus,
  BackupType,
  CreateBackupDto,
  BackupListQuery,
  VerifyBackupResult,
} from '../types/backup'

const execAsync = promisify(exec)

export class BackupService {
  private backupDir: string

  constructor() {
    this.backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups')
  }

  /**
   * 初始化备份目录
   */
  private async ensureBackupDir(): Promise<void> {
    try {
      await fs.access(this.backupDir)
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true })
      logger.info(`Created backup directory: ${this.backupDir}`)
    }
  }

  /**
   * 生成备份文件名
   */
  private generateBackupFilename(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    return `lims_backup_${timestamp}.sql`
  }

  /**
   * 计算文件校验和
   */
  private async calculateChecksum(filepath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filepath)
    const hashSum = crypto.createHash('sha256')
    hashSum.update(fileBuffer)
    return hashSum.digest('hex')
  }

  /**
   * 获取文件大小
   */
  private async getFileSize(filepath: string): Promise<number> {
    const stats = await fs.stat(filepath)
    return stats.size
  }

  /**
   * 执行数据库备份
   */
  private async executeDatabaseBackup(filepath: string): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set')
    }

    // 解析数据库连接字符串
    const url = new URL(databaseUrl)
    const host = url.hostname
    const port = url.port || '5432'
    const database = url.pathname.slice(1)
    const username = url.username
    const password = url.password

    // 构建 pg_dump 命令
    const command = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${database} -F p -f "${filepath}"`

    try {
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 1024 * 1024 * 100, // 100MB buffer
      })

      if (stderr && !stderr.includes('WARNING')) {
        logger.warn(`Backup stderr: ${stderr}`)
      }

      logger.info(`Database backup completed: ${filepath}`)
    } catch (error: any) {
      logger.error(`Database backup failed: ${error.message}`)
      throw new Error(`Failed to execute database backup: ${error.message}`)
    }
  }

  /**
   * 创建备份
   * 验证需求: 20.2
   */
  async createBackup(
    userId: string,
    dto: CreateBackupDto = {}
  ): Promise<BackupResult> {
    await this.ensureBackupDir()

    const filename = this.generateBackupFilename()
    const filepath = path.join(this.backupDir, filename)
    const type = dto.type || BackupType.MANUAL

    // 创建备份记录
    const record = await prisma.backupRecord.create({
      data: {
        filename,
        filepath,
        size: 0,
        type,
        status: BackupStatus.IN_PROGRESS,
        createdBy: userId,
      },
    })

    try {
      // 执行数据库备份
      await this.executeDatabaseBackup(filepath)

      // 获取文件大小和校验和
      const size = await this.getFileSize(filepath)
      const checksum = await this.calculateChecksum(filepath)

      // 更新备份记录
      const updatedRecord = await prisma.backupRecord.update({
        where: { id: record.id },
        data: {
          size,
          checksum,
          status: BackupStatus.COMPLETED,
          completedAt: new Date(),
        },
      })

      logger.info(`Backup created successfully: ${filename}`, {
        id: record.id,
        size,
        checksum,
      })

      return {
        id: updatedRecord.id,
        filename: updatedRecord.filename,
        size: updatedRecord.size,
        checksum: updatedRecord.checksum!,
        status: updatedRecord.status as BackupStatus,
        createdAt: updatedRecord.createdAt,
      }
    } catch (error: any) {
      // 更新备份记录为失败状态
      await prisma.backupRecord.update({
        where: { id: record.id },
        data: {
          status: BackupStatus.FAILED,
          error: error.message,
          completedAt: new Date(),
        },
      })

      // 清理失败的备份文件
      try {
        await fs.unlink(filepath)
      } catch (unlinkError) {
        logger.warn(`Failed to delete incomplete backup file: ${filepath}`)
      }

      logger.error(`Backup failed: ${error.message}`, { id: record.id })
      throw error
    }
  }

  /**
   * 验证备份文件
   * 验证需求: 20.3
   */
  async verifyBackup(backupId: string): Promise<VerifyBackupResult> {
    const record = await prisma.backupRecord.findUnique({
      where: { id: backupId },
    })

    if (!record) {
      throw new Error('Backup record not found')
    }

    if (record.status !== BackupStatus.COMPLETED) {
      throw new Error('Cannot verify incomplete backup')
    }

    try {
      // 检查文件是否存在
      await fs.access(record.filepath)

      // 验证文件大小
      const currentSize = await this.getFileSize(record.filepath)
      if (currentSize !== record.size) {
        return {
          isValid: false,
          checksum: '',
          size: currentSize,
          error: `File size mismatch: expected ${record.size}, got ${currentSize}`,
        }
      }

      // 验证校验和
      const currentChecksum = await this.calculateChecksum(record.filepath)
      if (currentChecksum !== record.checksum) {
        return {
          isValid: false,
          checksum: currentChecksum,
          size: currentSize,
          error: `Checksum mismatch: expected ${record.checksum}, got ${currentChecksum}`,
        }
      }

      // 更新验证时间
      await prisma.backupRecord.update({
        where: { id: backupId },
        data: {
          status: BackupStatus.VERIFIED,
          verifiedAt: new Date(),
        },
      })

      logger.info(`Backup verified successfully: ${record.filename}`, {
        id: backupId,
      })

      return {
        isValid: true,
        checksum: currentChecksum,
        size: currentSize,
      }
    } catch (error: any) {
      logger.error(`Backup verification failed: ${error.message}`, {
        id: backupId,
      })

      return {
        isValid: false,
        checksum: '',
        size: 0,
        error: error.message,
      }
    }
  }

  /**
   * 获取备份历史记录
   * 验证需求: 20.5
   */
  async listBackups(query: BackupListQuery = {}): Promise<{
    items: BackupRecord[]
    total: number
    page: number
    pageSize: number
  }> {
    const page = query.page || 1
    const pageSize = query.pageSize || 20
    const skip = (page - 1) * pageSize

    const where: any = {}

    if (query.status) {
      where.status = query.status
    }

    if (query.type) {
      where.type = query.type
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {}
      if (query.startDate) {
        where.createdAt.gte = query.startDate
      }
      if (query.endDate) {
        where.createdAt.lte = query.endDate
      }
    }

    const [items, total] = await Promise.all([
      prisma.backupRecord.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.backupRecord.count({ where }),
    ])

    return {
      items: items as BackupRecord[],
      total,
      page,
      pageSize,
    }
  }

  /**
   * 获取备份详情
   */
  async getBackup(backupId: string): Promise<BackupRecord | null> {
    const record = await prisma.backupRecord.findUnique({
      where: { id: backupId },
    })

    return record as BackupRecord | null
  }

  /**
   * 删除备份
   */
  async deleteBackup(backupId: string): Promise<void> {
    const record = await prisma.backupRecord.findUnique({
      where: { id: backupId },
    })

    if (!record) {
      throw new Error('Backup record not found')
    }

    // 删除备份文件
    try {
      await fs.unlink(record.filepath)
      logger.info(`Deleted backup file: ${record.filepath}`)
    } catch (error: any) {
      logger.warn(`Failed to delete backup file: ${error.message}`)
    }

    // 删除数据库记录
    await prisma.backupRecord.delete({
      where: { id: backupId },
    })

    logger.info(`Deleted backup record: ${backupId}`)
  }

  /**
   * 清理旧备份
   * @param daysToKeep 保留天数
   */
  async cleanupOldBackups(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const oldBackups = await prisma.backupRecord.findMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        status: {
          in: [BackupStatus.COMPLETED, BackupStatus.VERIFIED],
        },
      },
    })

    let deletedCount = 0

    for (const backup of oldBackups) {
      try {
        await this.deleteBackup(backup.id)
        deletedCount++
      } catch (error: any) {
        logger.error(`Failed to delete old backup: ${error.message}`, {
          id: backup.id,
        })
      }
    }

    logger.info(`Cleaned up ${deletedCount} old backups`)
    return deletedCount
  }
}

export const backupService = new BackupService()
