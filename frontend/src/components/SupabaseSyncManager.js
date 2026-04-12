import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { isSupabaseAvailable } from '../lib/supabaseClient';

const SupabaseSyncManager = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');

  // 加载 Supabase 状态
  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await axios.get('/api/supabase/status');
      setStatus(response.data);
    } catch (error) {
      console.error('获取 Supabase 状态失败:', error);
      setMessage('❌ 无法连接到后端');
    }
  };

  // 切换自动同步
  const handleToggleSync = async (enable) => {
    setLoading(true);
    setMessage('');
    
    try {
      const response = await axios.post('/api/supabase/toggle-sync', { enable });
      setStatus(response.data);
      setMessage(response.data.message);
    } catch (error) {
      console.error('切换同步开关失败:', error);
      setMessage('❌ 操作失败');
    } finally {
      setLoading(false);
    }
  };

  // 同步单个模板
  const handleSyncTemplate = async () => {
    const templateId = prompt('请输入要同步的模板 ID:');
    if (!templateId) return;
    
    setSyncing(true);
    setMessage('');
    
    try {
      const response = await axios.post('/api/supabase/sync-template', { templateId });
      setMessage(`✅ ${response.data.message}`);
    } catch (error) {
      console.error('同步模板失败:', error);
      setMessage(`❌ ${error.response?.data?.error || '同步失败'}`);
    } finally {
      setSyncing(false);
    }
  };

  // 批量同步所有模板
  const handleSyncAll = async () => {
    if (!window.confirm('确定要同步所有模板到 Supabase 吗？')) return;
    
    setSyncing(true);
    setMessage('');
    
    try {
      const response = await axios.post('/api/supabase/sync-all');
      const { stats } = response.data;
      setMessage(`✅ 同步完成: 成功 ${stats.success}, 失败 ${stats.failed}, 总计 ${stats.total}`);
    } catch (error) {
      console.error('批量同步失败:', error);
      setMessage(`❌ ${error.response?.data?.error || '批量同步失败'}`);
    } finally {
      setSyncing(false);
    }
  };

  const supabaseAvailable = isSupabaseAvailable();

  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        ☁️ Supabase 云同步管理
      </h2>

      {/* 状态显示 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium">前端配置:</span>
          <span className={supabaseAvailable ? 'text-green-600' : 'text-yellow-600'}>
            {supabaseAvailable ? '✅ 已配置' : '⚠️ 未配置'}
          </span>
        </div>
        
        {status && (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">后端连接:</span>
              <span className={status.available ? 'text-green-600' : 'text-red-600'}>
                {status.available ? '✅ 已连接' : '❌ 未连接'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">自动同步:</span>
              <span className={status.syncEnabled ? 'text-green-600' : 'text-gray-600'}>
                {status.syncEnabled ? '✅ 已开启' : '❌ 已关闭'}
              </span>
            </div>
          </>
        )}
      </div>

      {/* 控制按钮 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => handleToggleSync(true)}
            disabled={loading || !status?.available}
            variant={status?.syncEnabled ? 'default' : 'outline'}
          >
            开启自动同步
          </Button>
          
          <Button
            onClick={() => handleToggleSync(false)}
            disabled={loading || !status?.available}
            variant={!status?.syncEnabled ? 'default' : 'outline'}
          >
            关闭自动同步
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSyncTemplate}
            disabled={syncing || !status?.available}
            variant="outline"
          >
            {syncing ? '同步中...' : '同步单个模板'}
          </Button>
          
          <Button
            onClick={handleSyncAll}
            disabled={syncing || !status?.available}
            variant="primary"
          >
            {syncing ? '批量同步中...' : '批量同步所有模板'}
          </Button>
        </div>

        <Button
          onClick={loadStatus}
          disabled={loading}
          variant="ghost"
        >
          🔄 刷新状态
        </Button>
      </div>

      {/* 消息提示 */}
      {message && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
          {message}
        </div>
      )}

      {/* 使用说明 */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded text-sm">
        <h3 className="font-bold mb-2">📖 使用说明</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700">
          <li><strong>自动同步</strong>：开启后，每次保存模板都会自动同步到 Supabase</li>
          <li><strong>同步单个模板</strong>：手动指定模板 ID 进行同步</li>
          <li><strong>批量同步</strong>：将所有本地模板一次性同步到云端</li>
          <li>数据采用双轨存储，本地 JSON 文件始终保留</li>
          <li>首次使用需要在 Supabase Dashboard 执行 SQL 初始化脚本</li>
        </ul>
      </div>
    </Card>
  );
};

export default SupabaseSyncManager;
