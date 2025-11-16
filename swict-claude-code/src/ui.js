/**
 * UI 模块
 * 统一管理所有用户界面输出和交互功能
 */

const readline = require('readline');
const {
  COLORS,
  HELP_TEXT,
  API_KEY_PREFIX_LENGTH,
  API_KEY_SUFFIX_LENGTH,
} = require('./constants');

// ===========================================
// 日志记录功能
// ===========================================

/**
 * 记录错误日志
 * @param {string} message - 错误消息
 * @param {Error} error - 错误对象（可选）
 */
function logError(message, error = null) {
  const timestamp = new Date().toISOString();
  const errorMsg = error ? `${message}: ${error.message}` : message;
  console.error(`[${timestamp}] ERROR: ${errorMsg}`);

  // 如果有错误堆栈，也输出到错误流
  if (error && error.stack) {
    console.error(error.stack);
  }
}

/**
 * 记录信息日志
 * @param {string} message - 信息消息
 */
function logInfo(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] INFO: ${message}`);
}

/**
 * 记录调试日志
 * @param {string} message - 调试消息
 */
function logDebug(message) {
  // 只有在启用调试模式时才输出
  if (process.env.DEBUG) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] DEBUG: ${message}`);
  }
}

// ===========================================
// 基础 UI 输出函数
// ===========================================

/**
 * 打印标题
 * @param {string} text - 标题文本
 */
function printTitle(text) {
  console.log(`\n${COLORS.cyan}${COLORS.bright}${text}${COLORS.reset}\n`);
}

/**
 * 打印成功消息
 * @param {string} text - 成功文本
 */
function printSuccess(text) {
  console.log(`${COLORS.green}✅ ${text}${COLORS.reset}`);
}

/**
 * 打印错误消息
 * @param {string} text - 错误文本
 */
function printError(text) {
  console.log(`${COLORS.red}❌ ${text}${COLORS.reset}`);
}

/**
 * 打印警告消息
 * @param {string} text - 警告文本
 */
function printWarning(text) {
  console.log(`${COLORS.yellow}⚠️  ${text}${COLORS.reset}`);
}

/**
 * 打印信息消息
 * @param {string} text - 信息文本
 */
function printInfo(text) {
  console.log(`${COLORS.blue}ℹ️  ${text}${COLORS.reset}`);
}

/**
 * 打印常规文本（带颜色）
 * @param {string} text - 文本
 * @param {string} color - 颜色代码（可选）
 */
function printText(text, color = null) {
  if (color && COLORS[color]) {
    console.log(`${COLORS[color]}${text}${COLORS.reset}`);
  } else {
    console.log(text);
  }
}

// ===========================================
// 高级 UI 输出函数
// ===========================================

/**
 * 格式化显示 API Key
 * @param {string} apiKey - API Key
 * @returns {string} 格式化后的显示字符串
 */
function formatApiKey(apiKey) {
  try {
    if (!apiKey || typeof apiKey !== 'string') {
      return '未设置';
    }

    const prefix = apiKey.substring(0, API_KEY_PREFIX_LENGTH);
    const suffix = apiKey.substring(apiKey.length - API_KEY_SUFFIX_LENGTH);

    return `${prefix}...${suffix}`;
  } catch (err) {
    logError('格式化 API Key 失败', err);
    return '无效';
  }
}

/**
 * 格式化显示提供商信息
 * @param {Object} provider - 提供商对象
 * @param {number} index - 索引（从 1 开始）
 * @param {boolean} isActive - 是否为当前活跃提供商
 * @returns {string} 格式化的字符串
 */
function formatProvider(provider, index, isActive = false) {
  try {
    const marker = isActive ? `${COLORS.green}✅${COLORS.reset}` : '  ';
    const formatted = [];

    formatted.push(`${marker} [${index}] ${COLORS.bright}${provider.name}${COLORS.reset}`);
    formatted.push(`    ${COLORS.dim}Base URL:${COLORS.reset} ${provider.baseUrl}`);
    formatted.push(`    ${COLORS.dim}API Key:${COLORS.reset} ${formatApiKey(provider.apiKey)}`);
    formatted.push(`    ${COLORS.dim}Added:${COLORS.reset} ${new Date(provider.createdAt).toLocaleString()}`);

    if (provider.model) {
      formatted.push(`    ${COLORS.dim}Model:${COLORS.reset} ${provider.model}`);
    }

    return formatted.join('\n');
  } catch (err) {
    logError('格式化提供商信息失败', err);
    return `${COLORS.red}格式化失败: ${err.message}${COLORS.reset}`;
  }
}

/**
 * 显示分割线
 * @param {string} char - 分隔字符（默认：=）
 * @param {number} length - 分隔线长度（默认：40）
 */
function printDivider(char = '=', length = 40) {
  console.log(char.repeat(length));
}

/**
 * 显示空行
 * @param {number} count - 空行数量（默认：1）
 */
function printNewline(count = 1) {
  console.log('\n'.repeat(count));
}

// ===========================================
// 帮助信息显示
// ===========================================

