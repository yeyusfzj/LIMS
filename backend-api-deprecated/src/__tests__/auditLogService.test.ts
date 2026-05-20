/**
 * 审计日志服务集成测试
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { auditLogService } from '../services/auditLogService'
import { AuditAction, AuditResource } from '../types/auditLog'

const prisma = new PrismaClient()

describe('AuditLogService', () => {
  let testUserId: string
  let testAuditLogIds: string[] = []

  beforeAll(async () => {
    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        username: 'auditlogtest',
        passwordHash: 'hash',
        email: 'auditlogtest@example.com',
        fullName: '审计日志测试用户',
        status: 'ACTIVE'
      }
    })
    testUserId = user.id
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.auditLog.deleteMany({
      where: {
        id: { in: testAuditLogIds }
      }
    })

    await prisma.user.delete({
      where: { id: testUserId }
    })

    await prisma.$disconnect()
  })

  beforeEach(() => {
    testAuditLogIds = []
  })

  describe('createAuditLog', () => {
    it('应该成功创建审计日志', async () => {
      const result = await auditLogService.createAuditLog({
        userId: testUserId,
        username: 'auditlogtest',
        action: AuditAction.CREATE,
        resource: AuditResource.SAMPLE,
        resourceId: 'sample-1',
        changes: { name: 'Test Sample' },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0'
      })

      testAuditLogIds.push(result.id)

      expect(result.id).toBeDefined()
      expect(result.userId).toBe(testUserId)
      expect(result.username).toBe('auditlogtest')
      expect(result.action).toBe(AuditAction.CREATE)
      expect(result.resource).toBe(AuditResource.SAMPLE)
      expect(result.resourceId).toBe('sample-1')
      expect(result.changes).toEqual({ name: 'Test Sample' })
      expect(result.ipAddress).toBe('127.0.0.1')
      expect(result.userAgent).toBe('Mozilla/5.0')
      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it('应该处理没有变更内容的审计日志', async () => {
      const result = await auditLogService.createAuditLog({
        userId: testUserId,
        username: 'auditlogtest',
        action: AuditAction.DELETE,
        resource: AuditResource.SAMPLE,
        resourceId: 'sample-2'
      })

      testAuditLogIds.push(result.id)

      expect(result.changes).toBeNull()
      expect(result.ipAddress).toBeNull()
      expect(result.userAgent).toBeNull()
    })
  })

  describe('createAuditLogs', () => {
    it('应该成功批量创建审计日志', async () => {
      const logs = [
        {
          userId: testUserId,
          username: 'auditlogtest',
          action: AuditAction.CREATE,
          resource: AuditResource.SAMPLE,
          resourceId: 'sample-batch-1'
        },
        {
          userId: testUserId,
          username: 'auditlogtest',
          action: AuditAction.UPDATE,
          resource: AuditResource.SAMPLE,
          resourceId: 'sample-batch-2'
        }
      ]

      await auditLogService.createAuditLogs(logs)

      // 验证日志已创建
      const createdLogs = await prisma.auditLog.findMany({
        where: {
          userId: testUserId,
          resourceId: { in: ['sample-batch-1', 'sample-batch-2'] }
        }
      })

      expect(createdLogs).toHaveLength(2)
      testAuditLogIds.push(...createdLogs.map(log => log.id))
    })
  })

  describe('listAuditLogs', () => {
    beforeEach(async () => {
      // 创建测试数据
      const log1 = await auditLogService.createAuditLog({
        userId: testUserId,
        username: 'auditlogtest',
        action: AuditAction.CREATE,
        resource: AuditResource.SAMPLE,
        resourceId: 'sample-list-1'
      })

      const log2 = await auditLogService.createAuditLog({
        userId: testUserId,
        username: 'auditlogtest',
        action: AuditAction.UPDATE,
        resource: AuditResource.SAMPLE,
        resourceId: 'sample-list-2'
      })

      testAuditLogIds.push(log1.id, log2.id)
    })

    it('应该返回分页的审计日志列表', async () => {
      const result = await auditLogService.listAuditLogs({
        userId: testUserId,
        page: 1,
        pageSize: 20
      })

      expect(result.items.length).toBeGreaterThanOrEqual(2)
      expect(result.total).toBeGreaterThanOrEqual(2)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(20)
    })

    it('应该支持按资源类型和资源 ID 过滤', async () => {
      const result = await auditLogService.listAuditLogs({
        resource: AuditResource.SAMPLE,
        resourceId: 'sample-list-1',
        page: 1,
        pageSize: 20
      })

      expect(result.items.length).toBeGreaterThanOrEqual(1)
      expect(result.items[0].resourceId).toBe('sample-list-1')
    })

    it('应该支持按操作类型过滤', async () => {
      const result = await auditLogService.listAuditLogs({
        userId: testUserId,
        action: AuditAction.CREATE,
        page: 1,
        pageSize: 20
      })

      expect(result.items.length).toBeGreaterThanOrEqual(1)
      result.items.forEach(item => {
        expect(item.action).toBe(AuditAction.CREATE)
      })
    })
  })

  describe('getAuditLog', () => {
    it('应该返回指定的审计日志', async () => {
      const created = await auditLogService.createAuditLog({
        userId: testUserId,
        username: 'auditlogtest',
        action: AuditAction.CREATE,
        resource: AuditResource.SAMPLE,
        resourceId: 'sample-get-1'
      })

      testAuditLogIds.push(created.id)

      const result = await auditLogService.getAuditLog(created.id)

      expect(result).not.toBeNull()
      expect(result!.id).toBe(created.id)
      expect(result!.resourceId).toBe('sample-get-1')
    })

    it('应该在审计日志不存在时返回 null', async () => {
      const result = await auditLogService.getAuditLog('non-existent-id')

      expect(result).toBeNull()
    })
  })

  describe('getResourceAuditHistory', () => {
    it('应该返回资源的审计历史', async () => {
      const resourceId = 'sample-history-1'

      const log1 = await auditLogService.createAuditLog({
        userId: testUserId,
        username: 'auditlogtest',
        action: AuditAction.CREATE,
        resource: AuditResource.SAMPLE,
        resourceId
      })

      const log2 = await auditLogService.createAuditLog({
        userId: testUserId,
        username: 'auditlogtest',
        action: AuditAction.UPDATE,
        resource: AuditResource.SAMPLE,
        resourceId,
        changes: { status: 'IN_TESTING' }
      })

      testAuditLogIds.push(log1.id, log2.id)

      const result = await auditLogService.getResourceAuditHistory(
        AuditResource.SAMPLE,
        resourceId
      )

      expect(result.length).toBeGreaterThanOrEqual(2)
      expect(result[0].resourceId).toBe(resourceId)
    })
  })

  describe('getUserAuditHistory', () => {
    it('应该返回用户的操作历史', async () => {
      const result = await auditLogService.getUserAuditHistory(testUserId, 100)

      expect(result.length).toBeGreaterThan(0)
      result.forEach(log => {
        expect(log.userId).toBe(testUserId)
      })
    })
  })

  describe('getAuditStatistics', () => {
    it('应该返回审计统计信息', async () => {
      const result = await auditLogService.getAuditStatistics()

      expect(result.byAction).toBeDefined()
      expect(result.byResource).toBeDefined()
      expect(result.topUsers).toBeDefined()
      expect(Array.isArray(result.byAction)).toBe(true)
      expect(Array.isArray(result.byResource)).toBe(true)
      expect(Array.isArray(result.topUsers)).toBe(true)
    })
  })

  describe('审计日志不可篡改性', () => {
    it('应该只提供创建方法，不提供更新和删除方法', () => {
      // 验证服务类没有 update 或 delete 方法
      expect((auditLogService as any).updateAuditLog).toBeUndefined()
      expect((auditLogService as any).deleteAuditLog).toBeUndefined()
    })

    it('创建的审计日志应该包含时间戳', async () => {
      const result = await auditLogService.createAuditLog({
        userId: testUserId,
        username: 'auditlogtest',
        action: AuditAction.CREATE,
        resource: AuditResource.SAMPLE,
        resourceId: 'sample-timestamp-1'
      })

      testAuditLogIds.push(result.id)

      expect(result.timestamp).toBeDefined()
      expect(result.timestamp).toBeInstanceOf(Date)
    })
  })

  describe('archiveAuditLogs', () => {
    it('应该成功归档旧的审计日志', async () => {
      // 创建一些旧的审计日志（手动设置时间戳）
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 100) // 100 天前

      const oldLog = await prisma.auditLog.create({
        data: {
          userId: testUserId,
          username: 'auditlogtest',
          action: AuditAction.CREATE,
          resource: AuditResource.SAMPLE,
          resourceId: 'sample-archive-1',
          timestamp: oldDate
        }
      })

      // 归档 90 天前的日志
      const archiveDate = new Date()
      archiveDate.setDate(archiveDate.getDate() - 90)

      const count = await auditLogService.archiveAuditLogs(archiveDate)

      expect(count).toBeGreaterThanOrEqual(1)

      // 验证日志已从主表删除
      const activeLog = await prisma.auditLog.findUnique({
        where: { id: oldLog.id }
      })
      expect(activeLog).toBeNull()

      // 验证日志已移动到归档表
      const archivedLog = await prisma.archivedAuditLog.findUnique({
        where: { id: oldLog.id }
      })
      expect(archivedLog).not.toBeNull()
      expect(archivedLog!.resourceId).toBe('sample-archive-1')

      // 清理归档日志
      await prisma.archivedAuditLog.delete({
        where: { id: oldLog.id }
      })
    })

    it('应该在没有旧日志时返回 0', async () => {
      // 使用一个很久以前的日期，确保没有日志比这个日期更早
      const veryOldDate = new Date('2000-01-01')

      const count = await auditLogService.archiveAuditLogs(veryOldDate)

      expect(count).toBe(0)
    })

    it('归档操作应该是事务性的', async () => {
      // 创建旧日志
      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 100)

      const oldLog = await prisma.auditLog.create({
        data: {
          userId: testUserId,
          username: 'auditlogtest',
          action: AuditAction.CREATE,
          resource: AuditResource.SAMPLE,
          resourceId: 'sample-archive-transaction',
          timestamp: oldDate
        }
      })

      // 归档
      const archiveDate = new Date()
      archiveDate.setDate(archiveDate.getDate() - 90)

      await auditLogService.archiveAuditLogs(archiveDate)

      // 验证数据一致性：日志要么在主表，要么在归档表，不能同时存在
      const activeLog = await prisma.auditLog.findUnique({
        where: { id: oldLog.id }
      })
      const archivedLog = await prisma.archivedAuditLog.findUnique({
        where: { id: oldLog.id }
      })

      // 应该只在一个表中存在
      expect(activeLog === null || archivedLog === null).toBe(true)
      expect(activeLog !== null || archivedLog !== null).toBe(true)

      // 清理
      if (archivedLog) {
        await prisma.archivedAuditLog.delete({
          where: { id: oldLog.id }
        })
      }
    })
  })

  describe('listArchivedAuditLogs', () => {
    let archivedLogId: string

    beforeEach(async () => {
      // 创建归档日志
      const archivedLog = await prisma.archivedAuditLog.create({
        data: {
          userId: testUserId,
          username: 'auditlogtest',
          action: AuditAction.CREATE,
          resource: AuditResource.SAMPLE,
          resourceId: 'sample-archived-list',
          timestamp: new Date()
        }
      })
      archivedLogId = archivedLog.id
    })

    afterEach(async () => {
      // 清理归档日志
      await prisma.archivedAuditLog.deleteMany({
        where: { id: archivedLogId }
      })
    })

    it('应该返回分页的归档审计日志列表', async () => {
      const result = await auditLogService.listArchivedAuditLogs({
        userId: testUserId,
        page: 1,
        pageSize: 20
      })

      expect(result.items.length).toBeGreaterThanOrEqual(1)
      expect(result.total).toBeGreaterThanOrEqual(1)
    })

    it('应该支持按资源 ID 过滤归档日志', async () => {
      const result = await auditLogService.listArchivedAuditLogs({
        resourceId: 'sample-archived-list',
        page: 1,
        pageSize: 20
      })

      expect(result.items.length).toBeGreaterThanOrEqual(1)
      expect(result.items[0].resourceId).toBe('sample-archived-list')
    })
  })

  describe('getArchiveStatistics', () => {
    it('应该返回归档统计信息', async () => {
      const result = await auditLogService.getArchiveStatistics()

      expect(result.activeCount).toBeDefined()
      expect(result.archivedCount).toBeDefined()
      expect(typeof result.activeCount).toBe('number')
      expect(typeof result.archivedCount).toBe('number')
    })
  })
})

