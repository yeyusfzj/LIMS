"""
测试分发功能的导入
"""

try:
    print("测试导入 schemas...")
    from app.schemas.report import (
        ReportRecall,
        ReportDistribute,
        DistributionResponse,
        DistributionQuery,
        DistributionListResponse,
        DistributionMethodEnum,
        DistributionStatusEnum
    )
    print("✓ Schemas 导入成功")
    
    print("\n测试导入 distribution service...")
    from app.services.distribution_service import distribution_service
    print("✓ Distribution service 导入成功")
    
    print("\n测试导入 report service...")
    from app.services.report_service import report_service
    print("✓ Report service 导入成功")
    
    print("\n测试创建 schema 实例...")
    recall = ReportRecall(reason="测试撤回")
    print(f"✓ ReportRecall: {recall}")
    
    distribute = ReportDistribute(
        method=DistributionMethodEnum.EMAIL,
        recipient="测试用户",
        recipientEmail="test@example.com"
    )
    print(f"✓ ReportDistribute: {distribute}")
    
    query = DistributionQuery(
        page=1,
        pageSize=20
    )
    print(f"✓ DistributionQuery: {query}")
    
    print("\n✅ 所有导入和实例化测试通过！")
    
except Exception as e:
    print(f"\n❌ 错误: {e}")
    import traceback
    traceback.print_exc()
