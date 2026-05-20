// 样品路由

import { Router } from 'express'
import sampleController from '../controllers/sampleController'
import enhancedSampleController from '../controllers/enhancedSampleController'
import { auditController } from '../controllers/auditController'
import { getResultsBySample } from '../controllers/resultController'
import { authenticate } from '../middleware/authMiddleware'
import { requirePermission } from '../middleware/permissionMiddleware'
import { validateRequest } from '../middleware/validateRequest'
import {
  createSampleSchema,
  updateSampleSchema,
  querySampleSchema,
  uuidSchema,
  transferSampleSchema,
  confirmTransferSchema,
  splitSampleSchema,
  mergeSamplesSchema,
  queryTransferSchema
} from '../validators/sampleValidator'

const router = Router()

// 所有样品路由都需要认证
router.use(authenticate)

/**
 * @swagger
 * /api/samples:
 *   post:
 *     summary: 创建样品
 *     description: 创建新的样品记录，系统自动生成唯一条码和样品编号
 *     tags: [样品管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSampleRequest'
 *     responses:
 *       201:
 *         description: 样品创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 样品创建成功
 *                 data:
 *                   $ref: '#/components/schemas/Sample'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post(
  '/',
  requirePermission('sample', 'create'),
  validateRequest(createSampleSchema, 'body'),
  sampleController.createSample
)

/**
 * @swagger
 * /api/samples:
 *   get:
 *     summary: 查询样品列表
 *     description: 分页查询样品列表，支持多条件过滤、字段选择和排序
 *     tags: [样品管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/PageSizeParam'
 *       - name: fields
 *         in: query
 *         description: 需要返回的字段列表（逗号分隔），不指定则返回所有字段
 *         schema:
 *           type: string
 *           example: id,barcode,sampleName,status
 *       - name: sortBy
 *         in: query
 *         description: 排序字段
 *         schema:
 *           type: string
 *           default: createdAt
 *           example: createdAt
 *       - name: sortOrder
 *         in: query
 *         description: 排序方向
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - name: barcode
 *         in: query
 *         description: 样品条码（模糊匹配）
 *         schema:
 *           type: string
 *       - name: sampleNumber
 *         in: query
 *         description: 样品编号（模糊匹配）
 *         schema:
 *           type: string
 *       - name: clientName
 *         in: query
 *         description: 客户名称（模糊匹配）
 *         schema:
 *           type: string
 *       - name: sampleType
 *         in: query
 *         description: 样品类型
 *         schema:
 *           type: string
 *       - name: status
 *         in: query
 *         description: 样品状态
 *         schema:
 *           type: string
 *           enum: [REGISTERED, IN_TESTING, TESTING_COMPLETE, IN_AUDIT, AUDIT_COMPLETE, RELEASED, ARCHIVED]
 *       - name: priority
 *         in: query
 *         description: 优先级
 *         schema:
 *           type: string
 *           enum: [LOW, NORMAL, HIGH, URGENT]
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
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Sample'
 *                     total:
 *                       type: integer
 *                       description: 总记录数
 *                     page:
 *                       type: integer
 *                       description: 当前页码
 *                     pageSize:
 *                       type: integer
 *                       description: 每页记录数
 *                     totalPages:
 *                       type: integer
 *                       description: 总页数
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/',
  requirePermission('sample', 'read'),
  validateRequest(querySampleSchema, 'query'),
  enhancedSampleController.listSamplesOffset
)

/**
 * @route   GET /api/samples/cursor
 * @desc    查询样品列表（游标分页，支持字段选择）
 * @access  需要 sample:read 权限
 * @query   cursor, limit, fields, sortBy, sortOrder, barcode, sampleNumber, clientName, status, priority
 */
router.get(
  '/cursor',
  requirePermission('sample', 'read'),
  enhancedSampleController.listSamplesCursor
)

/**
 * @route   POST /api/samples/batch
 * @desc    批量获取样品（支持字段选择）
 * @access  需要 sample:read 权限
 * @body    { ids: string[], fields?: string }
 */
router.post(
  '/batch',
  requirePermission('sample', 'read'),
  enhancedSampleController.getSamplesByIds
)

/**
 * @route   GET /api/samples/transfers
 * @desc    查询流转记录列表（分页）
 * @access  需要 sample:read 权限
 */
router.get(
  '/transfers',
  requirePermission('sample', 'read'),
  validateRequest(queryTransferSchema, 'query'),
  sampleController.listTransfers
)

