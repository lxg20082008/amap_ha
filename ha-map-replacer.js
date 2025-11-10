const PLUGIN_PREFIX = 'ha-map-replacer'; // 插件前缀标识
const PLUGIN_DIR_NAME = 'amap_ha';       // 插件路径名
const CONFIG_FILENAME = 'config.json';
const TILE_PATH = '/amap';
const EMPTY_TILE = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";

const DEFAULT_CONFIG = {
  proxy_url: 'http://localhost:8280',
  max_zoom: 18,
  tile_size: 256
};

let CONFIG = { ...DEFAULT_CONFIG };
let configLoaded = false;
const seenTiles = new Set();

// 配置验证（改进版本）
function validateConfig(config) {
  const result = { ...config };

  console.log(`[${PLUGIN_PREFIX}] 验证配置输入:`, config);

  if (typeof result.proxy_url !== 'string' || !/^https?:\/\//.test(result.proxy_url)) {
    console.warn(`[${PLUGIN_PREFIX}] proxy_url 无效，使用默认值`);
    result.proxy_url = DEFAULT_CONFIG.proxy_url;
  }

  if (typeof result.max_zoom !== 'number' || result.max_zoom < 1 || result.max_zoom > 20) {
    console.warn(`[${PLUGIN_PREFIX}] max_zoom 超出范围，使用默认值`);
    result.max_zoom = DEFAULT_CONFIG.max_zoom;
  }

  if (typeof result.tile_size !== 'number' || result.tile_size < 64 || result.tile_size > 1024) {
    console.warn(`[${PLUGIN_PREFIX}] tile_size 超出范围，使用默认值`);
    result.tile_size = DEFAULT_CONFIG.tile_size;
  }

  console.log(`[${PLUGIN_PREFIX}] 验证后配置:`, result);
  return result;
}

// URL 参数配置
function getConfigFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const config = {};
  const proxyUrl = urlParams.get('amap_proxy');
  if (proxyUrl) {
    config.proxy_url = proxyUrl;
    console.log(`[${PLUGIN_PREFIX}] 从URL参数获取 proxy_url:`, proxyUrl);
  }
  const maxZoom = urlParams.get('amap_max_zoom');
  if (maxZoom && !isNaN(maxZoom)) {
    config.max_zoom = parseInt(maxZoom);
    console.log(`[${PLUGIN_PREFIX}] 从URL参数获取 max_zoom:`, maxZoom);
  }
  const tileSize = urlParams.get('amap_tile_size');
  if (tileSize && !isNaN(tileSize)) {
    config.tile_size = parseInt(tileSize);
    console.log(`[${PLUGIN_PREFIX}] 从URL参数获取 tile_size:`, tileSize);
  }
  return config;
}

