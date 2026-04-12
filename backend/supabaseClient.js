// ============================================
// Supabase 客户端配置
// 课表模板编辑系统 - 后端
// ============================================

const { createClient } = require('@supabase/supabase-js');

// 从环境变量获取配置
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const enableSync = process.env.ENABLE_SUPABASE_SYNC === 'true';

let supabase = null;

// 初始化 Supabase 客户端
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase 客户端已初始化');
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   自动同步: ${enableSync ? '开启' : '关闭'}`);
} else {
  console.warn('⚠️  Supabase 未配置，将仅使用本地文件存储');
  console.warn('   请在 .env 文件中设置 SUPABASE_URL 和 SUPABASE_ANON_KEY');
}

/**
 * 检查 Supabase 是否可用
 */
function isSupabaseAvailable() {
  return supabase !== null;
}

/**
 * 检查是否启用自动同步
 */
function isSyncEnabled() {
  return enableSync && isSupabaseAvailable();
}

/**
 * 同步模板到 Supabase
 * @param {Object} templateData - 模板数据
 * @returns {Promise<Object|null>} Supabase 记录或 null
 */
async function syncTemplateToSupabase(templateData) {
  if (!isSupabaseAvailable()) {
    console.warn('Supabase 不可用，跳过同步');
    return null;
  }

  try {
    // 插入或更新模板元数据
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .upsert({
        id: templateData.templateId,
        name: templateData.name,
        image_url: templateData.image,
        cells_count: templateData.cells?.length || 0,
        is_public: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select()
      .single();

    if (templateError) {
      console.error('同步模板元数据失败:', templateError);
      throw templateError;
    }

    // 删除旧的格子数据
    if (templateData.cells && templateData.cells.length > 0) {
      await supabase
        .from('template_cells')
        .delete()
        .eq('template_id', templateData.templateId);

      // 插入新的格子数据
      const cells = templateData.cells.map(cell => ({
        template_id: templateData.templateId,
        day: cell.day,
        index: cell.index,
        x: cell.x,
        y: cell.y,
        width: cell.width,
        height: cell.height,
        font_size: cell.fontSize || 14,
        color: cell.color || '#000000',
        font_family: cell.fontFamily || 'Arial'
      }));

      const { error: cellsError } = await supabase
        .from('template_cells')
        .insert(cells);

      if (cellsError) {
        console.error('同步格子数据失败:', cellsError);
        throw cellsError;
      }
    }

    console.log(`✅ 模板 #${templateData.templateId} 已同步到 Supabase`);
    return template;
  } catch (error) {
    console.error('同步到 Supabase 失败:', error);
    return null;
  }
}

/**
 * 从 Supabase 获取所有公开模板
 * @returns {Promise<Array>} 模板列表
 */
async function getTemplatesFromSupabase() {
  if (!isSupabaseAvailable()) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('从 Supabase 获取模板列表失败:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('从 Supabase 获取模板列表异常:', error);
    return [];
  }
}

/**
 * 从 Supabase 获取单个模板详情
 * @param {number} templateId - 模板 ID
 * @returns {Promise<Object|null>} 模板详情
 */
async function getTemplateFromSupabase(templateId) {
  if (!isSupabaseAvailable()) {
    return null;
  }

  try {
    // 获取模板元数据
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError) {
      console.error(`从 Supabase 获取模板 #${templateId} 失败:`, templateError);
      return null;
    }

    // 获取格子数据
    const { data: cells, error: cellsError } = await supabase
      .from('template_cells')
      .select('*')
      .eq('template_id', templateId)
      .order('day')
      .order('index');

    if (cellsError) {
      console.error(`从 Supabase 获取模板 #${templateId} 的格子数据失败:`, cellsError);
      return null;
    }

    // 转换为前端格式
    return {
      templateId: template.id,
      name: template.name,
      image: template.image_url,
      cells: (cells || []).map(cell => ({
        day: cell.day,
        index: cell.index,
        x: parseFloat(cell.x),
        y: parseFloat(cell.y),
        width: parseFloat(cell.width),
        height: parseFloat(cell.height),
        fontSize: cell.font_size,
        color: cell.color,
        fontFamily: cell.font_family
      }))
    };
  } catch (error) {
    console.error(`从 Supabase 获取模板 #${templateId} 异常:`, error);
    return null;
  }
}

/**
 * 批量同步所有本地模板到 Supabase
 * @param {Array} templates - 模板数组
 * @returns {Promise<Object>} 同步结果统计
 */
async function syncAllTemplatesToSupabase(templates) {
  if (!isSupabaseAvailable()) {
    return { success: 0, failed: 0, total: 0 };
  }

  let successCount = 0;
  let failedCount = 0;

  for (const template of templates) {
    try {
      await syncTemplateToSupabase(template);
      successCount++;
    } catch (error) {
      console.error(`同步模板 #${template.templateId} 失败:`, error);
      failedCount++;
    }
  }

  console.log(`批量同步完成: 成功 ${successCount}, 失败 ${failedCount}`);
  return {
    success: successCount,
    failed: failedCount,
    total: templates.length
  };
}

module.exports = {
  supabase,
  isSupabaseAvailable,
  isSyncEnabled,
  syncTemplateToSupabase,
  getTemplatesFromSupabase,
  getTemplateFromSupabase,
  syncAllTemplatesToSupabase
};
