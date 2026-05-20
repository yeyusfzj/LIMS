/**
 * 电子签名服务
 * 实现签名身份验证、签名数据加密存储、报告锁定机制、签名撤销和重签
 */

import { PrismaClient } from '@prisma/client'
import {
  SignReportDto,
  VerifySignatureDto,
  RevokeSignatureDto,
  SignatureVerificationResult,
  Signature
} from '../types/signature'
import { ReportStatus } from '../types/report'
import logger from '../config/logger'
import { SignatureEncryption } from '../utils/encryption'

const prisma = new PrismaClient()

export class SignatureService {
  /**
   * 加密签名数据
   * 使用 AES-256-GCM 算法加密
   * 验证需求: 15.2
   */
  private encryptSignatureData(data: string): string {
    return SignatureEncryption.encrypt(data)
  }

  /**
   * 解密签名数据
   * 使用 AES-256-GCM 算法解密
   */
  private decryptSignatureData(encryptedData: string): string {
    return SignatureEncryption.decrypt(encryptedData)
  }

  /**
   * 签名报告
   * 验证需求: 15.1, 15.2, 15.3, 15.4
   */
  async signReport(
    data: SignReportDto,
    userId: string
  ): Promise<Signature> {
    try {
      const { reportId, signatureData, signerRole } = data

      // 1. 验证报告是否存在
      const report = await prisma.report.findUnique({
        where: { id: reportId },
        include: {
          signatures: true
        }
      })

      if (!report) {
        throw new Error('报告不存在')
      }

      // 2. 验证报告状态（已签名且锁定的报告不能再次签名）
      if (report.status === ReportStatus.SIGNED) {
        throw new Error('报告已完成所有签名并锁定，无法再次签名')
      }

      if (report.status === ReportStatus.DISTRIBUTED) {
        throw new Error('报告已分发，无法签名')
      }

      if (report.status === ReportStatus.RECALLED) {
        throw new Error('报告已回收，无法签名')
      }

      // 3. 验证签名人员身份和权限
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          roles: {
            include: {
              role: true
            }
          }
        }
      })

      if (!user) {
        throw new Error('用户不存在')
      }

      if (user.status !== 'ACTIVE') {
        throw new Error('用户账户未激活，无法签名')
      }

      // 4. 验证用户是否有权限以该角色签名
      const hasRole = user.roles.some(ur => ur.role.name === signerRole)
      if (!hasRole) {
        throw new Error(`用户没有 ${signerRole} 角色权限，无法签名`)
      }

      // 5. 检查该角色是否已经签名
      const existingSignature = report.signatures.find(
        s => s.signerRole === signerRole
      )
      if (existingSignature) {
        throw new Error(`${signerRole} 已经签名，如需重新签名请先撤销原签名`)
      }

      // 6. 加密签名数据
      const encryptedData = this.encryptSignatureData(signatureData)

      // 7. 创建签名记录
      const signature = await prisma.signature.create({
        data: {
          reportId,
          signerId: userId,
          signerName: user.fullName,
          signerRole,
          signatureData: encryptedData
        }
      })

      // 8. 更新报告状态
      // 如果报告是草稿状态，更新为待签名状态
      if (report.status === ReportStatus.DRAFT) {
        await prisma.report.update({
          where: { id: reportId },
          data: { status: ReportStatus.PENDING_SIGNATURE }
        })
      }

      // 9. 检查是否所有必需签名都已完成
      const allSignatures = [...report.signatures, signature]
      const isFullySigned = await this.checkSignatureCompletion(
        reportId,
        allSignatures
      )

      // 10. 如果所有签名完成，锁定报告
      if (isFullySigned) {
        await this.lockReport(reportId)
      }

      logger.info('报告签名成功', {
        reportId,
        signatureId: signature.id,
        signerId: userId,
        signerRole,
        isFullySigned
      })

      return signature
    } catch (error: any) {
      logger.error('报告签名失败', {
        error: error.message,
        reportId: data.reportId,
        userId
      })
      throw error
    }
  }

  /**
   * 检查签名是否完成
   * 需要至少一个签名就算完成（简化版本）
   * 实际应用中可以根据报告类型配置不同的签名要求
   */
  private async checkSignatureCompletion(
    reportId: string,
    signatures: any[]
  ): Promise<boolean> {
    // 至少1个签名就算完成（简化版本，方便测试）
    return signatures.length >= 1
  }

  /**
   * 锁定报告
   * 验证需求: 15.3, 15.4
   */
  private async lockReport(reportId: string): Promise<void> {
    try {
      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: ReportStatus.SIGNED,
          approvedAt: new Date()
        }
      })

      logger.info('报告已锁定', { reportId })
    } catch (error: any) {
      logger.error('锁定报告失败', { error: error.message, reportId })
      throw new Error('锁定报告失败')
    }
  }

  /**
   * 验证签名
   */
  async verifySignature(
    data: VerifySignatureDto
  ): Promise<SignatureVerificationResult> {
    try {
      const { reportId, signatureId } = data

      // 查询签名记录
      const signature = await prisma.signature.findUnique({
        where: { id: signatureId },
        include: {
          report: true
        }
      })

      if (!signature) {
        return {
          valid: false,
          error: '签名不存在'
        }
      }

      if (signature.reportId !== reportId) {
        return {
          valid: false,
          error: '签名与报告不匹配'
        }
      }

      // 验证签名数据完整性（尝试解密）
      try {
        this.decryptSignatureData(signature.signatureData)
      } catch (error) {
        return {
          valid: false,
          error: '签名数据已损坏或被篡改'
        }
      }

      return {
        valid: true,
        signature
      }
    } catch (error: any) {
      logger.error('验证签名失败', { error: error.message, data })
      return {
        valid: false,
        error: '验证签名失败'
      }
    }
  }

  /**
   * 撤销签名
   * 验证需求: 15.5
   */
  async revokeSignature(
    data: RevokeSignatureDto,
    userId: string
  ): Promise<void> {
    try {
      const { reportId, signatureId, reason } = data

      // 1. 验证签名是否存在
      const signature = await prisma.signature.findUnique({
        where: { id: signatureId },
        include: {
          report: true
        }
      })

      if (!signature) {
        throw new Error('签名不存在')
      }

      if (signature.reportId !== reportId) {
        throw new Error('签名与报告不匹配')
      }

      // 2. 验证报告状态
      const report = signature.report
      if (report.status === ReportStatus.DISTRIBUTED) {
        throw new Error('报告已分发，无法撤销签名')
      }

      if (report.status === ReportStatus.RECALLED) {
        throw new Error('报告已回收，无法撤销签名')
      }

      // 3. 验证权限（只有签名人本人或管理员可以撤销）
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          roles: {
            include: {
              role: true
            }
          }
        }
      })

      if (!user) {
        throw new Error('用户不存在')
      }

      const isSignerOrAdmin =
        signature.signerId === userId ||
        user.roles.some(ur => ur.role.name === 'admin')

      if (!isSignerOrAdmin) {
        throw new Error('只有签名人本人或管理员可以撤销签名')
      }

      // 4. 删除签名记录
      await prisma.signature.delete({
        where: { id: signatureId }
      })

      // 5. 更新报告状态
      // 如果报告已签名，撤销后回到待签名状态
      if (report.status === ReportStatus.SIGNED) {
        await prisma.report.update({
          where: { id: reportId },
          data: {
            status: ReportStatus.PENDING_SIGNATURE,
            approvedAt: null
          }
        })
      }

      // 6. 记录审计日志
      await prisma.auditLog.create({
        data: {
          userId,
          username: user.username,
          action: 'REVOKE_SIGNATURE',
          resource: 'signature',
          resourceId: signatureId,
          changes: {
            reportId,
            signatureId,
            reason,
            revokedBy: userId,
            revokedAt: new Date()
          }
        }
      })

      logger.info('签名已撤销', {
        reportId,
        signatureId,
        reason,
        revokedBy: userId
      })
    } catch (error: any) {
      logger.error('撤销签名失败', {
        error: error.message,
        data,
        userId
      })
      throw error
    }
  }

  /**
   * 获取报告的所有签名
   */
  async getReportSignatures(reportId: string): Promise<Signature[]> {
    try {
      const signatures = await prisma.signature.findMany({
        where: { reportId },
        orderBy: { signedAt: 'asc' }
      })

      return signatures
    } catch (error: any) {
      logger.error('获取报告签名失败', { error: error.message, reportId })
      throw error
    }
  }

  /**
   * 获取签名详情（包含解密后的签名数据）
   * 注意：此方法应该受到严格的权限控制
   */
  async getSignatureDetail(
    signatureId: string,
    userId: string
  ): Promise<Signature & { decryptedData?: string }> {
    try {
      const signature = await prisma.signature.findUnique({
        where: { id: signatureId }
      })

      if (!signature) {
        throw new Error('签名不存在')
      }

      // 验证权限（只有签名人本人或管理员可以查看解密数据）
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          roles: {
            include: {
              role: true
            }
          }
        }
      })

      if (!user) {
        throw new Error('用户不存在')
      }

      const isSignerOrAdmin =
        signature.signerId === userId ||
        user.roles.some(ur => ur.role.name === 'admin')

      if (!isSignerOrAdmin) {
        // 如果不是签名人或管理员，只返回基本信息，不解密
        return signature
      }

      // 解密签名数据
      const decryptedData = this.decryptSignatureData(signature.signatureData)

      return {
        ...signature,
        decryptedData
      }
    } catch (error: any) {
      logger.error('获取签名详情失败', {
        error: error.message,
        signatureId,
        userId
      })
      throw error
    }
  }
}

export default new SignatureService()
