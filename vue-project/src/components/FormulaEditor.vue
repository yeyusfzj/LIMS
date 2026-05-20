<template>
  <div class="formula-editor">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>公式编辑器</span>
          <el-button type="primary" size="small" @click="handleSave">保存公式</el-button>
        </div>
      </template>

      <!-- 公式输入区域 -->
      <el-form :model="formulaForm" label-width="100px">
        <el-form-item label="公式名称">
          <el-input v-model="formulaForm.name" placeholder="请输入公式名称" />
        </el-form-item>

        <el-form-item label="公式表达式">
          <el-input
            v-model="formulaForm.expression"
            type="textarea"
            :rows="3"
            placeholder="例如: (a + b) * c / 2"
            @input="handleExpressionChange"
          />
          <div class="formula-hint">
            <el-text size="small" type="info">
              支持的运算符: +, -, *, /, ^(幂), sqrt(平方根), log(对数), abs(绝对值)
            </el-text>
          </div>
        </el-form-item>

        <el-form-item label="结果单位">
          <el-input v-model="formulaForm.resultUnit" placeholder="例如: mg/L, %, ppm" />
        </el-form-item>

        <!-- 变量选择和配置 -->
        <el-form-item label="变量配置">
          <div class="variables-section">
            <el-button type="primary" size="small" @click="handleAddVariable">
              <el-icon><Plus /></el-icon>
              添加变量
            </el-button>

            <el-table :data="formulaForm.variables" style="margin-top: 10px" border>
              <el-table-column prop="name" label="变量名" width="120">
                <template #default="{ row }">
                  <el-input v-model="row.name" size="small" placeholder="如: a, b, x" />
                </template>
              </el-table-column>

              <el-table-column prop="source" label="数据来源" width="150">
                <template #default="{ row }">
                  <el-select v-model="row.source" size="small" placeholder="选择来源">
                    <el-option label="输入值" value="input" />
                    <el-option label="检测结果" value="result" />
                    <el-option label="常量" value="constant" />
                  </el-select>
                </template>
              </el-table-column>

              <el-table-column prop="value" label="值/测试值" width="150">
                <template #default="{ row }">
                  <el-input-number
                    v-model="row.value"
                    size="small"
                    :controls="false"
                    placeholder="输入数值"
                    style="width: 100%"
                    @change="handleVariableChange"
                  />
                </template>
              </el-table-column>

              <el-table-column prop="description" label="说明">
                <template #default="{ row }">
                  <el-input
                    v-model="row.description"
                    size="small"
                    placeholder="变量说明"
                  />
                </template>
              </el-table-column>

              <el-table-column label="操作" width="80" fixed="right">
                <template #default="{ $index }">
                  <el-button
                    type="danger"
                    size="small"
                    link
                    @click="handleRemoveVariable($index)"
                  >
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-form-item>

        <!-- 公式验证 -->
        <el-form-item label="公式验证">
          <div class="validation-section">
            <el-button type="success" @click="handleValidate">
              <el-icon><Check /></el-icon>
              验证公式
            </el-button>

            <div v-if="validationResult" class="validation-result" :class="validationResult.valid ? 'valid' : 'invalid'">
              <el-icon v-if="validationResult.valid"><CircleCheck /></el-icon>
              <el-icon v-else><CircleClose /></el-icon>
              <span>{{ validationResult.message }}</span>
            </div>
          </div>
        </el-form-item>

        <!-- 计算预览 -->
        <el-form-item label="计算预览">
          <div class="preview-section">
            <el-button type="primary" @click="handlePreviewCalculation" :disabled="!canPreview">
              <el-icon><View /></el-icon>
              预览计算
            </el-button>

            <div v-if="previewResult" class="preview-result">
              <el-descriptions :column="1" border>
                <el-descriptions-item label="公式">
                  {{ formulaForm.expression }}
                </el-descriptions-item>
                <el-descriptions-item label="变量值">
                  <el-tag
                    v-for="variable in formulaForm.variables"
                    :key="variable.name"
                    style="margin-right: 8px"
                  >
                    {{ variable.name }} = {{ variable.value }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="计算结果">
                  <el-text type="success" size="large" style="font-weight: bold">
                    {{ previewResult.result }}
                    <span v-if="formulaForm.resultUnit">{{ formulaForm.resultUnit }}</span>
                  </el-text>
                </el-descriptions-item>
                <el-descriptions-item label="计算步骤" v-if="previewResult.steps">
                  <div v-for="(step, index) in previewResult.steps" :key="index">
                    {{ index + 1 }}. {{ step }}
                  </div>
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </div>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Check, CircleCheck, CircleClose, View } from '@element-plus/icons-vue'
import type { Formula, Variable } from '@/types'

