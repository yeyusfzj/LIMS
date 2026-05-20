import http from './http'

export interface LoginRequest {
  username: string
  password: string
}

export interface UserBasicInfo {
  id: string
  username: string
  email: string
  fullName: string
  roles: string[]
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: UserBasicInfo
}

export interface RefreshTokenRequest {
  refreshToken: string
}

export interface RefreshTokenResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface UserInfo {
  id: string
  username: string
  email: string
  fullName: string
  department?: string
  position?: string
  phone?: string
  status: string
  roles: string[]
}

class AuthService {
  /**
   * 用户登录
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await http.post('/auth/login', data)
    console.log('[authService.login] HTTP响应:', response)
    console.log('[authService.login] 响应类型:', typeof response)
    console.log('[authService.login] 响应字段:', Object.keys(response))
    
    // HTTP 拦截器返回格式: { success: true, data: {...}, message: "..." }
    // 需要提取 data 字段
    if (response && response.data) {
      console.log('[authService.login] 返回 response.data:', response.data)
      return response.data
    }
    
    // 如果响应本身就是数据（没有嵌套），直接返回
    console.log('[authService.login] 直接返回 response:', response)
    return response
  }

  /**
   * 刷新令牌
   */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const response = await http.post('/auth/refresh', { refreshToken })
    // 提取 data 字段
    if (response && response.data) {
      return response.data
    }
    return response
  }

  /**
   * 用户登出
   */
  async logout(): Promise<void> {
    await http.post('/auth/logout')
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<UserInfo> {
    const response = await http.get('/auth/me')
    // 提取 data 字段
    if (response && response.data) {
      return response.data
    }
    return response
  }
}

export const authService = new AuthService()