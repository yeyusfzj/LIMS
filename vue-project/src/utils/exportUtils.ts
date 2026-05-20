/**
 * 导出工具类
 * 提供 Excel、PDF、图片等格式的导出功能
 * 注意：这是模拟实现，实际项目中需要使用相应的库
 */

import { ElMessage } from 'element-plus'

/**
 * 导出为 Excel
 * 实际项目中可使用 xlsx 或 exceljs 库
 */
export const exportToExcel = (data: any[], filename: string = 'export') => {
  try {
    ElMessage.info('正在准备 Excel 文件...')
    
    // 模拟导出过程
    setTimeout(() => {
      // 实际实现示例：
      // import * as XLSX from 'xlsx'
      // const ws = XLSX.utils.json_to_sheet(data)
      // const wb = XLSX.utils.book_new()
      // XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
      // XLSX.writeFile(wb, `${filename}.xlsx`)
      
      console.log('Exporting data:', data) // 用于调试
      ElMessage.success(`${filename}.xlsx 导出成功！`)
    }, 1000)
  } catch (error) {
    ElMessage.error('Excel 导出失败')
    console.error('Export to Excel error:', error)
  }
}

/**
 * 导出为 PDF
 * 实际项目中可使用 jspdf 或 pdfmake 库
 */
export const exportToPDF = (element: HTMLElement | null, filename: string = 'export') => {
  try {
    if (!element) {
      ElMessage.error('未找到要导出的内容')
      return
    }
    
    ElMessage.info('正在生成 PDF 文件...')
    
    // 模拟导出过程
    setTimeout(() => {
      // 实际实现示例：
      // import html2canvas from 'html2canvas'
      // import jsPDF from 'jspdf'
      // 
      // html2canvas(element).then(canvas => {
      //   const imgData = canvas.toDataURL('image/png')
      //   const pdf = new jsPDF()
      //   const imgWidth = 210
      //   const imgHeight = canvas.height * imgWidth / canvas.width
      //   pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
      //   pdf.save(`${filename}.pdf`)
      // })
      
      ElMessage.success(`${filename}.pdf 导出成功！`)
    }, 1500)
  } catch (error) {
    ElMessage.error('PDF 导出失败')
    console.error('Export to PDF error:', error)
  }
}

/**
 * 导出为图片
 * 实际项目中可使用 html2canvas 库
 */
export const exportToImage = (element: HTMLElement | null, filename: string = 'export') => {
  try {
    if (!element) {
      ElMessage.error('未找到要导出的内容')
      return
    }
    
    ElMessage.info('正在生成图片...')
    
    // 模拟导出过程
    setTimeout(() => {
      // 实际实现示例：
      // import html2canvas from 'html2canvas'
      // 
      // html2canvas(element).then(canvas => {
      //   const link = document.createElement('a')
      //   link.download = `${filename}.png`
      //   link.href = canvas.toDataURL()
      //   link.click()
      // })
      
      ElMessage.success(`${filename}.png 导出成功！`)
    }, 1000)
  } catch (error) {
    ElMessage.error('图片导出失败')
    console.error('Export to Image error:', error)
  }
}

/**
 * 导出图表为图片
 * 针对 ECharts 图表的导出
 */
export const exportChartAsImage = (chartInstance: any, filename: string = 'chart') => {
  try {
    if (!chartInstance) {
      ElMessage.error('图表实例不存在')
      return
    }
    
    ElMessage.info('正在导出图表...')
    
    // ECharts 提供了内置的导出功能
    const url = chartInstance.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#fff'
    })
    
    const link = document.createElement('a')
    link.download = `${filename}.png`
    link.href = url
    link.click()
    
    ElMessage.success('图表导出成功！')
  } catch (error) {
    ElMessage.error('图表导出失败')
    console.error('Export chart error:', error)
  }
}

/**
 * 下载文件
 */
export const downloadFile = (url: string, filename: string) => {
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
  } catch (error) {
    ElMessage.error('文件下载失败')
    console.error('Download file error:', error)
  }
}

/**
 * 将数据转换为 CSV 格式并下载
 */
export const exportToCSV = (data: any[], filename: string = 'export') => {
  try {
    if (!data || data.length === 0) {
      ElMessage.warning('没有数据可导出')
      return
    }
    
    // 获取表头
    const headers = Object.keys(data[0])
    
    // 构建 CSV 内容
    let csvContent = headers.join(',') + '\n'
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header]
        // 处理包含逗号的值
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value
      })
      csvContent += values.join(',') + '\n'
    })
    
    // 创建 Blob 并下载
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.csv`
    link.click()
    
    URL.revokeObjectURL(url)
    
    ElMessage.success('CSV 导出成功！')
  } catch (error) {
    ElMessage.error('CSV 导出失败')
    console.error('Export to CSV error:', error)
  }
}
