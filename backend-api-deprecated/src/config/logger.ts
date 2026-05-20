import winston from 'winston'

const logLevel = process.env.LOG_LEVEL || 'info'

// 定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`
    
    // 添加元数据
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`
    }
    
    // 添加堆栈跟踪
    if (stack) {
      log += `\n${stack}`
    }
    
    return log
  })
)

// 创建 logger 实例
export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
    // 错误日志文件
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.json()
    }),
    // 所有日志文件
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.json()
    })
  ]
})

// 开发环境下的额外配置
if (process.env.NODE_ENV === 'development') {
  logger.debug('Logger initialized in development mode')
}

export default logger
