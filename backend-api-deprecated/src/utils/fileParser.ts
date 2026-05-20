/**
 * 文件解析工具
 * 
 * 支持 CSV、Excel、XML 格式的文件解析
 * 验证需求：8.1, 8.2
 */

import { parse } from 'csv-parse/sync'
import * as XLSX from 'xlsx'
import { XMLParser } from 'fast-xml-parser'
import { ImportDataRow, FieldMapping } from '../types/result'
import { logger } from '../config/logger'

/**
 * 文件解析器类
 */
export class FileParser {
  /**
   * 解析 CSV 文件
   * 
   * @param buffer 文件缓冲区
   * @param mapping 字段映射
   * @returns 解析后的数据行数组
   */
  parseCSV(buffer: Buffer, mapping: FieldMapping): ImportDataRow[] {
    try {
      const content = buffer.toString('utf-8')
      
      // 解析 CSV
      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true // 处理 BOM
      })

      logger.info('CSV parsed', { recordCount: records.length })

      // 映射字段
      return this.mapFields(records, mapping)
    } catch (error) {
      logger.error('Failed to parse CSV', { error })
      throw new Error(`CSV 解析失败: ${error.message}`)
    }
  }

  /**
   * 解析 Excel 文件
   * 
   * @param buffer 文件缓冲区
   * @param mapping 字段映射
   * @returns 解析后的数据行数组
   */
  parseExcel(buffer: Buffer, mapping: FieldMapping): ImportDataRow[] {
    try {
      // 读取工作簿
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      
      // 获取第一个工作表
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      
      // 转换为 JSON
      const records = XLSX.utils.sheet_to_json(worksheet, {
        raw: false,
        defval: ''
      })

      logger.info('Excel parsed', { 
        sheetName, 
        recordCount: records.length 
      })

      // 映射字段
      return this.mapFields(records, mapping)
    } catch (error) {
      logger.error('Failed to parse Excel', { error })
      throw new Error(`Excel 解析失败: ${error.message}`)
    }
  }

  /**
   * 解析 XML 文件
   * 
   * @param buffer 文件缓冲区
   * @param mapping 字段映射
   * @returns 解析后的数据行数组
   */
  parseXML(buffer: Buffer, mapping: FieldMapping): ImportDataRow[] {
    try {
      const content = buffer.toString('utf-8')
      
      // 配置 XML 解析器
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        textNodeName: '#text',
        parseAttributeValue: true,
        parseTagValue: true
      })

      // 解析 XML
      const result = parser.parse(content)
      
      // 提取记录数组
      // 假设 XML 结构为: <root><record>...</record><record>...</record></root>
      let records: any[] = []
      
      if (result.root && result.root.record) {
        records = Array.isArray(result.root.record) 
          ? result.root.record 
          : [result.root.record]
      } else if (result.records && result.records.record) {
        records = Array.isArray(result.records.record)
          ? result.records.record
          : [result.records.record]
      } else if (result.data && result.data.item) {
        records = Array.isArray(result.data.item)
          ? result.data.item
          : [result.data.item]
      } else {
        // 尝试查找第一个数组类型的属性
        for (const key in result) {
          if (Array.isArray(result[key])) {
            records = result[key]
            break
          } else if (typeof result[key] === 'object') {
            for (const subKey in result[key]) {
              if (Array.isArray(result[key][subKey])) {
                records = result[key][subKey]
                break
              }
            }
          }
        }
      }

      logger.info('XML parsed', { recordCount: records.length })

      // 映射字段
      return this.mapFields(records, mapping)
    } catch (error) {
      logger.error('Failed to parse XML', { error })
      throw new Error(`XML 解析失败: ${error.message}`)
    }
  }

  /**
   * 根据文件扩展名解析文件
   * 
   * @param buffer 文件缓冲区
   * @param filename 文件名
   * @param mapping 字段映射
   * @returns 解析后的数据行数组
   */
  parseFile(
    buffer: Buffer, 
    filename: string, 
    mapping: FieldMapping
  ): ImportDataRow[] {
    const ext = filename.toLowerCase().split('.').pop()

    switch (ext) {
      case 'csv':
        return this.parseCSV(buffer, mapping)
      
      case 'xlsx':
      case 'xls':
        return this.parseExcel(buffer, mapping)
      
      case 'xml':
        return this.parseXML(buffer, mapping)
      
      default:
        throw new Error(`不支持的文件格式: ${ext}`)
    }
  }

  /**
   * 映射字段
   * 
   * @param records 原始记录数组
   * @param mapping 字段映射配置
   * @returns 映射后的数据行数组
   */
  private mapFields(
    records: any[], 
    mapping: FieldMapping
  ): ImportDataRow[] {
    return records.map((record, index) => {
      try {
        const row: ImportDataRow = {
          sampleId: this.getFieldValue(record, mapping.sampleId || 'sampleId'),
          testItemId: this.getFieldValue(record, mapping.testItemId || 'testItemId'),
          parameter: this.getFieldValue(record, mapping.parameter),
          method: this.getFieldValue(record, mapping.method)
        }

        // 可选字段
        if (mapping.value) {
          const valueStr = this.getFieldValue(record, mapping.value)
          if (valueStr) {
            const numValue = parseFloat(valueStr)
            if (!isNaN(numValue)) {
              row.value = numValue
            }
          }
        }

        if (mapping.textValue) {
          const textValue = this.getFieldValue(record, mapping.textValue)
          if (textValue) {
            row.textValue = textValue
          }
        }

        if (mapping.unit) {
          const unit = this.getFieldValue(record, mapping.unit)
          if (unit) {
            row.unit = unit
          }
        }

        if (mapping.instrumentId) {
          const instrumentId = this.getFieldValue(record, mapping.instrumentId)
          if (instrumentId) {
            row.instrumentId = instrumentId
          }
        }

        return row
      } catch (error) {
        logger.error('Failed to map record', { error, record, index })
        throw new Error(`第 ${index + 1} 行数据映射失败: ${error.message}`)
      }
    })
  }

  /**
   * 获取字段值
   * 
   * @param record 记录对象
   * @param fieldName 字段名（支持点号分隔的嵌套字段）
   * @returns 字段值
   */
  private getFieldValue(record: any, fieldName: string): string {
    if (!fieldName) {
      return ''
    }

    // 支持嵌套字段，如 "data.value"
    const parts = fieldName.split('.')
    let value = record

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part]
      } else {
        return ''
      }
    }

    return value ? String(value).trim() : ''
  }
}

export const fileParser = new FileParser()
