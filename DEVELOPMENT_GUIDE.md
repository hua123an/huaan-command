# 🛠️ Development Guide

## 📦 Installation

### 环境要求

- **Node.js**: 18+ (推荐 20.x)
- **Rust**: 1.70+ (推荐 1.80+)
- **操作系统**: macOS / Linux / Windows
- **内存**: 至少 4GB RAM
- **存储**: 至少 2GB 可用空间

### 快速安装

```bash
# 1. 克隆项目
git clone https://github.com/hua123an/huaan-command.git
cd huaan-command

# 2. 安装依赖（重要：设置 NODE_ENV）
NODE_ENV=development npm install

# 3. 启动开发服务器
npm run tauri dev
```

### 详细安装步骤

#### 1. 系统依赖

**macOS**
```bash
# 安装 Homebrew（如果没有）
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 安装 Node.js
brew install node

# 安装 Rust
brew install rust

# 安装 Tauri 依赖
brew install --cask macos-webkit-debugger
```

**Linux (Ubuntu/Debian)**
```bash
# 更新包管理器
sudo apt update

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# 安装系统依赖
sudo apt install libwebkit2gtk-4.0-dev \
  build-essential \
  curl \
  wget \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

**Windows**
```powershell
# 使用 Scoop 安装依赖
scoop install nodejs rustup

# 或使用 Chocolatey
choco install nodejs rust

# 安装 Visual Studio Build Tools
# 下载并安装 Visual Studio Community 2022
# 选择 "C++ build tools"
```

#### 2. 项目设置

```bash
# 克隆项目
git clone https://github.com/hua123an/huaan-command.git
cd huaan-command

# 安装 Node.js 依赖
NODE_ENV=development npm install

# 验证 Rust 安装
rustc --version
cargo --version

# 验证 Tauri CLI
npx tauri --version
```

#### 3. 配置开发环境

```bash
# 创建环境配置文件
cp .env.example .env

# 编辑配置
nano .env
```

`.env` 文件内容：
```env
# 开发环境配置
NODE_ENV=development
VITE_TAURI_PRIVATE_KEY=""
VITE_TAURI_KEY_PASSWORD=""

# AI 配置（可选）
VITE_OPENAI_API_KEY=""
VITE_DEEPSEEK_API_KEY=""

# 开发工具配置
VITE_DEV_TOOLS=true
VITE_DEBUG_MODE=true
```

---

## 🔧 Build Instructions

### 开发模式

```bash
# 启动开发服务器
npm run tauri dev

# 或者使用便捷脚本
./run.sh
```

开发模式特性：
- 🔥 热重载 - 代码修改自动刷新
- 🐛 调试工具 - 集成开发者工具
- 📊 性能监控 - 实时性能指标
- 📝 详细日志 - 完整的调试信息

### 生产构建

```bash
# 标准构建
npm run tauri build

# 指定目标平台
npm run tauri build --target x86_64-apple-darwin

# 发布构建（优化）
npm run tauri build --release
```

构建输出位置：
- **macOS**: `src-tauri/target/x86_64-apple-darwin/release/bundle/dmg/`
- **Linux**: `src-tauri/target/release/bundle/deb/`
- **Windows**: `src-tauri/target/release/bundle/msi/`

### 构建配置

#### Tauri 配置 (`src-tauri/tauri.conf.json`)

```json
{
  "build": {
    "beforeBuildCommand": "npm run build",
    "beforeDevCommand": "npm run dev",
    "devPath": "http://localhost:1420",
    "distDir": "../dist"
  },
  "package": {
    "productName": "Huaan Command",
    "version": "1.0.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "all": false,
        "open": true
      },
      "dialog": {
        "all": false,
        "open": true,
        "save": true
      }
    },
    "bundle": {
      "active": true,
      "targets": "all",
      "identifier": "com.huaan.command",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ]
    },
    "security": {
      "csp": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    },
    "windows": [
      {
        "fullscreen": false,
        "resizable": true,
        "title": "Huaan Command",
        "width": 1200,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600
      }
    ]
  }
}
```

#### Vite 配置 (`vite.config.js`)

```javascript
import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@composables': resolve(__dirname, 'src/composables'),
      '@stores': resolve(__dirname, 'src/stores'),
      '@views': resolve(__dirname, 'src/views')
    }
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"]
    }
  },
  build: {
    target: 'esnext',
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'xterm-vendor': ['@xterm/xterm', '@xterm/addon-fit', '@xterm/addon-web-links'],
          'ai-vendor': ['openai']
        }
      }
    }
  }
})
```

---

## 🧪 Testing Guide

### 测试框架

项目使用以下测试框架：
- **Vitest**: 单元测试和集成测试
- **Playwright**: 端到端测试
- **@testing-library/vue**: Vue 组件测试

### 运行测试

```bash
# 运行所有测试
npm run test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行 E2E 测试
npm run test:e2e

