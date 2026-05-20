// 模拟数据中心
// 用于前端展示，暂不实现真实后端集成

// 样品数据
export const mockSamples = [
  {
    id: 1,
    barcode: 'S20240123-001',
    name: '水质样品',
    source: '某某河流',
    client: '某某环保公司',
    receiveDate: '2024-01-23',
    sampleType: '水质',
    quantity: 1,
    unit: '瓶',
    status: '检测中',
    statusType: 'warning',
    location: '样品室A-01',
    storage: '常温',
    description: '河流水质检测样品',
    testItems: ['pH值', '溶解氧', 'COD', '氨氮'],
    assignee: '张三',
    priority: '高'
  },
  {
    id: 2,
    barcode: 'S20240123-002',
    name: '土壤样品',
    source: '某某工地',
    client: '某某建筑公司',
    receiveDate: '2024-01-23',
    sampleType: '土壤',
    quantity: 2,
    unit: '袋',
    status: '已完成',
    statusType: 'success',
    location: '样品室B-05',
    storage: '常温',
    description: '工地土壤污染检测',
    testItems: ['重金属', 'pH值', '有机质'],
    assignee: '李四',
    priority: '中'
  },
  {
    id: 3,
    barcode: 'S20240123-003',
    name: '空气样品',
    source: '某某工厂',
    client: '某某制造公司',
    receiveDate: '2024-01-22',
    sampleType: '空气',
    quantity: 1,
    unit: '罐',
    status: '待检测',
    statusType: 'info',
    location: '样品室C-12',
    storage: '常温',
    description: '工厂废气检测',
    testItems: ['PM2.5', 'PM10', 'SO2', 'NOx'],
    assignee: '王五',
    priority: '高'
  },
  {
    id: 4,
    barcode: 'S20240122-015',
    name: '食品样品',
    source: '某某超市',
    client: '某某食品公司',
    receiveDate: '2024-01-22',
    sampleType: '食品',
    quantity: 3,
    unit: '份',
    status: '审核中',
    statusType: 'warning',
    location: '样品室D-08',
    storage: '冷藏',
    description: '食品安全检测',
    testItems: ['微生物', '农药残留', '重金属'],
    assignee: '赵六',
    priority: '高'
  },
  {
    id: 5,
    barcode: 'S20240122-010',
    name: '水质样品',
    source: '某某水库',
    client: '某某水务公司',
    receiveDate: '2024-01-22',
    sampleType: '水质',
    quantity: 2,
    unit: '瓶',
    status: '已完成',
    statusType: 'success',
    location: '样品室A-15',
    storage: '常温',
    description: '水库水质监测',
    testItems: ['浊度', '总磷', '总氮', '叶绿素'],
    assignee: '张三',
    priority: '中'
  }
]

// 任务数据
export const mockTasks = [
  {
    id: 1,
    taskNo: 'T20240123-001',
    title: '水质检测任务',
    sampleId: 1,
    sampleBarcode: 'S20240123-001',
    sampleName: '水质样品',
    testMethod: 'GB 3838-2002',
    assignee: '张三',
    status: '进行中',
    statusType: 'warning',
    priority: '高',
    createTime: '2024-01-23 09:00',
    deadline: '2024-01-25 18:00',
    progress: 60,
    description: '按照国标进行水质检测'
  },
  {
    id: 2,
    taskNo: 'T20240123-002',
    title: '土壤分析任务',
    sampleId: 2,
    sampleBarcode: 'S20240123-002',
    sampleName: '土壤样品',
    testMethod: 'GB 15618-2018',
    assignee: '李四',
    status: '已完成',
    statusType: 'success',
    priority: '中',
    createTime: '2024-01-23 10:00',
    deadline: '2024-01-26 18:00',
    progress: 100,
    description: '土壤重金属含量分析'
  },
  {
    id: 3,
    taskNo: 'T20240123-003',
    title: '空气质量检测',
    sampleId: 3,
    sampleBarcode: 'S20240123-003',
    sampleName: '空气样品',
    testMethod: 'HJ 618-2011',
    assignee: '王五',
    status: '待处理',
    statusType: 'info',
    priority: '高',
    createTime: '2024-01-23 11:00',
    deadline: '2024-01-24 18:00',
    progress: 0,
    description: '工厂废气成分分析'
  },
  {
    id: 4,
    taskNo: 'T20240122-015',
    title: '食品安全检测',
    sampleId: 4,
    sampleBarcode: 'S20240122-015',
    sampleName: '食品样品',
    testMethod: 'GB 2763-2021',
    assignee: '赵六',
    status: '进行中',
    statusType: 'warning',
    priority: '高',
    createTime: '2024-01-22 14:00',
    deadline: '2024-01-25 18:00',
    progress: 45,
    description: '食品农药残留检测'
  }
]

