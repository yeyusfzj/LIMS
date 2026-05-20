/**
 * 审核任务样品信息增强 - 保留属性测试
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 * 
 * 目标: 验证修复不影响现有的审核任务操作功能
 * 重要: 遵循观察优先方法 - 在未修复代码上观察行为,然后编写测试捕获该行为
 * 
 * 保留需求:
 * 1. 审核任务的基本查询逻辑(分页、筛选、排序)必须继续正常工作
 * 2. 审核决策流程(通过、拒绝、退回)必须继续正常执行
 * 3. 审核任务的转交功能必须继续正常工作
 * 4. 数据库种子脚本创建的其他数据(用户、角色、样品等)必须继续正常创建
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient, SampleStatus, AuditStatus, AuditDecision } from '@prisma/client'
import { auditService } from '../services/auditService'
import fc from 'fast-check'

const prisma = new PrismaClient()

describe('审核任务样品信息增强 - 保留属性测试', () => {
  let testUserId1: string
  let testUserId2: string
  let testSampleId: string
  let testAuditTaskId: string

  beforeAll(async () => {
    // 创建测试用户1
    const testUser1 = await prisma.user.upsert({
      where: { username: 'preservation_test_user1' },
      update: {},
      create: {
        username: 'preservation_test_user1',
        email: 'preservation_test1@example.com',
        fullName: '保留测试用户1',
        passwordHash: '$2b$10$test.hash.for.testing',
        status: 'ACTIVE'
      }
    })
    testUserId1 = testUser1.id

    // 创建测试用户2
    const testUser2 = await prisma.user.upsert({
      where: { username: 'preservation_test_user2' },
      update: {},
      create: {
        username: 'preservation_test_user2',
        email: 'preservation_test2@example.com',
        fullName: '保留测试用户2',
        passwordHash: '$2b$10$test.hash.for.testing',
        status: 'ACTIVE'
      }
    })
    testUserId2 = testUser2.id

    // 创建测试样品
    const testSample = await prisma.sample.create({
      data: {
        barcode: 'PRESERVE-TEST-001',
        sampleNumber: 'PRESERVE-SAMPLE-001',
        clientName: '保留测试客户',
        clientContact: '13900139000',
        sampleName: '保留测试样品',
        sampleType: '水样',
        sampleCategory: '环境监测',
        quantity: 500,
        unit: 'mL',
        receivedDate: new Date(),
        status: SampleStatus.TESTING_COMPLETE,
        priority: 'NORMAL',
        createdBy: testUserId1
      }
    })
    testSampleId = testSample.id
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.auditTask.deleteMany({ where: { sampleId: testSampleId } })
    await prisma.sample.deleteMany({ where: { id: testSampleId } })
    await prisma.user.deleteMany({ 
      where: { 
        username: { 
          in: ['preservation_test_user1', 'preservation_test_user2'] 
        } 
      } 
    })
    await prisma.$disconnect()
  })

  /**
   * Property 2: Preservation - submitForAudit创建审核任务功能保持不变
   * 
   * 验证提交审核功能在修复后继续正常工作,包括:
   * - 创建多级审核任务
   * - 更新样品状态为IN_AUDIT
   * - 返回正确的审核任务信息
   */
  test('submitForAudit应该正常创建审核任务并更新样品状态', async () => {
    // 提交审核
    const tasks = await auditService.submitForAudit({
      sampleId: testSampleId,
      auditConfig: {
        levels: [
          { level: 1, name: '初审', auditorIds: [testUserId1], autoAssign: true },
          { level: 2, name: '复审', auditorIds: [testUserId2], autoAssign: true }
        ]
      }
    })

    // 验证返回的审核任务
    expect(tasks).toBeDefined()
    expect(Array.isArray(tasks)).toBe(true)
    expect(tasks.length).toBe(2)

    // 验证第一级审核任务
    const level1Task = tasks.find(t => t.level === 1)
    expect(level1Task).toBeDefined()
    expect(level1Task!.sampleId).toBe(testSampleId)
    expect(level1Task!.auditorId).toBe(testUserId1)
    expect(level1Task!.status).toBe(AuditStatus.PENDING)

    // 验证第二级审核任务
    const level2Task = tasks.find(t => t.level === 2)
    expect(level2Task).toBeDefined()
    expect(level2Task!.sampleId).toBe(testSampleId)
    expect(level2Task!.auditorId).toBe(testUserId2)
    expect(level2Task!.status).toBe(AuditStatus.PENDING)

    // 验证样品状态已更新
    const updatedSample = await prisma.sample.findUnique({
      where: { id: testSampleId }
    })
    expect(updatedSample!.status).toBe(SampleStatus.IN_AUDIT)

    // 保存第一个任务ID用于后续测试
    testAuditTaskId = level1Task!.id

    console.log('submitForAudit保留测试通过:', {
      创建的任务数量: tasks.length,
      样品状态: updatedSample!.status,
      第一级任务状态: level1Task!.status,
      第二级任务状态: level2Task!.status
    })
  })

  /**
   * Property 2: Preservation - performAudit执行审核决策功能保持不变
   * 
   * 验证审核决策功能在修复后继续正常工作,包括:
   * - 执行审核通过决策
   * - 更新审核任务状态
   * - 触发下一级审核
   */
  test('performAudit应该正常执行审核决策并触发下一级审核', async () => {
    // 执行第一级审核通过
    const result = await auditService.performAudit({
      taskId: testAuditTaskId,
      decision: AuditDecision.APPROVE,
      comments: '第一级审核通过',
      auditorId: testUserId1
    })

    // 验证审核结果
    expect(result).toBeDefined()
    expect(result.taskId).toBe(testAuditTaskId)
    expect(result.decision).toBe(AuditDecision.APPROVE)
    expect(result.level).toBe(1)
    expect(result.nextLevel).toBe(2)
    expect(result.isComplete).toBe(false)

    // 验证审核任务状态已更新
    const updatedTask = await prisma.auditTask.findUnique({
      where: { id: testAuditTaskId }
    })
    expect(updatedTask!.status).toBe(AuditStatus.APPROVED)
    expect(updatedTask!.decision).toBe(AuditDecision.APPROVE)
    expect(updatedTask!.comments).toBe('第一级审核通过')
    expect(updatedTask!.completedAt).toBeDefined()

    // 验证第二级审核任务已激活
    const level2Tasks = await prisma.auditTask.findMany({
      where: {
        sampleId: testSampleId,
        level: 2
      }
    })
    expect(level2Tasks.length).toBeGreaterThan(0)
    expect(level2Tasks[0].status).toBe(AuditStatus.PENDING)

    console.log('performAudit保留测试通过:', {
      审核决策: result.decision,
      当前级别: result.level,
      下一级别: result.nextLevel,
      是否完成: result.isComplete,
      第二级任务状态: level2Tasks[0].status
    })
  })

  /**
   * Property 2: Preservation - reassignAuditTask转交任务功能保持不变
   * 
   * 验证审核任务转交功能在修复后继续正常工作,包括:
   * - 更新审核人员
   * - 记录转交原因
   * - 保持任务状态
   */
  test('reassignAuditTask应该正常转交审核任务', async () => {
    // 获取第二级审核任务
    const level2Tasks = await prisma.auditTask.findMany({
      where: {
        sampleId: testSampleId,
        level: 2
      }
    })
    expect(level2Tasks.length).toBeGreaterThan(0)
    const level2TaskId = level2Tasks[0].id
    const originalAuditorId = level2Tasks[0].auditorId

    // 转交审核任务
    const reassignedTask = await auditService.reassignAuditTask({
      taskId: level2TaskId,
      fromAuditorId: originalAuditorId,
      toAuditorId: testUserId1,
      reason: '原审核人员休假,转交给其他审核人员'
    })

    // 验证转交结果
    expect(reassignedTask).toBeDefined()
    expect(reassignedTask.id).toBe(level2TaskId)
    expect(reassignedTask.auditorId).toBe(testUserId1)
    expect(reassignedTask.comments).toContain('任务转交')
    expect(reassignedTask.comments).toContain('原审核人员休假')

    // 验证数据库中的任务已更新
    const updatedTask = await prisma.auditTask.findUnique({
      where: { id: level2TaskId }
    })
    expect(updatedTask!.auditorId).toBe(testUserId1)
    expect(updatedTask!.status).toBe(AuditStatus.PENDING) // 状态保持不变

    console.log('reassignAuditTask保留测试通过:', {
      原审核人员: originalAuditorId,
      新审核人员: reassignedTask.auditorId,
      转交原因: reassignedTask.comments,
      任务状态: updatedTask!.status
    })
  })

  /**
   * Property 2: Preservation - 审核任务查询的分页和筛选功能保持不变
   * 
   * 验证审核任务列表查询的基本功能在修复后继续正常工作
   */
  test('listAuditTasks的分页和筛选功能应该正常工作', async () => {
    // 测试基本查询
    const result1 = await auditService.listAuditTasks({
      page: 1,
      pageSize: 10
    })
    expect(result1).toBeDefined()
    expect(result1.items).toBeDefined()
    expect(Array.isArray(result1.items)).toBe(true)
    expect(result1.total).toBeGreaterThanOrEqual(0)
    expect(result1.page).toBe(1)
    expect(result1.pageSize).toBe(10)

    // 测试按样品ID筛选
    const result2 = await auditService.listAuditTasks({
      sampleId: testSampleId,
      page: 1,
      pageSize: 20
    })
    expect(result2.items.length).toBeGreaterThan(0)
    result2.items.forEach(task => {
      expect(task.sampleId).toBe(testSampleId)
    })

    // 测试按审核人员筛选
    const result3 = await auditService.listAuditTasks({
      auditorId: testUserId1,
      page: 1,
      pageSize: 20
    })
    result3.items.forEach(task => {
      expect(task.auditorId).toBe(testUserId1)
    })

    // 测试按状态筛选
    const result4 = await auditService.listAuditTasks({
      status: AuditStatus.APPROVED,
      page: 1,
      pageSize: 20
    })
    result4.items.forEach(task => {
      expect(task.status).toBe(AuditStatus.APPROVED)
    })

    console.log('listAuditTasks分页筛选保留测试通过:', {
      基本查询结果数: result1.items.length,
      按样品筛选结果数: result2.items.length,
      按审核人员筛选结果数: result3.items.length,
      按状态筛选结果数: result4.items.length
    })
  })

  /**
   * Property 2: Preservation - 种子脚本创建其他数据功能保持不变
   * 
   * 验证种子脚本创建用户、角色、权限、工作流模板、检测方法等数据的功能保持不变
   */
  test('种子脚本应该正常创建用户、角色、权限等数据', async () => {
    // 验证用户数据
    const users = await prisma.user.findMany()
    expect(users.length).toBeGreaterThan(0)
    
    const adminUser = users.find(u => u.username === 'admin')
    expect(adminUser).toBeDefined()
    expect(adminUser!.fullName).toBe('系统管理员')
    expect(adminUser!.status).toBe('ACTIVE')

    // 验证角色数据
    const roles = await prisma.role.findMany()
    expect(roles.length).toBeGreaterThan(0)
    
    const adminRole = roles.find(r => r.name === 'admin')
    expect(adminRole).toBeDefined()
    expect(adminRole!.description).toBe('系统管理员')

    // 验证权限数据
    const permissions = await prisma.permission.findMany()
    expect(permissions.length).toBeGreaterThan(0)
    
    const sampleReadPermission = permissions.find(
      p => p.resource === 'sample' && p.action === 'read'
    )
    expect(sampleReadPermission).toBeDefined()

    // 验证工作流模板数据
    const workflows = await prisma.workflow.findMany()
    expect(workflows.length).toBeGreaterThan(0)
    
    const waterTestWorkflow = workflows.find(w => w.name === '水质检测标准流程')
    expect(waterTestWorkflow).toBeDefined()
    expect(waterTestWorkflow!.isActive).toBe(true)

    // 验证检测方法数据
    const testMethods = await prisma.testMethod.findMany()
    expect(testMethods.length).toBeGreaterThan(0)
    
    const waterMethod = testMethods.find(m => m.code === 'GB/T 5750.4-2006')
    expect(waterMethod).toBeDefined()
    expect(waterMethod!.category).toBe('水质检测')

    console.log('种子脚本数据保留测试通过:', {
      用户数量: users.length,
      角色数量: roles.length,
      权限数量: permissions.length,
      工作流模板数量: workflows.length,
      检测方法数量: testMethods.length
    })
  })

  /**
   * 基于属性的测试 - 验证审核决策流程的各种组合保持不变
   * 
   * 使用fast-check生成随机的审核决策场景,验证所有场景都正常工作
   */
  test('基于属性的测试: 审核决策流程应该对各种输入保持稳定', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          decision: fc.constantFrom(
            AuditDecision.APPROVE,
            AuditDecision.REJECT,
            AuditDecision.RETURN
          ),
          comments: fc.string({ minLength: 1, maxLength: 100 })
        }),
        async (input) => {
          // 为每个测试创建新的样品和审核任务
          const sample = await prisma.sample.create({
            data: {
              barcode: `PBT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              sampleNumber: `PBT-SAMPLE-${Date.now()}`,
              clientName: '基于属性测试客户',
              sampleName: '基于属性测试样品',
              sampleType: '测试样品',
              sampleCategory: '测试分类',
              quantity: 100,
              unit: 'g',
              receivedDate: new Date(),
              status: SampleStatus.IN_AUDIT,
              priority: 'NORMAL',
              createdBy: testUserId1
            }
          })

          const task = await prisma.auditTask.create({
            data: {
              sampleId: sample.id,
              level: 1,
              auditorId: testUserId1,
              status: AuditStatus.PENDING
            }
          })

          try {
            // 执行审核决策
            const result = await auditService.performAudit({
              taskId: task.id,
              decision: input.decision,
              comments: input.comments,
              auditorId: testUserId1
            })

            // 验证基本结果结构
            expect(result).toBeDefined()
            expect(result.taskId).toBe(task.id)
            expect(result.decision).toBe(input.decision)
            expect(result.sampleId).toBe(sample.id)

            // 验证任务状态已更新
            const updatedTask = await prisma.auditTask.findUnique({
              where: { id: task.id }
            })
            expect(updatedTask).toBeDefined()
            expect(updatedTask!.decision).toBe(input.decision)
            expect(updatedTask!.comments).toBe(input.comments)
            expect(updatedTask!.completedAt).toBeDefined()

            // 根据决策类型验证状态
            if (input.decision === AuditDecision.APPROVE) {
              expect(updatedTask!.status).toBe(AuditStatus.APPROVED)
            } else {
              expect(updatedTask!.status).toBe(AuditStatus.REJECTED)
            }
          } finally {
            // 清理测试数据
            await prisma.auditTask.deleteMany({ where: { sampleId: sample.id } })
            await prisma.sample.delete({ where: { id: sample.id } })
          }
        }
      ),
      { numRuns: 3 } // 运行3次以避免Prisma并发问题
    )
  })

  /**
   * 基于属性的测试 - 验证审核任务查询的各种参数组合保持不变
   * 
   * 使用fast-check生成随机的查询参数,验证查询功能稳定
   */
  test('基于属性的测试: 审核任务查询应该对各种参数组合保持稳定', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          page: fc.integer({ min: 1, max: 10 }),
          pageSize: fc.integer({ min: 1, max: 100 }),
          status: fc.option(
            fc.constantFrom(
              AuditStatus.PENDING,
              AuditStatus.IN_PROGRESS,
              AuditStatus.APPROVED,
              AuditStatus.REJECTED
            ),
            { nil: undefined }
          ),
          level: fc.option(
            fc.integer({ min: 1, max: 3 }),
            { nil: undefined }
          )
        }),
        async (query) => {
          // 执行查询
          const result = await auditService.listAuditTasks(query)

          // 验证返回结构
          expect(result).toBeDefined()
          expect(result.items).toBeDefined()
          expect(Array.isArray(result.items)).toBe(true)
          expect(result.page).toBe(query.page)
          expect(result.pageSize).toBe(query.pageSize)
          expect(typeof result.total).toBe('number')
          expect(result.total).toBeGreaterThanOrEqual(0)

          // 验证分页逻辑
          expect(result.items.length).toBeLessThanOrEqual(query.pageSize)

          // 验证筛选条件
          if (query.status) {
            result.items.forEach(task => {
              expect(task.status).toBe(query.status)
            })
          }

          if (query.level) {
            result.items.forEach(task => {
              expect(task.level).toBe(query.level)
            })
          }

          // 验证每个任务的基本字段
          result.items.forEach(task => {
            expect(task.id).toBeDefined()
            expect(task.sampleId).toBeDefined()
            expect(task.level).toBeDefined()
            expect(task.status).toBeDefined()
            expect(task.submittedAt).toBeDefined()
          })
        }
      ),
      { numRuns: 10 }
    )
  })
})
