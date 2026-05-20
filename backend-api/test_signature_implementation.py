"""
测试电子签名实现
验证所有组件是否正确导入和配置
"""

import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """测试所有模块是否可以正确导入"""
    print("测试模块导入...")
    
    try:
        # 测试加密模块
        from app.core.encryption import EncryptionUtils, SignatureEncryption
        print("✓ 加密模块导入成功")
        
        # 测试签名 schemas
        from app.schemas.signature import (
            SignReportRequest,
            VerifySignatureRequest,
            RevokeSignatureRequest,
            SignatureResponse,
            SignatureVerificationResult
        )
        print("✓ 签名 schemas 导入成功")
        
        # 测试签名服务
        from app.services.signature_service import signature_service
        print("✓ 签名服务导入成功")
        
        # 测试签名路由
        from app.routers.signatures import router
        print("✓ 签名路由导入成功")
        
        print("\n所有模块导入成功！")
        return True
        
    except Exception as e:
        print(f"\n✗ 导入失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_encryption():
    """测试加密功能"""
    print("\n测试加密功能...")
    
    try:
        from app.core.encryption import SignatureEncryption
        
        # 测试数据
        test_data = "这是一个测试签名数据"
        
        # 加密
        encrypted = SignatureEncryption.encrypt(test_data)
        print(f"✓ 加密成功: {encrypted[:50]}...")
        
        # 解密
        decrypted = SignatureEncryption.decrypt(encrypted)
        print(f"✓ 解密成功: {decrypted}")
        
        # 验证
        if decrypted == test_data:
            print("✓ 加密解密验证成功")
            return True
        else:
            print("✗ 加密解密验证失败")
            return False
            
    except Exception as e:
        print(f"\n✗ 加密测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_schemas():
    """测试 Pydantic schemas"""
    print("\n测试 Pydantic schemas...")
    
    try:
        from app.schemas.signature import SignReportRequest, SignatureResponse
        from datetime import datetime
        
        # 测试请求 schema
        request = SignReportRequest(
            signatureData="base64_encoded_data",
            signerRole="检测员"
        )
        print(f"✓ SignReportRequest 创建成功: {request.model_dump()}")
        
        # 测试响应 schema
        response = SignatureResponse(
            id="sig-123",
            reportId="report-456",
            signerId="user-789",
            signerName="张三",
            signerRole="检测员",
            signatureData="encrypted_data",
            signedAt=datetime.now()
        )
        print(f"✓ SignatureResponse 创建成功")
        
        return True
        
    except Exception as e:
        print(f"\n✗ Schema 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """运行所有测试"""
    print("=" * 60)
    print("电子签名实现测试")
    print("=" * 60)
    
    results = []
    
    # 运行测试
    results.append(("模块导入", test_imports()))
    results.append(("加密功能", test_encryption()))
    results.append(("Pydantic Schemas", test_schemas()))
    
    # 输出结果
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    
    for name, result in results:
        status = "✓ 通过" if result else "✗ 失败"
        print(f"{name}: {status}")
    
    # 总体结果
    all_passed = all(result for _, result in results)
    print("\n" + "=" * 60)
    if all_passed:
        print("✓ 所有测试通过！")
        print("=" * 60)
        return 0
    else:
        print("✗ 部分测试失败")
        print("=" * 60)
        return 1


if __name__ == "__main__":
    sys.exit(main())
