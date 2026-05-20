# 需求文档：本地轻量化 AI 智能体

## 介绍

本地轻量化 AI 智能体是一个基于规则和知识图谱的实验室智能分析系统，无需依赖外部 AI API。系统通过 4 个核心模块（实验文本语义解析、实验知识图谱、问答与实验计划生成、结果分析与异常检测）提供实验室智能分析能力，实现从用户输入实验需求到生成结构化实验计划的完整闭环。

## 术语表

- **AI_Agent**: 本地轻量化 AI 智能体系统
- **NLP_Parser**: 自然语言处理解析器，负责解析实验需求文本
- **Knowledge_Graph**: 知识图谱模块，存储实验项目、设备、材料、方法和步骤的关系
- **Plan_Generator**: 实验计划生成器
- **QA_Engine**: 问答引擎
- **Result_Analyzer**: 结果分析器
- **Backend_API**: 后端接口服务
- **Frontend_UI**: 前端用户界面
- **Structured_Fields**: 结构化字段，包括实验目的、样品类型、检测指标、所需设备/材料、实验步骤、预计时间
- **Experiment_Plan**: 实验计划，包含完整的实验执行信息
- **Knowledge_Entry**: 知识条目，知识图谱中的一条记录
- **Rule_Engine**: 规则引擎，用于结果分析和异常检测
- **Threshold**: 阈值，用于异常检测的判断标准
- **Parser_Dictionary**: 解析器词典，包含关键词和正则表达式规则
- **Template**: 模板，用于生成实验计划和问答回复的固定格式

## 需求

### 需求 1: 实验文本语义解析

**用户故事:** 作为实验室用户，我希望系统能够理解我用自然语言描述的实验需求，以便快速提取关键信息。

#### 验收标准

1. WHEN 用户提交实验需求文本，THE NLP_Parser SHALL 提取实验目的字段
2. WHEN 用户提交实验需求文本，THE NLP_Parser SHALL 提取样品类型字段
3. WHEN 用户提交实验需求文本，THE NLP_Parser SHALL 提取检测指标字段
4. WHEN 用户提交实验需求文本，THE NLP_Parser SHALL 提取所需设备字段
5. WHEN 用户提交实验需求文本，THE NLP_Parser SHALL 提取所需材料字段
6. WHEN 用户提交实验需求文本，THE NLP_Parser SHALL 提取实验步骤字段
7. WHEN 用户提交实验需求文本，THE NLP_Parser SHALL 提取预计时间字段
8. THE NLP_Parser SHALL 使用关键词匹配算法识别字段内容
9. THE NLP_Parser SHALL 使用正则表达式提取结构化信息
10. THE NLP_Parser SHALL 使用 Parser_Dictionary 进行词汇匹配
11. WHEN 解析完成，THE NLP_Parser SHALL 返回包含所有 Structured_Fields 的 JSON 对象
12. WHEN 输入文本为空，THE NLP_Parser SHALL 返回错误提示
13. WHEN 输入文本无法识别任何字段，THE NLP_Parser SHALL 返回空字段标记

### 需求 2: 实验知识图谱存储

**用户故事:** 作为系统管理员，我希望系统能够存储和管理实验相关的知识，以便为用户提供准确的实验指导。

#### 验收标准

1. THE Knowledge_Graph SHALL 存储实验类型与设备的关联关系
2. THE Knowledge_Graph SHALL 存储实验类型与材料的关联关系
3. THE Knowledge_Graph SHALL 存储实验类型与检测指标的关联关系
4. THE Knowledge_Graph SHALL 存储实验类型与实验步骤的关联关系
5. WHERE JSON 格式被选择，THE Knowledge_Graph SHALL 使用 JSON 文件存储知识条目
6. WHERE SQLite 格式被选择，THE Knowledge_Graph SHALL 使用 SQLite 数据库存储知识条目
7. THE Knowledge_Graph SHALL 支持通过实验类型查询相关设备列表
8. THE Knowledge_Graph SHALL 支持通过实验类型查询相关材料列表
9. THE Knowledge_Graph SHALL 支持通过实验类型查询相关指标列表
10. THE Knowledge_Graph SHALL 支持通过实验类型查询相关步骤列表
11. WHEN 查询的实验类型不存在，THE Knowledge_Graph SHALL 返回空结果集
12. THE Knowledge_Graph SHALL 在 500 毫秒内完成单次查询操作

