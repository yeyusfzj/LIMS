import { Router } from 'express'
import authRoutes from './authRoutes'
import permissionRoutes from './permissionRoutes'
import roleRoutes from './roleRoutes'
import userRoutes from './userRoutes'
import sampleRoutes from './sampleRoutes'
import workflowRoutes from './workflowRoutes'
import taskRoutes from './taskRoutes'
import resultRoutes from './resultRoutes'
import formulaRoutes from './formulaRoutes'
import auditRoutes from './auditRoutes'
import judgmentRoutes from './judgmentRoutes'
import reportTemplateRoutes from './reportTemplateRoutes'
import reportRoutes from './reportRoutes'
import statisticsRoutes from './statisticsRoutes'
import auditLogRoutes from './auditLogRoutes'
import backupRoutes from './backupRoutes'
import queueRoutes from './queueRoutes'
import performanceRoutes from './performanceRoutes'
import methodRoutes from './methodRoutes'
// import instrumentRoutes from './instrumentRoutes'
import documentRoutes from './documentRoutes'
import instrumentStatisticsRoutes from './instrumentStatisticsRoutes'

const router = Router()

// 认证路由
router.use('/auth', authRoutes)

// 权限管理路由
router.use('/permissions', permissionRoutes)

// 角色管理路由
router.use('/roles', roleRoutes)

// 用户管理路由
router.use('/users', userRoutes)

// 样品管理路由
router.use('/samples', sampleRoutes)

// 工作流管理路由
router.use('/workflows', workflowRoutes)

// 任务管理路由
router.use('/tasks', taskRoutes)

// 检测结果路由
router.use('/results', resultRoutes)

// 公式管理路由
router.use('/formulas', formulaRoutes)

// 审核管理路由
router.use('/audits', auditRoutes)

// 质量判定路由
router.use('/', judgmentRoutes)

// 报告模板管理路由
router.use('/report-templates', reportTemplateRoutes)

// 报告管理路由
router.use('/reports', reportRoutes)

// 统计分析路由
router.use('/statistics', statisticsRoutes)

// 审计日志路由
router.use('/audit-logs', auditLogRoutes)

// 数据备份路由
router.use('/backups', backupRoutes)

// 队列管理路由
router.use('/queue', queueRoutes)

// 性能监控路由
router.use('/performance', performanceRoutes)

// 检测方法路由
router.use('/methods', methodRoutes)

// 仪器管理路由
// router.use('/instruments', instrumentRoutes)

// 文档管理路由
router.use('/documents', documentRoutes)

// 仪器统计路由
router.use('/instrument-statistics', instrumentStatisticsRoutes)

// 其他路由将在后续任务中添加

export default router
