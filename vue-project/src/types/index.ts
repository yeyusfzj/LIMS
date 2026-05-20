// 全局类型定义

export interface Sample {
  id: string
  barcode: string
  sampleNumber: string
  sampleName: string
  sampleType: string
  sampleCategory: string
  clientName: string
  clientContact?: string
  quantity: number
  unit: string
  receivedDate: Date
  samplingDate?: Date
  samplingLocation?: string
  samplingPerson?: string
  storageLocation: string
  storageCondition?: string
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
  status: 'REGISTERED' | 'IN_PROGRESS' | 'COMPLETED' | 'RELEASED' | 'RETURNED' | 'ARCHIVED'
  description?: string
  remarks?: string
  parentSampleId?: string
  mergedFromIds?: string[]
  createdBy: string
  createdAt: Date
  updatedAt: Date
  // 关联数据（可选）
  testItems?: any[]
  results?: any[]
  transfers?: any[]
  auditTasks?: any[]
  qualityJudgment?: any
  reports?: any[]
  parentSample?: Sample
  childSamples?: Sample[]
}

export interface StorageConditions {
  temperature?: number
  humidity?: number
  specialRequirements?: string
}

export interface RetentionInfo {
  location: string
  expiryDate: Date
  status: 'active' | 'extended' | 'disposed'
}

export interface User {
  id: string
  username: string
  email: string
  fullName: string
  roles: Role[]
  department?: string
  skills?: string[]
  status: 'active' | 'inactive'
  createdAt: Date
  lastLoginAt?: Date
}

export interface Role {
  id: string
  name: string
  permissions: Permission[]
}

export interface Permission {
  resource: string
  actions: ('create' | 'read' | 'update' | 'delete')[]
}

// 监管链记录
export interface CustodyRecord {
  id: string
  sampleId: string
  fromLocation: string
  toLocation: string
  fromPerson: string
  toPerson: string
  transferReason: string
  timestamp: Date
  signature?: string
}

// 流转表单数据
export interface TransferFormData {
  toLocation: string
  receiver: string
  transferReason: string
  storageConditions?: {
    temperature?: number
    humidity?: number
    specialRequirements?: string
  }
}

// 任务相关类型
export interface Task {
  id: string
  sampleId: string
  sampleName: string
  sampleBarcode: string
  workflowId: string
  workflowName: string
  nodeId: string
  nodeName: string
  assignee: string
  assigneeName: string
  status: 'pending' | 'in_progress' | 'completed' | 'rejected'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  dueDate?: Date
  startedAt?: Date
  completedAt?: Date
  data?: Record<string, any>
  createdAt: Date
}

export interface TaskFilters {
  keyword?: string
  status?: string[]
  priority?: string[]
  assignee?: string
  dateRange?: [Date, Date]
}

