/*
  Warnings:

  - You are about to drop the column `sampleId` on the `audit_tasks` table. All the data in the column will be lost.
  - Added the required column `taskId` to the `audit_tasks` table without a default value. This is not possible if the table is not empty.

*/

-- 步骤 1: 添加新的 taskId 列（允许为 NULL）
ALTER TABLE "audit_tasks" ADD COLUMN "taskId" TEXT;

-- 步骤 2: 对于现有的审核任务，我们需要找到对应的 Task
-- 由于旧的审核任务关联到 Sample，而新的设计关联到 Task
-- 我们需要为每个 Sample 找到对应的 Task（通过 WorkflowInstance）
-- 如果找不到对应的 Task，我们将删除这些孤立的审核任务

-- 更新现有审核任务的 taskId（通过 sample -> workflow_instance -> task 关联）
UPDATE "audit_tasks" at
SET "taskId" = (
  SELECT t.id
  FROM "samples" s
  JOIN "workflow_instances" wi ON s."workflowInstanceId" = wi.id
  JOIN "tasks" t ON t."instanceId" = wi.id
  WHERE s.id = at."sampleId"
  LIMIT 1
)
WHERE at."sampleId" IS NOT NULL;

-- 删除无法找到对应 Task 的审核任务（孤立数据）
DELETE FROM "audit_tasks" WHERE "taskId" IS NULL;

-- 步骤 3: 删除外键约束
ALTER TABLE "audit_tasks" DROP CONSTRAINT "audit_tasks_sampleId_fkey";

-- 步骤 4: 删除索引
DROP INDEX "audit_tasks_sampleId_idx";

-- 步骤 5: 删除旧的 sampleId 列
ALTER TABLE "audit_tasks" DROP COLUMN "sampleId";

-- 步骤 6: 将 taskId 设置为 NOT NULL
ALTER TABLE "audit_tasks" ALTER COLUMN "taskId" SET NOT NULL;

-- 步骤 7: 创建新索引
CREATE INDEX "audit_tasks_taskId_idx" ON "audit_tasks"("taskId");

-- 步骤 8: 添加新的外键约束
ALTER TABLE "audit_tasks" ADD CONSTRAINT "audit_tasks_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