// 加载配置（带缓存）
async function loadConfig() {
  if (configLoaded) {
    console.log(`[${PLUGIN_PREFIX}] 配置已加载，跳过`);
    return;
  }
  
  try {
    const configUrl = `/hacsfiles/${PLUGIN_DIR_NAME}/${CONFIG_FILENAME}`;
    console.log(`[${PLUGIN_PREFIX}] 尝试加载配置文件:`, configUrl);
    
    const response = await fetch(configUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    
    const externalConfig = await response.json();
    console.log(`[${PLUGIN_PREFIX}] 从配置文件读取:`, externalConfig);
    
    CONFIG = validateConfig({
      ...DEFAULT_CONFIG,
      ...externalConfig,
      ...getConfigFromUrl()
    });
    
    console.log(`[${PLUGIN_PREFIX}] ✅ 配置加载成功:`, CONFIG);
    console.log(`[${PLUGIN_PREFIX}] ✅ 最终使用的 proxy_url: ${CONFIG.proxy_url}`);
    
  } catch (error) {
    console.warn(`[${PLUGIN_PREFIX}] 配置文件加载失败:`, error);
    
    CONFIG = validateConfig({
      ...DEFAULT_CONFIG,
      ...getConfigFromUrl()
    });
    
    console.warn(`[${PLUGIN_PREFIX}] 使用回退配置:`, CONFIG);
    console.warn(`[${PLUGIN_PREFIX}] 回退 proxy_url: ${CONFIG.proxy_url}`);
  } finally {
    configLoaded = true;
  }
}

// 替换 URL
function generateAmapUrl(x, y, z) {
  const url = `${CONFIG.proxy_url}${TILE_PATH}/${z}/${x}/${y}.jpg`;
  console.log(`[${PLUGIN_PREFIX}] 生成瓦片URL: ${url} (x:${x}, y:${y}, z:${z})`);
  return url;
}

// 降级算法
function downgradeTile(x, y, z, maxZoom = CONFIG.max_zoom) {
  if (z <= maxZoom) {
    return { srcX: x, srcY: y, srcZ: z, scale: 1, dx: 0, dy: 0 };
  }
  const scale = 2 ** (z - maxZoom);
  const srcX = Math.floor(x / scale);
  const srcY = Math.floor(y / scale);
  const srcZ = maxZoom;
  const offsetX = (x % scale) * CONFIG.tile_size / scale;
  const offsetY = (y % scale) * CONFIG.tile_size / scale;
  return {
    srcX, srcY, srcZ, scale,
    dx: -offsetX * scale, dy: -offsetY * scale
  };
}

// 替换 Carto 瓦片（添加调试信息）
function transformCartoImg(img) {
  if (!img || !img.src || !img.tagName) return;
  
  console.log(`[${PLUGIN_PREFIX}] 检查图像:`, img.src);

  const VOYAGER_PATTERN = /rastertiles\/voyager\/(\d+)\/(\d+)\/(\d+)(?:@2x)?\.png/;
  const match = img.src.match(VOYAGER_PATTERN);
  
  if (!match) {
    console.log(`[${PLUGIN_PREFIX}] 图像不匹配模式，跳过`);
    return;
  }

  const [_, zStr, xStr, yStr] = match;
  const z = parseInt(zStr), x = parseInt(xStr), y = parseInt(yStr);

  console.log(`[${PLUGIN_PREFIX}] 解析瓦片坐标: x=${x}, y=${y}, z=${z}, max_zoom=${CONFIG.max_zoom}`);

  if (z <= CONFIG.max_zoom) {
    const newUrl = generateAmapUrl(x, y, z);
    img.src = newUrl;
    console.log(`[${PLUGIN_PREFIX}] ✅ 直接替换瓦片: ${img.src} → ${newUrl}`);
    return;
  }

  const { srcX, srcY, srcZ, scale, dx, dy } = downgradeTile(x, y, z);
  const downgradeKey = `${srcX},${srcY},${srcZ},${z}`;
  
  console.log(`[${PLUGIN_PREFIX}] 降级计算: ${z}→${srcZ}, 坐标: (${x},${y})→(${srcX},${srcY}), 缩放: ${scale}倍`);
  
  if (seenTiles.has(downgradeKey)) {
    img.src = EMPTY_TILE;
    img.style.display = "none";
    console.log(`[${PLUGIN_PREFIX}] ⚠️ 重复降级瓦片，使用空图: ${downgradeKey}`);
    return;
  }

  img["downgradeKey"] = downgradeKey;
  seenTiles.add(downgradeKey);
  const newUrl = generateAmapUrl(srcX, srcY, srcZ);
  img.src = newUrl;

  const TRANSLATE_PATTERN = /translate3d\(([^,]+),\s*([^,]+),\s*([^)]+)\)/;
  if (img.style.transform?.includes('translate3d(')) {
    const match = img.style.transform.match(TRANSLATE_PATTERN);
    if (match) {
      const [_, tx, ty] = match;
      const newTx = parseFloat(tx) + dx;
      const newTy = parseFloat(ty) + dy;
      img.style.transform = img.style.transform.replace(/translate3d\([^)]+\)/, `translate3d(${newTx}px, ${newTy}px, 0px)`);
      console.log(`[${PLUGIN_PREFIX}] 调整位置: (${tx},${ty})→(${newTx},${newTy})`);
    }
  }

  if (!img.style.transform.includes('scale(')) {
    img.style.transform = (img.style.transform || '') + ` scale(${scale})`;
    console.log(`[${PLUGIN_PREFIX}] 添加缩放: ${scale}倍`);
  }

  img.style.width = CONFIG.tile_size + 'px';
  img.style.height = CONFIG.tile_size + 'px';
  img.style.transformOrigin = 'top left';

  console.log(`[${PLUGIN_PREFIX}] ✅ 降级瓦片完成: ${z} → ${CONFIG.max_zoom}, 最终URL: ${newUrl}`);
}

