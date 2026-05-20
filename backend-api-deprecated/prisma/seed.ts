import { PrismaClient, MethodStatus } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('开始数据库种子...')

  // 首先创建所有权限
  const permissions = [
    { resource: 'user', action: 'create' },
    { resource: 'user', action: 'read' },
    { resource: 'user', action: 'update' },
    { resource: 'user', action: 'delete' },
    { resource: 'sample', action: 'create' },
    { resource: 'sample', action: 'read' },
    { resource: 'sample', action: 'update' },
    { resource: 'sample', action: 'delete' },
    { resource: 'workflow', action: 'create' },
    { resource: 'workflow', action: 'read' },
    { resource: 'workflow', action: 'update' },
    { resource: 'workflow', action: 'delete' },
    { resource: 'workflow', action: 'execute' },
    { resource: 'report', action: 'create' },
    { resource: 'report', action: 'read' },
    { resource: 'report', action: 'update' },
    { resource: 'report', action: 'delete' },
    { resource: 'report', action: 'sign' },
    { resource: 'report', action: 'distribute' },
    { resource: 'result', action: 'create' },
    { resource: 'result', action: 'read' },
    { resource: 'result', action: 'update' },
    { resource: 'result', action: 'delete' },
    { resource: 'method', action: 'create' },
    { resource: 'method', action: 'read' },
    { resource: 'method', action: 'update' },
    { resource: 'method', action: 'delete' },
    { resource: 'audit', action: 'create' },
    { resource: 'audit', action: 'read' },
    { resource: 'audit', action: 'update' },
    { resource: 'audit', action: 'delete' },
    { resource: 'audit', action: 'approve' },
    // 仪器管理权限
    { resource: 'instrument', action: 'create' },
    { resource: 'instrument', action: 'read' },
    { resource: 'instrument', action: 'update' },
    { resource: 'instrument', action: 'delete' },
    { resource: 'transfer', action: 'create' },
    { resource: 'transfer', action: 'read' },
    { resource: 'transfer', action: 'confirm' },
    { resource: 'maintenance', action: 'create' },
    { resource: 'maintenance', action: 'read' },
    { resource: 'maintenance', action: 'update' },
    { resource: 'maintenance', action: 'delete' },
    { resource: 'calibration', action: 'create' },
    { resource: 'calibration', action: 'read' },
    { resource: 'calibration', action: 'update' },
    { resource: 'calibration', action: 'delete' },
    { resource: 'disposal', action: 'create' },
    { resource: 'disposal', action: 'read' },
    { resource: 'disposal', action: 'approve' },
    { resource: 'document', action: 'create' },
    { resource: 'document', action: 'read' },
    { resource: 'document', action: 'delete' }
  ]

  // 创建权限记录
  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { resource_action: { resource: perm.resource, action: perm.action } },
      update: {},
      create: perm
    })
  }

  console.log('权限创建完成')

  // 获取权限 ID
  const allPermissions = await prisma.permission.findMany()
  const getPermissionId = (resource: string, action: string) => {
    const perm = allPermissions.find(p => p.resource === resource && p.action === action)
    return perm?.id
  }

  // 创建默认角色
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: '系统管理员',
      permissions: {
        connect: [
          { id: getPermissionId('user', 'create') },
          { id: getPermissionId('user', 'read') },
          { id: getPermissionId('user', 'update') },
          { id: getPermissionId('user', 'delete') },
          { id: getPermissionId('sample', 'create') },
          { id: getPermissionId('sample', 'read') },
          { id: getPermissionId('sample', 'update') },
          { id: getPermissionId('sample', 'delete') },
          { id: getPermissionId('workflow', 'create') },
          { id: getPermissionId('workflow', 'read') },
          { id: getPermissionId('workflow', 'update') },
          { id: getPermissionId('workflow', 'delete') },
          { id: getPermissionId('workflow', 'execute') },
          { id: getPermissionId('report', 'create') },
          { id: getPermissionId('report', 'read') },
          { id: getPermissionId('report', 'update') },
          { id: getPermissionId('report', 'delete') },
          { id: getPermissionId('report', 'sign') },
          { id: getPermissionId('report', 'distribute') },
          { id: getPermissionId('method', 'create') },
          { id: getPermissionId('method', 'read') },
          { id: getPermissionId('method', 'update') },
          { id: getPermissionId('method', 'delete') },
          { id: getPermissionId('audit', 'create') },
          { id: getPermissionId('audit', 'read') },
          { id: getPermissionId('audit', 'update') },
          { id: getPermissionId('audit', 'delete') },
          { id: getPermissionId('audit', 'approve') },
          // 仪器管理权限
          { id: getPermissionId('instrument', 'create') },
          { id: getPermissionId('instrument', 'read') },
          { id: getPermissionId('instrument', 'update') },
          { id: getPermissionId('instrument', 'delete') },
          { id: getPermissionId('transfer', 'create') },
          { id: getPermissionId('transfer', 'read') },
          { id: getPermissionId('transfer', 'confirm') },
          { id: getPermissionId('maintenance', 'create') },
          { id: getPermissionId('maintenance', 'read') },
          { id: getPermissionId('maintenance', 'update') },
          { id: getPermissionId('maintenance', 'delete') },
          { id: getPermissionId('calibration', 'create') },
          { id: getPermissionId('calibration', 'read') },
          { id: getPermissionId('calibration', 'update') },
          { id: getPermissionId('calibration', 'delete') },
          { id: getPermissionId('disposal', 'create') },
          { id: getPermissionId('disposal', 'read') },
          { id: getPermissionId('disposal', 'approve') },
          { id: getPermissionId('document', 'create') },
          { id: getPermissionId('document', 'read') },
          { id: getPermissionId('document', 'delete') }
        ].filter(Boolean)
      }
    }
  })

  const userRole = await prisma.role.upsert({
    where: { name: 'user' },
    update: {},
    create: {
      name: 'user',
      description: '普通用户',
      permissions: {
        connect: [
          { id: getPermissionId('sample', 'read') },
          { id: getPermissionId('workflow', 'read') },
          { id: getPermissionId('report', 'read') },
          // 仪器管理基本权限
          { id: getPermissionId('instrument', 'read') },
          { id: getPermissionId('transfer', 'create') },
          { id: getPermissionId('transfer', 'read') }
        ].filter(Boolean)
      }
    }
  })

  const labTechRole = await prisma.role.upsert({
    where: { name: 'lab_technician' },
    update: {},
    create: {
      name: 'lab_technician',
      description: '实验室技术员',
      permissions: {
        connect: [
          { id: getPermissionId('sample', 'create') },
          { id: getPermissionId('sample', 'read') },
          { id: getPermissionId('sample', 'update') },
          { id: getPermissionId('result', 'create') },
          { id: getPermissionId('result', 'read') },
          { id: getPermissionId('result', 'update') },
          { id: getPermissionId('workflow', 'create') },
          { id: getPermissionId('workflow', 'read') },
          { id: getPermissionId('workflow', 'update') },
          { id: getPermissionId('method', 'read') },
          { id: getPermissionId('method', 'update') },
          // 仪器管理权限
          { id: getPermissionId('instrument', 'read') },
          { id: getPermissionId('transfer', 'create') },
          { id: getPermissionId('transfer', 'read') },
          { id: getPermissionId('maintenance', 'create') },
          { id: getPermissionId('maintenance', 'read') },
          { id: getPermissionId('calibration', 'read') },
          { id: getPermissionId('document', 'read') }
        ].filter(Boolean)
      }
    }
  })

  console.log('角色创建完成')

  // 创建测试用户
  const adminPasswordHash = await bcrypt.hash('Admin@123456', 12)
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPasswordHash,
      email: 'admin@example.com',
      fullName: '系统管理员',
      department: 'IT部门',
      position: '系统管理员',
      status: 'ACTIVE',
      roles: {
        create: {
          roleId: adminRole.id
        }
      }
    }
  })

  const userPasswordHash = await bcrypt.hash('User@123456', 12)
  const testUser = await prisma.user.upsert({
    where: { username: 'testuser' },
    update: {},
    create: {
      username: 'testuser',
      passwordHash: userPasswordHash,
      email: 'testuser@example.com',
      fullName: '测试用户',
      department: '实验室',
      position: '技术员',
      status: 'ACTIVE',
      roles: {
        create: [
          { roleId: userRole.id },
          { roleId: labTechRole.id }
        ]
      }
    }
  })

  console.log('测试用户创建完成')
  console.log('管理员账号: admin / Admin@123456')
  console.log('测试账号: testuser / User@123456')

  // 创建工作流模板数据
  console.log('开始创建工作流模板数据...')

  const workflowTemplates = [
    {
      name: '水质检测标准流程',
      description: '适用于各类水质样品的标准检测工作流程',
      version: 1,
      isActive: true,
      createdBy: adminUser.id,
      config: {
        nodes: [
          {
            id: 'start-1',
            type: 'START',
            name: '流程开始',
            description: '水质检测流程开始节点'
          },
          {
            id: 'task-1',
            type: 'TASK',
            name: '样品接收',
            description: '接收并登记水质样品'
          },
          {
            id: 'task-2',
            type: 'TASK',
            name: '样品预处理',
            description: '对水质样品进行预处理'
          },
          {
            id: 'decision-1',
            type: 'DECISION',
            name: '检测项目判断',
            description: '根据样品类型确定检测项目'
          },
          {
            id: 'task-3',
            type: 'TASK',
            name: '理化检测',
            description: '进行理化指标检测'
          },
          {
            id: 'task-4',
            type: 'TASK',
            name: '微生物检测',
            description: '进行微生物指标检测'
          },
          {
            id: 'task-5',
            type: 'TASK',
            name: '数据审核',
            description: '审核检测数据'
          },
          {
            id: 'end-1',
            type: 'END',
            name: '流程结束',
            description: '水质检测流程结束'
          }
        ],
        edges: [
          { id: 'edge-1', source: 'start-1', target: 'task-1' },
          { id: 'edge-2', source: 'task-1', target: 'task-2' },
          { id: 'edge-3', source: 'task-2', target: 'decision-1' },
          { id: 'edge-4', source: 'decision-1', target: 'task-3', condition: 'needPhysicalTest' },
          { id: 'edge-5', source: 'decision-1', target: 'task-4', condition: 'needMicroTest' },
          { id: 'edge-6', source: 'task-3', target: 'task-5' },
          { id: 'edge-7', source: 'task-4', target: 'task-5' },
          { id: 'edge-8', source: 'task-5', target: 'end-1' }
        ]
      }
    },
    {
      name: '土壤检测标准流程',
      description: '适用于土壤样品的标准检测工作流程',
      version: 1,
      isActive: true,
      createdBy: adminUser.id,
      config: {
        nodes: [
          {
            id: 'start-2',
            type: 'START',
            name: '流程开始',
            description: '土壤检测流程开始节点'
          },
          {
            id: 'task-6',
            type: 'TASK',
            name: '样品接收',
            description: '接收并登记土壤样品'
          },
          {
            id: 'task-7',
            type: 'TASK',
            name: '样品制备',
            description: '土壤样品风干、研磨、过筛'
          },
          {
            id: 'task-8',
            type: 'TASK',
            name: '重金属检测',
            description: '检测土壤中重金属含量'
          },
          {
            id: 'task-9',
            type: 'TASK',
            name: '有机物检测',
            description: '检测土壤中有机污染物'
          },
          {
            id: 'task-10',
            type: 'TASK',
            name: '结果评估',
            description: '评估土壤污染程度'
          },
          {
            id: 'end-2',
            type: 'END',
            name: '流程结束',
            description: '土壤检测流程结束'
          }
        ],
        edges: [
          { id: 'edge-9', source: 'start-2', target: 'task-6' },
          { id: 'edge-10', source: 'task-6', target: 'task-7' },
          { id: 'edge-11', source: 'task-7', target: 'task-8' },
          { id: 'edge-12', source: 'task-7', target: 'task-9' },
          { id: 'edge-13', source: 'task-8', target: 'task-10' },
          { id: 'edge-14', source: 'task-9', target: 'task-10' },
          { id: 'edge-15', source: 'task-10', target: 'end-2' }
        ]
      }
    },
    {
      name: '食品安全检测流程',
      description: '食品样品安全检测的标准工作流程',
      version: 1,
      isActive: false,
      createdBy: testUser.id,
      config: {
        nodes: [
          {
            id: 'start-3',
            type: 'START',
            name: '流程开始',
            description: '食品检测流程开始'
          },
          {
            id: 'task-11',
            type: 'TASK',
            name: '样品登记',
            description: '登记食品样品信息'
          },
          {
            id: 'task-12',
            type: 'TASK',
            name: '农残检测',
            description: '检测农药残留'
          },
          {
            id: 'task-13',
            type: 'TASK',
            name: '添加剂检测',
            description: '检测食品添加剂'
          },
          {
            id: 'end-3',
            type: 'END',
            name: '流程结束',
            description: '食品检测流程结束'
          }
        ],
        edges: [
          { id: 'edge-16', source: 'start-3', target: 'task-11' },
          { id: 'edge-17', source: 'task-11', target: 'task-12' },
          { id: 'edge-18', source: 'task-12', target: 'task-13' },
          { id: 'edge-19', source: 'task-13', target: 'end-3' }
        ]
      }
    }
  ]

  // 创建工作流模板记录
  for (const template of workflowTemplates) {
    // 检查是否已存在同名工作流
    const existing = await prisma.workflow.findFirst({
      where: { name: template.name }
    })
    
    if (!existing) {
      await prisma.workflow.create({
        data: template
      })
    }
  }

  console.log('工作流模板数据创建完成')
  console.log(`已创建 ${workflowTemplates.length} 个工作流模板`)

  // 创建检测方法数据
  console.log('开始创建检测方法数据...')

  const testMethods = [
    {
      code: 'GB/T 5750.4-2006',
      name: '生活饮用水标准检验方法-感官性状和物理指标',
      category: '水质检测',
      version: 'V1.0',
      status: MethodStatus.ACTIVE,
      scope: '适用于生活饮用水及其水源水',
      description: '本标准规定了生活饮用水感官性状和物理指标的检验方法',
      equipment: [
        {
          name: '分光光度计',
          model: '722N',
          accuracy: '±0.5%',
          calibration: '每季度校准一次'
        },
        {
          name: 'pH计',
          model: 'PHS-3C',
          accuracy: '±0.01pH',
          calibration: '每月校准一次'
        }
      ],
      steps: [
        {
          title: '样品准备',
          description: '取适量水样，确保样品代表性'
        },
        {
          title: '仪器校准',
          description: '使用标准溶液校准仪器'
        },
        {
          title: '测定',
          description: '按照标准方法进行测定'
        },
        {
          title: '数据记录',
          description: '记录测定结果并计算'
        }
      ],
      precision: 'RSD ≤ 5%',
      accuracy: '回收率 95-105%',
      detectionLimit: '0.01 mg/L',
      measurementRange: '0.01-10 mg/L',
      qualityControl: '每批样品做平行样和加标回收',
      safetyNotes: '注意化学试剂的安全使用，佩戴防护用品',
      operationNotes: '严格按照标准操作程序进行，注意环境温度和湿度',
      createdBy: adminUser.id
    },
    {
      code: 'HJ 634-2012',
      name: '土壤氨氮、亚硝酸盐氮、硝酸盐氮的测定',
      category: '土壤检测',
      version: 'V1.0',
      status: MethodStatus.ACTIVE,
      scope: '适用于各类土壤样品',
      description: '采用氯化钾溶液提取，流动注射分析仪测定',
      equipment: [
        {
          name: '流动注射分析仪',
          model: 'FIA-6000',
          accuracy: '±2%',
          calibration: '每月校准一次'
        },
        {
          name: '振荡器',
          model: 'SHA-B',
          accuracy: '±5 rpm',
          calibration: '每半年校准一次'
        }
      ],
      steps: [
        {
          title: '样品提取',
          description: '称取10g土样，加入50mL氯化钾溶液，振荡30分钟'
        },
        {
          title: '过滤',
          description: '用滤纸过滤提取液'
        },
        {
          title: '上机测定',
          description: '使用流动注射分析仪测定'
        },
        {
          title: '结果计算',
          description: '根据标准曲线计算含量'
        }
      ],
      precision: 'RSD ≤ 10%',
      accuracy: '回收率 90-110%',
      detectionLimit: '0.5 mg/kg',
      measurementRange: '0.5-100 mg/kg',
      qualityControl: '每10个样品做1个平行样和1个加标样',
      safetyNotes: '注意氯化钾溶液的配制和保存',
      operationNotes: '提取时间和振荡速度要严格控制',
      createdBy: adminUser.id
    },
    {
      code: 'GB 5009.12-2017',
      name: '食品中铅的测定',
      category: '食品检测',
      version: 'V2.0',
      status: MethodStatus.ACTIVE,
      scope: '适用于各类食品中铅含量的测定',
      description: '采用石墨炉原子吸收光谱法测定食品中的铅',
      equipment: [
        {
          name: '原子吸收光谱仪',
          model: 'AA-7000',
          accuracy: '±3%',
          calibration: '每月校准一次'
        },
        {
          name: '微波消解仪',
          model: 'MARS 6',
          accuracy: '±5°C',
          calibration: '每季度校准一次'
        }
      ],
      steps: [
        {
          title: '样品消解',
          description: '称取样品，加入硝酸，微波消解'
        },
        {
          title: '定容',
          description: '消解液冷却后定容至50mL'
        },
        {
          title: '测定',
          description: '使用石墨炉原子吸收光谱仪测定'
        },
        {
          title: '计算',
          description: '根据标准曲线计算铅含量'
        }
      ],
      precision: 'RSD ≤ 8%',
      accuracy: '回收率 85-115%',
      detectionLimit: '0.01 mg/kg',
      measurementRange: '0.01-1.0 mg/kg',
      qualityControl: '每批样品做空白、平行样和加标回收',
      safetyNotes: '微波消解时注意安全，防止高温高压',
      operationNotes: '消解程序要严格按照仪器说明书设置',
      createdBy: testUser.id
    },
    {
      code: 'HJ 828-2017',
      name: '水质化学需氧量的测定',
      category: '水质检测',
      version: 'V1.0',
      status: MethodStatus.DRAFT,
      scope: '适用于地表水、地下水、生活污水和工业废水',
      description: '重铬酸盐法测定水中化学需氧量',
      equipment: [
        {
          name: 'COD消解器',
          model: 'DRB200',
          accuracy: '±2°C',
          calibration: '每月校准一次'
        },
        {
          name: '滴定管',
          model: '50mL',
          accuracy: '±0.05mL',
          calibration: '每年校准一次'
        }
      ],
      steps: [
        {
          title: '取样',
          description: '取20mL水样于消解管中'
        },
        {
          title: '加试剂',
          description: '加入重铬酸钾溶液和硫酸银-硫酸溶液'
        },
        {
          title: '消解',
          description: '165°C消解2小时'
        },
        {
          title: '滴定',
          description: '冷却后用硫酸亚铁铵溶液滴定'
        }
      ],
      precision: 'RSD ≤ 5%',
      accuracy: '回收率 90-110%',
      detectionLimit: '5 mg/L',
      measurementRange: '5-500 mg/L',
      qualityControl: '每批样品做空白试验和平行样',
      safetyNotes: '注意高温和强酸的安全防护',
      operationNotes: '消解温度和时间要严格控制',
      createdBy: adminUser.id
    }
  ]

  for (const method of testMethods) {
    const existing = await prisma.testMethod.findUnique({
      where: { code: method.code }
    })
    
    if (!existing) {
      await prisma.testMethod.create({
        data: method
      })
    }
  }

  console.log('检测方法数据创建完成')
  console.log(`已创建 ${testMethods.length} 个检测方法`)

  // 创建样品示例数据
  console.log('开始创建样品示例数据...')

  const samples = []
  
  // 创建3个样品用于审核任务
  const sample1 = await prisma.sample.upsert({
    where: { barcode: 'SAMPLE-2024-001' },
    update: {},
    create: {
      barcode: 'SAMPLE-2024-001',
      sampleNumber: 'S2024001',
      clientName: '某环保公司',
      clientContact: '13800138001',
      sampleName: '工业废水样品',
      sampleType: '水质',
      sampleCategory: '废水',
      quantity: 500,
      unit: 'mL',
      receivedDate: new Date('2024-01-15'),
      samplingDate: new Date('2024-01-14'),
      samplingLocation: '某工厂排污口',
      samplingPerson: '张三',
      storageLocation: 'A区-01号冷藏柜',
      storageCondition: '4°C冷藏',
      status: 'IN_AUDIT',
      priority: 'HIGH',
      description: '工业废水检测样品',
      createdBy: testUser.id
    }
  })
  samples.push(sample1)

  const sample2 = await prisma.sample.upsert({
    where: { barcode: 'SAMPLE-2024-002' },
    update: {},
    create: {
      barcode: 'SAMPLE-2024-002',
      sampleNumber: 'S2024002',
      clientName: '某农业公司',
      clientContact: '13900139002',
      sampleName: '土壤样品',
      sampleType: '土壤',
      sampleCategory: '农田土壤',
      quantity: 1000,
      unit: 'g',
      receivedDate: new Date('2024-01-16'),
      samplingDate: new Date('2024-01-15'),
      samplingLocation: '某农场A区',
      samplingPerson: '李四',
      storageLocation: 'B区-05号样品柜',
      storageCondition: '常温避光',
      status: 'AUDIT_COMPLETE',
      priority: 'NORMAL',
      description: '农田土壤重金属检测',
      createdBy: testUser.id
    }
  })
  samples.push(sample2)

  const sample3 = await prisma.sample.upsert({
    where: { barcode: 'SAMPLE-2024-003' },
    update: {},
    create: {
      barcode: 'SAMPLE-2024-003',
      sampleNumber: 'S2024003',
      clientName: '某食品厂',
      clientContact: '13700137003',
      sampleName: '蔬菜样品',
      sampleType: '食品',
      sampleCategory: '蔬菜',
      quantity: 500,
      unit: 'g',
      receivedDate: new Date('2024-01-17'),
      samplingDate: new Date('2024-01-17'),
      samplingLocation: '某超市',
      samplingPerson: '王五',
      storageLocation: 'A区-03号冷藏柜',
      storageCondition: '4°C冷藏',
      status: 'TESTING_COMPLETE',
      priority: 'URGENT',
      description: '蔬菜农药残留检测',
      createdBy: adminUser.id
    }
  })
  samples.push(sample3)

  console.log('样品示例数据创建完成')
  console.log(`已创建 ${samples.length} 个样品`)

  // 为样品创建检测项目
  console.log('开始创建检测项目数据...')

  await prisma.testItem.upsert({
    where: { id: 'test-item-001' },
    update: {},
    create: {
      id: 'test-item-001',
      sampleId: sample1.id,
      testMethod: 'GB/T 5750.4-2006',
      testStandard: 'GB 5749-2006',
      testParameters: { parameters: ['pH', 'COD', '浊度'] },
      status: 'COMPLETED',
      assignedTo: testUser.id,
      assignedAt: new Date('2024-01-15T10:00:00'),
      completedAt: new Date('2024-01-16T16:00:00')
    }
  })

  await prisma.testItem.upsert({
    where: { id: 'test-item-002' },
    update: {},
    create: {
      id: 'test-item-002',
      sampleId: sample2.id,
      testMethod: 'HJ 634-2012',
      testStandard: 'GB 15618-2018',
      testParameters: { parameters: ['铅', '镉', '汞', '砷'] },
      status: 'COMPLETED',
      assignedTo: testUser.id,
      assignedAt: new Date('2024-01-16T09:00:00'),
      completedAt: new Date('2024-01-17T15:00:00')
    }
  })

  await prisma.testItem.upsert({
    where: { id: 'test-item-003' },
    update: {},
    create: {
      id: 'test-item-003',
      sampleId: sample3.id,
      testMethod: 'GB 5009.12-2017',
      testStandard: 'GB 2763-2021',
      testParameters: { parameters: ['有机磷', '氨基甲酸酯类'] },
      status: 'COMPLETED',
      assignedTo: adminUser.id,
      assignedAt: new Date('2024-01-17T10:00:00'),
      completedAt: new Date('2024-01-18T14:00:00')
    }
  })

  console.log('检测项目数据创建完成')

  // 为样品创建检测结果
  console.log('开始创建检测结果数据...')

  await prisma.result.upsert({
    where: { id: 'result-001' },
    update: {},
    create: {
      id: 'result-001',
      sampleId: sample1.id,
      testItemId: 'test-item-001',
      parameter: 'pH',
      value: 7.2,
      unit: '',
      method: 'GB/T 5750.4-2006',
      source: 'MANUAL',
      enteredBy: testUser.id,
      enteredAt: new Date('2024-01-16T16:00:00')
    }
  })

  await prisma.result.upsert({
    where: { id: 'result-002' },
    update: {},
    create: {
      id: 'result-002',
      sampleId: sample1.id,
      testItemId: 'test-item-001',
      parameter: 'COD',
      value: 45.5,
      unit: 'mg/L',
      method: 'GB/T 5750.4-2006',
      source: 'INSTRUMENT',
      instrumentId: 'INST-001',
      enteredBy: testUser.id,
      enteredAt: new Date('2024-01-16T16:10:00')
    }
  })

  await prisma.result.upsert({
    where: { id: 'result-003' },
    update: {},
    create: {
      id: 'result-003',
      sampleId: sample2.id,
      testItemId: 'test-item-002',
      parameter: '铅',
      value: 25.3,
      unit: 'mg/kg',
      method: 'HJ 634-2012',
      source: 'INSTRUMENT',
      instrumentId: 'INST-002',
      enteredBy: testUser.id,
      enteredAt: new Date('2024-01-17T15:00:00')
    }
  })

  await prisma.result.upsert({
    where: { id: 'result-004' },
    update: {},
    create: {
      id: 'result-004',
      sampleId: sample3.id,
      testItemId: 'test-item-003',
      parameter: '有机磷',
      value: 0.08,
      unit: 'mg/kg',
      method: 'GB 5009.12-2017',
      source: 'MANUAL',
      enteredBy: adminUser.id,
      enteredAt: new Date('2024-01-18T14:00:00')
    }
  })

  console.log('检测结果数据创建完成')

  // 创建审核任务示例数据
  console.log('开始创建审核任务示例数据...')

  // 审核任务1: 待审核状态
  await prisma.auditTask.upsert({
    where: { id: 'audit-task-001' },
    update: {},
    create: {
      id: 'audit-task-001',
      sampleId: sample1.id,
      level: 1,
      auditorId: adminUser.id,
      status: 'PENDING',
      submittedAt: new Date('2024-01-16T17:00:00')
    }
  })

  // 审核任务2: 已通过状态
  await prisma.auditTask.upsert({
    where: { id: 'audit-task-002' },
    update: {},
    create: {
      id: 'audit-task-002',
      sampleId: sample2.id,
      level: 1,
      auditorId: adminUser.id,
      status: 'APPROVED',
      decision: 'APPROVE',
      comments: '检测数据准确，符合标准要求',
      submittedAt: new Date('2024-01-17T16:00:00'),
      completedAt: new Date('2024-01-17T17:30:00')
    }
  })

  // 审核任务3: 已通过状态(第二级)
  await prisma.auditTask.upsert({
    where: { id: 'audit-task-003' },
    update: {},
    create: {
      id: 'audit-task-003',
      sampleId: sample2.id,
      level: 2,
      auditorId: testUser.id,
      status: 'APPROVED',
      decision: 'APPROVE',
      comments: '复审通过，数据可靠',
      submittedAt: new Date('2024-01-17T17:30:00'),
      completedAt: new Date('2024-01-18T09:00:00')
    }
  })

  // 审核任务4: 已退回状态
  await prisma.auditTask.upsert({
    where: { id: 'audit-task-004' },
    update: {},
    create: {
      id: 'audit-task-004',
      sampleId: sample3.id,
      level: 1,
      auditorId: adminUser.id,
      status: 'REJECTED',
      decision: 'REJECT',
      comments: '检测数据异常，需要重新检测',
      submittedAt: new Date('2024-01-18T15:00:00'),
      completedAt: new Date('2024-01-18T16:00:00')
    }
  })

  console.log('审核任务示例数据创建完成')
  console.log('已创建 4 个审核任务')
}

main()
  .catch((e) => {
    console.error('数据库种子失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
