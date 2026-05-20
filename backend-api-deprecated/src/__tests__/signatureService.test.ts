/**
 * 电子签名服务单元测试
 */

import { PrismaClient } from '@prisma/client'
import signatureService from '../services/signatureService'
import { ReportStatus } from '../types/report'

const prisma = new PrismaClient()

describe('SignatureService', () => {
  let testUserId: string
  let testSampleId: string
  let testTemplateId: string
  let testRoleId: string

  beforeAll(async () => {
    // 先清理可能存在的测试数据
    await prisma.userRole.deleteMany({
      where: { user: { username: 'signature_test_user' } }
    })
    await prisma.user.deleteMany({
      where: { username: 'signature_test_user' }
    })
    await prisma.role.deleteMany({
      where: { name: 'signature_tester' }
    })

    // 创建测试角色
    const role = await prisma.role.create({
      data: {
        name: 'signature_tester',
        description: '签名测试角色'
      }
    })
    testRoleId = role.id

    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        username: 'signature_test_user',
        passwordHash: 'hash',
        email: 'signature_test@example.com',
        fullName: '签名测试用户',
        status: 'ACTIVE'
      }
    })
    testUserId = user.id

    // 关联用户和角色
    await prisma.userRole.create({
      data: {
        userId: testUserId,
        roleId: testRoleId
      }
    })

    // 创建测试样品
    const sample = await prisma.sample.create({
      data: {
        barcode: 'SIG-TEST-001',
        sampleNumber: 'SIG-001',
        clientName: '测试客户',
        sampleName: '测试样品',
        sampleType: '水样',
        sampleCategory: '环境',
        quantity: 1,
        unit: 'L',
        receivedDate: new Date(),
        status: 'REGISTERED',
        priority: 'NORMAL',
        createdBy: testUserId
      }
    })
    testSampleId = sample.id

    // 创建测试模板
    const template = await prisma.reportTemplate.create({
      data: {
        name: '签名测试模板',
        category: '测试',
        content: '<html><body>测试报告</body></html>',
        variables: [],
        isActive: true,
        createdBy: testUserId
      }
    })
    testTemplateId = template.id
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.signature.deleteMany({
      where: { report: { sampleId: testSampleId } }
    })
    await prisma.report.deleteMany({
      where: { sampleId: testSampleId }
    })
    await prisma.reportTemplate.deleteMany({
      where: { id: testTemplateId }
    })
    await prisma.sample.deleteMany({
      where: { id: testSampleId }
    })
    await prisma.userRole.deleteMany({
      where: { userId: testUserId }
    })
    await prisma.user.deleteMany({
      where: { id: testUserId }
    })
    await prisma.role.deleteMany({
      where: { id: testRoleId }
    })
    await prisma.$disconnect()
  })

  // 辅助函数：创建测试报告
  async function createTestReport(reportNumber: string) {
    return await prisma.report.create({
      data: {
        reportNumber,
        sampleId: testSampleId,
        templateId: testTemplateId,
        content: '<html><body>测试报告内容</body></html>',
        status: ReportStatus.DRAFT,
        generatedBy: testUserId
      }
    })
  }

  describe('signReport', () => {
    it('应该成功签名报告', async () => {
      const report = await createTestReport('SIG-REPORT-001')
      const signatureData = 'test-signature-data-base64'
      const signerRole = 'signature_tester'

      const signature = await signatureService.signReport(
        {
          reportId: report.id,
          signatureData,
          signerRole
        },
        testUserId
      )

      expect(signature).toBeDefined()
      expect(signature.reportId).toBe(report.id)
      expect(signature.signerId).toBe(testUserId)
      expect(signature.signerRole).toBe(signerRole)
      expect(signature.signatureData).toBeDefined()
      // 签名数据应该被加密，不等于原始数据
      expect(signature.signatureData).not.toBe(signatureData)
    })

    it('应该拒绝对不存在的报告签名', async () => {
      await expect(
        signatureService.signReport(
          {
            reportId: 'non-existent-id',
            signatureData: 'test-data',
            signerRole: 'signature_tester'
          },
          testUserId
        )
      ).rejects.toThrow('报告不存在')
    })

    it('应该拒绝用户没有权限的角色签名', async () => {
      const report = await createTestReport('SIG-REPORT-002')
      
      await expect(
        signatureService.signReport(
          {
            reportId: report.id,
            signatureData: 'test-data',
            signerRole: 'admin' // 用户没有这个角色
          },
          testUserId
        )
      ).rejects.toThrow('没有 admin 角色权限')
    })

    it('应该拒绝重复签名同一角色', async () => {
      const report = await createTestReport('SIG-REPORT-003')
      
      // 第一次签名应该成功
      await signatureService.signReport(
        {
          reportId: report.id,
          signatureData: 'test-data-1',
          signerRole: 'signature_tester'
        },
        testUserId
      )

      // 第二次签名同一角色应该失败
      await expect(
        signatureService.signReport(
          {
            reportId: report.id,
            signatureData: 'test-data-2',
            signerRole: 'signature_tester'
          },
          testUserId
        )
      ).rejects.toThrow('已经签名')
    })
  })

  describe('verifySignature', () => {
    it('应该成功验证有效签名', async () => {
      const report = await createTestReport('SIG-REPORT-004')
      
      // 先创建一个签名
      const signature = await signatureService.signReport(
        {
          reportId: report.id,
          signatureData: 'verify-test-data',
          signerRole: 'signature_tester'
        },
        testUserId
      )

      // 验证签名
      const result = await signatureService.verifySignature({
        reportId: report.id,
        signatureId: signature.id
      })

      expect(result.valid).toBe(true)
      expect(result.signature).toBeDefined()
      expect(result.signature?.id).toBe(signature.id)
    })

    it('应该拒绝不存在的签名', async () => {
      const report = await createTestReport('SIG-REPORT-005')
      
      const result = await signatureService.verifySignature({
        reportId: report.id,
        signatureId: 'non-existent-id'
      })

      expect(result.valid).toBe(false)
      expect(result.error).toBe('签名不存在')
    })

    it('应该拒绝签名与报告不匹配', async () => {
      const report1 = await createTestReport('SIG-REPORT-006')
      const report2 = await createTestReport('SIG-REPORT-007')

      // 为第一个报告创建签名
      const signature = await signatureService.signReport(
        {
          reportId: report1.id,
          signatureData: 'mismatch-test-data',
          signerRole: 'signature_tester'
        },
        testUserId
      )

      // 尝试用第二个报告验证第一个报告的签名
      const result = await signatureService.verifySignature({
        reportId: report2.id,
        signatureId: signature.id
      })

      expect(result.valid).toBe(false)
      expect(result.error).toBe('签名与报告不匹配')
    })
  })

  describe('revokeSignature', () => {
    it('应该成功撤销签名', async () => {
      const report = await createTestReport('SIG-REPORT-008')
      
      // 创建一个签名
      const signature = await signatureService.signReport(
        {
          reportId: report.id,
          signatureData: 'revoke-test-data',
          signerRole: 'signature_tester'
        },
        testUserId
      )

      // 撤销签名
      await signatureService.revokeSignature(
        {
          reportId: report.id,
          signatureId: signature.id,
          reason: '测试撤销'
        },
        testUserId
      )

      // 验证签名已被删除
      const deletedSignature = await prisma.signature.findUnique({
        where: { id: signature.id }
      })
      expect(deletedSignature).toBeNull()
    })

    it('应该拒绝撤销不存在的签名', async () => {
      const report = await createTestReport('SIG-REPORT-009')
      
      await expect(
        signatureService.revokeSignature(
          {
            reportId: report.id,
            signatureId: 'non-existent-id',
            reason: '测试'
          },
          testUserId
        )
      ).rejects.toThrow('签名不存在')
    })
  })

  describe('getReportSignatures', () => {
    it('应该返回报告的所有签名', async () => {
      const report = await createTestReport('SIG-REPORT-010')

      // 创建签名
      await signatureService.signReport(
        {
          reportId: report.id,
          signatureData: 'list-test-data',
          signerRole: 'signature_tester'
        },
        testUserId
      )

      // 获取签名列表
      const signatures = await signatureService.getReportSignatures(report.id)

      expect(signatures).toBeDefined()
      expect(signatures.length).toBeGreaterThan(0)
      expect(signatures[0].reportId).toBe(report.id)
    })

    it('应该返回空数组如果报告没有签名', async () => {
      const report = await createTestReport('SIG-REPORT-011')

      const signatures = await signatureService.getReportSignatures(report.id)

      expect(signatures).toBeDefined()
      expect(signatures.length).toBe(0)
    })
  })

  describe('报告锁定机制', () => {
    it('签名后报告状态应该更新', async () => {
      const report = await createTestReport('SIG-REPORT-012')

      // 签名报告
      await signatureService.signReport(
        {
          reportId: report.id,
          signatureData: 'lock-test-data',
          signerRole: 'signature_tester'
        },
        testUserId
      )

      // 检查报告状态
      const updatedReport = await prisma.report.findUnique({
        where: { id: report.id }
      })

      expect(updatedReport?.status).not.toBe(ReportStatus.DRAFT)
      // 根据签名完成情况，状态应该是 PENDING_SIGNATURE 或 SIGNED
      expect([ReportStatus.PENDING_SIGNATURE, ReportStatus.SIGNED]).toContain(
        updatedReport?.status
      )
    })

    it('应该拒绝修改已签名的报告', async () => {
      const report = await prisma.report.create({
        data: {
          reportNumber: 'SIG-REPORT-013',
          sampleId: testSampleId,
          templateId: testTemplateId,
          content: '<html><body>已签名报告</body></html>',
          status: ReportStatus.SIGNED, // 直接设置为已签名状态
          generatedBy: testUserId
        }
      })

      // 尝试签名已签名的报告
      await expect(
        signatureService.signReport(
          {
            reportId: report.id,
            signatureData: 'test-data',
            signerRole: 'signature_tester'
          },
          testUserId
        )
      ).rejects.toThrow('报告已完成所有签名并锁定')
    })
  })

  describe('签名数据加密', () => {
    it('签名数据应该被加密存储', async () => {
      const report = await createTestReport('SIG-REPORT-014')
      const originalData = 'sensitive-signature-data'

      const signature = await signatureService.signReport(
        {
          reportId: report.id,
          signatureData: originalData,
          signerRole: 'signature_tester'
        },
        testUserId
      )

      // 加密后的数据不应该等于原始数据
      expect(signature.signatureData).not.toBe(originalData)
      // 加密数据应该包含 iv:authTag:encryptedData 格式
      expect(signature.signatureData.split(':').length).toBe(3)
    })
  })
})
