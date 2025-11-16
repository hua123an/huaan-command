# Dockerfile for Huaan Command

# 使用官方 Node.js 基础镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./
copy package-lock.json ./

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 复制源代码
COPY src/ ./src/
COPY src-tauri/ ./src-tauri/
COPY public/ ./public/
COPY index.html ./index.html
COPY vite.config.js ./vite.config.js

# 安装 Rust 依赖
RUN apk add --no-cache --virtual .build-deps \
    && apk add --no-cache cargo \
    && rm -rf /var/cache/apk/

# 构建 Tauri 应用
RUN npm run tauri build

# 创建非 root 用户
RUN addgroup -S tauri && \
    adduser -G tauri tauri && \
    mkdir -p /home/tauri/app && \
    chown -R tauri:tauri /home/tauri/app

# 复制构建产物
COPY --from=builder --chown=tauri:tauri /home/tauri/app /app/

# 暴露端口
EXPOSE 1420

# 设置环境变量
ENV NODE_ENV=production
ENV TAUKI_CLI_PATH=/app/bin

# 启动应用
CMD ["npm", "run", "start"]