/**
 * 公式路由
 * 
 * 定义公式相关的 API 端点
 */

import { Router } from 'express'
import {
  createFormula,
  getFormula,
  listFormulas,
  updateFormula,
  deleteFormula,
  calculateFormula
} from '../controllers/formulaController'
import {
  validateCreateFormula,
  validateUpdateFormula,
  validateCalculateFormula
} from '../validators/formulaValidator'
import { authenticate } from '../middleware/authMiddleware'

const router = Router()

// 所有公式路由都需要认证
router.use(authenticate)

/**
 * POST /api/formulas
 * 创建公式
 */
router.post('/', validateCreateFormula, createFormula)

/**
 * GET /api/formulas
 * 查询公式列表
 */
router.get('/', listFormulas)

/**
 * GET /api/formulas/:id
 * 获取公式详情
 */
router.get('/:id', getFormula)

/**
 * PUT /api/formulas/:id
 * 更新公式
 */
router.put('/:id', validateUpdateFormula, updateFormula)

/**
 * DELETE /api/formulas/:id
 * 删除公式
 */
router.delete('/:id', deleteFormula)

/**
 * POST /api/formulas/:id/calculate
 * 执行公式计算
 */
router.post('/:id/calculate', validateCalculateFormula, calculateFormula)

export default router
