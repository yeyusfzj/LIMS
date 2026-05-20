import { defineStore } from 'pinia'
import http from '@/services/http'

// 审核级别接口
export interface AuditLevel {
  id: string
  order: number
  name: string
  description?: string
  role: string
  roleName?: string
  required: boolean
  autoAssign: boolean
  createdAt: Date
  updatedAt: Date
}

// 审核流程配置接口
export interface AuditWorkflowConfig {
  id: string
  name: string
  sampleTypes: string[]
  levels: AuditLevel[]
  parallelAudit: boolean
  status: 'active' | 'inactive'
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

interface WorkflowState {
  configs: AuditWorkflowConfig[]
  currentConfig: AuditWorkflowConfig | null
  loading: boolean
  error: string | null
  lastFetchTime: Date | null
}

export const useWorkflowStore = defineStore('workflow', {
  state: (): WorkflowState => ({
    configs: [],
    currentConfig: null,
    loading: false,
    error: null,
    lastFetchTime: null
  }),
  
  getters: {
    // 获取激活的配置
    activeConfigs: (state) => {
      return state.configs.filter(c => c.status === 'active')
    },
    
    // 按样品类型获取配置
    configBySampleType: (state) => (sampleType: string) => {
      return state.configs.find(c => 
        c.status === 'active' && c.sampleTypes.includes(sampleType)
      )
    },
    
    // 获取审核级别列表
    auditLevels: (state) => {
      return state.currentConfig?.levels || []
    }
  },
  
  actions: {
    // 获取流程配置列表
    async fetchConfigs(force = false) {
      // 缓存策略：5分钟内不重复请求
      if (!force && this.lastFetchTime) {
        const diff = Date.now() - this.lastFetchTime.getTime()
        if (diff < 5 * 60 * 1000) {
          return
        }
      }
      
      this.loading = true
      this.error = null
      
      try {
        // HTTP 拦截器已经自动提取了 response.data.data，所以这里直接使用返回值
        const configs = await http.get('/audits/workflow-configs')
        this.configs = Array.isArray(configs) ? configs : []
        this.lastFetchTime = new Date()
        
        // 设置默认当前配置为第一个激活的配置
        if (!this.currentConfig && this.activeConfigs.length > 0) {
          this.currentConfig = this.activeConfigs[0]
        }
      } catch (error: any) {
        this.error = error.message || '获取流程配置失败'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 获取流程配置详情
    async fetchConfigById(id: string) {
      try {
        const config = await http.get(`/audits/workflow-configs/${id}`)
        this.currentConfig = config
        return config
      } catch (error: any) {
        throw error
      }
    },
    
    // 创建流程配置
    async createConfig(config: Omit<AuditWorkflowConfig, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) {
      try {
        const newConfig = await http.post('/audits/workflow-configs', config)
        this.configs.push(newConfig)
        return newConfig
      } catch (error: any) {
        throw error
      }
    },
    
    // 更新流程配置
    async updateConfig(id: string, config: Partial<AuditWorkflowConfig>) {
      try {
        const updatedConfig = await http.put(`/audits/workflow-configs/${id}`, config)
        const index = this.configs.findIndex(c => c.id === id)
        if (index > -1) {
          this.configs[index] = updatedConfig
        }
        if (this.currentConfig?.id === id) {
          this.currentConfig = updatedConfig
        }
        return updatedConfig
      } catch (error: any) {
        throw error
      }
    },
    
    // 删除流程配置
    async deleteConfig(id: string) {
      try {
        await http.delete(`/audits/workflow-configs/${id}`)
        const index = this.configs.findIndex(c => c.id === id)
        if (index > -1) {
          this.configs.splice(index, 1)
        }
        if (this.currentConfig?.id === id) {
          this.currentConfig = null
        }
      } catch (error: any) {
        throw error
      }
    },
    
    // 设置当前配置
    setCurrentConfig(config: AuditWorkflowConfig) {
      this.currentConfig = config
    }
  }
})