// 报告数据
export const mockReports = [
  {
    id: 1,
    reportNo: 'R20240123-001',
    title: '水质检测报告',
    sampleBarcode: 'S20240123-001',
    sampleName: '水质样品',
    client: '某某环保公司',
    template: '水质检测报告模板',
    status: '已签发',
    statusType: 'success',
    createTime: '2024-01-23 15:00',
    issueTime: '2024-01-23 16:30',
    issuer: '张主任',
    reviewer: '李经理',
    approver: '王总监'
  },
  {
    id: 2,
    reportNo: 'R20240123-002',
    title: '土壤检测报告',
    sampleBarcode: 'S20240123-002',
    sampleName: '土壤样品',
    client: '某某建筑公司',
    template: '土壤检测报告模板',
    status: '待签发',
    statusType: 'warning',
    createTime: '2024-01-23 14:00',
    issueTime: '',
    issuer: '',
    reviewer: '李经理',
    approver: ''
  },
  {
    id: 3,
    reportNo: 'R20240122-010',
    title: '水库水质监测报告',
    sampleBarcode: 'S20240122-010',
    sampleName: '水质样品',
    client: '某某水务公司',
    template: '水质检测报告模板',
    status: '已签发',
    statusType: 'success',
    createTime: '2024-01-22 16:00',
    issueTime: '2024-01-22 17:30',
    issuer: '张主任',
    reviewer: '李经理',
    approver: '王总监'
  }
]

// 用户数据
export const mockUsers = [
  {
    id: 1,
    username: 'admin',
    name: '管理员',
    email: 'admin@lab.com',
    phone: '13800138000',
    role: '系统管理员',
    department: '管理部',
    status: '启用',
    statusType: 'success',
    createTime: '2023-01-01',
    lastLogin: '2024-01-23 09:00'
  },
  {
    id: 2,
    username: 'zhangsan',
    name: '张三',
    email: 'zhangsan@lab.com',
    phone: '13800138001',
    role: '检测员',
    department: '检测部',
    status: '启用',
    statusType: 'success',
    createTime: '2023-03-15',
    lastLogin: '2024-01-23 08:30'
  },
  {
    id: 3,
    username: 'lisi',
    name: '李四',
    email: 'lisi@lab.com',
    phone: '13800138002',
    role: '检测员',
    department: '检测部',
    status: '启用',
    statusType: 'success',
    createTime: '2023-04-20',
    lastLogin: '2024-01-23 08:45'
  },
  {
    id: 4,
    username: 'wangwu',
    name: '王五',
    email: 'wangwu@lab.com',
    phone: '13800138003',
    role: '审核员',
    department: '质量部',
    status: '启用',
    statusType: 'success',
    createTime: '2023-05-10',
    lastLogin: '2024-01-23 09:15'
  },
  {
    id: 5,
    username: 'zhaoliu',
    name: '赵六',
    email: 'zhaoliu@lab.com',
    phone: '13800138004',
    role: '检测员',
    department: '检测部',
    status: '禁用',
    statusType: 'danger',
    createTime: '2023-06-01',
    lastLogin: '2024-01-20 17:00'
  }
]

