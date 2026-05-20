-- CreateEnum
CREATE TYPE "CommentTemplateType" AS ENUM ('APPROVED', 'NEED_REVISION', 'REJECTED', 'OTHER');

-- CreateEnum
CREATE TYPE "WorkflowConfigStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "audit_comment_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CommentTemplateType" NOT NULL,
    "content" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_comment_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_workflow_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sampleTypes" TEXT[],
    "levels" JSONB NOT NULL,
    "parallelAudit" BOOLEAN NOT NULL DEFAULT false,
    "status" "WorkflowConfigStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_workflow_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_history" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "performedBy" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "audit_comment_templates_name_key" ON "audit_comment_templates"("name");

-- CreateIndex
CREATE INDEX "audit_comment_templates_type_idx" ON "audit_comment_templates"("type");

-- CreateIndex
CREATE INDEX "audit_comment_templates_isDefault_idx" ON "audit_comment_templates"("isDefault");

-- CreateIndex
CREATE INDEX "audit_comment_templates_createdBy_idx" ON "audit_comment_templates"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "audit_workflow_configs_name_key" ON "audit_workflow_configs"("name");

-- CreateIndex
CREATE INDEX "audit_workflow_configs_status_idx" ON "audit_workflow_configs"("status");

-- CreateIndex
CREATE INDEX "audit_workflow_configs_createdBy_idx" ON "audit_workflow_configs"("createdBy");

-- CreateIndex
CREATE INDEX "audit_history_taskId_idx" ON "audit_history"("taskId");

-- CreateIndex
CREATE INDEX "audit_history_performedAt_idx" ON "audit_history"("performedAt");

-- CreateIndex
CREATE INDEX "audit_history_performedBy_idx" ON "audit_history"("performedBy");
