/**
 * 备份服务单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BackupService } from '../services/backupService'
import { BackupStatus, BackupType } from '../types/backup'
import * as fs from 'fs/promises'

// Mock dependencies
vi.mock('../config/database', () => ({
  prisma: {
    backupRecord: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('fs/promises', () => ({
  default: {
    access: vi.fn(),
    mkdir: vi.fn(),
    stat: vi.fn(),
    readFile: vi.fn(),
    unlink: vi.fn(),
  },
  access: vi.fn(),
  mkdir: vi.fn(),
  stat: vi.fn(),
  readFile: vi.fn(),
  unlink: vi.fn(),
}))

vi.mock('child_process', () => ({
  exec: vi.fn((cmd, options, callback) => {
    callback(null, { stdout: 'Backup completed', stderr: '' })
  }),
}))

describe('BackupService', () => {
  let backupService: BackupService
  const mockUserId = 'user-123'

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock environment variable
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb'
    backupService = new BackupService()
  })

  describe('createBackup', () => {
    it('应该成功创建手动备份', async () => {
      const { prisma } = await import('../config/database')
      
      const mockBackupRecord = {
        id: 'backup-123',
        filename: 'lims_backup_2024-01-01.sql',
        filepath: '/backups/lims_backup_2024-01-01.sql',
        size: 0,
        type: BackupType.MANUAL,
        status: BackupStatus.IN_PROGRESS,
        createdBy: mockUserId,
        createdAt: new Date(),
      }

      const mockCompletedRecord = {
        ...mockBackupRecord,
        size: 1024000,
        checksum: 'abc123',
        status: BackupStatus.COMPLETED,
        completedAt: new Date(),
      }

      vi.mocked(prisma.backupRecord.create).mockResolvedValue(mockBackupRecord as any)
      vi.mocked(prisma.backupRecord.update).mockResolvedValue(mockCompletedRecord as any)
      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.mkdir).mockResolvedValue(undefined as any)
      vi.mocked(fs.stat).mockResolvedValue({ size: 1024000 } as any)
      vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('backup data'))

      const result = await backupService.createBackup(mockUserId)

      expect(result).toMatchObject({
        id: 'backup-123',
        status: BackupStatus.COMPLETED,
        size: 1024000,
        checksum: expect.any(String),
      })
      expect(prisma.backupRecord.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: BackupType.MANUAL,
          status: BackupStatus.IN_PROGRESS,
          createdBy: mockUserId,
        }),
      })
    })
  })

  describe('verifyBackup', () => {
    it('应该成功验证备份文件', async () => {
      const { prisma } = await import('../config/database')
      
      // 创建一个固定的数据和对应的校验和
      const backupData = Buffer.from('backup data')
      const crypto = await import('crypto')
      const expectedChecksum = crypto.createHash('sha256').update(backupData).digest('hex')
      
      const mockBackupRecord = {
        id: 'backup-123',
        filename: 'lims_backup_2024-01-01.sql',
        filepath: '/backups/lims_backup_2024-01-01.sql',
        size: backupData.length,
        checksum: expectedChecksum,
        status: BackupStatus.COMPLETED,
        type: BackupType.MANUAL,
        createdBy: mockUserId,
        createdAt: new Date(),
      }

      vi.mocked(prisma.backupRecord.findUnique).mockResolvedValue(mockBackupRecord as any)
      vi.mocked(prisma.backupRecord.update).mockResolvedValue({
        ...mockBackupRecord,
        status: BackupStatus.VERIFIED,
      } as any)
      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.stat).mockResolvedValue({ size: backupData.length } as any)
      vi.mocked(fs.readFile).mockResolvedValue(backupData)

      const result = await backupService.verifyBackup('backup-123')

      expect(result.isValid).toBe(true)
      expect(result.size).toBe(backupData.length)
    })

    it('文件大小不匹配时应该返回验证失败', async () => {
      const { prisma } = await import('../config/database')
      
      const mockBackupRecord = {
        id: 'backup-123',
        filename: 'lims_backup_2024-01-01.sql',
        filepath: '/backups/lims_backup_2024-01-01.sql',
        size: 1024000,
        checksum: 'abc123',
        status: BackupStatus.COMPLETED,
        type: BackupType.MANUAL,
        createdBy: mockUserId,
        createdAt: new Date(),
      }

      vi.mocked(prisma.backupRecord.findUnique).mockResolvedValue(mockBackupRecord as any)
      vi.mocked(fs.access).mockResolvedValue(undefined)
      vi.mocked(fs.stat).mockResolvedValue({ size: 2048000 } as any)

      const result = await backupService.verifyBackup('backup-123')

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('File size mismatch')
    })

    it('备份记录不存在时应该抛出错误', async () => {
      const { prisma } = await import('../config/database')
      
      vi.mocked(prisma.backupRecord.findUnique).mockResolvedValue(null)

      await expect(backupService.verifyBackup('backup-123')).rejects.toThrow(
        'Backup record not found'
      )
    })
  })

  describe('listBackups', () => {
    it('应该返回分页的备份列表', async () => {
      const { prisma } = await import('../config/database')
      
      const mockBackups = [
        {
          id: 'backup-1',
          filename: 'backup1.sql',
          status: BackupStatus.COMPLETED,
          type: BackupType.MANUAL,
          createdAt: new Date(),
        },
        {
          id: 'backup-2',
          filename: 'backup2.sql',
          status: BackupStatus.COMPLETED,
          type: BackupType.MANUAL,
          createdAt: new Date(),
        },
      ]

      vi.mocked(prisma.backupRecord.findMany).mockResolvedValue(mockBackups as any)
      vi.mocked(prisma.backupRecord.count).mockResolvedValue(2)

      const result = await backupService.listBackups({ page: 1, pageSize: 10 })

      expect(result.items).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(10)
    })

    it('应该支持按状态过滤', async () => {
      const { prisma } = await import('../config/database')
      
      vi.mocked(prisma.backupRecord.findMany).mockResolvedValue([])
      vi.mocked(prisma.backupRecord.count).mockResolvedValue(0)

      await backupService.listBackups({
        status: BackupStatus.COMPLETED,
      })

      expect(prisma.backupRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: BackupStatus.COMPLETED,
          }),
        })
      )
    })
  })

  describe('deleteBackup', () => {
    it('应该删除备份文件和记录', async () => {
      const { prisma } = await import('../config/database')
      
      const mockBackupRecord = {
        id: 'backup-123',
        filename: 'lims_backup_2024-01-01.sql',
        filepath: '/backups/lims_backup_2024-01-01.sql',
        size: 1024000,
        status: BackupStatus.COMPLETED,
        type: BackupType.MANUAL,
        createdBy: mockUserId,
        createdAt: new Date(),
      }

      vi.mocked(prisma.backupRecord.findUnique).mockResolvedValue(mockBackupRecord as any)
      vi.mocked(prisma.backupRecord.delete).mockResolvedValue(mockBackupRecord as any)
      vi.mocked(fs.unlink).mockResolvedValue(undefined)

      await backupService.deleteBackup('backup-123')

      expect(fs.unlink).toHaveBeenCalledWith(mockBackupRecord.filepath)
      expect(prisma.backupRecord.delete).toHaveBeenCalledWith({
        where: { id: 'backup-123' },
      })
    })

    it('备份记录不存在时应该抛出错误', async () => {
      const { prisma } = await import('../config/database')
      
      vi.mocked(prisma.backupRecord.findUnique).mockResolvedValue(null)

      await expect(backupService.deleteBackup('backup-123')).rejects.toThrow(
        'Backup record not found'
      )
    })
  })

  describe('cleanupOldBackups', () => {
    it('应该清理指定天数之前的备份', async () => {
      const { prisma } = await import('../config/database')
      
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 40)

      const mockOldBackups = [
        {
          id: 'backup-1',
          filename: 'old_backup1.sql',
          filepath: '/backups/old_backup1.sql',
          status: BackupStatus.COMPLETED,
          createdAt: oldDate,
        },
        {
          id: 'backup-2',
          filename: 'old_backup2.sql',
          filepath: '/backups/old_backup2.sql',
          status: BackupStatus.COMPLETED,
          createdAt: oldDate,
        },
      ]

      vi.mocked(prisma.backupRecord.findMany).mockResolvedValue(mockOldBackups as any)
      vi.mocked(prisma.backupRecord.findUnique)
        .mockResolvedValueOnce(mockOldBackups[0] as any)
        .mockResolvedValueOnce(mockOldBackups[1] as any)
      vi.mocked(prisma.backupRecord.delete).mockResolvedValue({} as any)
      vi.mocked(fs.unlink).mockResolvedValue(undefined)

      const deletedCount = await backupService.cleanupOldBackups(30)

      expect(deletedCount).toBe(2)
      expect(prisma.backupRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              lt: expect.any(Date),
            }),
          }),
        })
      )
    })
  })
})
