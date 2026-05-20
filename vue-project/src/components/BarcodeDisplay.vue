<template>
  <div class="barcode-display">
    <el-card shadow="hover">
      <div class="barcode-container">
        <!-- 条码图片区域 -->
        <div class="barcode-image">
          <svg
            ref="barcodeRef"
            class="barcode-svg"
          ></svg>
        </div>

        <!-- 条码文本 -->
        <div class="barcode-text">
          {{ barcode }}
        </div>

        <!-- 操作按钮 -->
        <div class="barcode-actions">
          <el-button
            type="primary"
            :icon="Printer"
            @click="handlePrint"
          >
            打印条码
          </el-button>
          <el-button
            :icon="Download"
            @click="handleDownload"
          >
            下载条码
          </el-button>
          <el-button
            :icon="CopyDocument"
            @click="handleCopy"
          >
            复制条码
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Printer, Download, CopyDocument } from '@element-plus/icons-vue'

interface Props {
  barcode: string
  width?: number
  height?: number
  format?: 'CODE128' | 'CODE39' | 'EAN13'
  displayValue?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  width: 2,
  height: 100,
  format: 'CODE128',
  displayValue: true
})

const barcodeRef = ref<SVGElement>()

// 生成条码 SVG（简化版本，实际项目中应使用 JsBarcode 库）
const generateBarcodeSVG = () => {
  if (!barcodeRef.value) return

  const svg = barcodeRef.value
  const barcodeValue = props.barcode
  const width = props.width
  const height = props.height

  // 清空现有内容
  svg.innerHTML = ''

  // 设置 SVG 尺寸
  const totalWidth = barcodeValue.length * 10 * width
  svg.setAttribute('width', totalWidth.toString())
  svg.setAttribute('height', height.toString())
  svg.setAttribute('viewBox', `0 0 ${totalWidth} ${height}`)

  // 生成简单的条码图案（模拟）
  // 实际项目中应使用 JsBarcode 库来生成标准条码
  let x = 0
  for (let i = 0; i < barcodeValue.length; i++) {
    const charCode = barcodeValue.charCodeAt(i)
    const isBar = charCode % 2 === 0

    if (isBar) {
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.setAttribute('x', x.toString())
      rect.setAttribute('y', '0')
      rect.setAttribute('width', (width * 5).toString())
      rect.setAttribute('height', height.toString())
      rect.setAttribute('fill', '#000000')
      svg.appendChild(rect)
    }

    x += width * 10
  }

  // 添加文本（如果需要）
  if (props.displayValue) {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    text.setAttribute('x', (totalWidth / 2).toString())
    text.setAttribute('y', (height - 5).toString())
    text.setAttribute('text-anchor', 'middle')
    text.setAttribute('font-size', '14')
    text.setAttribute('font-family', 'monospace')
    text.textContent = barcodeValue
    svg.appendChild(text)
  }
}

// 打印条码
const handlePrint = () => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    ElMessage.error('无法打开打印窗口，请检查浏览器设置')
    return
  }

  const svgContent = barcodeRef.value?.outerHTML || ''

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>打印条码 - ${props.barcode}</title>
        <style>
          body {
            margin: 0;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .barcode-container {
            text-align: center;
          }
          .barcode-text {
            margin-top: 10px;
            font-size: 16px;
            font-weight: bold;
            font-family: monospace;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="barcode-container">
          ${svgContent}
          <div class="barcode-text">${props.barcode}</div>
        </div>
        <script type="text/javascript">
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        <\/script>
      </body>
    </html>
  `)

  printWindow.document.close()
  ElMessage.success('正在准备打印...')
}

// 下载条码
const handleDownload = () => {
  if (!barcodeRef.value) return

  try {
    // 创建 canvas
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const svgData = new XMLSerializer().serializeToString(barcodeRef.value)
    const img = new Image()
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)

      // 下载
      canvas.toBlob((blob) => {
        if (!blob) return
        const link = document.createElement('a')
        link.download = `barcode_${props.barcode}.png`
        link.href = URL.createObjectURL(blob)
        link.click()
        URL.revokeObjectURL(link.href)
        ElMessage.success('条码下载成功')
      })

      URL.revokeObjectURL(url)
    }

    img.src = url
  } catch (error) {
    console.error('下载失败:', error)
    ElMessage.error('条码下载失败')
  }
}

// 复制条码
const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(props.barcode)
    ElMessage.success('条码已复制到剪贴板')
  } catch (error) {
    // 降级方案
    const textarea = document.createElement('textarea')
    textarea.value = props.barcode
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    
    try {
      document.execCommand('copy')
      ElMessage.success('条码已复制到剪贴板')
    } catch (err) {
      ElMessage.error('复制失败，请手动复制')
    }
    
    document.body.removeChild(textarea)
  }
}

// 监听条码变化，重新生成
watch(() => props.barcode, () => {
  generateBarcodeSVG()
})

// 组件挂载时生成条码
onMounted(() => {
  generateBarcodeSVG()
})
</script>

<style scoped>
.barcode-display {
  width: 100%;
}

.barcode-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.barcode-image {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  background-color: #ffffff;
  border: 2px dashed #dcdfe6;
  border-radius: 4px;
  margin-bottom: 20px;
}

.barcode-svg {
  max-width: 100%;
  height: auto;
}

.barcode-text {
  font-size: 18px;
  font-weight: 600;
  font-family: 'Courier New', monospace;
  color: #303133;
  margin-bottom: 20px;
  letter-spacing: 2px;
}

.barcode-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

:deep(.el-card__body) {
  padding: 0;
}

@media print {
  .barcode-actions {
    display: none;
  }
}
</style>
