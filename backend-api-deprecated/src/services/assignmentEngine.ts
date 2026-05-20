/**
 * 自动派工引擎服务
 * 实现基于技能、工作负载等多种策略的自动派工
 */

import { PrismaClient, TaskStatus, Priority } from '@prisma/client'
import {
  AssignmentStrategy,
  AssignmentRule,
  AssignmentCandidate,
  AssignmentResult,
  AssignmentContext,
  UserSkill,
  WorkloadStatistics,
  AssignmentCondition,
} from '../types/assignment'
import logger from '../config/logger'

const prisma = new PrismaClient()

export class AssignmentEngine {
  private rules: AssignmentRule[] = []
  private userSkills: Map<string, UserSkill> = new Map()
  private enableAutoAssignment: boolean = true
  private fallbackToManual: boolean = true

  /**
   * 初始化派工引擎
   */
  async initialize() {
    // 从数据库或配置文件加载派工规则和用户技能
    // 这里使用硬编码的示例配置
    this.loadDefaultRules()
    await this.loadUserSkills()

    logger.info('派工引擎已初始化', {
      rulesCount: this.rules.length,
      usersCount: this.userSkills.size,
    })
  }

  /**
   * 加载默认派工规则
   */
  private loadDefaultRules() {
    this.rules = [
      {
        id: 'rule-1',
        name: '化学分析任务派工',
        nodeType: 'chemical_analysis',
        strategy: AssignmentStrategy.SKILL_BASED,
        priority: 100,
        conditions: [
          {
            field: 'sampleCategory',
            operator: 'equals',
            value: 'chemical',
          },
        ],
        isActive: true,
      },
      {
        id: 'rule-2',
        name: '微生物检测任务派工',
        nodeType: 'microbiology_test',
        strategy: AssignmentStrategy.SKILL_BASED,
        priority: 100,
        conditions: [
          {
            field: 'sampleCategory',
            operator: 'equals',
            value: 'microbiology',
          },
        ],
        isActive: true,
      },
      {
        id: 'rule-3',
        name: '紧急任务优先派工',
        nodeType: '*',
        strategy: AssignmentStrategy.WORKLOAD_BASED,
        priority: 200,
        conditions: [
          {
            field: 'priority',
            operator: 'equals',
            value: Priority.URGENT,
          },
        ],
        isActive: true,
      },
      {
        id: 'rule-4',
        name: '默认轮询派工',
        nodeType: '*',
        strategy: AssignmentStrategy.ROUND_ROBIN,
        priority: 1,
        isActive: true,
      },
    ]
  }

