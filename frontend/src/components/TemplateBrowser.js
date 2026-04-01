import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Home, Search, BookOpen, Download, Calendar, User, Settings, ChevronRight } from 'lucide-react';

const TemplateBrowser = () => {
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
      const response = await axios.get(`/api/template/${template.templateId}`);
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

      const scaleX = imgWidth / displayWidth;
      const scaleY = imgHeight / displayHeight;

      const canvas = document.createElement('canvas');
      canvas.width = imgWidth;
      canvas.height = imgHeight;
      const ctx = canvas.getContext('2d');

      ctx.drawImage(img, 0, 0, imgWidth, imgHeight);

      selectedTemplate.cells?.forEach((cell) => {
        const cellKey = `${cell.day}-${cell.index}`;
        const value = cellContents[cellKey];

        if (value) {
          const parseValue = (val) => {
            if (typeof val === 'number') return val;
            if (typeof val === 'string') return parseFloat(val.replace('px', ''));
            return 0;
          };

          const x = parseValue(cell.x) * scaleX;
          const y = parseValue(cell.y) * scaleY;
          const width = parseValue(cell.width) * scaleX;
          const height = parseValue(cell.height) * scaleY;

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

          const scaledFontSize = fontSize * Math.min(scaleX, scaleY);

          ctx.font = `${scaledFontSize}px ${fontFamily}`;
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
    if (!selectedTemplate.cells || selectedTemplate.cells.length === 0) {
      return (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg font-medium mb-2">该模板还没有定义格子</p>
          <p className="text-gray-400 text-sm">请先在模板管理页面标记格子位置</p>
        </div>
      );
    }

    return (
      <div ref={editorRef} className="template-editor" style={{ position: 'relative', display: 'inline-block' }}>
        <img 
          src={images[selectedTemplate.templateId] || `http://localhost:3001${selectedTemplate.image}`} 
          alt={`模板 ${selectedTemplate.templateId}`} 
          className="max-w-full h-auto rounded-lg"
        />
        {selectedTemplate.cells.map(cell => {
          const cellKey = `${cell.day}-${cell.index}`;
          return (
            <div
              key={cellKey}
              data-cell-key={cellKey}
              className="cell group"
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
                  color: '#2d3748',
                  fontFamily: 'Arial, sans-serif',
                  padding: '5px',
                  margin: 0,
                  boxSizing: 'border-box',
                  outline: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '500'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '-24px',
                  right: '0',
                  display: 'flex',
                  gap: '4px',
                  opacity: 0,
                  transition: 'opacity 0.2s'
                }}
                className="cell-actions"
              >
                <button onClick={() => handleCopyContent(cellKey)} style={{
                  padding: '4px 8px', fontSize: '12px', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #48bb78, #38a169)',
                  color: 'white', border: 'none', borderRadius: '4px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} title="复制内容">📋</button>
                <button onClick={() => handlePasteContent(cellKey)} style={{
                  padding: '4px 8px', fontSize: '12px', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #63b3ed, #4299e1)',
                  color: 'white', border: 'none', borderRadius: '4px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} title="粘贴内容">📝</button>
                <button onClick={() => handleClearContent(cellKey)} style={{
                  padding: '4px 8px', fontSize: '12px', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #fc8181, #f56565)',
                  color: 'white', border: 'none', borderRadius: '4px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} title="清除内容">✕</button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 左侧边栏 */}
      <aside className="w-72 bg-white border-r border-gray-200 flex flex-col">
        {/* 侧边栏头部 */}
        <div className="p-5 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="h-5 w-5 text-purple-600" />
            <h1 className="text-lg font-bold text-gray-900">课程模板</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="搜索模板..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* 分类标签 */}
        <div className="px-5 py-3 border-b border-gray-200">
          <div className="flex gap-2 flex-wrap">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "primary" : "secondary"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="text-xs"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* 模板列表 */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-2">
            {categoryFilteredTemplates.map(template => (
              <Card
                key={template.templateId}
                className={`cursor-pointer transition-all hover:shadow-md border-0 shadow-sm ${
                  selectedTemplate?.templateId === template.templateId ? 'ring-2 ring-purple-500' : ''
                }`}
                onClick={() => handleSelectTemplate(template)}
              >
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    <img
                      src={images[template.templateId] || `http://localhost:3001${template.image}`}
                      alt={`模板 ${template.templateId}`}
                      className="w-14 h-14 object-cover rounded-md"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm mb-1 truncate text-gray-900">
                        {template.name || `模板 #${template.templateId}`}
                      </h3>
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {template.category || '默认分类'} • {template.cellsCount}个格子
                      </p>
                      <div className="mt-1.5 flex items-center gap-1 text-xs text-purple-600">
                        <span>点击查看详情</span>
                        <ChevronRight className="h-3 w-3" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 侧边栏底部 */}
        <div className="p-4 border-t border-gray-200">
          <Link to="/">
            <Button variant="secondary" className="w-full gap-2">
              <Home className="h-4 w-4" />
              返回首页
            </Button>
          </Link>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-gray-500">加载中...</div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-red-600">{error}</div>
          </div>
        ) : !selectedTemplate ? (
          <div className="h-full flex items-center justify-center">
            <Card className="max-w-md border-0 shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="text-center text-xl">欢迎使用课程模板系统</CardTitle>
              </CardHeader>
              <CardContent className="text-center text-gray-600">
                <div className="mb-6">
                  <BookOpen className="h-16 w-16 mx-auto text-purple-600 mb-4" />
                  <p className="text-gray-600">请从左侧选择一个模板开始编辑课程信息</p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-purple-600" />
                    </div>
                    <span className="text-gray-700">浏览模板</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="text-gray-700">编辑课程</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="text-gray-700">管理信息</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            {/* 模板信息卡片 */}
            <Card className="mb-6 border-0 shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-purple-600" />
                    <span className="text-xl">{selectedTemplate.name || `模板 #${selectedTemplate.templateId}`}</span>
                  </div>
                  <Button onClick={handleExport} variant="success" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    导出图片
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {selectedTemplate.category || '默认分类'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Settings className="h-4 w-4" />
                    {selectedTemplate.cellsCount}个格子
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* 在线编辑器 */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-purple-100">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-purple-600" />
                  点击格子输入课程内容
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  💡 提示：直接在格子中输入文字，支持复制粘贴操作
                </p>
              </div>
              
              <CardContent className="p-6 bg-white">
                {renderEditor()}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default TemplateBrowser;