# 生成覆盖率报告
npm run test:coverage

# 监听模式
npm run test:watch
```

### 测试结构

```
tests/
├── unit/                   # 单元测试
│   ├── FixedInput.test.js
│   └── task.test.js
├── integration/            # 集成测试
│   └── terminal.test.js
├── e2e/                    # 端到端测试
│   ├── ai-chat.spec.js
│   └── task-management.spec.js
└── fixtures/               # 测试数据
    └── sample-data.json
```

### 编写测试

#### 单元测试示例

```javascript
// tests/unit/FixedInput.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import FixedInput from '@/components/FixedInput.vue'

describe('FixedInput', () => {
  let wrapper

  beforeEach(() => {
    wrapper = mount(FixedInput, {
      props: {
        mode: 'terminal',
        placeholder: 'Enter command'
      }
    })
  })

  it('renders correctly', () => {
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.command-input').exists()).toBe(true)
  })

  it('emits submit event on enter', async () => {
    const input = wrapper.find('.command-input')
    await input.setValue('test command')
    await input.trigger('keydown.enter')
    
    expect(wrapper.emitted('submit')).toBeTruthy()
    expect(wrapper.emitted('submit')[0]).toEqual(['test command'])
  })

  it('handles history navigation', async () => {
    const input = wrapper.find('.command-input')
    
    // 添加历史记录
    wrapper.vm.commandHistory = ['cmd1', 'cmd2']
    
    // 测试上箭头
    await input.trigger('keydown.arrowup')
    expect(wrapper.vm.inputValue).toBe('cmd2')
    
    // 测试下箭头
    await input.trigger('keydown.arrowdown')
    expect(wrapper.vm.inputValue).toBe('')
  })
})
```

#### 集成测试示例

```javascript
// tests/integration/terminal.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useTerminalStore } from '@/stores/terminal'

describe('Terminal Integration', () => {
  let pinia
  let store

  beforeEach(() => {
    pinia = createPinia()
    const app = createApp({})
    app.use(pinia)
    store = useTerminalStore()
  })

  afterEach(() => {
    store.$reset()
  })

  it('creates and manages sessions', () => {
    // 创建新会话
    const session = store.createSession()
    expect(session).toBeDefined()
    expect(store.sessions.length).toBe(1)
    
    // 设置活动会话
    store.setActiveSession(session.id)
    expect(store.activeSessionId).toBe(session.id)
    
    // 关闭会话
    store.closeSession(session.id)
    expect(store.sessions.length).toBe(0)
  })

  it('handles terminal commands', async () => {
    const session = store.createSession()
    
    // 执行命令
    await store.executeCommand('echo "Hello World"')
    
    // 验证输出
    const output = session.output
    expect(output.some(line => line.includes('Hello World'))).toBe(true)
  })
})
```

#### E2E 测试示例

```javascript
// tests/e2e/ai-chat.spec.js
import { test, expect } from '@playwright/test'

test.describe('AI Chat', () => {
  test('can send message to AI', async ({ page }) => {
    await page.goto('/')
    
    // 打开 AI 聊天面板
    await page.click('[data-testid="ai-chat-button"]')
    
    // 发送消息
    await page.fill('[data-testid="ai-input"]', 'Hello AI')
    await page.click('[data-testid="ai-send"]')
    
    // 验证响应
    await expect(page.locator('[data-testid="ai-response"]')).toBeVisible()
    await expect(page.locator('[data-testid="ai-response"]')).toContainText('AI')
  })

  test('generates commands from natural language', async ({ page }) => {
    await page.goto('/')
    
    // 创建新任务
    await page.click('[data-testid="new-task-button"]')
    
    // 使用 AI 生成命令
    await page.fill('[data-testid="command-input"]', 'list all files')
    await page.click('[data-testid="ai-generate"]')
    
    // 验证生成的命令
    await expect(page.locator('[data-testid="generated-command"]')).toBeVisible()
    await expect(page.locator('[data-testid="generated-command"]')).toContainText('ls')
  })
})
```

### 测试配置

#### Vitest 配置 (`vitest.config.js`)

```javascript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        '**/*.d.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
```

#### Playwright 配置 (`playwright.config.js`)

```javascript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:1420',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run test:e2e:serve',
    port: 1420,
  },
})
```

---

## 🚀 Development Workflow

### 1. 功能开发流程

```bash
# 1. 创建功能分支
git checkout -b feature/new-feature

