#!/usr/bin/env python
"""
Comprehensive test for report models compatibility with Prisma schema.

This script verifies that the SQLAlchemy models match the Prisma schema
definitions for Report, ReportTemplate, Signature, and Distribution.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))


def test_report_template_compatibility():
    """Test ReportTemplate model compatibility with Prisma schema"""
    print("\n" + "=" * 80)
    print("Testing ReportTemplate Model Compatibility")
    print("=" * 80)
    
    from app.models.report import ReportTemplate
    
    # Expected Prisma schema definition:
    # model ReportTemplate {
    #   id          String  @id @default(uuid())
    #   name        String
    #   description String?
    #   category    String
    #   content     String  @db.Text
    #   variables   Json
    #   version     Int     @default(1)
    #   isActive    Boolean @default(true)
    #   reports Report[]
    #   createdBy String
    #   createdAt DateTime @default(now())
    #   updatedAt DateTime @updatedAt
    #   @@map("report_templates")
    # }
    
    checks = []
    
    # Check table name
    checks.append(("Table name", ReportTemplate.__tablename__ == "report_templates"))
    
    # Check columns
    columns = {col.name: col for col in ReportTemplate.__table__.columns}
    
    checks.append(("Column 'id' exists", 'id' in columns))
    checks.append(("Column 'name' exists", 'name' in columns))
    checks.append(("Column 'description' exists", 'description' in columns))
    checks.append(("Column 'category' exists", 'category' in columns))
    checks.append(("Column 'content' exists", 'content' in columns))
    checks.append(("Column 'variables' exists", 'variables' in columns))
    checks.append(("Column 'version' exists", 'version' in columns))
    checks.append(("Column 'isActive' exists", 'isActive' in columns))
    checks.append(("Column 'createdBy' exists", 'createdBy' in columns))
    checks.append(("Column 'createdAt' exists", 'createdAt' in columns))
    checks.append(("Column 'updatedAt' exists", 'updatedAt' in columns))
    
    # Check column types
    checks.append(("'id' is String", str(columns['id'].type) == 'VARCHAR'))
    checks.append(("'name' is String", str(columns['name'].type) == 'VARCHAR'))
    checks.append(("'content' is Text", 'TEXT' in str(columns['content'].type)))
    checks.append(("'variables' is JSON", 'JSON' in str(columns['variables'].type)))
    checks.append(("'version' is Integer", 'INTEGER' in str(columns['version'].type)))
    checks.append(("'isActive' is Boolean", 'BOOLEAN' in str(columns['isActive'].type)))
    
    # Check nullable constraints
    checks.append(("'name' is not nullable", not columns['name'].nullable))
    checks.append(("'description' is nullable", columns['description'].nullable))
    checks.append(("'category' is not nullable", not columns['category'].nullable))
    checks.append(("'content' is not nullable", not columns['content'].nullable))
    
    # Check relationships
    relationships = {rel.key: rel for rel in ReportTemplate.__mapper__.relationships}
    checks.append(("Has 'reports' relationship", 'reports' in relationships))
    
    # Print results
    for check_name, result in checks:
        status = "✓" if result else "✗"
        print(f"{status} {check_name}")
    
    return all(result for _, result in checks)


def test_report_compatibility():
    """Test Report model compatibility with Prisma schema"""
    print("\n" + "=" * 80)
    print("Testing Report Model Compatibility")
    print("=" * 80)
    
    from app.models.report import Report, ReportStatus
    
    # Expected Prisma schema definition:
    # model Report {
    #   id           String         @id @default(uuid())
    #   reportNumber String         @unique
    #   sampleId     String
    #   sample       Sample         @relation(fields: [sampleId], references: [id])
    #   templateId   String
    #   template     ReportTemplate @relation(fields: [templateId], references: [id])
    #   content String       @db.Text
    #   status  ReportStatus @default(DRAFT)
    #   version Int          @default(1)
    #   signatures Signature[]
    #   distributions Distribution[]
    #   generatedBy  String
    #   generatedAt  DateTime  @default(now())
    #   approvedAt   DateTime?
    #   recalledAt   DateTime?
    #   recallReason String?
    #   @@index([reportNumber])
    #   @@index([sampleId])
    #   @@index([status])
    #   @@map("reports")
    # }
    
    checks = []
    
    # Check table name
    checks.append(("Table name", Report.__tablename__ == "reports"))
    
    # Check columns
    columns = {col.name: col for col in Report.__table__.columns}
    
    checks.append(("Column 'id' exists", 'id' in columns))
    checks.append(("Column 'reportNumber' exists", 'reportNumber' in columns))
    checks.append(("Column 'sampleId' exists", 'sampleId' in columns))
    checks.append(("Column 'templateId' exists", 'templateId' in columns))
    checks.append(("Column 'content' exists", 'content' in columns))
    checks.append(("Column 'status' exists", 'status' in columns))
    checks.append(("Column 'version' exists", 'version' in columns))
    checks.append(("Column 'generatedBy' exists", 'generatedBy' in columns))
    checks.append(("Column 'generatedAt' exists", 'generatedAt' in columns))
    checks.append(("Column 'approvedAt' exists", 'approvedAt' in columns))
    checks.append(("Column 'recalledAt' exists", 'recalledAt' in columns))
    checks.append(("Column 'recallReason' exists", 'recallReason' in columns))
    
    # Check column types
    checks.append(("'reportNumber' is String", str(columns['reportNumber'].type) == 'VARCHAR'))
    checks.append(("'content' is Text", 'TEXT' in str(columns['content'].type)))
    checks.append(("'version' is Integer", 'INTEGER' in str(columns['version'].type)))
    
    # Check nullable constraints
    checks.append(("'reportNumber' is not nullable", not columns['reportNumber'].nullable))
    checks.append(("'sampleId' is not nullable", not columns['sampleId'].nullable))
    checks.append(("'templateId' is not nullable", not columns['templateId'].nullable))
    checks.append(("'content' is not nullable", not columns['content'].nullable))
    checks.append(("'approvedAt' is nullable", columns['approvedAt'].nullable))
    checks.append(("'recalledAt' is nullable", columns['recalledAt'].nullable))
    checks.append(("'recallReason' is nullable", columns['recallReason'].nullable))
    
    # Check unique constraints
    checks.append(("'reportNumber' is unique", columns['reportNumber'].unique))
    
    # Check indexes
    indexed_cols = [col.name for col in Report.__table__.columns if col.index]
    checks.append(("'reportNumber' is indexed", 'reportNumber' in indexed_cols))
    checks.append(("'sampleId' is indexed", 'sampleId' in indexed_cols))
    checks.append(("'status' is indexed", 'status' in indexed_cols))
    
    # Check foreign keys
    fk_targets = [fk.target_fullname for fk in Report.__table__.foreign_keys]
    checks.append(("Has FK to samples.id", 'samples.id' in fk_targets))
    checks.append(("Has FK to report_templates.id", 'report_templates.id' in fk_targets))
    
    # Check relationships
    relationships = {rel.key: rel for rel in Report.__mapper__.relationships}
    checks.append(("Has 'sample' relationship", 'sample' in relationships))
    checks.append(("Has 'template' relationship", 'template' in relationships))
    checks.append(("Has 'signatures' relationship", 'signatures' in relationships))
    checks.append(("Has 'distributions' relationship", 'distributions' in relationships))
    
    # Check enum values
    enum_values = [status.value for status in ReportStatus]
    expected_statuses = ['DRAFT', 'PENDING_SIGNATURE', 'SIGNED', 'DISTRIBUTED', 'RECALLED']
    checks.append(("ReportStatus enum matches", set(enum_values) == set(expected_statuses)))
    
    # Print results
    for check_name, result in checks:
        status = "✓" if result else "✗"
        print(f"{status} {check_name}")
    
    return all(result for _, result in checks)


def test_signature_compatibility():
    """Test Signature model compatibility with Prisma schema"""
    print("\n" + "=" * 80)
    print("Testing Signature Model Compatibility")
    print("=" * 80)
    
    from app.models.signature import Signature
    
    # Expected Prisma schema definition:
    # model Signature {
    #   id            String   @id @default(uuid())
    #   reportId      String
    #   report        Report   @relation(fields: [reportId], references: [id], onDelete: Cascade)
    #   signerId      String
    #   signerName    String
    #   signerRole    String
    #   signatureData String   @db.Text
    #   signedAt      DateTime @default(now())
    #   @@index([reportId])
    #   @@map("signatures")
    # }
    
    checks = []
    
    # Check table name
    checks.append(("Table name", Signature.__tablename__ == "signatures"))
    
    # Check columns
    columns = {col.name: col for col in Signature.__table__.columns}
    
    checks.append(("Column 'id' exists", 'id' in columns))
    checks.append(("Column 'reportId' exists", 'reportId' in columns))
    checks.append(("Column 'signerId' exists", 'signerId' in columns))
    checks.append(("Column 'signerName' exists", 'signerName' in columns))
    checks.append(("Column 'signerRole' exists", 'signerRole' in columns))
    checks.append(("Column 'signatureData' exists", 'signatureData' in columns))
    checks.append(("Column 'signedAt' exists", 'signedAt' in columns))
    
    # Check column types
    checks.append(("'signatureData' is Text", 'TEXT' in str(columns['signatureData'].type)))
    
    # Check nullable constraints
    checks.append(("'reportId' is not nullable", not columns['reportId'].nullable))
    checks.append(("'signerId' is not nullable", not columns['signerId'].nullable))
    checks.append(("'signerName' is not nullable", not columns['signerName'].nullable))
    checks.append(("'signerRole' is not nullable", not columns['signerRole'].nullable))
    checks.append(("'signatureData' is not nullable", not columns['signatureData'].nullable))
    
    # Check indexes
    indexed_cols = [col.name for col in Signature.__table__.columns if col.index]
    checks.append(("'reportId' is indexed", 'reportId' in indexed_cols))
    
    # Check foreign keys
    fk_targets = [fk.target_fullname for fk in Signature.__table__.foreign_keys]
    checks.append(("Has FK to reports.id", 'reports.id' in fk_targets))
    
    # Check cascade delete
    for fk in Signature.__table__.foreign_keys:
        if fk.target_fullname == 'reports.id':
            checks.append(("FK has CASCADE delete", fk.ondelete == 'CASCADE'))
    
    # Check relationships
    relationships = {rel.key: rel for rel in Signature.__mapper__.relationships}
    checks.append(("Has 'report' relationship", 'report' in relationships))
    
    # Print results
    for check_name, result in checks:
        status = "✓" if result else "✗"
        print(f"{status} {check_name}")
    
    return all(result for _, result in checks)


def test_distribution_compatibility():
    """Test Distribution model compatibility with Prisma schema"""
    print("\n" + "=" * 80)
    print("Testing Distribution Model Compatibility")
    print("=" * 80)
    
    from app.models.distribution import Distribution, DistributionMethod, DistributionStatus
    
    # Expected Prisma schema definition:
    # model Distribution {
    #   id             String             @id @default(uuid())
    #   reportId       String
    #   report         Report             @relation(fields: [reportId], references: [id], onDelete: Cascade)
    #   method         DistributionMethod
    #   recipient      String
    #   recipientEmail String?
    #   status         DistributionStatus @default(PENDING)
    #   sentAt     DateTime?
    #   receivedAt DateTime?
    #   @@index([reportId])
    #   @@map("distributions")
    # }
    
    checks = []
    
    # Check table name
    checks.append(("Table name", Distribution.__tablename__ == "distributions"))
    
    # Check columns
    columns = {col.name: col for col in Distribution.__table__.columns}
    
    checks.append(("Column 'id' exists", 'id' in columns))
    checks.append(("Column 'reportId' exists", 'reportId' in columns))
    checks.append(("Column 'method' exists", 'method' in columns))
    checks.append(("Column 'recipient' exists", 'recipient' in columns))
    checks.append(("Column 'recipientEmail' exists", 'recipientEmail' in columns))
    checks.append(("Column 'status' exists", 'status' in columns))
    checks.append(("Column 'sentAt' exists", 'sentAt' in columns))
    checks.append(("Column 'receivedAt' exists", 'receivedAt' in columns))
    
    # Check nullable constraints
    checks.append(("'reportId' is not nullable", not columns['reportId'].nullable))
    checks.append(("'method' is not nullable", not columns['method'].nullable))
    checks.append(("'recipient' is not nullable", not columns['recipient'].nullable))
    checks.append(("'recipientEmail' is nullable", columns['recipientEmail'].nullable))
    checks.append(("'sentAt' is nullable", columns['sentAt'].nullable))
    checks.append(("'receivedAt' is nullable", columns['receivedAt'].nullable))
    
    # Check indexes
    indexed_cols = [col.name for col in Distribution.__table__.columns if col.index]
    checks.append(("'reportId' is indexed", 'reportId' in indexed_cols))
    
    # Check foreign keys
    fk_targets = [fk.target_fullname for fk in Distribution.__table__.foreign_keys]
    checks.append(("Has FK to reports.id", 'reports.id' in fk_targets))
    
    # Check cascade delete
    for fk in Distribution.__table__.foreign_keys:
        if fk.target_fullname == 'reports.id':
            checks.append(("FK has CASCADE delete", fk.ondelete == 'CASCADE'))
    
    # Check relationships
    relationships = {rel.key: rel for rel in Distribution.__mapper__.relationships}
    checks.append(("Has 'report' relationship", 'report' in relationships))
    
    # Check enum values
    method_values = [method.value for method in DistributionMethod]
    expected_methods = ['EMAIL', 'DOWNLOAD', 'PRINT']
    checks.append(("DistributionMethod enum matches", set(method_values) == set(expected_methods)))
    
    status_values = [status.value for status in DistributionStatus]
    expected_statuses = ['PENDING', 'SENT', 'RECEIVED', 'FAILED']
    checks.append(("DistributionStatus enum matches", set(status_values) == set(expected_statuses)))
    
    # Print results
    for check_name, result in checks:
        status = "✓" if result else "✗"
        print(f"{status} {check_name}")
    
    return all(result for _, result in checks)


def main():
    """Run all compatibility tests"""
    print("\n" + "=" * 80)
    print("Report Models Compatibility Test Suite")
    print("=" * 80)
    
    results = []
    
    results.append(("ReportTemplate", test_report_template_compatibility()))
    results.append(("Report", test_report_compatibility()))
    results.append(("Signature", test_signature_compatibility()))
    results.append(("Distribution", test_distribution_compatibility()))
    
    print("\n" + "=" * 80)
    print("Test Summary")
    print("=" * 80)
    
    for model_name, passed in results:
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"{status}: {model_name}")
    
    all_passed = all(passed for _, passed in results)
    
    if all_passed:
        print("\n" + "=" * 80)
        print("✓ All compatibility tests passed!")
        print("=" * 80)
        return 0
    else:
        print("\n" + "=" * 80)
        print("✗ Some compatibility tests failed!")
        print("=" * 80)
        return 1


if __name__ == "__main__":
    sys.exit(main())
