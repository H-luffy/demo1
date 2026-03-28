# 更新日志

## v1.2.0 - 文字位置修复

### 修复内容

#### 1. 文字位置偏移问题修复
- 优化了导出时的文本元素样式
- 使用输入框的计算样式确保一致性
- 改进了格子容器的定位方式
- 统一了编辑和导出时的样式

#### 2. 样式优化
- 格子容器添加 `position: absolute` 确保精确定位
- 输入框使用绝对定位填充整个格子
- 统一设置 `margin: 0` 和 `padding: 0`
- 添加 `box-sizing: border-box` 确保尺寸计算准确
- 添加 `overflow: hidden` 防止内容溢出

#### 3. Canvas 配置优化
- 使用 1:1 比例导出，避免缩放导致的位置偏移
- 在 onclone 回调中强制设置样式
- 确保克隆文档中的样式与原始文档一致

#### 4. CSS 样式统一
- 更新 `.cell` 样式，添加定位相关属性
- 更新 `.cell input` 样式，使用绝对定位
- 确保所有样式属性都有明确的值

### 技术细节

#### 文本元素样式
```css
position: absolute;
top: 0;
left: 0;
right: 0;
bottom: 0;
display: flex;
align-items: center;
justify-content: center;
```

#### 格子容器样式
```css
position: absolute;
margin: 0;
padding: 0;
box-sizing: border-box;
overflow: hidden;
```

#### 输入框样式
```css
position: absolute;
top: 0;
left: 0;
right: 0;
bottom: 0;
width: 100%;
height: 100%;
margin: 0;
box-sizing: border-box;
outline: none;
```

### 使用建议

1. **标记格子时**
   - 确保格子大小适中，不要太大或太小
   - 格子之间保持适当的间距
   - 标记时使用较大的图片以获得更好的精度

2. **编辑课表时**
   - 文字会自动居中显示
   - 输入框背景完全透明
   - 可以看到完整的模板背景

3. **导出图片时**
   - 导出比例为 1:1，确保位置准确
   - 文字位置与编辑时完全一致
   - 图片质量清晰

### 已知问题

无

### 下一步计划

- [ ] 添加更多字体选项
- [ ] 支持自定义文字颜色
- [ ] 支持多行文本
- [ ] 添加图片裁剪功能

## v1.1.0 - 导出功能修复

### 修复内容

#### 1. 导出图片为白板问题
- 使用 Base64 编码加载图片，避免跨域问题
- 优化图片加载逻辑
- 添加图片加载完成检测

#### 2. 导出失败错误修复
- 修复 "Cannot read properties of null" 错误
- 添加详细的空值检查
- 改进错误处理逻辑
- 修改错误显示方式，确保 editorRef 始终被渲染

#### 3. 图片加载优化
- 所有组件都改用 Base64 编码加载图片
- 避免跨域问题导致的图片无法显示
- 确保导出时图片正确显示

#### 4. 样式改进
- 强制设置输入框背景为透明
- 确保文字居中显示
- 统一字体和颜色样式

### 新增功能

- 详细的导出过程日志
- 错误信息更友好
- 添加 TESTING.md 测试指南

## v1.0.0 - 初始版本

### 核心功能

1. **管理员功能**
   - 上传模板图片
   - 手动标记格子位置
   - 保存模板配置
   - 查看和删除已标记的格子

2. **用户功能**
   - 查看所有可用模板
   - 选择模板进行编辑
   - 在格子中直接输入课程内容
   - 导出最终课表为 PNG 图片

3. **技术特性**
   - React + Node.js 全栈实现
   - REST API 接口
   - 本地文件存储
   - 响应式设计

### 文件结构

```
demo1/
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── uploads/
│   └── templates-data/
└── frontend/
    ├── package.json
    ├── public/
    │   └── index.html
    └── src/
        ├── index.js
        ├── index.css
        ├── App.js
        └── components/
            ├── TemplateList.js
            ├── TemplateEditor.js
            └── TemplateManager.js
```

### API 接口

- POST /api/upload-template - 上传模板图片
- POST /api/save-template - 保存模板配置
- GET /api/templates - 获取模板列表
- GET /api/template/:id - 获取单个模板详情