// DOM 监听逻辑
function handleAddedNode(node) {
  if (!(node instanceof Element)) return;

  if (node.tagName === 'DIV' && node.classList.contains('leaflet-layer')) {
    console.log(`[${PLUGIN_PREFIX}] 发现 leaflet-layer`);
    const _appendChild = Element.prototype.appendChild;
    node.appendChild = function (child) {
      if (child.tagName === 'DIV' && child.classList.contains('leaflet-tile-container')) {
        console.log(`[${PLUGIN_PREFIX}] 发现 leaflet-tile-container`);
        Array.from(child.querySelectorAll('img')).forEach(transformCartoImg);
        child.appendChild = function (frags) {
          if (frags.children) {
            Array.from(frags.children).forEach(img => {
              if (img.tagName === 'IMG') transformCartoImg(img);
            });
          }
          return _appendChild.call(this, frags);
        };
      }
      return _appendChild.call(this, child);
    };
  }
}

function handleRemovedNode(node) {
  if (node.tagName === 'IMG' && node.downgradeKey) {
    seenTiles.delete(node.downgradeKey);
    console.log(`[${PLUGIN_PREFIX}] 移除瓦片:`, node.downgradeKey);
  }
}

function observeShadowRoots(root) {
  const queue = [root];
  while (queue.length > 0) {
    const el = queue.shift();
    if (el.shadowRoot) {
      observer.observe(el.shadowRoot, { childList: true, subtree: true });
      queue.push(...el.shadowRoot.querySelectorAll('*'));
    }
    if (el.children) queue.push(...el.children);
  }
}

const observer = new MutationObserver(mutations => {
  for (const mutation of mutations) {
    mutation.addedNodes.forEach(handleAddedNode);
    mutation.removedNodes.forEach(handleRemovedNode);
  }
});

// 初始化插件（确保配置加载后再启动观察器）
function initDomObserver() {
  console.log(`[${PLUGIN_PREFIX}] 🚀 启动DOM观察器...`);

  loadConfig().then(() => {
    console.log(`[${PLUGIN_PREFIX}] ✅ 配置加载完成，开始初始扫描`);
    console.log(`[${PLUGIN_PREFIX}] 🔧 当前配置:`, CONFIG);
    
    const images = document.querySelectorAll('img');
    console.log(`[${PLUGIN_PREFIX}] 发现 ${images.length} 个图像元素`);
    
    images.forEach(transformCartoImg);
    observer.observe(document, { childList: true, subtree: true });
    observeShadowRoots(document.body);

    const originalAttachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (init) {
      const shadow = originalAttachShadow.call(this, init);
      observer.observe(shadow, { childList: true, subtree: true });
      return shadow;
    };
    
    console.log(`[${PLUGIN_PREFIX}] ✅ DOM观察器启动完成`);
  }).catch(error => {
    console.warn(`[${PLUGIN_PREFIX}] ❌ 配置加载失败:`, error);
  });
}

// 启动插件
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDomObserver);
} else {
  initDomObserver();
}

// 添加全局调试函数
window.debugMapReplacer = function() {
  console.log(`[${PLUGIN_PREFIX}] 🔍 调试信息:`);
  console.log(`- 配置加载状态: ${configLoaded}`);
  console.log(`- 当前配置:`, CONFIG);
  console.log(`- 已处理瓦片数量: ${seenTiles.size}`);
  console.log(`- 已处理瓦片列表:`, Array.from(seenTiles));
};
