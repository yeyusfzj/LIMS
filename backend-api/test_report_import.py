#!/usr/bin/env python
"""Simple test to import report models"""

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    print("Importing report models...")
    from app.models.report import Report, ReportTemplate, ReportStatus
    print("✓ Report and ReportTemplate imported")
    
    from app.models.signature import Signature
    print("✓ Signature imported")
    
    from app.models.distribution import Distribution, DistributionMethod, DistributionStatus
    print("✓ Distribution imported")
    
    print("\n✓ All report models imported successfully!")
    
except Exception as e:
    print(f"\n✗ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
