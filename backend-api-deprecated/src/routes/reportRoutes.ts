/**
 * 报告管理路由
 */

import { Router } from 'express'
import reportController from '../controllers/reportController'
import signatureController from '../controllers/signatureController'
import { authenticate } from '../middleware/authMiddleware'
import { requirePermission } from '../middleware/permissionMiddleware'

const router = Router()

// 所有路由都需要认证
router.use(authenticate)

/**
 * @swagger
 * /api/reports:
 *   post:
 *     summary: 生成报告
 *     description: 根据样品数据和报告模板生成检测报告，分配唯一报告编号
 *     tags: [报告管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sampleId
 *               - templateId
 *             properties:
 *               sampleId:
 *                 type: string
 *                 format: uuid
 *                 description: 样品 ID
 *               templateId:
 *                 type: string
 *                 format: uuid
 *                 description: 报告模板 ID
 *               preview:
 *                 type: boolean
 *                 description: 是否为预览模式（预览模式不创建正式报告）
 *                 default: false
 *     responses:
 *       201:
 *         description: 报告生成成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 报告生成成功
 *                 data:
 *                   $ref: '#/components/schemas/Report'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/',
  requirePermission('report', 'create'),
  reportController.generateReport.bind(reportController)
)

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: 查询报告列表
 *     description: 分页查询报告列表，支持多条件过滤
 *     tags: [报告管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/PageSizeParam'
 *       - name: reportNumber
 *         in: query
 *         description: 报告编号
 *         schema:
 *           type: string
 *       - name: sampleId
 *         in: query
 *         description: 样品 ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: status
 *         in: query
 *         description: 报告状态
 *         schema:
 *           type: string
 *           enum: [DRAFT, PENDING_SIGNATURE, SIGNED, DISTRIBUTED, RECALLED]
 *     responses:
 *       200:
 *         description: 查询成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/',
  requirePermission('report', 'read'),
  reportController.listReports.bind(reportController)
)

/**
 * @swagger
 * /api/reports/{id}/preview:
 *   get:
 *     summary: 预览报告
 *     description: 获取报告的 HTML 内容用于预览
 *     tags: [报告管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: 报告 ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 预览成功
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *               description: 报告 HTML 内容
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/:id/preview',
  requirePermission('report', 'read'),
  reportController.previewReport.bind(reportController)
)

/**
 * @swagger
 * /api/reports/{id}:
 *   get:
 *     summary: 获取报告详情
 *     description: 获取指定报告的详细信息
 *     tags: [报告管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: 报告 ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 查询成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 查询成功
 *                 data:
 *                   $ref: '#/components/schemas/Report'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/:id',
  requirePermission('report', 'read'),
  reportController.getReport.bind(reportController)
)

/**
 * @swagger
 * /api/reports/{id}/sign:
 *   post:
 *     summary: 签名报告
 *     description: 对报告进行电子签名，验证签名人身份和权限
 *     tags: [报告管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: 报告 ID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - signerRole
 *               - password
 *             properties:
 *               signerRole:
 *                 type: string
 *                 description: 签名角色
 *                 example: 审核人
 *               password:
 *                 type: string
 *                 format: password
 *                 description: 签名密码（用于身份验证）
 *               comments:
 *                 type: string
 *                 description: 签名意见
 *     responses:
 *       200:
 *         description: 签名成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 签名成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     reportId:
 *                       type: string
 *                       format: uuid
 *                     signerName:
 *                       type: string
 *                     signerRole:
 *                       type: string
 *                     signedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/:id/sign',
  requirePermission('report', 'sign'),
  signatureController.signReport
)

/**
 * @swagger
 * /api/reports/{id}/distribute:
 *   post:
 *     summary: 分发报告
 *     description: 通过邮件或其他方式分发报告给客户
 *     tags: [报告管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: 报告 ID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - method
 *               - recipient
 *             properties:
 *               method:
 *                 type: string
 *                 enum: [EMAIL, DOWNLOAD, PRINT]
 *                 description: 分发方式
 *               recipient:
 *                 type: string
 *                 description: 接收人
 *                 example: 张三
 *               recipientEmail:
 *                 type: string
 *                 format: email
 *                 description: 接收人邮箱（邮件分发时必填）
 *     responses:
 *       200:
 *         description: 分发成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 报告分发成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     reportId:
 *                       type: string
 *                       format: uuid
 *                     method:
 *                       type: string
 *                     recipient:
 *                       type: string
 *                     status:
 *                       type: string
 *                     sentAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/:id/distribute',
  requirePermission('report', 'distribute'),
  reportController.distributeReport.bind(reportController)
)

/**
 * @swagger
 * /api/reports/{id}/recall:
 *   post:
 *     summary: 回收报告
 *     description: 回收已分发的报告，更新报告状态并记录回收原因
 *     tags: [报告管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: 报告 ID
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: 回收原因
 *                 example: 数据错误，需要重新出具报告
 *     responses:
 *       200:
 *         description: 回收成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 报告回收成功
 *                 data:
 *                   $ref: '#/components/schemas/Report'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/:id/recall',
  requirePermission('report', 'update'),
  reportController.recallReport.bind(reportController)
)

/**
 * @route GET /api/reports/:id/distributions
 * @desc 获取报告的分发记录
 * @access Private (需要 report:read 权限)
 */
router.get(
  '/:id/distributions',
  requirePermission('report', 'read'),
  reportController.getReportDistributions.bind(reportController)
)

/**
 * @route PUT /api/reports/:id/status
 * @desc 更新报告状态
 * @access Private (需要 report:update 权限)
 */
router.put(
  '/:id/status',
  requirePermission('report', 'update'),
  reportController.updateReportStatus.bind(reportController)
)

/**
 * @route DELETE /api/reports/:id
 * @desc 删除报告
 * @access Private (需要 report:delete 权限)
 */
router.delete(
  '/:id',
  requirePermission('report', 'delete'),
  reportController.deleteReport.bind(reportController)
)

export default router
