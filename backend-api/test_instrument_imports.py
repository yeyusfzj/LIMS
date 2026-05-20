"""
测试仪器管理模块的导入
"""
import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    print("测试导入 instrument 模型...")
    from app.models.instrument import Instrument, InstrumentStatus
    print("✓ 成功导入 Instrument 模型")
    print(f"  - InstrumentStatus 枚举值: {[s.value for s in InstrumentStatus]}")
    
    print("\n测试导入 instrument schemas...")
    from app.schemas.instrument import (
        InstrumentCreate,
        InstrumentUpdate,
        InstrumentResponse,
        InstrumentListResponse,
        InstrumentStatusUpdate
    )
    print("✓ 成功导入 Instrument schemas")
    
    print("\n测试导入 instrument repository...")
    from app.repositories.instrument_repository import InstrumentRepository
    print("✓ 成功导入 InstrumentRepository")
    
    print("\n测试导入 instrument service...")
    from app.services.instrument_service import InstrumentService
    print("✓ 成功导入 InstrumentService")
    
    print("\n" + "="*50)
    print("所有导入测试通过！")
    print("="*50)
    
except Exception as e:
    print(f"\n✗ 导入失败: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