/**
 * 获取示例描述
 */
function getExampleDescription(example) {
  if (example.includes('add')) return '添加配置 (简写)';
  if (example.includes('list')) return '列出配置 (简写)';
  if (example.includes('switch')) return '切换配置 (简写)';
  if (example.includes('validate')) return '验证配置 (简写)';
  if (example.includes('backup')) return '备份配置 (简写)';
  if (example.includes('interactive')) return '进入交互模式';
  if (example.includes('claude-switcher add')) return '添加配置';
  if (example.includes('claude-switcher list')) return '列出配置';
  if (example.includes('claude-switcher show')) return '显示当前配置';
  return '';
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`\n${COLORS.bright}${COLORS.cyan}${HELP_TEXT.title}${COLORS.reset}\n`);

  console.log(`${COLORS.cyan}使用方法:${COLORS.reset}`);
  console.log(`  ${HELP_TEXT.usage}`);
  console.log(`  ${HELP_TEXT.usageShort}              # 简写\n`);

  console.log(`${COLORS.cyan}命令:${COLORS.reset}`);
  for (const [cmd, desc] of Object.entries(HELP_TEXT.commands)) {
    console.log(`  ${COLORS.cyan}${cmd}${COLORS.reset} ${desc}`);
  }

  console.log(`\n${COLORS.cyan}示例:${COLORS.reset}`);
  for (const example of HELP_TEXT.examples) {
    console.log(`  ${COLORS.cyan}${example}${COLORS.reset}                  # ${getExampleDescription(example)}`);
  }

  console.log(`\n${COLORS.dim}配置文件位置:${COLORS.reset}`);
  console.log(`  - 服务商配置: ~/.claude/model-switcher.json`);
  console.log(`  - Claude 配置: ~/.claude/settings.json\n`);
}

// ===========================================
// 交互式输入函数
// ===========================================

/**
 * 创建 readline 接口
 * @returns {Object} readline 接口
 */
function createInterface() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return rl;
}

/**
 * 询问用户问题
 * @param {string} query - 问题
 * @returns {Promise<string>} 用户回答
 */