### 需求 3: 知识图谱数据结构

**用户故事:** 作为开发人员，我希望知识图谱有清晰的数据结构，以便于维护和扩展。

#### 验收标准

1. THE Knowledge_Graph SHALL 定义实验类型实体
2. THE Knowledge_Graph SHALL 定义设备实体
3. THE Knowledge_Graph SHALL 定义材料实体
4. THE Knowledge_Graph SHALL 定义检测指标实体
5. THE Knowledge_Graph SHALL 定义实验步骤实体
6. THE Knowledge_Graph SHALL 定义实验类型到设备的关系
7. THE Knowledge_Graph SHALL 定义实验类型到材料的关系
8. THE Knowledge_Graph SHALL 定义实验类型到指标的关系
9. THE Knowledge_Graph SHALL 定义实验类型到步骤的关系
10. WHEN 添加新的 Knowledge_Entry，THE Knowledge_Graph SHALL 验证数据完整性
11. WHEN 添加重复的 Knowledge_Entry，THE Knowledge_Graph SHALL 返回错误提示

### 需求 4: 智能问答功能

**用户故事:** 作为实验室用户，我希望能够向系统提问并获得准确的回答，以便快速获取实验相关信息。

#### 验收标准

1. WHEN 用户提交问题，THE QA_Engine SHALL 识别问题类型
2. WHEN 问题类型为设备查询，THE QA_Engine SHALL 从 Knowledge_Graph 检索相关设备信息
3. WHEN 问题类型为材料查询，THE QA_Engine SHALL 从 Knowledge_Graph 检索相关材料信息
4. WHEN 问题类型为步骤查询，THE QA_Engine SHALL 从 Knowledge_Graph 检索相关步骤信息
5. WHEN 问题类型为指标查询，THE QA_Engine SHALL 从 Knowledge_Graph 检索相关指标信息
6. THE QA_Engine SHALL 使用关键词匹配识别问题意图
7. THE QA_Engine SHALL 使用 Template 生成回答文本
8. WHEN 检索到匹配结果，THE QA_Engine SHALL 返回格式化的回答
9. WHEN 未检索到匹配结果，THE QA_Engine SHALL 返回默认提示信息
10. THE QA_Engine SHALL 在 300 毫秒内完成问答处理

### 需求 5: 实验计划生成

**用户故事:** 作为实验室用户，我希望系统能够根据我的需求自动生成结构化的实验计划，以便指导实验执行。

#### 验收标准

1. WHEN 用户请求生成实验计划，THE Plan_Generator SHALL 接收 Structured_Fields 作为输入
2. WHEN 接收到 Structured_Fields，THE Plan_Generator SHALL 查询 Knowledge_Graph 获取匹配的设备信息
3. WHEN 接收到 Structured_Fields，THE Plan_Generator SHALL 查询 Knowledge_Graph 获取匹配的材料信息
4. WHEN 接收到 Structured_Fields，THE Plan_Generator SHALL 查询 Knowledge_Graph 获取匹配的步骤信息
5. THE Plan_Generator SHALL 使用 Template 填充实验计划内容
6. THE Plan_Generator SHALL 在实验计划中包含实验目的
7. THE Plan_Generator SHALL 在实验计划中包含样品类型
8. THE Plan_Generator SHALL 在实验计划中包含检测指标
9. THE Plan_Generator SHALL 在实验计划中包含所需设备列表
10. THE Plan_Generator SHALL 在实验计划中包含所需材料列表
11. THE Plan_Generator SHALL 在实验计划中包含详细实验步骤
12. THE Plan_Generator SHALL 在实验计划中包含预计时间
13. WHEN 生成完成，THE Plan_Generator SHALL 返回完整的 Experiment_Plan
14. THE Plan_Generator SHALL 在 1 秒内完成实验计划生成

### 需求 6: 结果分析与异常检测

**用户故事:** 作为实验室用户，我希望系统能够分析实验结果并检测异常，以便及时发现问题。

#### 验收标准

