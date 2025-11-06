"""高德地图瓦片图层集成."""
import logging
import voluptuous as vol
import os
import shutil
from homeassistant.core import HomeAssistant
import homeassistant.helpers.config_validation as cv

_LOGGER = logging.getLogger(__name__)

# 集成配置常量
DOMAIN = "amap_ha"
CONF_PROXY_URL = "proxy_url"
DEFAULT_PROXY_URL = "http://localhost:8280"

CONFIG_SCHEMA = vol.Schema({
    DOMAIN: vol.Schema({
        vol.Optional(CONF_PROXY_URL, default=DEFAULT_PROXY_URL): cv.string,
    })
}, extra=vol.ALLOW_EXTRA)

async def async_setup(hass: HomeAssistant, config: dict):
    """设置集成."""
    domain_config = config.get(DOMAIN, {})
    
    # 存储配置到 hass.data
    hass.data[DOMAIN] = {
        CONF_PROXY_URL: domain_config.get(CONF_PROXY_URL, DEFAULT_PROXY_URL)
    }

    # 复制前端文件到 HACS 标准路径
    source_file = hass.config.path("custom_components/amap_ha/frontend/amap-tile-layer.js")
    target_dir = hass.config.path("www/community/amap-tile-layer")
    target_file = os.path.join(target_dir, "amap-tile-layer.js")
    
    try:
        # 确保目标目录存在
        os.makedirs(target_dir, exist_ok=True)
        
        # 复制文件
        if os.path.exists(source_file):
            shutil.copy2(source_file, target_file)
            _LOGGER.info("前端文件已复制到 HACS 标准路径")
        else:
            _LOGGER.error("源文件不存在: %s", source_file)
    except Exception as e:
        _LOGGER.error("复制前端文件失败: %s", e)

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