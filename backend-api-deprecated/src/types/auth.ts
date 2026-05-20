// 认证相关类型定义

export interface LoginDto {
  username: string
  password: string
}

export interface AuthResult {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: UserInfo
}

export interface UserInfo {
  id: string
  username: string
  email: string
  fullName: string
  roles: string[]
}

export interface TokenPayload {
  userId: string
  username: string
  roles: string[]
  iat: number
  exp: number
  jti: string
}

export interface RefreshTokenDto {
  refreshToken: string
}
