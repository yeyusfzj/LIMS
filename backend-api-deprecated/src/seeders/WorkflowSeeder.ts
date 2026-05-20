/**
 * 工作流实例生成器
 */

import { ISeeder, SeedContext, SeedResult, Priority } from './types';
import { DataFactory } from './DataFactory';
import { Validator } from './Validator';

export class WorkflowSeeder implements ISeeder {
  name = 'WorkflowSeeder';
  dependencies = ['SampleSeeder'];

  private factory = new DataFactory();

  async seed(context: SeedContext): Promise<SeedResult> {
    const startTime = Date.now();
    let recordsCreated = 0;
    let tasksCreated = 0;
    const errors: string[] = [];

    try {
      const { prisma, config, cache } = context;
      const { workflowInstanceRatio } = config;

      console.log(`\n🔄 开始生成工作流实例数据...`);

      // 从缓存获取样品
      const samples = cache.get('samples');
      if (!samples || samples.length === 0) {
        throw new Error('没有找到样品数据,请先运行 SampleSeeder');
      }

      // 获取已有用户
      const users = await prisma.user.findMany({ take: 10 });
      if (users.length === 0) {
        throw new Error('没有找到用户数据');
      }

      // 获取或创建工作流模板
      let workflows = await prisma.workflow.findMany({ where: { isActive: true } });
      
      if (workflows.length === 0) {
        // 创建一个默认工作流模板
        const defaultWorkflow = await prisma.workflow.create({
          data: {
            name: '标准检测流程',
            description: '标准样品检测工作流',
            version: 1,
            config: {
              nodes: [
                { id: 'node1', name: '样品登记', type: 'start' },
                { id: 'node2', name: '样品检测', type: 'task' },
                { id: 'node3', name: '结果审核', type: 'task' },
                { id: 'node4', name: '报告生成', type: 'task' },
                { id: 'node5', name: '完成', type: 'end' },
              ],
              edges: [
                { from: 'node1', to: 'node2' },
                { from: 'node2', to: 'node3' },
                { from: 'node3', to: 'node4' },
                { from: 'node4', to: 'node5' },
              ],
            },
            status: 'ACTIVE',
            isActive: true,
            createdBy: users[0].id,
            activatedAt: new Date(),
          },
        });
        workflows = [defaultWorkflow];
      }

      // 实例状态分布
      const statuses = [
        { status: 'RUNNING', weight: 0.3 },
        { status: 'COMPLETED', weight: 0.5 },
        { status: 'SUSPENDED', weight: 0.1 },
        { status: 'TERMINATED', weight: 0.1 },
      ];

      // 任务状态分布
      const taskStatuses = [
        { status: 'PENDING', weight: 0.2 },
        { status: 'ASSIGNED', weight: 0.15 },
        { status: 'IN_PROGRESS', weight: 0.15 },
        { status: 'COMPLETED', weight: 0.45 },
        { status: 'REJECTED', weight: 0.05 },
      ];

      // 为 60% 的样品创建工作流实例
      const sampleCount = Math.floor(samples.length * workflowInstanceRatio);
      const selectedSamples = samples.slice(0, sampleCount);

      for (const sample of selectedSamples) {
        // 随机选择工作流模板
        const workflow = this.factory.randomChoice(workflows);

        // 随机选择状态
        const statusInfo = this.factory.weightedChoice(
          statuses,
          statuses.map(s => s.weight)
        );

        // 获取工作流节点
        const nodes = (workflow.config as any).nodes || [];
        const currentNodes = statusInfo.status === 'RUNNING' && nodes.length > 0
          ? [nodes[Math.floor(Math.random() * nodes.length)].id]
          : [];

        const completedAt = statusInfo.status === 'COMPLETED' || statusInfo.status === 'TERMINATED'
          ? new Date(sample.updatedAt)
          : null;

        const instanceData = {
          workflowId: workflow.id,
          sampleId: sample.id,
          currentNodes,
          status: statusInfo.status,
          variables: {
            sampleType: sample.sampleType,
            priority: sample.priority,
          },
          startedAt: new Date(sample.createdAt),
          completedAt,
        };

        // 验证数据
        if (!Validator.validateWorkflowInstanceData(instanceData)) {
          errors.push(`样品 ${sample.sampleNumber} 的工作流实例验证失败`);
          continue;
        }

        // 创建工作流实例
        const instance = await prisma.workflowInstance.create({
          data: instanceData,
        });

        recordsCreated++;

        // 为实例生成 3-8 个任务
        const taskCount = Math.floor(Math.random() * 6) + 3;
        const tasks = [];

        for (let i = 0; i < taskCount && i < nodes.length; i++) {
          const node = nodes[i];

          // 随机选择任务状态
          const taskStatusInfo = this.factory.weightedChoice(
            taskStatuses,
            taskStatuses.map(s => s.weight)
          );

          const assignedTo = taskStatusInfo.status !== 'PENDING' 
            ? this.factory.randomChoice(users).id 
            : null;

          const assignedAt = assignedTo 
            ? new Date(instance.startedAt.getTime() + i * 3600000) 
            : null;

          const completedAt = taskStatusInfo.status === 'COMPLETED' || taskStatusInfo.status === 'REJECTED'
            ? new Date((assignedAt || instance.startedAt).getTime() + 7200000)
            : null;

          tasks.push({
            instanceId: instance.id,
            nodeId: node.id,
            nodeName: node.name,
            nodeType: node.type,
            assignedTo,
            assignedAt,
            status: taskStatusInfo.status,
            priority: sample.priority as Priority,
            result: taskStatusInfo.status === 'COMPLETED' ? { success: true } : null,
            completedAt,
            createdAt: instance.startedAt,
            updatedAt: completedAt || instance.startedAt,
          });
        }

        // 批量创建任务
        if (tasks.length > 0) {
          await prisma.task.createMany({ data: tasks });
          tasksCreated += tasks.length;
        }
      }

      console.log(`✅ 工作流实例数据生成完成: ${recordsCreated} 个实例, ${tasksCreated} 个任务`);

      // 更新统计
      context.stats.totalRecords += recordsCreated + tasksCreated;
      context.stats.recordsByModule['workflowInstances'] = recordsCreated;
      context.stats.recordsByModule['tasks'] = tasksCreated;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(errorMsg);
      console.error(`❌ 工作流实例数据生成失败: ${errorMsg}`);
    }

    return {
      seederName: this.name,
      recordsCreated: recordsCreated + tasksCreated,
      duration: Date.now() - startTime,
      errors,
    };
  }

  async clear(context: SeedContext): Promise<void> {
    console.log(`🗑️  清除工作流实例数据...`);
    await context.prisma.task.deleteMany({});
    await context.prisma.workflowInstance.deleteMany({});
    console.log(`✅ 工作流实例数据已清除`);
  }
}
