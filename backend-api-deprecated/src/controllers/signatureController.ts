/**
 * 电子签名控制器
 */

import { Request, Response, NextFunction } from 'express'
import signatureService from '../services/signatureService'
import logger from '../config/logger'

export class SignatureController {
  /**
   * 签名报告
   */
  async signReport(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId
      if (!userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权的访问'
          }
        })
      }

      const { id } = req.params
      const { signatureData, signerRole } = req.body

      const signature = await signatureService.signReport(
        {
          reportId: id,
          signatureData,
          signerRole
        },
        userId
      )

      res.status(201).json({
        message: '报告签名成功',
        data: signature
      })
    } catch (error: any) {
      logger.error('签名报告失败', { error, body: req.body })
      next(error)
    }
  }

  /**
   * 验证签名
   */
  async verifySignature(req: Request, res: Response, next: NextFunction) {
    try {
      const { reportId, signatureId } = req.params

      const result = await signatureService.verifySignature({
        reportId,
        signatureId
      })

      if (result.valid) {
        res.json({
          message: '签名验证成功',
          data: {
            valid: true,
            signature: result.signature
          }
        })
      } else {
        res.status(400).json({
          error: {
            code: 'INVALID_SIGNATURE',
            message: result.error || '签名验证失败'
          }
        })
      }
    } catch (error: any) {
      logger.error('验证签名失败', { error, params: req.params })
      next(error)
    }
  }

  /**
   * 撤销签名
   */
  async revokeSignature(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId
      if (!userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权的访问'
          }
        })
      }

      const { reportId, signatureId } = req.params
      const { reason } = req.body

      if (!reason) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '必须提供撤销原因'
          }
        })
      }

      await signatureService.revokeSignature(
        {
          reportId,
          signatureId,
          reason
        },
        userId
      )

      res.json({
        message: '签名已撤销'
      })
    } catch (error: any) {
      logger.error('撤销签名失败', { error, params: req.params, body: req.body })
      next(error)
    }
  }

  /**
   * 获取报告的所有签名
   */
  async getReportSignatures(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params

      const signatures = await signatureService.getReportSignatures(id)

      res.json({
        data: signatures
      })
    } catch (error: any) {
      logger.error('获取报告签名失败', { error, reportId: req.params.id })
      next(error)
    }
  }

  /**
   * 获取签名详情
   */
  async getSignatureDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.userId
      if (!userId) {
        return res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: '未授权的访问'
          }
        })
      }

      const { signatureId } = req.params

      const signature = await signatureService.getSignatureDetail(
        signatureId,
        userId
      )

      res.json({
        data: signature
      })
    } catch (error: any) {
      logger.error('获取签名详情失败', {
        error,
        signatureId: req.params.signatureId
      })
      next(error)
    }
  }
}

export default new SignatureController()