// 检测方法数据
export const mockMethods = [
  {
    id: 1,
    code: 'GB-3838-2002',
    name: '地表水环境质量标准',
    category: '水质检测',
    version: 'V1.0',
    status: '有效',
    statusType: 'success',
    scope: '适用于地表水环境质量评价',
    description: '本标准规定了地表水环境质量分类、标准分级、监测、评价与管理的技术要求',
    equipment: [
      { name: 'pH计', model: 'PHS-3C', accuracy: '±0.01pH', calibration: '每日校准' },
      { name: '溶解氧仪', model: 'JPBJ-608', accuracy: '±0.1mg/L', calibration: '每周校准' },
      { name: 'COD测定仪', model: 'COD-571', accuracy: '±5%', calibration: '每月校准' }
    ],
    steps: [
      { title: '样品准备', description: '按照采样规范采集水样，保存在洁净容器中，4℃冷藏保存' },
      { title: '仪器校准', description: '使用标准缓冲液对pH计进行两点校准，确保精度' },
      { title: '测定操作', description: '按照仪器操作规程进行测定，记录原始数据' },
      { title: '数据记录', description: '将测定结果记录在检测记录表中，计算平均值' }
    ],
    precision: 'RSD ≤ 5%',
    accuracy: '回收率 95%-105%',
    detectionLimit: '0.01 mg/L',
    measurementRange: '0.01-100 mg/L',
    qualityControl: '每批样品设置空白对照、平行样和加标回收样',
    safetyNotes: '操作时佩戴防护用品，避免接触化学试剂',
    operationNotes: '严格按照标准操作程序执行，确保数据准确性',
    createTime: '2023-01-15',
    updateTime: '2023-12-20'
  },
  {
    id: 2,
    code: 'GB-15618-2018',
    name: '土壤环境质量标准',
    category: '土壤检测',
    version: 'V2.0',
    status: '有效',
    statusType: 'success',
    scope: '适用于农用地土壤污染风险管控',
    description: '本标准规定了保护人体健康的土壤环境质量要求',
    equipment: [
      { name: '原子吸收光谱仪', model: 'AA-7000', accuracy: '±2%', calibration: '每日校准' },
      { name: 'ICP-MS', model: 'NexION 2000', accuracy: '±5%', calibration: '每周校准' },
      { name: 'pH计', model: 'PHS-3C', accuracy: '±0.01pH', calibration: '每日校准' }
    ],
    steps: [
      { title: '样品制备', description: '土壤样品风干、研磨、过筛，制备均匀样品' },
      { title: '消解处理', description: '采用微波消解法处理样品，确保完全消解' },
      { title: '仪器测定', description: '使用原子吸收光谱仪测定重金属含量' },
      { title: '结果计算', description: '根据标准曲线计算样品中重金属含量' }
    ],
    precision: 'RSD ≤ 10%',
    accuracy: '回收率 90%-110%',
    detectionLimit: '0.1 mg/kg',
    measurementRange: '0.1-1000 mg/kg',
    qualityControl: '每批样品设置方法空白、平行样和标准参考物质',
    safetyNotes: '消解过程中注意通风，避免吸入有害气体',
    operationNotes: '样品制备过程中避免交叉污染',
    createTime: '2023-02-10',
    updateTime: '2024-01-10'
  },
  {
    id: 3,
    code: 'HJ-618-2011',
    name: '环境空气质量标准',
    category: '空气检测',
    version: 'V1.0',
    status: '有效',
    statusType: 'success',
    scope: '适用于环境空气质量评价',
    description: '本标准规定了环境空气功能区分类、各类功能区环境空气质量要求',
    equipment: [
      { name: '颗粒物采样器', model: 'TH-150C', accuracy: '±5%', calibration: '每月校准' },
      { name: '气相色谱仪', model: 'GC-2014C', accuracy: '±3%', calibration: '每周校准' },
      { name: '质谱仪', model: 'GCMS-QP2020', accuracy: '±5%', calibration: '每月校准' }
    ],
    steps: [
      { title: '采样准备', description: '选择代表性采样点，安装采样设备' },
      { title: '样品采集', description: '按照规定流量和时间采集空气样品' },
      { title: '样品分析', description: '使用气相色谱-质谱联用仪分析样品' },
      { title: '数据处理', description: '计算污染物浓度，评价空气质量' }
    ],
    precision: 'RSD ≤ 8%',
    accuracy: '回收率 85%-115%',
    detectionLimit: '0.001 mg/m³',
    measurementRange: '0.001-10 mg/m³',
    qualityControl: '每批样品设置现场空白、运输空白和平行样',
    safetyNotes: '高空作业时注意安全防护，避免坠落风险',
    operationNotes: '采样过程中避免污染，确保样品代表性',
    createTime: '2023-03-05',
    updateTime: '2023-11-15'
  },
  {
    id: 4,
    code: 'GB-2763-2021',
    name: '食品安全国家标准',
    category: '食品检测',
    version: 'V3.0',
    status: '有效',
    statusType: 'success',
    scope: '适用于食品中农药最大残留限量',
    description: '本标准规定了食品中农药最大残留限量要求',
    equipment: [
      { name: '液相色谱仪', model: 'LC-20A', accuracy: '±3%', calibration: '每周校准' },
      { name: '质谱仪', model: 'LCMS-8040', accuracy: '±5%', calibration: '每月校准' },
      { name: '均质器', model: 'T25', accuracy: '±2%', calibration: '每季度校准' }
    ],
    steps: [
      { title: '样品前处理', description: '样品均质化处理，提取目标化合物' },
      { title: '净化浓缩', description: '使用固相萃取柱净化样品，浓缩待测物' },
      { title: '仪器检测', description: '液相色谱-质谱联用仪检测农药残留' },
      { title: '定量分析', description: '根据标准曲线定量计算农药残留量' }
    ],
    precision: 'RSD ≤ 15%',
    accuracy: '回收率 70%-120%',
    detectionLimit: '0.01 mg/kg',
    measurementRange: '0.01-50 mg/kg',
    qualityControl: '每批样品设置基质空白、基质加标和平行样',
    safetyNotes: '使用有机溶剂时注意通风，避免火源',
    operationNotes: '样品处理过程中避免交叉污染，严格控制温度',
    createTime: '2023-04-12',
    updateTime: '2024-01-08'
  },
  {
    id: 5,
    code: 'HJ-535-2009',
    name: '水质氨氮的测定',
    category: '水质检测',
    version: 'V1.0',
    status: '草稿',
    statusType: 'info',
    scope: '适用于地表水、地下水和废水中氨氮的测定',
    description: '本标准规定了纳氏试剂分光光度法测定水中氨氮的方法',
    equipment: [
      { name: '分光光度计', model: 'UV-2600', accuracy: '±1%', calibration: '每日校准' },
      { name: '容量瓶', model: '100mL', accuracy: '±0.1mL', calibration: '年度校准' }
    ],
    steps: [
      { title: '试剂配制', description: '配制纳氏试剂和标准溶液' },
      { title: '样品处理', description: '过滤样品，调节pH值' },
      { title: '显色反应', description: '加入纳氏试剂，充分混匀' },
      { title: '比色测定', description: '在420nm波长下测定吸光度' }
    ],
    precision: 'RSD ≤ 5%',
    accuracy: '回收率 95%-105%',
    detectionLimit: '0.025 mg/L',
    measurementRange: '0.025-2.0 mg/L',
    qualityControl: '每批样品设置试剂空白、平行样和加标回收样',
    safetyNotes: '纳氏试剂含汞，操作时注意防护',
    operationNotes: '显色时间严格控制在10-50分钟内',
    createTime: '2024-01-20',
    updateTime: '2024-01-22'
  }
]

