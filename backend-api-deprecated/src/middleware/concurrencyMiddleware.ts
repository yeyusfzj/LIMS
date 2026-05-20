/**
 * 并发控制中间件
 * 处理并发冲突错误并返回标准化的 409 响应
 */

import { Request, Response, NextFunction } from 'express';
import { ConcurrencyConflictError } from '../utils/concurrencyControl';
import { logger } from '../config/logger';

/**
 * 并发冲突处理中间件
 * 捕获 ConcurrencyConflictError 并返回 409 状态码
 */
export const handleConcurrencyConflict = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof ConcurrencyConflictError) {
    logger.warn('Concurrency conflict detected', {
      path: req.path,
      method: req.method,
      currentVersion: err.currentVersion,
      requestedVersion: err.requestedVersion,
      userId: (req as any).user?.id
    });

    return res.status(409).json({
      error: {
        code: 'CONCURRENCY_CONFLICT',
        message: '资源已被其他用户修改，请刷新后重试',
        details: {
          currentVersion: err.currentVersion,
          requestedVersion: err.requestedVersion
        },
        timestamp: new Date().toISOString(),
        path: req.path
      }
    });
  }

  // 不是并发冲突错误，传递给下一个错误处理器
  next(err);
};

/**
 * 版本号验证中间件
 * 验证请求中是否包含必需的版本号
 */
export const requireVersion = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const version = req.body.version;

  if (version === undefined || version === null) {
    return res.status(400).json({
      error: {
        code: 'MISSING_VERSION',
        message: '缺少版本号参数',
        details: {
          field: 'version',
          message: '更新操作需要提供当前资源的版本号'
        },
        timestamp: new Date().toISOString(),
        path: req.path
      }
    });
  }

  if (typeof version !== 'number' || version < 1) {
    return res.status(400).json({
      error: {
        code: 'INVALID_VERSION',
        message: '版本号格式无效',
        details: {
          field: 'version',
          message: '版本号必须是大于 0 的整数'
        },
        timestamp: new Date().toISOString(),
        path: req.path
      }
    });
  }

  next();
};

/**
 * 事务超时中间件
 * 为长时间运行的事务设置超时限制
 */
export const transactionTimeout = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // 设置请求超时
    req.setTimeout(timeoutMs, () => {
      logger.error('Transaction timeout', {
        path: req.path,
        method: req.method,
        timeout: timeoutMs
      });

      if (!res.headersSent) {
        res.status(408).json({
          error: {
            code: 'TRANSACTION_TIMEOUT',
            message: '事务执行超时',
            details: {
              timeout: timeoutMs
            },
            timestamp: new Date().toISOString(),
            path: req.path
          }
        });
      }
    });

    next();
  };
};
