/**
 * 报告服务
 * 提供报告生成、查询、分发等功能
 */

import http from './http'

export interface GenerateReportDto {
  sampleId: string
  templateId: string
  preview?: boolean
}

export interface ReportQuery {
  sampleId?: string
  status?: string
  startDate?: string
  endDate?: string
  search?: string
  page?: number
  pageSize?: number
}

export interface DistributeReportDto {
  reportId: string
  method: 'email' | 'download' | 'print'
  recipient: string
  recipientEmail?: string
}

export interface RecallReportDto {
  reportId: string
  reason: string
}

/**
 * 生成报告
 */
export async function generateReport(data: GenerateReportDto) {
  try {
    // 临时使用Mock数据 (后端API未实现)
    console.warn('⚠️ 使用Mock数据生成报告 (后端/api/v1/reports API未实现)')
    
    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 返回Mock数据
    return {
      id: `mock-report-${Date.now()}`,
      reportId: `mock-report-${Date.now()}`,
      reportNumber: `RPT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
      content: generateMockReportContent(data.sampleId, data.templateId),
      status: 'draft',
      generatedAt: new Date().toISOString()
    }
    
    // 生产环境调用真实API (当后端实现后启用)
    // const response = await http.post('/reports/generate', data)
    // return response
  } catch (error) {
    console.error('生成报告失败:', error)
    throw error
  }
}

/**
 * 生成Mock报告内容
 */
function generateMockReportContent(sampleId: string, templateId: string): string {
  const now = new Date()
  const reportDate = now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  
  return `
    <div style="padding: 40px; font-family: 'Microsoft YaHei', Arial, sans-serif; line-height: 1.8;">
      <h1 style="text-align: center; color: #303133; margin-bottom: 30px; font-size: 28px;">检测报告</h1>
      
      <div style="text-align: right; color: #909399; margin-bottom: 30px;">
        <p>报告日期: ${reportDate}</p>
      </div>
      
      <h2 style="color: #606266; border-bottom: 2px solid #409eff; padding-bottom: 8px; margin-top: 30px;">样品信息</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <th style="border: 1px solid #dcdfe6; padding: 12px; background-color: #f5f7fa; text-align: left; width: 30%;">样品ID</th>
          <td style="border: 1px solid #dcdfe6; padding: 12px;">${sampleId}</td>
        </tr>
        <tr>
          <th style="border: 1px solid #dcdfe6; padding: 12px; background-color: #f5f7fa; text-align: left;">模板ID</th>
          <td style="border: 1px solid #dcdfe6; padding: 12px;">${templateId}</td>
        </tr>
        <tr>
          <th style="border: 1px solid #dcdfe6; padding: 12px; background-color: #f5f7fa; text-align: left;">样品名称</th>
          <td style="border: 1px solid #dcdfe6; padding: 12px;">测试样品</td>
        </tr>
        <tr>
          <th style="border: 1px solid #dcdfe6; padding: 12px; background-color: #f5f7fa; text-align: left;">样品类型</th>
          <td style="border: 1px solid #dcdfe6; padding: 12px;">水质样品</td>
        </tr>
        <tr>
          <th style="border: 1px solid #dcdfe6; padding: 12px; background-color: #f5f7fa; text-align: left;">委托单位</th>
          <td style="border: 1px solid #dcdfe6; padding: 12px;">某某检测公司</td>
        </tr>
      </table>
      
      <h2 style="color: #606266; border-bottom: 2px solid #409eff; padding-bottom: 8px; margin-top: 30px;">检测结果</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr>
            <th style="border: 1px solid #dcdfe6; padding: 12px; background-color: #f5f7fa; text-align: left;">检测项目</th>
            <th style="border: 1px solid #dcdfe6; padding: 12px; background-color: #f5f7fa; text-align: center;">检测结果</th>
            <th style="border: 1px solid #dcdfe6; padding: 12px; background-color: #f5f7fa; text-align: center;">单位</th>
            <th style="border: 1px solid #dcdfe6; padding: 12px; background-color: #f5f7fa; text-align: center;">标准限值</th>
            <th style="border: 1px solid #dcdfe6; padding: 12px; background-color: #f5f7fa; text-align: center;">判定</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #dcdfe6; padding: 12px;">pH值</td>
            <td style="border: 1px solid #dcdfe6; padding: 12px; text-align: center;">7.2</td>
            <td style="border: 1px solid #dcdfe6; padding: 12px; text-align: center;">-</td>
            <td style="border: 1px solid #dcdfe6; padding: 12px; text-align: center;">6.5-8.5</td>
            <td style="border: 1px solid #dcdfe6; padding: 12px; text-align: center; color: #67c23a;">合格</td>
          </tr>
          <tr>
            <td style="border: 1px solid #dcdfe6; padding: 12px;">浊度</td>
            <td style="border: 1px solid #dcdfe6; padding: 12px; text-align: center;">0.8</td>
            <td style="border: 1px solid #dcdfe6; padding: 12px; text-align: center;">NTU</td>
            <td style="border: 1px solid #dcdfe6; padding: 12px; text-align: center;">≤1</td>
            <td style="border: 1px solid #dcdfe6; padding: 12px; text-align: center; color: #67c23a;">合格</td>
          </tr>
          <tr>
            <td style="border: 1px solid #dcdfe6; padding: 12px;">总硬度</td>
            <td style="border: 1px solid #dcdfe6; padding: 12px; text-align: center;">180</td>
            <td style="border: 1px solid #dcdfe6; padding: 12px; text-align: center;">mg/L</td>
            <td style="border: 1px solid #dcdfe6; padding: 12px; text-align: center;">≤450</td>
            <td style="border: 1px solid #dcdfe6; padding: 12px; text-align: center; color: #67c23a;">合格</td>
          </tr>
          <tr>
            <td style="border: 1px solid #dcdfe6; padding: 12px;">溶解性总固体</td>
            <td style="border: 1px solid #dcdfe6; padding: 12px; text-align: center;">320</td>
            <td style="border: 1px solid #dcdfe6; padding: 12px; text-align: center;">mg/L</td>
            <td style="border: 1px solid #dcdfe6; padding: 12px; text-align: center;">≤1000</td>
            <td style="border: 1px solid #dcdfe6; padding: 12px; text-align: center; color: #67c23a;">合格</td>
          </tr>
        </tbody>
      </table>
      
      <h2 style="color: #606266; border-bottom: 2px solid #409eff; padding-bottom: 8px; margin-top: 30px;">检测结论</h2>
      <p style="margin: 20px 0; padding: 15px; background-color: #f0f9ff; border-left: 4px solid #409eff;">
        根据检测结果,该样品各项指标均符合相关标准要求,<strong style="color: #67c23a;">判定为合格</strong>。
      </p>
      
      <h2 style="color: #606266; border-bottom: 2px solid #409eff; padding-bottom: 8px; margin-top: 30px;">检测依据</h2>
      <p style="margin: 10px 0;">
        GB 5749-2022 《生活饮用水卫生标准》
      </p>
      
      <div style="margin-top: 60px; display: flex; justify-content: space-between;">
        <div style="text-align: center;">
          <p style="margin-bottom: 40px;">_________________</p>
          <p>检测人员</p>
        </div>
        <div style="text-align: center;">
          <p style="margin-bottom: 40px;">_________________</p>
          <p>审核人员</p>
        </div>
        <div style="text-align: center;">
          <p style="margin-bottom: 40px;">_________________</p>
          <p>批准人员</p>
        </div>
      </div>
      
      <div style="margin-top: 60px; padding: 20px; background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 4px;">
        <p style="margin: 0; color: #856404; font-size: 14px;">
          <strong>⚠️ 开发提示:</strong> 这是使用Mock数据生成的测试报告,仅用于开发和演示。
          实际报告内容将在后端 <code>/api/v1/reports</code> API实现后自动生成。
        </p>
      </div>
    </div>
  `
}

/**
 * 预览报告
 */
export async function previewReport(sampleId: string, templateId: string) {
  try {
    const response = await http.post('/reports/generate', {
      sampleId,
      templateId,
      preview: true
    })
    return response
  } catch (error) {
    console.error('预览报告失败:', error)
    throw error
  }
}

/**
 * 获取报告详情
 */
export async function getReport(id: string) {
  try {
    const response = await http.get(`/reports/${id}`)
    return response
  } catch (error) {
    console.error('获取报告详情失败:', error)
    throw error
  }
}

/**
 * 查询报告列表
 */
export async function listReports(query: ReportQuery) {
  try {
    const response = await http.get('/reports', { params: query })
    return response
  } catch (error) {
    console.error('查询报告列表失败:', error)
    throw error
  }
}

/**
 * 更新报告状态
 */
export async function updateReportStatus(id: string, status: string) {
  try {
    const response = await http.put(`/reports/${id}/status`, { status })
    return response
  } catch (error) {
    console.error('更新报告状态失败:', error)
    throw error
  }
}

/**
 * 删除报告
 */
export async function deleteReport(id: string) {
  try {
    await http.delete(`/reports/${id}`)
  } catch (error) {
    console.error('删除报告失败:', error)
    throw error
  }
}

/**
 * 分发报告
 */
export async function distributeReport(id: string, data: Omit<DistributeReportDto, 'reportId'>) {
  try {
    const response = await http.post(`/reports/${id}/distribute`, data)
    return response
  } catch (error) {
    console.error('分发报告失败:', error)
    throw error
  }
}

/**
 * 回收报告
 */
export async function recallReport(id: string, reason: string) {
  try {
    const response = await http.post(`/reports/${id}/recall`, { reason })
    return response
  } catch (error) {
    console.error('回收报告失败:', error)
    throw error
  }
}

/**
 * 获取报告的分发记录
 */
export async function getReportDistributions(id: string) {
  try {
    const response = await http.get(`/reports/${id}/distributions`)
    return response
  } catch (error) {
    console.error('获取报告分发记录失败:', error)
    throw error
  }
}

/**
 * 获取分发历史
 */
export async function getDistributionHistory(query: any) {
  try {
    const response = await http.get('/reports/distributions', { params: query })
    return response
  } catch (error) {
    console.error('获取分发历史失败:', error)
    throw error
  }
}

export default {
  generateReport,
  previewReport,
  getReport,
  listReports,
  updateReportStatus,
  deleteReport,
  distributeReport,
  recallReport,
  getReportDistributions,
  getDistributionHistory
}
