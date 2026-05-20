"""
测试结果分析端点 - 任务 8.5

验证需求：需求 7.10-7.12, 7.13, 7.14
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_analyze_result_normal():
    """测试正常结果分析"""
    response = client.post(
        "/api/agent/result-analysis",
        json={
            "result_data": {
                "铅含量": 0.005,
                "汞含量": 0.0001,
                "镉含量": 0.003
            },
            "experiment_type": "water_heavy_metal"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "data" in data
    assert "result_id" in data["data"]
    assert "status" in data["data"]
    assert "anomalies" in data["data"]
    assert "summary" in data["data"]
    assert "analyzed_at" in data["data"]


def test_analyze_result_with_anomaly():
    """测试异常结果分析"""
    response = client.post(
        "/api/agent/result-analysis",
        json={
            "result_data": {
                "铅含量": 0.05,  # 超出阈值
                "汞含量": 0.0001,
                "镉含量": 0.003
            }
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["status"] in ["warning", "error"]
    assert len(data["data"]["anomalies"]) > 0


def test_analyze_result_empty_data():
    """测试空数据"""
    response = client.post(
        "/api/agent/result-analysis",
        json={
            "result_data": {}
        }
    )
    
    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False
    assert data["error_code"] == "INVALID_INPUT"


def test_analyze_result_invalid_request():
    """测试无效请求"""
    response = client.post(
        "/api/agent/result-analysis",
        json={}
    )
    
    assert response.status_code == 400  # 请求验证错误返回 400
    data = response.json()
    assert data["success"] is False
    assert data["error_code"] == "INVALID_INPUT"


def test_analyze_result_response_format():
    """测试响应格式"""
    response = client.post(
        "/api/agent/result-analysis",
        json={
            "result_data": {
                "pH": 7.0
            }
        }
    )
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/json"
    
    data = response.json()
    # 验证统一响应格式
    assert "success" in data
    assert "data" in data
    assert "error" in data
    assert "error_code" in data
    assert "timestamp" in data


def test_analyze_result_performance():
    """测试性能要求（< 500ms）"""
    import time
    
    start = time.time()
    response = client.post(
        "/api/agent/result-analysis",
        json={
            "result_data": {
                "铅含量": 0.005,
                "汞含量": 0.0001,
                "镉含量": 0.003,
                "pH": 7.0,
                "浊度": 1.5
            }
        }
    )
    duration = time.time() - start
    
    assert response.status_code == 200
    assert duration < 0.5  # 应在 500ms 内完成


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