// 审核记录数据
export const mockAuditRecords = [
  {
    id: 1,
    sampleBarcode: 'S20240123-001',
    sampleName: '水质样品',
    level: '一级审核',
    auditor: '李经理',
    result: '通过',
    resultType: 'success',
    opinion: '检测数据准确，符合标准要求',
    auditTime: '2024-01-23 14:30'
  },
  {
    id: 2,
    sampleBarcode: 'S20240123-002',
    sampleName: '土壤样品',
    level: '二级审核',
    auditor: '王总监',
    result: '通过',
    resultType: 'success',
    opinion: '数据可靠，可以出具报告',
    auditTime: '2024-01-23 15:00'
  },
  {
    id: 3,
    sampleBarcode: 'S20240122-015',
    sampleName: '食品样品',
    level: '一级审核',
    auditor: '李经理',
    result: '退回',
    resultType: 'danger',
    opinion: '部分数据异常，需要复测',
    auditTime: '2024-01-23 11:00'
  }
]

// 留样数据
export const mockRetentionSamples = [
  {
    id: 1,
    barcode: 'S20240101-001',
    name: '水质样品',
    client: '某某环保公司',
    retentionDate: '2024-01-01',
    expiryDate: '2024-07-01',
    daysLeft: 159,
    location: '留样室A-01',
    storage: '常温',
    status: '正常',
    statusType: 'success'
  },
  {
    id: 2,
    barcode: 'S20240115-005',
    name: '土壤样品',
    client: '某某建筑公司',
    retentionDate: '2024-01-15',
    expiryDate: '2024-02-15',
    daysLeft: 23,
    location: '留样室B-03',
    storage: '常温',
    status: '即将到期',
    statusType: 'warning'
  },
  {
    id: 3,
    barcode: 'S20231220-010',
    name: '食品样品',
    client: '某某食品公司',
    retentionDate: '2023-12-20',
    expiryDate: '2024-01-20',
    daysLeft: -3,
    location: '留样室C-05',
    storage: '冷藏',
    status: '已到期',
    statusType: 'danger'
  }
]

