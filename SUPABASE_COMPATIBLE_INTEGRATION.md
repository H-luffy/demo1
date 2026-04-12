# Supabase 集成方案（兼容现有系统）

## 📊 项目架构升级（无感知）

### ⚠️ 重要声明

**本次升级完全向后兼容，不会影响你：**
- ✅ 继续上传新的模板图片
- ✅ 继续在图片上标记格子
- ✅ 继续保存/删除模板配置
- ✅ 现有的所有模板数据

**只是多了一个可选的云备份和跨设备同步功能！**

---

## 🎯 核心设计原则

### 1. 双轨存储架构
```
用户上传模板 → 保存到本地 uploads/ (主)
              ↓
        可选：同步到 Supabase Storage (备)
        
标记格子 → 保存到 templates-data/*.json (主)
           ↓
     可选：同步到 Supabase Database (备)
```

### 2. 读取优先级
```
查询模板列表：
1. 优先读取本地 JSON (速度快，~50ms)
2. 数据库作为备份和全文搜索使用

读取单个模板：
1. 直接读取对应 JSON 文件
2. 不依赖数据库
```

### 3. 用户控制权
- 🔓 可以选择性开启/关闭云同步
- 🔓 可以只同步部分模板
- 🔓 可以随时切换回纯本地模式

---

## 📦 实施步骤（不影响现有功能）

### 第一步：Supabase 准备（5 分钟）

#### 1. 创建项目
访问 https://supabase.com 注册并创建项目

#### 2. 执行 SQL（增加兼容性字段）

```sql
-- 模板表（增加本地路径字段）
CREATE TABLE IF NOT EXISTS templates (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50) DEFAULT 'default',
  
  -- 图片存储（支持两种方式）
  local_image_path VARCHAR(255),      -- 本地路径：/uploads/xxx.jpg
  storage_image_url VARCHAR(255),     -- Supabase Storage URL
  
  cells_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE,
  download_count INTEGER DEFAULT 0,
  sync_enabled BOOLEAN DEFAULT TRUE,   -- 是否启用云同步
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_is_public ON templates(is_public);
CREATE INDEX IF NOT EXISTS idx_templates_sync_enabled ON templates(sync_enabled);

-- RLS 策略
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public templates are viewable by everyone"
  ON templates FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own templates"
  ON templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON templates FOR DELETE
  USING (auth.uid() = user_id);


-- 格子表
CREATE TABLE IF NOT EXISTS template_cells (
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

-- 索引
CREATE INDEX IF NOT EXISTS idx_cells_template_id ON template_cells(template_id);
CREATE INDEX IF NOT EXISTS idx_cells_day ON template_cells(day);

-- RLS
ALTER TABLE template_cells ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cells follow template permissions"
  ON template_cells FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM templates
      WHERE templates.id = template_cells.template_id
      AND (templates.is_public = true OR auth.uid() = templates.user_id)
    )
  );


-- 导出日志表
CREATE TABLE IF NOT EXISTS export_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  template_id BIGINT REFERENCES templates(id) ON DELETE SET NULL,
  image_url VARCHAR(255),
  file_size BIGINT,
  exported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE export_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own export logs"
  ON export_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own export logs"
  ON export_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- 存储桶
INSERT INTO storage.buckets (id, name, public)
VALUES ('template-images', 'template-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public images are viewable by everyone"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'template-images');

CREATE POLICY "Authenticated users can upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'template-images' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users can manage their own images"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'template-images'
    AND auth.uid()::text = (metadata->>'user_id')::text
  );


-- 自动创建用户资料
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

### 第二步：前端集成（30 分钟，可选）

#### 1. 安装依赖
```bash
cd frontend
npm install @supabase/supabase-js
```

#### 2. 配置环境变量
```bash
# frontend/.env (仅当需要云同步时创建)
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_ENABLE_CLOUD_SYNC=false  # 默认关闭，不影响现有功能
```

#### 3. 创建 Supabase 客户端（可选加载）
```javascript
// frontend/src/lib/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || '';
const enableCloudSync = process.env.REACT_APP_ENABLE_CLOUD_SYNC === 'true';

// 如果未配置，返回 null，不影响现有功能
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isCloudSyncEnabled = () => enableCloudSync && supabase !== null;
```

#### 4. 创建云同步服务（完全可选）
```javascript
// frontend/src/services/cloudSync.js
import { supabase, isCloudSyncEnabled } from '../lib/supabaseClient';
import axios from 'axios';

/**
 * 同步单个模板到云端
 * 这个功能是额外的，不影响本地保存
 */
export const syncTemplateToCloud = async (templateId, templateData) => {
  if (!isCloudSyncEnabled()) {
    console.log('云同步未启用，跳过');
    return null;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('未登录');
    }

    // 检查是否已存在
    const { data: existing } = await supabase
      .from('templates')
      .select('id')
      .eq('local_image_path', `/uploads/${templateId}.json`)
      .single();

    if (existing) {
      // 更新
      await supabase.from('templates').update({
        name: templateData.name,
        cells_count: templateData.cells.length,
        updated_at: new Date().toISOString()
      }).eq('id', existing.id);

      // 更新格子
      await supabase.from('template_cells').delete().eq('template_id', existing.id);
      
      const cells = templateData.cells.map(cell => ({
        template_id: existing.id,
        day: cell.day,
        index: cell.index,
        x: cell.x,
        y: cell.y,
        width: cell.width,
        height: cell.height
      }));
      
      await supabase.from('template_cells').insert(cells);
      return existing.id;
    } else {
      // 插入新模板
      const { data: newTemplate } = await supabase
        .from('templates')
        .insert([{
          user_id: user.id,
          name: templateData.name,
          local_image_path: templateData.image,
          cells_count: templateData.cells.length,
          is_public: true,
          sync_enabled: true
        }])
        .select()
        .single();

      // 插入格子
      const cells = templateData.cells.map(cell => ({
        template_id: newTemplate.id,
        day: cell.day,
        index: cell.index,
        x: cell.x,
        y: cell.y,
        width: cell.width,
        height: cell.height
      }));
      
      await supabase.from('template_cells').insert(cells);
      return newTemplate.id;
    }
  } catch (error) {
    console.error('云同步失败:', error.message);
    return null; // 失败不影响本地保存
  }
};

