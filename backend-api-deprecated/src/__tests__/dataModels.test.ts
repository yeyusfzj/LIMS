import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

describe('数据模型单元测试', () => {
  let prisma: PrismaClient

  beforeAll(async () => {
    prisma = new PrismaClient()
    await prisma.$connect()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  beforeEach(async () => {
    // 清理测试数据
    await prisma.distribution.deleteMany()
    await prisma.signature.deleteMany()
    await prisma.report.deleteMany()
    await prisma.reportTemplate.deleteMany()
    await prisma.judgmentHistory.deleteMany()
    await prisma.qualityJudgment.deleteMany()
    await prisma.auditTask.deleteMany()
    await prisma.result.deleteMany()
    await prisma.formula.deleteMany()
    await prisma.task.deleteMany()
    await prisma.workflowInstance.deleteMany()
    await prisma.workflow.deleteMany()
    await prisma.transfer.deleteMany()
    await prisma.testItem.deleteMany()
    await prisma.sample.deleteMany()
    await prisma.auditLog.deleteMany()
    await prisma.userRole.deleteMany()
    await prisma.permission.deleteMany()
    await prisma.role.deleteMany()
    await prisma.user.deleteMany()
  })

  describe('用户和权限模型关联关系测试', () => {
    it('应该能够创建用户并关联角色', async () => {
      // 创建用户
      const user = await prisma.user.create({
        data: {
          username: 'testuser',
          passwordHash: 'hashedpassword',
          email: 'test@example.com',
          fullName: '测试用户'
        }
      })

      // 创建角色
      const role = await prisma.role.create({
        data: {
          name: 'admin',
          description: '管理员角色'
        }
      })

      // 关联用户和角色
      const userRole = await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id
        }
      })

      // 验证关联关系
      const userWithRoles = await prisma.user.findUnique({
        where: { id: user.id },
        include: { roles: { include: { role: true } } }
      })

      expect(userWithRoles).toBeDefined()
      expect(userWithRoles?.roles).toHaveLength(1)
      expect(userWithRoles?.roles[0].role.name).toBe('admin')
    })

    it('应该能够为角色分配权限', async () => {
      // 创建角色
      const role = await prisma.role.create({
        data: {
          name: 'operator',
          description: '操作员角色'
        }
      })

      // 创建权限
      const permission1 = await prisma.permission.create({
        data: {
          resource: 'sample',
          action: 'create'
        }
      })

      const permission2 = await prisma.permission.create({
        data: {
          resource: 'sample',
          action: 'read'
        }
      })

      // 关联角色和权限
      await prisma.role.update({
        where: { id: role.id },
        data: {
          permissions: {
            connect: [{ id: permission1.id }, { id: permission2.id }]
          }
        }
      })

      // 验证关联关系
      const roleWithPermissions = await prisma.role.findUnique({
        where: { id: role.id },
        include: { permissions: true }
      })

      expect(roleWithPermissions).toBeDefined()
      expect(roleWithPermissions?.permissions).toHaveLength(2)
    })
  })

  describe('样品模型关联关系测试', () => {
    it('应该能够创建样品并关联检测项', async () => {
      // 创建样品
      const sample = await prisma.sample.create({
        data: {
          barcode: `BC${Date.now()}`,
          sampleNumber: `SN${Date.now()}`,
          clientName: '测试客户',
          sampleName: '测试样品',
          sampleType: '水样',
          sampleCategory: '环境',
          quantity: 100,
          unit: 'ml',
          receivedDate: new Date(),
          createdBy: 'test-user'
        }
      })

      // 创建检测项
      const testItem = await prisma.testItem.create({
        data: {
          sampleId: sample.id,
          testMethod: 'GB/T 5750.4-2006',
          testParameters: { ph: { min: 6.5, max: 8.5 } }
        }
      })

      // 验证关联关系
      const sampleWithTestItems = await prisma.sample.findUnique({
        where: { id: sample.id },
        include: { testItems: true }
      })

      expect(sampleWithTestItems).toBeDefined()
      expect(sampleWithTestItems?.testItems).toHaveLength(1)
      expect(sampleWithTestItems?.testItems[0].testMethod).toBe('GB/T 5750.4-2006')
    })

    it('应该能够创建样品流转记录', async () => {
      // 创建样品
      const sample = await prisma.sample.create({
        data: {
          barcode: `BC${Date.now()}`,
          sampleNumber: `SN${Date.now()}`,
          clientName: '测试客户',
          sampleName: '测试样品',
          sampleType: '水样',
          sampleCategory: '环境',
          quantity: 100,
          unit: 'ml',
          receivedDate: new Date(),
          createdBy: 'test-user'
        }
      })

      // 创建流转记录
      const transfer = await prisma.transfer.create({
        data: {
          sampleId: sample.id,
          fromLocation: '接收室',
          toLocation: '检测室',
          fromPerson: '张三',
          toPerson: '李四'
        }
      })

      // 验证关联关系
      const sampleWithTransfers = await prisma.sample.findUnique({
        where: { id: sample.id },
        include: { transfers: true }
      })

      expect(sampleWithTransfers).toBeDefined()
      expect(sampleWithTransfers?.transfers).toHaveLength(1)
      expect(sampleWithTransfers?.transfers[0].fromLocation).toBe('接收室')
    })

    it('应该能够创建分样关联关系', async () => {
      // 创建母样品
      const parentSample = await prisma.sample.create({
        data: {
          barcode: `BC${Date.now()}`,
          sampleNumber: `SN${Date.now()}`,
          clientName: '测试客户',
          sampleName: '母样品',
          sampleType: '水样',
          sampleCategory: '环境',
          quantity: 1000,
          unit: 'ml',
          receivedDate: new Date(),
          createdBy: 'test-user'
        }
      })

      // 创建子样品
      const childSample1 = await prisma.sample.create({
        data: {
          barcode: `BC${Date.now()}-1`,
          sampleNumber: `SN${Date.now()}-1`,
          clientName: '测试客户',
          sampleName: '子样品1',
          sampleType: '水样',
          sampleCategory: '环境',
          quantity: 500,
          unit: 'ml',
          receivedDate: new Date(),
          parentSampleId: parentSample.id,
          createdBy: 'test-user'
        }
      })

      const childSample2 = await prisma.sample.create({
        data: {
          barcode: `BC${Date.now()}-2`,
          sampleNumber: `SN${Date.now()}-2`,
          clientName: '测试客户',
          sampleName: '子样品2',
          sampleType: '水样',
          sampleCategory: '环境',
          quantity: 500,
          unit: 'ml',
          receivedDate: new Date(),
          parentSampleId: parentSample.id,
          createdBy: 'test-user'
        }
      })

      // 验证关联关系
      const parentWithChildren = await prisma.sample.findUnique({
        where: { id: parentSample.id },
        include: { childSamples: true }
      })

      expect(parentWithChildren).toBeDefined()
      expect(parentWithChildren?.childSamples).toHaveLength(2)

      // 验证子样品的父样品关联
      const child = await prisma.sample.findUnique({
        where: { id: childSample1.id },
        include: { parentSample: true }
      })

      expect(child?.parentSample).toBeDefined()
      expect(child?.parentSample?.id).toBe(parentSample.id)
    })
  })

  describe('工作流模型关联关系测试', () => {
    it('应该能够创建工作流实例并关联样品', async () => {
      // 创建工作流配置
      const workflow = await prisma.workflow.create({
        data: {
          name: '标准检测流程',
          version: 1,
          config: {
            nodes: [
              { id: 'start', type: 'start', name: '开始' },
              { id: 'test', type: 'task', name: '检测' },
              { id: 'end', type: 'end', name: '结束' }
            ],
            edges: [
              { from: 'start', to: 'test' },
              { from: 'test', to: 'end' }
            ]
          },
          createdBy: 'test-user'
        }
      })

      // 创建样品
      const sample = await prisma.sample.create({
        data: {
          barcode: `BC${Date.now()}`,
          sampleNumber: `SN${Date.now()}`,
          clientName: '测试客户',
          sampleName: '测试样品',
          sampleType: '水样',
          sampleCategory: '环境',
          quantity: 100,
          unit: 'ml',
          receivedDate: new Date(),
          createdBy: 'test-user'
        }
      })

      // 创建工作流实例
      const instance = await prisma.workflowInstance.create({
        data: {
          workflowId: workflow.id,
          sampleId: sample.id,
          currentNodes: ['start']
        }
      })

      // 更新样品的工作流实例关联
      await prisma.sample.update({
        where: { id: sample.id },
        data: { workflowInstanceId: instance.id }
      })

      // 验证关联关系
      const instanceWithRelations = await prisma.workflowInstance.findUnique({
        where: { id: instance.id },
        include: {
          workflow: true
        }
      })

      expect(instanceWithRelations).toBeDefined()
      expect(instanceWithRelations?.workflow.name).toBe('标准检测流程')
      expect(instanceWithRelations?.sampleId).toBe(sample.id)

      // 验证样品的工作流实例关联
      const sampleWithInstance = await prisma.sample.findUnique({
        where: { id: sample.id },
        include: { workflowInstance: true }
      })

      expect(sampleWithInstance?.workflowInstance).toBeDefined()
      expect(sampleWithInstance?.workflowInstance?.id).toBe(instance.id)
    })

    it('应该能够创建任务并关联工作流实例', async () => {
      // 创建工作流配置
      const workflow = await prisma.workflow.create({
        data: {
          name: '标准检测流程',
          version: 1,
          config: { nodes: [], edges: [] },
          createdBy: 'test-user'
        }
      })

      // 创建样品
      const sample = await prisma.sample.create({
        data: {
          barcode: `BC${Date.now()}`,
          sampleNumber: `SN${Date.now()}`,
          clientName: '测试客户',
          sampleName: '测试样品',
          sampleType: '水样',
          sampleCategory: '环境',
          quantity: 100,
          unit: 'ml',
          receivedDate: new Date(),
          createdBy: 'test-user'
        }
      })

      // 创建工作流实例
      const instance = await prisma.workflowInstance.create({
        data: {
          workflowId: workflow.id,
          sampleId: sample.id,
          currentNodes: ['test']
        }
      })

      // 创建任务
      const task = await prisma.task.create({
        data: {
          instanceId: instance.id,
          nodeId: 'test',
          nodeName: '检测任务',
          nodeType: 'task'
        }
      })

      // 验证关联关系
      const instanceWithTasks = await prisma.workflowInstance.findUnique({
        where: { id: instance.id },
        include: { tasks: true }
      })

      expect(instanceWithTasks).toBeDefined()
      expect(instanceWithTasks?.tasks).toHaveLength(1)
      expect(instanceWithTasks?.tasks[0].nodeName).toBe('检测任务')
    })
  })

  describe('检测结果模型关联关系测试', () => {
    it('应该能够创建检测结果并关联样品', async () => {
      // 创建样品
      const sample = await prisma.sample.create({
        data: {
          barcode: `BC${Date.now()}`,
          sampleNumber: `SN${Date.now()}`,
          clientName: '测试客户',
          sampleName: '测试样品',
          sampleType: '水样',
          sampleCategory: '环境',
          quantity: 100,
          unit: 'ml',
          receivedDate: new Date(),
          createdBy: 'test-user'
        }
      })

      // 创建检测结果
      const result = await prisma.result.create({
        data: {
          sampleId: sample.id,
          testItemId: 'test-item-1',
          parameter: 'pH值',
          value: 7.2,
          unit: 'pH',
          method: 'GB/T 5750.4-2006',
          enteredBy: 'test-user'
        }
      })

      // 验证关联关系
      const sampleWithResults = await prisma.sample.findUnique({
        where: { id: sample.id },
        include: { results: true }
      })

      expect(sampleWithResults).toBeDefined()
      expect(sampleWithResults?.results).toHaveLength(1)
      expect(sampleWithResults?.results[0].parameter).toBe('pH值')
    })
  })

  describe('审核和判定模型关联关系测试', () => {
    it('应该能够创建审核任务并关联样品', async () => {
      // 创建样品
      const sample = await prisma.sample.create({
        data: {
          barcode: `BC${Date.now()}`,
          sampleNumber: `SN${Date.now()}`,
          clientName: '测试客户',
          sampleName: '测试样品',
          sampleType: '水样',
          sampleCategory: '环境',
          quantity: 100,
          unit: 'ml',
          receivedDate: new Date(),
          createdBy: 'test-user'
        }
      })

      // 创建审核任务
      const auditTask = await prisma.auditTask.create({
        data: {
          sampleId: sample.id,
          level: 1,
          auditorId: 'auditor-1'
        }
      })

      // 验证关联关系
      const sampleWithAudits = await prisma.sample.findUnique({
        where: { id: sample.id },
        include: { auditTasks: true }
      })

      expect(sampleWithAudits).toBeDefined()
      expect(sampleWithAudits?.auditTasks).toHaveLength(1)
      expect(sampleWithAudits?.auditTasks[0].level).toBe(1)
    })

    it('应该能够创建质量判定并关联样品', async () => {
      // 创建样品
      const sample = await prisma.sample.create({
        data: {
          barcode: `BC${Date.now()}`,
          sampleNumber: `SN${Date.now()}`,
          clientName: '测试客户',
          sampleName: '测试样品',
          sampleType: '水样',
          sampleCategory: '环境',
          quantity: 100,
          unit: 'ml',
          receivedDate: new Date(),
          createdBy: 'test-user'
        }
      })

      // 创建质量判定
      const judgment = await prisma.qualityJudgment.create({
        data: {
          sampleId: sample.id,
          result: 'QUALIFIED',
          basis: JSON.stringify({ rule: 'all_parameters_in_range' }),
          judgedBy: 'test-user'
        }
      })

      // 验证关联关系
      const sampleWithJudgment = await prisma.sample.findUnique({
        where: { id: sample.id },
        include: { qualityJudgment: true }
      })

      expect(sampleWithJudgment).toBeDefined()
      expect(sampleWithJudgment?.qualityJudgment).toBeDefined()
      expect(sampleWithJudgment?.qualityJudgment?.result).toBe('QUALIFIED')
    })

    it('应该能够创建判定历史记录', async () => {
      // 创建样品
      const sample = await prisma.sample.create({
        data: {
          barcode: `BC${Date.now()}`,
          sampleNumber: `SN${Date.now()}`,
          clientName: '测试客户',
          sampleName: '测试样品',
          sampleType: '水样',
          sampleCategory: '环境',
          quantity: 100,
          unit: 'ml',
          receivedDate: new Date(),
          createdBy: 'test-user'
        }
      })

      // 创建质量判定
      const judgment = await prisma.qualityJudgment.create({
        data: {
          sampleId: sample.id,
          result: 'QUALIFIED',
          basis: JSON.stringify({ rule: 'all_parameters_in_range' }),
          judgedBy: 'test-user'
        }
      })

      // 创建判定历史
      const history = await prisma.judgmentHistory.create({
        data: {
          judgmentId: judgment.id,
          sampleId: sample.id,
          previousResult: 'PENDING',
          newResult: 'QUALIFIED',
          changeReason: '初次判定',
          changedBy: 'test-user'
        }
      })

      // 验证关联关系
      const judgmentWithHistory = await prisma.qualityJudgment.findUnique({
        where: { id: judgment.id },
        include: { history: true }
      })

      expect(judgmentWithHistory).toBeDefined()
      expect(judgmentWithHistory?.history).toHaveLength(1)
      expect(judgmentWithHistory?.history[0].newResult).toBe('QUALIFIED')
    })
  })

  describe('报告模型关联关系测试', () => {
    it('应该能够创建报告并关联样品和模板', async () => {
      // 创建报告模板
      const template = await prisma.reportTemplate.create({
        data: {
          name: '标准检测报告模板',
          category: '水质检测',
          content: '<html><body>{{sampleName}}</body></html>',
          variables: { sampleName: 'string' },
          createdBy: 'test-user'
        }
      })

      // 创建样品
      const sample = await prisma.sample.create({
        data: {
          barcode: `BC${Date.now()}`,
          sampleNumber: `SN${Date.now()}`,
          clientName: '测试客户',
          sampleName: '测试样品',
          sampleType: '水样',
          sampleCategory: '环境',
          quantity: 100,
          unit: 'ml',
          receivedDate: new Date(),
          createdBy: 'test-user'
        }
      })

      // 创建报告
      const report = await prisma.report.create({
        data: {
          reportNumber: `RPT${Date.now()}`,
          sampleId: sample.id,
          templateId: template.id,
          content: '<html><body>测试样品</body></html>',
          generatedBy: 'test-user'
        }
      })

      // 验证关联关系
      const reportWithRelations = await prisma.report.findUnique({
        where: { id: report.id },
        include: {
          sample: true,
          template: true
        }
      })

      expect(reportWithRelations).toBeDefined()
      expect(reportWithRelations?.sample.sampleName).toBe('测试样品')
      expect(reportWithRelations?.template.name).toBe('标准检测报告模板')
    })

    it('应该能够创建签名并关联报告', async () => {
      // 创建报告模板
      const template = await prisma.reportTemplate.create({
        data: {
          name: '标准检测报告模板',
          category: '水质检测',
          content: '<html><body>{{sampleName}}</body></html>',
          variables: { sampleName: 'string' },
          createdBy: 'test-user'
        }
      })

      // 创建样品
      const sample = await prisma.sample.create({
        data: {
          barcode: `BC${Date.now()}`,
          sampleNumber: `SN${Date.now()}`,
          clientName: '测试客户',
          sampleName: '测试样品',
          sampleType: '水样',
          sampleCategory: '环境',
          quantity: 100,
          unit: 'ml',
          receivedDate: new Date(),
          createdBy: 'test-user'
        }
      })

      // 创建报告
      const report = await prisma.report.create({
        data: {
          reportNumber: `RPT${Date.now()}`,
          sampleId: sample.id,
          templateId: template.id,
          content: '<html><body>测试样品</body></html>',
          generatedBy: 'test-user'
        }
      })

      // 创建签名
      const signature = await prisma.signature.create({
        data: {
          reportId: report.id,
          signerId: 'signer-1',
          signerName: '张三',
          signerRole: '技术负责人',
          signatureData: 'encrypted_signature_data'
        }
      })

      // 验证关联关系
      const reportWithSignatures = await prisma.report.findUnique({
        where: { id: report.id },
        include: { signatures: true }
      })

      expect(reportWithSignatures).toBeDefined()
      expect(reportWithSignatures?.signatures).toHaveLength(1)
      expect(reportWithSignatures?.signatures[0].signerName).toBe('张三')
    })

    it('应该能够创建分发记录并关联报告', async () => {
      // 创建报告模板
      const template = await prisma.reportTemplate.create({
        data: {
          name: '标准检测报告模板',
          category: '水质检测',
          content: '<html><body>{{sampleName}}</body></html>',
          variables: { sampleName: 'string' },
          createdBy: 'test-user'
        }
      })

      // 创建样品
      const sample = await prisma.sample.create({
        data: {
          barcode: `BC${Date.now()}`,
          sampleNumber: `SN${Date.now()}`,
          clientName: '测试客户',
          sampleName: '测试样品',
          sampleType: '水样',
          sampleCategory: '环境',
          quantity: 100,
          unit: 'ml',
          receivedDate: new Date(),
          createdBy: 'test-user'
        }
      })

      // 创建报告
      const report = await prisma.report.create({
        data: {
          reportNumber: `RPT${Date.now()}`,
          sampleId: sample.id,
          templateId: template.id,
          content: '<html><body>测试样品</body></html>',
          generatedBy: 'test-user'
        }
      })

      // 创建分发记录
      const distribution = await prisma.distribution.create({
        data: {
          reportId: report.id,
          method: 'EMAIL',
          recipient: '客户',
          recipientEmail: 'client@example.com'
        }
      })

      // 验证关联关系
      const reportWithDistributions = await prisma.report.findUnique({
        where: { id: report.id },
        include: { distributions: true }
      })

      expect(reportWithDistributions).toBeDefined()
      expect(reportWithDistributions?.distributions).toHaveLength(1)
      expect(reportWithDistributions?.distributions[0].recipientEmail).toBe('client@example.com')
    })
  })

  describe('唯一约束测试', () => {
    it('应该拒绝重复的用户名', async () => {
      await prisma.user.create({
        data: {
          username: 'uniqueuser',
          passwordHash: 'hashedpassword',
          email: 'unique1@example.com',
          fullName: '用户1'
        }
      })

      await expect(
        prisma.user.create({
          data: {
            username: 'uniqueuser',
            passwordHash: 'hashedpassword',
            email: 'unique2@example.com',
            fullName: '用户2'
          }
        })
      ).rejects.toThrow()
    })

    it('应该拒绝重复的邮箱', async () => {
      await prisma.user.create({
        data: {
          username: 'user1',
          passwordHash: 'hashedpassword',
          email: 'same@example.com',
          fullName: '用户1'
        }
      })

      await expect(
        prisma.user.create({
          data: {
            username: 'user2',
            passwordHash: 'hashedpassword',
            email: 'same@example.com',
            fullName: '用户2'
          }
        })
      ).rejects.toThrow()
    })

    it('应该拒绝重复的样品条码', async () => {
      const barcode = `BC${Date.now()}`
      
      await prisma.sample.create({
        data: {
          barcode,
          sampleNumber: `SN${Date.now()}-1`,
          clientName: '测试客户',
          sampleName: '样品1',
          sampleType: '水样',
          sampleCategory: '环境',
          quantity: 100,
          unit: 'ml',
          receivedDate: new Date(),
          createdBy: 'test-user'
        }
      })

      await expect(
        prisma.sample.create({
          data: {
            barcode,
            sampleNumber: `SN${Date.now()}-2`,
            clientName: '测试客户',
            sampleName: '样品2',
            sampleType: '水样',
            sampleCategory: '环境',
            quantity: 100,
            unit: 'ml',
            receivedDate: new Date(),
            createdBy: 'test-user'
          }
        })
      ).rejects.toThrow()
    })

    it('应该拒绝重复的样品编号', async () => {
      const sampleNumber = `SN${Date.now()}`
      
      await prisma.sample.create({
        data: {
          barcode: `BC${Date.now()}-1`,
          sampleNumber,
          clientName: '测试客户',
          sampleName: '样品1',
          sampleType: '水样',
          sampleCategory: '环境',
          quantity: 100,
          unit: 'ml',
          receivedDate: new Date(),
          createdBy: 'test-user'
        }
      })

      await expect(
        prisma.sample.create({
          data: {
            barcode: `BC${Date.now()}-2`,
            sampleNumber,
            clientName: '测试客户',
            sampleName: '样品2',
            sampleType: '水样',
            sampleCategory: '环境',
            quantity: 100,
            unit: 'ml',
            receivedDate: new Date(),
            createdBy: 'test-user'
          }
        })
      ).rejects.toThrow()
    })

    it('应该拒绝重复的报告编号', async () => {
      const reportNumber = `RPT${Date.now()}`
      
      // 创建报告模板
      const template = await prisma.reportTemplate.create({
        data: {
          name: '标准检测报告模板',
          category: '水质检测',
          content: '<html><body>{{sampleName}}</body></html>',
          variables: { sampleName: 'string' },
          createdBy: 'test-user'
        }
      })

      // 创建两个样品
      const sample1 = await prisma.sample.create({
        data: {
          barcode: `BC${Date.now()}-1`,
          sampleNumber: `SN${Date.now()}-1`,
          clientName: '测试客户',
          sampleName: '样品1',
          sampleType: '水样',
          sampleCategory: '环境',
          quantity: 100,
          unit: 'ml',
          receivedDate: new Date(),
          createdBy: 'test-user'
        }
      })

      const sample2 = await prisma.sample.create({
        data: {
          barcode: `BC${Date.now()}-2`,
          sampleNumber: `SN${Date.now()}-2`,
          clientName: '测试客户',
          sampleName: '样品2',
          sampleType: '水样',
          sampleCategory: '环境',
          quantity: 100,
          unit: 'ml',
          receivedDate: new Date(),
          createdBy: 'test-user'
        }
      })

      await prisma.report.create({
        data: {
          reportNumber,
          sampleId: sample1.id,
          templateId: template.id,
          content: '<html><body>样品1</body></html>',
          generatedBy: 'test-user'
        }
      })

      await expect(
        prisma.report.create({
          data: {
            reportNumber,
            sampleId: sample2.id,
            templateId: template.id,
            content: '<html><body>样品2</body></html>',
            generatedBy: 'test-user'
          }
        })
      ).rejects.toThrow()
    })

    it('应该拒绝重复的权限（资源+操作）', async () => {
      await prisma.permission.create({
        data: {
          resource: 'sample',
          action: 'create'
        }
      })

      await expect(
        prisma.permission.create({
          data: {
            resource: 'sample',
            action: 'create'
          }
        })
      ).rejects.toThrow()
    })
  })

  describe('级联操作测试', () => {
    it('删除用户时应该级联删除用户角色关联', async () => {
      // 创建用户
      const user = await prisma.user.create({
        data: {
          username: 'cascadeuser',
          passwordHash: 'hashedpassword',
          email: 'cascade@example.com',
          fullName: '级联测试用户'
        }
      })

      // 创建角色
      const role = await prisma.role.create({
        data: {
          name: 'cascaderole',
          description: '级联测试角色'
        }
      })

      // 关联用户和角色
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id
        }
      })

      // 删除用户
      await prisma.user.delete({
        where: { id: user.id }
      })

      // 验证用户角色关联已被删除
      const userRoles = await prisma.userRole.findMany({
        where: { userId: user.id }
      })

      expect(userRoles).toHaveLength(0)
    })

    it('删除角色时应该级联删除用户角色关联', async () => {
      // 创建用户
      const user = await prisma.user.create({
        data: {
          username: 'cascadeuser2',
          passwordHash: 'hashedpassword',
          email: 'cascade2@example.com',
          fullName: '级联测试用户2'
        }
      })

      // 创建角色
      const role = await prisma.role.create({
        data: {
          name: 'cascaderole2',
          description: '级联测试角色2'
        }
      })

      // 关联用户和角色
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id
        }
      })

      // 删除角色
      await prisma.role.delete({
        where: { id: role.id }
      })

      // 验证用户角色关联已被删除
      const userRoles = await prisma.userRole.findMany({
        where: { roleId: role.id }
      })

      expect(userRoles).toHaveLength(0)
    })

    it('删除样品时应该级联删除检测项', async () => {
      // 创建样品
      const sample = await prisma.sample.create({
        data: {
          barcode: `BC${Date.now()}`,
          sampleNumber: `SN${Date.now()}`,
          clientName: '测试客户',
          sampleName: '级联测试样品',
          sampleType: '水样',
          sampleCategory: '环境',
          quantity: 100,
          unit: 'ml',
          receivedDate: new Date(),
          createdBy: 'test-user'
        }
      })

      // 创建检测项
      await prisma.testItem.create({
        data: {
          sampleId: sample.id,
          testMethod: 'GB/T 5750.4-2006',
          testParameters: { ph: { min: 6.5, max: 8.5 } }
        }
      })

      // 删除样品
      await prisma.sample.delete({
        where: { id: sample.id }
      })

      // 验证检测项已被删除
      const testItems = await prisma.testItem.findMany({
        where: { sampleId: sample.id }
      })

      expect(testItems).toHaveLength(0)
    })

    it('删除样品时应该级联删除流转记录', async () => {
      // 创建样品
      const sample = await prisma.sample.create({
        data: {
          barcode: `BC${Date.now()}`,
          sampleNumber: `SN${Date.now()}`,
          clientName: '测试客户',
          sampleName: '级联测试样品',
          sampleType: '水样',
          sampleCategory: '环境',
          quantity: 100,
          unit: 'ml',
          receivedDate: new Date(),
          createdBy: 'test-user'
        }
      })

      // 创建流转记录
      await prisma.transfer.create({
        data: {
          sampleId: sample.id,
          fromLocation: '接收室',
          toLocation: '检测室',
          fromPerson: '张三',
          toPerson: '李四'
        }
      })

      // 删除样品
      await prisma.sample.delete({
        where: { id: sample.id }
      })

      // 验证流转记录已被删除
      const transfers = await prisma.transfer.findMany({
        where: { sampleId: sample.id }
      })

      expect(transfers).toHaveLength(0)
    })

    it('删除样品时应该级联删除检测结果', async () => {
      // 创建样品
      const sample = await prisma.sample.create({
        data: {
          barcode: `BC${Date.now()}`,
          sampleNumber: `SN${Date.now()}`,
          clientName: '测试客户',
          sampleName: '级联测试样品',
          sampleType: '水样',
          sampleCategory: '环境',
          quantity: 100,
          unit: 'ml',
          receivedDate: new Date(),
          createdBy: 'test-user'
        }
      })

      // 创建检测结果
      await prisma.result.create({
        data: {
          sampleId: sample.id,
          testItemId: 'test-item-1',
          parameter: 'pH值',
          value: 7.2,
          unit: 'pH',
          method: 'GB/T 5750.4-2006',
          enteredBy: 'test-user'
        }
      })

      // 删除样品
      await prisma.sample.delete({
        where: { id: sample.id }
      })

      // 验证检测结果已被删除
      const results = await prisma.result.findMany({
        where: { sampleId: sample.id }
      })

      expect(results).toHaveLength(0)
    })

    it('删除样品时应该级联删除审核任务', async () => {
      // 创建样品
      const sample = await prisma.sample.create({
        data: {
          barcode: `BC${Date.now()}`,
          sampleNumber: `SN${Date.now()}`,
          clientName: '测试客户',
          sampleName: '级联测试样品',
          sampleType: '水样',
          sampleCategory: '环境',
          quantity: 100,
          unit: 'ml',
          receivedDate: new Date(),
          createdBy: 'test-user'
        }
      })

      // 创建审核任务
      await prisma.auditTask.create({
        data: {
          sampleId: sample.id,
          level: 1,
          auditorId: 'auditor-1'
        }
      })

      // 删除样品
      await prisma.sample.delete({
        where: { id: sample.id }
      })

      // 验证审核任务已被删除
      const auditTasks = await prisma.auditTask.findMany({
        where: { sampleId: sample.id }
      })

      expect(auditTasks).toHaveLength(0)
    })

    it('删除样品时应该级联删除质量判定', async () => {
      // 创建样品
      const sample = await prisma.sample.create({
        data: {
          barcode: `BC${Date.now()}`,
          sampleNumber: `SN${Date.now()}`,
          clientName: '测试客户',
          sampleName: '级联测试样品',
          sampleType: '水样',
          sampleCategory: '环境',
          quantity: 100,
          unit: 'ml',
          receivedDate: new Date(),
          createdBy: 'test-user'
        }
      })

      // 创建质量判定
      await prisma.qualityJudgment.create({
        data: {
          sampleId: sample.id,
          result: 'QUALIFIED',
          basis: JSON.stringify({ rule: 'all_parameters_in_range' }),
          judgedBy: 'test-user'
        }
      })

      // 删除样品
      await prisma.sample.delete({
        where: { id: sample.id }
      })

      // 验证质量判定已被删除
      const judgments = await prisma.qualityJudgment.findMany({
        where: { sampleId: sample.id }
      })

      expect(judgments).toHaveLength(0)
    })

    it('删除工作流实例时应该级联删除任务', async () => {
      // 创建工作流配置
      const workflow = await prisma.workflow.create({
        data: {
          name: '级联测试流程',
          version: 1,
          config: { nodes: [], edges: [] },
          createdBy: 'test-user'
        }
      })

      // 创建样品
      const sample = await prisma.sample.create({
        data: {
          barcode: `BC${Date.now()}`,
          sampleNumber: `SN${Date.now()}`,
          clientName: '测试客户',
          sampleName: '级联测试样品',
          sampleType: '水样',
          sampleCategory: '环境',
          quantity: 100,
          unit: 'ml',
          receivedDate: new Date(),
          createdBy: 'test-user'
        }
      })

      // 创建工作流实例
      const instance = await prisma.workflowInstance.create({
        data: {
          workflowId: workflow.id,
          sampleId: sample.id,
          currentNodes: ['test']
        }
      })

      // 创建任务
      await prisma.task.create({
        data: {
          instanceId: instance.id,
          nodeId: 'test',
          nodeName: '检测任务',
          nodeType: 'task'
        }
      })

      // 删除工作流实例
      await prisma.workflowInstance.delete({
        where: { id: instance.id }
      })

      // 验证任务已被删除
      const tasks = await prisma.task.findMany({
        where: { instanceId: instance.id }
      })

      expect(tasks).toHaveLength(0)
    })

    it('删除报告时应该级联删除签名', async () => {
      // 创建报告模板
      const template = await prisma.reportTemplate.create({
        data: {
          name: '级联测试模板',
          category: '水质检测',
          content: '<html><body>{{sampleName}}</body></html>',
          variables: { sampleName: 'string' },
          createdBy: 'test-user'
        }
      })

      // 创建样品
      const sample = await prisma.sample.create({
        data: {
          barcode: `BC${Date.now()}`,
          sampleNumber: `SN${Date.now()}`,
          clientName: '测试客户',
          sampleName: '级联测试样品',
          sampleType: '水样',
          sampleCategory: '环境',
          quantity: 100,
          unit: 'ml',
          receivedDate: new Date(),
          createdBy: 'test-user'
        }
      })

      // 创建报告
      const report = await prisma.report.create({
        data: {
          reportNumber: `RPT${Date.now()}`,
          sampleId: sample.id,
          templateId: template.id,
          content: '<html><body>级联测试样品</body></html>',
          generatedBy: 'test-user'
        }
      })

      // 创建签名
      await prisma.signature.create({
        data: {
          reportId: report.id,
          signerId: 'signer-1',
          signerName: '张三',
          signerRole: '技术负责人',
          signatureData: 'encrypted_signature_data'
        }
      })

      // 删除报告
      await prisma.report.delete({
        where: { id: report.id }
      })

      // 验证签名已被删除
      const signatures = await prisma.signature.findMany({
        where: { reportId: report.id }
      })

      expect(signatures).toHaveLength(0)
    })

    it('删除报告时应该级联删除分发记录', async () => {
      // 创建报告模板
      const template = await prisma.reportTemplate.create({
        data: {
          name: '级联测试模板',
          category: '水质检测',
          content: '<html><body>{{sampleName}}</body></html>',
          variables: { sampleName: 'string' },
          createdBy: 'test-user'
        }
      })

      // 创建样品
      const sample = await prisma.sample.create({
        data: {
          barcode: `BC${Date.now()}`,
          sampleNumber: `SN${Date.now()}`,
          clientName: '测试客户',
          sampleName: '级联测试样品',
          sampleType: '水样',
          sampleCategory: '环境',
          quantity: 100,
          unit: 'ml',
          receivedDate: new Date(),
          createdBy: 'test-user'
        }
      })

      // 创建报告
      const report = await prisma.report.create({
        data: {
          reportNumber: `RPT${Date.now()}`,
          sampleId: sample.id,
          templateId: template.id,
          content: '<html><body>级联测试样品</body></html>',
          generatedBy: 'test-user'
        }
      })

      // 创建分发记录
      await prisma.distribution.create({
        data: {
          reportId: report.id,
          method: 'EMAIL',
          recipient: '客户',
          recipientEmail: 'client@example.com'
        }
      })

      // 删除报告
      await prisma.report.delete({
        where: { id: report.id }
      })

      // 验证分发记录已被删除
      const distributions = await prisma.distribution.findMany({
        where: { reportId: report.id }
      })

      expect(distributions).toHaveLength(0)
    })

    it('删除质量判定时应该级联删除判定历史', async () => {
      // 创建样品
      const sample = await prisma.sample.create({
        data: {
          barcode: `BC${Date.now()}`,
          sampleNumber: `SN${Date.now()}`,
          clientName: '测试客户',
          sampleName: '级联测试样品',
          sampleType: '水样',
          sampleCategory: '环境',
          quantity: 100,
          unit: 'ml',
          receivedDate: new Date(),
          createdBy: 'test-user'
        }
      })

      // 创建质量判定
      const judgment = await prisma.qualityJudgment.create({
        data: {
          sampleId: sample.id,
          result: 'QUALIFIED',
          basis: JSON.stringify({ rule: 'all_parameters_in_range' }),
          judgedBy: 'test-user'
        }
      })

      // 创建判定历史
      await prisma.judgmentHistory.create({
        data: {
          judgmentId: judgment.id,
          sampleId: sample.id,
          previousResult: 'PENDING',
          newResult: 'QUALIFIED',
          changeReason: '初次判定',
          changedBy: 'test-user'
        }
      })

      // 删除质量判定
      await prisma.qualityJudgment.delete({
        where: { id: judgment.id }
      })

      // 验证判定历史已被删除
      const history = await prisma.judgmentHistory.findMany({
        where: { judgmentId: judgment.id }
      })

      expect(history).toHaveLength(0)
    })
  })
})
