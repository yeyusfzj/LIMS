/**
 * 报告生成服务
 * 实现报告数据获取、编号生成、报告生成和错误处理
 */

import { PrismaClient } from '@prisma/client'
import {
  GenerateReportDto,
  ReportData,
  ReportGenerationResult,
  ReportQuery,
  ReportStatus,
  DistributeReportDto,
  RecallReportDto,
  DistributionQuery,
  DistributionMethod,
  DistributionStatus
} from '../types/report'
import { TemplateVariable } from '../types/reportTemplate'
import logger from '../config/logger'

const prisma = new PrismaClient()

export class ReportService {
  /**
   * 异步生成报告（使用队列）
   * 适用于大批量或耗时的报告生成
   */
  async generateReportAsync(
    sampleId: string,
    templateId: string,
    userId: string
  ): Promise<{ jobId: string; message: string }> {
    try {
      // 动态导入以避免循环依赖
      const { queueService } = await import('./queueService')
      
      const jobId = await queueService.addReportGenerationJob({
        sampleId,
        templateId,
        userId,
      })

      logger.info('报告生成任务已加入队列', {
        jobId,
        sampleId,
        templateId,
        userId,
      })

      return {
        jobId,
        message: '报告生成任务已提交，请稍后查询任务状态',
      }
    } catch (error: any) {
      logger.error('提交报告生成任务失败', {
        error: error.message,
        sampleId,
        templateId,
        userId,
      })
      throw new Error(`提交报告生成任务失败: ${error.message}`)
    }
  }

  /**
   * 生成报告（同步）
   * 验证需求: 14.1, 14.2, 14.3, 14.4, 14.5
   */
  async generateReport(
    data: GenerateReportDto,
    userId: string
  ): Promise<ReportGenerationResult> {
    try {
      const { sampleId, templateId, preview = false } = data

      // 1. 获取报告数据
      const reportData = await this.fetchReportData(sampleId, userId)

      // 2. 获取报告模板
      const template = await prisma.reportTemplate.findUnique({
        where: { id: templateId }
      })

      if (!template) {
        throw new Error('报告模板不存在')
      }

      if (!template.isActive) {
        throw new Error('报告模板未激活，无法使用')
      }

      // 3. 生成报告编号（仅正式生成时）
      let reportNumber: string | undefined
      if (!preview) {
        reportNumber = await this.generateReportNumber(sampleId)
      }

      // 4. 填充报告内容
      const content = this.fillReportTemplate(
        template.content,
        template.variables as any,
        reportData,
        reportNumber
      )

      // 5. 如果是预览模式，直接返回内容
      if (preview) {
        logger.info('报告预览生成成功', { sampleId, templateId, userId })
        return {
          content,
          preview: true
        }
      }

      // 6. 正式生成：创建报告记录
      const report = await prisma.report.create({
        data: {
          reportNumber: reportNumber!,
          sampleId,
          templateId,
          content,
          status: ReportStatus.DRAFT,
          generatedBy: userId
        }
      })

      logger.info('报告生成成功', {
        reportId: report.id,
        reportNumber: report.reportNumber,
        sampleId,
        templateId,
        userId
      })

      return {
        reportId: report.id,
        reportNumber: report.reportNumber,
        content: report.content,
        preview: false
      }
    } catch (error: any) {
      logger.error('报告生成失败', {
        error: error.message,
        stack: error.stack,
        data,
        userId
      })
      throw new Error(`报告生成失败: ${error.message}`)
    }
  }

