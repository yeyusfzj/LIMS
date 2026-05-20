-- CreateEnum
CREATE TYPE "SampleStatus" AS ENUM ('REGISTERED', 'IN_TESTING', 'TESTING_COMPLETE', 'IN_AUDIT', 'AUDIT_COMPLETE', 'RELEASED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TestItemStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'ABNORMAL');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'IN_TRANSIT', 'RECEIVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InstanceStatus" AS ENUM ('RUNNING', 'COMPLETED', 'SUSPENDED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ResultSource" AS ENUM ('MANUAL', 'INSTRUMENT', 'CALCULATED');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AuditDecision" AS ENUM ('APPROVE', 'REJECT', 'RETURN');

-- CreateEnum
CREATE TYPE "JudgmentResult" AS ENUM ('QUALIFIED', 'UNQUALIFIED', 'PENDING');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'PENDING_SIGNATURE', 'SIGNED', 'DISTRIBUTED', 'RECALLED');

-- CreateEnum
CREATE TYPE "DistributionMethod" AS ENUM ('EMAIL', 'DOWNLOAD', 'PRINT');

-- CreateEnum
CREATE TYPE "DistributionStatus" AS ENUM ('PENDING', 'SENT', 'RECEIVED', 'FAILED');

-- CreateTable
CREATE TABLE "samples" (
    "id" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "sampleNumber" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientContact" TEXT,
    "sampleName" TEXT NOT NULL,
    "sampleType" TEXT NOT NULL,
    "sampleCategory" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "receivedDate" TIMESTAMP(3) NOT NULL,
    "samplingDate" TIMESTAMP(3),
    "samplingLocation" TEXT,
    "samplingPerson" TEXT,
    "storageLocation" TEXT,
    "storageCondition" TEXT,
    "status" "SampleStatus" NOT NULL DEFAULT 'REGISTERED',
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "description" TEXT,
    "remarks" TEXT,
    "parentSampleId" TEXT,
    "mergedFromIds" TEXT[],
    "workflowInstanceId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "releasedAt" TIMESTAMP(3),
    "releasedBy" TEXT,

    CONSTRAINT "samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_items" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "testMethod" TEXT NOT NULL,
    "testStandard" TEXT,
    "testParameters" JSONB NOT NULL,
    "status" "TestItemStatus" NOT NULL DEFAULT 'PENDING',
    "assignedTo" TEXT,
    "assignedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfers" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "fromLocation" TEXT NOT NULL,
    "toLocation" TEXT NOT NULL,
    "fromPerson" TEXT NOT NULL,
    "toPerson" TEXT NOT NULL,
    "transferDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedDate" TIMESTAMP(3),
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "senderConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "receiverConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "config" JSONB NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "activatedAt" TIMESTAMP(3),

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_instances" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "currentNodes" TEXT[],
    "status" "InstanceStatus" NOT NULL DEFAULT 'RUNNING',
    "variables" JSONB NOT NULL DEFAULT '{}',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "nodeName" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "assignedTo" TEXT,
    "assignedAt" TIMESTAMP(3),
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "result" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "testItemId" TEXT NOT NULL,
    "parameter" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "textValue" TEXT,
    "unit" TEXT,
    "method" TEXT NOT NULL,
    "source" "ResultSource" NOT NULL DEFAULT 'MANUAL',
    "instrumentId" TEXT,
    "formulaId" TEXT,
    "isCalculated" BOOLEAN NOT NULL DEFAULT false,
    "isAbnormal" BOOLEAN NOT NULL DEFAULT false,
    "abnormalReason" TEXT,
    "isRetest" BOOLEAN NOT NULL DEFAULT false,
    "originalResultId" TEXT,
    "retestReason" TEXT,
    "enteredBy" TEXT NOT NULL,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formulas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "expression" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formulas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_tasks" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "auditorId" TEXT NOT NULL,
    "status" "AuditStatus" NOT NULL DEFAULT 'PENDING',
    "decision" "AuditDecision",
    "comments" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "audit_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_judgments" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "result" "JudgmentResult" NOT NULL,
    "basis" TEXT NOT NULL,
    "isAutomatic" BOOLEAN NOT NULL DEFAULT true,
    "judgedBy" TEXT NOT NULL,
    "judgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "quality_judgments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reportNumber" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "generatedBy" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "recalledAt" TIMESTAMP(3),
    "recallReason" TEXT,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signatures" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "signerId" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerRole" TEXT NOT NULL,
    "signatureData" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distributions" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "method" "DistributionMethod" NOT NULL,
    "recipient" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "status" "DistributionStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),

    CONSTRAINT "distributions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "samples_barcode_key" ON "samples"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "samples_sampleNumber_key" ON "samples"("sampleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "samples_workflowInstanceId_key" ON "samples"("workflowInstanceId");

-- CreateIndex
CREATE INDEX "samples_barcode_idx" ON "samples"("barcode");

-- CreateIndex
CREATE INDEX "samples_sampleNumber_idx" ON "samples"("sampleNumber");

-- CreateIndex
CREATE INDEX "samples_status_idx" ON "samples"("status");

-- CreateIndex
CREATE INDEX "samples_clientName_idx" ON "samples"("clientName");

-- CreateIndex
CREATE INDEX "test_items_sampleId_idx" ON "test_items"("sampleId");

-- CreateIndex
CREATE INDEX "test_items_status_idx" ON "test_items"("status");

-- CreateIndex
CREATE INDEX "transfers_sampleId_idx" ON "transfers"("sampleId");

-- CreateIndex
CREATE INDEX "transfers_transferDate_idx" ON "transfers"("transferDate");

-- CreateIndex
CREATE INDEX "workflows_status_idx" ON "workflows"("status");

-- CreateIndex
CREATE INDEX "workflows_isActive_idx" ON "workflows"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_instances_sampleId_key" ON "workflow_instances"("sampleId");

-- CreateIndex
CREATE INDEX "workflow_instances_workflowId_idx" ON "workflow_instances"("workflowId");

-- CreateIndex
CREATE INDEX "workflow_instances_status_idx" ON "workflow_instances"("status");

-- CreateIndex
CREATE INDEX "tasks_instanceId_idx" ON "tasks"("instanceId");

-- CreateIndex
CREATE INDEX "tasks_assignedTo_idx" ON "tasks"("assignedTo");

-- CreateIndex
CREATE INDEX "tasks_status_idx" ON "tasks"("status");

-- CreateIndex
CREATE INDEX "results_sampleId_idx" ON "results"("sampleId");

-- CreateIndex
CREATE INDEX "results_testItemId_idx" ON "results"("testItemId");

-- CreateIndex
CREATE INDEX "audit_tasks_sampleId_idx" ON "audit_tasks"("sampleId");

-- CreateIndex
CREATE INDEX "audit_tasks_auditorId_idx" ON "audit_tasks"("auditorId");

-- CreateIndex
CREATE INDEX "audit_tasks_status_idx" ON "audit_tasks"("status");

-- CreateIndex
CREATE UNIQUE INDEX "quality_judgments_sampleId_key" ON "quality_judgments"("sampleId");

-- CreateIndex
CREATE INDEX "quality_judgments_result_idx" ON "quality_judgments"("result");

-- CreateIndex
CREATE UNIQUE INDEX "reports_reportNumber_key" ON "reports"("reportNumber");

-- CreateIndex
CREATE INDEX "reports_reportNumber_idx" ON "reports"("reportNumber");

-- CreateIndex
CREATE INDEX "reports_sampleId_idx" ON "reports"("sampleId");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "signatures_reportId_idx" ON "signatures"("reportId");

-- CreateIndex
CREATE INDEX "distributions_reportId_idx" ON "distributions"("reportId");

-- AddForeignKey
ALTER TABLE "samples" ADD CONSTRAINT "samples_parentSampleId_fkey" FOREIGN KEY ("parentSampleId") REFERENCES "samples"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "samples" ADD CONSTRAINT "samples_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "workflow_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_items" ADD CONSTRAINT "test_items_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "samples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "samples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "samples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_tasks" ADD CONSTRAINT "audit_tasks_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "samples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_judgments" ADD CONSTRAINT "quality_judgments_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "samples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "samples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "report_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "signatures" ADD CONSTRAINT "signatures_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distributions" ADD CONSTRAINT "distributions_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