// 工作流相关类型
export interface Workflow {
  id: string
  name: string
  version: string
  description?: string
  applicableTypes: string[]
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  status: 'draft' | 'active' | 'archived'
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface WorkflowNode {
  id: string
  type: 'START' | 'END' | 'TASK' | 'DECISION' | 'PARALLEL' | 'MERGE'
  name: string
  config: NodeConfig
  position: { x: number; y: number }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  condition?: string
}

export interface NodeConfig {
  methodId?: string
  auditLevel?: number
  waitDuration?: number
  condition?: string
  autoAssign?: boolean
  assignmentRule?: AssignmentRule
}

export interface AssignmentRule {
  type: 'skill' | 'workload' | 'round_robin'
  criteria?: Record<string, any>
}

// 检测方法相关类型
export interface TestMethod {
  id: string
  code: string
  name: string
  category: string
  version: string
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED'
  scope?: string
  description?: string
  equipment: MethodEquipment[]
  steps: MethodStep[]
  precision?: string
  accuracy?: string
  detectionLimit?: string
  measurementRange?: string
  qualityControl?: string
  safetyNotes?: string
  operationNotes?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface MethodEquipment {
  name: string
  model: string
  accuracy?: string
  calibration?: string
}

export interface MethodStep {
  title: string
  description: string
}

export interface Equipment {
  id: string
  name: string
  required: boolean
}

export interface TestItem {
  id: string
  name: string
  unit?: string
  dataType: 'number' | 'text' | 'boolean'
  method?: string
  normalRange?: string
  value: number | string | boolean | null
  isValid: boolean | null
  remarks?: string
  dataSource: 'manual' | 'instrument'
  instrumentId?: string
  operator: string
  enteredAt: Date
  validationRule?: ValidationRule
  formula?: Formula
}

export interface ValidationRule {
  type: 'range' | 'regex' | 'custom'
  min?: number
  max?: number
  pattern?: string
  customValidator?: string
}

export interface Formula {
  id: string
  expression: string
  variables: Variable[]
  resultUnit?: string
}

export interface Variable {
  name: string
  value: number
  source: 'input' | 'result' | 'constant'
}

export interface Document {
  id: string
  name: string
  url: string
  type: string
  size: number
  uploadedAt: Date
}

// 检测结果相关类型
export interface TestResult {
  id: string
  sampleId: string
  taskId: string
  testItemId: string
  testItemName: string
  value: number | string | boolean
  unit?: string
  source: 'manual' | 'instrument'
  instrumentId?: string
  operator: string
  timestamp: Date
  isAnomaly: boolean
  anomalyInfo?: Anomaly
  calculatedFrom?: string[]
}

export interface Anomaly {
  resultId: string
  type: 'out_of_range' | 'deviation' | 'manual'
  reason: string
  markedBy: string
  markedAt: Date
  retestRequired: boolean
}

export interface ResultEntryFormData {
  testItemId: string
  value: number | string | boolean
  unit?: string
  remarks?: string
}

// 审核相关类型
export interface AuditLevel {
  id: string
  order: number
  name: string
  description?: string
  role: string
  roleName?: string
  required: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AuditTask {
  id: string
  taskId: string
  sampleName?: string
  sampleBarcode?: string
  level: number
  levelName: string
  auditor: string
  auditorName?: string
  status: 'pending' | 'approved' | 'rejected' | 'returned'
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  comments?: string
  attachments?: Document[]
  submittedAt: Date
  auditedAt?: Date
  // 扩展任务信息字段
  task?: {
    id: string
    taskNumber: string
    name: string
    description?: string
    status: string
    sampleId?: string
    sample?: {
      barcode: string
      sampleNumber: string
      sampleName: string
      clientName: string
    }
  }
}

export interface JudgmentResult {
  id: string
  sampleId: string
  autoJudgment: 'pass' | 'fail'
  autoJudgmentReason: string
  manualJudgment?: 'pass' | 'fail'
  manualJudgmentReason?: string
  judgedBy?: string
  judgedAt?: Date
  finalJudgment: 'pass' | 'fail'
}

// 判定规则相关类型
export interface JudgmentRule {
  id: string
  testItemId: string
  testItemName?: string
  condition: string
  passValue: any
  failValue: any
  description?: string
  status: 'active' | 'inactive'
  createdAt: Date
  updatedAt?: Date
}

export interface JudgmentRecord {
  id: string
  sampleId: string
  sampleBarcode: string
  sampleName: string
  sampleType: string
  client: string
  autoJudgment: 'pass' | 'fail'
  autoJudgmentReason: string
  manualJudgment?: 'pass' | 'fail'
  manualJudgmentReason?: string
  finalJudgment: 'pass' | 'fail'
  comments?: string
  status: 'pending' | 'completed'
  judgedBy?: string
  judgedAt?: Date
  testResults: TestResultItem[]
}

export interface TestResultItem {
  testItemName: string
  value: number | string
  unit: string
  standardValue: string
  isPass: boolean
  remarks?: string
}

// 报告模板相关类型
export interface ReportTemplate {
  id: string
  name: string
  version: string
  content: string // HTML with placeholders
  variables: TemplateVariable[]
  applicableTypes: string[]
  status: 'draft' | 'active' | 'archived'
  description?: string
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface TemplateVariable {
  name: string
  type: 'text' | 'number' | 'date' | 'table' | 'chart'
  source: string // data path
  format?: string
  description?: string
}

export interface GeneratedReport {
  id: string
  reportNumber: string
  sampleId: string
  templateId: string
  content: string
  signatures: Signature[]
  status: 'draft' | 'signed' | 'distributed' | 'recalled'
  distributionRecords: DistributionRecord[]
  generatedBy: string
  generatedAt: Date
  signedAt?: Date
  distributedAt?: Date
}

export interface Signature {
  role: 'preparer' | 'reviewer' | 'approver'
  userId: string
  userName: string
  signedAt: Date
  signatureData: string // encrypted signature
  comments?: string // 签名意见
}

export interface DistributionRecord {
  recipient: string
  method: 'email' | 'download' | 'print'
  distributedAt: Date
  distributedBy: string
}

// 样品放行相关类型
export interface ReleasableSample {
  id: string
  barcode: string
  name: string
  client: string
  sampleType: string
  status: 'completed' | 'released'
  receivedDate: string
  canRelease: boolean
  releaseConditions: ReleaseConditions
  blockingReasons: string[]
}

export interface ReleaseConditions {
  qualityJudgment: ConditionResult
  testCompletion: ConditionResult
  auditApproval: ConditionResult
  reportGeneration: ConditionResult
}

export interface ConditionResult {
  status: 'passed' | 'failed' | 'pending'
  message: string
}

export interface ReleaseRecord {
  id: string
  sampleId: string
  sampleBarcode: string
  sampleName: string
  client: string
  releaseNumber: string
  releasedBy: string
  releasedAt: string
  releaseReason: string
  status: 'released'
}

export interface ReleaseFilters {
  keyword?: string
  sampleType?: string
  client?: string
  status?: string
  dateRange?: [string, string]
}
