// ============================================
// Supabase 客户端配置
// 课表模板编辑系统 - 前端
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  Supabase 未配置，请在前端 .env 文件中设置 REACT_APP_SUPABASE_URL 和 REACT_APP_SUPABASE_ANON_KEY');
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * 检查 Supabase 是否可用
 */
export function isSupabaseAvailable() {
  return supabase !== null;
}

/**
 * 从 Supabase 获取所有公开模板
 */
export async function getPublicTemplates(category = null) {
  if (!supabase) {
    console.warn('Supabase 不可用');
    return [];
  }

  try {
    let query = supabase
      .from('templates')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });
    
    if (category) {
      query = query.eq('category', category);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('获取模板列表失败:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('获取模板列表异常:', error);
    return [];
  }
}

/**
 * 从 Supabase 获取单个模板详情（包含格子数据）
 */
export async function getTemplateById(id) {
  if (!supabase) {
    console.warn('Supabase 不可用');
    return null;
  }

  try {
    // 获取模板元数据
    const { data: template, error: templateError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();
    
    if (templateError) {
      console.error(`获取模板 #${id} 失败:`, templateError);
      return null;
    }
    
    // 获取格子数据
    const { data: cells, error: cellsError } = await supabase
      .from('template_cells')
      .select('*')
      .eq('template_id', id)
      .order('day')
      .order('index');
    
    if (cellsError) {
      console.error(`获取模板 #${id} 的格子数据失败:`, cellsError);
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
    console.error(`获取模板 #${id} 异常:`, error);
    return null;
  }
}

/**
 * 上传模板图片到 Supabase Storage
 */
export async function uploadTemplateImage(file, templateId) {
  if (!supabase) {
    throw new Error('Supabase 不可用');
  }

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${templateId}-${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from('template-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('上传图片失败:', error);
      throw error;
    }
    
    // 获取公开 URL
    const { data: { publicUrl } } = supabase.storage
      .from('template-images')
      .getPublicUrl(fileName);
    
    return publicUrl;
  } catch (error) {
    console.error('上传图片异常:', error);
    throw error;
  }
}

/**
 * 订阅模板实时更新
 */
export function subscribeToTemplates(callback) {
  if (!supabase) {
    console.warn('Supabase 不可用，无法订阅实时更新');
    return null;
  }

  try {
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
  } catch (error) {
    console.error('订阅实时更新失败:', error);
    return null;
  }
}
