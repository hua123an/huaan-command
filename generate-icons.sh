#!/bin/bash

# 图标生成脚本
# 需要安装 imagemagick: brew install imagemagick

ICON_SVG="icon.svg"
OUTPUT_DIR="src-tauri/icons"

# 创建不同尺寸的图标
declare -A sizes=(
    ["32x32.png"]="32"
    ["64x64.png"]="64"
    ["128x128.png"]="128"
    ["128x128@2x.png"]="256"
    ["icon.png"]="512"
    ["StoreLogo.png"]="150"
    ["Square30x30Logo.png"]="30"
    ["Square44x44Logo.png"]="44"
    ["Square71x71Logo.png"]="71"
    ["Square89x89Logo.png"]="89"
    ["Square107x107Logo.png"]="107"
    ["Square142x142Logo.png"]="142"
    ["Square150x150Logo.png"]="150"
    ["Square284x284Logo.png"]="284"
    ["Square310x310Logo.png"]="310"
)

echo "开始生成图标..."

# 检查是否安装了 ImageMagick
if ! command -v convert &> /dev/null; then
    echo "错误: 需要安装 ImageMagick"
    echo "运行: brew install imagemagick"
    exit 1
fi

# 生成 PNG 图标
for file in "${!sizes[@]}"; do
    size="${sizes[$file]}"
    echo "生成 ${file} (${size}x${size})"
    convert -background transparent -size ${size}x${size} "$ICON_SVG" "$OUTPUT_DIR/$file"
done

# 生成 ICO 文件 (Windows)
echo "生成 icon.ico"
convert -background transparent -size 256x256 "$ICON_SVG" -define icon:auto-resize=256,128,64,48,32,16 "$OUTPUT_DIR/icon.ico"

# 生成 ICNS 文件 (macOS)
echo "生成 icon.icns"
# 需要使用 iconutil 创建 ICNS
mkdir -p temp.iconset
cp "$OUTPUT_DIR/icon.png" temp.iconset/icon_512x512.png
cp "$OUTPUT_DIR/128x128@2x.png" temp.iconset/icon_256x256.png
cp "$OUTPUT_DIR/128x128.png" temp.iconset/icon_128x128.png
cp "$OUTPUT_DIR/64x64.png" temp.iconset/icon_32x32@2x.png
cp "$OUTPUT_DIR/32x32.png" temp.iconset/icon_16x16@2x.png

# 创建 16x16 和 32x32
convert -background transparent -size 16x16 "$ICON_SVG" temp.iconset/icon_16x16.png
convert -background transparent -size 32x32 "$ICON_SVG" temp.iconset/icon_32x32.png

iconutil -c icns temp.iconset -o "$OUTPUT_DIR/icon.icns"
rm -rf temp.iconset

echo "图标生成完成！"
echo "注意: 请手动检查生成的图标质量，必要时进行调整"