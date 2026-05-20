import { PrismaClient } from '@prisma/client'
import { prisma } from '../config/database'
import logger from '../config/logger'
import * as XLSX from 'xlsx'
import path from 'path'
import fs from 'fs'
import { promisify } from 'util'

const writeFileAsync = promisify(fs.writeFile)
const mkdirAsync = promisify(fs.mkdir)

/**
 * 导出格式
 */
export type ExportFormat = 'excel' | 'csv'

/**
 * 导出选项
 */
export interface ExportOptions {
  format: ExportFormat
  filters?: any
  includeTransfers?: boolean
  includeMaintenance?: boolean
  includeCalibration?: boolean
}

/**
 * 导出结果
 */
export interface ExportResult {
  filePath: string
  fileName: string
  fileSize: number
}

/**
 * 仪器导出服务
 * 提供仪器数据导出功能(Excel和CSV格式)
 */
export class InstrumentExportService {
  private exportDir = path.join(process.cwd(), 'exports')

  constructor() {
    // 确保导出目录存在
    this.ensureExportDir()
  }

  /**
   * 确保导出目录存在
   */
  private async ensureExportDir(): Promise<void> {
    try {
      if (!fs.existsSync(this.exportDir)) {
        await mkdirAsync(this.exportDir, { recursive: true })
      }
    } catch (error) {
      logger.error('Failed to create export directory', { error })
    }
  }

  /**
   * 导出仪器列表
   */
  async exportInstruments(options: ExportOptions): Promise<ExportResult> {
    try {
      logger.info('Exporting instruments', { options })

      // 获取仪器数据
      const instruments = await this.fetchInstrumentsForExport(options.filters)

      // 根据格式导出
      if (options.format === 'excel') {
        return await this.exportToExcel(instruments, options)
      } else {
        return await this.exportToCSV(instruments)
      }
    } catch (error) {
      logger.error('Failed to export instruments', { error })
      throw error
    }
  }

