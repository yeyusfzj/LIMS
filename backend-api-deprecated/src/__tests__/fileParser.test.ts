/**
 * 文件解析器测试
 * 
 * 测试 CSV、Excel、XML 文件解析功能
 */

import { describe, it, expect } from 'vitest'
import { fileParser } from '../utils/fileParser'
import * as XLSX from 'xlsx'

describe('FileParser', () => {
  const mapping = {
    sampleId: 'sampleId',
    testItemId: 'testItemId',
    parameter: 'parameter',
    value: 'value',
    unit: 'unit',
    method: 'method'
  }

  describe('parseCSV', () => {
    it('应该正确解析 CSV 文件', () => {
      const csvContent = `sampleId,testItemId,parameter,value,unit,method
sample-1,test-1,pH,7.2,,GB/T 5750.4-2006
sample-2,test-2,浊度,0.5,NTU,GB/T 5750.4-2006`

      const buffer = Buffer.from(csvContent, 'utf-8')
      const result = fileParser.parseCSV(buffer, mapping)

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        sampleId: 'sample-1',
        testItemId: 'test-1',
        parameter: 'pH',
        value: 7.2,
        method: 'GB/T 5750.4-2006'
      })
      expect(result[1]).toMatchObject({
        sampleId: 'sample-2',
        testItemId: 'test-2',
        parameter: '浊度',
        value: 0.5,
        unit: 'NTU',
        method: 'GB/T 5750.4-2006'
      })
    })

    it('应该处理带 BOM 的 CSV 文件', () => {
      const csvContent = '\uFEFFsampleId,testItemId,parameter,value,method\nsample-1,test-1,pH,7.2,GB/T 5750.4-2006'
      const buffer = Buffer.from(csvContent, 'utf-8')
      
      const result = fileParser.parseCSV(buffer, mapping)

      expect(result).toHaveLength(1)
      expect(result[0].sampleId).toBe('sample-1')
    })

    it('应该跳过空行', () => {
      const csvContent = `sampleId,testItemId,parameter,value,method
sample-1,test-1,pH,7.2,GB/T 5750.4-2006

sample-2,test-2,浊度,0.5,GB/T 5750.4-2006`

      const buffer = Buffer.from(csvContent, 'utf-8')
      const result = fileParser.parseCSV(buffer, mapping)

      expect(result).toHaveLength(2)
    })

    it('应该处理 CSV 解析错误', () => {
      const invalidCSV = 'invalid,csv\ndata'
      const buffer = Buffer.from(invalidCSV, 'utf-8')

      expect(() => {
        fileParser.parseCSV(buffer, { parameter: 'nonexistent', method: 'method' })
      }).toThrow()
    })
  })

  describe('parseExcel', () => {
    it('应该正确解析 Excel 文件', () => {
      // 创建测试用的 Excel 数据
      const data = [
        {
          sampleId: 'sample-1',
          testItemId: 'test-1',
          parameter: 'pH',
          value: '7.2',
          unit: '',
          method: 'GB/T 5750.4-2006'
        },
        {
          sampleId: 'sample-2',
          testItemId: 'test-2',
          parameter: '浊度',
          value: '0.5',
          unit: 'NTU',
          method: 'GB/T 5750.4-2006'
        }
      ]

      // 创建工作簿
      const worksheet = XLSX.utils.json_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')

      // 转换为 buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

      const result = fileParser.parseExcel(buffer, mapping)

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        sampleId: 'sample-1',
        testItemId: 'test-1',
        parameter: 'pH',
        value: 7.2,
        method: 'GB/T 5750.4-2006'
      })
    })

    it('应该处理空的 Excel 文件', () => {
      const worksheet = XLSX.utils.json_to_sheet([])
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

      const result = fileParser.parseExcel(buffer, mapping)

      expect(result).toHaveLength(0)
    })
  })

  describe('parseXML', () => {
    it('应该正确解析 XML 文件（root.record 结构）', () => {
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <record>
    <sampleId>sample-1</sampleId>
    <testItemId>test-1</testItemId>
    <parameter>pH</parameter>
    <value>7.2</value>
    <unit></unit>
    <method>GB/T 5750.4-2006</method>
  </record>
  <record>
    <sampleId>sample-2</sampleId>
    <testItemId>test-2</testItemId>
    <parameter>浊度</parameter>
    <value>0.5</value>
    <unit>NTU</unit>
    <method>GB/T 5750.4-2006</method>
  </record>
</root>`

      const buffer = Buffer.from(xmlContent, 'utf-8')
      const result = fileParser.parseXML(buffer, mapping)

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        sampleId: 'sample-1',
        testItemId: 'test-1',
        parameter: 'pH',
        value: 7.2,
        method: 'GB/T 5750.4-2006'
      })
    })

    it('应该正确解析 XML 文件（records.record 结构）', () => {
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<records>
  <record>
    <sampleId>sample-1</sampleId>
    <testItemId>test-1</testItemId>
    <parameter>pH</parameter>
    <value>7.2</value>
    <method>GB/T 5750.4-2006</method>
  </record>
</records>`

      const buffer = Buffer.from(xmlContent, 'utf-8')
      const result = fileParser.parseXML(buffer, mapping)

      expect(result).toHaveLength(1)
      expect(result[0].sampleId).toBe('sample-1')
    })

    it('应该正确解析 XML 文件（data.item 结构）', () => {
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<data>
  <item>
    <sampleId>sample-1</sampleId>
    <testItemId>test-1</testItemId>
    <parameter>pH</parameter>
    <value>7.2</value>
    <method>GB/T 5750.4-2006</method>
  </item>
</data>`

      const buffer = Buffer.from(xmlContent, 'utf-8')
      const result = fileParser.parseXML(buffer, mapping)

      expect(result).toHaveLength(1)
      expect(result[0].sampleId).toBe('sample-1')
    })

    it('应该处理单个记录的 XML', () => {
      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <record>
    <sampleId>sample-1</sampleId>
    <testItemId>test-1</testItemId>
    <parameter>pH</parameter>
    <value>7.2</value>
    <method>GB/T 5750.4-2006</method>
  </record>
</root>`

      const buffer = Buffer.from(xmlContent, 'utf-8')
      const result = fileParser.parseXML(buffer, mapping)

      expect(result).toHaveLength(1)
    })
  })

  describe('parseFile', () => {
    it('应该根据文件扩展名选择正确的解析器', () => {
      const csvContent = 'sampleId,testItemId,parameter,value,method\nsample-1,test-1,pH,7.2,GB/T 5750.4-2006'
      const buffer = Buffer.from(csvContent, 'utf-8')

      const result = fileParser.parseFile(buffer, 'test.csv', mapping)

      expect(result).toHaveLength(1)
      expect(result[0].sampleId).toBe('sample-1')
    })

    it('应该处理不支持的文件格式', () => {
      const buffer = Buffer.from('test', 'utf-8')

      expect(() => {
        fileParser.parseFile(buffer, 'test.txt', mapping)
      }).toThrow('不支持的文件格式')
    })

    it('应该支持 .xlsx 扩展名', () => {
      const data = [{ sampleId: 'sample-1', testItemId: 'test-1', parameter: 'pH', value: '7.2', method: 'test' }]
      const worksheet = XLSX.utils.json_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

      const result = fileParser.parseFile(buffer, 'test.xlsx', mapping)

      expect(result).toHaveLength(1)
    })

    it('应该支持 .xls 扩展名', () => {
      const data = [{ sampleId: 'sample-1', testItemId: 'test-1', parameter: 'pH', value: '7.2', method: 'test' }]
      const worksheet = XLSX.utils.json_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

      const result = fileParser.parseFile(buffer, 'test.xls', mapping)

      expect(result).toHaveLength(1)
    })
  })

  describe('字段映射', () => {
    it('应该支持自定义字段映射', () => {
      const csvContent = 'sample_id,test_id,param,val,test_method\nsample-1,test-1,pH,7.2,GB/T 5750.4-2006'
      const buffer = Buffer.from(csvContent, 'utf-8')

      const customMapping = {
        sampleId: 'sample_id',
        testItemId: 'test_id',
        parameter: 'param',
        value: 'val',
        method: 'test_method'
      }

      const result = fileParser.parseCSV(buffer, customMapping)

      expect(result).toHaveLength(1)
      expect(result[0].sampleId).toBe('sample-1')
      expect(result[0].testItemId).toBe('test-1')
      expect(result[0].parameter).toBe('pH')
      expect(result[0].value).toBe(7.2)
    })

    it('应该处理缺失的字段', () => {
      const csvContent = 'sampleId,testItemId,parameter,method\nsample-1,test-1,pH,GB/T 5750.4-2006'
      const buffer = Buffer.from(csvContent, 'utf-8')

      const result = fileParser.parseCSV(buffer, mapping)

      expect(result).toHaveLength(1)
      expect(result[0].value).toBeUndefined()
      expect(result[0].unit).toBeUndefined()
    })

    it('应该正确转换数值类型', () => {
      const csvContent = 'sampleId,testItemId,parameter,value,method\nsample-1,test-1,pH,7.2,test'
      const buffer = Buffer.from(csvContent, 'utf-8')

      const result = fileParser.parseCSV(buffer, mapping)

      expect(result[0].value).toBe(7.2)
      expect(typeof result[0].value).toBe('number')
    })

    it('应该处理无效的数值', () => {
      const csvContent = 'sampleId,testItemId,parameter,value,method\nsample-1,test-1,pH,invalid,test'
      const buffer = Buffer.from(csvContent, 'utf-8')

      const result = fileParser.parseCSV(buffer, mapping)

      expect(result[0].value).toBeUndefined()
    })
  })
})
