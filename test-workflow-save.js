/**
 * 测试工作流保存功能
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testWorkflowSave() {
  try {
    console.log('1. 测试登录...');
    console.log('请求URL:', `${API_BASE}/auth/login`);
    
    // 1. 登录获取token
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'Admin@123456'
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('登录成功:', loginResponse.data);
    const token = loginResponse.data.data.accessToken;
    console.log('提取的token:', token);
    
    // 2. 测试工作流保存
    console.log('2. 测试工作流保存...');
    
    const workflowData = {
      name: '测试工作流',
      description: '这是一个测试工作流',
      config: {
        nodes: [
          {
            id: 'start-1',
            type: 'START',
            name: '开始',
            description: '工作流开始节点'
          },
          {
            id: 'task-1',
            type: 'TASK',
            name: '样品登记',
            description: '登记样品信息'
          },
          {
            id: 'end-1',
            type: 'END',
            name: '结束',
            description: '工作流结束节点'
          }
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'start-1',
            target: 'task-1',
            label: '开始到任务'
          },
          {
            id: 'edge-2',
            source: 'task-1',
            target: 'end-1',
            label: '任务到结束'
          }
        ]
      }
    };
    
    const workflowResponse = await axios.post(`${API_BASE}/workflows`, workflowData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('工作流保存成功:', workflowResponse.data);
    
    // 3. 测试获取工作流列表
    console.log('3. 测试获取工作流列表...');
    
    const listResponse = await axios.get(`${API_BASE}/workflows`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('工作流列表:', listResponse.data);
    
    console.log('✅ 所有测试通过！');
    
  } catch (error) {
    console.error('❌ 测试失败:');
    if (error.code) {
      console.error('错误代码:', error.code);
    }
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
      console.error('响应头:', error.response.headers);
    } else if (error.request) {
      console.error('请求已发送但没有收到响应');
      console.error('请求配置:', error.config);
    } else {
      console.error('错误信息:', error.message);
    }
    console.error('完整错误:', error);
  }
}

testWorkflowSave();