# 图标更新说明

## 已完成
- ✅ 更新了主图标文件 `icon.svg` 为纯色设计
- ✅ 创建了图标生成脚本 `generate-icons.sh`

## 图标设计变更
- 移除了所有渐变效果
- 使用 iOS 系统蓝色 (#007AFF) 作为主色调
- 终端窗口改为白色背景，提高对比度
- 简化了 AI 图标设计
- 保持了原有的代码装饰元素

## 需要手动完成的步骤

### 1. 安装 ImageMagick (用于生成 PNG 图标)
```bash
# macOS
brew install imagemagick

# Ubuntu/Debian
sudo apt-get install imagemagick

# Windows
# 从 https://imagemagick.org/script/download.php 下载安装
```

### 2. 运行图标生成脚本
```bash
./generate-icons.sh
```

### 3. 验证生成的图标
检查以下文件是否正确生成：
- `src-tauri/icons/icon.png` (512x512)
- `src-tauri/icons/128x128.png`
- `src-tauri/icons/64x64.png`
- `src-tauri/icons/32x32.png`
- `src-tauri/icons/icon.ico` (Windows)
- `src-tauri/icons/icon.icns` (macOS)

## 替代方案

如果无法安装 ImageMagick，可以使用在线工具：
1. 访问 https://convertio.co/svg-png/
2. 上传 `icon.svg` 文件
3. 选择需要的尺寸 (32, 64, 128, 256, 512)
4. 下载生成的 PNG 文件并替换到 `src-tauri/icons/` 目录

## 应用新图标

完成图标生成后：
1. 重新构建应用
2. 清理应用缓存（如果需要）
3. 重启应用查看新图标

## 设计理念

新图标遵循以下原则：
- **简洁性**: 移除复杂的渐变和阴影
- **一致性**: 使用统一的颜色方案
- **可识别性**: 保持终端和 AI 的核心元素
- **现代感**: 符合 macOS 和现代设计趋势