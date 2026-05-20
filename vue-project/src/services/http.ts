/**
 * HTTP客户端封装
 * 
 * 设计理念:
 * 1. 参考LabWare LIMS的API Gateway模式,统一管理所有HTTP请求
 * 2. 使用Axios拦截器实现请求/响应的统一处理
 * 3. 支持请求取消、超时控制、错误重试等企业级特性
 * 
 * 架构优势:
 * - 关注点分离: 将HTTP通信逻辑与业务逻辑解耦
 * - 统一配置: 全局的超时、认证、错误处理
 * - 可测试性: 便于Mock和单元测试
 */

import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse, type AxiosError } from 'axios'
import { ElMessage, ElLoading } from 'element-plus'

// API响应标准格式 (参考RESTful最佳实践)
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
  timestamp?: number
}

// 限流错误对象接口
export interface RateLimitError extends Error {
  isRateLimit: true
  retryAfter: number          // 等待时间（秒）
  retryAfterMinutes: number   // 等待时间（分钟）
  suggestion: string          // 建议信息
  code: string               // 错误代码
  status: 429                // HTTP状态码
}

// 请求配置扩展
export interface RequestConfig extends AxiosRequestConfig {
  showLoading?: boolean      // 是否显示Loading
  showError?: boolean         // 是否显示错误提示
  retryCount?: number         // 重试次数
}

class HttpClient {
  private instance: AxiosInstance
  private loadingInstance: any = null
  private requestCount: number = 0

