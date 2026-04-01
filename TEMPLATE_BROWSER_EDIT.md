# TemplateBrowser 组件优化说明

## 🎯 优化目标

将模板浏览器和编辑器合二为一，用户选中模板后可直接在右侧编辑，无需跳转页面。

## ✨ 主要改进

### 1. **集成编辑功能**
- ✅ 在右侧区域直接显示编辑器
- ✅ 点击格子即可输入课程内容
- ✅ 支持复制、粘贴、清除操作
- ✅ 实时预览编辑效果

### 2. **新增功能函数**

#### handleSelectTemplate(template)
```javascript
// 选择模板时自动加载详情和初始化格子内容
const handleSelectTemplate = async (template) => {
  setSelectedTemplate(template);
  
  // 加载模板详情
  const response = await axios.get(`/api/template/${template.templateId}`);
  
  // 初始化所有格子内容为空
  const initialContents = {};
  templateData.cells.forEach(cell => {
    const cellKey = `${cell.day}-${cell.index}`;
    initialContents[cellKey] = '';
  });
  setCellContents(initialContents);
};
```

#### handleCellChange(cellKey, value)
```javascript
// 更新指定格子的内容
const handleCellChange = (cellKey, value) => {
  setCellContents(prev => ({
    ...prev,
    [cellKey]: value
  }));
};
```

#### handleCopyContent(cellKey)
```javascript
// 复制格子内容到剪贴板（内存）
const handleCopyContent = (cellKey) => {
  const content = cellContents[cellKey];
  if (content) {
    setCopiedContent(content);
    // 显示"已复制"提示
  }
};
```

#### handlePasteContent(cellKey)
```javascript
// 粘贴剪贴板内容到指定格子
const handlePasteContent = (cellKey) => {
  if (copiedContent) {
    setCellContents(prev => ({
      ...prev,
      [cellKey]: copiedContent
    }));
  }
};
```

#### handleClearContent(cellKey)
```javascript
// 清除指定格子的内容
const handleClearContent = (cellKey) => {
  setCellContents(prev => ({
    ...prev,
    [cellKey]: ''
  }));
};
```

#### handleExport()
```javascript
// 导出编辑后的课表为 PNG 图片
const handleExport = async () => {
  // 1. 等待图片加载完成
  // 2. 创建 Canvas
  // 3. 绘制背景图片
  // 4. 计算缩放比例
  // 5. 遍历所有格子，绘制文字内容
  // 6. 导出为 PNG 并下载
};
```

### 3. **UI 布局优化**

#### 左侧边栏 (保持不变)
- 搜索框
- 分类筛选
- 模板列表
- 返回首页按钮

#### 右侧主内容区 (重大改动)

##### 顶部信息卡片
```jsx
<Card>
  <CardHeader>
    <CardTitle>
      - 模板名称/ID
      - 导出图片按钮 (新增)
    </CardTitle>
  </CardHeader>
  <CardContent>
    - 分类信息
    - 格子数量
  </CardContent>
</Card>
```

##### 在线编辑器卡片 (新增核心功能)
```jsx
<Card>
  <div className="header">
    - 标题："点击格子输入课程内容"
    - 提示："💡 提示：直接在格子中输入文字，支持复制粘贴操作"
  </div>
  <CardContent>
    <div ref={editorRef}>
      - 模板图片
      - 可编辑格子 (带输入框)
      - 悬停操作按钮 (复制/粘贴/清除)
    </div>
  </CardContent>
</Card>
```

### 4. **状态管理**

#### 新增状态变量
```javascript
const [cellContents, setCellContents] = useState({});  // 格子内容
const [copiedContent, setCopiedContent] = useState(null);  // 复制的内容
const editorRef = useRef(null);  // 编辑器引用
```

### 5. **交互体验提升**

#### 格子输入框
- ✅ 透明背景，与模板融合
- ✅ 居中对齐，自动适配格子大小
- ✅ 悬停时显示操作按钮
- ✅ 支持键盘输入
- ✅ 字体颜色：`#2d3748` (深灰色)
- ✅ 字体大小：14px
- ✅ 字重：500 (中等)

#### 操作按钮
- 📋 **复制**: 绿色渐变背景
- 📝 **粘贴**: 蓝色渐变背景
- ✕ **清除**: 红色渐变背景
- ✅ 悬停时显示，平时隐藏
- ✅ 圆角 4px + 阴影效果

### 6. **导出功能实现**

导出流程:
1. **准备阶段**: 验证编辑器初始化，获取图片元素
2. **加载检查**: 等待图片完全加载
3. **Canvas 创建**: 按原图尺寸创建画布
4. **图片绘制**: 在 Canvas 上绘制背景图
5. **坐标计算**: 
   - 获取实际尺寸和显示尺寸
   - 计算缩放比例 `scaleX`, `scaleY`
