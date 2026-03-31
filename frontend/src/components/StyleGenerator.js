import React, { useState } from 'react';
import axios from 'axios';
import { Upload, Wand2, Download, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

const presetStyles = [
  '🌸 日系手账风 - 柔和马卡龙色系，和纸纹理，可爱贴纸装饰，清新治愈',
  '🚀 科技未来风 - 赛博朋克霓虹，全息投影效果，电路板纹理，数字仪表盘感',
  '🎨 卡通插画风 - 明亮活泼配色，圆润可爱图标，Q版元素，童趣十足',
  '✨ 极简主义风 - 大量留白，清爽莫兰迪色，线条简洁，高级感十足',
  '🎞️ 复古海报风 - 低饱和复古色，胶片颗粒质感，粗犷边框，怀旧氛围',
  '🎮 像素游戏风 - 8-bit像素艺术，复古游戏配色，方块边框，怀旧游戏感',
  '🌊 国潮水墨风 - 水墨晕染效果，传统纹样，书法字体，东方美学',
  '🌈 梦幻渐变风 - 流动渐变色彩，光晕效果，梦幻氛围，时尚前卫'
];

const MAX_UPLOAD_EDGE = 2048;
const UPSCALE_FACTOR = 2;
const TEXT_MASK_LUMA_THRESHOLD = 205;
const TEXT_MASK_STRONG_LUMA_THRESHOLD = 165;
const TEXT_MASK_SATURATION_THRESHOLD = 110;

function renderAnalysisList(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return 'AI 会根据你的描述自动补充。';
  }

  return items.join('、');
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('图片加载失败'));
    image.src = src;
  });
}

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
  const binary = window.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);

  for (let index = 0; index < len; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

async function upscaleImageFile(file) {
  const fileUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(fileUrl);
    const longestEdge = Math.max(image.width, image.height);
    const scale = Math.min(UPSCALE_FACTOR, MAX_UPLOAD_EDGE / longestEdge);

    if (scale <= 1) {
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);

    const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    // 应用锐化处理
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    sharpenImage(imageData);
    context.putImageData(imageData, 0, 0);

    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const blob = dataUrlToBlob(dataUrl);
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}-upscaled.png`, {
      type: 'image/png'
    });
  } finally {
    URL.revokeObjectURL(fileUrl);
  }
}

// 锐化函数
function sharpenImage(imageData) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  // 锐化卷积核
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0
  ];

  const copy = new Uint8ClampedArray(data);

  // 应用锐化
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += copy[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
          }
        }
        const idx = (y * width + x) * 4 + c;
        data[idx] = Math.min(255, Math.max(0, sum));
      }
    }
  }
}

async function enhanceStyledImage(styledImageUrl, originalFile) {
  const styledImage = await loadImage(styledImageUrl);
  const originalUrl = URL.createObjectURL(originalFile);

  try {
    const originalImage = await loadImage(originalUrl);
    const width = styledImage.width;
    const height = styledImage.height;

    const styledCanvas = document.createElement('canvas');
    styledCanvas.width = width;
    styledCanvas.height = height;
    const styledContext = styledCanvas.getContext('2d', { willReadFrequently: true });
    styledContext.drawImage(styledImage, 0, 0, width, height);

    const originalCanvas = document.createElement('canvas');
    originalCanvas.width = width;
    originalCanvas.height = height;
    const originalContext = originalCanvas.getContext('2d', { willReadFrequently: true });
    originalContext.drawImage(originalImage, 0, 0, width, height);

    const styledData = styledContext.getImageData(0, 0, width, height);
    const originalData = originalContext.getImageData(0, 0, width, height);
    const styledPixels = styledData.data;
    const originalPixels = originalData.data;

    const getNeighborLuminanceDelta = (pixels, pixelIndex, x, y) => {
      const currentRed = pixels[pixelIndex];
      const currentGreen = pixels[pixelIndex + 1];
      const currentBlue = pixels[pixelIndex + 2];
      const currentLuminance = 0.299 * currentRed + 0.587 * currentGreen + 0.114 * currentBlue;
      let maxDelta = 0;

      const neighbors = [
        x > 0 ? pixelIndex - 4 : -1,
        x < width - 1 ? pixelIndex + 4 : -1,
        y > 0 ? pixelIndex - width * 4 : -1,
        y < height - 1 ? pixelIndex + width * 4 : -1
      ];

      neighbors.forEach((neighborIndex) => {
        if (neighborIndex < 0) {
          return;
        }

        const neighborRed = pixels[neighborIndex];
        const neighborGreen = pixels[neighborIndex + 1];
        const neighborBlue = pixels[neighborIndex + 2];
        const neighborLuminance = 0.299 * neighborRed + 0.587 * neighborGreen + 0.114 * neighborBlue;
        maxDelta = Math.max(maxDelta, Math.abs(currentLuminance - neighborLuminance));
      });

      return maxDelta;
    };

    // 更强的文字检测和恢复
    for (let index = 0; index < originalPixels.length; index += 4) {
      const pixelNumber = index / 4;
      const x = pixelNumber % width;
      const y = Math.floor(pixelNumber / width);
      const red = originalPixels[index];
      const green = originalPixels[index + 1];
      const blue = originalPixels[index + 2];
      const alpha = originalPixels[index + 3];

      if (alpha === 0) {
        continue;
      }

      const luminance = 0.299 * red + 0.587 * green + 0.114 * blue;
      const max = Math.max(red, green, blue);
      const min = Math.min(red, green, blue);
      const saturation = max - min;
      const darkness = 255 - luminance;
      const neighborDelta = getNeighborLuminanceDelta(originalPixels, index, x, y);

      // 更强的文字检测条件
      const isTextInk =
        luminance < TEXT_MASK_LUMA_THRESHOLD &&
        (saturation < TEXT_MASK_SATURATION_THRESHOLD || neighborDelta > 20);

      if (!isTextInk) {
        continue;
      }

      // 更强的混合比例
      const isStrongInk = luminance < TEXT_MASK_STRONG_LUMA_THRESHOLD || neighborDelta > 35;
      const blend = isStrongInk
        ? 1
        : Math.min(0.98, Math.max(0.8, darkness / 100));

      styledPixels[index] = Math.round(styledPixels[index] * (1 - blend) + red * blend);
      styledPixels[index + 1] = Math.round(styledPixels[index + 1] * (1 - blend) + green * blend);
      styledPixels[index + 2] = Math.round(styledPixels[index + 2] * (1 - blend) + blue * blend);
      styledPixels[index + 3] = 255;
    }

    // 应用锐化处理
    sharpenImage(styledData);
    styledContext.putImageData(styledData, 0, 0);

    return styledCanvas.toDataURL('image/png', 1.0);
  } finally {
    URL.revokeObjectURL(originalUrl);
  }
}

const StyleGenerator = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [stylePrompt, setStylePrompt] = useState(presetStyles[1]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [preserveTextClarity, setPreserveTextClarity] = useState(true);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  };

  const handleGenerate = async () => {
    if (!selectedFile) {
      setError('请先上传一张课表图片');
      return;
    }

    if (!stylePrompt.trim()) {
      setError('请输入想要渲染的风格描述');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const uploadFile = preserveTextClarity
        ? await upscaleImageFile(selectedFile)
        : selectedFile;

      const formData = new FormData();
      formData.append('image', uploadFile);
      formData.append('style', stylePrompt.trim());
      formData.append('optimizeForReadability', String(preserveTextClarity));

      const response = await axios.post('/api/generate-style', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      let processedImage = response.data.styledImage;
      if (preserveTextClarity) {
        processedImage = await enhanceStyledImage(processedImage, selectedFile);
      }

      setResult({
        ...response.data,
        enhancedImage: processedImage
      });
    } catch (err) {
      console.error('生成失败:', err);
      setError(err.response?.data?.error || err.message || '生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!result?.enhancedImage && !result?.styledImage) {
      return;
    }

    const link = document.createElement('a');
    link.href = result.enhancedImage || result.styledImage;
    link.download = `styled-schedule-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const applyPresetStyle = (preset) => {
    setStylePrompt(preset);
    setError(null);
  };

  return (
    <div className="style-generator">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">课表风格生成器</h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">上传课表图片</label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-all">
              <input
                type="file"
                id="image-upload"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center">
                <Upload className="w-12 h-12 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600 mb-1">点击或拖拽上传课表图片</span>
                <span className="text-xs text-gray-500">支持 JPG、PNG 等常见格式</span>
              </label>
            </div>
          </div>

          {previewUrl && (
            <div>
              <label className="block text-sm font-medium mb-2">原始图片</label>
              <img src={previewUrl} alt="课表预览" className="max-w-full h-auto rounded-lg border" />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">风格描述</label>
            <textarea
              value={stylePrompt}
              onChange={(event) => setStylePrompt(event.target.value)}
              rows={6}
              className="w-full p-3 border rounded-lg resize-y"
              placeholder="例如：科技感、蓝青色霓虹、高对比。背景深黑，表格边框和装饰线条像数字仪表盘一样发光，整体有未来科技面板感，但课表文字必须清晰、工整、可直接阅读。"
            />
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-1">💡 使用小贴士：</p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 描述越具体，效果越精准（如："深蓝背景"比"蓝色"更好）</li>
                <li>• 可以参考预设风格，在此基础上修改</li>
                <li>• 强调"文字清晰"可提高可读性</li>
                <li>• 添加"高对比"能确保文字在背景上清晰可见</li>
              </ul>
            </div>
          </div>

          <div className="rounded-lg border border-blue-200 p-4 bg-blue-50 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preserveTextClarity}
                onChange={(event) => setPreserveTextClarity(event.target.checked)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium text-gray-900">✨ 文字清晰增强</span>
                <span className="block text-sm text-gray-600">
                  智能优化文字清晰度，增强对比度，确保文字在任何背景下都清晰可读。推荐开启！
                </span>
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">🎨 快捷风格</label>
            <div className="flex flex-wrap gap-2">
              {presetStyles.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyPresetStyle(preset)}
                  className="px-4 py-2 text-sm border-2 border-blue-200 rounded-full hover:border-blue-400 hover:bg-blue-50 hover:shadow-md transition-all"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={!selectedFile || isGenerating} className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3">
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                正在生成中，请稍候...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 mr-2" />
                ✨ 开始生成风格化课表
              </>
            )}
          </Button>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
                <h3 className="text-xl font-bold text-gray-900">✨ 生成结果</h3>
              </div>

              {result.analysis && (
                <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">需求拆解</p>
                    <p className="text-sm text-gray-600 mt-1">{result.analysis.summary}</p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-md bg-gray-50 p-3">
                      <p className="text-sm font-medium text-gray-900">风格关键词</p>
                      <p className="text-sm text-gray-600 mt-1">{renderAnalysisList(result.analysis.styleKeywords)}</p>
                    </div>
                    <div className="rounded-md bg-gray-50 p-3">
                      <p className="text-sm font-medium text-gray-900">色彩方案</p>
                      <p className="text-sm text-gray-600 mt-1">{renderAnalysisList(result.analysis.colorPalette)}</p>
                    </div>
                    <div className="rounded-md bg-gray-50 p-3">
                      <p className="text-sm font-medium text-gray-900">视觉效果</p>
                      <p className="text-sm text-gray-600 mt-1">{renderAnalysisList(result.analysis.lightingEffects)}</p>
                    </div>
                    <div className="rounded-md bg-gray-50 p-3">
                      <p className="text-sm font-medium text-gray-900">构图细节</p>
                      <p className="text-sm text-gray-600 mt-1">{renderAnalysisList(result.analysis.compositionDetails)}</p>
                    </div>
                  </div>

                  <div className="rounded-md bg-slate-950 p-3">
                    <p className="text-sm font-medium text-cyan-200">最终 Prompt</p>
                    <p className="text-sm text-slate-200 mt-2 leading-6 break-words">{result.optimizedPrompt}</p>
                  </div>

                  <p className="text-xs text-gray-500">
                    分析来源：{result.analysisSource === 'qwen' ? 'AI 深度分析 + 本地兜底' : '本地规则兜底分析'}
                  </p>
                </div>
              )}

              <img
                src={result.enhancedImage || result.styledImage}
                alt="风格化课表"
                className="max-w-full h-auto rounded-lg border"
              />

              <p className="text-sm text-gray-500">
                {preserveTextClarity ? '当前展示的是增强后的结果图。' : '当前展示的是 AI 原始结果图。'}
              </p>

              <Button onClick={handleDownload} className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-medium py-3">
                <Download className="w-5 h-5 mr-2" />
                📥 下载高清图片
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default StyleGenerator;
