import { Request, Response } from 'express'
import sampleService from '../services/sampleService'
import { CreateSampleDto, UpdateSampleDto, SampleQuery, TransferSampleDto, ConfirmTransferDto, SplitSampleDto, MergeSamplesDto } from '../types/sample'
import { SampleStatus } from '@prisma/client'
import logger from '../config/logger'

class SampleController {
  async createSample(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId
      if (!userId) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: '用户未认证' } })
        return
      }
      const data: CreateSampleDto = { ...req.body, createdBy: userId }
      const sample = await sampleService.createSample(data)
      logger.info('Sample created', { sampleId: sample.id })
      res.status(201).json({ message: '样品创建成功', data: sample })
    } catch (error: any) {
      logger.error('Error creating sample', { error: error.message })
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '创建样品失败', details: error.message } })
    }
  }

  async listSamples(req: Request, res: Response): Promise<void> {
    try {
      const query: SampleQuery = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
        barcode: req.query.barcode as string,
        sampleNumber: req.query.sampleNumber as string,
        clientName: req.query.clientName as string,
        sampleType: req.query.sampleType as string,
        status: req.query.status as SampleStatus
      }
      const result = await sampleService.listSamples(query)
      res.status(200).json({ message: '查询成功', data: result })
    } catch (error: any) {
      logger.error('Error listing samples', { error: error.message })
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '查询样品列表失败' } })
    }
  }

  async getSample(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const sample = await sampleService.getSample(id)
      if (!sample) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: '样品不存在' } })
        return
      }
      res.status(200).json({ message: '查询成功', data: sample })
    } catch (error: any) {
      logger.error('Error getting sample', { error: error.message })
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '获取样品详情失败' } })
    }
  }

  async getSampleByBarcode(req: Request, res: Response): Promise<void> {
    try {
      const { barcode } = req.params
      const sample = await sampleService.getSampleByBarcode(barcode)
      if (!sample) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: '样品不存在' } })
        return
      }
      res.status(200).json({ message: '查询成功', data: sample })
    } catch (error: any) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '获取样品失败' } })
    }
  }

  async updateSample(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const sample = await sampleService.updateSample(id, req.body)
      res.status(200).json({ message: '样品更新成功', data: sample })
    } catch (error: any) {
      if (error.message.includes('不存在')) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: error.message } })
        return
      }
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '更新样品失败' } })
    }
  }

  async updateSampleStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const { status } = req.body
      if (!status) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: '状态不能为空' } })
        return
      }
      const sample = await sampleService.updateSampleStatus(id, status)
      res.status(200).json({ message: '样品状态更新成功', data: sample })
    } catch (error: any) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '更新样品状态失败' } })
    }
  }

  async transferSample(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId
      if (!userId) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: '用户未认证' } })
        return
      }
      const { id } = req.params
      const data: TransferSampleDto = { sampleId: id, ...req.body, createdBy: userId }
      const transfer = await sampleService.transferSample(data)
      res.status(201).json({ message: '样品流转成功', data: transfer })
    } catch (error: any) {
      if (error.message.includes('不存在')) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: error.message } })
        return
      }
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '样品流转失败' } })
    }
  }

  async confirmTransfer(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId
      if (!userId) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: '用户未认证' } })
        return
      }
      const { transferId } = req.params
      const { confirmationType } = req.body
      if (!['sender', 'receiver'].includes(confirmationType)) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: '确认类型必须是 sender 或 receiver' } })
        return
      }
      const transfer = await sampleService.confirmTransfer({ transferId, confirmationType, userId })
      res.status(200).json({ message: '流转确认成功', data: transfer })
    } catch (error: any) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '确认流转失败' } })
    }
  }

  async getChainOfCustody(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const transfers = await sampleService.getChainOfCustody(id)
      res.status(200).json({ message: '查询成功', data: transfers })
    } catch (error: any) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '获取监管链失败' } })
    }
  }

  async getTransfer(req: Request, res: Response): Promise<void> {
    try {
      const { transferId } = req.params
      const transfer = await sampleService.getTransfer(transferId)
      if (!transfer) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: '流转记录不存在' } })
        return
      }
      res.status(200).json({ message: '查询成功', data: transfer })
    } catch (error: any) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '获取流转记录失败' } })
    }
  }

  async splitSample(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId
      if (!userId) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: '用户未认证' } })
        return
      }
      const { id } = req.params
      const data: SplitSampleDto = { parentSampleId: id, childSamples: req.body.childSamples, createdBy: userId }
      const childSamples = await sampleService.splitSample(data)
      res.status(201).json({ message: '分样成功', data: childSamples })
    } catch (error: any) {
      if (error.message.includes('不存在')) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: error.message } })
        return
      }
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '分样失败' } })
    }
  }

  async mergeSamples(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId
      if (!userId) {
        res.status(401).json({ error: { code: 'UNAUTHORIZED', message: '用户未认证' } })
        return
      }
      const data: MergeSamplesDto = { sourceSampleIds: req.body.sourceSampleIds, mergedSample: req.body.mergedSample, createdBy: userId }
      const mergedSample = await sampleService.mergeSamples(data)
      res.status(201).json({ message: '合样成功', data: mergedSample })
    } catch (error: any) {
      if (error.message.includes('不存在')) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: error.message } })
        return
      }
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '合样失败' } })
    }
  }

  async listTransfers(req: Request, res: Response): Promise<void> {
    try {
      const query: any = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined,
        sampleNumber: req.query.sampleNumber as string,
        status: req.query.status as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      }
      const result = await sampleService.listTransfers(query)
      res.status(200).json({ message: '查询成功', data: result.items, total: result.total, page: result.page, pageSize: result.pageSize })
    } catch (error: any) {
      logger.error('Error listing transfers', { error: error.message })
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '查询流转记录列表失败' } })
    }
  }

  async cancelTransfer(req: Request, res: Response): Promise<void> {
    try {
      const { transferId } = req.params
      const transfer = await sampleService.cancelTransfer(transferId)
      res.status(200).json({ message: '取消成功', data: transfer })
    } catch (error: any) {
      if (error.message.includes('不存在')) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: error.message } })
        return
      }
      if (error.message.includes('只能取消')) {
        res.status(400).json({ error: { code: 'INVALID_STATUS', message: error.message } })
        return
      }
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '取消流转失败' } })
    }
  }

  async deleteSample(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      await sampleService.deleteSample(id)
      logger.info('Sample deleted', { sampleId: id })
      res.status(200).json({ message: '样品删除成功' })
    } catch (error: any) {
      logger.error('Error deleting sample', { error: error.message })
      if (error.message.includes('不存在')) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: error.message } })
        return
      }
      if (error.message.includes('无法删除')) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.message } })
        return
      }
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '删除样品失败' } })
    }
  }

  async batchDeleteSamples(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.body
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: '请提供要删除的样品ID列表' } })
        return
      }
      const result = await sampleService.batchDeleteSamples(ids)
      logger.info('Batch delete completed', result)
      res.status(200).json({ 
        message: `批量删除完成: 成功${result.success}个, 失败${result.failed}个`,
        data: result
      })
    } catch (error: any) {
      logger.error('Error batch deleting samples', { error: error.message })
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '批量删除失败' } })
    }
  }

}

export default new SampleController()
