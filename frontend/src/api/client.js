import axios from 'axios';

// 创建统一的API客户端实例
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  timeout: 10000, // 10秒超时
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器（可选：添加日志）
apiClient.interceptors.request.use(
  config => {
    console.log('API请求:', config.method.toUpperCase(), config.url);
    return config;
  },
  error => {
    console.error('API请求错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器（可选：统一错误处理）
apiClient.interceptors.response.use(
  response => {
    console.log('API响应:', response.status, response.config.url);
    return response;
  },
  error => {
    console.error('API响应错误:', error.response?.status, error.config?.url);
    return Promise.reject(error);
  }
);

export default apiClient;
