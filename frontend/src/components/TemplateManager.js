import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../axiosConfig';

const TemplateManager = ({ isAdmin = false }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [mode, setMode] = useState('view'); // view, mark, edit
  const [editingCell, setEditingCell] = useState(null); // 当前正在编辑的格子
  const [dragStart, setDragStart] = useState(null); // 拖拽开始位置
  const [resizeHandle, setResizeHandle] = useState(null); // 调整大小的手柄
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
  const [showGrid, setShowGrid] = useState(true); // 是否显示网格
  const [gridSize, setGridSize] = useState(10); // 网格大小
  const imageRef = useRef(null);

  // 吸附到网格
  const snapToGrid = (value) => {
    if (!showGrid) return value;
    return Math.round(value / gridSize) * gridSize;
  };

  // 获取模板列表
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await api.get('/api/templates');
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

    // 检查文件大小
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      setError('文件大小不能超过 50MB');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);
    formData.append('name', templateName.trim() || '未命名模板');
    formData.append('adminPassword', localStorage.getItem('adminPassword') || '');

    setLoading(true);
    setError(null);
    setShowNameInput(false);

    try {
      const response = await api.post('/api/upload-template', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`上传进度: ${progress}%`);
        }
      });

      setSuccess('模板上传成功');

      // 刷新模板列表
      const templatesResponse = await api.get('/api/templates');
      setTemplates(templatesResponse.data);

      // 自动选择新上传的模板
      await handleSelectTemplate(response.data.templateId);

      setLoading(false);
      setTemplateName('');
    } catch (err) {
      console.error('上传错误:', err);
      if (err.code === 'ECONNABORTED') {
        setError('上传超时，请重试或选择更小的文件');
      } else if (err.response) {
        setError(err.response.data?.error || '上传失败');
      } else if (err.request) {
        setError('网络连接失败，请检查网络设置');
      } else {
        setError('上传失败: ' + err.message);
      }
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
      const response = await api.get(`/api/template/${templateId}`);
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
      await api.post('/api/save-template', {
        templateId: selectedTemplate.templateId,
        cells: selectedTemplate.cells,
        adminPassword: localStorage.getItem('adminPassword') || ''
      });

      setSuccess('模板配置已保存');
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || '保存失败');
      setLoading(false);
    }
  };

  // 处理图片鼠标按下事件
  const handleImageMouseDown = (e) => {
    if (mode !== 'mark') return;

    const rect = imageRef.current.getBoundingClientRect();
    const img = imageRef.current.querySelector('img');
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setIsDragging(true);
    setSelectionStart({ x, y });
    setSelectionEnd({ x, y });
  };

  // 处理图片鼠标移动事件
  const handleImageMouseMove = (e) => {
    if (!isDragging || mode !== 'mark') return;

    const rect = imageRef.current.getBoundingClientRect();
    const img = imageRef.current.querySelector('img');
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

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
      x: snapToGrid(x),
      y: snapToGrid(y),
      width: copiedCell ? copiedCell.width : snapToGrid(width),
      height: copiedCell ? copiedCell.height : snapToGrid(height)
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

  // 开始编辑格子
  const handleStartEditCell = (cellIndex, e) => {
    if (mode !== 'edit' && mode !== 'mark') return;
    e.stopPropagation();

    const cell = selectedTemplate.cells[cellIndex];
    setEditingCell(cellIndex);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      cellX: cell.x,
      cellY: cell.y,
      cellWidth: cell.width,
      cellHeight: cell.height
    });
  };

  // 开始调整格子大小
  const handleStartResizeCell = (cellIndex, handle, e) => {
    if (mode !== 'edit') return;
    e.stopPropagation();

    const cell = selectedTemplate.cells[cellIndex];
    setEditingCell(cellIndex);
    setResizeHandle(handle);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      cellX: cell.x,
      cellY: cell.y,
      cellWidth: cell.width,
      cellHeight: cell.height
    });
  };

  // 处理编辑格子的鼠标移动
  const handleEditMouseMove = (e) => {
    if (!editingCell || (mode !== 'edit' && mode !== 'mark')) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    if (resizeHandle) {
      // 调整大小
      setSelectedTemplate(prev => {
        const newCells = [...prev.cells];
        const cell = { ...newCells[editingCell] };

        switch (resizeHandle) {
          case 'nw':
            cell.x = Math.max(0, snapToGrid(dragStart.cellX + dx));
            cell.y = Math.max(0, snapToGrid(dragStart.cellY + dy));
            cell.width = Math.max(gridSize, snapToGrid(dragStart.cellWidth - dx));
            cell.height = Math.max(gridSize, snapToGrid(dragStart.cellHeight - dy));
            break;
          case 'ne':
            cell.y = Math.max(0, snapToGrid(dragStart.cellY + dy));
            cell.width = Math.max(gridSize, snapToGrid(dragStart.cellWidth + dx));
            cell.height = Math.max(gridSize, snapToGrid(dragStart.cellHeight - dy));
            break;
          case 'sw':
            cell.x = Math.max(0, snapToGrid(dragStart.cellX + dx));
            cell.width = Math.max(gridSize, snapToGrid(dragStart.cellWidth - dx));
            cell.height = Math.max(gridSize, snapToGrid(dragStart.cellHeight + dy));
            break;
          case 'se':
            cell.width = Math.max(gridSize, snapToGrid(dragStart.cellWidth + dx));
            cell.height = Math.max(gridSize, snapToGrid(dragStart.cellHeight + dy));
            break;
        }

        newCells[editingCell] = cell;
        return { ...prev, cells: newCells };
      });
    } else {
      // 移动格子
      setSelectedTemplate(prev => {
        const newCells = [...prev.cells];
        const cell = { ...newCells[editingCell] };
        cell.x = Math.max(0, snapToGrid(dragStart.cellX + dx));
        cell.y = Math.max(0, snapToGrid(dragStart.cellY + dy));
        newCells[editingCell] = cell;
        return { ...prev, cells: newCells };
      });
    }
  };

  // 结束编辑格子
  const handleEndEditCell = () => {
    setEditingCell(null);
    setDragStart(null);
    setResizeHandle(null);
  };

  // 修改格子属性
  const handleUpdateCellProperty = (cellIndex, property, value) => {
    setSelectedTemplate(prev => {
      const newCells = [...prev.cells];
      newCells[cellIndex] = { ...newCells[cellIndex], [property]: value };
      return { ...prev, cells: newCells };
    });
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
              {mode === 'view' ? '👁️ 查看模式' : mode === 'mark' ? '✏️ 标记模式' : '🔧 编辑模式'}
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

            <button
              className={`button ${mode === 'edit' ? 'button-primary' : 'button-secondary'}`}
              onClick={() => setMode('edit')}
            >
              🔧 编辑
            </button>

            <button
              className={`button ${showGrid ? 'button-primary' : 'button-secondary'}`}
              onClick={() => setShowGrid(!showGrid)}
              title={showGrid ? '隐藏网格' : '显示网格'}
            >
              📐 {showGrid ? '网格开' : '网格关'}
            </button>

            {showGrid && (
              <select
                value={gridSize}
                onChange={(e) => setGridSize(parseInt(e.target.value))}
                style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '13px' }}
                title="网格大小"
              >
                <option value="5">5px</option>
                <option value="10">10px</option>
                <option value="15">15px</option>
                <option value="20">20px</option>
                <option value="25">25px</option>
                <option value="30">30px</option>
              </select>
            )}

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
            onMouseDown={mode === 'edit' ? undefined : handleImageMouseDown}
            onMouseMove={mode === 'edit' ? handleEditMouseMove : handleImageMouseMove}
            onMouseUp={mode === 'edit' ? handleEndEditCell : handleImageMouseUp}
            onMouseLeave={mode === 'edit' ? handleEndEditCell : handleImageMouseUp}
            style={{ cursor: mode === 'mark' ? 'crosshair' : mode === 'edit' ? 'move' : 'default', width: 'auto', height: 'auto' }}
          />

          {showGrid && (
            <div className="grid-overlay">
              {Array.from({ length: Math.ceil(imageRef.current?.clientWidth / gridSize) || 0 }).map((_, i) => (
                <div
                  key={`v-${i}`}
                  className="grid-line vertical"
                  style={{ left: i * gridSize }}
                />
              ))}
              {Array.from({ length: Math.ceil(imageRef.current?.clientHeight / gridSize) || 0 }).map((_, i) => (
                <div
                  key={`h-${i}`}
                  className="grid-line horizontal"
                  style={{ top: i * gridSize }}
                />
              ))}
            </div>
          )}

          {mode === 'mark' && isDragging && selectionStart && selectionEnd && (() => {
            const rect = imageRef.current.getBoundingClientRect();
            const img = imageRef.current.querySelector('img');
            const scaleX = rect.width / img.naturalWidth;
            const scaleY = rect.height / img.naturalHeight;
            return (
              <div
                className="selection-box"
                style={{
                  left: `${Math.min(selectionStart.x, selectionEnd.x) * scaleX}px`,
                  top: `${Math.min(selectionStart.y, selectionEnd.y) * scaleY}px`,
                  width: `${Math.abs(selectionEnd.x - selectionStart.x) * scaleX}px`,
                  height: `${Math.abs(selectionEnd.y - selectionStart.y) * scaleY}px`,
                  border: '2px dashed #3182ce',
                  backgroundColor: 'rgba(49, 130, 206, 0.2)',
                  position: 'absolute',
                  zIndex: 1000,
                  pointerEvents: 'none'
                }}
              />
            );
          })()}

          {(() => {
            const rect = imageRef.current?.getBoundingClientRect();
            const img = imageRef.current?.querySelector('img');
            if (!rect || !img) return null;
            const scaleX = rect.width / img.naturalWidth;
            const scaleY = rect.height / img.naturalHeight;
            return selectedTemplate.cells.map((cell, index) => (
              <div
                key={index}
                className="cell"
                style={{
                  left: `${cell.x * scaleX}px`,
                  top: `${cell.y * scaleY}px`,
                  width: `${cell.width * scaleX}px`,
                  height: `${cell.height * scaleY}px`,
                borderColor: mode === 'mark' || mode === 'edit' 
                  ? '#3182ce'  // 蓝色边框，便于识别
                  : 'transparent',
                borderWidth: '2px',
                borderStyle: 'solid',
                borderRadius: '0',
                boxSizing: 'border-box',
                backgroundColor: mode === 'mark' 
                  ? 'rgba(49, 130, 206, 0.15)'  // 半透明蓝色背景
                  : mode === 'edit'
                  ? 'rgba(49, 130, 206, 0.1)'   // 编辑模式稍浅一些
                  : 'transparent',
                cursor: (mode === 'edit' || mode === 'mark') ? 'move' : 'default'
              }}
              onMouseDown={(e) => (mode === 'edit' || mode === 'mark') && handleStartEditCell(index, e)}
            >
              <div style={{ fontSize: '12px', color: mode === 'mark' || mode === 'edit' ? '#2c5282' : '#4a5568', fontWeight: '600', backgroundColor: 'transparent' }}>
                {cell.day ? cell.day.toUpperCase() : '?'}-{cell.index}
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
              {mode === 'edit' && (
                <>
                  {/* 调整大小的手柄 */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      left: '-4px',
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#4299e1',
                      cursor: 'nw-resize',
                      borderRadius: '50%'
                    }}
                    onMouseDown={(e) => handleStartResizeCell(index, 'nw', e)}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#4299e1',
                      cursor: 'ne-resize',
                      borderRadius: '50%'
                    }}
                    onMouseDown={(e) => handleStartResizeCell(index, 'ne', e)}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-4px',
                      left: '-4px',
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#4299e1',
                      cursor: 'sw-resize',
                      borderRadius: '50%'
                    }}
                    onMouseDown={(e) => handleStartResizeCell(index, 'sw', e)}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-4px',
                      right: '-4px',
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#4299e1',
                      cursor: 'se-resize',
                      borderRadius: '50%'
                    }}
                    onMouseDown={(e) => handleStartResizeCell(index, 'se', e)}
                  />

                  {/* 删除按钮 */}
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

                  {/* 属性编辑面板 */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-60px',
                      left: '0',
                      backgroundColor: 'white',
                      padding: '8px',
                      borderRadius: '4px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center',
                      zIndex: 10,
                      minWidth: '200px'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <select
                      value={cell.day}
                      onChange={(e) => handleUpdateCellProperty(index, 'day', e.target.value)}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                    >
                      <option value="mon">周一</option>
                      <option value="tue">周二</option>
                      <option value="wed">周三</option>
                      <option value="thu">周四</option>
                      <option value="fri">周五</option>
                    </select>
                    <input
                      type="number"
                      value={cell.index}
                      onChange={(e) => handleUpdateCellProperty(index, 'index', parseInt(e.target.value))}
                      min="0"
                      max="7"
                      style={{
                        width: '50px',
                        padding: '4px 8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                    />
                    <button
                      className="button button-success"
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px'
                      }}
                      onClick={() => handleCopyCell(index)}
                      title="复制格子尺寸"
                    >
                      📋
                    </button>
                  </div>
                </>
              )}
            </div>
            ));
          })()}
        </div>
      )}

      {/* 模板列表 */}
      {templates.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#2d3748' }}>
            已上传模板列表
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {templates.map(template => (
              <div
                key={template.templateId}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: selectedTemplate?.templateId === template.templateId ? '#ebf8ff' : 'white'
                }}
                onClick={() => handleSelectTemplate(template.templateId)}
                onMouseEnter={(e) => {
                  if (selectedTemplate?.templateId !== template.templateId) {
                    e.target.style.backgroundColor = '#f7fafc';
                    e.target.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedTemplate?.templateId !== template.templateId) {
                    e.target.style.backgroundColor = 'white';
                    e.target.style.boxShadow = 'none';
                  }
                }}
              >
                <img
                  src={`http://localhost:3001${template.image}`}
                  alt={template.name || `模板 #${template.templateId}`}
                  style={{
                    width: '100%',
                    height: '120px',
                    objectFit: 'cover',
                    borderRadius: '4px',
                    marginBottom: '8px'
                  }}
                />
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#2d3748', marginBottom: '4px' }}>
                  {template.name || `模板 #${template.templateId}`}
                </div>
                <div style={{ fontSize: '12px', color: '#718096' }}>
                  {template.cellsCount} 个格子
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && <div className="loading">加载中...</div>}
    </div>
  );
};

export default TemplateManager;
