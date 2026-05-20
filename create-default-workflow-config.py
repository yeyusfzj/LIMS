"""
创建默认的审核流程配置
"""
import asyncio
import asyncpg
import uuid
import json
from datetime import datetime

async def create_default_config():
    print("=== 创建默认审核流程配置 ===\n")
    
    try:
        # 连接数据库
        conn = await asyncpg.connect(
            host='localhost',
            port=5432,
            user='postgres',
            password='password',
            database='lims_dev'
        )
        
        # 1. 创建默认配置
        config_id = str(uuid.uuid4())
        now = datetime.now()
        
        print("1. 创建默认审核流程配置...")
        
        # 定义审核级别（JSON 格式）
        levels = [
            {
                "id": str(uuid.uuid4()),
                "order": 1,
                "name": "一级审核",
                "description": "初级审核员审核",
                "role": "auditor",
                "required": True,
                "autoAssign": True
            },
            {
                "id": str(uuid.uuid4()),
                "order": 2,
                "name": "二级审核",
                "description": "高级审核员审核",
                "role": "senior_auditor",
                "required": True,
                "autoAssign": True
            },
            {
                "id": str(uuid.uuid4()),
                "order": 3,
                "name": "三级审核",
                "description": "技术负责人审核",
                "role": "tech_lead",
                "required": False,
                "autoAssign": False
            }
        ]
        
        await conn.execute("""
            INSERT INTO audit_workflow_configs (
                id, name, "sampleTypes", levels, "parallelAudit", status, 
                "createdBy", "createdAt", "updatedAt"
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        """, 
            config_id,
            "默认审核流程",
            ["水质", "土壤", "大气", "固废"],  # 样品类型数组
            json.dumps(levels),  # 转换为 JSON 字符串
            False,  # 不并行审核
            "ACTIVE",  # 激活状态（大写）
            "system",  # 创建者
            now,
            now
        )
        print(f"   ✅ 创建成功，ID: {config_id}\n")
        
        # 2. 验证创建结果
        print("2. 验证创建结果...")
        count = await conn.fetchval("SELECT COUNT(*) FROM audit_workflow_configs")
        print(f"   配置总数: {count}")
        
        config = await conn.fetchrow("""
            SELECT id, name, status, "sampleTypes", "parallelAudit", levels
            FROM audit_workflow_configs
            WHERE id = $1
        """, config_id)
        
        if config:
            print(f"   ✅ 配置详情:")
            print(f"      ID: {config['id']}")
            print(f"      名称: {config['name']}")
            print(f"      状态: {config['status']}")
            print(f"      样品类型: {config['sampleTypes']}")
            print(f"      并行审核: {config['parallelAudit']}")
            print(f"      审核级别数: {len(config['levels'])}")
        
        await conn.close()
        print("\n✅ 完成！")
        
    except Exception as e:
        print(f"❌ 错误: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(create_default_config())
