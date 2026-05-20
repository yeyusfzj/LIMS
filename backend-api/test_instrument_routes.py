"""
测试仪器管理路由是否正确注册
"""
import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """测试导入是否正常"""
    try:
        print("测试导入模块...")
        
        # 测试导入 schemas
        from app.schemas.instrument import (
            InstrumentCreate,
            InstrumentUpdate,
            InstrumentResponse,
            InstrumentListResponse,
            InstrumentStatusUpdate,
            InstrumentStatus
        )
        print("✓ schemas.instrument 导入成功")
        
        # 测试导入 service
        from app.services.instrument_service import InstrumentService
        print("✓ services.instrument_service 导入成功")
        
        # 测试导入 API 路由
        from app.api.v1 import instruments
        print("✓ api.v1.instruments 导入成功")
        
        # 测试导入 main
        from app.main import app
        print("✓ main.app 导入成功")
        
        # 检查路由是否注册
        routes = [route.path for route in app.routes]
        instrument_routes = [r for r in routes if '/instruments' in r]
        
        print(f"\n已注册的仪器路由 ({len(instrument_routes)} 个):")
        for route in sorted(instrument_routes):
            print(f"  - {route}")
        
        # 验证必需的路由
        required_routes = [
            "/api/v1/instruments",
            "/api/v1/instruments/{instrument_id}",
            "/api/v1/instruments/{instrument_id}/status",
            "/api/v1/instruments/code/{code}"
        ]
        
        print("\n验证必需路由:")
        all_present = True
        for required in required_routes:
            present = required in instrument_routes
            status = "✓" if present else "✗"
            print(f"  {status} {required}")
            if not present:
                all_present = False
        
        if all_present:
            print("\n✅ 所有测试通过！仪器管理路由已正确注册。")
            return True
        else:
            print("\n❌ 部分路由未注册。")
            return False
            
    except Exception as e:
        print(f"\n❌ 导入失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_imports()
    sys.exit(0 if success else 1)
