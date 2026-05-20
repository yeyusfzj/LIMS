-- Add version fields for optimistic locking

-- Add version field to samples table
ALTER TABLE "samples" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- Add version field to results table
ALTER TABLE "results" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- Add version field to reports table
ALTER TABLE "reports" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- Add version field to quality_judgments table
ALTER TABLE "quality_judgments" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
