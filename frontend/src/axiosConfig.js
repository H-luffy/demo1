import axios from 'axios';

// 创建 axios 实例
const api = axios.create({
  baseURL: 'http://localhost:3001',
  timeout: 120000, // 2分钟超时
  maxContentLength: 50 * 1024 * 1024, // 50MB
  maxBodyLength: 50 * 1024 * 1024, // 50MB
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    console.log('发送请求:', config.url, config.method);
    return config;
  },
  (error) => {
    console.error('请求错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    console.log('收到响应:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('响应错误:', error);
    if (error.code === 'ECONNABORTED') {
      error.message = '请求超时，请重试';
    } else if (error.response) {
      error.message = error.response.data?.error || '请求失败';
    } else if (error.request) {
      error.message = '网络连接失败，请检查网络设置';
    }
    return Promise.reject(error);
  }
);

export default api;