6. **文字渲染**:
   - 遍历所有有内容的格子
   - 应用缩放比例到坐标和字体
   - 使用 Canvas API 绘制文字
7. **导出下载**: 生成 PNG 并触发下载

### 7. **代码复用**

从 `TemplateEditor.js` 复用的逻辑:
- ✅ 格子内容管理 (`handleCellChange`)
- ✅ 复制粘贴功能 (`handleCopyContent`, `handlePasteContent`)
- ✅ 清除功能 (`handleClearContent`)
- ✅ 导出功能 (`handleExport`)
- ✅ 样式处理 (字体、颜色、对齐)

### 8. **性能优化**

- ✅ 使用 `useRef` 避免不必要的重新渲染
- ✅ 异步加载图片和数据
- ✅ 只在选中模板时加载详情
- ✅ 格子内容本地管理，减少 API 调用

## 📊 对比优化前后

| 功能 | 优化前 | 优化后 |
|------|--------|--------|
| 编辑方式 | 跳转页面 | 当前页面直接编辑 ✨ |
| 操作步骤 | 点击列表 → 点击编辑 → 编辑 | 点击列表 → 直接编辑 🚀 |
| 返回操作 | 需要点击"返回" | 自动保留选中状态 |
| 上下文切换 | 频繁跳转 | 无跳转，流畅体验 |
| 加载速度 | 每次跳转重新加载 | 一次加载，持久缓存 |

## 🎨 用户体验提升

### 操作流程优化
**优化前:**
```
1. 点击模板列表项
2. 查看模板详情
3. 点击"编辑课表"按钮
4. 跳转到编辑页面
5. 编辑内容
6. 导出或返回首页
```

**优化后:**
```
1. 点击模板列表项
2. 直接在右侧编辑 ✨
3. 导出或继续浏览
```

### 视觉反馈
- ✅ 选中高亮：紫色边框 (`ring-purple-500`)
- ✅ 悬停效果：操作按钮渐显
- ✅ 加载状态：友好的提示文字
- ✅ 错误处理：清晰的错误信息

## 🔧 技术细节

### 关键代码片段

#### 1. 格子渲染
```jsx
{selectedTemplate.cells.map(cell => {
  const cellKey = `${cell.day}-${cell.index}`;
  return (
    <div key={cellKey} data-cell-key={cellKey} className="cell">
      <input
        type="text"
        value={cellContents[cellKey] || ''}
        onChange={(e) => handleCellChange(cellKey, e.target.value)}
        placeholder="输入课程"
      />
      {/* 操作按钮 */}
    </div>
  );
})}
```

#### 2. 导出时的文字渲染
```javascript
ctx.font = `${scaledFontSize}px ${fontFamily}`;
ctx.fillStyle = color;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText(value, centerX, centerY);
```

#### 3. 响应式布局
```jsx
<div className="flex h-screen bg-gray-50">
  <aside className="w-72">左侧列表</aside>
  <main className="flex-1 overflow-y-auto">右侧编辑器</main>
</div>
```

## 📝 使用说明

### 用户操作流程

1. **浏览模板**
   - 在左侧列表浏览可用模板
   - 使用搜索框快速查找
   - 点击分类标签筛选

2. **选择模板**
   - 点击任意模板卡片
   - 右侧自动显示编辑器
   - 格子自动初始化

3. **编辑内容**
   - 点击任意格子输入文字
   - 使用复制粘贴快速填充
   - 实时预览效果

4. **导出课表**
   - 点击"导出图片"按钮
   - 自动生成 PNG 图片
   - 保存到本地

## 🐛 注意事项

1. **图片加载**: 确保后端服务运行，图片 URL 可访问
2. **跨域问题**: 已配置 CORS，端口 3001 需开启
3. **格子坐标**: 依赖模板数据的准确性
4. **字体渲染**: Canvas 文字可能与屏幕显示略有差异
5. **浏览器兼容**: 建议使用现代浏览器 (Chrome/Firefox/Edge)

## 🚀 未来优化方向

1. **批量操作**: 支持批量复制粘贴
2. **撤销重做**: 添加操作历史管理
3. **快捷键**: 支持键盘快捷键操作
4. **模板切换**: 编辑时切换到其他模板保留内容
5. **本地存储**: 自动保存草稿到 localStorage

## ✅ 测试清单

- [x] 模板选择正常
- [x] 格子内容编辑正常
- [x] 复制粘贴功能正常
- [x] 清除功能正常
- [x] 导出图片正常
- [x] 无语法错误
- [x] UI 响应式正常
- [x] 性能表现良好

## 📖 相关文件

- `frontend/src/components/TemplateBrowser.js` - 主要修改文件
- `frontend/src/components/TemplateEditor.js` - 参考的原始编辑器
- `UI_OPTIMIZATION.md` - UI 优化总览

---

**优化完成!** 现在用户可以在浏览器页面直接编辑课表，无需跳转页面！🎉
