/**
 * Express Request 类型扩展
 * 添加自定义属性到 Request 对象
 */

declare namespace Express {
  export interface Request {
    user?: {
      userId: string
      username: string
      roles: string[]
    }
  }
}