  /**
   * 加载用户技能配置
   */
  private async loadUserSkills() {
    // 从数据库加载用户技能
    // 这里使用示例数据
    const users = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, username: true, department: true, position: true },
    })

    // 根据部门和职位分配技能（示例逻辑）
    for (const user of users) {
      const skills: string[] = []

      if (user.department === '化学分析室' || user.position?.includes('化学')) {
        skills.push('chemical_analysis', 'sample_preparation')
      }

      if (user.department === '微生物室' || user.position?.includes('微生物')) {
        skills.push('microbiology_test', 'culture_preparation')
      }

      if (user.position?.includes('高级') || user.position?.includes('主管')) {
        skills.push('review', 'approval', 'quality_judgment')
      }

      // 如果没有特定技能，添加通用技能
      if (skills.length === 0) {
        skills.push('general')
      }

      this.userSkills.set(user.id, {
        userId: user.id,
        skills,
        maxConcurrentTasks: 10,
      })
    }

    logger.info(`已加载 ${this.userSkills.size} 个用户的技能配置`)
  }

  /**
   * 自动派工
   */
  async autoAssign(context: AssignmentContext): Promise<AssignmentResult> {
    try {
      logger.info(`开始自动派工: 任务 ${context.taskId}`, { context })

      if (!this.enableAutoAssignment) {
        return {
          success: false,
          taskId: context.taskId,
          reason: '自动派工功能已禁用',
        }
      }

      // 1. 查找匹配的派工规则
      const matchedRule = this.findMatchingRule(context)
      if (!matchedRule) {
        logger.warn(`未找到匹配的派工规则: 任务 ${context.taskId}`)
        return this.handleAssignmentFailure(context, '未找到匹配的派工规则')
      }

      logger.info(`使用派工规则: ${matchedRule.name}`, {
        taskId: context.taskId,
        ruleId: matchedRule.id,
        strategy: matchedRule.strategy,
      })

      // 2. 根据策略选择候选人
      const candidates = await this.findCandidates(context, matchedRule)
      if (candidates.length === 0) {
        logger.warn(`未找到合适的候选人: 任务 ${context.taskId}`)
        return this.handleAssignmentFailure(context, '未找到合适的候选人')
      }

      // 3. 选择最佳候选人
      const selectedCandidate = candidates[0] // 候选人已按分数排序

      // 4. 分配任务
      await this.assignTaskToUser(context.taskId, selectedCandidate.userId)

      logger.info(`任务已自动派工: ${context.taskId} -> ${selectedCandidate.username}`, {
        taskId: context.taskId,
        userId: selectedCandidate.userId,
        score: selectedCandidate.score,
        strategy: matchedRule.strategy,
      })

      return {
        success: true,
        taskId: context.taskId,
        assignedTo: selectedCandidate.userId,
        assignedUser: {
          id: selectedCandidate.userId,
          username: selectedCandidate.username,
          fullName: selectedCandidate.fullName,
        },
        candidates,
        strategy: matchedRule.strategy,
      }
    } catch (error) {
      logger.error(`自动派工失败: 任务 ${context.taskId}`, { error })
      return this.handleAssignmentFailure(context, `派工异常: ${error.message}`)
    }
  }

  /**
   * 查找匹配的派工规则
   */
  private findMatchingRule(context: AssignmentContext): AssignmentRule | null {
    // 按优先级排序规则
    const sortedRules = [...this.rules]
      .filter(rule => rule.isActive)
      .sort((a, b) => b.priority - a.priority)

    for (const rule of sortedRules) {
      // 检查节点类型是否匹配
      if (rule.nodeType !== '*' && rule.nodeType !== context.nodeType) {
        continue
      }

      // 检查条件是否满足
      if (rule.conditions && rule.conditions.length > 0) {
        const allConditionsMet = rule.conditions.every(condition =>
          this.evaluateCondition(condition, context)
        )
        if (!allConditionsMet) {
          continue
        }
      }

      return rule
    }

    return null
  }

  /**
   * 评估派工条件
   */
  private evaluateCondition(condition: AssignmentCondition, context: any): boolean {
    const fieldValue = context[condition.field]

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value
      case 'contains':
        return String(fieldValue).includes(String(condition.value))
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue)
      case 'greaterThan':
        return fieldValue > condition.value
      case 'lessThan':
        return fieldValue < condition.value
      default:
        return false
    }
  }

  /**
   * 查找候选人
   */
  private async findCandidates(
    context: AssignmentContext,
    rule: AssignmentRule
  ): Promise<AssignmentCandidate[]> {
    switch (rule.strategy) {
      case AssignmentStrategy.SKILL_BASED:
        return this.findCandidatesBySkill(context)
      case AssignmentStrategy.WORKLOAD_BASED:
        return this.findCandidatesByWorkload(context)
      case AssignmentStrategy.ROUND_ROBIN:
        return this.findCandidatesByRoundRobin(context)
      default:
        return []
    }
  }

  /**
   * 基于技能查找候选人
   */
  private async findCandidatesBySkill(
    context: AssignmentContext
  ): Promise<AssignmentCandidate[]> {
    const candidates: AssignmentCandidate[] = []

    // 确定所需技能
    const requiredSkills = this.getRequiredSkills(context.nodeType)

    // 获取所有活跃用户
    const users = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, username: true, fullName: true },
    })

    for (const user of users) {
      const userSkill = this.userSkills.get(user.id)
      if (!userSkill) continue

      // 检查用户是否具备所需技能
      const hasRequiredSkills = requiredSkills.some(skill =>
        userSkill.skills.includes(skill)
      )

      if (!hasRequiredSkills && !userSkill.skills.includes('general')) {
        continue
      }

      // 获取用户当前工作负载
      const workload = await this.getUserWorkload(user.id)

      // 检查是否超过最大并发任务数
      if (userSkill.maxConcurrentTasks !== undefined) {
        if (userSkill.maxConcurrentTasks === 0) {
          // 不允许接受任何任务
          continue
        }
        if (workload.inProgressTasks >= userSkill.maxConcurrentTasks) {
          continue
        }
      }

      // 计算匹配分数
      const score = this.calculateSkillScore(userSkill.skills, requiredSkills, workload)

      candidates.push({
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        score,
        currentWorkload: workload.totalTasks,
        skills: userSkill.skills,
        reason: `技能匹配，当前负载: ${workload.inProgressTasks} 个任务`,
      })
    }

    // 按分数降序排序
    return candidates.sort((a, b) => b.score - a.score)
  }

  /**
   * 基于工作负载查找候选人
   */
  private async findCandidatesByWorkload(
    context: AssignmentContext
  ): Promise<AssignmentCandidate[]> {
    const candidates: AssignmentCandidate[] = []

    // 获取所有活跃用户
    const users = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, username: true, fullName: true },
    })

    for (const user of users) {
      const userSkill = this.userSkills.get(user.id)
      if (!userSkill) continue

      // 获取用户当前工作负载
      const workload = await this.getUserWorkload(user.id)

      // 检查是否超过最大并发任务数
      if (userSkill.maxConcurrentTasks !== undefined) {
        if (userSkill.maxConcurrentTasks === 0) {
          // 不允许接受任何任务
          continue
        }
        if (workload.inProgressTasks >= userSkill.maxConcurrentTasks) {
          continue
        }
      }

      // 计算负载分数（负载越低分数越高）
      const score = this.calculateWorkloadScore(workload, userSkill.maxConcurrentTasks || 10)

      candidates.push({
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        score,
        currentWorkload: workload.totalTasks,
        skills: userSkill.skills,
        reason: `当前负载: ${workload.inProgressTasks} 个进行中任务，${workload.pendingTasks} 个待处理任务`,
      })
    }

    // 按分数降序排序（负载低的在前）
    return candidates.sort((a, b) => b.score - a.score)
  }

  /**
   * 轮询方式查找候选人
   */
  private async findCandidatesByRoundRobin(
    context: AssignmentContext
  ): Promise<AssignmentCandidate[]> {
    const candidates: AssignmentCandidate[] = []

    // 获取所有活跃用户
    const users = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, username: true, fullName: true },
      orderBy: { id: 'asc' }, // 按 ID 排序以保证顺序一致
    })

    // 获取最近分配的任务，找出上次分配给谁
    const lastAssignedTask = await prisma.task.findFirst({
      where: {
        nodeType: context.nodeType,
        assignedTo: { not: null },
      },
      orderBy: { assignedAt: 'desc' },
      select: { assignedTo: true },
    })

    // 找到上次分配用户的索引
    let startIndex = 0
    if (lastAssignedTask?.assignedTo) {
      const lastUserIndex = users.findIndex(u => u.id === lastAssignedTask.assignedTo)
      if (lastUserIndex >= 0) {
        startIndex = (lastUserIndex + 1) % users.length
      }
    }

    // 从下一个用户开始轮询
    for (let i = 0; i < users.length; i++) {
      const index = (startIndex + i) % users.length
      const user = users[index]

      const userSkill = this.userSkills.get(user.id)
      if (!userSkill) continue

      // 获取用户当前工作负载
      const workload = await this.getUserWorkload(user.id)

      // 检查是否超过最大并发任务数
      if (userSkill.maxConcurrentTasks !== undefined) {
        if (userSkill.maxConcurrentTasks === 0) {
          // 不允许接受任何任务
          continue
        }
        if (workload.inProgressTasks >= userSkill.maxConcurrentTasks) {
          continue
        }
      }

      candidates.push({
        userId: user.id,
        username: user.username,
        fullName: user.fullName,
        score: 100 - i, // 轮询顺序越靠前分数越高
        currentWorkload: workload.totalTasks,
        skills: userSkill.skills,
        reason: `轮询分配，顺序: ${i + 1}`,
      })
    }

    return candidates
  }

  /**
   * 获取所需技能
   */
  private getRequiredSkills(nodeType: string): string[] {
    // 根据节点类型确定所需技能
    const skillMap: Record<string, string[]> = {
      chemical_analysis: ['chemical_analysis'],
      microbiology_test: ['microbiology_test'],
      sample_preparation: ['sample_preparation'],
      review: ['review'],
      approval: ['approval'],
      quality_judgment: ['quality_judgment'],
    }

    return skillMap[nodeType] || ['general']
  }

  /**
   * 计算技能匹配分数
   */
  private calculateSkillScore(
    userSkills: string[],
    requiredSkills: string[],
    workload: WorkloadStatistics
  ): number {
    let score = 0

    // 技能匹配度（0-50分）
    const matchedSkills = requiredSkills.filter(skill => userSkills.includes(skill))
    score += (matchedSkills.length / requiredSkills.length) * 50

    // 工作负载（0-50分，负载越低分数越高）
    const workloadScore = Math.max(0, 50 - workload.inProgressTasks * 5)
    score += workloadScore

    return score
  }

  /**
   * 计算工作负载分数
   */
  private calculateWorkloadScore(workload: WorkloadStatistics, maxTasks: number): number {
    // 负载越低分数越高
    const loadRatio = workload.inProgressTasks / maxTasks
    return Math.max(0, 100 - loadRatio * 100)
  }

  /**
   * 获取用户工作负载
   */
  private async getUserWorkload(userId: string): Promise<WorkloadStatistics> {
    const [pendingTasks, inProgressTasks, totalTasks] = await Promise.all([
      prisma.task.count({
        where: {
          assignedTo: userId,
          status: TaskStatus.PENDING,
        },
      }),
      prisma.task.count({
        where: {
          assignedTo: userId,
          status: TaskStatus.IN_PROGRESS,
        },
      }),
      prisma.task.count({
        where: {
          assignedTo: userId,
          status: { in: [TaskStatus.PENDING, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS] },
        },
      }),
    ])

    return {
      userId,
      pendingTasks,
      inProgressTasks,
      totalTasks,
    }
  }

  /**
   * 分配任务给用户
   */
  private async assignTaskToUser(taskId: string, userId: string): Promise<void> {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        assignedTo: userId,
        assignedAt: new Date(),
        status: TaskStatus.ASSIGNED,
      },
    })
  }

  /**
   * 处理派工失败
   */
  private async handleAssignmentFailure(
    context: AssignmentContext,
    reason: string
  ): Promise<AssignmentResult> {
    if (this.fallbackToManual) {
      // 将任务标记为待分配状态
      await prisma.task.update({
        where: { id: context.taskId },
        data: {
          status: TaskStatus.PENDING,
        },
      })

      logger.info(`任务 ${context.taskId} 标记为待手动分配`, { reason })

      return {
        success: false,
        taskId: context.taskId,
        reason: `${reason}，已标记为待手动分配`,
      }
    }

    return {
      success: false,
      taskId: context.taskId,
      reason,
    }
  }

  /**
   * 添加派工规则
   */
  addRule(rule: AssignmentRule): void {
    this.rules.push(rule)
    logger.info(`已添加派工规则: ${rule.name}`, { ruleId: rule.id })
  }

  /**
   * 更新派工规则
   */
  updateRule(ruleId: string, updates: Partial<AssignmentRule>): boolean {
    const index = this.rules.findIndex(r => r.id === ruleId)
    if (index === -1) {
      return false
    }

    this.rules[index] = { ...this.rules[index], ...updates }
    logger.info(`已更新派工规则: ${ruleId}`, { updates })
    return true
  }

  /**
   * 删除派工规则
   */
  removeRule(ruleId: string): boolean {
    const index = this.rules.findIndex(r => r.id === ruleId)
    if (index === -1) {
      return false
    }

    this.rules.splice(index, 1)
    logger.info(`已删除派工规则: ${ruleId}`)
    return true
  }

  /**
   * 获取所有派工规则
   */
  getRules(): AssignmentRule[] {
    return [...this.rules]
  }

  /**
   * 设置用户技能
   */
  setUserSkill(userId: string, skill: UserSkill): void {
    this.userSkills.set(userId, skill)
    logger.info(`已设置用户技能: ${userId}`, { skills: skill.skills })
  }

  /**
   * 获取用户技能
   */
  getUserSkill(userId: string): UserSkill | undefined {
    return this.userSkills.get(userId)
  }

  /**
   * 启用/禁用自动派工
   */
  setAutoAssignmentEnabled(enabled: boolean): void {
    this.enableAutoAssignment = enabled
    logger.info(`自动派工已${enabled ? '启用' : '禁用'}`)
  }

  /**
   * 获取派工统计信息
   */
  async getAssignmentStatistics() {
    const [totalTasks, assignedTasks, pendingTasks, failedAssignments] = await Promise.all([
      prisma.task.count(),
      prisma.task.count({ where: { assignedTo: { not: null } } }),
      prisma.task.count({ where: { status: TaskStatus.PENDING } }),
      prisma.task.count({
        where: {
          status: TaskStatus.PENDING,
          assignedTo: null,
        },
      }),
    ])

    return {
      totalTasks,
      assignedTasks,
      pendingTasks,
      failedAssignments,
      assignmentRate: totalTasks > 0 ? (assignedTasks / totalTasks) * 100 : 0,
    }
  }
}

export default new AssignmentEngine()
