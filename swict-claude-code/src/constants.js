/**
 * 常量定义模块
 * 提取所有魔法数字和配置常量，提高代码可维护性
 */

const path = require('path');
const os = require('os');

// ===========================================
// 文件路径常量
// ===========================================

/** Claude 配置目录路径 */
const CLAUDE_CONFIG_DIR = path.join(os.homedir(), '.claude');

/** Claude 设置文件路径 */
const CLAUDE_SETTINGS_FILE = path.join(CLAUDE_CONFIG_DIR, 'settings.json');

/** 切换器配置文件路径 */
const SWITCHER_CONFIG_FILE = path.join(CLAUDE_CONFIG_DIR, 'model-switcher.json');

// ===========================================
// 超时时间常量 (毫秒)
// ===========================================

/** API 连接测试超时时间 */
const API_TIMEOUT = 5000;

/** curl 命令执行超时时间 */
const CURL_TIMEOUT = 5000;

/** 进程启动延迟时间 (等待状态清理完成) */
const PROCESS_START_DELAY = 100;

// ===========================================
// 显示相关常量
// ===========================================

/** API Key 前缀显示长度 */
const API_KEY_PREFIX_LENGTH = 10;

/** API Key 后缀显示长度 */
const API_KEY_SUFFIX_LENGTH = 4;

/** 菜单选项数字显示长度 */
const MENU_NUMBER_LENGTH = 1;

// ===========================================
// ANSI 颜色代码常量
// ===========================================

/** ANSI 颜色代码集合 */
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
};

// ===========================================
// 默认配置常量
// ===========================================

/** 默认提供商列表 */
const DEFAULT_PROVIDERS = [];

/** 默认 Claude 设置 */
const DEFAULT_CLAUDE_SETTINGS = {};

/** 默认切换器配置 */
const DEFAULT_SWITCHER_CONFIG = {
  providers: DEFAULT_PROVIDERS,
};

// ===========================================
// API 相关常量
// ===========================================

/** Anthropic API 版本 */
const ANTHROPIC_API_VERSION = '2023-06-01';

/** 测试消息模型 */
const TEST_MODEL = 'claude-3-sonnet-20240229';

/** 测试消息最大令牌数 */
const TEST_MAX_TOKENS = 10;

/** HTTP 成功状态码范围（最小值） */
const HTTP_SUCCESS_MIN = 200;

/** HTTP 成功状态码范围（最大值） */
const HTTP_SUCCESS_MAX = 400;

/** HTTP 成功创建状态码 */
const HTTP_CREATED = 201;

// ===========================================
// 环境变量常量
// ===========================================

/** Anthropic 认证令牌环境变量名 */
const ENV_ANTHROPIC_AUTH_TOKEN = 'ANTHROPIC_AUTH_TOKEN';

/** Anthropic Base URL 环境变量名 */
const ENV_ANTHROPIC_BASE_URL = 'ANTHROPIC_BASE_URL';

/** 向后兼容的 API Key 环境变量名 */
const ENV_ANTHROPIC_API_KEY = 'ANTHROPIC_API_KEY';

// ===========================================
// 键盘输入常量
// ===========================================

/** 回车键 ASCII 码 */
const KEY_ENTER = 13;

/** 空格键 ASCII 码 */
const KEY_SPACE = 32;

/** Ctrl+C ASCII 码 */
const KEY_CTRL_C = 3;

/** 上方向键标记 */
const KEY_UP = [27, 91, 65];

/** 下方向键标记 */
const KEY_DOWN = [27, 91, 66];

// ===========================================
// 消息和提示常量
// ===========================================

/** 帮助文本 */
const HELP_TEXT = {
  title: 'Claude Code 模型服务商配置切换工具',
  usage: 'claude-switcher <命令> [选项]',
  usageShort: 'ccs <命令> [选项]',
  commands: {
    add: '添加新的服务商配置',
    list: '列出所有已保存的服务商配置',
    switch: '切换到指定的服务商配置',
    update: '更新指定的服务商配置',
    remove: '删除指定的服务商配置',
    show: '显示当前活跃的配置',
    validate: '验证服务商配置连接',
    verify: '验证配置文件完整性',
    repair: '修复配置文件完整性问题',
    audit: '查看审计日志',
    log: '查看审计日志 (简写)',
    'install-completion': '安装Shell自动补全',
    wizard: '启动配置向导',
    export: '导出配置到文件',
    import: '从文件导入配置',
    backup: '创建配置文件备份',
    interactive: '进入交互模式',
    help: '显示此帮助信息',
  },
  examples: [
    'ccs add',
    'ccs list',
    'ccs switch openai',
    'ccs update minimax',
    'ccs validate',
    'ccs verify',
    'ccs repair',
    'ccs audit',
    'ccs backup',
    'ccs interactive',
    'claude-switcher add',
    'claude-switcher list',
  ],
};

// ===========================================
// 验证规则常量
// ===========================================

/** 服务商名称最小长度 */
const PROVIDER_NAME_MIN_LENGTH = 1;

/** Base URL 最小长度 */
const BASE_URL_MIN_LENGTH = 1;

/** API Key 最小长度 */
const API_KEY_MIN_LENGTH = 1;

/** 确认删除的关键词 */
const CONFIRM_DELETE_KEYWORDS = ['yes', 'y', '是'];

module.exports = {
  // 文件路径
  CLAUDE_CONFIG_DIR,
  CLAUDE_SETTINGS_FILE,
  SWITCHER_CONFIG_FILE,

  // 超时时间
  API_TIMEOUT,
  CURL_TIMEOUT,
  PROCESS_START_DELAY,

  // 显示
  API_KEY_PREFIX_LENGTH,
  API_KEY_SUFFIX_LENGTH,
  MENU_NUMBER_LENGTH,

  // 颜色
  COLORS,

  // 默认配置
  DEFAULT_PROVIDERS,
  DEFAULT_CLAUDE_SETTINGS,
  DEFAULT_SWITCHER_CONFIG,

  // API
  ANTHROPIC_API_VERSION,
  TEST_MODEL,
  TEST_MAX_TOKENS,
  HTTP_SUCCESS_MIN,
  HTTP_SUCCESS_MAX,
  HTTP_CREATED,

  // 环境变量
  ENV_ANTHROPIC_AUTH_TOKEN,
  ENV_ANTHROPIC_BASE_URL,
  ENV_ANTHROPIC_API_KEY,

  // 键盘
  KEY_ENTER,
  KEY_SPACE,
  KEY_CTRL_C,
  KEY_UP,
  KEY_DOWN,

  // 帮助文本
  HELP_TEXT,

  // 验证规则
  PROVIDER_NAME_MIN_LENGTH,
  BASE_URL_MIN_LENGTH,
  API_KEY_MIN_LENGTH,
  CONFIRM_DELETE_KEYWORDS,
};