/**
 * @route   GET /api/samples/transfers/:transferId
 * @desc    获取流转记录详情
 * @access  需要 sample:read 权限
 */
router.get(
  '/transfers/:transferId',
  requirePermission('sample', 'read'),
  sampleController.getTransfer
)

/**
 * @route   POST /api/samples/transfers/:transferId/confirm
 * @desc    确认流转
 * @access  需要 sample:update 权限
 */
router.post(
  '/transfers/:transferId/confirm',
  requirePermission('sample', 'update'),
  validateRequest(confirmTransferSchema, 'body'),
  sampleController.confirmTransfer
)

/**
 * @route   PUT /api/samples/transfers/:transferId/cancel
 * @desc    取消流转
 * @access  需要 sample:update 权限
 */
router.put(
  '/transfers/:transferId/cancel',
  requirePermission('sample', 'update'),
  sampleController.cancelTransfer
)

/**
 * @swagger
 * /api/samples/{id}:
 *   get:
 *     summary: 获取样品详情
 *     description: 获取指定样品的详细信息，支持字段选择
 *     tags: [样品管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: 样品 ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: fields
 *         in: query
 *         description: 需要返回的字段列表（逗号分隔），不指定则返回所有字段
 *         schema:
 *           type: string
 *           example: id,barcode,sampleName,status,createdAt
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
 *                   $ref: '#/components/schemas/Sample'
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
  requirePermission('sample', 'read'),
  validateRequest(uuidSchema, 'params', 'id'),
  enhancedSampleController.getSampleWithFields
)

/**
 * @route   GET /api/samples/barcode/:barcode
 * @desc    通过条码获取样品
 * @access  需要 sample:read 权限
 */
router.get(
  '/barcode/:barcode',
  requirePermission('sample', 'read'),
  sampleController.getSampleByBarcode
)

/**
 * @route   PUT /api/samples/:id
 * @desc    更新样品
 * @access  需要 sample:update 权限
 */
router.put(
  '/:id',
  requirePermission('sample', 'update'),
  validateRequest(uuidSchema, 'params', 'id'),
  validateRequest(updateSampleSchema, 'body'),
  sampleController.updateSample
)

/**
 * @swagger
 * /api/samples/{id}:
 *   delete:
 *     summary: 删除样品
 *     description: 软删除样品（更新状态为ARCHIVED），会检查是否有关联数据
 *     tags: [样品管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: 样品 ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 样品删除成功
 *       400:
 *         description: 无法删除（有关联数据）
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: VALIDATION_ERROR
 *                     message:
 *                       type: string
 *                       example: 该样品已有检测结果,无法删除
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete(
  '/:id',
  requirePermission('sample', 'delete'),
  validateRequest(uuidSchema, 'params', 'id'),
  sampleController.deleteSample
)

/**
 * @route   POST /api/samples/batch-delete
 * @desc    批量删除样品
 * @access  需要 sample:delete 权限
 */
router.post(
  '/batch-delete',
  requirePermission('sample', 'delete'),
  sampleController.batchDeleteSamples
)

/**
 * @route   PATCH /api/samples/:id/status
 * @desc    更新样品状态
 * @access  需要 sample:update 权限
 */
router.patch(
  '/:id/status',
  requirePermission('sample', 'update'),
  validateRequest(uuidSchema, 'params', 'id'),
  sampleController.updateSampleStatus
)

