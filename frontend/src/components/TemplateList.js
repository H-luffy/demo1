import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../axiosConfig';

const TemplateList = ({ isAdmin = false }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [images, setImages] = useState({});
  const [renamingTemplate, setRenamingTemplate] = useState(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [operationError, setOperationError] = useState(null);
  const [operationSuccess, setOperationSuccess] = useState(null);

  // 调试信息
  console.log('TemplateList - isAdmin:', isAdmin, 'type:', typeof isAdmin);

  // 获取模板列表
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        console.log('开始获取模板列表...');
        const response = await api.get('/api/templates');
        const templatesData = response.data;
        console.log('获取到模板数据:', templatesData);

        // 加载所有模板图片并转换为Base64
        const imagePromises = templatesData.map(async (template) => {
          try {
            const imageUrl = `http://localhost:3001${template.image}`;
            console.log('加载图片:', imageUrl);
            const imgResponse = await fetch(imageUrl);
            if (!imgResponse.ok) {
              throw new Error(`HTTP error! status: ${imgResponse.status}`);
            }
            const blob = await imgResponse.blob();
            const reader = new FileReader();
            return new Promise((resolve) => {
              reader.onloadend = () => {
                console.log('图片加载成功:', template.templateId);
                resolve({ id: template.templateId, base64: reader.result });
              };
              reader.onerror = () => {
                console.error('FileReader 错误:', template.templateId);
                resolve({ id: template.templateId, base64: null });
              };
              reader.readAsDataURL(blob);
            });
          } catch (err) {
            console.error('加载图片失败:', template.templateId, err);
            return { id: template.templateId, base64: null };
          }
        });

        const imageResults = await Promise.all(imagePromises);
        const imagesMap = {};
        imageResults.forEach(result => {
          if (result.base64) {
            imagesMap[result.id] = result.base64;
          }
        });

        setImages(imagesMap);
        setTemplates(templatesData);
        setLoading(false);
        console.log('模板列表加载成功');
      } catch (err) {
        console.error('获取模板列表失败:', err);
        setError('获取模板列表失败: ' + (err.message || '未知错误'));
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  // 处理重命名模板
  const handleRename = async (templateId) => {
    if (!newTemplateName.trim()) {
      setOperationError('模板名称不能为空');
      return;
    }

    try {
      const adminPassword = localStorage.getItem('adminPassword') || '';
      await api.put(`/api/template/${templateId}/rename`, {
        name: newTemplateName.trim(),
        adminPassword
      });

      // 更新本地模板列表
      setTemplates(templates.map(t => 
        t.templateId === templateId 
          ? { ...t, name: newTemplateName.trim() }
          : t
      ));

      setOperationSuccess('重命名成功');
      setRenamingTemplate(null);
      setNewTemplateName('');
      setOperationError(null);

      // 3秒后清除成功消息
      setTimeout(() => setOperationSuccess(null), 3000);
    } catch (err) {
      setOperationError(err.response?.data?.error || '重命名失败');
    }
  };

  // 处理删除模板
  const handleDelete = async (templateId) => {
    try {
      const adminPassword = localStorage.getItem('adminPassword') || '';
      await api.delete(`/api/template/${templateId}`, {
        data: { adminPassword }
      });

      // 从本地模板列表中移除
      setTemplates(templates.filter(t => t.templateId !== templateId));

      // 从图片缓存中移除
      setImages(prev => {
        const newImages = { ...prev };
        delete newImages[templateId];
        return newImages;
      });

      setOperationSuccess('删除成功');
      setShowDeleteConfirm(null);
      setOperationError(null);

      // 3秒后清除成功消息
      setTimeout(() => setOperationSuccess(null), 3000);
    } catch (err) {
      setOperationError(err.response?.data?.error || '删除失败');
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (templates.length === 0) {
    return (
      <div className="card">
        <h2>暂无模板</h2>
        <p>当前还没有可用的课表模板</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#2d3748', margin: 0 }}>选择模板</h2>
        {operationSuccess && (
          <div style={{ color: '#48bb78', fontSize: '14px' }}>{operationSuccess}</div>
        )}
      </div>
      {operationError && (
        <div style={{ 
          backgroundColor: '#fed7d7', 
          color: '#c53030', 
          padding: '12px', 
          borderRadius: '4px', 
          marginBottom: '16px' 
        }}>
          {operationError}
        </div>
      )}
      <div className="template-grid">
        {templates.map(template => (
          <div key={template.templateId} className="template-card" style={{ position: 'relative' }}>
            {isAdmin && (
              <div style={{ 
                position: 'absolute', 
                top: '8px', 
                right: '8px', 
                zIndex: 100,
                display: 'flex',
                gap: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                padding: '4px',
                borderRadius: '6px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
              }}>
                <button
                  onClick={() => {
                    setRenamingTemplate(template.templateId);
                    setNewTemplateName(template.name || `模板 #${template.templateId}`);
                    setOperationError(null);
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#4299e1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#3182ce';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#4299e1';
                  }}
                >
                  重命名
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(template.templateId);
                    setOperationError(null);
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#f56565',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#e53e3e';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#f56565';
                  }}
                >
                  删除
                </button>
              </div>
            )}
            <img
              src={images[template.templateId] || `http://localhost:3001${template.image}`}
              alt={`模板 ${template.templateId}`}
            />
            <div className="template-card-body">
              <div className="template-card-title">
                {renamingTemplate === template.templateId ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleRename(template.templateId);
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() => handleRename(template.templateId)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#48bb78',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      确认
                    </button>
                    <button
                      onClick={() => {
                        setRenamingTemplate(null);
                        setNewTemplateName('');
                        setOperationError(null);
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#a0aec0',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  template.name || `模板 #${template.templateId}`
                )}
              </div>
              <div className="template-card-actions">
                <Link
                  to={`/editor/${template.templateId}`}
                  className="button button-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  编辑课表
                </Link>
              </div>
            </div>
            {showDeleteConfirm === template.templateId && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                color: 'white',
                borderRadius: '8px',
                padding: '20px',
                zIndex: 20
              }}>
                <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                  确定要删除这个模板吗？
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => handleDelete(template.templateId)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#c53030',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    确认删除
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'white',
                      color: '#4a5568',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplateList;
