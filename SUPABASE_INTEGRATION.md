# Supabase 集成方案

## 📊 项目架构升级

### 当前架构 vs Supabase 架构

#### 当前架构 (文件系统)
```
前端 (React) 
  ↓ HTTP
后端 (Node.js + Express)
  ↓ 文件读写
JSON 文件 / 图片文件
```

#### Supabase 架构
```
前端 (React) 
  ↓ Supabase JS SDK
Supabase Cloud
  ├─ PostgreSQL 数据库
  ├─ 用户认证 (Auth)
  ├─ 文件存储 (Storage)
  └─ 实时订阅 (Realtime)
```

**优势**: 无需后端服务器，前端直接调用数据库！🎉

---

## 🎯 技术栈对比

| 方案 | Sequelize + MySQL | Supabase |
|------|------------------|----------|
| 部署 | 需要服务器 | 云端托管 ✅ |
| 成本 | 服务器费用 | 免费起步 ✅ |
| 开发速度 | 中等 | 极快 ✅ |
| 实时功能 | 需额外实现 | 内置 ✅ |
| 认证系统 | 需自己开发 | 内置 ✅ |
| 文件存储 | 本地/自行解决 | 内置 ✅ |
| API 开发 | 需编写路由 | 自动生成 ✅ |

---

## 📦 实施步骤

### 第一步：创建 Supabase 项目 (5 分钟)

#### 1. 注册账号
访问：https://supabase.com

#### 2. 创建新项目
```
项目名称：schedule-template
数据库密码：YourStrongPassword123!
区域：选择最近的 (推荐 Asia Singapore)
```

#### 3. 获取配置信息
在 Settings → API 中找到:
- `Project URL`: https://xxxxx.supabase.co
- `Anon Public Key`: eyJhbGciOiJIUzI1NiIsInR...

---

### 第二步：数据库表设计 (10 分钟)

#### SQL 编辑器执行

```sql
-- 1. 创建模板表
CREATE TABLE templates (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'default',
  image_url VARCHAR(255) NOT NULL,
  thumbnail_url VARCHAR(255),
  cells_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_is_public ON templates(is_public);

-- 启用 Row Level Security (RLS)
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- 创建策略：公开模板所有人可见
CREATE POLICY "Public templates are viewable by everyone"
  ON templates FOR SELECT
  USING (is_public = TRUE);

-- 创建策略：用户只能操作自己的模板
CREATE POLICY "Users can insert their own templates"
  ON templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON templates FOR DELETE
  USING (auth.uid() = user_id);


-- 2. 创建格子表
CREATE TABLE template_cells (
  id BIGSERIAL PRIMARY KEY,
  template_id BIGINT REFERENCES templates(id) ON DELETE CASCADE,
  day VARCHAR(20) NOT NULL,
  index INTEGER NOT NULL,
  x DECIMAL(10,2) NOT NULL,
  y DECIMAL(10,2) NOT NULL,
  width DECIMAL(10,2) NOT NULL,
  height DECIMAL(10,2) NOT NULL,
  font_size INTEGER DEFAULT 14,
  color VARCHAR(20) DEFAULT '#000000',
  font_family VARCHAR(50) DEFAULT 'Arial',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(template_id, day, index)
);

-- 创建索引
CREATE INDEX idx_cells_template_id ON template_cells(template_id);
CREATE INDEX idx_cells_day ON template_cells(day);

-- 启用 RLS
ALTER TABLE template_cells ENABLE ROW LEVEL SECURITY;

-- 继承模板的权限
CREATE POLICY "Cells follow template permissions"
  ON template_cells FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM templates
      WHERE templates.id = template_cells.template_id
      AND (templates.is_public = TRUE OR auth.uid() = templates.user_id)
    )
  );


-- 3. 创建导出日志表
CREATE TABLE export_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  template_id BIGINT REFERENCES templates(id) ON DELETE CASCADE,
  image_url VARCHAR(255),
  file_size BIGINT,
  exported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE export_logs ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的日志
CREATE POLICY "Users can view their own export logs"
  ON export_logs FOR SELECT
  USING (auth.uid() = user_id);

-- 用户可以插入自己的日志
CREATE POLICY "Users can insert their own export logs"
  ON export_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- 4. 创建存储桶 (Storage Bucket)
INSERT INTO storage.buckets (id, name, public)
VALUES ('template-images', 'template-images', true);

-- 设置存储策略
CREATE POLICY "Public images are viewable by everyone"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'template-images');

CREATE POLICY "Authenticated users can upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'template-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can update their own images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'template-images'
    AND auth.uid()::text = (metadata->>'user_id')::text
  );
```

---

### 第三步：前端集成 (30 分钟)

