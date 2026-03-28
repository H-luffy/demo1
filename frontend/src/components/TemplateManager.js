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

    const formData = new FormData();
    formData.append('image', file);

    setLoading(true);
    setError(null);

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
    } catch (err) {
      setError('上传失败');
      setLoading(false);
    }
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
      width: Math.round(width),
      height: Math.round(height)
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
      <h2>模板管理</h2>

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
          上传新模板
        </label>

        <select
          value={selectedTemplate?.templateId || ''}
          onChange={(e) => handleSelectTemplate(e.target.value)}
          className="form-group"
        >
          <option value="">选择模板</option>
          {templates.map(template => (
            <option key={template.templateId} value={template.templateId}>
              模板 #{template.templateId} ({template.cellsCount} 个格子)
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
              保存配置
            </button>

            <button
              className="button button-danger"
              onClick={handleClearCells}
            >
              清除格子
            </button>
          </>
        )}

        {selectedTemplate && (
          <div className="mode-indicator">
            <span className={`mode-indicator ${mode}`}>
              {mode === 'view' ? '查看模式' : '标记模式'}
            </span>
          </div>
        )}
      </div>

      {selectedTemplate && (
        <div className="toolbar">
          <button
            className={`button ${mode === 'view' ? 'button-primary' : 'button-secondary'}`}
            onClick={() => setMode('view')}
          >
            查看模式
          </button>

          <button
            className={`button ${mode === 'mark' ? 'button-primary' : 'button-secondary'}`}
            onClick={() => setMode('mark')}
          >
            标记模式
          </button>

          {mode === 'mark' && (
            <>
              <select
                value={currentCell.day}
                onChange={(e) => setCurrentCell(prev => ({ ...prev, day: e.target.value }))}
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
                style={{ width: '60px' }}
              />
            </>
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
                borderColor: mode === 'mark' ? '#f44336' : '#1976d2'
              }}
            >
              <div style={{ fontSize: '12px', color: '#757575' }}>
                {cell.day}-{cell.index}
              </div>
              {mode === 'mark' && (
                <button
                  className="button button-danger"
                  style={{ 
                    position: 'absolute', 
                    top: '-10px', 
                    right: '-10px',
                    padding: '2px 6px',
                    fontSize: '12px'
                  }}
                  onClick={() => handleDeleteCell(index)}
                >
                  ×
                </button>
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
