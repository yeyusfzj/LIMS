/**
 * API服务统一导出
 * 
 * 使用方式:
 * import { sampleApi, workflowApi, userApi, agentApi } from '@/services'
 */

export { default as http } from './http'
export { default as sampleApi } from './api/sample'
export { default as workflowApi } from './api/workflow'
export { default as userApi } from './api/user'
export { default as agentApi } from './api/agent'

// 也可以这样导入
export * from './api/sample'
export * from './api/workflow'
export * from './api/user'
export * from './api/agent'