// 样品放行数据
export const mockReleasableSamples = [
  {
    id: 'S20240123-001',
    barcode: 'S20240123-001',
    name: '水质样品',
    client: '某某环保公司',
    sampleType: '水质',
    status: 'completed',
    receivedDate: '2024-01-23',
    canRelease: true,
    releaseConditions: {
      qualityJudgment: { status: 'passed', message: '质量判定合格' },
      testCompletion: { status: 'passed', message: '所有检测项目已完成' },
      auditApproval: { status: 'passed', message: '审核已通过' },
      reportGeneration: { status: 'passed', message: '报告已生成' }
    },
    blockingReasons: []
  },
  {
    id: 'S20240123-002',
    barcode: 'S20240123-002',
    name: '土壤样品',
    client: '某某建筑公司',
    sampleType: '土壤',
    status: 'completed',
    receivedDate: '2024-01-23',
    canRelease: true,
    releaseConditions: {
      qualityJudgment: { status: 'passed', message: '质量判定合格' },
      testCompletion: { status: 'passed', message: '所有检测项目已完成' },
      auditApproval: { status: 'passed', message: '审核已通过' },
      reportGeneration: { status: 'passed', message: '报告已生成' }
    },
    blockingReasons: []
  },
  {
    id: 'S20240122-010',
    barcode: 'S20240122-010',
    name: '水库水质样品',
    client: '某某水务公司',
    sampleType: '水质',
    status: 'completed',
    receivedDate: '2024-01-22',
    canRelease: true,
    releaseConditions: {
      qualityJudgment: { status: 'passed', message: '质量判定合格' },
      testCompletion: { status: 'passed', message: '所有检测项目已完成' },
      auditApproval: { status: 'passed', message: '审核已通过' },
      reportGeneration: { status: 'passed', message: '报告已生成' }
    },
    blockingReasons: []
  },
  {
    id: 'S20240122-015',
    barcode: 'S20240122-015',
    name: '食品样品',
    client: '某某食品公司',
    sampleType: '食品',
    status: 'completed',
    receivedDate: '2024-01-22',
    canRelease: false,
    releaseConditions: {
      qualityJudgment: { status: 'passed', message: '质量判定合格' },
      testCompletion: { status: 'passed', message: '所有检测项目已完成' },
      auditApproval: { status: 'failed', message: '待审核' },
      reportGeneration: { status: 'failed', message: '报告未生成' }
    },
    blockingReasons: ['待审核', '报告未生成']
  },
  {
    id: 'S20240121-008',
    barcode: 'S20240121-008',
    name: '工业废水样品',
    client: '某某化工公司',
    sampleType: '水质',
    status: 'completed',
    receivedDate: '2024-01-21',
    canRelease: false,
    releaseConditions: {
      qualityJudgment: { status: 'failed', message: '质量判定不合格' },
      testCompletion: { status: 'passed', message: '所有检测项目已完成' },
      auditApproval: { status: 'pending', message: '待审核' },
      reportGeneration: { status: 'failed', message: '报告未生成' }
    },
    blockingReasons: ['质量判定不合格', '待审核', '报告未生成']
  }
]

