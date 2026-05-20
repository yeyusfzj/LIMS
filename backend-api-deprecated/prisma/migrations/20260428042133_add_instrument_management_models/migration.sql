-- CreateEnum
CREATE TYPE "InstrumentStatus" AS ENUM ('IN_USE', 'STANDBY', 'MAINTENANCE', 'CALIBRATING', 'PENDING_DISPOSAL', 'DISPOSED');

-- CreateEnum
CREATE TYPE "InstrumentTransferStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DisposalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('ROUTINE', 'REPAIR', 'PARTS_REPLACEMENT', 'CLEANING', 'OTHER');

-- CreateEnum
CREATE TYPE "CalibrationResult" AS ENUM ('QUALIFIED', 'UNQUALIFIED', 'CONDITIONAL');

-- CreateTable
CREATE TABLE "instruments" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT,
    "manufacturer" TEXT,
    "serialNumber" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "purchasePrice" DOUBLE PRECISION,
    "technicalParams" JSONB,
    "status" "InstrumentStatus" NOT NULL DEFAULT 'IN_USE',
    "currentLocation" TEXT,
    "currentDepartment" TEXT,
    "currentResponsible" TEXT,
    "usageYears" INTEGER,
    "warrantyExpiry" TIMESTAMP(3),
    "description" TEXT,
    "remarks" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instruments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instrument_transfers" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "fromDepartment" TEXT NOT NULL,
    "toDepartment" TEXT NOT NULL,
    "fromResponsible" TEXT NOT NULL,
    "toResponsible" TEXT NOT NULL,
    "transferReason" TEXT,
    "expectedReturnDate" TIMESTAMP(3),
    "status" "InstrumentTransferStatus" NOT NULL DEFAULT 'PENDING',
    "confirmedAt" TIMESTAMP(3),
    "confirmedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectionReason" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instrument_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_records" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "maintenanceDate" TIMESTAMP(3) NOT NULL,
    "maintenanceType" "MaintenanceType" NOT NULL,
    "maintenanceContent" TEXT NOT NULL,
    "maintenancePerson" TEXT NOT NULL,
    "maintenanceCost" DOUBLE PRECISION,
    "nextMaintenanceDate" TIMESTAMP(3),
    "remarks" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calibration_records" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "calibrationDate" TIMESTAMP(3) NOT NULL,
    "calibrationOrg" TEXT NOT NULL,
    "certificateNumber" TEXT,
    "calibrationResult" "CalibrationResult" NOT NULL,
    "nextCalibrationDate" TIMESTAMP(3),
    "remarks" TEXT,
    "certificateFileId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calibration_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disposal_records" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "disposalReason" TEXT NOT NULL,
    "disposalDate" TIMESTAMP(3),
    "status" "DisposalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disposal_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instrument_documents" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "description" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instrument_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_documents" (
    "id" TEXT NOT NULL,
    "maintenanceId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "description" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disposal_documents" (
    "id" TEXT NOT NULL,
    "disposalId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "description" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disposal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "instruments_code_key" ON "instruments"("code");

-- CreateIndex
CREATE INDEX "instruments_code_idx" ON "instruments"("code");

-- CreateIndex
CREATE INDEX "instruments_status_idx" ON "instruments"("status");

-- CreateIndex
CREATE INDEX "instruments_currentDepartment_idx" ON "instruments"("currentDepartment");

-- CreateIndex
CREATE INDEX "instruments_name_idx" ON "instruments"("name");

-- CreateIndex
CREATE INDEX "instrument_transfers_instrumentId_idx" ON "instrument_transfers"("instrumentId");

-- CreateIndex
CREATE INDEX "instrument_transfers_status_idx" ON "instrument_transfers"("status");

-- CreateIndex
CREATE INDEX "instrument_transfers_createdAt_idx" ON "instrument_transfers"("createdAt");

-- CreateIndex
CREATE INDEX "maintenance_records_instrumentId_idx" ON "maintenance_records"("instrumentId");

-- CreateIndex
CREATE INDEX "maintenance_records_maintenanceDate_idx" ON "maintenance_records"("maintenanceDate");

-- CreateIndex
CREATE INDEX "calibration_records_instrumentId_idx" ON "calibration_records"("instrumentId");

-- CreateIndex
CREATE INDEX "calibration_records_calibrationDate_idx" ON "calibration_records"("calibrationDate");

-- CreateIndex
CREATE INDEX "calibration_records_nextCalibrationDate_idx" ON "calibration_records"("nextCalibrationDate");

-- CreateIndex
CREATE UNIQUE INDEX "disposal_records_instrumentId_key" ON "disposal_records"("instrumentId");

-- CreateIndex
CREATE INDEX "disposal_records_status_idx" ON "disposal_records"("status");

-- CreateIndex
CREATE INDEX "disposal_records_createdAt_idx" ON "disposal_records"("createdAt");

-- CreateIndex
CREATE INDEX "instrument_documents_instrumentId_idx" ON "instrument_documents"("instrumentId");

-- CreateIndex
CREATE INDEX "instrument_documents_documentType_idx" ON "instrument_documents"("documentType");

-- CreateIndex
CREATE INDEX "maintenance_documents_maintenanceId_idx" ON "maintenance_documents"("maintenanceId");

-- CreateIndex
CREATE INDEX "disposal_documents_disposalId_idx" ON "disposal_documents"("disposalId");

-- AddForeignKey
ALTER TABLE "instrument_transfers" ADD CONSTRAINT "instrument_transfers_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_records" ADD CONSTRAINT "calibration_records_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calibration_records" ADD CONSTRAINT "calibration_records_certificateFileId_fkey" FOREIGN KEY ("certificateFileId") REFERENCES "instrument_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disposal_records" ADD CONSTRAINT "disposal_records_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_documents" ADD CONSTRAINT "instrument_documents_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_documents" ADD CONSTRAINT "maintenance_documents_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "maintenance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disposal_documents" ADD CONSTRAINT "disposal_documents_disposalId_fkey" FOREIGN KEY ("disposalId") REFERENCES "disposal_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