1. WHEN 用户提交实验结果数据，THE Result_Analyzer SHALL 接收结果数据
2. THE Result_Analyzer SHALL 使用 Rule_Engine 评估结果数据
3. THE Result_Analyzer SHALL 使用 Threshold 判断数值是否异常
4. WHEN 结果数值超出 Threshold 上限，THE Result_Analyzer SHALL 标记为异常
5. WHEN 结果数值低于 Threshold 下限，THE Result_Analyzer SHALL 标记为异常
6. WHEN 检测到异常，THE Result_Analyzer SHALL 生成异常提示信息
7. WHEN 检测到异常，THE Result_Analyzer SHALL 生成分析建议
8. WHEN 结果正常，THE Result_Analyzer SHALL 返回正常状态标记
9. THE Result_Analyzer SHALL 在分析报告中包含所有检测项的状态
10. THE Result_Analyzer SHALL 在 500 毫秒内完成结果分析

### 需求 7: 后端 API 接口

**用户故事:** 作为前端开发人员，我希望有清晰的 API 接口，以便集成智能体功能。

#### 验收标准

1. THE Backend_API SHALL 提供 POST /api/agent/parse 端点用于解析实验需求文本
2. WHEN 调用 /api/agent/parse 端点，THE Backend_API SHALL 接收文本参数
3. WHEN 调用 /api/agent/parse 端点，THE Backend_API SHALL 返回 Structured_Fields
4. THE Backend_API SHALL 提供 POST /api/agent/plan 端点用于生成实验计划
5. WHEN 调用 /api/agent/plan 端点，THE Backend_API SHALL 接收 Structured_Fields 参数
6. WHEN 调用 /api/agent/plan 端点，THE Backend_API SHALL 返回 Experiment_Plan
7. THE Backend_API SHALL 提供 POST /api/agent/qa 端点用于智能问答
8. WHEN 调用 /api/agent/qa 端点，THE Backend_API SHALL 接收问题文本参数
9. WHEN 调用 /api/agent/qa 端点，THE Backend_API SHALL 返回回答文本
10. THE Backend_API SHALL 提供 POST /api/agent/result-analysis 端点用于结果分析
11. WHEN 调用 /api/agent/result-analysis 端点，THE Backend_API SHALL 接收结果数据参数
12. WHEN 调用 /api/agent/result-analysis 端点，THE Backend_API SHALL 返回分析报告
13. WHEN API 请求参数缺失，THE Backend_API SHALL 返回 400 错误码和错误描述
14. WHEN API 处理失败，THE Backend_API SHALL 返回 500 错误码和错误描述
15. THE Backend_API SHALL 在响应头中包含 Content-Type: application/json

### 需求 8: 前端用户界面

**用户故事:** 作为实验室用户，我希望有直观的用户界面，以便方便地使用智能体功能。

#### 验收标准

1. THE Frontend_UI SHALL 提供输入框用于用户输入实验需求或提问
2. THE Frontend_UI SHALL 提供解析结果显示区域
3. THE Frontend_UI SHALL 在解析结果区域显示实验目的
4. THE Frontend_UI SHALL 在解析结果区域显示样品类型
5. THE Frontend_UI SHALL 在解析结果区域显示检测指标
6. THE Frontend_UI SHALL 在解析结果区域显示所需设备
7. THE Frontend_UI SHALL 在解析结果区域显示所需材料
8. THE Frontend_UI SHALL 在解析结果区域显示实验步骤
9. THE Frontend_UI SHALL 在解析结果区域显示预计时间
10. THE Frontend_UI SHALL 提供知识图谱匹配结果显示区域
11. THE Frontend_UI SHALL 在知识图谱匹配区域显示匹配的设备
12. THE Frontend_UI SHALL 在知识图谱匹配区域显示匹配的方法
13. THE Frontend_UI SHALL 在知识图谱匹配区域显示匹配的步骤
14. THE Frontend_UI SHALL 提供输出区域用于显示生成的实验计划或问答结果
15. WHEN 用户点击解析按钮，THE Frontend_UI SHALL 调用 /api/agent/parse 接口
16. WHEN 用户点击生成计划按钮，THE Frontend_UI SHALL 调用 /api/agent/plan 接口
17. WHEN 用户点击提问按钮，THE Frontend_UI SHALL 调用 /api/agent/qa 接口
18. WHEN API 调用失败，THE Frontend_UI SHALL 显示错误提示信息
19. WHEN API 调用成功，THE Frontend_UI SHALL 更新相应的显示区域

