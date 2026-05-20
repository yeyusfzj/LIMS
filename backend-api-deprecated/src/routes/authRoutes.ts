import { Router } from 'express'
import { authController } from '../controllers/authController'
import { authenticate } from '../middleware/authMiddleware'
import { loginRateLimiter } from '../middleware/rateLimitMiddleware'

const router = Router()

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: 用户登录
 *     description: 使用用户名和密码进行身份认证，成功后返回访问令牌和刷新令牌
 *     tags: [认证]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: 用户名
 *                 example: admin
 *               password:
 *                 type: string
 *                 format: password
 *                 description: 密码
 *                 example: Admin@123
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: 访问令牌（有效期 15 分钟）
 *                     refreshToken:
 *                       type: string
 *                       description: 刷新令牌（有效期 7 天）
 *                     expiresIn:
 *                       type: integer
 *                       description: 访问令牌过期时间（秒）
 *                       example: 900
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         username:
 *                           type: string
 *                         email:
 *                           type: string
 *                         fullName:
 *                           type: string
 *                         roles:
 *                           type: array
 *                           items:
 *                             type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: 认证失败
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
 *                       example: AUTH_FAILED
 *                     message:
 *                       type: string
 *                       example: 用户名或密码错误
 *       429:
 *         description: 请求过于频繁
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
 *                       example: RATE_LIMIT_EXCEEDED
 *                     message:
 *                       type: string
 *                       example: 登录尝试次数过多，请稍后再试
 */
router.post('/login', loginRateLimiter, (req, res, next) => {
  authController.login(req, res, next)
})

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: 刷新访问令牌
 *     description: 使用刷新令牌获取新的访问令牌，延长会话时间
 *     tags: [认证]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: 刷新令牌
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: 令牌刷新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: 新的访问令牌
 *                     refreshToken:
 *                       type: string
 *                       description: 新的刷新令牌
 *                     expiresIn:
 *                       type: integer
 *                       description: 访问令牌过期时间（秒）
 *                       example: 900
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: 刷新令牌无效或已过期
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
 *                       example: TOKEN_REFRESH_FAILED
 *                     message:
 *                       type: string
 *                       example: 刷新令牌无效或已过期
 */
router.post('/refresh', (req, res, next) => {
  authController.refreshToken(req, res, next)
})

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: 用户登出
 *     description: 撤销当前访问令牌，用户需要重新登录
 *     tags: [认证]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 登出成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 登出成功
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/logout', authenticate, (req, res, next) => {
  authController.logout(req, res, next)
})

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: 获取当前用户信息
 *     description: 获取当前已认证用户的详细信息，包括角色和权限
 *     tags: [认证]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 查询成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       description: 用户 ID
 *                     username:
 *                       type: string
 *                       description: 用户名
 *                     email:
 *                       type: string
 *                       format: email
 *                       description: 邮箱
 *                     fullName:
 *                       type: string
 *                       description: 姓名
 *                     department:
 *                       type: string
 *                       description: 部门
 *                     position:
 *                       type: string
 *                       description: 职位
 *                     phone:
 *                       type: string
 *                       description: 电话
 *                     status:
 *                       type: string
 *                       enum: [ACTIVE, INACTIVE, LOCKED]
 *                       description: 用户状态
 *                     roles:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 用户角色列表
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/me', authenticate, (req, res, next) => {
  authController.getCurrentUser(req, res, next)
})

export default router
