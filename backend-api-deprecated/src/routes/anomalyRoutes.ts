/**
 * 异常检测路由
 */

import { Router } from 'express'
import {
  createAnomalyRule,
  getAnomalyRule,
  listAnomalyRules,
  updateAnomalyRule,
  deleteAnomalyRule,
  markResultAbnormal,
  requestRetest,
  detectResultAnomaly
} from '../controllers/anomalyController'

const router = Router()

// 异常检测规则管理
router.post('/anomaly-rules', createAnomalyRule)
router.get('/anomaly-rules', listAnomalyRules)
router.get('/anomaly-rules/:id', getAnomalyRule)
router.put('/anomaly-rules/:id', updateAnomalyRule)
router.delete('/anomaly-rules/:id', deleteAnomalyRule)

// 结果异常标记和复测
router.post('/results/:id/mark-abnormal', markResultAbnormal)
router.post('/results/:id/retest', requestRetest)
router.post('/results/:id/detect-anomaly', detectResultAnomaly)

export default router
