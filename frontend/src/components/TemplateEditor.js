import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Copy, Trash2, Save, Download, Home } from 'lucide-react';

const TemplateEditor = () => {
  const { id } = useParams();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cellContents, setCellContents] = useState({});
  const [imageBase64, setImageBase64] = useState(null);
  const [copiedContent, setCopiedContent] = useState(null); // 存储复制的内容
  const editorRef = useRef(null);

  // 添加样式
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .cell:hover .cell-actions {
        opacity: 1 !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // 获取模板数据
  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const response = await axios.get(`/api/template/${id}`);
        setTemplate(response.data);

        // 加载图片并转换为Base64
        const imgResponse = await fetch(`http://localhost:3001${response.data.image}`);
        const blob = await imgResponse.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setImageBase64(reader.result);
        };
        reader.readAsDataURL(blob);

        // 初始化格子内容
        const initialContents = {};
        response.data.cells.forEach(cell => {
          const cellKey = `${cell.day}-${cell.index}`;
          initialContents[cellKey] = '';
        });
        setCellContents(initialContents);

        setLoading(false);
      } catch (err) {
        setError('获取模板失败');
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [id]);

  // 更新格子内容
  const handleCellChange = (cellKey, value) => {
    setCellContents(prev => ({
      ...prev,
      [cellKey]: value
    }));
  };

  // 复制格子内容
  const handleCopyContent = (cellKey) => {
    const content = cellContents[cellKey];
    if (content) {
      setCopiedContent(content);
      // 显示提示信息
      const input = document.getElementById(`cell-${cellKey}`);
      if (input) {
        input.placeholder = '已复制';
        setTimeout(() => {
          input.placeholder = '输入课程';
        }, 1500);
      }
    }
  };

  // 粘贴格子内容
  const handlePasteContent = (cellKey) => {
    if (copiedContent) {
      setCellContents(prev => ({
        ...prev,
        [cellKey]: copiedContent
      }));
    }
  };

  // 清除格子内容
  const handleClearContent = (cellKey) => {
    setCellContents(prev => ({
      ...prev,
      [cellKey]: ''
    }));
  };

  // 导出为图片
  const handleExport = async () => {
    console.log('开始导出...');

    if (!editorRef.current) {
      console.error('编辑器未初始化');
      setError('编辑器未初始化');
      return;
    }

    try {
      // 显示加载提示
      setError('正在生成图片，请稍候...');

      // 等待图片加载完成
      const img = editorRef.current.querySelector('img');
      console.log('找到图片元素:', img);

      if (img) {
        await new Promise((resolve, reject) => {
          if (img.complete) {
            console.log('图片已加载');
            resolve();
          } else {
            console.log('等待图片加载...');
            img.onload = () => {
              console.log('图片加载完成');
              resolve();
            };
            img.onerror = () => {
              console.error('图片加载失败');
              reject(new Error('图片加载失败'));
            };
          }
        });
      }

      // 获取图片的实际尺寸和显示尺寸
      let imgWidth = 800;
      let imgHeight = 600;
      let displayWidth = 800;
      let displayHeight = 600;

      if (img) {
        imgWidth = img.naturalWidth || img.width || 800;
        imgHeight = img.naturalHeight || img.height || 600;
        displayWidth = img.width || imgWidth;
        displayHeight = img.height || imgHeight;
      }

      console.log('图片实际尺寸:', imgWidth, 'x', imgHeight);
      console.log('图片显示尺寸:', displayWidth, 'x', displayHeight);

      // 计算缩放比例
      const scaleX = imgWidth / displayWidth;
      const scaleY = imgHeight / displayHeight;
      console.log('缩放比例: scaleX=', scaleX, 'scaleY=', scaleY);

      // 创建Canvas
      const canvas = document.createElement('canvas');
      canvas.width = imgWidth;
      canvas.height = imgHeight;
      const ctx = canvas.getContext('2d');

      // 绘制背景图片
      console.log('绘制背景图片...');
      ctx.drawImage(img, 0, 0, imgWidth, imgHeight);

      // 获取所有格子
      const cells = editorRef.current.querySelectorAll('.cell');
      console.log('找到格子数量:', cells.length);

      // 绘制文字
      template.cells.forEach((cell, index) => {
        const cellKey = `${cell.day}-${cell.index}`;
        const value = cellContents[cellKey];

        if (value) {
          console.log(`绘制格子 ${index}:`, value);
          console.log(`原始坐标: x=${cell.x}, y=${cell.y}, width=${cell.width}, height=${cell.height}`);

          // 解析坐标值，处理可能的像素单位
          const parseValue = (val) => {
            if (typeof val === 'number') return val;
            if (typeof val === 'string') {
              // 移除 'px' 单位并转换为数字
              return parseFloat(val.replace('px', ''));
            }
            return 0;
          };

          // 使用模板数据中的原始坐标，并应用缩放比例
          const x = parseValue(cell.x) * scaleX;
          const y = parseValue(cell.y) * scaleY;
          const width = parseValue(cell.width) * scaleX;
          const height = parseValue(cell.height) * scaleY;

          console.log(`解析后坐标: x=${x}, y=${y}, width=${width}, height=${height}`);

          // 找到对应的输入框获取样式
          const cellElement = editorRef.current.querySelector(`[data-cell-key="${cellKey}"]`);
          const input = cellElement ? cellElement.querySelector('input') : null;

          // 获取输入框的计算样式
          let fontSize = 14;
          let fontFamily = 'Arial, sans-serif';
          let color = '#000';

          if (input) {
            const computedStyle = window.getComputedStyle(input);
            fontSize = parseFloat(computedStyle.fontSize);
            fontFamily = computedStyle.fontFamily;
            color = computedStyle.color;
          }

          // 应用缩放比例到字体大小
          const scaledFontSize = fontSize * Math.min(scaleX, scaleY);

          // 设置文字样式
          ctx.font = `${scaledFontSize}px ${fontFamily}`;
          ctx.fillStyle = color;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // 计算文字位置（居中）
          const centerX = x + width / 2;
          const centerY = y + height / 2;

          console.log(`绘制位置: x=${centerX}, y=${centerY}`);

          // 绘制文字
          ctx.fillText(value, centerX, centerY);
        }
      });

      console.log('Canvas生成完成，尺寸:', canvas.width, 'x', canvas.height);

      // 清除加载提示
      setError(null);

      // 创建下载链接
      console.log('准备下载图片...');
      const link = document.createElement('a');
      link.download = `schedule-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      console.log('图片下载完成');
    } catch (err) {
      console.error('导出错误:', err);
      console.error('错误堆栈:', err.stack);
      setError('导出失败: ' + err.message);
    }
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (!template) {
    return <div className="error">模板不存在</div>;
  }

  return (
    <div className="card">
      {error && <div className="error">{error}</div>}

      <div className="toolbar">
        <Link to="/">
          <Button variant="secondary" className="gap-2">
            <Home className="h-4 w-4" />
            返回列表
          </Button>
        </Link>
        <button 
          className="bg-green-600 text-white hover:bg-green-700"
          onClick={handleExport}
        >
          导出图片
        </button>
      </div>

      <div 
        ref={editorRef}
        className="template-editor"
        style={{ position: 'relative', display: 'inline-block' }}
      >
        <img 
          src={imageBase64 || `http://localhost:3001${template.image}`} 
          alt="模板"
          style={{ display: 'block' }}
        />
        {template.cells.map(cell => {
          const cellKey = `${cell.day}-${cell.index}`;
          return (
            <div
              key={cellKey}
              data-cell-key={cellKey}
              className="cell"
              style={{
                position: 'absolute',
                left: cell.x,
                top: cell.y,
                width: cell.width,
                height: cell.height,
                border: 'none',
                background: 'transparent',
                margin: 0,
                padding: 0,
                boxSizing: 'border-box',
                overflow: 'hidden'
              }}
            >
              <input
                type="text"
                id={`cell-${cellKey}`}
                value={cellContents[cellKey] || ''}
                onChange={(e) => handleCellChange(cellKey, e.target.value)}
                placeholder="输入课程"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'center',
                  fontSize: '14px',
                  color: '#000',
                  fontFamily: 'Arial, sans-serif',
                  padding: '5px',
                  margin: 0,
                  boxSizing: 'border-box',
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '0',
                  display: 'flex',
                  gap: '4px',
                  opacity: 0,
                  transition: 'opacity 0.2s'
                }}
                className="cell-actions"
              >
                <button
                  onClick={() => handleCopyContent(cellKey)}
                  style={{
                    padding: '2px 6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    background: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px'
                  }}
                  title="复制内容"
                >
                  📋
                </button>
                <button
                  onClick={() => handlePasteContent(cellKey)}
                  style={{
                    padding: '2px 6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    background: '#2196F3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px'
                  }}
                  title="粘贴内容"
                >
                  📝
                </button>
                <button
                  onClick={() => handleClearContent(cellKey)}
                  style={{
                    padding: '2px 6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    background: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px'
                  }}
                  title="清除内容"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TemplateEditor;
