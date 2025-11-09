const DOMAIN = 'ha_map_replacer';
const DEFAULT_CONFIG = {
    proxy_url: 'http://localhost:8280',
    max_zoom: 18,
    tile_size: 256
};

let CONFIG = { ...DEFAULT_CONFIG };
let configLoaded = false;
const existsCoordSet = new Set();

// 配置验证
function validateConfig(config) {
    if (!config.proxy_url || !config.proxy_url.startsWith('http')) {
        throw new Error('代理URL格式无效');
    }
    if (config.max_zoom && (config.max_zoom < 1 || config.max_zoom > 20)) {
        throw new Error('最大缩放级别应在1-20之间');
    }
    if (config.tile_size && (config.tile_size < 64 || config.tile_size > 1024)) {
        throw new Error('瓦片大小应在64-1024之间');
    }
    return config;
}

// URL 参数配置
function getConfigFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const config = {};
    const proxyUrl = urlParams.get('amap_proxy');
    if (proxyUrl) config.proxy_url = proxyUrl;
    const maxZoom = urlParams.get('amap_max_zoom');
    if (maxZoom && !isNaN(maxZoom)) config.max_zoom = parseInt(maxZoom);
    const tileSize = urlParams.get('amap_tile_size');
    if (tileSize && !isNaN(tileSize)) config.tile_size = parseInt(tileSize);
    return config;
}

// 加载配置（带缓存）
async function loadConfig() {
    if (configLoaded) return;
    try {
        const response = await fetch('/hacsfiles/ha-map-replacer/config.json');
        if (!response.ok) throw new Error('配置文件加载失败');
        const externalConfig = await response.json();
        CONFIG = validateConfig({
            ...DEFAULT_CONFIG,
            ...externalConfig,
            ...getConfigFromUrl()
        });
        console.log(`[${DOMAIN}] 配置加载成功:`, CONFIG);
    } catch (error) {
        CONFIG = validateConfig({
            ...DEFAULT_CONFIG,
            ...getConfigFromUrl()
        });
        console.warn(`[${DOMAIN}] 配置加载失败，使用默认值:`, error);
    } finally {
        configLoaded = true;
    }
}

// 替换 URL
function generateAmapUrl(x, y, z) {
    return `${CONFIG.proxy_url}/amap/${z}/${x}/${y}.jpg`;
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

// 替换 Carto 瓦片
function transformCartoImg(img) {
    if (!img || !img.src || !img.tagName) return;

    const src = img.src;
    if (!src.startsWith('https://basemaps.cartocdn.com/')) return;

    const match = src.match(/rastertiles\/voyager\/(\d+)\/(\d+)\/(\d+)(?:@2x)?\.png/);
    if (!match) return;

    let [_, zStr, xStr, yStr] = match;
    let z = parseInt(zStr), x = parseInt(xStr), y = parseInt(yStr);

    if (z <= CONFIG.max_zoom) {
        img.src = generateAmapUrl(x, y, z);
        console.log(`[${DOMAIN}] 替换瓦片:`, src, '→', img.src);
        return;
    }

    const { srcX, srcY, srcZ, scale, dx, dy } = downgradeTile(x, y, z);
    const downgradeKey = `${srcX},${srcY},${srcZ},${z}`;
    if (existsCoordSet.has(downgradeKey)) {
        img.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
        img.style.display = "none";
        return;
    }

    img["downgradeKey"] = downgradeKey;
    existsCoordSet.add(downgradeKey);
    img.src = generateAmapUrl(srcX, srcY, srcZ);

    if (img.style.transform?.includes('translate3d(')) {
        const match = img.style.transform.match(/translate3d\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
        if (match) {
            const [_, tx, ty] = match;
            const newTx = parseFloat(tx) + dx;
            const newTy = parseFloat(ty) + dy;
            img.style.transform = img.style.transform.replace(/translate3d\([^)]+\)/, `translate3d(${newTx}px, ${newTy}px, 0px)`);
        }
    }

    if (!img.style.transform.includes('scale(')) {
        img.style.transform = (img.style.transform || '') + ` scale(${scale})`;
    }

    img.style.width = CONFIG.tile_size + 'px';
    img.style.height = CONFIG.tile_size + 'px';
    img.style.transformOrigin = 'top left';

    console.log(`[${DOMAIN}] 降级瓦片:`, `${z} → ${CONFIG.max_zoom}, src:`, img.src);
}

// DOM 监听逻辑
function handleAddedNode(node) {
    if (!(node instanceof Element)) return;
    if (node.tagName === 'DIV' && node.classList.contains('leaflet-layer')) {
        const _appendChild = Element.prototype.appendChild;
        node.appendChild = function (child) {
            if (child.tagName === 'DIV' && child.classList.contains('leaflet-tile-container')) {
                Array.from(child.querySelectorAll('img')).forEach(img => transformCartoImg(img));
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
    if (node.tagName === 'IMG' && node["downgradeKey"]) {
        existsCoordSet.delete(node["downgradeKey"]);
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

// 非阻塞初始化 + 全局图片拦截
function initDomObserver() {
    console.log(`[${DOMAIN}] 启动DOM观察器...`);

    document.querySelectorAll('img').forEach(transformCartoImg);

    observer.observe(document, { childList: true, subtree: true });
    observeShadowRoots(document.body);

    loadConfig().then(() => {
        console.log(`[${DOMAIN}] 配置加载完成`);
    }).catch(error => {
        console.warn(`[${DOMAIN}] 配置加载失败:`, error);
    });

    const originalAttachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (init) {
        const shadow = originalAttachShadow.call(this, init);
        observer.observe(shadow, { childList: true, subtree: true });
        return shadow;
    };
}

// 启动插件
initDomObserver();

