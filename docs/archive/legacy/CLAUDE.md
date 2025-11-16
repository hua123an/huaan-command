# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 Quick Start Commands

### Development
```bash
# Start development server (requires dependencies installed)
npm run tauri dev

# Or use the convenience script
./run.sh

# Frontend only (Vite dev server on port 1420)
npm run dev
```

### Building
```bash
# Standard build
npm run tauri build

# Release build (optimized)
npm run tauri build --release

# Build for specific architecture (Intel Mac)
npm run tauri build --target x86_64-apple-darwin

# Build universal binary (Apple Silicon + Intel)
npm run tauri build --target universal-apple-darwin
```

### Code Quality
```bash
# Lint and auto-fix
npm run lint

# Format code
npm run format
```

### Testing (Vitest Framework)
```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run a specific test file
npm test task.test.js
```

## 🏗️ Project Architecture

Huaan Command is a **Tauri 2.0** application with a hybrid architecture combining Rust backend and Vue 3 frontend.

### Technology Stack
- **Desktop Framework**: Tauri 2.0 (Rust + WebView)
- **Frontend**: Vue 3 (Composition API) + Vite
- **State Management**: Pinia stores
- **Terminal Emulation**: xterm.js + portable-pty (Rust)
- **Backend**: Rust with Tokio async runtime
- **AI Integration**: OpenAI API, DeepSeek, Kimi, Zhipu AI
- **Testing**: Vitest + Vue Test Utils

### High-Level Architecture

```
┌─────────────────────────────────────────┐
│              Vue 3 Frontend             │
│  ┌──────────────┬────────────────────┐  │
│  │  Views       │   Composables      │  │
│  │  - Tasks     │   - useAI*         │  │
│  │  - Terminal  │   - useTheme*      │  │
│  │  - Settings  │   - useTask*       │  │
│  └──────────────┴────────────────────┘  │
│  ┌──────────────┬────────────────────┐  │
│  │  Pinia       │   Router           │  │
│  │  Stores      │   - / (Tasks)      │  │
│  │  - task.js   │   - /terminal      │  │
│  │  - terminal  │   - /settings      │  │
│  │  - theme     │                    │  │
│  └──────────────┴────────────────────┘  │
└─────────────────────────────────────────┘
                    ↕ Tauri Bridge
┌─────────────────────────────────────────┐
│              Rust Backend               │
│  ┌──────────────┬────────────────────┐  │
│  │  lib.rs      │   TerminalManager  │  │
│  │  - Commands  │   - Session mgmt   │  │
│  │  - Events    │   - PTY handling   │  │
│  └──────────────┴────────────────────┘  │
│  ┌──────────────┬────────────────────┐  │
│  │  TaskManager │   commands/        │  │
│  │  - Async     │   - executor.rs    │  │
│  │  - Concurrent│   - filesystem.rs  │  │
│  └──────────────┴────────────────────┘  │
│  ┌──────────────┬────────────────────┐  │
│  │  ai_proxy.rs │   TaskManager      │  │
│  │  - API Proxy │   - Max 10 tasks   │  │
│  │  - Streaming │   - 100ms buffer   │  │
│  └──────────────┴────────────────────┘  │
└─────────────────────────────────────────┘
```

### Core Components

