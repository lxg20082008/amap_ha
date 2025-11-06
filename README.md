

# 高德地图瓦片图层 Home Assistant 集成

将 Home Assistant 内置的 Carto 地图替换为高德地图瓦片，支持坐标纠偏和瓦片降级处理。

## 功能特点

- 🗺️ 自动替换 Carto 地图为高德地图
- 🔧 支持自定义代理服务器
- 📍 自动坐标纠偏（通过代理服务）
- 🎯 支持高级别缩放降级处理
- 🔄 自动监听 DOM 变化，实时替换新加载的瓦片

## 安装

### 通过 HACS（推荐）

1. 在 HACS 中添加自定义仓库：
   - 仓库：`https://github.com/your-username/amap_ha`
   - 类别：集成

2. 搜索 "高德地图瓦片图层" 并安装

3. 重启 Home Assistant

### 手动安装

1. 将 `custom_components/amap_ha` 目录复制到你的 Home Assistant 配置目录
2. 重启 Home Assistant

## 配置

### 步骤 1：配置集成

在 `configuration.yaml` 中添加：

```yaml
amap_ha:
  proxy_url: "http://192.168.31.3:8280"  # 你的高德代理服务地址
```

**配置参数**：
- `proxy_url` (必需): 高德地图代理服务的 URL

### 步骤 2：重启 Home Assistant

重启后打开地图页面，即可看到高德地图。

## 代理服务要求

你需要运行一个高德地图代理服务，该服务应该：

- 支持 WGS84 到 GCJ02 坐标转换
- 响应以下 URL 格式的请求：
  ```
  http://your-proxy-server/amap/{z}/{x}/{y}.jpg
  ```

## 工作原理

1. **集成加载**：HA 启动时加载集成，注册前端资源
2. **配置读取**：前端模块通过 HA API 读取代理 URL 配置
3. **瓦片替换**：监听 DOM 变化，将 Carto 瓦片实时替换为高德瓦片
4. **降级处理**：对超出最大缩放级别的瓦片进行降级和缩放处理

## 故障排除

### 地图没有显示高德瓦片

1. 检查代理服务是否正常运行
2. 确认 `proxy_url` 配置正确
3. 查看浏览器控制台是否有错误信息
4. 检查代理服务日志

### 瓦片显示空白

1. 确认代理服务的坐标转换逻辑正确
2. 检查代理服务能否正常访问高德地图
3. 验证代理服务的 URL 路径格式

## 支持

如有问题，请在 GitHub 提交 Issue。



## 许可证

MIT License

### 3. `LICENSE`
```text
MIT License

Copyright (c) 2025 高德地图瓦片图层集成

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
