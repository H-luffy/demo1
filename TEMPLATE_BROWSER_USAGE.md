# TemplateBrowser 功能说明

## ✅ 当前实现的功能

### 📋 **核心特性**

在左侧边栏选中模板后，右侧会**直接显示该模板的完整编辑器**,包括:

1. **模板预览图** - 显示模板的原始图片
2. **可编辑格子** - 每个格子都可以点击输入课程内容
3. **快捷操作按钮** - 悬停时显示复制/粘贴/清除按钮
4. **导出功能** - 点击右上角"导出图片"按钮保存课表

### 🎯 **操作流程**

```
┌─────────────────────────────────────────────────────┐
│  Template Browser                                   │
├──────────────┬──────────────────────────────────────┤
│              │                                      │
│  左侧边栏    │         右侧编辑区                   │
│  - 搜索框    │   ┌────────────────────────────┐    │
│  - 分类筛选  │   │ 模板 #1                    │    │
│  - 模板列表  │   │ [导出图片]                 │    │
│              │   └────────────────────────────┘    │
│  [模板 1]     │   ┌────────────────────────────┐    │
│  [模板 2] ✓   │   │                            │    │
│  [模板 3]     │   │    模板图片 + 可编辑格子    │    │
│              │   │    - 点击格子输入文字       │    │
│              │   │    - 悬停显示操作按钮       │    │
│              │   │    - 实时预览效果           │    │
│              │   └────────────────────────────┘    │
└──────────────┴──────────────────────────────────────┘
```

### 🔍 **详细步骤**

#### 步骤 1: 浏览模板
- 在左侧边栏查看模板列表
- 使用搜索框快速查找
- 点击分类标签筛选

#### 步骤 2: 选择模板 (关键!)
**点击任意模板卡片后:**
1. ✅ 右侧立即显示该模板的**完整编辑器**
2. ✅ 自动加载模板详情和格子数据
3. ✅ 初始化所有格子内容为空
4. ✅ 可以直接开始编辑

#### 步骤 3: 编辑内容
- 点击任意格子输入课程名称
- 使用悬停按钮进行复制/粘贴/清除
- 实时看到编辑效果

#### 步骤 4: 导出课表
- 点击右上角"导出图片"按钮
- 自动生成 PNG 图片
- 保存到本地电脑

### 💡 **代码关键点**

#### handleSelectTemplate 函数
```javascript
const handleSelectTemplate = async (template) => {
  // 1. 调用 API 获取模板详情 (包含 cells 数组)
  const response = await axios.get(`/api/template/${template.templateId}`);
  const templateData = response.data;
  
  // 2. 更新 selectedTemplate 状态
  setSelectedTemplate(templateData);
  
  // 3. 初始化格子内容
  const initialContents = {};
  if (templateData.cells && Array.isArray(templateData.cells)) {
    templateData.cells.forEach(cell => {
      const cellKey = `${cell.day}-${cell.index}`;
      initialContents[cellKey] = '';
    });
  }
  setCellContents(initialContents);
};
```

#### renderEditor 函数
```javascript
const renderEditor = () => {
  // 检查是否有格子定义
  if (!selectedTemplate.cells || selectedTemplate.cells.length === 0) {
    return <EmptyState />; // 显示友好提示
  }

  // 渲染完整的编辑器
  return (
    <div ref={editorRef}>
      {/* 模板图片 */}
      <img src={...} />
      
      {/* 可编辑格子 */}
      {selectedTemplate.cells.map(cell => (
        <div key={cellKey}>
          <input 
            value={cellContents[cellKey] || ''}
            onChange={(e) => handleCellChange(cellKey, e.target.value)}
          />
          {/* 操作按钮 */}
        </div>
      ))}
    </div>
  );
};
```

### 🎨 **界面布局**

#### 右侧编辑区结构
```jsx
<main className="右侧主内容区">
  {!selectedTemplate ? (
    // 欢迎页面
  ) : (
    <div>
      {/* 模板信息卡片 */}
      <Card>
        - 模板名称
        - 导出图片按钮
        - 分类和格子数量
      </Card>

      {/* 在线编辑器卡片 */}
      <Card>
        - 标题："点击格子输入课程内容"
        - 提示："💡 直接在格子中输入文字..."
        - 模板图片 + 可编辑格子
      </Card>
    </div>
  )}
</main>
```

### ✨ **用户体验亮点**

1. **零跳转** - 选择模板后无需点击任何按钮，右侧直接显示编辑器
2. **即时编辑** - 格子自动初始化，可以立即开始输入
3. **视觉反馈** - 选中的模板在左侧有高亮效果 (紫色边框)
4. **智能提示** - 如果模板没有格子，会显示友好的引导信息
5. **一键导出** - 编辑完成后直接导出，无需返回其他页面

### 📊 **数据结构**

#### selectedTemplate 对象
```javascript
{
  templateId: 1,           // 模板 ID
  name: "简约课表",        // 模板名称
  category: "简约风",      // 分类
  image: "/uploads/xxx.png", // 图片路径
  cellsCount: 35,          // 格子数量
  cells: [                 // 格子坐标数组
    {
      day: "monday",       // 星期
      index: 1,            // 第几节课
      x: 100,              // X 坐标
      y: 50,               // Y 坐标
      width: 80,           // 宽度
      height: 40           // 高度
    },
    // ... 更多格子
  ]
}
```

### 🚀 **测试验证**

请按以下步骤测试:

1. **启动项目**
   ```bash
   # 后端
   cd backend && npm start
   
   # 前端 (新终端)
   cd frontend && npm start
   ```

2. **访问页面**
   - 打开浏览器访问：`http://localhost:3000/browser`

3. **测试流程**
   - [ ] 点击左侧任意模板
   - [ ] 右侧应该立即显示模板图片和编辑器
   - [ ] 点击格子可以输入文字
   - [ ] 悬停时显示操作按钮
   - [ ] 点击"导出图片"可以保存

### 🎉 **总结**

现在的 **TemplateBrowser** 组件已经完美实现了您的需求:

> **"在左边侧边栏选中模板后，可以直接在右边显示出来该模板，直接编辑"**

✅ 左侧选择 → 右侧显示  
✅ 无需跳转 → 直接编辑  
✅ 完整功能 → 导出可用  

所有代码都已通过语法检查，可以直接运行！🚀