### 需求 9: 本地部署与性能

**用户故事:** 作为系统管理员，我希望系统能够完全本地部署且性能良好，以便保证数据安全和响应速度。

#### 验收标准

1. THE AI_Agent SHALL 在本地服务器上运行
2. THE AI_Agent SHALL 不依赖外部 AI API 服务
3. THE AI_Agent SHALL 不向外部服务器发送用户数据
4. THE AI_Agent SHALL 在 2 秒内完成完整的解析到计划生成流程
5. WHEN 系统启动，THE AI_Agent SHALL 在 10 秒内完成初始化
6. THE AI_Agent SHALL 支持至少 10 个并发用户请求
7. WHEN 内存使用超过 1GB，THE AI_Agent SHALL 记录警告日志
8. THE AI_Agent SHALL 在系统重启后保持 Knowledge_Graph 数据完整性

### 需求 10: 知识库可扩展性

**用户故事:** 作为系统管理员，我希望能够方便地扩展知识库，以便支持更多实验类型。

#### 验收标准

1. THE AI_Agent SHALL 提供添加新实验类型的接口
2. THE AI_Agent SHALL 提供添加新设备的接口
3. THE AI_Agent SHALL 提供添加新材料的接口
4. THE AI_Agent SHALL 提供添加新检测指标的接口
5. THE AI_Agent SHALL 提供添加新实验步骤的接口
6. WHEN 添加新知识条目，THE AI_Agent SHALL 验证数据格式
7. WHEN 添加新知识条目，THE AI_Agent SHALL 更新 Knowledge_Graph
8. THE AI_Agent SHALL 支持导入 JSON 格式的批量知识数据
9. THE AI_Agent SHALL 支持导出当前 Knowledge_Graph 为 JSON 格式
10. WHEN 导入数据格式错误，THE AI_Agent SHALL 返回详细的错误信息

### 需求 11: 规则引擎配置

**用户故事:** 作为系统管理员，我希望能够配置分析规则和阈值，以便适应不同的实验标准。

#### 验收标准

1. THE Rule_Engine SHALL 支持配置数值型 Threshold
2. THE Rule_Engine SHALL 支持配置范围型 Threshold
3. THE Rule_Engine SHALL 支持配置枚举型规则
4. THE Rule_Engine SHALL 支持配置逻辑组合规则
5. WHEN 配置新规则，THE Rule_Engine SHALL 验证规则语法
6. WHEN 配置新 Threshold，THE Rule_Engine SHALL 验证数值有效性
7. THE Rule_Engine SHALL 支持导出当前规则配置为 JSON 格式
8. THE Rule_Engine SHALL 支持导入 JSON 格式的规则配置
9. WHEN 导入规则配置，THE Rule_Engine SHALL 验证配置完整性
10. THE Rule_Engine SHALL 在应用新规则后立即生效

### 需求 12: 解析器词典管理

**用户故事:** 作为系统管理员，我希望能够管理解析器使用的词典，以便提高解析准确性。

#### 验收标准

1. THE Parser_Dictionary SHALL 包含实验目的关键词列表
2. THE Parser_Dictionary SHALL 包含样品类型关键词列表
3. THE Parser_Dictionary SHALL 包含检测指标关键词列表
4. THE Parser_Dictionary SHALL 包含设备名称关键词列表
5. THE Parser_Dictionary SHALL 包含材料名称关键词列表
6. THE Parser_Dictionary SHALL 包含时间表达式正则模式
7. THE Parser_Dictionary SHALL 包含数值表达式正则模式
8. THE AI_Agent SHALL 提供添加新关键词的接口
9. THE AI_Agent SHALL 提供删除关键词的接口
10. THE AI_Agent SHALL 提供更新正则模式的接口
11. WHEN 更新 Parser_Dictionary，THE NLP_Parser SHALL 使用最新词典进行解析
12. THE AI_Agent SHALL 支持导出 Parser_Dictionary 为 JSON 格式
13. THE AI_Agent SHALL 支持导入 JSON 格式的 Parser_Dictionary

### 需求 13: 日志与监控

**用户故事:** 作为系统管理员，我希望系统能够记录操作日志，以便监控系统运行状态和排查问题。

#### 验收标准

