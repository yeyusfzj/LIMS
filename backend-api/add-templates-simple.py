# -*- coding: utf-8 -*-
#!/usr/bin/env python3
"""Add report templates with correct variable types"""

import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import get_session_factory
from app.models.report import ReportTemplate
from app.models.user import User
from sqlalchemy import select
from datetime import datetime
import uuid


async def add_templates():
    """Add report templates"""
    session_factory = get_session_factory()
    async with session_factory() as db:
        try:
            # Get admin user
            result = await db.execute(select(User).where(User.username == "admin"))
            admin_user = result.scalar_one_or_none()
            
            if not admin_user:
                print("Admin user not found")
                return
            
            templates = [
                {
                    "name": "Analysis Report Template",
                    "description": "Analysis level report",
                    "category": "ANALYSIS_REPORT",
                    "content": "<h1>Analysis Report</h1><p>Report Number: {{reportNumber}}</p>",
                    "variables": [
                        {"name": "reportNumber", "label": "Report Number", "type": "string", "required": True},
                        {"name": "sampleName", "label": "Sample Name", "type": "string", "required": True},
                        {"name": "testDate", "label": "Test Date", "type": "date", "required": True},
                        {"name": "results", "label": "Results", "type": "array", "required": True},
                        {"name": "analyst", "label": "Analyst", "type": "string", "required": True}
                    ]
                },
                {
                    "name": "Sample Report Template",
                    "description": "Sample level report",
                    "category": "SAMPLE_REPORT",
                    "content": "<h1>Sample Report</h1><p>Report Number: {{reportNumber}}</p>",
                    "variables": [
                        {"name": "reportNumber", "label": "Report Number", "type": "string", "required": True},
                        {"name": "sampleName", "label": "Sample Name", "type": "string", "required": True},
                        {"name": "testDate", "label": "Test Date", "type": "date", "required": True},
                        {"name": "results", "label": "Results", "type": "array", "required": True}
                    ]
                },
                {
                    "name": "Technical Report Template",
                    "description": "Technical level report",
                    "category": "TECHNICAL_REPORT",
                    "content": "<h1>Technical Report</h1><p>Report Number: {{reportNumber}}</p>",
                    "variables": [
                        {"name": "reportNumber", "label": "Report Number", "type": "string", "required": True},
                        {"name": "sampleName", "label": "Sample Name", "type": "string", "required": True},
                        {"name": "testDate", "label": "Test Date", "type": "date", "required": True},
                        {"name": "results", "label": "Results", "type": "array", "required": True},
                        {"name": "technicalAnalysis", "label": "Technical Analysis", "type": "string", "required": True}
                    ]
                },
                {
                    "name": "Quality Report Template",
                    "description": "Quality level report",
                    "category": "QUALITY_REPORT",
                    "content": "<h1>Quality Report</h1><p>Report Number: {{reportNumber}}</p>",
                    "variables": [
                        {"name": "reportNumber", "label": "Report Number", "type": "string", "required": True},
                        {"name": "sampleName", "label": "Sample Name", "type": "string", "required": True},
                        {"name": "testDate", "label": "Test Date", "type": "date", "required": True},
                        {"name": "results", "label": "Results", "type": "array", "required": True},
                        {"name": "qualityGrade", "label": "Quality Grade", "type": "string", "required": True},
                        {"name": "passRate", "label": "Pass Rate", "type": "number", "required": True}
                    ]
                },
                {
                    "name": "Comprehensive Report Template",
                    "description": "Comprehensive report",
                    "category": "COMPREHENSIVE_REPORT",
                    "content": "<h1>Comprehensive Report</h1><p>Report Number: {{reportNumber}}</p>",
                    "variables": [
                        {"name": "reportNumber", "label": "Report Number", "type": "string", "required": True},
                        {"name": "sampleName", "label": "Sample Name", "type": "string", "required": True},
                        {"name": "testDate", "label": "Test Date", "type": "date", "required": True},
                        {"name": "results", "label": "Results", "type": "array", "required": True},
                        {"name": "comprehensiveAnalysis", "label": "Comprehensive Analysis", "type": "string", "required": True},
                        {"name": "conclusion", "label": "Conclusion", "type": "string", "required": True}
                    ]
                }
            ]
            
            for template_data in templates:
                template = ReportTemplate(
                    id=str(uuid.uuid4()),
                    name=template_data["name"],
                    description=template_data["description"],
                    category=template_data["category"],
                    content=template_data["content"],
                    variables=template_data["variables"],
                    version=1,
                    isActive=True,
                    createdBy=admin_user.id,
                    createdAt=datetime.now(),
                    updatedAt=datetime.now()
                )
                db.add(template)
                print(f"Added: {template_data['name']}")
            
            await db.commit()
            print("\nSuccess! Added 5 templates")
            
        except Exception as e:
            await db.rollback()
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(add_templates())
