import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const TemplateManager = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [mode, setMode] = useState('view'); // view, mark
  const [isDragging, setIsDragging] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [currentCell, setCurrentCell] = useState({
    day: 'mon',
    index: 0
  });
  const [imageBase64, setImageBase64] = useState(null);
  const [copiedCell, setCopiedCell] = useState(null); // 存储复制的格子
  const [templateName, setTemplateName] = useState(''); // 模板名称
  const [showNameInput, setShowNameInput] = useState(false); // 是否显示名称输入框
  const imageRef = useRef(null);

  // 获取模板列表
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await axios.get('/api/templates');
        setTemplates(response.data);
      } catch (err) {
        setError('获取模板列表失败');
      }
    };

    fetchTemplates();
  }, []);

  // 上传模板
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 显示名称输入框
    setShowNameInput(true);
    setTemplateName(file.name.replace(/\.[^.]+$/, '')); // 默认使用文件名
  };

  // 确认上传
  const handleConfirmUpload = async () => {
    const fileInput = document.getElementById('upload-input');
    const file = fileInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    formData.append('name', templateName.trim() || '未命名模板');

    setLoading(true);
    setError(null);
    setShowNameInput(false);

    try {
      const response = await axios.post('/api/upload-template', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess('模板上传成功');

      // 刷新模板列表
      const templatesResponse = await axios.get('/api/templates');
      setTemplates(templatesResponse.data);

      // 自动选择新上传的模板
      await handleSelectTemplate(response.data.templateId);

      setLoading(false);
      setTemplateName('');
    } catch (err) {
      setError('上传失败');
      setLoading(false);
    }
  };

  // 取消上传
  const handleCancelUpload = () => {
    setShowNameInput(false);
    setTemplateName('');
  };

  // 选择模板
  const handleSelectTemplate = async (templateId) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/template/${templateId}`);
      const templateData = response.data;

      // 加载图片并转换为Base64
      try {
        const imgResponse = await fetch(`http://localhost:3001${templateData.image}`);
        const blob = await imgResponse.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setImageBase64(reader.result);
        };
        reader.readAsDataURL(blob);
      } catch (err) {
        console.error('加载图片失败:', err);
        setImageBase64(null);
      }

      setSelectedTemplate(templateData);
      setMode('view');
      setLoading(false);
    } catch (err) {
      setError('获取模板失败');
      setLoading(false);
    }
  };

  // 保存模板配置
  const handleSave = async () => {
    if (!selectedTemplate) return;

    setLoading(true);
    setError(null);

    try {
      await axios.post('/api/save-template', {
        templateId: selectedTemplate.templateId,
        cells: selectedTemplate.cells
      });

      setSuccess('模板配置已保存');
      setLoading(false);
    } catch (err) {
      setError('保存失败');
      setLoading(false);
    }
  };

  // 处理图片鼠标按下事件
  const handleImageMouseDown = (e) => {
    if (mode !== 'mark') return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDragging(true);
    setSelectionStart({ x, y });
    setSelectionEnd({ x, y });
  };

  // 处理图片鼠标移动事件
  const handleImageMouseMove = (e) => {
    if (!isDragging || mode !== 'mark') return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setSelectionEnd({ x, y });
  };

  // 处理图片鼠标释放事件
  const handleImageMouseUp = () => {
    if (!isDragging || mode !== 'mark') return;

    setIsDragging(false);

    // 计算选区
    const x = Math.min(selectionStart.x, selectionEnd.x);
    const y = Math.min(selectionStart.y, selectionEnd.y);
    const width = Math.abs(selectionEnd.x - selectionStart.x);
    const height = Math.abs(selectionEnd.y - selectionStart.y);

    // 如果选区太小，忽略
    if (width < 10 || height < 10) {
      setSelectionStart(null);
      setSelectionEnd(null);
      return;
    }

    // 添加新格子
    const newCell = {
      day: currentCell.day,
      index: currentCell.index,
      x: Math.round(x),
      y: Math.round(y),
      width: copiedCell ? copiedCell.width : Math.round(width),
      height: copiedCell ? copiedCell.height : Math.round(height)
    };

    setSelectedTemplate(prev => ({
      ...prev,
      cells: [...prev.cells, newCell]
    }));

    // 更新下一个格子的索引
    setCurrentCell(prev => ({
      ...prev,
      index: prev.index + 1
    }));

    setSelectionStart(null);
    setSelectionEnd(null);
  };

  // 删除格子
  const handleDeleteCell = (cellIndex) => {
    setSelectedTemplate(prev => ({
      ...prev,
      cells: prev.cells.filter((_, i) => i !== cellIndex)
    }));
  };

  // 复制格子
  const handleCopyCell = (cellIndex) => {
    const cell = selectedTemplate.cells[cellIndex];
    if (cell) {
      setCopiedCell({
        width: cell.width,
        height: cell.height
      });
      setSuccess(`已复制格子尺寸: ${cell.width} x ${cell.height}`);
      setTimeout(() => setSuccess(null), 2000);
    }
  };

  // 粘贴格子尺寸
  const handlePasteCell = () => {
    if (!copiedCell) {
      setError('没有复制的格子');
      setTimeout(() => setError(null), 2000);
      return;
    }

    setSuccess(`已应用格子尺寸: ${copiedCell.width} x ${copiedCell.height}`);
    setTimeout(() => setSuccess(null), 2000);
  };

  // 清除粘贴板
  const handleClearClipboard = () => {
    setCopiedCell(null);
    setSuccess('已清除粘贴板');
    setTimeout(() => setSuccess(null), 2000);
  };

  // 清除所有格子
  const handleClearCells = () => {
    if (!selectedTemplate) return;

    if (window.confirm('确定要清除所有格子吗？')) {
      setSelectedTemplate(prev => ({
        ...prev,
        cells: []
      }));
    }
  };

  return (
    <div className="card">
      <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px', color: '#2d3748' }}>模板管理</h2>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="toolbar">
        <input
          type="file"
          accept="image/*"
          onChange={handleUpload}
          style={{ display: 'none' }}
          id="upload-input"
        />
        <label htmlFor="upload-input" className="button button-primary">
          📤 上传新模板
        </label>

        {showNameInput && (
          <div className="name-input-modal">
            <div className="name-input-content">
              <h3>为模板命名</h3>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="请输入模板名称"
                autoFocus
                maxLength={50}
              />
              <div className="name-input-buttons">
                <button
                  className="button button-secondary"
                  onClick={handleCancelUpload}
                  disabled={loading}
                >
                  取消
                </button>
                <button
                  className="button button-primary"
                  onClick={handleConfirmUpload}
                  disabled={loading || !templateName.trim()}
                >
                  {loading ? '上传中...' : '确认上传'}
                </button>
              </div>
            </div>
          </div>
        )}

        <select
          value={selectedTemplate?.templateId || ''}
          onChange={(e) => handleSelectTemplate(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px', minWidth: '200px' }}
        >
          <option value="">选择模板</option>
          {templates.map(template => (
            <option key={template.templateId} value={template.templateId}>
              {template.name || `模板 #${template.templateId}`} ({template.cellsCount} 个格子)
            </option>
          ))}
        </select>

        {selectedTemplate && (
          <>
            <button
              className="button button-success"
              onClick={handleSave}
              disabled={loading}
            >
              💾 保存配置
            </button>

            <button
              className="button button-secondary"
              onClick={handleClearCells}
            >
              🗑️ 清除所有
            </button>
          </>
        )}

        {selectedTemplate && (
          <div className="mode-indicator">
            <span className={`mode-indicator ${mode}`}>
              {mode === 'view' ? '👁️ 查看模式' : '✏️ 标记模式'}
            </span>
          </div>
        )}
      </div>

      {selectedTemplate && (
        <div className="toolbar" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className={`button ${mode === 'view' ? 'button-primary' : 'button-secondary'}`}
              onClick={() => setMode('view')}
            >
              👁️ 查看
            </button>

            <button
              className={`button ${mode === 'mark' ? 'button-primary' : 'button-secondary'}`}
              onClick={() => setMode('mark')}
            >
              ✏️ 标记
            </button>

            {mode === 'mark' && (
              <>
                <select
                  value={currentCell.day}
                  onChange={(e) => setCurrentCell(prev => ({ ...prev, day: e.target.value }))}
                  style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' }}
                >
                  <option value="mon">周一</option>
                  <option value="tue">周二</option>
                  <option value="wed">周三</option>
                  <option value="thu">周四</option>
                  <option value="fri">周五</option>
                </select>

                <input
                  type="number"
                  value={currentCell.index}
                  onChange={(e) => setCurrentCell(prev => ({ ...prev, index: parseInt(e.target.value) }))}
                  min="0"
                  max="7"
                  placeholder="节次"
                  style={{ width: '70px', padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' }}
                />

                <button
                  className="button button-info"
                  onClick={handlePasteCell}
                  title={copiedCell ? `粘贴尺寸：${copiedCell.width} x ${copiedCell.height}` : '粘贴格子尺寸'}
                  style={{ fontSize: '13px' }}
                >
                  📋 {copiedCell ? `${copiedCell.width}×${copiedCell.height}` : '粘贴'}
                </button>

                {copiedCell && (
                  <button
                    className="button button-secondary"
                    onClick={handleClearClipboard}
                    title="清除粘贴板"
                    style={{ fontSize: '13px' }}
                  >
                    清除
                  </button>
                )}
              </>
            )}
          </div>

          {mode === 'mark' && (
            <div style={{ fontSize: '13px', color: '#718096' }}>
              💡 提示：在图片上拖拽创建格子区域
            </div>
          )}
        </div>
      )}

      {selectedTemplate && (
        <div className="template-editor" ref={imageRef}>
          <img
            src={imageBase64 || `http://localhost:3001${selectedTemplate.image}`}
            alt="模板"
            onMouseDown={handleImageMouseDown}
            onMouseMove={handleImageMouseMove}
            onMouseUp={handleImageMouseUp}
            onMouseLeave={handleImageMouseUp}
            style={{ cursor: mode === 'mark' ? 'crosshair' : 'default' }}
          />

          {mode === 'mark' && isDragging && selectionStart && selectionEnd && (
            <div
              className="selection-box"
              style={{
                left: Math.min(selectionStart.x, selectionEnd.x),
                top: Math.min(selectionStart.y, selectionEnd.y),
                width: Math.abs(selectionEnd.x - selectionStart.x),
                height: Math.abs(selectionEnd.y - selectionStart.y)
              }}
            />
          )}

          {selectedTemplate.cells.map((cell, index) => (
            <div
              key={index}
              className="cell"
              style={{
                left: cell.x,
                top: cell.y,
                width: cell.width,
                height: cell.height,
                borderColor: mode === 'mark' ? '#f56565' : '#667eea',
                backgroundColor: mode === 'mark' 
                  ? 'rgba(245, 101, 101, 0.1)' 
                  : 'rgba(102, 126, 234, 0.08)'
              }}
            >
              <div style={{ fontSize: '12px', color: '#4a5568', fontWeight: '500' }}>
                {cell.day.toUpperCase()}-{cell.index}
              </div>
              {mode === 'mark' && (
                <>
                  <button
                    className="button button-success"
                    style={{ 
                      position: 'absolute', 
                      top: '-8px', 
                      left: '-8px',
                      padding: '4px 8px',
                      fontSize: '12px',
                      zIndex: 2,
                      borderRadius: '4px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }}
                    onClick={() => handleCopyCell(index)}
                    title="复制格子尺寸"
                  >
                    📋
                  </button>
                  <button
                    className="button button-danger"
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      padding: '4px 8px',
                      fontSize: '12px',
                      zIndex: 2,
                      borderRadius: '4px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }}
                    onClick={() => handleDeleteCell(index)}
                    title="删除格子"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {loading && <div className="loading">加载中...</div>}
    </div>
  );
};

export default TemplateManager;
