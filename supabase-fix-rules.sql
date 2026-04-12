-- ============================================
-- Supabase 安全策略修复脚本
-- 允许服务角色密钥进行数据操作
-- ============================================

-- 1. 修改 templates 表策略，允许服务角色操作
DROP POLICY IF EXISTS "Users can insert their own templates" ON templates;
CREATE POLICY "Users can insert their own templates"
  ON templates FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "Users can update their own templates" ON templates;
CREATE POLICY "Users can update their own templates"
  ON templates FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "Users can delete their own templates" ON templates;
CREATE POLICY "Users can delete their own templates"
  ON templates FOR DELETE
  USING (
    auth.uid() = user_id 
    OR auth.role() = 'service_role'
  );

-- 2. 修改 template_cells 表策略，允许服务角色操作
DROP POLICY IF EXISTS "Cells follow template permissions" ON template_cells;
CREATE POLICY "Cells follow template permissions"
  ON template_cells FOR ALL
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM templates
      WHERE templates.id = template_cells.template_id
      AND (templates.is_public = TRUE OR auth.uid() = templates.user_id)
    )
  );

-- 3. 修改导出日志表策略，允许服务角色操作
DROP POLICY IF EXISTS "Users can insert their own export logs" ON export_logs;
CREATE POLICY "Users can insert their own export logs"
  ON export_logs FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    OR auth.role() = 'service_role'
  );

-- ============================================
-- 说明：
-- 在 Supabase Dashboard → SQL Editor 中执行此脚本
-- ============================================
