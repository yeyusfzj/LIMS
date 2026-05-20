-- 添加性能优化索引
-- 此迁移添加了额外的索引以优化常见查询模式

-- 样品表复合索引
-- 优化按状态和创建时间查询样品列表
CREATE INDEX IF NOT EXISTS "idx_samples_status_created" ON "samples"("status", "createdAt" DESC);

-- 优化按客户名称和状态查询
CREATE INDEX IF NOT EXISTS "idx_samples_client_status" ON "samples"("clientName", "status");

-- 优化按优先级和状态查询
CREATE INDEX IF NOT EXISTS "idx_samples_priority_status" ON "samples"("priority", "status");

-- 优化按接收日期范围查询
CREATE INDEX IF NOT EXISTS "idx_samples_received_date" ON "samples"("receivedDate" DESC);

-- 审计日志表优化
-- 优化按时间范围查询审计日志
CREATE INDEX IF NOT EXISTS "idx_audit_logs_timestamp_desc" ON "audit_logs"("timestamp" DESC);

-- 优化按用户和时间查询
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_timestamp" ON "audit_logs"("userId", "timestamp" DESC);

-- 任务表优化
-- 优化按分配人员和状态查询任务
CREATE INDEX IF NOT EXISTS "idx_tasks_assigned_status" ON "tasks"("assignedTo", "status") WHERE "assignedTo" IS NOT NULL;

-- 优化按创建时间查询任务
CREATE INDEX IF NOT EXISTS "idx_tasks_created_at" ON "tasks"("createdAt" DESC);

-- 优化按优先级和状态查询
CREATE INDEX IF NOT EXISTS "idx_tasks_priority_status" ON "tasks"("priority", "status");

-- 检测结果表优化
-- 优化按样品和录入时间查询结果
CREATE INDEX IF NOT EXISTS "idx_results_sample_entered" ON "results"("sampleId", "enteredAt" DESC);

-- 优化查询异常结果
CREATE INDEX IF NOT EXISTS "idx_results_abnormal" ON "results"("isAbnormal") WHERE "isAbnormal" = true;

-- 优化查询复测结果
CREATE INDEX IF NOT EXISTS "idx_results_retest" ON "results"("isRetest", "originalResultId") WHERE "isRetest" = true;

-- 审核任务表优化
-- 优化按审核人员和状态查询
CREATE INDEX IF NOT EXISTS "idx_audit_tasks_auditor_status" ON "audit_tasks"("auditorId", "status");

-- 优化按样品和级别查询
CREATE INDEX IF NOT EXISTS "idx_audit_tasks_sample_level" ON "audit_tasks"("sampleId", "level");

-- 优化按提交时间查询
CREATE INDEX IF NOT EXISTS "idx_audit_tasks_submitted" ON "audit_tasks"("submittedAt" DESC);

-- 报告表优化
-- 优化按状态和生成时间查询
CREATE INDEX IF NOT EXISTS "idx_reports_status_generated" ON "reports"("status", "generatedAt" DESC);

-- 优化按样品查询报告
CREATE INDEX IF NOT EXISTS "idx_reports_sample_status" ON "reports"("sampleId", "status");

-- 工作流实例表优化
-- 优化按工作流和状态查询实例
CREATE INDEX IF NOT EXISTS "idx_workflow_instances_workflow_status" ON "workflow_instances"("workflowId", "status");

-- 优化按开始时间查询
CREATE INDEX IF NOT EXISTS "idx_workflow_instances_started" ON "workflow_instances"("startedAt" DESC);

-- 流转记录表优化
-- 优化按流转日期查询
CREATE INDEX IF NOT EXISTS "idx_transfers_transfer_date_desc" ON "transfers"("transferDate" DESC);

-- 优化按状态查询
CREATE INDEX IF NOT EXISTS "idx_transfers_status" ON "transfers"("status");

-- 检测项表优化
-- 优化按分配人员和状态查询
CREATE INDEX IF NOT EXISTS "idx_test_items_assigned_status" ON "test_items"("assignedTo", "status") WHERE "assignedTo" IS NOT NULL;

-- 备份记录表优化
-- 优化按创建时间和状态查询
CREATE INDEX IF NOT EXISTS "idx_backup_records_created_status" ON "backup_records"("createdAt" DESC, "status");

-- 全文搜索索引（PostgreSQL GIN 索引）
-- 优化样品名称和客户名称的全文搜索
CREATE INDEX IF NOT EXISTS "idx_samples_fulltext_search" ON "samples" 
  USING gin(to_tsvector('simple', COALESCE("sampleName", '') || ' ' || COALESCE("clientName", '')));

-- 优化用户全名搜索
CREATE INDEX IF NOT EXISTS "idx_users_fulltext_search" ON "users" 
  USING gin(to_tsvector('simple', COALESCE("fullName", '') || ' ' || COALESCE("username", '')));