#### 1. 安装依赖
```bash
cd frontend
npm install @supabase/supabase-js
```

#### 2. 配置环境变量
```bash
# frontend/.env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR...
```

#### 3. 创建 Supabase 客户端
```javascript
// frontend/src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

#### 4. 创建认证服务
```javascript
// frontend/src/services/auth.js
import { supabase } from '../lib/supabaseClient';

export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });
  
  if (error) throw error;
  return data;
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// 监听认证状态变化
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback);
};
```

#### 5. 创建模板服务
```javascript
// frontend/src/services/templates.js
import { supabase } from '../lib/supabaseClient';

// 获取所有公开模板
export const getPublicTemplates = async (category = null) => {
  let query = supabase
    .from('templates')
    .select(`
      *,
      user:user_id (
        id,
        email
      )
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false });
  
  if (category) {
    query = query.eq('category', category);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
};

// 获取单个模板详情
export const getTemplateById = async (id) => {
  const { data, error } = await supabase
    .from('templates')
    .select(`
      *,
      cells:template_cells (
        id,
        day,
        index,
        x,
        y,
        width,
        height,
        font_size,
        color,
        font_family
      )
    `)
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
};

// 创建模板
export const createTemplate = async (templateData) => {
  const { data: template, error: templateError } = await supabase
    .from('templates')
    .insert([{
      user_id: (await supabase.auth.getUser()).data.user.id,
      name: templateData.name,
      category: templateData.category,
      image_url: templateData.imageUrl,
      cells_count: templateData.cells?.length || 0,
      is_public: true
    }])
    .select()
    .single();
  
  if (templateError) throw templateError;
  
  // 插入格子数据
  if (templateData.cells && templateData.cells.length > 0) {
    const cells = templateData.cells.map(cell => ({
      template_id: template.id,
      day: cell.day,
      index: cell.index,
      x: cell.x,
      y: cell.y,
      width: cell.width,
      height: cell.height,
      font_size: cell.fontSize || 14,
      color: cell.color || '#000000'
    }));
    
    const { error: cellsError } = await supabase
      .from('template_cells')
      .insert(cells);
    
    if (cellsError) throw cellsError;
  }
  
  return template;
};

// 更新模板
export const updateTemplate = async (id, updates) => {
  const { data, error } = await supabase
    .from('templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

// 删除模板
export const deleteTemplate = async (id) => {
  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// 上传模板图片
export const uploadTemplateImage = async (file, templateId) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${templateId}-${Date.now()}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('template-images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });
  
  if (error) throw error;
  
  // 获取公开 URL
  const { data: { publicUrl } } = supabase.storage
    .from('template-images')
    .getPublicUrl(fileName);
  
  return publicUrl;
};

// 订阅实时更新
export const subscribeToTemplates = (callback) => {
  return supabase
    .channel('templates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'templates'
      },
      callback
    )
    .subscribe();
};
```

---

### 第四步：改造现有组件 (1 小时)

#### 1. 改造 TemplateBrowser
```javascript
// frontend/src/components/TemplateBrowser.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getPublicTemplates, getTemplateById } from '../services/templates';

const TemplateBrowser = () => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cellContents, setCellContents] = useState({});
  const editorRef = useRef(null);

  // 加载模板列表
  useEffect(() => {
    loadTemplates();
    
    // 订阅实时更新
    const subscription = supabase
      .channel('templates-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'templates'
        },
        () => {
          console.log('模板数据发生变化，重新加载...');
          loadTemplates();
        }
      )
      .subscribe();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await getPublicTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('加载模板失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = async (template) => {
    try {
      const fullTemplate = await getTemplateById(template.id);
      setSelectedTemplate(fullTemplate);
      
      // 初始化格子内容
      const initialContents = {};
      fullTemplate.cells.forEach(cell => {
        const cellKey = `${cell.day}-${cell.index}`;
        initialContents[cellKey] = '';
      });
      setCellContents(initialContents);
    } catch (error) {
      console.error('加载模板详情失败:', error);
    }
  };

  // ... 其他代码保持不变 ...
};
```

#### 2. 添加登录组件
```javascript
// frontend/src/components/Login.js
import React, { useState } from 'react';
import { signIn, signUp } from '../services/auth';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';

const Login = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      onLoginSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md p-8">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isLogin ? '登录' : '注册'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">邮箱</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">密码</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <Button 
            type="submit" 
            disabled={loading}
            className="w-full"
          >
            {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-600 hover:underline"
          >
            {isLogin ? '没有账号？去注册' : '已有账号？去登录'}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Login;
```

#### 3. 在主应用中集成认证
```javascript
// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { getCurrentUser, onAuthStateChange } from './services/auth';
import Login from './components/Login';
import TemplateBrowser from './components/TemplateBrowser';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查当前用户
    getCurrentUser().then(setUser);
    setLoading(false);

    // 监听认证状态
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="h-screen flex items-center justify-center">加载中...</div>;
  }

  if (!user) {
    return <Login onLoginSuccess={() => {}} />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<div>首页</div>} />
        <Route path="/browser" element={<TemplateBrowser />} />
        {/* 其他路由 */}
      </Routes>
    </Router>
  );
}

export default App;
```

---

### 第五步：实时功能演示 (可选)

#### 实时协作编辑
```javascript
// 当多个用户同时编辑时，实时同步
useEffect(() => {
  const channel = supabase.channel(`template:${selectedTemplate?.id}`);
  
  const subscription = channel
    .on(
      'broadcast',
      { event: 'cell_update' },
      ({ payload }) => {
        // 接收其他人的更新
        setCellContents(prev => ({
          ...prev,
          [payload.cellKey]: payload.value
        }));
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, [selectedTemplate]);

const handleCellChange = async (cellKey, value) => {
  // 更新本地状态
  setCellContents(prev => ({
    ...prev,
    [cellKey]: value
  }));

  // 广播给其他人
  await supabase.channel(`template:${selectedTemplate.id}`)
    .send({
      type: 'broadcast',
      event: 'cell_update',
      payload: { cellKey, value }
    });
};
```

---

## 🎨 完整架构图

```
┌─────────────────────────────────────────────┐
│           前端 (React)                      │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Template │  │  Login   │  │  Editor  │ │
│  │ Browser  │  │ Component│  │Component │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
│       │             │              │        │
│       └─────────────┴──────────────┘        │
│                     │                       │
│           Supabase JS SDK                   │
└─────────────────────┼───────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────┐
│         Supabase Cloud                      │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  PostgreSQL Database                 │  │
│  │  ├─ templates                        │  │
│  │  ├─ template_cells                   │  │
│  │  └─ export_logs                      │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  Authentication (Auth)               │  │
│  │  - Email/Password                    │  │
│  │  - OAuth (Google, GitHub...)         │  │
│  │  - JWT Tokens                        │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  Storage (图片存储)                  │  │
│  │  - template-images bucket            │  │
│  │  - CDN 加速                          │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │  Realtime (WebSocket)                │  │
│  │  - 实时订阅数据库变化                │  │
│  │  - 协同编辑支持                      │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## 💰 成本对比

| 项目 | Sequelize 方案 | Supabase 方案 |
|------|---------------|--------------|
| 服务器 | ¥100-300/月 | ¥0 (免费) ✅ |
| 数据库 | 自行维护 | 托管 ✅ |
| 认证系统 | 开发时间成本 | 免费 ✅ |
| 文件存储 | 自行解决 | 1GB 免费 ✅ |
| 域名 SSL | ¥50-100/月 | 免费提供 ✅ |
| **总计** | **¥150-400/月** | **¥0** 🎉 |

---

## 🚀 快速开始

### 1. 创建 Supabase 项目
```bash
# 访问 https://supabase.com
# 点击 "New Project"
# 填写项目信息
```

### 2. 安装依赖
```bash
cd frontend
npm install @supabase/supabase-js
```

### 3. 配置环境变量
```bash
# frontend/.env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

### 4. 运行 SQL 脚本
在 Supabase Dashboard → SQL Editor 中执行上面的 SQL

### 5. 启动项目
```bash
npm start
```

---

## 📊 性能对比

| 操作 | 文件系统 | Sequelize | Supabase |
|------|---------|-----------|----------|
| 查询模板 | ~500ms | ~50ms | ~30ms ✅ |
| 并发支持 | ❌ | ✅ | ✅ |
| 实时同步 | ❌ | ❌ | ✅ |
| 全球访问 | ❌ | 需 CDN | ✅ 自带 CDN |
| 自动备份 | ❌ | 需配置 | ✅ 自动 |

---

## 🎯 总结

### Supabase 核心优势

1. **零运维** - 无需管理服务器
2. **免费起步** - 个人项目完全免费
3. **开发极快** - 自动生成 API
4. **实时功能** - WebSocket 内置
5. **安全可靠** - 行级权限控制
6. **生态完善** - 认证/存储/数据库一体化

### 适合场景

✅ 个人项目/创业公司  
✅ 快速原型开发  
✅ 需要实时协作的应用  
✅ 预算有限的项目  

### 何时不使用

❌ 数据敏感不能上云  
❌ 需要完全控制数据库  
❌ 超大规模应用 (日活百万+)  

---

**强烈推荐**: 对于您的课表项目，Supabase 是最佳选择！🎉

立即开始：https://supabase.com
