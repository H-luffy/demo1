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
  const [fontSize, setFontSize] = useState(14); // 字体大小
  const [fontColor, setFontColor] = useState('#2d3748'); // 字体颜色
  const [imageDisplaySize, setImageDisplaySize] = useState({ width: 0, height: 0 }); // 图片显示尺寸
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
        const templateData = response.data;
        
        // 加载图片并转换为Base64
        const imgResponse = await fetch(`http://localhost:3001${templateData.image}`);
        const blob = await imgResponse.blob();
        
        // 创建Image对象获取原始尺寸
        const img = new Image();
        img.onload = () => {
          // 保存图片原始尺寸到模板数据
          templateData.originalWidth = img.naturalWidth;
          templateData.originalHeight = img.naturalHeight;
          setTemplate(templateData);
          
          const reader = new FileReader();
          reader.onloadend = () => {
            setImageBase64(reader.result);
          };
          reader.readAsDataURL(blob);
        };
        img.src = URL.createObjectURL(blob);

        // 初始化格子内容
        const initialContents = {};
        templateData.cells.forEach(cell => {
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

    if (!template) {
      console.error('模板数据未加载');
      setError('模板数据未加载');
      return;
    }

    try {
      // 显示加载提示
      setError('正在生成图片，请稍候...');

      // 等待图片加载完成
      const img = editorRef.current?.querySelector('img');
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

      // 创建Canvas，使用图片的显示尺寸（因为格子坐标是相对于显示尺寸的）
      const canvas = document.createElement('canvas');
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      const ctx = canvas.getContext('2d');

      // 绘制背景图片，缩放到显示尺寸
      console.log('绘制背景图片...');
      if (img) {
        ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
      } else {
        console.error('图片元素未找到');
        setError('图片元素未找到');
        return;
      }

      // 获取所有格子
      const cells = editorRef.current?.querySelectorAll('.cell') || [];
      console.log('找到格子数量:', cells.length);

      // 绘制文字
      if (!template || !template.cells || template.cells.length === 0) {
        console.error('模板数据无效');
        setError('模板数据无效');
        return;
      }
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

          // 直接使用原始坐标（因为坐标是相对于显示尺寸的）
          const x = parseValue(cell.x);
          const y = parseValue(cell.y);
          const width = parseValue(cell.width);
          const height = parseValue(cell.height);

          console.log(`解析后坐标: x=${x}, y=${y}, width=${width}, height=${height}`);

          // 找到对应的输入框获取样式
          const cellElement = editorRef.current?.querySelector(`[data-cell-key="${cellKey}"]`);
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

          // 设置文字样式
          ctx.font = `${fontSize}px ${fontFamily}`;
          ctx.fillStyle = color;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // 计算文字位置（格子中心）
          const centerX = x + width / 2;
          const centerY = y + height / 2;

          console.log(`绘制位置: x=${centerX}, y=${centerY}, fontSize=${fontSize}`);

          // 绘制文字
          ctx.fillText(value, centerX, centerY);
        }
      });

      console.log('导出成功！');
      setError(null);

      // 下载图片
      const link = document.createElement('a');
      link.download = `schedule-${template.templateId}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      console.log('图片已下载');
    } catch (err) {
      console.error('导出失败:', err);
      setError('导出失败，请重试');
      setTimeout(() => setError(null), 3000);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="flex items-center justify-between w-full p-4">
        <Link to="/" className="flex items-center space-x-2">
          <Home className="w-6 h-6" />
          <span>返回首页</span>
        </Link>
        <div className="flex items-center space-x-2">
          <Button onClick={handleExport} disabled={loading}>
            <Download className="w-4 h-4" />
            导出图片
          </Button>
        </div>
      </div>
      <div className="relative p-4">
        {loading && <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">加载中...</div>}
        {error && <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 text-red-500">{error}</div>}
        <div className="relative" ref={editorRef}>
          {imageBase64 && (
            <img 
              src={imageBase64} 
              alt="Template" 
              style={{ display: 'block', width: 'auto', height: 'auto' }}
              onLoad={(e) => {
                console.log('图片加载完成');
                console.log('图片自然尺寸 (naturalWidth/Height):', e.target.naturalWidth, 'x', e.target.naturalHeight);
                // 保存图片的原始尺寸
                setImageDisplaySize({
                  width: e.target.naturalWidth,
                  height: e.target.naturalHeight
                });
              }}
            />
          )}
          {template?.cells.map((cell, index) => {
            const cellKey = `${cell.day}-${cell.index}`;
            console.log(`格子 ${index} 坐标:`, cell);
            
            // 解析原始坐标值
            const parseValue = (val) => {
              if (typeof val === 'number') return val;
              if (typeof val === 'string') {
                return parseFloat(val.replace('px', ''));
              }
              return 0;
            };
            
            // 计算缩放比例
            const editorRect = editorRef.current?.getBoundingClientRect();
            const img = editorRef.current?.querySelector('img');
            const scaleX = editorRect && img ? editorRect.width / img.naturalWidth : 1;
            const scaleY = editorRect && img ? editorRect.height / img.naturalHeight : 1;
            
            // 使用缩放后的坐标
            const x = parseValue(cell.x) * scaleX;
            const y = parseValue(cell.y) * scaleY;
            const width = parseValue(cell.width) * scaleX;
            const height = parseValue(cell.height) * scaleY;
            
            return (
              <div
                key={cellKey}
                className="absolute cell"
                style={{
                  top: `${y}px`,
                  left: `${x}px`,
                  width: `${width}px`,
                  height: `${height}px`,
                  border: 'none',
                  position: 'absolute',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '0',
                  boxSizing: 'border-box',
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  zIndex: 1,
                }}
              >
                <input
                  id={`cell-${cellKey}`}
                  type="text"
                  value={cellContents[cellKey] || ''}
                  onChange={e => handleCellChange(cellKey, e.target.value)}
                  className="w-full h-full p-1 text-center bg-transparent outline-none"
                  placeholder="输入课程"
                  style={{
                    fontSize: `${fontSize}px`,
                    color: fontColor,
                  }}
                />
                <div className="absolute top-0 right-0 flex items-center justify-center cell-actions opacity-0">
                  <button onClick={() => handleCopyContent(cellKey)} className="p-1">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button onClick={() => handlePasteContent(cellKey)} className="p-1">
                    <Save className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleClearContent(cellKey)} className="p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TemplateEditor;