  /**
   * 获取报告数据
   * 从数据库获取样品、检测项、结果、判定和审核数据
   * 验证需求: 14.1
   */
  private async fetchReportData(
    sampleId: string,
    userId: string
  ): Promise<ReportData> {
    try {
      // 获取样品信息（包含所有关联数据）
      const sample = await prisma.sample.findUnique({
        where: { id: sampleId },
        include: {
          testItems: true,
          results: true,
          qualityJudgment: true,
          auditTasks: {
            orderBy: { level: 'asc' }
          }
        }
      })

      if (!sample) {
        throw new Error('样品不存在')
      }

      // 构建报告数据
      const reportData: ReportData = {
        sample: {
          id: sample.id,
          barcode: sample.barcode,
          sampleNumber: sample.sampleNumber,
          clientName: sample.clientName,
          clientContact: sample.clientContact || undefined,
          sampleName: sample.sampleName,
          sampleType: sample.sampleType,
          sampleCategory: sample.sampleCategory,
          quantity: sample.quantity,
          unit: sample.unit,
          receivedDate: sample.receivedDate,
          samplingDate: sample.samplingDate || undefined,
          samplingLocation: sample.samplingLocation || undefined,
          samplingPerson: sample.samplingPerson || undefined,
          storageLocation: sample.storageLocation || undefined,
          storageCondition: sample.storageCondition || undefined,
          status: sample.status,
          priority: sample.priority,
          description: sample.description || undefined,
          remarks: sample.remarks || undefined
        },
        testItems: sample.testItems.map(item => ({
          id: item.id,
          testMethod: item.testMethod,
          testStandard: item.testStandard || undefined,
          status: item.status,
          assignedTo: item.assignedTo || undefined,
          completedAt: item.completedAt || undefined
        })),
        results: sample.results.map(result => ({
          id: result.id,
          testItemId: result.testItemId,
          parameter: result.parameter,
          value: result.value || undefined,
          textValue: result.textValue || undefined,
          unit: result.unit || undefined,
          method: result.method,
          source: result.source,
          isAbnormal: result.isAbnormal,
          abnormalReason: result.abnormalReason || undefined,
          enteredBy: result.enteredBy,
          enteredAt: result.enteredAt,
          reviewedBy: result.reviewedBy || undefined,
          reviewedAt: result.reviewedAt || undefined
        })),
        qualityJudgment: sample.qualityJudgment
          ? {
              id: sample.qualityJudgment.id,
              result: sample.qualityJudgment.result,
              basis: sample.qualityJudgment.basis,
              isAutomatic: sample.qualityJudgment.isAutomatic,
              judgedBy: sample.qualityJudgment.judgedBy,
              judgedAt: sample.qualityJudgment.judgedAt,
              reviewedBy: sample.qualityJudgment.reviewedBy || undefined,
              reviewedAt: sample.qualityJudgment.reviewedAt || undefined
            }
          : undefined,
        auditTasks: sample.auditTasks.map(task => ({
          id: task.id,
          level: task.level,
          auditorId: task.auditorId,
          status: task.status,
          decision: task.decision || undefined,
          comments: task.comments || undefined,
          submittedAt: task.submittedAt,
          completedAt: task.completedAt || undefined
        })),
        generatedAt: new Date(),
        generatedBy: userId
      }

      return reportData
    } catch (error: any) {
      logger.error('获取报告数据失败', {
        error: error.message,
        sampleId,
        userId
      })
      throw new Error(`获取报告数据失败: ${error.message}`)
    }
  }

