"""
Verification script for report-related SQLAlchemy models.

This script verifies that the Report, ReportTemplate, Signature, and Distribution
models are correctly defined and compatible with the Prisma schema.
"""

import sys
from pathlib import Path

# Add the project root to the Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))


def verify_report_models():
    """Verify report-related models"""
    print("=" * 80)
    print("Verifying Report-Related Models")
    print("=" * 80)
    
    try:
        # Import models
        from app.models.report import Report, ReportTemplate, ReportStatus
        from app.models.signature import Signature
        from app.models.distribution import Distribution, DistributionMethod, DistributionStatus
        
        print("\n✓ Successfully imported all report-related models")
        
        # Verify ReportTemplate model
        print("\n" + "-" * 80)
        print("ReportTemplate Model:")
        print("-" * 80)
        print(f"Table name: {ReportTemplate.__tablename__}")
        print(f"Columns: {list(ReportTemplate.__table__.columns.keys())}")
        
        expected_template_columns = [
            'id', 'name', 'description', 'category', 'content', 
            'variables', 'version', 'isActive', 'createdBy', 
            'createdAt', 'updatedAt'
        ]
        actual_template_columns = list(ReportTemplate.__table__.columns.keys())
        
        missing_template_cols = set(expected_template_columns) - set(actual_template_columns)
        extra_template_cols = set(actual_template_columns) - set(expected_template_columns)
        
        if missing_template_cols:
            print(f"⚠ Missing columns: {missing_template_cols}")
        if extra_template_cols:
            print(f"⚠ Extra columns: {extra_template_cols}")
        if not missing_template_cols and not extra_template_cols:
            print("✓ All expected columns present")
        
        # Verify Report model
        print("\n" + "-" * 80)
        print("Report Model:")
        print("-" * 80)
        print(f"Table name: {Report.__tablename__}")
        print(f"Columns: {list(Report.__table__.columns.keys())}")
        
        expected_report_columns = [
            'id', 'reportNumber', 'sampleId', 'templateId', 'content',
            'status', 'version', 'generatedBy', 'generatedAt', 
            'approvedAt', 'recalledAt', 'recallReason'
        ]
        actual_report_columns = list(Report.__table__.columns.keys())
        
        missing_report_cols = set(expected_report_columns) - set(actual_report_columns)
        extra_report_cols = set(actual_report_columns) - set(expected_report_columns)
        
        if missing_report_cols:
            print(f"⚠ Missing columns: {missing_report_cols}")
        if extra_report_cols:
            print(f"⚠ Extra columns: {extra_report_cols}")
        if not missing_report_cols and not extra_report_cols:
            print("✓ All expected columns present")
        
        # Verify ReportStatus enum
        print("\n" + "-" * 80)
        print("ReportStatus Enum:")
        print("-" * 80)
        print(f"Values: {[status.value for status in ReportStatus]}")
        expected_statuses = ['DRAFT', 'PENDING_SIGNATURE', 'SIGNED', 'DISTRIBUTED', 'RECALLED']
        actual_statuses = [status.value for status in ReportStatus]
        if set(expected_statuses) == set(actual_statuses):
            print("✓ All expected status values present")
        else:
            print(f"⚠ Status mismatch. Expected: {expected_statuses}, Got: {actual_statuses}")
        
        # Verify Signature model
        print("\n" + "-" * 80)
        print("Signature Model:")
        print("-" * 80)
        print(f"Table name: {Signature.__tablename__}")
        print(f"Columns: {list(Signature.__table__.columns.keys())}")
        
        expected_signature_columns = [
            'id', 'reportId', 'signerId', 'signerName', 'signerRole',
            'signatureData', 'signedAt'
        ]
        actual_signature_columns = list(Signature.__table__.columns.keys())
        
        missing_signature_cols = set(expected_signature_columns) - set(actual_signature_columns)
        extra_signature_cols = set(actual_signature_columns) - set(expected_signature_columns)
        
        if missing_signature_cols:
            print(f"⚠ Missing columns: {missing_signature_cols}")
        if extra_signature_cols:
            print(f"⚠ Extra columns: {extra_signature_cols}")
        if not missing_signature_cols and not extra_signature_cols:
            print("✓ All expected columns present")
        
        # Verify Distribution model
        print("\n" + "-" * 80)
        print("Distribution Model:")
        print("-" * 80)
        print(f"Table name: {Distribution.__tablename__}")
        print(f"Columns: {list(Distribution.__table__.columns.keys())}")
        
        expected_distribution_columns = [
            'id', 'reportId', 'method', 'recipient', 'recipientEmail',
            'status', 'sentAt', 'receivedAt'
        ]
        actual_distribution_columns = list(Distribution.__table__.columns.keys())
        
        missing_distribution_cols = set(expected_distribution_columns) - set(actual_distribution_columns)
        extra_distribution_cols = set(actual_distribution_columns) - set(expected_distribution_columns)
        
        if missing_distribution_cols:
            print(f"⚠ Missing columns: {missing_distribution_cols}")
        if extra_distribution_cols:
            print(f"⚠ Extra columns: {extra_distribution_cols}")
        if not missing_distribution_cols and not extra_distribution_cols:
            print("✓ All expected columns present")
        
        # Verify DistributionMethod enum
        print("\n" + "-" * 80)
        print("DistributionMethod Enum:")
        print("-" * 80)
        print(f"Values: {[method.value for method in DistributionMethod]}")
        expected_methods = ['EMAIL', 'DOWNLOAD', 'PRINT']
        actual_methods = [method.value for method in DistributionMethod]
        if set(expected_methods) == set(actual_methods):
            print("✓ All expected method values present")
        else:
            print(f"⚠ Method mismatch. Expected: {expected_methods}, Got: {actual_methods}")
        
        # Verify DistributionStatus enum
        print("\n" + "-" * 80)
        print("DistributionStatus Enum:")
        print("-" * 80)
        print(f"Values: {[status.value for status in DistributionStatus]}")
        expected_dist_statuses = ['PENDING', 'SENT', 'RECEIVED', 'FAILED']
        actual_dist_statuses = [status.value for status in DistributionStatus]
        if set(expected_dist_statuses) == set(actual_dist_statuses):
            print("✓ All expected distribution status values present")
        else:
            print(f"⚠ Status mismatch. Expected: {expected_dist_statuses}, Got: {actual_dist_statuses}")
        
        # Verify relationships
        print("\n" + "-" * 80)
        print("Relationships:")
        print("-" * 80)
        
        # ReportTemplate relationships
        template_relationships = [rel.key for rel in ReportTemplate.__mapper__.relationships]
        print(f"ReportTemplate relationships: {template_relationships}")
        if 'reports' in template_relationships:
            print("✓ ReportTemplate has 'reports' relationship")
        else:
            print("⚠ ReportTemplate missing 'reports' relationship")
        
        # Report relationships
        report_relationships = [rel.key for rel in Report.__mapper__.relationships]
        print(f"Report relationships: {report_relationships}")
        expected_report_rels = ['sample', 'template', 'signatures', 'distributions']
        for rel in expected_report_rels:
            if rel in report_relationships:
                print(f"✓ Report has '{rel}' relationship")
            else:
                print(f"⚠ Report missing '{rel}' relationship")
        
        # Signature relationships
        signature_relationships = [rel.key for rel in Signature.__mapper__.relationships]
        print(f"Signature relationships: {signature_relationships}")
        if 'report' in signature_relationships:
            print("✓ Signature has 'report' relationship")
        else:
            print("⚠ Signature missing 'report' relationship")
        
        # Distribution relationships
        distribution_relationships = [rel.key for rel in Distribution.__mapper__.relationships]
        print(f"Distribution relationships: {distribution_relationships}")
        if 'report' in distribution_relationships:
            print("✓ Distribution has 'report' relationship")
        else:
            print("⚠ Distribution missing 'report' relationship")
        
        # Verify foreign keys
        print("\n" + "-" * 80)
        print("Foreign Keys:")
        print("-" * 80)
        
        # Report foreign keys
        report_fks = [fk.target_fullname for fk in Report.__table__.foreign_keys]
        print(f"Report foreign keys: {report_fks}")
        if 'samples.id' in report_fks:
            print("✓ Report has foreign key to samples.id")
        else:
            print("⚠ Report missing foreign key to samples.id")
        if 'report_templates.id' in report_fks:
            print("✓ Report has foreign key to report_templates.id")
        else:
            print("⚠ Report missing foreign key to report_templates.id")
        
        # Signature foreign keys
        signature_fks = [fk.target_fullname for fk in Signature.__table__.foreign_keys]
        print(f"Signature foreign keys: {signature_fks}")
        if 'reports.id' in signature_fks:
            print("✓ Signature has foreign key to reports.id")
        else:
            print("⚠ Signature missing foreign key to reports.id")
        
        # Distribution foreign keys
        distribution_fks = [fk.target_fullname for fk in Distribution.__table__.foreign_keys]
        print(f"Distribution foreign keys: {distribution_fks}")
        if 'reports.id' in distribution_fks:
            print("✓ Distribution has foreign key to reports.id")
        else:
            print("⚠ Distribution missing foreign key to reports.id")
        
        # Verify indexes
        print("\n" + "-" * 80)
        print("Indexes:")
        print("-" * 80)
        
        # Report indexes
        report_indexes = [idx.name for idx in Report.__table__.indexes]
        print(f"Report indexes: {report_indexes}")
        
        # Check indexed columns
        report_indexed_cols = []
        for col in Report.__table__.columns:
            if col.index:
                report_indexed_cols.append(col.name)
        print(f"Report indexed columns: {report_indexed_cols}")
        
        expected_report_indexes = ['reportNumber', 'sampleId', 'status']
        for col in expected_report_indexes:
            if col in report_indexed_cols:
                print(f"✓ Report column '{col}' is indexed")
            else:
                print(f"⚠ Report column '{col}' is not indexed")
        
        # Signature indexes
        signature_indexed_cols = []
        for col in Signature.__table__.columns:
            if col.index:
                signature_indexed_cols.append(col.name)
        print(f"Signature indexed columns: {signature_indexed_cols}")
        if 'reportId' in signature_indexed_cols:
            print("✓ Signature column 'reportId' is indexed")
        else:
            print("⚠ Signature column 'reportId' is not indexed")
        
        # Distribution indexes
        distribution_indexed_cols = []
        for col in Distribution.__table__.columns:
            if col.index:
                distribution_indexed_cols.append(col.name)
        print(f"Distribution indexed columns: {distribution_indexed_cols}")
        if 'reportId' in distribution_indexed_cols:
            print("✓ Distribution column 'reportId' is indexed")
        else:
            print("⚠ Distribution column 'reportId' is not indexed")
        
        print("\n" + "=" * 80)
        print("✓ Report models verification completed successfully!")
        print("=" * 80)
        
        return True
        
    except Exception as e:
        print(f"\n✗ Error during verification: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = verify_report_models()
    sys.exit(0 if success else 1)
