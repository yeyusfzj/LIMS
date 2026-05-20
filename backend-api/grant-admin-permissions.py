"""
为admin用户授予所有权限

这个脚本会:
1. 确保admin用户存在
2. 为admin用户分配所有角色
3. 验证权限设置
"""

import asyncio
from sqlalchemy import select
from app.core.database import get_session_factory
from app.models.user import User
from app.core.logging import logger


async def grant_admin_permissions():
    """为admin用户授予所有权限"""
    
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            # 查找admin用户
            result = await session.execute(
                select(User).where(User.username == "admin")
            )
            admin_user = result.scalar_one_or_none()
            
            if not admin_user:
                print("❌ 未找到admin用户")
                return False
            
            print(f"✓ 找到admin用户: {admin_user.username} (ID: {admin_user.id})")
            print(f"  当前角色: {admin_user.roles}")
            
            # 定义所有可能的角色
            all_roles = [
                "admin",
                "auditor",
                "senior_auditor", 
                "audit_supervisor",
                "lab_manager",
                "technician",
                "analyst",
                "quality_manager",
                "report_reviewer",
                "sample_manager"
            ]
            
            # 更新admin用户的角色
            admin_user.roles = all_roles
            
            await session.commit()
            await session.refresh(admin_user)
            
            print(f"\n✓ 已为admin用户授予所有角色:")
            for role in admin_user.roles:
                print(f"  - {role}")
            
            print(f"\n✓ 权限授予成功!")
            print(f"  用户名: admin")
            print(f"  密码: admin123")
            print(f"  角色数量: {len(admin_user.roles)}")
            
            return True
            
        except Exception as e:
            print(f"❌ 授予权限失败: {str(e)}")
            logger.error(f"Grant admin permissions failed: {str(e)}")
            await session.rollback()
            return False


async def verify_admin_permissions():
    """验证admin用户的权限"""
    
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            result = await session.execute(
                select(User).where(User.username == "admin")
            )
            admin_user = result.scalar_one_or_none()
            
            if not admin_user:
                print("❌ 未找到admin用户")
                return False
            
            print("\n" + "="*50)
            print("Admin用户权限验证")
            print("="*50)
            print(f"用户ID: {admin_user.id}")
            print(f"用户名: {admin_user.username}")
            print(f"邮箱: {admin_user.email}")
            print(f"全名: {admin_user.full_name}")
            print(f"状态: {'激活' if admin_user.is_active else '未激活'}")
            print(f"\n角色列表 ({len(admin_user.roles)} 个):")
            for i, role in enumerate(admin_user.roles, 1):
                print(f"  {i}. {role}")
            
            return True
            
        except Exception as e:
            print(f"❌ 验证权限失败: {str(e)}")
            return False


async def main():
    """主函数"""
    print("="*50)
    print("为Admin用户授予所有权限")
    print("="*50)
    print()
    
    # 授予权限
    success = await grant_admin_permissions()
    
    if success:
        # 验证权限
        await verify_admin_permissions()
        print("\n✓✓✓ 所有操作完成 ✓✓✓")
    else:
        print("\n✗✗✗ 操作失败 ✗✗✗")


if __name__ == "__main__":
    asyncio.run(main())
