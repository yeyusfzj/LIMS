"""
异常检测 API 测试

测试异常检测规则配置和复测申请功能
"""
import asyncio
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))

from app.services.anomaly_service import anomaly_service, AnomalyRuleType
from app.core.database import get_session_factory


async def test_anomaly_detection():
    """测试异常检测功能"""
    print("=" * 60)
    print("测试异常检测服务")
    print("=" * 60)
    
    session_factory = get_session_factory()
    async with session_factory() as db:
        try:
            # 1. 创建范围检测规则
            print("\n1. 创建范围检测规则...")
            range_rule_data = {
                "name": "pH 值范围检测",
                "description": "检测 pH 值是否在正常范围内",
                "testMethod": "pH 测定",
                "parameter": "pH",
                "ruleType": AnomalyRuleType.RANGE,
                "config": {
                    "min": 6.5,
                    "max": 8.5
                },
                "isActive": True,
                "priority": 10,
                "createdBy": "test_user"
            }
            
            range_rule = await anomaly_service.create_rule(db, range_rule_data)
            print(f"✓ 范围检测规则创建成功: {range_rule['id']}")
            print(f"  规则名称: {range_rule['name']}")
            print(f"  检测方法: {range_rule['testMethod']}")
            print(f"  参数: {range_rule['parameter']}")
            print(f"  范围: {range_rule['config']['min']} - {range_rule['config']['max']}")
            
            # 2. 创建偏差检测规则
            print("\n2. 创建偏差检测规则...")
            deviation_rule_data = {
                "name": "温度偏差检测",
                "description": "检测温度与参考值的偏差",
                "testMethod": "温度测定",
                "parameter": "温度",
                "ruleType": AnomalyRuleType.DEVIATION,
                "config": {
                    "referenceValue": 25.0,
                    "maxDeviation": 2.0,
                    "deviationType": "absolute"
                },
                "isActive": True,
                "priority": 5,
                "createdBy": "test_user"
            }
            
            deviation_rule = await anomaly_service.create_rule(db, deviation_rule_data)
            print(f"✓ 偏差检测规则创建成功: {deviation_rule['id']}")
            print(f"  规则名称: {deviation_rule['name']}")
            print(f"  参考值: {deviation_rule['config']['referenceValue']}")
            print(f"  最大偏差: {deviation_rule['config']['maxDeviation']}")
            
            # 3. 查询所有规则
            print("\n3. 查询所有规则...")
            all_rules = await anomaly_service.list_rules(db)
            print(f"✓ 共有 {len(all_rules)} 条规则")
            for rule in all_rules:
                print(f"  - {rule['name']} ({rule['ruleType']})")
            
            # 4. 测试范围检测 - 正常值
            print("\n4. 测试范围检测 - 正常值...")
            normal_result = {
                "id": "test_result_1",
                "sampleId": "test_sample_1",
                "method": "pH 测定",
                "parameter": "pH",
                "value": 7.2
            }
            
            detection_result = await anomaly_service.detect_anomaly(db, normal_result)
            print(f"  检测值: {normal_result['value']}")
            print(f"  是否异常: {detection_result['isAbnormal']}")
            if not detection_result['isAbnormal']:
                print("  ✓ 正常值检测通过")
            
            # 5. 测试范围检测 - 异常值（低于最小值）
            print("\n5. 测试范围检测 - 异常值（低于最小值）...")
            abnormal_result_low = {
                "id": "test_result_2",
                "sampleId": "test_sample_2",
                "method": "pH 测定",
                "parameter": "pH",
                "value": 5.5
            }
            
            detection_result = await anomaly_service.detect_anomaly(db, abnormal_result_low)
            print(f"  检测值: {abnormal_result_low['value']}")
            print(f"  是否异常: {detection_result['isAbnormal']}")
            if detection_result['isAbnormal']:
                print(f"  ✓ 异常检测成功")
                print(f"  异常原因: {detection_result['reason']}")
                print(f"  触发规则: {detection_result['ruleName']}")
            
            # 6. 测试范围检测 - 异常值（高于最大值）
            print("\n6. 测试范围检测 - 异常值（高于最大值）...")
            abnormal_result_high = {
                "id": "test_result_3",
                "sampleId": "test_sample_3",
                "method": "pH 测定",
                "parameter": "pH",
                "value": 9.5
            }
            
            detection_result = await anomaly_service.detect_anomaly(db, abnormal_result_high)
            print(f"  检测值: {abnormal_result_high['value']}")
            print(f"  是否异常: {detection_result['isAbnormal']}")
            if detection_result['isAbnormal']:
                print(f"  ✓ 异常检测成功")
                print(f"  异常原因: {detection_result['reason']}")
                print(f"  触发规则: {detection_result['ruleName']}")
            
            # 7. 测试偏差检测 - 正常值
            print("\n7. 测试偏差检测 - 正常值...")
            normal_temp_result = {
                "id": "test_result_4",
                "sampleId": "test_sample_4",
                "method": "温度测定",
                "parameter": "温度",
                "value": 25.5
            }
            
            detection_result = await anomaly_service.detect_anomaly(db, normal_temp_result)
            print(f"  检测值: {normal_temp_result['value']}")
            print(f"  是否异常: {detection_result['isAbnormal']}")
            if not detection_result['isAbnormal']:
                print("  ✓ 正常值检测通过")
            
            # 8. 测试偏差检测 - 异常值
            print("\n8. 测试偏差检测 - 异常值...")
            abnormal_temp_result = {
                "id": "test_result_5",
                "sampleId": "test_sample_5",
                "method": "温度测定",
                "parameter": "温度",
                "value": 28.5
            }
            
            detection_result = await anomaly_service.detect_anomaly(db, abnormal_temp_result)
            print(f"  检测值: {abnormal_temp_result['value']}")
            print(f"  是否异常: {detection_result['isAbnormal']}")
            if detection_result['isAbnormal']:
                print(f"  ✓ 异常检测成功")
                print(f"  异常原因: {detection_result['reason']}")
                print(f"  触发规则: {detection_result['ruleName']}")
            
            # 9. 更新规则
            print("\n9. 更新规则...")
            update_data = {
                "isActive": False,
                "description": "已停用的规则"
            }
            
            updated_rule = await anomaly_service.update_rule(db, range_rule['id'], update_data)
            print(f"✓ 规则更新成功")
            print(f"  规则状态: {'激活' if updated_rule['isActive'] else '停用'}")
            print(f"  描述: {updated_rule['description']}")
            
            # 10. 测试停用规则后的检测
            print("\n10. 测试停用规则后的检测...")
            detection_result = await anomaly_service.detect_anomaly(db, abnormal_result_high)
            print(f"  检测值: {abnormal_result_high['value']}")
            print(f"  是否异常: {detection_result['isAbnormal']}")
            if not detection_result['isAbnormal']:
                print("  ✓ 停用规则后不再检测异常")
            
            # 11. 删除规则
            print("\n11. 删除规则...")
            await anomaly_service.delete_rule(db, range_rule['id'])
            print(f"✓ 规则删除成功: {range_rule['id']}")
            
            await anomaly_service.delete_rule(db, deviation_rule['id'])
            print(f"✓ 规则删除成功: {deviation_rule['id']}")
            
            # 12. 验证规则已删除
            print("\n12. 验证规则已删除...")
            all_rules = await anomaly_service.list_rules(db)
            print(f"✓ 当前规则数量: {len(all_rules)}")
            
            print("\n" + "=" * 60)
            print("✓ 所有测试通过！")
            print("=" * 60)
            
        except Exception as e:
            print(f"\n✗ 测试失败: {str(e)}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_anomaly_detection())
