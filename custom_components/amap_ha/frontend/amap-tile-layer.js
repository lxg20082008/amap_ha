// 配置常量 - 使用变量避免硬编码
const DOMAIN = 'amap_ha';
const CONF_PROXY_URL = 'proxy_url';
const DEFAULT_PROXY_URL = 'http://localhost:8280';
const MAX_Z = 18;
const TILE_SIZE = 256;
const AMAP_TILE_PATH = '/amap';

// 降级算法（从天地图复制）
function downgradeTile(x, y, z, maxZoom) {
    if (z <= maxZoom) {
        return { srcX: x, srcY: y, srcZ: z, scale: 1, dx: 0, dy: 0 };
    }
    const scale = 2 ** (z - maxZoom);
    const srcX = Math.floor(x / scale);
    const srcY = Math.floor(y / scale);
    const srcZ = maxZoom;

    const tileSize = 256;
    const offsetX = (x % scale) * tileSize / scale;
    const offsetY = (y % scale) * tileSize / scale;
    return {
        srcX, srcY, srcZ, scale,
        dx: -offsetX * scale, dy: -offsetY * scale
    };
}

const existsCoordSet = new Set();

// 从配置加载代理URL
async function loadProxyUrl() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        
        if (config.components && config.components[DOMAIN] && config.components[DOMAIN][CONF_PROXY_URL]) {
            return config.components[DOMAIN][CONF_PROXY_URL];
        }
    } catch (error) {
        console.warn(`[${DOMAIN}] 加载配置失败，使用默认URL:`, error);
    }
    return DEFAULT_PROXY_URL;
}

function generateAmapUrl(proxyUrl, x, y, z) {
    return `${proxyUrl}${AMAP_TILE_PATH}/${z}/${x}/${y}.jpg`;
}

function transformCartoImg(img, proxyUrl) {
    const src = img.src;
    if (!src || !src.startsWith('https://basemaps.cartocdn.com/')) {
        return;
    }

    const match = src.match(/rastertiles\/voyager\/(\d+)\/(\d+)\/(\d+)(?:@2x)?\.png/);
    if (!match) return;

    let [_, zStr, xStr, yStr] = match;
    let z = parseInt(zStr);
    let x = parseInt(xStr);
    let y = parseInt(yStr);

    if (z <= MAX_Z) {
        const amapSrc = generateAmapUrl(proxyUrl, x, y, z);
        img.src = amapSrc;
        console.log(`[${DOMAIN}] 替换瓦片:`, src, '→', amapSrc);
        return;
    }

    // 降级处理
    const { srcX, srcY, srcZ, scale, dx, dy } = downgradeTile(x, y, z, MAX_Z);
    const downgradeKey = `${srcX},${srcY},${srcZ},${z}`;

    if (existsCoordSet.has(downgradeKey)) {
        img.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
        img.style.display = "none";
        return;
    }

    img["downgradeKey"] = downgradeKey;
    existsCoordSet.add(downgradeKey);

    const amapSrc = generateAmapUrl(proxyUrl, srcX, srcY, srcZ);

    // 应用变换
    if (img.style.transform && img.style.transform.includes('translate3d(')) {
        const translateMatch = img.style.transform.match(/translate3d\(([^,]+),\s*([^,]+),\s*([^)]+)\)/);
        if (translateMatch) {
            const translateX = parseFloat(translateMatch[1]);
            const translateY = parseFloat(translateMatch[2]);
            const newTranslateX = translateX + dx;
            const newTranslateY = translateY + dy;
            img.style.transform = img.style.transform.replace(/translate3d\([^)]+\)/, `translate3d(${newTranslateX}px, ${newTranslateY}px, 0px)`);
        }
    }

    if (!img.style.transform.includes('scale(')) {
        img.style.transform = (img.style.transform || '') + ` scale(${scale})`;
    }

    img.style.width = TILE_SIZE + 'px';
    img.style.height = TILE_SIZE + 'px';
    img.style.transformOrigin = 'top left';

    img.src = amapSrc;
    console.log(`[${DOMAIN}] 降级瓦片:`, `${z} → ${MAX_Z}, src:`, amapSrc);
}

async function initDomObserver() {
    const proxyUrl = await loadProxyUrl();
    console.log(`[${DOMAIN}] 启动高德地图瓦片替换，代理URL:`, proxyUrl);
    
    const _appendChild = Element.prototype.appendChild;

    function handleAddedNode(node) {
        if (!(node instanceof Element)) return;

        if (node.tagName === 'DIV' && node.classList.contains('leaflet-layer')) {
            node.appendChild = function (child) {
                if (child.tagName === 'DIV' && child.classList.contains('leaflet-tile-container')) {
                    // 立即处理现有瓦片
                    Array.from(child.querySelectorAll('img')).forEach(img => {
                        transformCartoImg(img, proxyUrl);
                    });

                    // 拦截新瓦片
                    child.appendChild = function (frags) {
                        if (frags.children) {
                            Array.from(frags.children).forEach(img => {
                                if (img.tagName === 'IMG') {
                                    transformCartoImg(img, proxyUrl);
                                }
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

    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                handleAddedNode(node);
            }
            for (const node of mutation.removedNodes) {
                handleRemovedNode(node);
            }
        }
    });

    observer.observe(document, {
        childList: true,
        subtree: true
    });

    // 处理 Shadow DOM（从天地图复制）
    function observeShadowRoots(root) {
        const queue = [root];
        while (queue.length > 0) {
            const el = queue.shift();
            if (el.shadowRoot) {
                observer.observe(el.shadowRoot, {
                    childList: true,
                    subtree: true
                });
                queue.push(...el.shadowRoot.querySelectorAll('*'));
            }
            if (el.children) {
                queue.push(...el.children);
            }
        }
    }
    observeShadowRoots(document.body);

    // 拦截 attachShadow（从天地图复制）
    const originalAttachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (init) {
        const shadow = originalAttachShadow.call(this, init);
        observer.observe(shadow, {
            childList: true,
            subtree: true
        });
        return shadow;
    };
}

// 关键：立即执行，不等待！
initDomObserver();