import swaggerJsdoc = require('swagger-jsdoc')
import { config } from './env'

/**
 * Swagger/OpenAPI 配置
 * 
 * 自动生成 API 文档，提供交互式测试界面
 */

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '实验室管理系统后端 API',
      version: '1.0.0',
      description: `
实验室管理系统后端 API 是一个 RESTful API 服务，为实验室智能管理系统前端提供数据存储、业务逻辑处理和系统集成能力。

## 核心功能

- **样品管理**：样品全生命周期管理、流转追踪、分样合样
- **工作流引擎**：灵活的工作流配置、任务自动派工
- **检测结果**：结果录入、公式计算、批量导入、异常检测
- **审核判定**：多级审核流程、质量判定、样品放行
- **报告管理**：报告模板、报告生成、电子签名、分发回收
- **统计分析**：数据聚合、自定义报表、数据导出
- **系统管理**：用户管理、角色权限、审计日志、数据备份

## 认证方式

API 使用 JWT (JSON Web Token) 进行身份认证。

1. 调用 \`POST /api/auth/login\` 获取访问令牌
2. 在后续请求的 Header 中添加：\`Authorization: Bearer <token>\`
3. 访问令牌有效期为 15 分钟，可使用刷新令牌延长会话

## 错误响应格式

所有错误响应遵循统一格式：

\`\`\`json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "用户友好的错误消息",
    "details": {},
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/api/samples",
    "requestId": "uuid"
  }
}
\`\`\`

## 分页响应格式

列表查询接口支持分页，响应格式：

\`\`\`json
{
  "items": [],
  "total": 100,
  "page": 1,
  "pageSize": 20,
  "totalPages": 5
}
\`\`\`
      `,
      contact: {
        name: 'API 支持',
        email: 'support@lims.example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: config.nodeEnv === 'production' 
          ? 'https://api.lims.example.com' 
          : `http://localhost:${config.port}`,
        description: config.nodeEnv === 'production' ? '生产环境' : '开发环境'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT 访问令牌，格式：Bearer <token>'
        }
      },
      schemas: {
        // 通用响应模型
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: '错误码',
                  example: 'VALIDATION_ERROR'
                },
                message: {
                  type: 'string',
                  description: '错误消息',
                  example: '请求参数验证失败'
                },
                details: {
                  type: 'object',
                  description: '详细错误信息'
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  description: '错误发生时间'
                },
                path: {
                  type: 'string',
                  description: '请求路径'
                },
                requestId: {
                  type: 'string',
                  description: '请求追踪 ID'
                }
              }
            }
          }
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {},
              description: '数据列表'
            },
            total: {
              type: 'integer',
              description: '总记录数',
              example: 100
            },
            page: {
              type: 'integer',
              description: '当前页码',
              example: 1
            },
            pageSize: {
              type: 'integer',
              description: '每页记录数',
              example: 20
            },
            totalPages: {
              type: 'integer',
              description: '总页数',
              example: 5
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: '未认证或令牌无效',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                error: {
                  code: 'AUTH_FAILED',
                  message: '认证失败，请重新登录',
                  details: { reason: '令牌已过期' },
                  timestamp: '2024-01-01T00:00:00.000Z',
                  path: '/api/samples',
                  requestId: 'uuid'
                }
              }
            }
          }
        },
        ForbiddenError: {
          description: '无权限访问',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                error: {
                  code: 'PERMISSION_DENIED',
                  message: '您没有权限执行此操作',
                  details: {
                    required: 'sample:update',
                    current: ['sample:read']
                  },
                  timestamp: '2024-01-01T00:00:00.000Z',
                  path: '/api/samples/123',
                  requestId: 'uuid'
                }
              }
            }
          }
        },
        NotFoundError: {
          description: '资源不存在',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                error: {
                  code: 'NOT_FOUND',
                  message: '请求的资源不存在',
                  timestamp: '2024-01-01T00:00:00.000Z',
                  path: '/api/samples/123',
                  requestId: 'uuid'
                }
              }
            }
          }
        },
        ValidationError: {
          description: '请求参数验证失败',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                error: {
                  code: 'VALIDATION_ERROR',
                  message: '请求参数验证失败',
                  details: {
                    fields: [
                      { field: 'email', message: '邮箱格式不正确' },
                      { field: 'quantity', message: '数量必须大于 0' }
                    ]
                  },
                  timestamp: '2024-01-01T00:00:00.000Z',
                  path: '/api/samples',
                  requestId: 'uuid'
                }
              }
            }
          }
        },
        ConflictError: {
          description: '并发冲突或业务规则冲突',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                error: {
                  code: 'CONFLICT',
                  message: '资源已被其他用户修改',
                  details: {
                    currentVersion: 5,
                    requestedVersion: 4
                  },
                  timestamp: '2024-01-01T00:00:00.000Z',
                  path: '/api/samples/123',
                  requestId: 'uuid'
                }
              }
            }
          }
        },
        ServerError: {
          description: '服务器内部错误',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                error: {
                  code: 'INTERNAL_ERROR',
                  message: '服务器内部错误，请稍后重试',
                  timestamp: '2024-01-01T00:00:00.000Z',
                  path: '/api/samples',
                  requestId: 'uuid'
                }
              }
            }
          }
        }
      },
      parameters: {
        PageParam: {
          name: 'page',
          in: 'query',
          description: '页码（从 1 开始）',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1
          }
        },
        PageSizeParam: {
          name: 'pageSize',
          in: 'query',
          description: '每页记录数',
          required: false,
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 20
          }
        },
        SortParam: {
          name: 'sort',
          in: 'query',
          description: '排序字段（格式：field:asc 或 field:desc）',
          required: false,
          schema: {
            type: 'string',
            example: 'createdAt:desc'
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: '认证',
        description: '用户认证和授权相关接口'
      },
      {
        name: '样品管理',
        description: '样品创建、查询、更新、流转、分样、合样等操作'
      },
      {
        name: '工作流',
        description: '工作流配置、实例管理、节点控制'
      },
      {
        name: '任务管理',
        description: '任务创建、分配、查询、完成'
      },
      {
        name: '检测结果',
        description: '结果录入、批量导入、公式计算、复测管理'
      },
      {
        name: '审核判定',
        description: '多级审核、质量判定、样品放行'
      },
      {
        name: '报告管理',
        description: '报告模板、报告生成、电子签名、分发回收'
      },
      {
        name: '统计分析',
        description: '数据统计、自定义报表、数据导出'
      },
      {
        name: '系统管理',
        description: '用户管理、角色权限、审计日志、数据备份'
      },
      {
        name: '权限管理',
        description: '权限配置、数据权限过滤'
      }
    ]
  },
  // API 路由文件路径（用于自动扫描注释）
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './src/types/swagger-schemas.ts'
  ]
}

// 生成 Swagger 规范
export const swaggerSpec = swaggerJsdoc(swaggerOptions)

export default swaggerSpec
