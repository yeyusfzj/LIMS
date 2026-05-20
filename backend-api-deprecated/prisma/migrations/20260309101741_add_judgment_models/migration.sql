-- CreateTable
CREATE TABLE "judgment_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "testItemType" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "judgment_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "judgment_history" (
    "id" TEXT NOT NULL,
    "judgmentId" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "previousResult" "JudgmentResult" NOT NULL,
    "newResult" "JudgmentResult" NOT NULL,
    "changeReason" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "judgment_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "judgment_rules_testItemType_idx" ON "judgment_rules"("testItemType");

-- CreateIndex
CREATE INDEX "judgment_rules_isActive_idx" ON "judgment_rules"("isActive");

-- CreateIndex
CREATE INDEX "judgment_history_judgmentId_idx" ON "judgment_history"("judgmentId");

-- CreateIndex
CREATE INDEX "judgment_history_sampleId_idx" ON "judgment_history"("sampleId");

-- CreateIndex
CREATE INDEX "judgment_history_changedAt_idx" ON "judgment_history"("changedAt");

-- AddForeignKey
ALTER TABLE "judgment_history" ADD CONSTRAINT "judgment_history_judgmentId_fkey" FOREIGN KEY ("judgmentId") REFERENCES "quality_judgments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