// 放行记录数据
export const mockReleaseRecords = [
  {
    id: 'R20240120-001',
    sampleId: 'S20240120-001',
    sampleBarcode: 'S20240120-001',
    sampleName: '环境水样',
    client: '某某环保局',
    releaseNumber: 'REL20240120-001',
    releasedBy: '张三',
    releasedAt: '2024-01-20 16:30:00',
    releaseReason: '检测完成，符合放行条件',
    status: 'released'
  },
  {
    id: 'R20240119-002',
    sampleId: 'S20240119-002',
    sampleBarcode: 'S20240119-002',
    sampleName: '土壤污染样品',
    client: '某某环境公司',
    releaseNumber: 'REL20240119-002',
    releasedBy: '李四',
    releasedAt: '2024-01-19 14:15:00',
    releaseReason: '检测完成，符合放行条件',
    status: 'released'
  }
]

// 统计数据
export const mockStatistics = {
  overview: {
    totalSamples: 1234,
    pendingTasks: 56,
    qualifiedRate: 98.5,
    abnormalSamples: 8
  },
  sampleTrend: [
    { date: '01-17', count: 45 },
    { date: '01-18', count: 52 },
    { date: '01-19', count: 48 },
    { date: '01-20', count: 55 },
    { date: '01-21', count: 50 },
    { date: '01-22', count: 58 },
    { date: '01-23', count: 62 }
  ],
  sampleTypeDistribution: [
    { type: '水质', count: 450, percentage: 36.5 },
    { type: '土壤', count: 320, percentage: 25.9 },
    { type: '空气', count: 280, percentage: 22.7 },
    { type: '食品', count: 184, percentage: 14.9 }
  ],
  taskStatusDistribution: [
    { status: '待处理', count: 15 },
    { status: '进行中', count: 28 },
    { status: '已完成', count: 13 }
  ]
}