# 2. 开发功能
# - 编写代码
# - 编写测试
# - 更新文档

# 3. 运行测试
npm run test

# 4. 代码检查
npm run lint
npm run type-check

# 5. 提交代码
git add .
git commit -m "feat: add new feature"

# 6. 推送分支
git push origin feature/new-feature

# 7. 创建 Pull Request
# - 代码审查
# - 自动化测试
# - 合并到主分支
```

### 2. 代码规范

#### ESLint 配置 (`.eslintrc.js`)

```javascript
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    '@vue/eslint-config-typescript',
    '@vue/eslint-config-prettier'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'vue/multi-word-component-names': 'off',
    '@typescript-eslint/no-unused-vars': 'error'
  }
}
```

#### Prettier 配置 (`.prettierrc`)

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "none",
  "printWidth": 80,
  "endOfLine": "lf"
}
```

### 3. Git 工作流

#### 提交信息规范

```bash
# 格式：<type>(<scope>): <description>

feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建工具或辅助工具的变动

# 示例
feat(ai): add streaming response support
fix(terminal): resolve memory leak issue
docs(readme): update installation instructions
```

#### 分支策略

```bash
main          # 主分支，生产环境代码
develop       # 开发分支，集成最新功能
feature/*     # 功能分支
hotfix/*      # 紧急修复分支
release/*     # 发布分支
```

### 4. 调试技巧

#### 前端调试

```javascript
// Vue DevTools
// 安装 Vue DevTools 浏览器扩展

// 组件调试
console.log('Component data:', this.$data)
console.log('Props:', this.$props)
console.log('Store state:', this.$store.state)

// 性能调试
console.time('operation')
// ... 执行操作
console.timeEnd('operation')
```

#### 后端调试

```rust
// src-tauri/src/main.rs
use log::{debug, info, warn, error};

fn main() {
    // 初始化日志
    env_logger::init();
    
    info!("Application started");
    debug!("Debug message");
    warn!("Warning message");
    error!("Error message");
}
```

#### Tauri 调试

```bash
# 启用详细日志
RUST_LOG=debug npm run tauri dev

# 查看 Rust 日志
tail -f src-tauri/target/debug/build/huaan-command-*/output

# 查看前端日志
# 打开开发者工具 (F12)
```

---

## 📦 Package Management

### npm Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "tauri:build:intel": "tauri build --target x86_64-apple-darwin",
    "lint": "eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts --fix",
    "type-check": "vue-tsc --noEmit",
    "test": "vitest",
    "test:unit": "vitest run tests/unit",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest --watch"
  }
}
```

### 依赖管理

#### 添加新依赖

```bash
# 生产依赖
npm install package-name

# 开发依赖
npm install --save-dev package-name

# Tauri 依赖
cd src-tauri
cargo add crate-name
```

#### 更新依赖

```bash
# 检查过期依赖
npm outdated

# 更新依赖
npm update

# 更新 Rust 依赖
cd src-tauri
cargo update
```

---

## 🚀 Deployment

### 构建发布版本

```bash
# 清理构建缓存
npm run clean

# 生产构建
npm run build

# 构建 Tauri 应用
npm run tauri build

# 检查构建产物
ls -la src-tauri/target/release/bundle/
```

### 代码签名 (macOS)

```bash
# 安装证书
# 1. 下载开发者证书
# 2. 双击安装到钥匙串
# 3. 设置信任

# 配置签名
export TAURI_PRIVATE_KEY="path/to/private.key"
export TAURI_KEY_PASSWORD="your-password"

# 构建签名版本
npm run tauri build -- --sign
```

### 自动化发布

```bash
# 使用 GitHub Actions 自动发布
# .github/workflows/release.yml

# 手动发布
npm run release

# 发布到 GitHub Releases
gh release create v1.0.0 \
  src-tauri/target/release/bundle/dmg/*.dmg \
  --title "Release v1.0.0" \
  --notes "Release notes"
```

---

## 📚 Additional Resources

- [🤖 AI Complete User Guide](./AI_COMPLETE_GUIDE.md)
- [🔧 AI Technical Reference](./AI_TECHNICAL_REFERENCE.md)
- [⚡ Performance Optimization](./PERFORMANCE_OPTIMIZATION.md)
- [✨ Complete Features Documentation](./FEATURES_COMPLETE.md)