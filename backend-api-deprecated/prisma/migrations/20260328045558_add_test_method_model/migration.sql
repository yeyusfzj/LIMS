-- CreateEnum
CREATE TYPE "MethodStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "test_methods" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" "MethodStatus" NOT NULL DEFAULT 'DRAFT',
    "scope" TEXT,
    "description" TEXT,
    "equipment" JSONB NOT NULL,
    "steps" JSONB NOT NULL,
    "precision" TEXT,
    "accuracy" TEXT,
    "detectionLimit" TEXT,
    "measurementRange" TEXT,
    "qualityControl" TEXT,
    "safetyNotes" TEXT,
    "operationNotes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_methods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "test_methods_code_key" ON "test_methods"("code");

-- CreateIndex
CREATE INDEX "test_methods_code_idx" ON "test_methods"("code");

-- CreateIndex
CREATE INDEX "test_methods_category_idx" ON "test_methods"("category");

-- CreateIndex
CREATE INDEX "test_methods_status_idx" ON "test_methods"("status");