// 仪器数据
export const mockInstruments = [
  {
    id: '1',
    code: 'INS-2024-001',
    name: '高效液相色谱仪',
    model: 'LC-2030C',
    manufacturer: '岛津',
    serialNumber: 'C12345678',
    purchaseDate: '2024-01-15',
    purchasePrice: 350000,
    technicalParams: {
      measurementRange: '190-800nm',
      precision: '±0.5%',
      resolution: '0.1nm'
    },
    status: 'IN_USE',
    currentLocation: '检测室A',
    currentDepartment: '理化检测部',
    currentResponsible: '张三',
    description: '用于水质检测',
    remarks: '新购设备',
    createdBy: 'admin',
    createdAt: '2024-01-15T10:30:00.000Z',
    updatedAt: '2024-01-15T10:30:00.000Z'
  },
  {
    id: '2',
    code: 'INS-2024-002',
    name: '原子吸收光谱仪',
    model: 'AA-7000',
    manufacturer: '岛津',
    serialNumber: 'A87654321',
    purchaseDate: '2023-06-20',
    purchasePrice: 280000,
    technicalParams: {
      measurementRange: '190-900nm',
      precision: '±2%',
      resolution: '0.2nm'
    },
    status: 'IN_USE',
    currentLocation: '检测室B',
    currentDepartment: '理化检测部',
    currentResponsible: '李四',
    description: '用于重金属检测',
    remarks: '',
    createdBy: 'admin',
    createdAt: '2023-06-20T09:00:00.000Z',
    updatedAt: '2024-01-10T14:20:00.000Z'
  },
  {
    id: '3',
    code: 'INS-2023-015',
    name: 'ICP-MS质谱仪',
    model: 'NexION 2000',
    manufacturer: 'PerkinElmer',
    serialNumber: 'P20230515',
    purchaseDate: '2023-05-15',
    purchasePrice: 580000,
    technicalParams: {
      detectionLimit: '0.001 ppb',
      precision: '±3%',
      massRange: '2-260 amu'
    },
    status: 'MAINTENANCE',
    currentLocation: '检测室C',
    currentDepartment: '理化检测部',
    currentResponsible: '王五',
    description: '用于痕量元素分析',
    remarks: '定期维护中',
    createdBy: 'admin',
    createdAt: '2023-05-15T11:00:00.000Z',
    updatedAt: '2024-01-20T16:30:00.000Z'
  },
  {
    id: '4',
    code: 'INS-2023-008',
    name: 'pH计',
    model: 'PHS-3C',
    manufacturer: '雷磁',
    serialNumber: 'PH20230308',
    purchaseDate: '2023-03-08',
    purchasePrice: 3500,
    technicalParams: {
      measurementRange: '0-14 pH',
      precision: '±0.01 pH',
      temperature: '0-60°C'
    },
    status: 'IN_USE',
    currentLocation: '检测室A',
    currentDepartment: '理化检测部',
    currentResponsible: '张三',
    description: '用于pH值测定',
    remarks: '常用设备',
    createdBy: 'admin',
    createdAt: '2023-03-08T10:00:00.000Z',
    updatedAt: '2023-12-15T09:30:00.000Z'
  },
  {
    id: '5',
    code: 'INS-2022-025',
    name: '气相色谱仪',
    model: 'GC-2014C',
    manufacturer: '岛津',
    serialNumber: 'G20220825',
    purchaseDate: '2022-08-25',
    purchasePrice: 220000,
    technicalParams: {
      temperatureRange: '室温+10°C-450°C',
      precision: '±0.1°C',
      detectors: 'FID, TCD, ECD'
    },
    status: 'STANDBY',
    currentLocation: '检测室D',
    currentDepartment: '有机检测部',
    currentResponsible: '赵六',
    description: '用于有机物分析',
    remarks: '备用设备',
    createdBy: 'admin',
    createdAt: '2022-08-25T14:00:00.000Z',
    updatedAt: '2024-01-05T11:00:00.000Z'
  },
  {
    id: '6',
    code: 'INS-2024-003',
    name: '紫外可见分光光度计',
    model: 'UV-2600',
    manufacturer: '岛津',
    serialNumber: 'UV20240103',
    purchaseDate: '2024-01-03',
    purchasePrice: 85000,
    technicalParams: {
      wavelengthRange: '185-900nm',
      spectralBandwidth: '0.1, 0.2, 0.5, 1, 2, 5nm',
      photometricRange: '-4-4 Abs'
    },
    status: 'IN_USE',
    currentLocation: '检测室A',
    currentDepartment: '理化检测部',
    currentResponsible: '张三',
    description: '用于吸光度测定',
    remarks: '',
    createdBy: 'admin',
    createdAt: '2024-01-03T09:30:00.000Z',
    updatedAt: '2024-01-03T09:30:00.000Z'
  },
  {
    id: '7',
    code: 'INS-2021-012',
    name: '电子天平',
    model: 'ME204E',
    manufacturer: '梅特勒-托利多',
    serialNumber: 'ME20210512',
    purchaseDate: '2021-05-12',
    purchasePrice: 12000,
    technicalParams: {
      maxCapacity: '220g',
      readability: '0.1mg',
      repeatability: '0.1mg'
    },
    status: 'CALIBRATING',
    currentLocation: '天平室',
    currentDepartment: '理化检测部',
    currentResponsible: '李四',
    description: '用于样品称量',
    remarks: '年度校准中',
    createdBy: 'admin',
    createdAt: '2021-05-12T10:00:00.000Z',
    updatedAt: '2024-01-22T08:00:00.000Z'
  },
  {
    id: '8',
    code: 'INS-2020-005',
    name: '超纯水机',
    model: 'Milli-Q IQ 7000',
    manufacturer: 'Millipore',
    serialNumber: 'MQ20200305',
    purchaseDate: '2020-03-05',
    purchasePrice: 95000,
    technicalParams: {
      resistivity: '18.2 MΩ·cm',
      flowRate: '1.5 L/min',
      TOC: '<5 ppb'
    },
    status: 'IN_USE',
    currentLocation: '纯水室',
    currentDepartment: '理化检测部',
    currentResponsible: '王五',
    description: '用于制备超纯水',
    remarks: '公用设备',
    createdBy: 'admin',
    createdAt: '2020-03-05T11:00:00.000Z',
    updatedAt: '2023-11-20T15:00:00.000Z'
  },
  {
    id: '9',
    code: 'INS-2019-018',
    name: '离子色谱仪',
    model: 'ICS-5000+',
    manufacturer: 'Thermo Fisher',
    serialNumber: 'IC20190618',
    purchaseDate: '2019-06-18',
    purchasePrice: 380000,
    technicalParams: {
      detectionLimit: '0.1 ppb',
      precision: '±1%',
      flowRate: '0.25-5 mL/min'
    },
    status: 'PENDING_DISPOSAL',
    currentLocation: '检测室E',
    currentDepartment: '理化检测部',
    currentResponsible: '赵六',
    description: '用于阴阳离子分析',
    remarks: '设备老化,待报废',
    createdBy: 'admin',
    createdAt: '2019-06-18T10:30:00.000Z',
    updatedAt: '2024-01-18T14:00:00.000Z'
  },
  {
    id: '10',
    code: 'INS-2018-003',
    name: '微波消解仪',
    model: 'MARS 6',
    manufacturer: 'CEM',
    serialNumber: 'MW20180203',
    purchaseDate: '2018-02-03',
    purchasePrice: 180000,
    technicalParams: {
      maxPressure: '800 psi',
      maxTemperature: '260°C',
      capacity: '40 vessels'
    },
    status: 'DISPOSED',
    currentLocation: '仓库',
    currentDepartment: '理化检测部',
    currentResponsible: '',
    description: '用于样品消解',
    remarks: '已报废处理',
    createdBy: 'admin',
    createdAt: '2018-02-03T09:00:00.000Z',
    updatedAt: '2023-12-30T16:00:00.000Z'
  }
]

