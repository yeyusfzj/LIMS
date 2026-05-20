/**
 * 数据备份控制器
 */

import { Request, Response } from 'express'
import { backupService } from '../services/backupService'
import { logger } from '../config/logger'
import { CreateBackupDto, BackupListQuery } from '../types/backup'

export class BackupController {
  /**
   * 创建备份
   * POST /api/backups
   */
  async createBackup(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id
      const dto: CreateBackupDto = req.body

      const result = await backupService.createBackup(userId, dto)

      res.status(201).json({
        success: true,
        data: result,
        message: '备份创建成功',
      })
    } catch (error: any) {
      logger.error('Failed to create backup', { error: error.message })
      res.status(500).json({
        success: false,
        error: {
          code: 'BACKUP_CREATION_FAILED',
          message: '备份创建失败',
          details: error.message,
        },
      })
    }
  }

  /**
   * 验证备份
   * POST /api/backups/:id/verify
   */
  async verifyBackup(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      const result = await backupService.verifyBackup(id)

      if (result.isValid) {
        res.json({
          success: true,
          data: result,
          message: '备份验证成功',
        })
      } else {
        res.status(400).json({
          success: false,
          data: result,
          message: '备份验证失败',
        })
      }
    } catch (error: any) {
      logger.error('Failed to verify backup', { error: error.message })
      res.status(500).json({
        success: false,
        error: {
          code: 'BACKUP_VERIFICATION_FAILED',
          message: '备份验证失败',
          details: error.message,
        },
      })
    }
  }

  /**
   * 获取备份列表
   * GET /api/backups
   */
  async listBackups(req: Request, res: Response): Promise<void> {
    try {
      const query: BackupListQuery = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize
          ? parseInt(req.query.pageSize as string)
          : undefined,
        status: req.query.status as any,
        type: req.query.type as any,
        startDate: req.query.startDate
          ? new Date(req.query.startDate as string)
          : undefined,
        endDate: req.query.endDate
          ? new Date(req.query.endDate as string)
          : undefined,
      }

      const result = await backupService.listBackups(query)

      res.json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: Math.ceil(result.total / result.pageSize),
        },
      })
    } catch (error: any) {
      logger.error('Failed to list backups', { error: error.message })
      res.status(500).json({
        success: false,
        error: {
          code: 'BACKUP_LIST_FAILED',
          message: '获取备份列表失败',
          details: error.message,
        },
      })
    }
  }

  /**
   * 获取备份详情
   * GET /api/backups/:id
   */
  async getBackup(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      const backup = await backupService.getBackup(id)

      if (!backup) {
        res.status(404).json({
          success: false,
          error: {
            code: 'BACKUP_NOT_FOUND',
            message: '备份记录不存在',
          },
        })
        return
      }

      res.json({
        success: true,
        data: backup,
      })
    } catch (error: any) {
      logger.error('Failed to get backup', { error: error.message })
      res.status(500).json({
        success: false,
        error: {
          code: 'BACKUP_GET_FAILED',
          message: '获取备份详情失败',
          details: error.message,
        },
      })
    }
  }

  /**
   * 删除备份
   * DELETE /api/backups/:id
   */
  async deleteBackup(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params

      await backupService.deleteBackup(id)

      res.json({
        success: true,
        message: '备份删除成功',
      })
    } catch (error: any) {
      logger.error('Failed to delete backup', { error: error.message })
      res.status(500).json({
        success: false,
        error: {
          code: 'BACKUP_DELETE_FAILED',
          message: '删除备份失败',
          details: error.message,
        },
      })
    }
  }

  /**
   * 清理旧备份
   * POST /api/backups/cleanup
   */
  async cleanupOldBackups(req: Request, res: Response): Promise<void> {
    try {
      const daysToKeep = req.body.daysToKeep || 30

      const deletedCount = await backupService.cleanupOldBackups(daysToKeep)

      res.json({
        success: true,
        data: { deletedCount },
        message: `成功清理 ${deletedCount} 个旧备份`,
      })
    } catch (error: any) {
      logger.error('Failed to cleanup old backups', { error: error.message })
      res.status(500).json({
        success: false,
        error: {
          code: 'BACKUP_CLEANUP_FAILED',
          message: '清理旧备份失败',
          details: error.message,
        },
      })
    }
  }
}

export const backupController = new BackupController()
