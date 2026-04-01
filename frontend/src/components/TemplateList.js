import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const TemplateList = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [images, setImages] = useState({});

  // 获取模板列表
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await axios.get('/api/templates');
        const templatesData = response.data;

        // 加载所有模板图片并转换为Base64
        const imagePromises = templatesData.map(async (template) => {
          try {
            const imgResponse = await fetch(`http://localhost:3001${template.image}`);
            const blob = await imgResponse.blob();
            const reader = new FileReader();
            return new Promise((resolve) => {
              reader.onloadend = () => {
                resolve({ id: template.templateId, base64: reader.result });
              };
              reader.readAsDataURL(blob);
            });
          } catch (err) {
            console.error('加载图片失败:', err);
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
      } catch (err) {
        setError('获取模板列表失败');
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

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
        <p>请先在模板管理页面创建模板</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px', color: '#2d3748' }}>选择模板</h2>
      <div className="template-grid">
        {templates.map(template => (
          <div key={template.templateId} className="template-card">
            <img 
              src={images[template.templateId] || `http://localhost:3001${template.image}`} 
              alt={`模板 ${template.templateId}`} 
            />
            <div className="template-card-body">
              <div className="template-card-title">
                {template.name || `模板 #${template.templateId}`}
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
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplateList;