  /**
   * 获取用于导出的仪器数据
   */
  private async fetchInstrumentsForExport(filters?: any): Promise<any[]> {
    const where: any = {}

    if (filters) {
      if (filters.status) {
        where.status = filters.status
      }
      if (filters.department) {
        where.currentDepartment = filters.department
      }
      if (filters.search) {
        where.OR = [
          { code: { contains: filters.search, mode: 'insensitive' } },
          { name: { contains: filters.search, mode: 'insensitive' } }
        ]
      }
    }

    const instruments = await prisma.instrument.findMany({
      where,
      include: {
        transfers: {
          orderBy: { createdAt: 'desc' }
        },
        maintenanceRecords: {
          orderBy: { maintenanceDate: 'desc' }
        },
        calibrationRecords: {
          orderBy: { calibrationDate: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return instruments
  }

  /**
   * 导出为Excel格式
   */
  private async exportToExcel(instruments: any[], options: ExportOptions): Promise<ExportResult> {
    // 创建工作簿
    const workbook = XLSX.utils.book_new()
    
    // 准备仪器列表数据
    const instrumentData = instruments.map(instrument => ({
      '仪器编码': instrument.code,
      '仪器名称': instrument.name,
      '型号': instrument.model || '',
      '制造商': instrument.manufacturer || '',
      '序列号': instrument.serialNumber || '',
      '购置日期': instrument.purchaseDate ? this.formatDate(instrument.purchaseDate) : '',
      '购置价格': instrument.purchasePrice || '',
      '状态': this.translateStatus(instrument.status),
      '当前位置': instrument.currentLocation || '',
      '当前部门': instrument.currentDepartment || '',
      '当前负责人': instrument.currentResponsible || '',
      '描述': instrument.description || '',
      '创建时间': this.formatDateTime(instrument.createdAt)
    }))

    // 创建仪器列表工作表
    const instrumentSheet = XLSX.utils.json_to_sheet(instrumentData)
    XLSX.utils.book_append_sheet(workbook, instrumentSheet, '仪器列表')

    // 如果需要导出流转记录
    if (options.includeTransfers) {
      const transferData: any[] = []
      instruments.forEach(instrument => {
        instrument.transfers.forEach((transfer: any) => {
          transferData.push({
            '仪器编码': instrument.code,
            '仪器名称': instrument.name,
            '源部门': transfer.fromDepartment,
            '目标部门': transfer.toDepartment,
            '源负责人': transfer.fromResponsible,
            '目标负责人': transfer.toResponsible,
            '流转原因': transfer.transferReason || '',
            '状态': this.translateTransferStatus(transfer.status),
            '创建时间': this.formatDateTime(transfer.createdAt)
          })
        })
      })
      if (transferData.length > 0) {
        const transferSheet = XLSX.utils.json_to_sheet(transferData)
        XLSX.utils.book_append_sheet(workbook, transferSheet, '流转记录')
      }
    }

    // 如果需要导出维护记录
    if (options.includeMaintenance) {
      const maintenanceData: any[] = []
      instruments.forEach(instrument => {
        instrument.maintenanceRecords.forEach((record: any) => {
          maintenanceData.push({
            '仪器编码': instrument.code,
            '仪器名称': instrument.name,
            '维护日期': this.formatDate(record.maintenanceDate),
            '维护类型': this.translateMaintenanceType(record.maintenanceType),
            '维护内容': record.maintenanceContent,
            '维护人员': record.maintenancePerson,
            '维护费用': record.maintenanceCost || '',
            '下次维护日期': record.nextMaintenanceDate ? this.formatDate(record.nextMaintenanceDate) : ''
          })
        })
      })
      if (maintenanceData.length > 0) {
        const maintenanceSheet = XLSX.utils.json_to_sheet(maintenanceData)
        XLSX.utils.book_append_sheet(workbook, maintenanceSheet, '维护记录')
      }
    }

    // 如果需要导出校准记录
    if (options.includeCalibration) {
      const calibrationData: any[] = []
      instruments.forEach(instrument => {
        instrument.calibrationRecords.forEach((record: any) => {
          calibrationData.push({
            '仪器编码': instrument.code,
            '仪器名称': instrument.name,
            '校准日期': this.formatDate(record.calibrationDate),
            '校准机构': record.calibrationOrg,
            '证书编号': record.certificateNumber || '',
            '校准结果': this.translateCalibrationResult(record.calibrationResult),
            '下次校准日期': record.nextCalibrationDate ? this.formatDate(record.nextCalibrationDate) : ''
          })
        })
      })
      if (calibrationData.length > 0) {
        const calibrationSheet = XLSX.utils.json_to_sheet(calibrationData)
        XLSX.utils.book_append_sheet(workbook, calibrationSheet, '校准记录')
      }
    }

    // 保存文件
    const fileName = `instruments_export_${Date.now()}.xlsx`
    const filePath = path.join(this.exportDir, fileName)
    
    XLSX.writeFile(workbook, filePath)

    const stats = fs.statSync(filePath)

    logger.info('Excel export completed', { fileName, fileSize: stats.size })

    return {
      filePath,
      fileName,
      fileSize: stats.size
    }
  }

  /**
   * 添加流转记录工作表
   */
  private addTransfersSheet(workbook: ExcelJS.Workbook, instruments: any[]): void {
    const sheet = workbook.addWorksheet('流转记录')
    
    sheet.columns = [
      { header: '仪器编码', key: 'instrumentCode', width: 15 },
      { header: '仪器名称', key: 'instrumentName', width: 20 },
      { header: '源部门', key: 'fromDepartment', width: 15 },
      { header: '目标部门', key: 'toDepartment', width: 15 },
      { header: '源负责人', key: 'fromResponsible', width: 12 },
      { header: '目标负责人', key: 'toResponsible', width: 12 },
      { header: '流转原因', key: 'transferReason', width: 30 },
      { header: '状态', key: 'status', width: 12 },
      { header: '创建时间', key: 'createdAt', width: 18 }
    ]

    sheet.getRow(1).font = { bold: true }
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    instruments.forEach(instrument => {
      instrument.transfers.forEach((transfer: any) => {
        sheet.addRow({
          instrumentCode: instrument.code,
          instrumentName: instrument.name,
          fromDepartment: transfer.fromDepartment,
          toDepartment: transfer.toDepartment,
          fromResponsible: transfer.fromResponsible,
          toResponsible: transfer.toResponsible,
          transferReason: transfer.transferReason || '',
          status: this.translateTransferStatus(transfer.status),
          createdAt: this.formatDateTime(transfer.createdAt)
        })
      })
    })
  }

  /**
   * 添加维护记录工作表
   */
  private addMaintenanceSheet(workbook: ExcelJS.Workbook, instruments: any[]): void {
    const sheet = workbook.addWorksheet('维护记录')
    
    sheet.columns = [
      { header: '仪器编码', key: 'instrumentCode', width: 15 },
      { header: '仪器名称', key: 'instrumentName', width: 20 },
      { header: '维护日期', key: 'maintenanceDate', width: 12 },
      { header: '维护类型', key: 'maintenanceType', width: 12 },
      { header: '维护内容', key: 'maintenanceContent', width: 30 },
      { header: '维护人员', key: 'maintenancePerson', width: 12 },
      { header: '维护费用', key: 'maintenanceCost', width: 12 },
      { header: '下次维护日期', key: 'nextMaintenanceDate', width: 12 }
    ]

    sheet.getRow(1).font = { bold: true }
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    instruments.forEach(instrument => {
      instrument.maintenanceRecords.forEach((record: any) => {
        sheet.addRow({
          instrumentCode: instrument.code,
          instrumentName: instrument.name,
          maintenanceDate: this.formatDate(record.maintenanceDate),
          maintenanceType: this.translateMaintenanceType(record.maintenanceType),
          maintenanceContent: record.maintenanceContent,
          maintenancePerson: record.maintenancePerson,
          maintenanceCost: record.maintenanceCost || '',
          nextMaintenanceDate: record.nextMaintenanceDate ? this.formatDate(record.nextMaintenanceDate) : ''
        })
      })
    })
  }

  /**
   * 添加校准记录工作表
   */
  private addCalibrationSheet(workbook: ExcelJS.Workbook, instruments: any[]): void {
    const sheet = workbook.addWorksheet('校准记录')
    
    sheet.columns = [
      { header: '仪器编码', key: 'instrumentCode', width: 15 },
      { header: '仪器名称', key: 'instrumentName', width: 20 },
      { header: '校准日期', key: 'calibrationDate', width: 12 },
      { header: '校准机构', key: 'calibrationOrg', width: 20 },
      { header: '证书编号', key: 'certificateNumber', width: 15 },
      { header: '校准结果', key: 'calibrationResult', width: 12 },
      { header: '下次校准日期', key: 'nextCalibrationDate', width: 12 }
    ]

    sheet.getRow(1).font = { bold: true }
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    }

    instruments.forEach(instrument => {
      instrument.calibrationRecords.forEach((record: any) => {
        sheet.addRow({
          instrumentCode: instrument.code,
          instrumentName: instrument.name,
          calibrationDate: this.formatDate(record.calibrationDate),
          calibrationOrg: record.calibrationOrg,
          certificateNumber: record.certificateNumber || '',
          calibrationResult: this.translateCalibrationResult(record.calibrationResult),
          nextCalibrationDate: record.nextCalibrationDate ? this.formatDate(record.nextCalibrationDate) : ''
        })
      })
    })
  }

  /**
   * 导出为CSV格式
   */
  private async exportToCSV(instruments: any[]): Promise<ExportResult> {
    // 准备数据
    const data = instruments.map(instrument => ({
      '仪器编码': instrument.code,
      '仪器名称': instrument.name,
      '型号': instrument.model || '',
      '制造商': instrument.manufacturer || '',
      '序列号': instrument.serialNumber || '',
      '购置日期': instrument.purchaseDate ? this.formatDate(instrument.purchaseDate) : '',
      '购置价格': instrument.purchasePrice || '',
      '状态': this.translateStatus(instrument.status),
      '当前位置': instrument.currentLocation || '',
      '当前部门': instrument.currentDepartment || '',
      '当前负责人': instrument.currentResponsible || '',
      '描述': instrument.description || '',
      '创建时间': this.formatDateTime(instrument.createdAt)
    }))

    // 转换为CSV
    const headers = [
      '仪器编码', '仪器名称', '型号', '制造商', '序列号',
      '购置日期', '购置价格', '状态', '当前位置', '当前部门',
      '当前负责人', '描述', '创建时间'
    ]
    
    const csvRows = [headers.join(',')]
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header as keyof typeof row]
        // 处理包含逗号或引号的值
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      })
      csvRows.push(values.join(','))
    })
    
