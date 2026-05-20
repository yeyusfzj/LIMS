/**
 * Swagger 数据模型定义
 * 
 * 本文件定义了 API 文档中使用的所有数据模型
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Sample:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: 样品 ID
 *         barcode:
 *           type: string
 *           description: 样品条码（系统自动生成）
 *           example: SAMPLE-20240101-001
 *         sampleNumber:
 *           type: string
 *           description: 样品编号（系统自动生成）
 *           example: S20240101001
 *         clientName:
 *           type: string
 *           description: 客户名称
 *           example: 测试公司
 *         clientContact:
 *           type: string
 *           description: 客户联系方式
 *           example: 张三 13800138000
 *         sampleName:
 *           type: string
 *           description: 样品名称
 *           example: 饮用水样品
 *         sampleType:
 *           type: string
 *           description: 样品类型
 *           example: 水质
 *         sampleCategory:
 *           type: string
 *           description: 样品类别
 *           example: 环境样品
 *         quantity:
 *           type: number
 *           format: float
 *           description: 样品数量
 *           example: 500
 *         unit:
 *           type: string
 *           description: 数量单位
 *           example: mL
 *         receivedDate:
 *           type: string
 *           format: date-time
 *           description: 接收日期
 *         samplingDate:
 *           type: string
 *           format: date-time
 *           description: 采样日期
 *         samplingLocation:
 *           type: string
 *           description: 采样地点
 *           example: 某市自来水厂
 *         samplingPerson:
 *           type: string
 *           description: 采样人员
 *           example: 李四
 *         storageLocation:
 *           type: string
 *           description: 存储位置
 *           example: 冷藏室-A区-01号柜
 *         storageCondition:
 *           type: string
 *           description: 存储条件
 *           example: 4℃冷藏
 *         status:
 *           type: string
 *           enum: [REGISTERED, IN_TESTING, TESTING_COMPLETE, IN_AUDIT, AUDIT_COMPLETE, RELEASED, ARCHIVED]
 *           description: 样品状态
 *           example: REGISTERED
 *         priority:
 *           type: string
 *           enum: [LOW, NORMAL, HIGH, URGENT]
 *           description: 优先级
 *           example: NORMAL
 *         description:
 *           type: string
 *           description: 样品描述
 *         remarks:
 *           type: string
 *           description: 备注信息
 *         parentSampleId:
 *           type: string
 *           format: uuid
 *           description: 母样品 ID（分样时使用）
 *         mergedFromIds:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *           description: 合样来源样品 ID 列表
 *         createdBy:
 *           type: string
 *           format: uuid
 *           description: 创建人 ID
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: 更新时间
 *         releasedAt:
 *           type: string
 *           format: date-time
 *           description: 放行时间
 *         releasedBy:
 *           type: string
 *           format: uuid
 *           description: 放行人 ID
 * 
 *     CreateSampleRequest:
 *       type: object
 *       required:
 *         - clientName
 *         - sampleName
 *         - sampleType
 *         - sampleCategory
 *         - quantity
 *         - unit
 *         - receivedDate
 *       properties:
 *         clientName:
 *           type: string
 *           description: 客户名称
 *           example: 测试公司
 *         clientContact:
 *           type: string
 *           description: 客户联系方式
 *           example: 张三 13800138000
 *         sampleName:
 *           type: string
 *           description: 样品名称
 *           example: 饮用水样品
 *         sampleType:
 *           type: string
 *           description: 样品类型
 *           example: 水质
 *         sampleCategory:
 *           type: string
 *           description: 样品类别
 *           example: 环境样品
 *         quantity:
 *           type: number
 *           format: float
 *           description: 样品数量
 *           example: 500
 *         unit:
 *           type: string
 *           description: 数量单位
 *           example: mL
 *         receivedDate:
 *           type: string
 *           format: date-time
 *           description: 接收日期
 *         samplingDate:
 *           type: string
 *           format: date-time
 *           description: 采样日期
 *         samplingLocation:
 *           type: string
 *           description: 采样地点
 *         samplingPerson:
 *           type: string
 *           description: 采样人员
 *         storageLocation:
 *           type: string
 *           description: 存储位置
 *         storageCondition:
 *           type: string
 *           description: 存储条件
 *         priority:
 *           type: string
 *           enum: [LOW, NORMAL, HIGH, URGENT]
 *           description: 优先级
 *           default: NORMAL
 *         description:
 *           type: string
 *           description: 样品描述
 *         remarks:
 *           type: string
 *           description: 备注信息
 * 
 *     Transfer:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: 流转记录 ID
 *         sampleId:
 *           type: string
 *           format: uuid
 *           description: 样品 ID
 *         fromLocation:
 *           type: string
 *           description: 起始位置
 *           example: 接收室
 *         toLocation:
 *           type: string
 *           description: 目标位置
 *           example: 检测室-A
 *         fromPerson:
 *           type: string
 *           description: 交接人
 *           example: 张三
 *         toPerson:
 *           type: string
 *           description: 接收人
 *           example: 李四
 *         transferDate:
 *           type: string
 *           format: date-time
 *           description: 流转日期
 *         receivedDate:
 *           type: string
 *           format: date-time
 *           description: 接收确认日期
 *         status:
 *           type: string
 *           enum: [PENDING, IN_TRANSIT, RECEIVED, REJECTED]
 *           description: 流转状态
 *         remarks:
 *           type: string
 *           description: 备注
 *         senderConfirmed:
 *           type: boolean
 *           description: 发送方是否已确认
 *         receiverConfirmed:
 *           type: boolean
 *           description: 接收方是否已确认
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 * 
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: 用户 ID
 *         username:
 *           type: string
 *           description: 用户名
 *         email:
 *           type: string
 *           format: email
 *           description: 邮箱
 *         fullName:
 *           type: string
 *           description: 姓名
 *         department:
 *           type: string
 *           description: 部门
 *         position:
 *           type: string
 *           description: 职位
 *         phone:
 *           type: string
 *           description: 电话
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, LOCKED]
 *           description: 用户状态
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: 更新时间
 * 
 *     Result:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: 结果 ID
 *         sampleId:
 *           type: string
 *           format: uuid
 *           description: 样品 ID
 *         testItemId:
 *           type: string
 *           description: 检测项目 ID
 *         parameter:
 *           type: string
 *           description: 检测参数名称
 *           example: pH值
 *         value:
 *           type: number
 *           format: float
 *           description: 数值型结果
 *           example: 7.2
 *         textValue:
 *           type: string
 *           description: 文本型结果
 *         unit:
 *           type: string
 *           description: 单位
 *           example: pH
 *         method:
 *           type: string
 *           description: 检测方法
 *           example: GB/T 5750.4-2006
 *         source:
 *           type: string
 *           enum: [MANUAL, INSTRUMENT, CALCULATED]
 *           description: 结果来源
 *         isAbnormal:
 *           type: boolean
 *           description: 是否异常
 *         abnormalReason:
 *           type: string
 *           description: 异常原因
 *         isRetest:
 *           type: boolean
 *           description: 是否为复测结果
 *         enteredBy:
 *           type: string
 *           format: uuid
 *           description: 录入人 ID
 *         enteredAt:
 *           type: string
 *           format: date-time
 *           description: 录入时间
 * 
 *     Report:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: 报告 ID
 *         reportNumber:
 *           type: string
 *           description: 报告编号
 *           example: RPT-20240101-001
 *         sampleId:
 *           type: string
 *           format: uuid
 *           description: 样品 ID
 *         templateId:
 *           type: string
 *           format: uuid
 *           description: 模板 ID
 *         content:
 *           type: string
 *           description: 报告内容（HTML）
 *         status:
 *           type: string
 *           enum: [DRAFT, PENDING_SIGNATURE, SIGNED, DISTRIBUTED, RECALLED]
 *           description: 报告状态
 *         generatedBy:
 *           type: string
 *           format: uuid
 *           description: 生成人 ID
 *         generatedAt:
 *           type: string
 *           format: date-time
 *           description: 生成时间
 *         approvedAt:
 *           type: string
 *           format: date-time
 *           description: 批准时间
 */

// 此文件仅用于 Swagger 文档生成，不包含实际代码
export {}
