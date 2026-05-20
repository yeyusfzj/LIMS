# -*- coding: utf-8 -*-
"""添加专业的中文报告模板"""
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


# 分析报告模板
ANALYSIS_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'SimSun', serif; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { font-size: 24px; margin: 10px 0; }
        .header .subtitle { font-size: 14px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #333; padding: 8px; text-align: left; }
        th { background-color: #f0f0f0; font-weight: bold; }
        .section { margin: 20px 0; }
        .section-title { font-size: 16px; font-weight: bold; margin: 15px 0; 
                        border-bottom: 2px solid #333; padding-bottom: 5px; }
        .footer { margin-top: 40px; }
        .signature { display: inline-block; width: 45%; margin: 10px 2%; }
    </style>
</head>
<body>
    <div class="header">
        <h1>检测分析报告</h1>
        <div class="subtitle">Laboratory Analysis Report</div>
    </div>
    
    <div class="section">
        <div class="section-title">一、基本信息</div>
        <table>
            <tr>
                <td width="25%"><strong>报告编号：</strong></td>
                <td width="25%">{{reportNumber}}</td>
                <td width="25%"><strong>样品条码：</strong></td>
                <td width="25%">{{sampleBarcode}}</td>
            </tr>
            <tr>
                <td><strong>样品名称：</strong></td>
                <td>{{sampleName}}</td>
                <td><strong>样品类型：</strong></td>
                <td>{{sampleType}}</td>
            </tr>
            <tr>
                <td><strong>委托单位：</strong></td>
                <td colspan="3">{{clientName}}</td>
            </tr>
            <tr>
                <td><strong>接收日期：</strong></td>
                <td>{{receivedDate}}</td>
                <td><strong>检测日期：</strong></td>
                <td>{{testDate}}</td>
            </tr>
        </table>
    </div>
    
    <div class="section">
        <div class="section-title">二、检测结果</div>
        <table>
            <thead>
                <tr>
                    <th width="5%">序号</th>
                    <th width="20%">检测项目</th>
                    <th width="20%">检测方法</th>
                    <th width="15%">检测结果</th>
                    <th width="10%">单位</th>
                    <th width="15%">标准限值</th>
                    <th width="15%">判定</th>
                </tr>
            </thead>
            <tbody>
                {{#each results}}
                <tr>
                    <td>{{add @index 1}}</td>
                    <td>{{this.parameter}}</td>
                    <td>{{this.method}}</td>
                    <td>{{this.value}}</td>
                    <td>{{this.unit}}</td>
                    <td>{{this.standardLimit}}</td>
                    <td>{{this.judgment}}</td>
                </tr>
                {{/each}}
            </tbody>
        </table>
    </div>
    
    <div class="section">
        <div class="section-title">三、分析说明</div>
        <p style="text-indent: 2em; line-height: 1.8;">{{analysisDescription}}</p>
    </div>
    
    <div class="footer">
        <div class="signature">
            <p><strong>分析人员：</strong>{{analyst}}</p>
            <p><strong>分析日期：</strong>{{analysisDate}}</p>
        </div>
        <div class="signature">
            <p><strong>审核人员：</strong>{{reviewer}}</p>
            <p><strong>审核日期：</strong>{{reviewDate}}</p>
        </div>
    </div>
</body>
</html>
"""

# 样品报告模板
SAMPLE_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'SimSun', serif; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { font-size: 24px; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #333; padding: 8px; text-align: left; }
        th { background-color: #f0f0f0; font-weight: bold; }
        .section-title { font-size: 16px; font-weight: bold; margin: 15px 0; 
                        border-bottom: 2px solid #333; padding-bottom: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>样品检测报告</h1>
        <div class="subtitle">Sample Testing Report</div>
    </div>
    
    <div class="section-title">样品信息</div>
    <table>
        <tr>
            <td width="25%"><strong>报告编号：</strong></td>
            <td width="25%">{{reportNumber}}</td>
            <td width="25%"><strong>样品编号：</strong></td>
            <td width="25%">{{sampleNumber}}</td>
        </tr>
        <tr>
            <td><strong>样品条码：</strong></td>
            <td>{{sampleBarcode}}</td>
            <td><strong>样品名称：</strong></td>
            <td>{{sampleName}}</td>
        </tr>
        <tr>
            <td><strong>样品类型：</strong></td>
            <td>{{sampleType}}</td>
            <td><strong>样品数量：</strong></td>
            <td>{{sampleQuantity}} {{sampleUnit}}</td>
        </tr>
        <tr>
            <td><strong>委托单位：</strong></td>
            <td>{{clientName}}</td>
            <td><strong>联系方式：</strong></td>
            <td>{{clientContact}}</td>
        </tr>
        <tr>
            <td><strong>接收日期：</strong></td>
            <td>{{receivedDate}}</td>
            <td><strong>采样日期：</strong></td>
            <td>{{samplingDate}}</td>
        </tr>
        <tr>
            <td><strong>采样地点：</strong></td>
            <td colspan="3">{{samplingLocation}}</td>
        </tr>
    </table>
    
    <div class="section-title">检测数据</div>
    <table>
        <thead>
            <tr>
                <th width="10%">序号</th>
                <th width="25%">检测项目</th>
                <th width="20%">检测结果</th>
                <th width="15%">单位</th>
                <th width="30%">检测方法</th>
            </tr>
        </thead>
        <tbody>
            {{#each results}}
            <tr>
                <td>{{add @index 1}}</td>
                <td>{{this.parameter}}</td>
                <td>{{this.value}}</td>
                <td>{{this.unit}}</td>
                <td>{{this.method}}</td>
            </tr>
            {{/each}}
        </tbody>
    </table>
    
    <div style="margin-top: 40px;">
        <p><strong>检测人员：</strong>{{tester}} &nbsp;&nbsp;&nbsp; <strong>检测日期：</strong>{{testDate}}</p>
        <p><strong>备注：</strong>{{remarks}}</p>
    </div>
</body>
</html>
"""

# 技术报告模板
TECHNICAL_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'SimSun', serif; margin: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { font-size: 24px; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #333; padding: 8px; text-align: left; }
        th { background-color: #f0f0f0; font-weight: bold; }
        .section-title { font-size: 16px; font-weight: bold; margin: 15px 0; 
                        border-bottom: 2px solid #333; padding-bottom: 5px; }
        .analysis-text { text-indent: 2em; line-height: 1.8; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>技术检测报告</h1>
        <div class="subtitle">Technical Testing Report</div>
    </div>
    
    <div class="section-title">报告信息</div>
    <table>
        <tr>
            <td width="25%"><strong>报告编号：</strong></td>
            <td width="25%">{{reportNumber}}</td>
            <td width="25%"><strong>报告类型：</strong></td>
            <td width="25%">技术报告</td>
        </tr>
        <tr>
            <td><strong>样品信息：</strong></td>
            <td>{{sampleName}} ({{sampleBarcode}})</td>
            <td><strong>委托单位：</strong></td>
            <td>{{clientName}}</td>
        </tr>
    </table>
    
    <div class="section-title">检测方法与标准</div>
    <table>
        <thead>
            <tr>
                <th width="25%">检测项目</th>
                <th width="25%">检测方法</th>
                <th width="25%">检测标准</th>
                <th width="25%">方法依据</th>
            </tr>
        </thead>
        <tbody>
            {{#each methods}}
            <tr>
                <td>{{this.parameter}}</td>
                <td>{{this.method}}</td>
                <td>{{this.standard}}</td>
                <td>{{this.reference}}</td>
            </tr>
            {{/each}}
        </tbody>
    </table>
    
    <div class="section-title">检测结果与评估</div>
    <table>
        <thead>
            <tr>
                <th width="20%">检测项目</th>
                <th width="15%">检测结果</th>
                <th width="10%">单位</th>
                <th width="25%">标准要求</th>
                <th width="30%">符合性评价</th>
            </tr>
        </thead>
        <tbody>
            {{#each results}}
            <tr>
                <td>{{this.parameter}}</td>
                <td>{{this.value}}</td>
                <td>{{this.unit}}</td>
                <td>{{this.requirement}}</td>
                <td>{{this.compliance}}</td>
            </tr>
            {{/each}}
        </tbody>
    </table>
    
    <div class="section-title">技术分析</div>
    <p class="analysis-text">{{technicalAnalysis}}</p>
    
    <div class="section-title">结论与建议</div>
    <p class="analysis-text"><strong>结论：</strong>{{conclusion}}</p>
    <p class="analysis-text"><strong>建议：</strong>{{recommendation}}</p>
    
    <div style="margin-top: 40px;">
        <p><strong>技术负责人：</strong>{{technicalLead}} &nbsp;&nbsp;&nbsp; <strong>审核日期：</strong>{{reviewDate}}</p>
    </div>
</body>
</html>
"""


async def add_templates():
    """添加专业报告模板"""
    session_factory = get_session_factory()
    async with session_factory() as db:
        try:
            result = await db.execute(select(User).where(User.username == "admin"))
            admin_user = result.scalar_one_or_none()
            
            if not admin_user:
                print("未找到管理员用户")
                return
            
            templates = [
                {
                    "name": "分析报告模板",
                    "description": "用于生成分析级别的检测报告，包含详细的检测数据和分析结果",
                    "category": "ANALYSIS_REPORT",
                    "content": ANALYSIS_TEMPLATE,
                    "variables": [
                        {"name": "reportNumber", "label": "报告编号", "type": "string", "required": True},
                        {"name": "sampleBarcode", "label": "样品条码", "type": "string", "required": True},
                        {"name": "sampleName", "label": "样品名称", "type": "string", "required": True},
                        {"name": "sampleType", "label": "样品类型", "type": "string", "required": True},
                        {"name": "clientName", "label": "委托单位", "type": "string", "required": True},
                        {"name": "receivedDate", "label": "接收日期", "type": "date", "required": True},
                        {"name": "testDate", "label": "检测日期", "type": "date", "required": True},
                        {"name": "results", "label": "检测结果列表", "type": "array", "required": True},
                        {"name": "analysisDescription", "label": "分析说明", "type": "string", "required": False},
                        {"name": "analyst", "label": "分析人员", "type": "string", "required": True},
                        {"name": "analysisDate", "label": "分析日期", "type": "date", "required": True},
                        {"name": "reviewer", "label": "审核人员", "type": "string", "required": True},
                        {"name": "reviewDate", "label": "审核日期", "type": "date", "required": True}
                    ]
                },
                {
                    "name": "样品报告模板",
                    "description": "用于生成样品级别的检测报告，侧重样品信息和基础检测数据",
                    "category": "SAMPLE_REPORT",
                    "content": SAMPLE_TEMPLATE,
                    "variables": [
                        {"name": "reportNumber", "label": "报告编号", "type": "string", "required": True},
                        {"name": "sampleNumber", "label": "样品编号", "type": "string", "required": True},
                        {"name": "sampleBarcode", "label": "样品条码", "type": "string", "required": True},
                        {"name": "sampleName", "label": "样品名称", "type": "string", "required": True},
                        {"name": "sampleType", "label": "样品类型", "type": "string", "required": True},
                        {"name": "sampleQuantity", "label": "样品数量", "type": "number", "required": True},
                        {"name": "sampleUnit", "label": "数量单位", "type": "string", "required": True},
                        {"name": "clientName", "label": "委托单位", "type": "string", "required": True},
                        {"name": "clientContact", "label": "联系方式", "type": "string", "required": False},
                        {"name": "receivedDate", "label": "接收日期", "type": "date", "required": True},
                        {"name": "samplingDate", "label": "采样日期", "type": "date", "required": False},
                        {"name": "samplingLocation", "label": "采样地点", "type": "string", "required": False},
                        {"name": "results", "label": "检测结果列表", "type": "array", "required": True},
                        {"name": "tester", "label": "检测人员", "type": "string", "required": True},
                        {"name": "testDate", "label": "检测日期", "type": "date", "required": True},
                        {"name": "remarks", "label": "备注", "type": "string", "required": False}
                    ]
                },
                {
                    "name": "技术报告模板",
                    "description": "用于生成技术级别的检测报告，包含技术分析和专业评估",
                    "category": "TECHNICAL_REPORT",
                    "content": TECHNICAL_TEMPLATE,
                    "variables": [
                        {"name": "reportNumber", "label": "报告编号", "type": "string", "required": True},
                        {"name": "sampleName", "label": "样品名称", "type": "string", "required": True},
                        {"name": "sampleBarcode", "label": "样品条码", "type": "string", "required": True},
                        {"name": "clientName", "label": "委托单位", "type": "string", "required": True},
                        {"name": "methods", "label": "检测方法列表", "type": "array", "required": True},
                        {"name": "results", "label": "检测结果列表", "type": "array", "required": True},
                        {"name": "technicalAnalysis", "label": "技术分析", "type": "string", "required": True},
                        {"name": "conclusion", "label": "结论", "type": "string", "required": True},
                        {"name": "recommendation", "label": "建议", "type": "string", "required": False},
                        {"name": "technicalLead", "label": "技术负责人", "type": "string", "required": True},
                        {"name": "reviewDate", "label": "审核日期", "type": "date", "required": True}
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
                print(f"已添加: {template_data['name']}")
            
            await db.commit()
            print(f"\n成功添加 {len(templates)} 个专业模板！")
            
        except Exception as e:
            await db.rollback()
            print(f"错误: {e}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(add_templates())