/**
 * 从云端获取模板（用于跨设备）
 */
export const getTemplatesFromCloud = async () => {
  if (!isCloudSyncEnabled()) return [];

  try {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('is_public', true)
      .eq('sync_enabled', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('获取云模板失败:', error.message);
    return [];
  }
};
```

---

### 第三步：改造现有组件（向后兼容）

#### 1. 修改 TemplateManager.js（增加云同步按钮）

在保存按钮旁边增加一个"同步到云端"按钮（仅当配置了 Supabase 时显示）：

```javascript
// 在 handleSave 函数后添加
const handleSaveAndSync = async () => {
  if (!selectedTemplate) return;

  // 先本地保存
  await handleSave();

  // 然后云同步（如果启用）
  if (isCloudSyncEnabled()) {
    const cloudId = await syncTemplateToCloud(
      selectedTemplate.templateId,
      selectedTemplate
    );
    
    if (cloudId) {
      setSuccess('模板已保存并同步到云端 ☁️');
    } else {
      setSuccess('模板已保存（本地）');
    }
  }
};

// 在 render 中增加按钮
{selectedTemplate && (
  <>
    <button
      className="button button-success"
      onClick={handleSave}
      disabled={loading}
    >
      💾 保存配置
    </button>

    {isCloudSyncEnabled() && (
      <button
        className="button button-info"
        onClick={handleSaveAndSync}
        disabled={loading}
        title="保存到云端，支持跨设备访问"
      >
        ☁️ 保存并同步
      </button>
    )}
  </>
)}
```

---

### 第四步：后端保持不变（重要！）

**server.js 完全不需要修改！** 

现有的 API 继续使用：
- `POST /api/upload-template` ✅
- `POST /api/save-template` ✅
- `GET /api/templates` ✅
- `GET /api/template/:id` ✅

如果你想增加云同步 API，可以作为**额外补充**：

```javascript
// backend/routes/sync.js (新建，可选)
const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

router.post('/sync-template', async (req, res) => {
  // 同步逻辑...
});

module.exports = router;

// server.js 中引入
// const syncRoutes = require('./routes/sync');
// app.use('/api/sync', syncRoutes);
```

---

## 🎨 完整工作流程

### 场景 1：继续使用本地模式（无需任何改动）
```
1. 上传模板图片 → /api/upload-template
2. 标记格子 → 拖拽选择区域
3. 保存 → /api/save-template → templates-data/1.json
4. 完成！✅
```

### 场景 2：开启云同步（可选）
```
1. 创建 .env 文件配置 Supabase
2. 上传模板图片 → /api/upload-template
3. 标记格子 → 拖拽选择区域
4. 点击"保存并同步" → 
   ├─ 本地：templates-data/1.json ✅
   └─ 云端：Supabase Database ☁️
5. 跨设备访问！🎉
```

---

## 📊 数据对比

| 操作 | 本地模式 | 云同步模式 |
|------|---------|-----------|
| 上传图片 | ✅ 保存到 uploads/ | ✅ 同时保存到 Storage |
| 标记格子 | ✅ 保存到 JSON | ✅ 同时保存到 Database |
| 查询模板 | ✅ 读取 JSON | ✅ 可读取数据库 |
| 导出数据 | ✅ html2canvas | ✅ 同左 + 云端备份 |
| 跨设备 | ❌ | ✅ 支持 |
| 速度 | ⚡ 极快 | ⚡ 本地快，云端稍慢 |

---

## ⚠️ 重要保证

### 你的这些操作**完全不受影响**：
1. ✅ 继续上传任意数量的模板
2. ✅ 继续标记任意数量的格子
3. ✅ 继续使用所有现有功能
4. ✅ 现有数据不会丢失
5. ✅ 不需要学习新操作

### 唯一的变化（如果你选择）：
- 多了一个"保存到云端"的选项
- 多了一个跨设备访问的能力
- 多了一个数据备份的保障

---

## 🚀 快速开始

### 现在就开始（保持现有工作方式）
```bash
# 什么都不用做！
cd frontend
npm start

cd backend
npm start
```

### 未来想开启云同步时
```bash
# 1. 安装 Supabase
npm install @supabase/supabase-js

# 2. 创建 .env
echo "REACT_APP_SUPABASE_URL=..." >> frontend/.env
echo "REACT_APP_SUPABASE_ANON_KEY=..." >> frontend/.env

# 3. 重启前端
npm start
```

---

## 💡 总结

**这次集成的核心理念是：选择不打扰的自由**

- 🎯 你可以完全忽略 Supabase，系统正常工作
- 🎯 你可以随时开启云同步，获得额外能力
- 🎯 你的所有操作习惯都被完美保留
- 🎯 未来的扩展也不会影响现有功能

**这就是真正的向后兼容！** ✨
