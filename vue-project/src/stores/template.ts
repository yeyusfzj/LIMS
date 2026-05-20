import { defineStore } from 'pinia'
import http from '@/services/http'

// 审核意见模板接口
export interface CommentTemplate {
  id: string
  name: string
  type: 'approved' | 'need_revision' | 'rejected' | 'other'
  content: string
  usageCount: number
  isDefault: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

interface TemplateState {
  templates: CommentTemplate[]
  loading: boolean
  error: string | null
  lastFetchTime: Date | null
}

export const useTemplateStore = defineStore('template', {
  state: (): TemplateState => ({
    templates: [],
    loading: false,
    error: null,
    lastFetchTime: null
  }),
  
  getters: {
    // 按类型获取模板
    templatesByType: (state) => (type: string) => {
      return state.templates.filter(t => t.type === type)
    },
    
    // 获取默认模板
    defaultTemplates: (state) => {
      return state.templates.filter(t => t.isDefault)
    },
    
    // 按类型获取默认模板
    defaultTemplateByType: (state) => (type: string) => {
      return state.templates.find(t => t.type === type && t.isDefault)
    },
    
    // 搜索模板
    searchTemplates: (state) => (keyword: string) => {
      const lowerKeyword = keyword.toLowerCase()
      return state.templates.filter(t => 
        t.name.toLowerCase().includes(lowerKeyword) ||
        t.content.toLowerCase().includes(lowerKeyword)
      )
    }
  },
  
  actions: {
    // 获取模板列表
    async fetchTemplates(force = false) {
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
        const response = await http.get('/audits/templates')
        // HTTP拦截器已经提取了data字段，直接使用response即可
        this.templates = Array.isArray(response) ? response : []
        this.lastFetchTime = new Date()
      } catch (error: any) {
        this.error = error.message || '获取模板列表失败'
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 创建模板
    async createTemplate(template: Omit<CommentTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'createdBy'>) {
      try {
        const response = await http.post('/audits/templates', template)
        // HTTP拦截器已经提取了data字段
        this.templates.push(response)
        return response
      } catch (error: any) {
        throw error
      }
    },
    
    // 更新模板
    async updateTemplate(id: string, template: Partial<CommentTemplate>) {
      try {
        const response = await http.put(`/audits/templates/${id}`, template)
        // HTTP拦截器已经提取了data字段
        const index = this.templates.findIndex(t => t.id === id)
        if (index > -1) {
          this.templates[index] = response
        }
        return response
      } catch (error: any) {
        throw error
      }
    },
    
    // 删除模板
    async deleteTemplate(id: string) {
      try {
        await http.delete(`/audits/templates/${id}`)
        const index = this.templates.findIndex(t => t.id === id)
        if (index > -1) {
          this.templates.splice(index, 1)
        }
      } catch (error: any) {
        throw error
      }
    },
    
    // 设置默认模板
    async setDefaultTemplate(id: string, type: string) {
      // 取消同类型其他模板的默认状态
      this.templates.forEach(t => {
        if (t.type === type && t.id !== id) {
          t.isDefault = false
        }
      })
      
      // 设置当前模板为默认
      const template = this.templates.find(t => t.id === id)
      if (template) {
        template.isDefault = true
        await this.updateTemplate(id, { isDefault: true })
      }
    }
  }
})