  constructor() {
    // 创建Axios实例
    this.instance = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
      timeout: 30000, // 30秒超时
      headers: {
        'Content-Type': 'application/json'
      }
    })

    console.log('HTTP客户端初始化，API基础URL:', import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1')

    // 初始化拦截器
    this.initInterceptors()
  }

  /**
   * 初始化请求/响应拦截器
   * 
   * 拦截器设计参考:
   * - Thermo Fisher SampleManager的认证机制
   * - LabVantage的错误处理策略
   */
  private initInterceptors() {
    // 请求拦截器
    this.instance.interceptors.request.use(
      (config: any) => {
        // 如果URL以/api开头，说明是绝对路径，不使用baseURL
        if (config.url && config.url.startsWith('/api')) {
          config.baseURL = ''
          config.url = `http://localhost:8000${config.url}`
        }
        
        console.log('🌐 HTTP请求拦截器 - 发送请求:', {
          url: config.url,
          method: config.method,
          baseURL: config.baseURL,
          fullURL: config.baseURL ? `${config.baseURL}${config.url}` : config.url,
          data: config.data,
          dataJSON: config.data ? JSON.stringify(config.data, null, 2) : 'no data'
        })
        
        // 1. 添加认证Token (参考JWT标准)
        const token = localStorage.getItem('accessToken')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }

        // 2. 不显示Loading旋转效果（根据用户要求）
        // if (config.showLoading !== false) {
        //   this.showLoading()
        // }

        // 3. 添加请求追踪ID (便于日志追踪)
        config.headers['X-Request-ID'] = this.generateRequestId()

        // 4. 添加时间戳 (防止缓存)
        if (config.method?.toLowerCase() === 'get') {
          config.params = {
            ...config.params,
            _t: Date.now()
          }
        }

        return config
      },
      (error: AxiosError) => {
        console.error('请求拦截器错误:', error)
        // this.hideLoading() // 已禁用Loading
        return Promise.reject(error)
      }
    )

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log('收到响应:', {
          status: response.status,
          statusText: response.statusText,
          data: response.data
        })
        
        // this.hideLoading() // 已禁用Loading

        // 检查响应数据格式
        const responseData = response.data

        // 处理错误响应
        if (responseData && responseData.error) {
          const config = response.config as RequestConfig
          if (config.showError !== false) {
            ElMessage.error(responseData.error.message || '请求失败')
          }
          return Promise.reject(new Error(responseData.error.message))
        }

        // 如果是成功响应，直接返回整个响应数据（包括 success, data, message）
        // 这样前端可以访问 response.data.items, response.data.total 等
        if (responseData && (responseData.success === true || response.status === 200)) {
          return responseData
        }

        // 默认返回响应数据
        return responseData
      },
      (error: AxiosError) => {
        console.error('响应拦截器错误:', error)
        // this.hideLoading() // 已禁用Loading
        return this.handleError(error)
      }
    )
  }

  /**
   * 错误处理
   * 
   * 参考LabVantage的错误分类和处理策略:
   * - 网络错误: 提示用户检查网络
   * - 认证错误: 跳转登录页
   * - 权限错误: 提示无权限
   * - 服务器错误: 提示稍后重试
   * - 限流错误(429): 解析等待时间并返回结构化错误对象
   */
  private handleError(error: AxiosError): Promise<never> {
    const config = error.config as RequestConfig

    if (error.response) {
      // 服务器返回错误状态码
      const { status, data, headers } = error.response
      const responseData = data as any
      let message = '请求失败'

      switch (status) {
        case 400:
          // 优先使用后端返回的错误消息
          message = responseData?.error?.message || responseData?.message || '请求参数错误'
          break
        case 401:
          // 优先使用后端返回的错误消息（如"用户名或密码错误"）
          message = responseData?.error?.message || responseData?.message || '未授权,请重新登录'
          
          // 只有在非登录页面的401错误才清除token并跳转
          // 登录页面的401错误（密码错误）不应该跳转
          const isLoginRequest = error.config?.url?.includes('/auth/login')
          if (!isLoginRequest) {
            // 清除token并跳转登录页
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
            localStorage.removeItem('user')
            window.location.href = '/login'
          }
          break
        case 403:
          message = responseData?.error?.message || responseData?.message || '没有权限访问该资源'
          break
        case 404:
          message = responseData?.error?.message || responseData?.message || '请求的资源不存在'
          break
        case 429:
          // 特殊处理429限流错误
          console.log('HTTP客户端检测到429错误，调用handleRateLimitError')
          console.log('429错误详情:', { status, data, headers })
          try {
            return this.handleRateLimitError(error, config)
          } catch (rateLimitError) {
            console.error('handleRateLimitError方法抛出异常:', rateLimitError)
            throw rateLimitError
          }
        case 500:
          message = responseData?.error?.message || responseData?.message || '服务器内部错误'
          break
        case 502:
          message = responseData?.error?.message || responseData?.message || '网关错误'
          break
        case 503:
          message = responseData?.error?.message || responseData?.message || '服务暂时不可用'
          break
        default:
          console.log('进入default case，状态码:', status)
          message = responseData?.error?.message || responseData?.message || `请求失败(${status})`
      }

      if (config?.showError !== false) {
        ElMessage.error(message)
      }

      return Promise.reject(new Error(message))
    } else if (error.request) {
      // 请求已发送但没有收到响应
      const message = '网络连接失败,请检查网络'
      if (config?.showError !== false) {
        ElMessage.error(message)
      }
      return Promise.reject(new Error(message))
    } else {
      // 请求配置错误
      const message = error.message || '请求配置错误'
      if (config?.showError !== false) {
        ElMessage.error(message)
      }
      return Promise.reject(error)
    }
  }

  /**
   * 处理429限流错误
   * 解析Retry-After头信息和响应体中的retryAfter字段
   * 返回包含等待时间的结构化错误对象
   */
  private handleRateLimitError(error: AxiosError, config?: RequestConfig): Promise<never> {
    console.log('handleRateLimitError被调用，处理429错误')
    const { headers, data } = error.response!
    
    console.log('429错误详情:', {
      status: error.response?.status,
      headers: headers,
      data: data
    })
    
    // 解析Retry-After头信息（优先级更高）
    let retryAfterSeconds = 0
    const retryAfterHeader = headers['retry-after'] || headers['Retry-After']
    if (retryAfterHeader) {
      retryAfterSeconds = parseInt(retryAfterHeader as string, 10) || 0
    }
    
    // 解析响应体中的retryAfter字段（作为备选）
    const responseData = data as any
    if (!retryAfterSeconds && responseData?.error?.retryAfter) {
      retryAfterSeconds = responseData.error.retryAfter
    }
    
    // 提取其他相关信息
    const retryAfterMinutes = responseData?.error?.retryAfterMinutes || Math.ceil(retryAfterSeconds / 60)
    const errorMessage = responseData?.error?.message || '请求过于频繁，请稍后再试'
    const suggestion = responseData?.error?.suggestion || '请稍后再试'
    const errorCode = responseData?.error?.code || 'RATE_LIMIT_EXCEEDED'
    
    console.log('解析的限流信息:', {
      retryAfterSeconds,
      retryAfterMinutes,
      errorMessage,
      suggestion,
      errorCode
    })
    
    // 创建结构化错误对象
    const rateLimitError = new Error(errorMessage) as RateLimitError
    
    // 使用Object.defineProperty确保属性能够被正确设置
    Object.defineProperty(rateLimitError, 'isRateLimit', {
      value: true,
      writable: false,
      enumerable: true,
      configurable: false
    })
    
    Object.defineProperty(rateLimitError, 'retryAfter', {
      value: retryAfterSeconds,
      writable: false,
      enumerable: true,
      configurable: false
    })
    
    Object.defineProperty(rateLimitError, 'retryAfterMinutes', {
      value: retryAfterMinutes,
      writable: false,
      enumerable: true,
      configurable: false
    })
    
    Object.defineProperty(rateLimitError, 'suggestion', {
      value: suggestion,
      writable: false,
      enumerable: true,
      configurable: false
    })
    
    Object.defineProperty(rateLimitError, 'code', {
      value: errorCode,
      writable: false,
      enumerable: true,
      configurable: false
    })
    
    Object.defineProperty(rateLimitError, 'status', {
      value: 429,
      writable: false,
      enumerable: true,
      configurable: false
    })
    
    console.log('创建的RateLimitError对象:', rateLimitError)
    console.log('RateLimitError对象属性:', {
      isRateLimit: rateLimitError.isRateLimit,
      retryAfter: rateLimitError.retryAfter,
      retryAfterMinutes: rateLimitError.retryAfterMinutes,
      suggestion: rateLimitError.suggestion,
      code: rateLimitError.code,
      status: rateLimitError.status
    })
    
    // 不显示ElMessage错误提示，让Login.vue处理UI显示
    // if (config?.showError !== false) {
    //   ElMessage.error(errorMessage)
    // }
    
    return Promise.reject(rateLimitError)
  }

  /**
   * 显示Loading
   * 使用计数器支持并发请求
   */
  private showLoading() {
    if (this.requestCount === 0) {
      this.loadingInstance = ElLoading.service({
        lock: true,
        text: '加载中...',
        background: 'rgba(0, 0, 0, 0.7)'
      })
    }
    this.requestCount++
  }

  /**
   * 隐藏Loading
   */
  private hideLoading() {
    this.requestCount--
    if (this.requestCount <= 0) {
      this.requestCount = 0
      this.loadingInstance?.close()
      this.loadingInstance = null
    }
  }

  /**
   * 生成请求追踪ID
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * GET请求
   */
  get<T = any>(url: string, config?: RequestConfig): Promise<T> {
    return this.instance.get(url, config)
  }

  /**
   * POST请求
   */
  post<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.instance.post(url, data, config)
  }

  /**
   * PUT请求
   */
  put<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.instance.put(url, data, config)
  }

  /**
   * DELETE请求
   */
  delete<T = any>(url: string, config?: RequestConfig): Promise<T> {
    return this.instance.delete(url, config)
  }

  /**
   * PATCH请求
   */
  patch<T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.instance.patch(url, data, config)
  }

  /**
   * 上传文件
   */
  upload<T = any>(url: string, file: File, onProgress?: (progress: number) => void): Promise<T> {
    const formData = new FormData()
    formData.append('file', file)

    return this.instance.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      }
    })
  }

  /**
   * 下载文件
   */
  download(url: string, filename?: string): Promise<void> {
    return this.instance.get(url, {
      responseType: 'blob'
    }).then((blob: any) => {
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename || 'download'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    })
  }
}

// 导出单例实例
export const http = new HttpClient()
export default http