1. WHEN 用户调用 API 接口，THE AI_Agent SHALL 记录请求日志
2. WHEN API 处理完成，THE AI_Agent SHALL 记录响应日志
3. WHEN 发生错误，THE AI_Agent SHALL 记录错误日志
4. THE AI_Agent SHALL 在日志中记录时间戳
5. THE AI_Agent SHALL 在日志中记录用户标识
6. THE AI_Agent SHALL 在日志中记录操作类型
7. THE AI_Agent SHALL 在日志中记录处理耗时
8. WHEN 日志文件大小超过 100MB，THE AI_Agent SHALL 创建新的日志文件
9. THE AI_Agent SHALL 保留最近 30 天的日志文件
10. THE AI_Agent SHALL 提供查询日志的接口

### 需求 14: 错误处理与容错

**用户故事:** 作为实验室用户，我希望系统能够优雅地处理错误，以便在出现问题时获得清晰的提示。

#### 验收标准

1. WHEN NLP_Parser 解析失败，THE AI_Agent SHALL 返回友好的错误提示
2. WHEN Knowledge_Graph 查询失败，THE AI_Agent SHALL 返回默认建议
3. WHEN Plan_Generator 生成失败，THE AI_Agent SHALL 返回错误原因
4. WHEN Result_Analyzer 分析失败，THE AI_Agent SHALL 返回错误详情
5. WHEN Backend_API 接收到无效参数，THE AI_Agent SHALL 返回参数验证错误信息
6. WHEN 系统内部错误发生，THE AI_Agent SHALL 记录详细错误堆栈
7. WHEN 系统内部错误发生，THE AI_Agent SHALL 向用户返回通用错误提示
8. THE AI_Agent SHALL 在错误响应中包含错误代码
9. THE AI_Agent SHALL 在错误响应中包含错误描述
10. THE AI_Agent SHALL 在错误响应中包含建议的解决方案

### 需求 15: 演示闭环功能

**用户故事:** 作为项目演示人员，我希望系统能够展示完整的功能闭环，以便向用户展示系统能力。

#### 验收标准

1. THE AI_Agent SHALL 支持从输入实验需求到生成实验计划的完整流程
2. WHEN 用户输入"我需要检测水样中的重金属含量"，THE AI_Agent SHALL 成功解析需求
3. WHEN 解析完成，THE AI_Agent SHALL 自动匹配相关设备和方法
4. WHEN 匹配完成，THE AI_Agent SHALL 生成包含详细步骤的实验计划
5. THE AI_Agent SHALL 在 3 秒内完成整个演示流程
6. THE Frontend_UI SHALL 实时显示每个处理阶段的结果
7. THE AI_Agent SHALL 提供至少 5 个预设的演示案例
8. WHEN 选择演示案例，THE AI_Agent SHALL 自动填充输入并执行流程
9. THE AI_Agent SHALL 在演示模式下高亮显示关键处理步骤
10. THE AI_Agent SHALL 提供演示流程的文字说明

## 非功能性需求

### 性能需求

1. THE AI_Agent SHALL 在 2 秒内完成单次完整的解析-匹配-生成流程
2. THE AI_Agent SHALL 支持至少 10 个并发用户
3. THE AI_Agent SHALL 在内存使用不超过 1GB 的情况下运行

### 可用性需求

1. THE Frontend_UI SHALL 提供中文界面
2. THE Frontend_UI SHALL 在主流浏览器（Chrome、Firefox、Edge）上正常运行
3. THE AI_Agent SHALL 提供用户操作指南文档

### 可维护性需求

1. THE AI_Agent SHALL 使用模块化架构设计
2. THE AI_Agent SHALL 提供代码注释和 API 文档
3. THE AI_Agent SHALL 使用版本控制管理代码

### 安全性需求

1. THE AI_Agent SHALL 在本地运行，不向外部发送数据
2. THE Backend_API SHALL 验证所有输入参数
3. THE AI_Agent SHALL 防止 SQL 注入攻击（如使用 SQLite）

## 约束条件

1. 系统必须完全本地部署，不依赖外部 AI API
2. 系统必须使用轻量级技术栈，避免重型机器学习框架
3. 知识图谱初始版本使用 JSON 或 SQLite 存储
4. NLP 解析使用关键词匹配和正则表达式，不使用深度学习模型
5. 系统必须在标准服务器配置（4 核 CPU，8GB 内存）上流畅运行
