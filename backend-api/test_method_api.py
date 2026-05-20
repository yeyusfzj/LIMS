"""
检测方法 API 测试脚本

测试检测方法管理的所有 API 端点
"""
import asyncio
import sys
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.services.method_service import method_service
from app.schemas.method import MethodCreate, MethodUpdate, Equipment, MethodStep, MethodStatus


async def test_method_api():
    """测试检测方法 API"""
    
    print("=" * 80)
    print("检测方法 API 测试")
    print("=" * 80)
    
    async with AsyncSessionLocal() as db:
        try:
            # 测试用户 ID
            test_user_id = "test-user-123"
            
            # ========================================================================
            # 测试 1: 创建检测方法
            # ========================================================================
            print("\n[测试 1] 创建检测方法")
            print("-" * 80)
            
            method_data = MethodCreate(
                code="GB/T 5750.4-2006",
                name="生活饮用水标准检验方法 感官性状和物理指标",
                category="水质检测",
                version="1.0",
                status=MethodStatus.DRAFT,
                scope="适用于生活饮用水中感官性状和物理指标的测定",
                description="本标准规定了生活饮用水中感官性状和物理指标的检验方法",
                equipment=[
                    Equipment(
                        name="分光光度计",
                        model="UV-2600",
                        accuracy="±0.5nm",
                        calibration="每年校准一次"
                    ),
                    Equipment(
                        name="pH计",
                        model="PHS-3C",
                        accuracy="±0.01pH",
                        calibration="每月校准一次"
                    )
                ],
                steps=[
                    MethodStep(
                        title="样品准备",
                        description="取适量水样，确保样品代表性"
                    ),
                    MethodStep(
                        title="仪器校准",
                        description="使用标准溶液校准仪器"
                    ),
                    MethodStep(
                        title="样品测定",
                        description="按照标准方法进行测定"
                    ),
                    MethodStep(
                        title="数据记录",
                        description="记录测定结果并计算"
                    )
                ],
                precision="相对标准偏差 ≤ 5%",
                accuracy="回收率 95% - 105%",
                detectionLimit="0.01 mg/L",
                measurementRange="0.01 - 100 mg/L",
                qualityControl="每批样品做平行样和加标回收",
                safetyNotes="注意化学试剂的安全使用，佩戴防护用品",
                operationNotes="严格按照标准操作程序进行，避免交叉污染"
            )
            
            method = await method_service.create_method(db, method_data, test_user_id)
            print(f"✓ 方法创建成功")
            print(f"  ID: {method.id}")
            print(f"  编号: {method.code}")
            print(f"  名称: {method.name}")
            print(f"  分类: {method.category}")
            print(f"  版本: {method.version}")
            print(f"  状态: {method.status}")
            print(f"  设备数量: {len(method.equipment)}")
            print(f"  步骤数量: {len(method.steps)}")
            
            method_id = method.id
            
            # ========================================================================
            # 测试 2: 查询方法详情
            # ========================================================================
            print("\n[测试 2] 查询方法详情")
            print("-" * 80)
            
            method = await method_service.get_method_by_id(db, method_id)
            print(f"✓ 方法查询成功")
            print(f"  编号: {method.code}")
            print(f"  名称: {method.name}")
            print(f"  适用范围: {method.scope}")
            print(f"  精密度: {method.precision}")
            print(f"  准确度: {method.accuracy}")
            
            # ========================================================================
            # 测试 3: 查询方法列表
            # ========================================================================
            print("\n[测试 3] 查询方法列表")
            print("-" * 80)
            
            result = await method_service.get_method_list(
                db=db,
                page=1,
                page_size=10
            )
            print(f"✓ 方法列表查询成功")
            print(f"  总数: {result['total']}")
            print(f"  当前页: {result['page']}")
            print(f"  每页数量: {result['pageSize']}")
            print(f"  返回数量: {len(result['data'])}")
            
            # ========================================================================
            # 测试 4: 按关键词搜索
            # ========================================================================
            print("\n[测试 4] 按关键词搜索")
            print("-" * 80)
            
            result = await method_service.get_method_list(
                db=db,
                keyword="水质",
                page=1,
                page_size=10
            )
            print(f"✓ 关键词搜索成功")
            print(f"  搜索关键词: 水质")
            print(f"  找到数量: {result['total']}")
            
            # ========================================================================
            # 测试 5: 按分类筛选
            # ========================================================================
            print("\n[测试 5] 按分类筛选")
            print("-" * 80)
            
            result = await method_service.get_method_list(
                db=db,
                category="水质检测",
                page=1,
                page_size=10
            )
            print(f"✓ 分类筛选成功")
            print(f"  筛选分类: 水质检测")
            print(f"  找到数量: {result['total']}")
            
            # ========================================================================
            # 测试 6: 更新方法
            # ========================================================================
            print("\n[测试 6] 更新方法")
            print("-" * 80)
            
            update_data = MethodUpdate(
                description="本标准规定了生活饮用水中感官性状和物理指标的检验方法（已更新）",
                precision="相对标准偏差 ≤ 3%"
            )
            
            method = await method_service.update_method(db, method_id, update_data)
            print(f"✓ 方法更新成功")
            print(f"  更新后描述: {method.description}")
            print(f"  更新后精密度: {method.precision}")
            
            # ========================================================================
            # 测试 7: 复制方法（创建新版本）
            # ========================================================================
            print("\n[测试 7] 复制方法（创建新版本）")
            print("-" * 80)
            
            new_method = await method_service.copy_method(
                db, method_id, "2.0", test_user_id
            )
            print(f"✓ 方法复制成功")
            print(f"  新方法 ID: {new_method.id}")
            print(f"  新版本号: {new_method.version}")
            print(f"  新方法状态: {new_method.status}")
            
            new_method_id = new_method.id
            
            # ========================================================================
            # 测试 8: 查询版本历史
            # ========================================================================
            print("\n[测试 8] 查询版本历史")
            print("-" * 80)
            
            history = await method_service.get_method_history(db, method_id)
            print(f"✓ 版本历史查询成功")
            print(f"  版本数量: {len(history)}")
            for idx, h in enumerate(history, 1):
                print(f"  版本 {idx}: {h.version} (状态: {h.status}, ID: {h.id})")
            
            # ========================================================================
            # 测试 9: 激活方法
            # ========================================================================
            print("\n[测试 9] 激活方法")
            print("-" * 80)
            
            await method_service.activate_method(db, method_id)
            method = await method_service.get_method_by_id(db, method_id)
            print(f"✓ 方法激活成功")
            print(f"  当前状态: {method.status}")
            
            # ========================================================================
            # 测试 10: 归档方法
            # ========================================================================
            print("\n[测试 10] 归档方法")
            print("-" * 80)
            
            await method_service.archive_method(db, new_method_id)
            method = await method_service.get_method_by_id(db, new_method_id)
            print(f"✓ 方法归档成功")
            print(f"  当前状态: {method.status}")
            
            # ========================================================================
            # 测试 11: 删除方法
            # ========================================================================
            print("\n[测试 11] 删除方法")
            print("-" * 80)
            
            await method_service.delete_method(db, new_method_id)
            print(f"✓ 方法删除成功")
            
            # 验证删除
            try:
                await method_service.get_method_by_id(db, new_method_id)
                print(f"✗ 删除验证失败：方法仍然存在")
            except Exception:
                print(f"✓ 删除验证成功：方法已不存在")
            
            # ========================================================================
            # 清理测试数据
            # ========================================================================
            print("\n[清理] 删除测试数据")
            print("-" * 80)
            
            await method_service.delete_method(db, method_id)
            print(f"✓ 测试数据清理完成")
            
            print("\n" + "=" * 80)
            print("所有测试通过！")
            print("=" * 80)
            
        except Exception as e:
            print(f"\n✗ 测试失败: {str(e)}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(test_method_api())
