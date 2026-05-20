import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // 登录页面
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/Login.vue'),
      meta: { 
        title: '用户登录',
        requiresAuth: false 
      }
    },
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      redirect: '/dashboard',
      children: [
        // 首页
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/Dashboard.vue'),
          meta: { title: '首页', requiresAuth: true }
        },
        
        // 样品管理模块
        {
          path: 'sample/list',
          name: 'sample-list',
          component: () => import('@/views/sample/SampleManagement.vue'),
          meta: { title: '样品列表' }
        },
        {
          path: 'sample/registration',
          name: 'sample-registration',
          component: () => import('@/views/sample/SampleRegistration.vue'),
          meta: { title: '样品登记' }
        },
        {
          path: 'sample/detail/:id',
          name: 'sample-detail',
          component: () => import('@/views/sample/SampleDetail.vue'),
          meta: { title: '样品详情' }
        },
        {
          path: 'sample/retention',
          name: 'retention-management',
          component: () => import('@/views/sample/RetentionManagement.vue'),
          meta: { title: '留样管理' }
        },
        {
          path: 'sample/transfer',
          name: 'sample-transfer',
          component: () => import('@/views/sample/SampleTransferManagement.vue'),
          meta: { title: '样品流转' }
        },
        {
          path: 'sample/release',
          name: 'sample-release',
          component: () => import('@/views/sample/SampleRelease.vue'),
          meta: { title: '样品放行' }
        },
        
        // 工作流管理模块
        {
          path: 'method/library',
          name: 'method-library',
          component: () => import('@/views/method/MethodLibrary.vue'),
          meta: { title: '检测方法库' }
        },
        {
          path: 'method/editor/:id?',
          name: 'method-editor',
          component: () => import('@/views/method/MethodEditor.vue'),
          meta: { title: '方法编辑' }
        },
        
        // 工作流设计器
        {
          path: 'workflow/designer/:id?',
          name: 'workflow-designer',
          component: () => import('@/views/workflow/WorkflowDesigner.vue'),
          meta: { title: '工作流设计器' }
        },
        
        // 工作流模板管理
        {
          path: 'workflow/templates',
          name: 'workflow-templates',
          component: () => import('@/views/workflow/WorkflowTemplates.vue'),
          meta: { title: '工作流模板' }
        },
        
        // 任务管理
        {
          path: 'workflow/tasks',
          name: 'task-list',
          component: () => import('@/views/workflow/TaskList.vue'),
          meta: { title: '任务列表' }
        },
        {
          path: 'workflow/task/:id',
          name: 'task-detail',
          component: () => import('@/views/workflow/TaskDetail.vue'),
          meta: { title: '任务详情' }
        },
        {
          path: 'workflow/assignment',
          name: 'task-assignment',
          component: () => import('@/views/workflow/TaskAssignment.vue'),
          meta: { title: '任务派工' }
        },
        
        // 结果管理模块
        {
          path: 'result/entry',
          name: 'result-entry',
          component: () => import('@/views/result/ResultEntry.vue'),
          meta: { title: '结果录入' }
        },
        // 结果导入功能已隐藏
        // {
        //   path: 'result/import',
        //   name: 'result-import',
        //   component: () => import('@/views/result/ResultImport.vue'),
        //   meta: { title: '结果导入' }
        // },
        {
          path: 'result/formula',
          name: 'formula-config',
          component: () => import('@/views/result/FormulaConfig.vue'),
          meta: { title: '公式配置' }
        },
        {
          path: 'result/anomaly',
          name: 'anomaly-management',
          component: () => import('@/views/result/AnomalyManagement.vue'),
          meta: { title: '异常管理' }
        },
        {
          path: 'result/list',
          name: 'result-list',
          component: () => import('@/views/result/ResultList.vue'),
          meta: { title: '结果查询' }
        },
        
        // 审核与质量判定模块
        {
          path: 'audit/tasks',
          name: 'AuditTaskList',
          component: () => import('@/views/audit/AuditTaskList.vue'),
          meta: { title: '审核任务' }
        },
        {
          path: 'audit/task/:id',
          name: 'AuditTaskDetail',
          component: () => import('@/views/audit/AuditTaskDetail.vue'),
          meta: { title: '审核详情' }
        },
        {
          path: 'audit/execute',
          name: 'audit-execute',
          component: () => import('@/views/audit/AuditExecute.vue'),
          meta: { title: '审核执行' }
        },
        {
          path: 'audit/debug',
          name: 'audit-debug',
          component: () => import('@/views/audit/AuditDebug.vue'),
          meta: { title: '审核数据调试' }
        },
        {
          path: 'audit/statistics',
          name: 'audit-statistics',
          component: () => import('@/views/audit/AuditStatistics.vue'),
          meta: { title: '审核统计' }
        },
        {
          path: 'quality/judgment',
          name: 'quality-judgment',
          component: () => import('@/views/quality/QualityJudgment.vue'),
          meta: { title: '质量判定' }
        },
        
        // 报告管理模块
        {
          path: 'report/list',
          name: 'report-list',
          component: () => import('@/views/report/ReportList.vue'),
          meta: { title: '报告列表' }
        },
        {
          path: 'report/templates',
          name: 'report-template-list',
          component: () => import('@/views/report/ReportTemplateList.vue'),
          meta: { title: '报告模板' }
        },
        {
          path: 'report/template/:id?',
          name: 'report-template-editor',
          component: () => import('@/views/report/ReportTemplateEditor.vue'),
          meta: { title: '模板编辑' }
        },
        {
          path: 'report/generator',
          name: 'report-generator',
          component: () => import('@/views/report/ReportGenerator.vue'),
          meta: { title: '报告生成' }
        },
        {
          path: 'report/signature',
          name: 'electronic-signature',
          component: () => import('@/components/ElectronicSignature.vue'),
          meta: { title: '电子签名' }
        },
        {
          path: 'report/distribution',
          name: 'report-distribution',
          component: () => import('@/views/report/ReportDistribution.vue'),
          meta: { title: '报告分发' }
        },
        
        // 统计分析模块
        {
          path: 'statistics/dashboard',
          name: 'statistics-dashboard',
          component: () => import('@/views/statistics/StatisticsDashboard.vue'),
          meta: { title: '统计仪表板' }
        },
        {
          path: 'statistics/audit-report',
          name: 'audit-statistics-report',
          component: () => import('@/views/statistics/AuditStatisticsReport.vue'),
          meta: { title: '审核统计报表' }
        },
        {
          path: 'statistics/custom-report',
          name: 'custom-report-config',
          component: () => import('@/views/statistics/CustomReportConfig.vue'),
          meta: { title: '自定义报表' }
        },
        
        // 仪器管理模块
        {
          path: 'instrument/management',
          name: 'instrument-management',
          component: () => import('@/views/instrument/InstrumentManagement.vue'),
          meta: { title: '仪器管理' }
        },
        {
          path: 'instrument/registration',
          name: 'instrument-registration',
          component: () => import('@/views/instrument/InstrumentRegistration.vue'),
          meta: { title: '仪器登记' }
        },
        {
          path: 'instrument/detail/:id',
          name: 'instrument-detail',
          component: () => import('@/views/instrument/InstrumentDetail.vue'),
          meta: { title: '仪器详情' }
        },
        {
          path: 'instrument/statistics',
          name: 'instrument-statistics',
          component: () => import('@/views/instrument/InstrumentStatistics.vue'),
          meta: { title: '仪器统计' }
        },
        {
          path: 'instrument/transfer',
          name: 'instrument-transfer',
          component: () => import('@/views/instrument/InstrumentTransfer.vue'),
          meta: { title: '仪器流转管理' }
        },
        
        // AI智能分析模块
        {
          path: 'ai/analysis',
          name: 'ai-analysis',
          component: () => import('@/views/ai/AIAnalysis.vue'),
          meta: { title: 'AI智能分析' }
        },
        
        // AI Agent 智能体
        {
          path: 'ai/agent',
          name: 'ai-agent',
          component: () => import('@/views/ai/AgentAnalysis.vue'),
          meta: { title: 'AI Agent 智能体' }
        },
        
        // 系统管理模块
        {
          path: 'system/users',
          name: 'user-management',
          component: () => import('@/views/system/UserManagement.vue'),
          meta: { title: '用户管理' }
        },
        {
          path: 'system/roles',
          name: 'role-management',
          component: () => import('@/views/system/RoleManagement.vue'),
          meta: { title: '角色权限' }
        },
        {
          path: 'system/audit-log',
          name: 'audit-log-viewer',
          component: () => import('@/views/system/AuditLogViewer.vue'),
          meta: { title: '审计日志' }
        },
        {
          path: 'system/settings',
          name: 'system-settings',
          component: () => import('@/views/system/SystemSettings.vue'),
          meta: { title: '系统配置' }
        },
        
        // 通知中心
        // {
        //   path: 'notifications',
        //   name: 'notification-center',
        //   component: () => import('@/views/NotificationCenter.vue'),
        //   meta: { title: '通知中心' }
        // }
      ]
    },
    
    // 404 页面
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFound.vue'),
      meta: { title: '页面不存在' }
    }
  ]
})

