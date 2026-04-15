import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../axiosConfig';
import html2canvas from 'html2canvas';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Home, Search, BookOpen, Download, Calendar, User, Settings, ChevronRight, Copy, Clipboard, Trash2 } from 'lucide-react';

const TemplateBrowser = ({ isAdmin = false }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [images, setImages] = useState({});
  const [cellContents, setCellContents] = useState({});
  const [copiedContent, setCopiedContent] = useState(null);
  const editorRef = useRef(null);

  // 从后端获取模板数据
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await api.get('/api/templates');
        const templatesData = response.data;

        // 加载所有模板图片并转换为Base64
        const imagePromises = templatesData.map(async (template) => {
          try {
            const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    const imgResponse = await fetch(`${apiUrl}${template.image}`);
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

  // 过滤模板
  const filteredTemplates = templates.filter(template =>
    (template.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 获取所有分类
  const categories = ['全部', ...new Set(templates.map(t => t.category || '默认'))];
  const [selectedCategory, setSelectedCategory] = useState('全部');

  // 根据分类过滤模板
  const categoryFilteredTemplates = selectedCategory === '全部' 
    ? filteredTemplates 
    : filteredTemplates.filter(t => (t.category || '默认') === selectedCategory);

  // 处理模板选择
  const handleSelectTemplate = async (template) => {
    try {
      const response = await api.get(`/api/template/${template.templateId}`);
      const templateData = response.data;
      
      setSelectedTemplate(templateData);
      
      const initialContents = {};
      if (templateData.cells && Array.isArray(templateData.cells)) {
        templateData.cells.forEach(cell => {
          const cellKey = `${cell.day}-${cell.index}`;
          initialContents[cellKey] = '';
        });
      }
      setCellContents(initialContents);
    } catch (err) {
      console.error('加载模板详情失败:', err);
      setError('加载模板详情失败');
    }
  };

  const handleCellChange = (cellKey, value) => {
    setCellContents(prev => ({
      ...prev,
      [cellKey]: value
    }));
  };

  const handleCopyContent = (cellKey) => {
    const content = cellContents[cellKey];
    if (content) {
      setCopiedContent(content);
      const input = document.getElementById(`cell-${cellKey}`);
      if (input) {
        input.placeholder = '已复制';
        setTimeout(() => {
          input.placeholder = '输入课程';
        }, 1500);
      }
    }
  };

  const handlePasteContent = (cellKey) => {
    if (copiedContent) {
      setCellContents(prev => ({
        ...prev,
        [cellKey]: copiedContent
      }));
    }
  };

  const handleClearContent = (cellKey) => {
    setCellContents(prev => ({
      ...prev,
      [cellKey]: ''
    }));
  };

  const handleExport = async () => {
    if (!editorRef.current || !selectedTemplate) {
      setError('编辑器未初始化');
      return;
    }

    try {
      setError('正在生成图片，请稍候...');
      const img = editorRef.current.querySelector('img');
      
      if (img) {
        await new Promise((resolve, reject) => {
          if (img.complete) resolve();
          else {
            img.onload = resolve;
            img.onerror = () => reject(new Error('图片加载失败'));
          }
        });
      }

      const imgWidth = img?.naturalWidth || 800;
      const imgHeight = img?.naturalHeight || 600;
      const displayWidth = img?.width || imgWidth;
      const displayHeight = img?.height || imgHeight;

      const canvas = document.createElement('canvas');
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      const ctx = canvas.getContext('2d');

      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

      selectedTemplate.cells?.forEach((cell) => {
        const cellKey = `${cell.day}-${cell.index}`;
        const value = cellContents[cellKey];

        if (value) {
          const parseValue = (val) => {
            if (typeof val === 'number') return val;
            if (typeof val === 'string') return parseFloat(val.replace('px', ''));
            return 0;
          };

          // 直接使用原始坐标（不应用缩放比例）
          const x = parseValue(cell.x);
          const y = parseValue(cell.y);
          const width = parseValue(cell.width);
          const height = parseValue(cell.height);

          const cellElement = editorRef.current.querySelector(`[data-cell-key="${cellKey}"]`);
          const input = cellElement?.querySelector('input');

          let fontSize = 14;
          let fontFamily = 'Arial, sans-serif';
          let color = '#000';

          if (input) {
            const computedStyle = window.getComputedStyle(input);
            fontSize = parseFloat(computedStyle.fontSize);
            fontFamily = computedStyle.fontFamily;
            color = computedStyle.color;
          }

          ctx.font = `${fontSize}px ${fontFamily}`;
          ctx.fillStyle = color;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          ctx.fillText(value, x + width / 2, y + height / 2);
        }
      });

      setError(null);
      const link = document.createElement('a');
      link.download = `schedule-${selectedTemplate.templateId}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('导出失败:', err);
      setError('导出失败，请重试');
      setTimeout(() => setError(null), 3000);
    }
  };

  const renderEditor = () => {
    if (!selectedTemplate) return null;

    return (
      <div className="relative" ref={editorRef} style={{ display: 'inline-block' }}>
        <img 
          src={images[selectedTemplate.templateId]} 
          alt="Template" 
          style={{ display: 'block', maxWidth: '100%', height: 'auto' }} 
        />
        {selectedTemplate.cells?.map((cell) => {
          const cellKey = `${cell.day}-${cell.index}`;
          return (
            <div
              key={cellKey}
              className="absolute"
              style={{
                top: cell.y,
                left: cell.x,
                width: cell.width,
                height: cell.height,
              }}
              data-cell-key={cellKey}
            >
              <Input
                id={`cell-${cellKey}`}
                value={cellContents[cellKey]}
                onChange={(e) => handleCellChange(cellKey, e.target.value)}
                placeholder="输入课程"
                className="w-full h-full"
              />
              <div className="absolute top-0 right-0 flex space-x-1">
                <Button variant="ghost" onClick={() => handleCopyContent(cellKey)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" onClick={() => handlePasteContent(cellKey)}>
                  <Clipboard className="h-4 w-4" />
                </Button>
                <Button variant="ghost" onClick={() => handleClearContent(cellKey)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center space-x-4">
        <Input
          placeholder="搜索模板"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          导出
        </Button>
      </div>
      <div className="flex space-x-4">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {categoryFilteredTemplates.map((template) => (
          <Card key={template.templateId} onClick={() => handleSelectTemplate(template)}>
            <CardHeader>
              <CardTitle>{template.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <img src={images[template.templateId]} alt={template.name} className="w-full h-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-4">
        {renderEditor()}
      </div>
    </div>
  );
};

export default TemplateBrowser;
