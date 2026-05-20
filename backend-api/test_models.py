"""
Quick test script to verify models can be imported correctly.
"""

import sys
sys.path.insert(0, '.')

try:
    from app.models import Sample, Transfer, SampleStatus, TransferStatus, Priority, Base
    
    print("✓ Models imported successfully")
    print(f"✓ Sample table: {Sample.__tablename__}")
    print(f"✓ Transfer table: {Transfer.__tablename__}")
    print(f"✓ SampleStatus values: {[s.value for s in SampleStatus]}")
    print(f"✓ TransferStatus values: {[s.value for s in TransferStatus]}")
    print(f"✓ Priority values: {[p.value for p in Priority]}")
    
    # Check key fields
    print(f"\n✓ Sample has {len(Sample.__table__.columns)} columns")
    print(f"✓ Transfer has {len(Transfer.__table__.columns)} columns")
    
    # Check indexes
    sample_indexes = [idx.name for idx in Sample.__table__.indexes]
    print(f"\n✓ Sample indexes: {len(sample_indexes)} indexes defined")
    
    print("\n✅ All model validations passed!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
