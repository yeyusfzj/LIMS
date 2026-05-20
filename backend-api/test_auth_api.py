"""
测试认证 API
"""
import asyncio
import httpx


BASE_URL = "http://localhost:8000/api/v1"


async def test_login():
    """测试登录"""
    print("\n" + "=" * 60)
    print("测试登录 API")
    print("=" * 60)
    
    async with httpx.AsyncClient() as client:
        # 测试登录
        response = await client.post(
            f"{BASE_URL}/auth/login",
            json={
                "username": "admin",
                "password": "admin123"
            }
        )
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            access_token = data["data"]["accessToken"]
            refresh_token = data["data"]["refreshToken"]
            print("\n✓ 登录成功!")
            return access_token, refresh_token
        else:
            print("\n✗ 登录失败!")
            return None, None


async def test_get_user_info(access_token: str):
    """测试获取用户信息"""
    print("\n" + "=" * 60)
    print("测试获取用户信息 API")
    print("=" * 60)
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BASE_URL}/auth/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        if response.status_code == 200:
            print("\n✓ 获取用户信息成功!")
        else:
            print("\n✗ 获取用户信息失败!")


async def test_refresh_token(refresh_token: str):
    """测试刷新令牌"""
    print("\n" + "=" * 60)
    print("测试刷新令牌 API")
    print("=" * 60)
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/auth/refresh",
            json={"refreshToken": refresh_token}
        )
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            new_access_token = data["data"]["accessToken"]
            print("\n✓ 刷新令牌成功!")
            return new_access_token
        else:
            print("\n✗ 刷新令牌失败!")
            return None


async def test_logout(access_token: str):
    """测试登出"""
    print("\n" + "=" * 60)
    print("测试登出 API")
    print("=" * 60)
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/auth/logout",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        print(f"状态码: {response.status_code}")
        print(f"响应: {response.json()}")
        
        if response.status_code == 200:
            print("\n✓ 登出成功!")
        else:
            print("\n✗ 登出失败!")


async def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("FastAPI 认证 API 测试")
    print("=" * 60)
    
    try:
        # 1. 测试登录
        access_token, refresh_token = await test_login()
        
        if not access_token:
            print("\n✗ 测试失败：无法登录")
            return
        
        # 2. 测试获取用户信息
        await test_get_user_info(access_token)
        
        # 3. 测试刷新令牌
        new_access_token = await test_refresh_token(refresh_token)
        
        # 4. 测试登出
        if new_access_token:
            await test_logout(new_access_token)
        
        print("\n" + "=" * 60)
        print("所有测试完成!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ 测试失败: {e}")


if __name__ == "__main__":
    asyncio.run(main())