    const csv = csvRows.join('\n')

    // 保存文件
    const fileName = `instruments_export_${Date.now()}.csv`
    const filePath = path.join(this.exportDir, fileName)
    
    // 添加BOM以支持Excel正确显示中文
    const bom = '\uFEFF'
    await writeFileAsync(filePath, bom + csv, 'utf8')

    const stats = fs.statSync(filePath)

    logger.info('CSV export completed', { fileName, fileSize: stats.size })

    return {
      filePath,
      fileName,
      fileSize: stats.size
    }
  }

  /**
   * 格式化日期
   */
  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('zh-CN')
  }

  /**
   * 格式化日期时间
   */
  private formatDateTime(date: Date): string {
    return new Date(date).toLocaleString('zh-CN')
  }

  /**
   * 翻译仪器状态
   */
  private translateStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'IN_USE': '在用',
      'STANDBY': '备用',
      'MAINTENANCE': '维修中',
      'CALIBRATING': '校准中',
      'PENDING_DISPOSAL': '待报废',
      'DISPOSED': '已报废'
    }
    return statusMap[status] || status
  }

  /**
   * 翻译流转状态
   */
  private translateTransferStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'PENDING': '待确认',
      'CONFIRMED': '已确认',
      'REJECTED': '已拒绝',
      'COMPLETED': '已完成'
    }
    return statusMap[status] || status
  }

  /**
   * 翻译维护类型
   */
  private translateMaintenanceType(type: string): string {
    const typeMap: { [key: string]: string } = {
      'ROUTINE': '例行保养',
      'REPAIR': '维修',
      'PARTS_REPLACEMENT': '部件更换',
      'CLEANING': '清洁',
      'OTHER': '其他'
    }
    return typeMap[type] || type
  }

  /**
   * 翻译校准结果
   */
  private translateCalibrationResult(result: string): string {
    const resultMap: { [key: string]: string } = {
      'QUALIFIED': '合格',
      'UNQUALIFIED': '不合格',
      'CONDITIONAL': '有条件合格'
    }
    return resultMap[result] || result
  }
}

export const instrumentExportService = new InstrumentExportService()