/**
 * @swagger
 * /api/samples/{id}/transfer:
 *   post:
 *     summary: 样品流转
 *     description: 创建样品流转记录，更新样品当前位置，支持双方确认机制
 *     tags: [样品管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: 样品 ID
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
 *               - fromLocation
 *               - toLocation
 *               - fromPerson
 *               - toPerson
 *             properties:
 *               fromLocation:
 *                 type: string
 *                 description: 起始位置
 *                 example: 接收室
 *               toLocation:
 *                 type: string
 *                 description: 目标位置
 *                 example: 检测室-A
 *               fromPerson:
 *                 type: string
 *                 description: 交接人
 *                 example: 张三
 *               toPerson:
 *                 type: string
 *                 description: 接收人
 *                 example: 李四
 *               remarks:
 *                 type: string
 *                 description: 备注信息
 *     responses:
 *       201:
 *         description: 流转成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 样品流转成功
 *                 data:
 *                   $ref: '#/components/schemas/Transfer'
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
  '/:id/transfer',
  requirePermission('sample', 'update'),
  validateRequest(transferSampleSchema, 'body'),
  sampleController.transferSample
)

/**
 * @swagger
 * /api/samples/{id}/custody:
 *   get:
 *     summary: 获取样品监管链
 *     description: 获取样品完整的流转历史记录，按时间顺序排列
 *     tags: [样品管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: 样品 ID
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
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transfer'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get(
  '/:id/custody',
  requirePermission('sample', 'read'),
  validateRequest(uuidSchema, 'params', 'id'),
  sampleController.getChainOfCustody
)



/**
 * @swagger
 * /api/samples/{id}/split:
 *   post:
 *     summary: 分样操作
 *     description: 从母样品创建多个子样品，建立母子关联关系，操作在事务中执行
 *     tags: [样品管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: 母样品 ID
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
 *               - childSamples
 *             properties:
 *               childSamples:
 *                 type: array
 *                 description: 子样品信息列表
 *                 items:
 *                   type: object
 *                   required:
 *                     - sampleName
 *                     - quantity
 *                     - unit
 *                   properties:
 *                     sampleName:
 *                       type: string
 *                       description: 子样品名称
 *                       example: 水样-1
 *                     quantity:
 *                       type: number
 *                       description: 数量
 *                       example: 100
 *                     unit:
 *                       type: string
 *                       description: 单位
 *                       example: mL
 *                     storageLocation:
 *                       type: string
 *                       description: 存储位置
 *                     remarks:
 *                       type: string
 *                       description: 备注
 *     responses:
 *       201:
 *         description: 分样成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 分样成功
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Sample'
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
  '/:id/split',
  requirePermission('sample', 'create'),
  validateRequest(uuidSchema, 'params', 'id'),
  validateRequest(splitSampleSchema, 'body'),
  sampleController.splitSample
)

/**
 * @swagger
 * /api/samples/merge:
 *   post:
 *     summary: 合样操作
 *     description: 将多个样品合并为一个新样品，记录来源样品信息，操作在事务中执行
 *     tags: [样品管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sourceSampleIds
 *               - mergedSample
 *             properties:
 *               sourceSampleIds:
 *                 type: array
 *                 description: 来源样品 ID 列表
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 example: ["uuid1", "uuid2", "uuid3"]
 *               mergedSample:
 *                 type: object
 *                 description: 合并后的样品信息
 *                 required:
 *                   - sampleName
 *                   - quantity
 *                   - unit
 *                 properties:
 *                   sampleName:
 *                     type: string
 *                     description: 合并样品名称
 *                     example: 混合水样
 *                   quantity:
 *                     type: number
 *                     description: 数量
 *                     example: 500
 *                   unit:
 *                     type: string
 *                     description: 单位
 *                     example: mL
 *                   storageLocation:
 *                     type: string
 *                     description: 存储位置
 *                   remarks:
 *                     type: string
 *                     description: 备注
 *     responses:
 *       201:
 *         description: 合样成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 合样成功
 *                 data:
 *                   $ref: '#/components/schemas/Sample'
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
  '/merge',
  requirePermission('sample', 'create'),
  validateRequest(mergeSamplesSchema, 'body'),
  sampleController.mergeSamples
)

/**
 * @route   GET /api/samples/:sampleId/results
 * @desc    获取样品的所有检测结果
 * @access  需要 sample:read 权限
 */
router.get(
  '/:sampleId/results',
  requirePermission('sample', 'read'),
  validateRequest(uuidSchema, 'params', 'sampleId'),
  getResultsBySample
)

/**
 * @swagger
 * /api/samples/{id}/release:
 *   post:
 *     summary: 样品放行
 *     description: 验证样品放行条件（审核完成、判定合格等），更新样品状态为已放行
 *     tags: [样品管理]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: 样品 ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 放行成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 样品放行成功
 *                 data:
 *                   $ref: '#/components/schemas/Sample'
 *       400:
 *         description: 放行条件不满足
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: RELEASE_CONDITIONS_NOT_MET
 *                     message:
 *                       type: string
 *                       example: 样品放行条件不满足
 *                     details:
 *                       type: object
 *                       properties:
 *                         violations:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["审核未完成", "质量判定未通过"]
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
  '/:id/release',
  requirePermission('sample', 'release'),
  validateRequest(uuidSchema, 'params', 'id'),
  auditController.releaseSample.bind(auditController)
)

/**
 * @route   POST /api/samples/batch-release
 * @desc    批量样品放行
 * @access  需要 sample:release 权限
 */
router.post(
  '/batch-release',
  requirePermission('sample', 'release'),
  auditController.batchReleaseSamples.bind(auditController)
)

export default router