**Frontend (src/)**
- **views/**: Main pages (Tasks.vue, Terminal.vue, Settings.vue)
- **components/**: 25+ Vue components (TaskList, TerminalPane, AIChatPanel, etc.)
- **composables/**: 20+ reusable logic modules
  - AI features: useAIChatEnhancer, useAICache, useAIRetry
  - Theme: useTheme, useThemeCustomizer
  - Task: useTaskDependencies, useVirtualScroll
  - System: useShortcuts, useErrorHandler, useAutoComplete
- **stores/**: Pinia state management
  - Core: task.js, terminal.js, theme.js, settings.js
  - Extended: history.js, logs.js, workflow.js, docker.js, git.js
  - UI: notifications.js, splitPane.js, performance.js
- **router/**: Vue Router with lazy loading

**Backend (src-tauri/src/)**
- **lib.rs**: Main application entry, 20+ Tauri command handlers, AppState management
- **task.rs**: TaskManager for concurrent command execution
  - Max 10 parallel tasks via semaphore
  - 100ms output buffering
  - Max 10,000 lines per task output
  - Real-time event emission
- **terminal.rs**: TerminalManager using portable-pty
  - Multiple concurrent sessions
  - PTY-based shell emulation
  - Session persistence
- **commands/**: Tauri command modules
  - **executor.rs**: Command execution with output streaming
  - **filesystem.rs**: Safe file system operations
- **ai_proxy.rs**: AI API integration and proxy for multiple providers

## 📁 Key Files & Configuration

### Configuration
- **src-tauri/tauri.conf.json**: Tauri app configuration
  - Window settings (1200x800, min 800x600)
  - Bundle configuration for macOS/Windows/Linux
  - Security and CSP settings
- **vite.config.js**: Vite bundler config
  - Path aliases: @, @components, @composables, @stores, @views
  - Port: 1420
  - Build optimization with manual chunks
  - Terser minification
- **package.json**: npm scripts and dependencies
- **src-tauri/Cargo.toml**: Rust dependencies
  - Tauri 2.x, Tokio, portable-pty, serde
- **eslint.config.js**: Code quality configuration
- **.prettierrc**: Code formatting rules

### Main Application Entry Points
- **src/main.js**: Vue app initialization with Pinia and router
- **src/App.vue**: Root component with Navigation and DebugPanel
- **src/router/index.js**: Route configuration (Tasks, Terminal, Settings)
- **src-tauri/src/main.rs**: Tauri entry point
- **src-tauri/src/lib.rs**: Main application logic and command registration

## 🎯 Key Features

### Task Management (task.rs + src/stores/task.js)
- Concurrent task execution (up to 10 parallel tasks via semaphore)
- Real-time output streaming with buffered emission (100ms intervals)
- Task status tracking (Pending, Running, Success, Failed, Cancelled)
- Environment variable support
- Task cancellation and cleanup
- Max 10,000 lines kept per task output
- Event emission: `task-updated`, `task-output`

### Terminal System (terminal.rs + TerminalPane.vue)
- Multiple concurrent terminal sessions
- PTY-based shell emulation (portable-pty)
- Session persistence across app restarts
- xterm.js frontend with fit and web-links addons
- Working directory tracking and management
- Cross-platform shell support (sh for Unix, cmd for Windows)

### AI Integration (ai_proxy.rs + AIChatPanel.vue)
- Multiple AI provider support (OpenAI, DeepSeek, Kimi, Zhipu AI)
- Natural language to command generation
- Streaming responses with typewriter effect
- Project analysis capabilities
- AI chat interface with context awareness
- API proxy for secure key management

### Theme System (useTheme.js + useThemeCustomizer.js)
- Dark/light themes with 6 preset themes
- Custom color customization
- Real-time theme switching
- Smooth CSS transitions
- Persistent theme storage

## 🔌 Important Tauri Commands

All commands are defined in `src-tauri/src/lib.rs` and called from frontend via `import { invoke } from '@tauri-apps/api/core'`:

**Terminal Commands**
- `start_terminal(session_id, shell_type)` - Create new terminal session
- `write_terminal(session_id, data)` - Send input to terminal
- `resize_terminal(session_id, cols, rows)` - Resize PTY
- `close_terminal(session_id)` - Close session
- `get_current_dir(session_id)` - Get current working directory

**Task Commands**
- `create_task(id, name, command, env_vars)` - Create new task
- `run_task(task_id)` - Execute single task
- `run_all_tasks()` - Execute all pending tasks concurrently
- `get_task(task_id)` / `get_all_tasks()` - Retrieve tasks
- `cancel_task(task_id)` - Cancel running task
- `clear_tasks()` - Remove all tasks

**File System Commands**
- `list_directory(path)` - List directory contents
- `get_project_structure(root_path, max_depth)` - Scan project structure
- `read_file_content(path)` / `write_file_content(path, content)` - File I/O
- `get_home_directory()` / `get_working_directory()` - Get paths
- Additional safe FS commands in `commands/filesystem.rs`

**AI Commands**
- `call_ai_api(provider, model, messages)` - Proxy to AI services

**Command Execution**
- `execute_command(command, workingDir)` - Direct command execution for AI analysis
- Path expansion support (~ → HOME)
- Working directory validation
- Cross-platform shell handling (sh -c / cmd /C)

## 📋 Common Development Workflows

### Adding a New Tauri Command
1. Define command in `src-tauri/src/lib.rs` with `#[tauri::command]`
2. Register in `invoke_handler` array (line 380+)
3. Call from frontend: `import { invoke } from '@tauri-apps/api/core'`
4. Add TypeScript types if needed

### Adding a New Pinia Store
1. Create file in `src/stores/` (e.g., `myStore.js`)
2. Export `defineStore` with state, actions, getters
3. Import and use: `const myStore = useMyStore()`

### Adding a New Composables
1. Create file in `src/composables/` (e.g., `useMyFeature.js`)
2. Export composable function with reactive state
3. Import in components: `const { ... } = useMyFeature()`

### Path Aliases
The following aliases are configured in `vite.config.js`:
- `@` → `src/`
- `@components` → `src/components/`
- `@composables` → `src/composables/`
- `@stores` → `src/stores/`
- `@views` → `src/views/`

### Working Directory
- App's working directory is its install location, NOT user's project
- Use `get_working_directory()` and `get_home_directory()` to navigate
- Terminal sessions track their own working directories
- `~` is automatically expanded to HOME directory
- Path validation prevents access to non-existent directories

## 🔧 Debugging

### Backend (Rust)
```bash
# Enable debug logging
RUST_LOG=debug npm run tauri dev

# Check Rust logs
tail -f src-tauri/target/debug/build/huaan-command-*/output

