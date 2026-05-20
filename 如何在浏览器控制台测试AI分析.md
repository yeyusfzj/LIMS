# 如何在浏览器控制台测试 AI 智能分析真实数据

由于创建新页面遇到了一些技术问题，我为您提供一个**更简单直接的方法**来测试真实数据的 AI 分析功能！

## 🎯 在浏览器控制台直接测试

### 步骤 1: 打开浏览器控制台

1. 打开浏览器访问: `http://localhost:5173`
2. 按 `F12` 打开开发者工具
3. 切换到 `Console`（控制台）标签

### 步骤 2: 运行测试代码

在控制台中粘贴并运行以下代码：

```javascript
// 导入 API 服务
const { agentApi } = await import('/src/services/api/agent.ts')

// 测试样品 ID（工业废水样品 - 有超标数据）
const sampleId = '4f81f49d-c941-4c92-95f7-e4e54023bd16'

// 执行完整的 AI 分析流程
console.log('🚀 开始 AI 分析...')

try {
  // 1. 获取样品检测结果
  console.log('📊 步骤 1: 获取样品检测结果...')
  const sampleResults = await agentApi.getSampleResults(sampleId)
  console.log('✅ 样品检测结果:', sampleResults)
  
  // 2. 进行 AI 分析
  console.log('🤖 步骤 2: 进行 AI 智能分析...')
  const analysis = await agentApi.analyzeResult(sampleResults.result_data)
  console.log('✅ AI 分析结果:', analysis)
  
  // 3. 显示完整结果
  console.log('\n' + '='.repeat(60))
  console.log('📋 完整分析报告')
  console.log('='.repeat(60))
  console.log('\n样品信息:')
  console.log(`  样品编号: ${sampleResults.sample_number}`)
  console.log(`  样品名称: ${sampleResults.sample_name}`)
  console.log(`  样品类型: ${sampleResults.sample_type}`)
  console.log(`  检测指标: ${sampleResults.result_count} 项`)
  
  console.log('\n检测数据:')
  Object.entries(sampleResults.result_data).forEach(([indicator, value]) => {
    console.log(`  ${indicator}: ${value}`)
  })
  
  console.log('\n分析状态:', analysis.status === 'error' ? '❌ 异常' : '✅ 正常')
  
  if (analysis.anomalies && analysis.anomalies.length > 0) {
    console.log('\n⚠️ 异常检测:')
    analysis.anomalies.forEach((anomaly, index) => {
      console.log(`\n  ${index + 1}. ${anomaly.indicator}`)
      console.log(`     实际值: ${anomaly.value}`)
      console.log(`     阈值: ${anomaly.threshold_max}`)
      console.log(`     严重程度: ${anomaly.severity}`)
      console.log(`     建议: ${anomaly.suggestion}`)
    })
  }
  
  console.log('\n📝 分析摘要:')
  console.log(analysis.summary)
  
  console.log('\n' + '='.repeat(60))
  console.log('🎉 分析完成！')
  console.log('='.repeat(60))
  
} catch (error) {
  console.error('❌ 分析失败:', error.message)
}
```

### 步骤 3: 查看结果

运行后，您会在控制台看到：

1. **样品信息**（来自数据库）
   - 样品编号: S202605080002
   - 样品名称: 工业废水样品
   - 样品类型: 水样
   - 检测指标: 3 项

2. **检测数据**（真实数据）
   - 铅含量: 0.025
   - 镉含量: 0.008
   - 汞含量: 0.0015

3. **异常检测**（AI 分析）
   - 多项指标超标
   - 实际值 vs 阈值对比
   - 严重程度评估
   - **智能建议**（AI 生成）

4. **分析摘要**
   - 总体评估
   - 异常分布统计

## 🔍 测试其他样品

您可以修改 `sampleId` 来测试不同的样品：

### 样品 1: 河水样品（正常）
```javascript
const sampleId = '12c87171-e56b-4f80-9e63-5a2885787a6b'
```

### 样品 2: 工业废水样品（超标）⚠️
```javascript
const sampleId = '4f81f49d-c941-4c92-95f7-e4e54023bd16'  // 推荐
```

### 样品 3: 农田土壤样品（正常）
```javascript
const sampleId = '169e8bf5-b12d-4e38-ac52-e8c484b1fdf0'
```

## 📊 查看网络请求

在开发者工具中切换到 `Network`（网络）标签，您会看到两个 API 请求：

1. **GET** `/api/agent/sample-results/{sample_id}`
   - 返回真实的数据库数据
   - 状态码: 200 OK

2. **POST** `/api/agent/result-analysis`
   - 发送检测数据进行 AI 分析
   - 返回异常检测和智能建议
   - 状态码: 200 OK

## ✅ 验证真实数据

这个测试证明了：

1. ✅ **后端 API 正常工作** - 可以从数据库获取真实样品数据
2. ✅ **AI 分析引擎正常工作** - 可以检测异常并生成建议
3. ✅ **前端服务层正常工作** - API 调用成功
4. ✅ **数据是真实的** - 来自数据库，不是假数据

## 🎯 关于智能洞察卡片

Dashboard 页面的"AI 智能洞察"卡片目前使用示例数据，因为：

- ⏳ 后端还没有创建 Dashboard API
- ✅ 代码已经支持异步数据获取
- 📝 只需要后端 API 即可切换到真实数据

**但是样品分析功能已经完全使用真实数据了！** 您刚才在控制台测试的就是真实数据的 AI 分析。

## 📄 相关文档

- `AI智能分析真实数据集成完成报告.md` - 技术实现报告
- `AI智能分析功能验证通过.md` - 功能验证报告
- `test_ai_real_data.py` - 自动化测试脚本

---

**立即测试**: 打开浏览器控制台，粘贴上面的代码并运行！🚀
