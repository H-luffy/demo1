# 课表模板编辑系统

一个完整的课表模板编辑系统，支持管理员上传模板图片并手动标记格子位置，用户可以选择模板并在格子中编辑内容，最后导出为图片。

## 项目结构

```
demo1/
├── backend/                    # 后端代码
│   ├── package.json           # 后端依赖配置
│   ├── server.js              # Express 服务器
│   ├── uploads/               # 上传的图片存储目录（自动创建）
│   └── templates-data/        # 模板数据存储目录（自动创建）
└── frontend/                  # 前端代码
    ├── package.json           # 前端依赖配置
    ├── public/
    │   └── index.html         # HTML 模板
    └── src/
        ├── index.js           # React 入口文件
        ├── index.css          # 全局样式
        ├── App.js             # 主应用组件
        └── components/
            ├── TemplateList.js      # 模板列表组件
            ├── TemplateEditor.js    # 模板编辑器组件
            └── TemplateManager.js  # 模板管理组件
```

## 技术栈

### 后端
- Node.js
- Express
- Multer (文件上传)
- CORS (跨域支持)

### 前端
- React 18
- React Router DOM
- html2canvas (导出图片)
- Axios (HTTP 请求)

## 功能特性

### 管理员功能
1. 上传模板图片
2. 手动标记格子位置（拖拽创建矩形区域）
3. 为每个格子设置 day (mon-fri) 和 index (0-7)
4. 保存模板配置
5. 查看和删除已标记的格子

### 用户功能
1. 查看所有可用模板
2. 选择模板进行编辑
3. 在格子中直接输入课程内容
4. 导出最终课表为 PNG 图片

## 安装和运行

### 后端设置

1. 进入后端目录：
```bash
cd backend
```

2. 安装依赖：
```bash
npm install
```

3. 启动服务器：
```bash
npm start
```

服务器将在 http://localhost:3001 运行

### 前端设置

1. 进入前端目录：
```bash
cd frontend
```

2. 安装依赖：
```bash
npm install
```

3. 启动开发服务器：
```bash
npm start
```

应用将在 http://localhost:3000 运行

## 使用说明

### 管理员操作流程

1. 访问 http://localhost:3000
2. 点击导航栏的"模板管理"
3. 点击"上传新模板"按钮，选择课表模板图片
4. 图片上传后，点击"标记模式"按钮
5. 在下拉菜单中选择星期（周一到周五）
6. 设置节次索引（0-7）
7. 在图片上拖拽鼠标创建格子区域
8. 重复步骤 5-7，标记所有格子
9. 点击"保存配置"按钮保存模板

### 用户操作流程

1. 访问 http://localhost:3000
2. 在模板列表中选择要使用的模板
3. 点击"编辑课表"按钮
4. 在格子中输入课程内容
5. 点击"导出图片"按钮下载课表

## API 接口

### POST /api/upload-template
上传模板图片

**请求参数：**
- image: 文件（multipart/form-data）

**响应：**
```json
{
  "success": true,
  "templateId": 1,
  "image": "/uploads/template-xxx.png"
}
```

### POST /api/save-template
保存模板配置

**请求参数：**
```json
{
  "templateId": 1,
  "cells": [
    {
      "day": "mon",
      "index": 0,
      "x": 100,
      "y": 80,
      "width": 100,
      "height": 60
    }
  ]
}
```

**响应：**
```json
{
  "success": true
}
```

### GET /api/templates
获取模板列表

**响应：**
```json
[
  {
    "templateId": 1,
    "image": "/uploads/template-xxx.png",
    "cellsCount": 10
  }
]
```

### GET /api/template/:id
获取单个模板详情

**响应：**
```json
{
  "templateId": 1,
  "image": "/uploads/template-xxx.png",
  "cells": [
    {
      "day": "mon",
      "index": 0,
      "x": 100,
      "y": 80,
      "width": 100,
      "height": 60
    }
  ]
}
```

## 注意事项

1. 确保后端服务器（3001端口）和前端开发服务器（3000端口）同时运行
2. 上传的图片会保存在 backend/uploads 目录
3. 模板配置数据会保存在 backend/templates-data 目录
4. 导出的图片会自动下载到浏览器默认下载目录
5. 标记格子时，建议使用较大的图片以获得更好的精度

## 开发说明

### 添加新功能

1. 后端：在 server.js 中添加新的路由和处理函数
2. 前端：在 components 目录下创建新组件或在现有组件中添加功能

### 样式修改

全局样式在 frontend/src/index.css 中定义
组件特定样式可以使用内联样式或在组件中定义 CSS

### 数据存储

当前实现使用本地文件系统存储数据：
- 图片：backend/uploads/
- 模板数据：backend/templates-data/

如需使用数据库，可以修改 server.js 中的数据存储逻辑