interface FormulaForm {
  id?: string
  name: string
  expression: string
  variables: VariableWithDescription[]
  resultUnit?: string
}

interface VariableWithDescription extends Variable {
  description?: string
}

interface ValidationResult {
  valid: boolean
  message: string
}

interface PreviewResult {
  result: number
  steps?: string[]
}

const props = defineProps<{
  formula?: Formula
  mode?: 'create' | 'edit'
}>()

const emit = defineEmits<{
  save: [formula: Formula]
  cancel: []
}>()

// 表单数据
const formulaForm = ref<FormulaForm>({
  name: props.formula?.id || '',
  expression: props.formula?.expression || '',
  variables: props.formula?.variables.map(v => ({ ...v, description: '' })) || [],
  resultUnit: props.formula?.resultUnit || ''
})

// 验证结果
const validationResult = ref<ValidationResult | null>(null)

// 预览结果
const previewResult = ref<PreviewResult | null>(null)

// 是否可以预览
const canPreview = computed(() => {
  return (
    formulaForm.value.expression.trim() !== '' &&
    formulaForm.value.variables.length > 0 &&
    formulaForm.value.variables.every(v => v.name && v.value !== undefined)
  )
})

// 添加变量
const handleAddVariable = () => {
  formulaForm.value.variables.push({
    name: '',
    value: 0,
    source: 'input',
    description: ''
  })
}

// 删除变量
const handleRemoveVariable = (index: number) => {
  formulaForm.value.variables.splice(index, 1)
  // 清除预览结果
  previewResult.value = null
}

// 表达式变化时清除验证和预览结果
const handleExpressionChange = () => {
  validationResult.value = null
  previewResult.value = null
}

// 变量值变化时清除预览结果
const handleVariableChange = () => {
  previewResult.value = null
}