  /**
   * 生成报告编号
   * 格式: REPORT-YYYYMMDD-序号
   * 验证需求: 14.3
   */
  private async generateReportNumber(sampleId: string): Promise<string> {
    try {
      const today = new Date()
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')

      // 查询今天已生成的报告数量
      const startOfDay = new Date(today.setHours(0, 0, 0, 0))
      const endOfDay = new Date(today.setHours(23, 59, 59, 999))

      const count = await prisma.report.count({
        where: {
          generatedAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      })

      // 生成序号（补零到4位）
      const sequence = (count + 1).toString().padStart(4, '0')
      const reportNumber = `REPORT-${dateStr}-${sequence}`

      // 检查编号是否已存在（防止并发冲突）
      const existing = await prisma.report.findUnique({
        where: { reportNumber }
      })

      if (existing) {
        // 如果存在，递归生成新编号
        logger.warn('报告编号冲突，重新生成', { reportNumber, sampleId })
        return this.generateReportNumber(sampleId)
      }

      return reportNumber
    } catch (error: any) {
      logger.error('生成报告编号失败', {
        error: error.message,
        sampleId
      })
      throw new Error(`生成报告编号失败: ${error.message}`)
    }
  }

  /**
   * 填充报告模板
   * 将模板中的变量替换为实际数据
   * 验证需求: 14.2
   */
  private fillReportTemplate(
    templateContent: string,
    variables: TemplateVariable[],
    reportData: ReportData,
    reportNumber?: string
  ): string {
    try {
      let content = templateContent

      // 构建数据上下文
      const context: any = {
        sample: reportData.sample,
        testItems: reportData.testItems,
        results: reportData.results,
        qualityJudgment: reportData.qualityJudgment,
        auditTasks: reportData.auditTasks,
        reportNumber: reportNumber || '预览',
        generatedAt: reportData.generatedAt,
        generatedBy: reportData.generatedBy
      }

      // 替换所有变量
      const variablePattern = /\{\{(\s*[\w.]+\s*)\}\}/g
      content = content.replace(variablePattern, (match, varPath) => {
        const path = varPath.trim()
        const value = this.getValueByPath(context, path)

        if (value === undefined || value === null) {
          // 查找变量定义，使用默认值
          const variable = variables.find(v => v.name === path.split('.')[0])
          if (variable && variable.defaultValue !== undefined) {
            return this.formatValue(variable.defaultValue, variable)
          }
          return '' // 如果没有默认值，返回空字符串
        }

        // 查找变量定义以获取格式化信息
        const variable = variables.find(v => v.name === path.split('.')[0])
        return this.formatValue(value, variable)
      })

      return content
    } catch (error: any) {
      logger.error('填充报告模板失败', {
        error: error.message,
        reportNumber
      })
      throw new Error(`填充报告模板失败: ${error.message}`)
    }
  }

  /**
   * 根据路径获取对象值
   * 支持嵌套属性访问，如 sample.name
   */
  private getValueByPath(obj: any, path: string): any {
    const parts = path.split('.')
    let value = obj

    for (const part of parts) {
      if (value === undefined || value === null) {
        return undefined
      }
      value = value[part]
    }

    return value
  }

  /**
   * 格式化值
   * 根据变量类型和格式配置格式化输出
   */
  private formatValue(value: any, variable?: TemplateVariable): string {
    if (value === undefined || value === null) {
      return ''
    }

    if (!variable) {
      return String(value)
    }

    switch (variable.type) {
      case 'date':
        if (value instanceof Date) {
          const format = variable.format || 'YYYY-MM-DD'
          return this.formatDate(value, format)
        }
        return String(value)

      case 'number':
        if (typeof value === 'number') {
          const format = variable.format || '0.00'
          return this.formatNumber(value, format)
        }
        return String(value)

      case 'boolean':
        return value ? '是' : '否'

      case 'array':
        if (Array.isArray(value)) {
          return value.join(', ')
        }
        return String(value)

      case 'object':
        if (typeof value === 'object') {
          return JSON.stringify(value, null, 2)
        }
        return String(value)

      default:
        return String(value)
    }
  }

  /**
   * 格式化日期
   */
  private formatDate(date: Date, format: string): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds)
  }

  /**
   * 格式化数字
   */
  private formatNumber(num: number, format: string): string {
    // 简单实现：提取小数位数
    const decimalMatch = format.match(/\.(\d+)/)
    if (decimalMatch) {
      const decimals = decimalMatch[1].length
      return num.toFixed(decimals)
    }
    return String(num)
  }

  /**
   * 获取报告详情
   */
  async getReport(id: string) {
    try {
      const report = await prisma.report.findUnique({
        where: { id },
        include: {
          sample: true,
          template: true,
          signatures: true,
          distributions: true
        }
      })

      if (!report) {
        throw new Error('报告不存在')
      }

      return report
    } catch (error: any) {
      logger.error('获取报告详情失败', { error: error.message, id })
      throw error
    }
  }

  /**
   * 查询报告列表
   */
  async listReports(query: ReportQuery) {
    try {
      const {
        sampleId,
        status,
        startDate,
        endDate,
        search,
        page = 1,
        pageSize = 20
      } = query
      const skip = (page - 1) * pageSize

      // 构建查询条件
      const where: any = {}

      if (sampleId) {
        where.sampleId = sampleId
      }

      if (status) {
        where.status = status
      }

      if (startDate || endDate) {
        where.generatedAt = {}
        if (startDate) {
          where.generatedAt.gte = startDate
        }
        if (endDate) {
          where.generatedAt.lte = endDate
        }
      }

      if (search) {
        where.reportNumber = {
          contains: search,
          mode: 'insensitive'
        }
      }

      // 查询总数和数据
      const [total, items] = await Promise.all([
        prisma.report.count({ where }),
        prisma.report.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { generatedAt: 'desc' },
          include: {
            sample: {
              select: {
                sampleNumber: true,
                sampleName: true,
                clientName: true
              }
            },
            template: {
              select: {
                name: true
              }
            }
          }
        })
      ])

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    } catch (error: any) {
      logger.error('查询报告列表失败', { error: error.message, query })
      throw error
    }
  }

  /**
   * 更新报告状态
   */
  async updateReportStatus(id: string, status: ReportStatus, userId: string) {
    try {
      const report = await prisma.report.update({
        where: { id },
        data: { status }
      })

      logger.info('报告状态已更新', {
        reportId: id,
        status,
        updatedBy: userId
      })

      return report
    } catch (error: any) {
      logger.error('更新报告状态失败', { error: error.message, id, status })
      throw error
    }
  }

  /**
   * 删除报告
   */
  async deleteReport(id: string, userId: string) {
    try {
      // 检查报告状态
      const report = await prisma.report.findUnique({
        where: { id }
      })

      if (!report) {
        throw new Error('报告不存在')
      }

      if (report.status !== ReportStatus.DRAFT) {
        throw new Error('只能删除草稿状态的报告')
      }

      await prisma.report.delete({
        where: { id }
      })

      logger.info('报告已删除', { reportId: id, deletedBy: userId })
    } catch (error: any) {
      logger.error('删除报告失败', { error: error.message, id })
      throw error
    }
  }

  /**
   * 检查报告是否可以修改
   * 已签名的报告不能修改
   * 验证需求: 15.4
   */
  async canModifyReport(id: string): Promise<boolean> {
    try {
      const report = await prisma.report.findUnique({
        where: { id }
      })

      if (!report) {
        throw new Error('报告不存在')
      }

      // 已签名、已分发或已回收的报告不能修改
      return (
        report.status !== ReportStatus.SIGNED &&
        report.status !== ReportStatus.DISTRIBUTED &&
        report.status !== ReportStatus.RECALLED
      )
    } catch (error: any) {
      logger.error('检查报告是否可修改失败', { error: error.message, id })
      throw error
    }
  }

  /**
   * 更新报告内容
   * 验证需求: 15.4
   */
  async updateReportContent(
    id: string,
    content: string,
    userId: string
  ): Promise<void> {
    try {
      // 检查是否可以修改
      const canModify = await this.canModifyReport(id)
      if (!canModify) {
        throw new Error('报告已签名或已分发，无法修改')
      }

      await prisma.report.update({
        where: { id },
        data: { content }
      })

      logger.info('报告内容已更新', { reportId: id, updatedBy: userId })
    } catch (error: any) {
      logger.error('更新报告内容失败', { error: error.message, id })
      throw error
    }
  }

  /**
   * 分发报告
   * 验证需求: 16.1, 16.2, 16.3
   */
  async distributeReport(
    data: DistributeReportDto,
    userId: string
  ): Promise<any> {
    try {
      const { reportId, method, recipient, recipientEmail } = data

      // 1. 检查报告是否存在且已签名
      const report = await prisma.report.findUnique({
        where: { id: reportId },
        include: {
          signatures: true
        }
      })

      if (!report) {
        throw new Error('报告不存在')
      }

      if (report.status === ReportStatus.RECALLED) {
        throw new Error('报告已回收，无法分发')
      }

      if (report.status !== ReportStatus.SIGNED) {
        throw new Error('报告未签名，无法分发')
      }

      // 2. 验证邮件分发时必须提供邮箱
      if (method === DistributionMethod.EMAIL && !recipientEmail) {
        throw new Error('邮件分发必须提供接收人邮箱')
      }

      // 3. 创建分发记录
      const distribution = await prisma.distribution.create({
        data: {
          reportId,
          method,
          recipient,
          recipientEmail,
          status: DistributionStatus.PENDING
        }
      })

      // 4. 根据分发方式执行分发操作
      let distributionResult: any

      switch (method) {
        case DistributionMethod.EMAIL:
          distributionResult = await this.sendReportByEmail(
            report,
            recipientEmail!,
            distribution.id
          )
          break

        case DistributionMethod.DOWNLOAD:
          distributionResult = await this.generateDownloadLink(
            report,
            distribution.id
          )
          break

        case DistributionMethod.PRINT:
          // 打印方式只记录分发记录，实际打印由前端处理
          distributionResult = {
            message: '打印分发记录已创建',
            distributionId: distribution.id
          }
          await prisma.distribution.update({
            where: { id: distribution.id },
            data: {
              status: DistributionStatus.SENT,
              sentAt: new Date()
            }
          })
          break

        default:
          throw new Error(`不支持的分发方式: ${method}`)
      }

      // 5. 更新报告状态为已分发
      await prisma.report.update({
        where: { id: reportId },
        data: { status: ReportStatus.DISTRIBUTED }
      })

      logger.info('报告分发成功', {
        reportId,
        distributionId: distribution.id,
        method,
        recipient,
        userId
      })

      return {
        distribution,
        ...distributionResult
      }
    } catch (error: any) {
      logger.error('报告分发失败', {
        error: error.message,
        data,
        userId
      })
      throw new Error(`报告分发失败: ${error.message}`)
    }
  }

  /**
   * 通过邮件发送报告
   * 验证需求: 16.3
   */
  private async sendReportByEmail(
    report: any,
    recipientEmail: string,
    distributionId: string
  ): Promise<any> {
    try {
      // TODO: 集成实际的邮件服务（如 SendGrid, AWS SES 等）
      // 这里使用模拟实现
      logger.info('发送报告邮件', {
        reportId: report.id,
        reportNumber: report.reportNumber,
        recipientEmail,
        distributionId
      })

      // 模拟邮件发送
      const emailSent = true // 实际应该调用邮件服务

      if (emailSent) {
        // 更新分发记录状态
        await prisma.distribution.update({
          where: { id: distributionId },
          data: {
            status: DistributionStatus.SENT,
            sentAt: new Date()
          }
        })

        return {
          message: '报告已通过邮件发送',
          email: recipientEmail
        }
      } else {
        // 更新为失败状态
        await prisma.distribution.update({
          where: { id: distributionId },
          data: {
            status: DistributionStatus.FAILED
          }
        })

        throw new Error('邮件发送失败')
      }
    } catch (error: any) {
      logger.error('邮件发送失败', {
        error: error.message,
        reportId: report.id,
        recipientEmail
      })
      throw error
    }
  }

  /**
   * 生成下载链接
   * 验证需求: 16.3
   */
  private async generateDownloadLink(
    report: any,
    distributionId: string
  ): Promise<any> {
    try {
      // 生成临时下载令牌（有效期24小时）
      const token = this.generateDownloadToken(report.id)
      const downloadUrl = `/api/reports/${report.id}/download?token=${token}`

      // 更新分发记录状态
      await prisma.distribution.update({
        where: { id: distributionId },
        data: {
          status: DistributionStatus.SENT,
          sentAt: new Date()
        }
      })

      logger.info('下载链接已生成', {
        reportId: report.id,
        distributionId,
        downloadUrl
      })

      return {
        message: '下载链接已生成',
        downloadUrl,
        token,
        expiresIn: 86400 // 24小时（秒）
      }
    } catch (error: any) {
      logger.error('生成下载链接失败', {
        error: error.message,
        reportId: report.id
      })
      throw error
    }
  }

  /**
   * 生成下载令牌
   * 简单实现：实际应该使用 JWT 或其他安全令牌机制
   */
  private generateDownloadToken(reportId: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
    return Buffer.from(`${reportId}:${timestamp}:${random}`).toString('base64')
  }

  /**
   * 回收报告
   * 验证需求: 16.4
   */
  async recallReport(data: RecallReportDto, userId: string): Promise<any> {
    try {
      const { reportId, reason } = data

      // 1. 检查报告是否存在
      const report = await prisma.report.findUnique({
        where: { id: reportId },
        include: {
          distributions: true
        }
      })

      if (!report) {
        throw new Error('报告不存在')
      }

      // 2. 检查报告状态
      if (report.status === ReportStatus.RECALLED) {
        throw new Error('报告已经被回收')
      }

      if (
        report.status !== ReportStatus.DISTRIBUTED &&
        report.status !== ReportStatus.SIGNED
      ) {
        throw new Error('只能回收已签名或已分发的报告')
      }

      // 3. 更新报告状态为已回收
      const updatedReport = await prisma.report.update({
        where: { id: reportId },
        data: {
          status: ReportStatus.RECALLED,
          recalledAt: new Date(),
          recallReason: reason
        }
      })

      logger.info('报告已回收', {
        reportId,
        reason,
        recalledBy: userId,
        previousStatus: report.status
      })

      return {
        report: updatedReport,
        message: '报告已成功回收'
      }
    } catch (error: any) {
      logger.error('报告回收失败', {
        error: error.message,
        data,
        userId
      })
      throw new Error(`报告回收失败: ${error.message}`)
    }
  }

  /**
   * 获取分发历史
   * 验证需求: 16.5
   */
  async getDistributionHistory(query: DistributionQuery): Promise<any> {
    try {
      const {
        reportId,
        method,
        status,
        startDate,
        endDate,
        page = 1,
        pageSize = 20
      } = query
      const skip = (page - 1) * pageSize

      // 构建查询条件
      const where: any = {}

      if (reportId) {
        where.reportId = reportId
      }

      if (method) {
        where.method = method
      }

      if (status) {
        where.status = status
      }

      if (startDate || endDate) {
        where.sentAt = {}
        if (startDate) {
          where.sentAt.gte = startDate
        }
        if (endDate) {
          where.sentAt.lte = endDate
        }
      }

      // 查询总数和数据
      const [total, items] = await Promise.all([
        prisma.distribution.count({ where }),
        prisma.distribution.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { sentAt: 'desc' },
          include: {
            report: {
              select: {
                reportNumber: true,
                sampleId: true,
                status: true
              }
            }
          }
        })
      ])

      return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    } catch (error: any) {
      logger.error('获取分发历史失败', { error: error.message, query })
      throw error
    }
  }

  /**
   * 获取报告的分发记录
   * 验证需求: 16.5
   */
  async getReportDistributions(reportId: string): Promise<any> {
    try {
      const distributions = await prisma.distribution.findMany({
        where: { reportId },
        orderBy: { sentAt: 'desc' }
      })

      return distributions
    } catch (error: any) {
      logger.error('获取报告分发记录失败', {
        error: error.message,
        reportId
      })
      throw error
    }
  }

  /**
   * 更新分发状态
   * 用于外部系统回调更新分发状态（如邮件送达确认）
   */
  async updateDistributionStatus(
    distributionId: string,
    status: DistributionStatus,
    receivedAt?: Date
  ): Promise<any> {
    try {
      const distribution = await prisma.distribution.update({
        where: { id: distributionId },
        data: {
          status,
          receivedAt: receivedAt || (status === DistributionStatus.RECEIVED ? new Date() : undefined)
        }
      })

      logger.info('分发状态已更新', {
        distributionId,
        status,
        receivedAt
      })

      return distribution
    } catch (error: any) {
      logger.error('更新分发状态失败', {
        error: error.message,
        distributionId,
        status
      })
      throw error
    }
  }
}

export default new ReportService()
