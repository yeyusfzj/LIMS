/**
 * 检测结果路由
 */

import { Router } from 'express'
import {
  createResult,
  getResult,
  listResults,
  updateResult,
  deleteResult,
  getResultsBySample,
  importResults,
  calculateResult,
  requestRetest
} from '../controllers/resultController'
import { authenticate } from '../middleware/authMiddleware'
import { validateRequest } from '../middleware/validateRequest'
import { upload } from '../middleware/uploadMiddleware'
import {
  createResultSchema,
  updateResultSchema,
  resultQuerySchema
} from '../validators/resultValidator'

const router = Router()

// 所有路由都需要认证
router.use(authenticate)

/**
 * @swagger
 * /api/results:
 *   post:
 *     summary: 创建检测结果
 *     description: 录入单个检测结果，记录来源和时间戳
 *     tags: [检测结果]
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
 *               - testItemId
 *               - parameter
 *               - method
 *             properties:
 *               sampleId:
 *                 type: string
 *                 format: uuid
 *                 description: 样品 ID
 *               testItemId:
 *                 type: string
 *                 description: 检测项目 ID
 *               parameter:
 *                 type: string
 *                 description: 检测参数名称
 *                 example: pH值
 *               value:
 *                 type: number
 *                 format: float
 *                 description: 数值型结果
 *                 example: 7.2
 *               textValue:
 *                 type: string
 *                 description: 文本型结果
 *               unit:
 *                 type: string
 *                 description: 单位
 *                 example: pH
 *               method:
 *                 type: string
 *                 description: 检测方法
 *                 example: GB/T 5750.4-2006
 *               source:
 *                 type: string
 *                 enum: [MANUAL, INSTRUMENT, CALCULATED]
 *                 description: 结果来源
 *                 default: MANUAL
 *               instrumentId:
 *                 type: string
 *                 description: 仪器 ID（仪器导入时使用）
 *     responses:
 *       201:
 *         description: 结果创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 结果创建成功
 *                 data:
 *                   $ref: '#/components/schemas/Result'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/', authenticate, validateRequest(createResultSchema), createResult)

/**
 * @swagger
 * /api/results/import:
 *   post:
 *     summary: 批量导入检测结果
 *     description: 从文件（CSV、Excel、XML）批量导入检测结果，支持数据验证和错误报告
 *     tags: [检测结果]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: 结果数据文件（支持 CSV、Excel、XML 格式）
 *               sampleId:
 *                 type: string
 *                 format: uuid
 *                 description: 样品 ID（可选，如果文件中不包含）
 *     responses:
 *       200:
 *         description: 导入成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 导入成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: 总记录数
 *                       example: 100
 *                     success:
 *                       type: integer
 *                       description: 成功导入数
 *                       example: 95
 *                     failed:
 *                       type: integer
 *                       description: 失败数
 *                       example: 5
 *                     errors:
 *                       type: array
 *                       description: 错误详情
 *                       items:
 *                         type: object
 *                         properties:
 *                           row:
 *                             type: integer
 *                             description: 行号
 *                           error:
 *                             type: string
 *                             description: 错误信息
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/import', upload.single('file'), importResults)

/**
 * @swagger
 * /api/results:
 *   get:
 *     summary: 查询检测结果列表
 *     description: 分页查询检测结果，支持多条件过滤
 *     tags: [检测结果]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/PageSizeParam'
 *       - name: sampleId
 *         in: query
 *         description: 样品 ID
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: parameter
 *         in: query
 *         description: 检测参数名称
 *         schema:
 *           type: string
 *       - name: source
 *         in: query
 *         description: 结果来源
 *         schema:
 *           type: string
 *           enum: [MANUAL, INSTRUMENT, CALCULATED]
 *       - name: isAbnormal
 *         in: query
 *         description: 是否异常
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: 查询成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/', validateRequest(resultQuerySchema, 'query'), listResults)

/**
 * @swagger
 * /api/results/{id}:
 *   get:
 *     summary: 获取检测结果详情
 *     description: 获取指定检测结果的详细信息
 *     tags: [检测结果]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: 结果 ID
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
 *                   $ref: '#/components/schemas/Result'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/:id', getResult)

/**
 * @swagger
 * /api/results/{id}/calculate:
 *   post:
 *     summary: 执行公式计算
 *     description: 根据配置的公式自动计算衍生结果
 *     tags: [检测结果]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: 结果 ID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 计算成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 计算成功
 *                 data:
 *                   $ref: '#/components/schemas/Result'
 *       400:
 *         description: 计算失败
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
 *                       example: CALCULATION_FAILED
 *                     message:
 *                       type: string
 *                       example: 公式计算失败
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/:id/calculate', calculateResult)

/**
 * @swagger
 * /api/results/{id}/retest:
 *   post:
 *     summary: 申请复测
 *     description: 对异常结果申请复测，创建新的检测任务
 *     tags: [检测结果]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: 结果 ID
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
 *                 description: 复测原因
 *                 example: 结果异常，需要复测确认
 *     responses:
 *       201:
 *         description: 复测申请成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 复测申请成功
 *                 data:
 *                   type: object
 *                   properties:
 *                     taskId:
 *                       type: string
 *                       format: uuid
 *                       description: 新创建的检测任务 ID
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/:id/retest', requestRetest)

export default router
