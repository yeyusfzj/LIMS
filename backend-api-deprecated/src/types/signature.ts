/**
 * 电子签名类型定义
 */

export interface Signature {
  id: string
  reportId: string
  signerId: string
  signerName: string
  signerRole: string
  signatureData: string // 加密的签名数据
  signedAt: Date
}

export interface SignReportDto {
  reportId: string
  signatureData: string // 原始签名数据（如签名图片的 base64）
  signerRole: string // 签名角色（如：检测员、审核员、批准人）
}

export interface VerifySignatureDto {
  reportId: string
  signatureId: string
}

export interface RevokeSignatureDto {
  reportId: string
  signatureId: string
  reason: string
}

export interface SignatureVerificationResult {
  valid: boolean
  signature?: Signature
  error?: string
}

export interface SignatureRequirement {
  role: string // 需要的签名角色
  required: boolean // 是否必需
  order: number // 签名顺序
}

// 签名配置（可以根据报告类型配置不同的签名要求）
export interface SignatureConfig {
  reportType: string
  requirements: SignatureRequirement[]
}