// 路由守卫 - 认证检查和页面标题设置
router.beforeEach(async (to, from, next) => {
  console.log('[路由守卫] 触发')
  console.log('  - 从:', from.path)
  console.log('  - 到:', to.path)
  console.log('  - requiresAuth:', to.meta.requiresAuth)
  
  const authStore = useAuthStore()
  
  console.log('[路由守卫] 当前认证状态:')
  console.log('  - isAuthenticated:', authStore.isAuthenticated)
  console.log('  - accessToken:', authStore.accessToken ? '存在' : '不存在')
  console.log('  - user:', authStore.user)
  
  // 初始化认证状态（仅在首次访问时）
  if (!authStore.isAuthenticated && localStorage.getItem('accessToken')) {
    console.log('[路由守卫] 从 localStorage 初始化认证状态')
    authStore.initAuth()
    console.log('[路由守卫] 初始化后 isAuthenticated:', authStore.isAuthenticated)
  }
  
  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - 实验室智能管理系统`
  }
  
  // 检查是否需要认证
  if (to.meta.requiresAuth !== false) {
    console.log('[路由守卫] 页面需要认证')
    if (!authStore.isAuthenticated) {
      console.log('[路由守卫] 未认证，重定向到登录页')
      // 未登录，跳转到登录页
      next({
        path: '/login',
        query: { redirect: to.fullPath }
      })
      return
    }
    console.log('[路由守卫] 已认证，允许访问')
  } else {
    console.log('[路由守卫] 页面不需要认证')
    // 不需要认证的页面（如登录页）
    if (authStore.isAuthenticated && to.path === '/login') {
      console.log('[路由守卫] 已登录用户访问登录页，重定向到首页')
      // 已登录用户访问登录页，跳转到首页
      next('/')
      return
    }
  }
  
  console.log('[路由守卫] 允许导航')
  next()
})

export default router