// 验证公式
const handleValidate = () => {
  const expression = formulaForm.value.expression.trim()
  
  if (!expression) {
    validationResult.value = {
      valid: false,
      message: '公式表达式不能为空'
    }
    return
  }

  // 检查变量是否都已定义
  const variableNames = formulaForm.value.variables.map(v => v.name)
  const usedVariables = extractVariablesFromExpression(expression)
  
  const undefinedVariables = usedVariables.filter(v => !variableNames.includes(v))
  
  if (undefinedVariables.length > 0) {
    validationResult.value = {
      valid: false,
      message: `公式中使用了未定义的变量: ${undefinedVariables.join(', ')}`
    }
    return
  }

  // 检查表达式语法
  try {
    // 简单的语法检查
    const testExpression = expression
      .replace(/sqrt\(/g, 'Math.sqrt(')
      .replace(/log\(/g, 'Math.log(')
      .replace(/abs\(/g, 'Math.abs(')
      .replace(/\^/g, '**')
    
    // 用测试值替换变量
    let testExpr = testExpression
    formulaForm.value.variables.forEach(v => {
      const regex = new RegExp(`\\b${v.name}\\b`, 'g')
      testExpr = testExpr.replace(regex, '1')
    })
    
    // 尝试计算
    // eslint-disable-next-line no-new-func
    new Function(`return ${testExpr}`)()
    
    validationResult.value = {
      valid: true,
      message: '公式验证通过'
    }
    
    ElMessage.success('公式验证通过')
  } catch (error) {
    validationResult.value = {
      valid: false,
      message: `公式语法错误: ${error instanceof Error ? error.message : '未知错误'}`
    }
    ElMessage.error('公式语法错误')
  }
}

// 从表达式中提取变量名
const extractVariablesFromExpression = (expression: string): string[] => {
  // 移除函数名和运算符，提取可能的变量名
  const cleaned = expression
    .replace(/sqrt|log|abs/g, '')
    .replace(/[+\-*/()^,\s]/g, ' ')
  
  const tokens = cleaned.split(' ').filter(t => t.trim() !== '')
  
  // 过滤出变量名（非数字）
  const variables = tokens.filter(t => isNaN(Number(t)))
  
  // 去重
  return [...new Set(variables)]
}

// 预览计算
const handlePreviewCalculation = () => {
  if (!canPreview.value) {
    ElMessage.warning('请先完成公式和变量配置')
    return
  }

  try {
    const expression = formulaForm.value.expression
      .replace(/sqrt\(/g, 'Math.sqrt(')
      .replace(/log\(/g, 'Math.log(')
      .replace(/abs\(/g, 'Math.abs(')
      .replace(/\^/g, '**')
    
    // 替换变量
    let calculationExpr = expression
    const steps: string[] = []
    
    // 记录变量替换步骤
    formulaForm.value.variables.forEach(v => {
      const regex = new RegExp(`\\b${v.name}\\b`, 'g')
      calculationExpr = calculationExpr.replace(regex, String(v.value))
      steps.push(`${v.name} = ${v.value}`)
    })
    
    steps.push(`计算: ${calculationExpr}`)
    
    // 计算结果
    // eslint-disable-next-line no-new-func
    const result = new Function(`return ${calculationExpr}`)()
    
    // 保留4位小数
    const roundedResult = Math.round(result * 10000) / 10000
    
    previewResult.value = {
      result: roundedResult,
      steps
    }
    
    ElMessage.success('计算完成')
  } catch (error) {
    ElMessage.error(`计算失败: ${error instanceof Error ? error.message : '未知错误'}`)
    previewResult.value = null
  }
}

// 保存公式
const handleSave = () => {
  // 验证必填项
  if (!formulaForm.value.name.trim()) {
    ElMessage.warning('请输入公式名称')
    return
  }

  if (!formulaForm.value.expression.trim()) {
    ElMessage.warning('请输入公式表达式')
    return
  }

  if (formulaForm.value.variables.length === 0) {
    ElMessage.warning('请至少添加一个变量')
    return
  }

  // 检查变量名是否都已填写
  const emptyVariables = formulaForm.value.variables.filter(v => !v.name.trim())
  if (emptyVariables.length > 0) {
    ElMessage.warning('请填写所有变量的名称')
    return
  }

  // 构建 Formula 对象
  const formula: Formula = {
    id: formulaForm.value.name,
    expression: formulaForm.value.expression,
    variables: formulaForm.value.variables.map(v => ({
      name: v.name,
      value: v.value,
      source: v.source
    })),
    resultUnit: formulaForm.value.resultUnit
  }

  emit('save', formula)
  ElMessage.success('公式保存成功')
}
</script>

<style scoped>
.formula-editor {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.formula-hint {
  margin-top: 8px;
}

.variables-section {
  width: 100%;
}

.validation-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.validation-result {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
}

.validation-result.valid {
  background-color: #f0f9ff;
  color: #67c23a;
}

.validation-result.invalid {
  background-color: #fef0f0;
  color: #f56c6c;
}

.preview-section {
  width: 100%;
}

.preview-result {
  margin-top: 16px;
}
</style>