# View logs during development
# Check the terminal where you ran `npm run tauri dev`
```

### Frontend
- Open DevTools (F12 in app)
- Vue DevTools browser extension recommended
- Check Pinia state in DevTools
- Enable logging panel: Ctrl+Shift+L

### Testing
```bash
# Run specific test
npm test task.test.js

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm run test:coverage
```

### Common Issues
- **npm install fails**: Run `sudo chown -R $(whoami) ~/.npm` to fix permissions
- **Node version**: Requires Node.js 18+
- **Rust version**: Requires Rust 1.70+
- **Port 1420 in use**: Kill process or change port in `vite.config.js`
- **Working directory**: Remember app runs from its own directory, not user's project

## 🧪 Testing (Vitest)

### Test Structure
```
tests/
├── unit/              # Unit tests for stores, composables, components
│   ├── task.test.js   # Task store tests
│   └── FixedInput.test.js
└── integration/       # Integration tests
    └── terminal.test.js
```

### Running Tests
```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Specific file
npm test task.test.js

# Watch mode
npm test -- --watch
```

### Writing Tests
- Uses **Vitest** framework (faster than Jest, Vite-native)
- Vue Test Utils for component testing
- Pinia testing utilities available
- Example test structure in `tests/unit/task.test.js`

## 🏷️ Version & Build Info

- **Version**: 1.2.0
- **Tauri**: 2.x
- **Vue**: 3.5.x (^3.5.22)
- **Rust**: 2021 edition
- **Node**: 18+ required
- **Build targets**: macOS (Intel & Apple Silicon), Linux, Windows
- **Terminal**: xterm.js ^5.5.0
- **Test Framework**: Vitest

## 🎨 UI/UX Notes

- **macOS-native design aesthetic**
- **Theme system**: 6 preset themes + custom colors
- **Split-pane layouts** with resizable panes
- **Virtual scrolling** for large outputs (10,000+ lines)
- **Keyboard shortcuts** extensively used (Ctrl+T, Ctrl+R, etc.)
- **Streaming UI updates** for real-time feedback
- **Smooth transitions** (0.3s cubic-bezier for theme switching)
- **Responsive design** for different screen sizes

## ⚠️ Important Considerations

- **Async everywhere**: Rust backend uses Tokio for async/await
- **Concurrency limits**: Max 10 concurrent tasks via semaphore
- **Output buffering**: 100ms intervals for streaming output
- **Memory management**: Max 10,000 lines kept per task output
- **Security**: Commands are shell-escaped, working directory validated
- **Cross-platform**: Handles Windows (cmd /C) and Unix (sh -c) shells
- **Path handling**: ~ expansion for home directory supported
- **Event-driven**: Tauri events for real-time frontend updates
- **Lazy loading**: All routes use dynamic imports for performance
- **Type safety**: Frontend uses JSDoc types, backend uses Rust types

## 📚 Key Documentation Files

- **README.md**: Main project documentation and usage guide
- **DEVELOPMENT_GUIDE.md**: Comprehensive development setup and testing guide
- **CONTRIBUTING.md**: Contribution guidelines and code standards
- **AI_COMPLETE_GUIDE.md**: AI features documentation
- **FEATURES_COMPLETE.md**: Complete feature documentation
- **PERFORMANCE_OPTIMIZATION.md**: Performance tuning guide
- **WARP_MODE.md**: Warp terminal mode documentation
- **TERMINAL_PERSISTENCE.md**: Session persistence details

## 🔍 Code Organization Patterns

### Frontend (Vue 3 + Pinia)
- **Composition API** for all components
- **Pinia stores** for global state (task, terminal, theme, etc.)
- **Composables** for reusable logic (20+ files)
- **Event-driven updates** from Tauri backend
- **Path aliases** configured in Vite

### Backend (Rust + Tauri)
- **AppState struct** manages TerminalManager and TaskManager
- **Arc<Mutex<>>** pattern for shared state
- **Tokio** async runtime throughout
- **Tracing** for structured logging
- **Serde** for serialization/deserialization
- **Command modules** for organization

### Communication
- **Tauri commands** (invoke) for request/response
- **Tauri events** (listen/emit) for real-time updates
- **Task events**: `task-updated`, `task-output`
- **Type-safe** data transfer with serde

## 🚀 Performance Optimizations

- **Manual code splitting** in Vite build (vue-vendor, xterm-vendor, ai-vendor)
- **Lazy loading** for all routes
- **Virtual scrolling** for large task outputs
- **Output buffering** (100ms) to reduce UI updates
- **Memory limits** (10,000 lines) for task outputs
- **Typeahead** and debouncing in UI interactions
- **Keep-alive** for router views