// 仪器流转记录数据
export const mockInstrumentTransfers = [
  {
    id: 'T1',
    instrumentId: '1',
    instrument: mockInstruments[0], // 引用第一台仪器
    fromDepartment: '理化检测部',
    toDepartment: '微生物检测部',
    fromLocation: '实验室A-101',
    toLocation: '实验室B-205',
    fromResponsible: '张三',
    toResponsible: '李四',
    transferReason: '支援微生物检测项目',
    expectedReturnDate: '2024-03-15',
    status: '待确认',
    createdBy: 'admin',
    createdAt: '2024-01-20T14:30:00.000Z',
    updatedAt: '2024-01-20T14:30:00.000Z'
  },
  {
    id: 'T2',
    instrumentId: '2',
    instrument: mockInstruments[1], // 引用第二台仪器
    fromDepartment: '理化检测部',
    toDepartment: '有机检测部',
    fromLocation: '实验室A-102',
    toLocation: '实验室C-301',
    fromResponsible: '李四',
    toResponsible: '赵六',
    transferReason: '部门调配',
    expectedReturnDate: '2024-02-28',
    status: '已确认',
    confirmedAt: '2024-01-18T10:00:00.000Z',
    confirmedBy: 'zhaoliu',
    createdBy: 'admin',
    createdAt: '2024-01-18T09:00:00.000Z',
    updatedAt: '2024-01-18T10:00:00.000Z'
  }
]

// 仪器维护记录数据
export const mockMaintenanceRecords = [
  {
    id: 'M1',
    instrumentId: '1',
    instrument: mockInstruments[0], // 引用第一台仪器
    maintenanceDate: '2024-01-20',
    type: 'PREVENTIVE',
    description: '定期保养,清洁光路系统',
    performedBy: '张三',
    cost: 500,
    nextMaintenanceDate: '2024-04-20',
    remarks: '运行正常',
    createdBy: 'admin',
    createdAt: '2024-01-20T16:00:00.000Z',
    updatedAt: '2024-01-20T16:00:00.000Z'
  },
  {
    id: 'M2',
    instrumentId: '3',
    instrument: mockInstruments[2], // 引用第三台仪器
    maintenanceDate: '2024-01-20',
    type: 'CORRECTIVE',
    description: '更换进样系统密封圈',
    performedBy: '王五',
    cost: 1200,
    nextMaintenanceDate: '2024-02-20',
    remarks: '已恢复正常',
    createdBy: 'admin',
    createdAt: '2024-01-20T15:00:00.000Z',
    updatedAt: '2024-01-20T15:00:00.000Z'
  }
]

// 导出所有模拟数据
export default {
  samples: mockSamples,
  tasks: mockTasks,
  reports: mockReports,
  users: mockUsers,
  methods: mockMethods,
  auditRecords: mockAuditRecords,
  retentionSamples: mockRetentionSamples,
  releasableSamples: mockReleasableSamples,
  releaseRecords: mockReleaseRecords,
  statistics: mockStatistics,
  instruments: mockInstruments,
  instrumentTransfers: mockInstrumentTransfers,
  maintenanceRecords: mockMaintenanceRecords
}
