"""高德地图瓦片图层集成."""
import logging
import voluptuous as vol
from homeassistant.core import HomeAssistant
import homeassistant.helpers.config_validation as cv

_LOGGER = logging.getLogger(__name__)

# 集成配置常量
DOMAIN = "amap_ha"
CONF_PROXY_URL = "proxy_url"
DEFAULT_PROXY_URL = "http://localhost:8280"

CONFIG_SCHEMA = vol.Schema({
    DOMAIN: vol.Schema({
        vol.Required(CONF_PROXY_URL): cv.string,
    })
}, extra=vol.ALLOW_EXTRA)

async def async_setup(hass: HomeAssistant, config: dict):
    """设置集成."""
    domain_config = config.get(DOMAIN, {})
    
    # 存储配置到 hass.data
    hass.data[DOMAIN] = {
        CONF_PROXY_URL: domain_config.get(CONF_PROXY_URL, DEFAULT_PROXY_URL)
    }
    
    # 注册前端资源
    # 将前端文件注册到静态路径
    hass.http.register_static_path(
        f"/hacsfiles/{DOMAIN}/amap-tile-layer.js",
        hass.config.path(f"custom_components/{DOMAIN}/frontend/amap-tile-layer.js"),
    )
    
    # 注册前端模块到extra_module_url
    if DOMAIN not in hass.data.get("frontend_extra_module_url", []):
        hass.data.setdefault("frontend_extra_module_url", []).append(f"/hacsfiles/{DOMAIN}/amap-tile-layer.js")
    
    _LOGGER.info(
        "高德地图瓦片图层集成已加载，代理URL: %s",
        hass.data[DOMAIN][CONF_PROXY_URL]
    )
    return True

async def async_setup_entry(hass, entry):
    """通过UI设置集成条目."""
    return True

async def async_remove_entry(hass, entry):
    """移除集成条目."""
    return True