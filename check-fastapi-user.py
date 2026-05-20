"""
检查 FastAPI 后端的用户数据
"""
import asyncio
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent / 'fastapi-backend'))

from sqlalchemy import text, select
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.services.auth_service import AuthService


async def check_users():
    """检查数据库中的用户"""
    print("=" * 60)
    print("检查 FastAPI 后端用户数据")
    print("=" * 60)
    
    async with AsyncSessionLocal() as db:
        try:
            # 查询所有用户
            result = await db.execute(select(User))
            users = result.scalars().all()
            
            if not users:
                print("\n❌ 数据库中没有用户!")
                print("\n建议运行以下命令初始化数据库:")
                print("  cd fastapi-backend")
                print("  python scripts/create_auth_tables.py")
                return
            
            print(f"\n✓ 找到 {len(users)} 个用户:\n")
            
            for user in users:
                print(f"用户名: {user.username}")
                print(f"  ID: {user.id}")
                print(f"  邮箱: {user.email}")
                print(f"  全名: {user.fullName}")
                print(f"  状态: {user.status}")
                print(f"  密码哈希: {user.passwordHash[:50]}...")
                
                # 测试密码验证
                test_passwords = ['admin123', 'Admin@123456', 'admin', 'password']
                print(f"  测试密码:")
                for pwd in test_passwords:
                    is_valid = AuthService.verify_password(pwd, user.passwordHash)
                    status = "✓ 正确" if is_valid else "✗ 错误"
                    print(f"    - {pwd}: {status}")
                
                print()
            
        except Exception as e:
            print(f"\n❌ 查询失败: {e}")
            print(f"错误类型: {type(e).__name__}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(check_users())