function askQuestion(query) {
  return new Promise(resolve => {
    const rl = createInterface();
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

/**
 * 询问用户问题（使用现有接口）
 * @param {Object} rl - readline 接口
 * @param {string} query - 问题
 * @returns {Promise<string>} 用户回答
 */
function questionWithRL(rl, query) {
  return new Promise(resolve => {
    rl.question(query, resolve);
  });
}

// ===========================================
// 菜单显示
// ===========================================

/**
 * 显示交互式主菜单
 */
function showInteractiveMenu() {
  console.log(`\n${COLORS.cyan}${COLORS.bright}Claude Code 配置切换工具${COLORS.reset}`);
  printDivider('=', 40);
  printNewline();

  console.log('请选择操作:');
  console.log(`  ${COLORS.cyan}1${COLORS.reset} - 列出所有配置`);
  console.log(`  ${COLORS.cyan}2${COLORS.reset} - 添加新配置`);
  console.log(`  ${COLORS.cyan}3${COLORS.reset} - 切换配置`);
  console.log(`  ${COLORS.cyan}4${COLORS.reset} - 删除配置`);
  console.log(`  ${COLORS.cyan}5${COLORS.reset} - 显示当前配置`);
  console.log(`  ${COLORS.cyan}6${COLORS.reset} - 退出\n`);
}

/**
 * 显示简洁选择菜单提示
 * @param {Array} providers - 提供商列表
 * @param {number} selectedIndex - 当前选中索引
 */
function showSelectionMenu(providers, selectedIndex) {
  // 清屏
  process.stdout.write('\x1Bc');

  console.log(`${COLORS.cyan}${COLORS.bright}请选择服务商 (↑↓ 移动, 回车确认, Ctrl+C 取消)${COLORS.reset}\n`);

  providers.forEach((provider, index) => {
    if (index === selectedIndex) {
      console.log(`${COLORS.bgBlue}${COLORS.white}${COLORS.bright} ▸ ${provider.name} ${COLORS.reset}`);
    } else {
      console.log(`   ${provider.name}`);
    }
  });
}

// ===========================================
// 状态显示
// ===========================================

/**
 * 显示加载状态
 * @param {string} message - 加载消息
 */
function showLoading(message) {
  console.log(`${COLORS.yellow}⏳ ${message}${COLORS.reset}`);
}

/**
 * 显示连接测试结果
 * @param {boolean} isConnected - 是否连接成功
 */
function showConnectionResult(isConnected) {
  if (isConnected) {
    console.log(`${COLORS.green}✅ 连接成功${COLORS.reset}`);
  } else {
    console.log(`${COLORS.yellow}⚠️  连接测试失败或超时（可能是网络问题）${COLORS.reset}`);
  }
}

/**
 * 显示配置详情
 * @param {Object} config - 配置对象
 */
function showConfigDetails(config) {
  if (!config || !config.provider) {
    return;
  }

  printTitle('当前激活配置');
  console.log(`服务商名称: ${COLORS.bright}${config.provider.name}${COLORS.reset}`);
  console.log(`ANTHROPIC_AUTH_TOKEN: ${formatApiKey(config.apiKey)}`);
  console.log(`ANTHROPIC_BASE_URL: ${config.baseUrl || '未设置'}`);

  if (config.model) {
    console.log(`Model: ${config.model}`);
  }

  printNewline();
  console.log(`${COLORS.dim}配置文件位置:${COLORS.reset}`);
  console.log(`  ~/.claude/settings.json\n`);
  console.log(`${COLORS.cyan}提示:${COLORS.reset} 如果 Claude Code 无法读取配置，请重启 Claude Code 或使用工具直接启动\n`);
}

/**
 * 显示配置已切换的信息
 * @param {string} name - 提供商名称
 * @param {string} baseUrl - Base URL
 * @param {string} model - 模型名称（可选）
 */
function showSwitchResult(name, baseUrl, model = null) {
  printTitle('配置已切换');
  console.log(`服务商: ${COLORS.bright}${name}${COLORS.reset}`);
  console.log(`Base URL: ${baseUrl}`);

  if (model) {
    console.log(`Model: ${model}`);
  }

  console.log(`\n${COLORS.cyan}提示:${COLORS.reset} 请重启 Claude Code 以使配置生效\n`);
}

// ===========================================
// 错误处理和提示
// ===========================================

/**
 * 显示错误并提供帮助
 * @param {string} message - 错误消息
 * @param {Array} suggestions - 建议列表
 */
function showErrorWithSuggestions(message, suggestions = []) {
  printError(message);

  if (suggestions.length > 0) {
    printNewline();
    console.log(`${COLORS.cyan}建议:${COLORS.reset}`);
    suggestions.forEach(suggestion => {
      console.log(`  - ${suggestion}`);
    });
  }

  printNewline();
}

/**
 * 显示提供商列表（带错误处理）
 * @param {Array} providers - 提供商列表
 * @param {string} activeProvider - 当前活跃提供商
 */
function showProviderList(providers, activeProvider = null) {
  if (!providers || providers.length === 0) {
    printTitle('已保存的服务商配置');
    printWarning('还没有添加任何服务商配置');
    printInfo(`使用 ${COLORS.cyan}claude-switcher add${COLORS.reset} 添加新的配置\n`);
    return;
  }

  printTitle('已保存的服务商配置');

  providers.forEach((provider, index) => {
    const isActive = activeProvider === provider.name;
    const formatted = formatProvider(provider, index + 1, isActive);
    console.log(formatted);
    printNewline();
  });
}

/**
 * 显示提示信息
 * @param {string} message - 消息
 */
function showTip(message) {
  console.log(`${COLORS.cyan}💡 ${message}${COLORS.reset}`);
}

module.exports = {
  // 日志
  logError,
  logInfo,
  logDebug,

  // 基础输出
  printTitle,
  printSuccess,
  printError,
  printWarning,
  printInfo,
  printText,
  printDivider,
  printNewline,

  // 格式化
  formatApiKey,
  formatProvider,

  // 帮助
  showHelp,

  // 交互
  createInterface,
  askQuestion,
  questionWithRL,

  // 菜单
  showInteractiveMenu,
  showSelectionMenu,

  // 状态
  showLoading,
  showConnectionResult,
  showConfigDetails,
  showSwitchResult,

  // 进度条
  showProgressBar,
  showSpinner,
  stopSpinner,

  // 错误处理
  showErrorWithSuggestions,
  showProviderList,
  showTip,
};

// ===========================================
// 进度条和加载动画
// ===========================================

let spinnerInterval = null;

/**
 * 显示进度条
 * @param {number} current - 当前进度
 * @param {number} total - 总进度
 * @param {string} message - 消息
 */
function showProgressBar(current, total, message = '处理中') {
  const percentage = Math.round((current / total) * 100);
  const filled = Math.round(percentage / 2);
  const empty = 50 - filled;

  const progressBar = `${COLORS.cyan}${COLORS.bright}[${COLORS.reset}${'#'.repeat(filled)}${' '.repeat(empty)}${COLORS.cyan}${COLORS.bright}]${COLORS.reset}`;
  const progressText = `${COLORS.green}${COLORS.bright}${percentage}%${COLORS.reset}`;

  process.stdout.write(`\r${message} ${progressBar} ${progressText}`);
  if (current === total) {
    console.log('\n');
  }
}

/**
 * 显示旋转加载动画
 * @param {string} message - 消息
 */
function showSpinner(message = '加载中') {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let index = 0;

  process.stdout.write(`\n${message} `);

  spinnerInterval = setInterval(() => {
    const frame = frames[index % frames.length];
    process.stdout.write(`\r${message} ${COLORS.cyan}${frame}${COLORS.reset} `);
    index++;
  }, 100);
}

/**
 * 停止旋转动画
 */
function stopSpinner() {
  if (spinnerInterval) {
    clearInterval(spinnerInterval);
    spinnerInterval = null;
    process.stdout.write('\n');
  }
}
