-- ============================================
-- Supabase 数据库初始化脚本
-- 课表模板编辑系统
-- ============================================

-- 1. 创建模板表
CREATE TABLE IF NOT EXISTS templates (
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
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_is_public ON templates(is_public);

-- 启用 Row Level Security (RLS)
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- 创建策略：公开模板所有人可见
DROP POLICY IF EXISTS "Public templates are viewable by everyone" ON templates;
CREATE POLICY "Public templates are viewable by everyone"
  ON templates FOR SELECT
  USING (is_public = TRUE);

-- 创建策略：用户只能操作自己的模板
DROP POLICY IF EXISTS "Users can insert their own templates" ON templates;
CREATE POLICY "Users can insert their own templates"
  ON templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own templates" ON templates;
CREATE POLICY "Users can update their own templates"
  ON templates FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own templates" ON templates;
CREATE POLICY "Users can delete their own templates"
  ON templates FOR DELETE
  USING (auth.uid() = user_id);


-- 2. 创建格子表
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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_cells_template_id ON template_cells(template_id);
CREATE INDEX IF NOT EXISTS idx_cells_day ON template_cells(day);

-- 启用 RLS
ALTER TABLE template_cells ENABLE ROW LEVEL SECURITY;

-- 继承模板的权限
DROP POLICY IF EXISTS "Cells follow template permissions" ON template_cells;
CREATE POLICY "Cells follow template permissions"
  ON template_cells FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM templates
      WHERE templates.id = template_cells.template_id
      AND (templates.is_public = TRUE OR auth.uid() = templates.user_id)
    )
  );


-- 3. 创建导出日志表（可选）
CREATE TABLE IF NOT EXISTS export_logs (
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
DROP POLICY IF EXISTS "Users can view their own export logs" ON export_logs;
CREATE POLICY "Users can view their own export logs"
  ON export_logs FOR SELECT
  USING (auth.uid() = user_id);

-- 用户可以插入自己的日志
DROP POLICY IF EXISTS "Users can insert their own export logs" ON export_logs;
CREATE POLICY "Users can insert their own export logs"
  ON export_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- 4. 创建存储桶 (Storage Bucket)
INSERT INTO storage.buckets (id, name, public)
VALUES ('template-images', 'template-images', true)
ON CONFLICT (id) DO NOTHING;

-- 设置存储策略
DROP POLICY IF EXISTS "Public images are viewable by everyone" ON storage.objects;
CREATE POLICY "Public images are viewable by everyone"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'template-images');

DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'template-images' 
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
CREATE POLICY "Users can update their own images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'template-images'
    AND auth.uid()::text = (metadata->>'user_id')::text
  );


-- 5. 添加触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- 说明：
-- 1. 在 Supabase Dashboard → SQL Editor 中执行此脚本
-- 2. 所有策略使用 DROP POLICY IF EXISTS 确保可重复执行
-- 3. 存储桶使用 ON CONFLICT DO NOTHING 避免重复创建
-- 4. 如需重置，可以删除表后重新执行
-- ============================================
