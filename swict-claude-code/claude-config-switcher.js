#!/usr/bin/env node

/**
 * Claude Code 模型服务商配置切换工具 - 主程序 (重构版 v2.0)
 *
 * 本程序用于管理多个 Claude 模型服务商配置，支持：
 * - 添加、删除、切换、查看多个服务商配置
 * - 加密存储敏感信息（API Key）
 * - 交互式菜单和命令行操作
 * - 安全权限管理（配置文件权限 600）
 *
 * 模块化架构：
 * - src/configManager.js: 配置管理（读写、加密）
 * - src/validators.js: 输入验证
 * - src/ui.js: 用户界面输出
 * - src/constants.js: 常量定义
 *
 * 主要改进：
 * 1. 模块化重构 - 关注点分离
 * 2. 消除重复代码 - 提取通用函数
 * 3. 常量提取 - 魔法数字常量化
 * 4. 错误处理增强 - try-catch 和详细日志
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 引入模块化组件
const configManager = require('./src/configManager');
const validators = require('./src/validators');
const ui = require('./src/ui');
const constants = require('./src/constants');
const updateChecker = require('./src/updateChecker');
const { COLORS } = constants;

// 获取版本号
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));
const VERSION = '1.1.0';

// 创建 readline 接口用于交互式输入
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 向后兼容的封装函数
const question = (query) => new Promise(resolve => rl.question(query, resolve));

// ===========================================
// 加密相关功能
// ===========================================

/**
 * 生成或获取加密密钥（32字节，用于 AES-256）
 * @returns {Buffer} 32字节加密密钥
 */
function getEncryptionKey() {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const crypto = require('crypto');

  const ENCRYPTION_KEY_FILE = path.join(os.homedir(), '.claude', '.key');

  // 1. 尝试从环境变量读取
  const envKey = process.env.CLAUDE_SWITCHER_KEY;
  if (envKey) {
    try {
      const buffer = Buffer.from(envKey, 'base64');
      if (buffer.length === 32) {
        return buffer;
      }
      return crypto.createHash('sha256').update(envKey).digest();
    } catch (err) {
      return crypto.createHash('sha256').update(envKey).digest();
    }
  }

  // 2. 从密钥文件读取
  if (fs.existsSync(ENCRYPTION_KEY_FILE)) {
    try {
      const keyData = fs.readFileSync(ENCRYPTION_KEY_FILE, 'utf-8').trim();
      const buffer = Buffer.from(keyData, 'base64');
      if (buffer.length === 32) {
        fs.chmodSync(ENCRYPTION_KEY_FILE, 0o600);
        return buffer;
      }
    } catch (err) {
      ui.logError('读取加密密钥失败，将重新生成');
    }
  }

  // 3. 生成新密钥
  const newKey = crypto.randomBytes(32);
  try {
    fs.writeFileSync(ENCRYPTION_KEY_FILE, newKey.toString('base64'), 'utf-8');
    fs.chmodSync(ENCRYPTION_KEY_FILE, 0o600);
  } catch (err) {
    ui.logError('保存加密密钥失败', err);
  }

  return newKey;
}

/**
 * 使用 AES-256-GCM 加密文本
 * @param {string} text - 要加密的明文
 * @returns {string} 加密后的字符串
 */
function encryptText(text) {
  const crypto = require('crypto');
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * 解密文本
 * @param {string} encryptedText - 加密的字符串
 * @returns {string} 解密后的明文
 */
function decryptText(encryptedText) {
  try {
    const crypto = require('crypto');
    const key = getEncryptionKey();

    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('无效的加密数据格式');
    }

    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    throw new Error('解密失败: ' + err.message);
  }
}

/**
 * 安全显示 API Key
 * @param {string} apiKey - API Key
 * @returns {string} 格式化后的显示
 */
function getSecureApiKeyDisplay(apiKey) {
  if (!apiKey || apiKey.length < 20) {
    return '***';
  }
  const prefix = apiKey.substring(0, 8);
  const suffix = apiKey.substring(apiKey.length - 4);
  return `${prefix}***${suffix}`;
}

// ===========================================
// 业务逻辑函数
// ===========================================

/**
 * 添加新的服务商配置
 */
async function addProvider() {
  ui.printTitle('添加新的服务商配置');

  try {
    // 获取输入并进行验证
    const name = await question(`${COLORS.cyan}服务商名称${COLORS.reset} (例: openai, azure, custom): `);
    const nameValidation = validators.validateProviderName(name);

    if (!nameValidation.isValid) {
      ui.printError(nameValidation.error);
      return;
    }

    // 检查是否已存在
    const existingProviders = configManager.getAllProviders();
    if (existingProviders.success && existingProviders.data && existingProviders.data.providers && existingProviders.data.providers.some(p => p.name === nameValidation.data)) {
      ui.printError(`服务商 "${nameValidation.data}" 已存在`);
      return;
    }

    const baseUrl = await question(`${COLORS.cyan}API Base URL${COLORS.reset} (例: https://api.openai.com/v1): `);
    const baseUrlValidation = validators.validateBaseUrl(baseUrl);

    if (!baseUrlValidation.isValid) {
      ui.printError(baseUrlValidation.error);
      return;
    }

    const apiKey = await question(`${COLORS.cyan}API Key${COLORS.reset}: `);
    const apiKeyValidation = validators.validateApiKey(apiKey);

    if (!apiKeyValidation.isValid) {
      ui.printError(apiKeyValidation.error);
      return;
    }

    // 添加配置
    const result = configManager.addProvider(
      nameValidation.data,
      baseUrlValidation.data,
      apiKeyValidation.data
    );

    if (result.success) {
      ui.printSuccess(`服务商 "${nameValidation.data}" 已成功添加（已加密存储）\n`);
    } else {
      ui.printError(`添加失败: ${result.error.message}`);
    }
  } catch (err) {
    ui.logError('添加服务商时发生错误', err);
    ui.printError('添加服务商失败，请重试');
  }
}

/**
 * 列出所有服务商
 */
function listProviders() {
  try {
    const providersResult = configManager.getAllProviders();
    if (!providersResult.success) {
      ui.printError('获取服务商列表失败');
      return;
    }

    const providers = providersResult.data;
    const configResult = configManager.getCurrentConfig();
    const activeProvider = configResult.success && configResult.data.hasActiveProvider
      ? configResult.data.activeProviderName
      : null;

    if (providers.length === 0) {
      ui.printTitle('已保存的服务商配置');
      ui.printWarning('还没有添加任何服务商配置');
      ui.printInfo(`使用 ${COLORS.cyan}claude-switcher add${COLORS.reset} 添加新的配置\n`);
      return;
    }

    ui.printTitle('已保存的服务商配置');

    providers.forEach((provider, index) => {
      const isActive = activeProvider === provider.name;
      const marker = isActive ? `${COLORS.green}✅${COLORS.reset}` : '  ';
      console.log(`${marker} [${index + 1}] ${COLORS.bright}${provider.name}${COLORS.reset}`);
      console.log(`    ${COLORS.dim}Base URL:${COLORS.reset} ${provider.baseUrl}`);
      console.log(`    ${COLORS.dim}API Key:${COLORS.reset} ${getSecureApiKeyDisplay(provider.apiKey)} ${COLORS.dim}(已加密存储)${COLORS.reset}`);
      console.log(`    ${COLORS.dim}Added:${COLORS.reset} ${new Date(provider.createdAt).toLocaleString()}`);
      console.log();
    });
  } catch (err) {
    ui.logError('列出服务商时发生错误', err);
    ui.printError('列出服务商失败');
  }
}

/**
 * 切换服务商
 * @param {string} name - 服务商名称（可选）
 */
async function switchProvider(name) {
  try {
    if (!name) {
      name = await question(`${COLORS.cyan}请输入服务商名称:${COLORS.reset} `);
    }

    const nameValidation = validators.validateProviderName(name);
    if (!nameValidation.isValid) {
      ui.printError(nameValidation.error);
      return;
    }

    const providerResult = configManager.findProviderByName(nameValidation.data);
    if (!providerResult.success) {
      ui.printError(`找不到服务商 "${nameValidation.data}"`);

      const providersResult = configManager.getAllProviders();
      if (providersResult.success && providersResult.data.length > 0) {
        console.log(`\n${COLORS.cyan}可用的服务商:${COLORS.reset}`);
        providersResult.data.forEach(p => console.log(`  - ${p.name}`));
      }
      return;
    }

    const result = configManager.switchToProvider(providerResult.data);

    if (result.success) {
      ui.printTitle('配置已切换');
      console.log(`服务商: ${COLORS.bright}${result.data.providerName}${COLORS.reset}`);
      console.log(`Base URL: ${result.data.baseUrl}`);
      if (result.data.model) {
        console.log(`Model: ${result.data.model}`);
      }
      console.log(`\n${COLORS.cyan}提示:${COLORS.reset} 请重启 Claude Code 以使配置生效\n`);
    } else {
      ui.printError(`切换失败: ${result.error.message}`);
    }
  } catch (err) {
    ui.logError('切换服务商时发生错误', err);
    ui.printError('切换配置失败，请重试');
  }
}

/**
 * 删除服务商
 * @param {string} name - 服务商名称（可选）
 */
async function removeProvider(name) {
  try {
    if (!name) {
      name = await question(`${COLORS.cyan}请输入要删除的服务商名称:${COLORS.reset} `);
    }

    const nameValidation = validators.validateProviderName(name);
    if (!nameValidation.isValid) {
      ui.printError(nameValidation.error);
      return;
    }

    const providerResult = configManager.findProviderByName(nameValidation.data);
    if (!providerResult.success) {
      ui.printError(`找不到服务商 "${nameValidation.data}"`);
      return;
    }

    const confirmDelete = await question(`${COLORS.yellow}确定删除 "${nameValidation.data}"? (yes/no):${COLORS.reset} `);
    const confirmValidation = validators.validateDeleteConfirmation(confirmDelete);

    if (!confirmValidation.isValid) {
      ui.printWarning('已取消删除\n');
      return;
    }

    const result = configManager.removeProvider(nameValidation.data);

    if (result.success) {
      ui.printSuccess(`服务商 "${nameValidation.data}" 已删除\n`);
    } else {
      ui.printError(`删除失败: ${result.error.message}`);
    }
  } catch (err) {
    ui.logError('删除服务商时发生错误', err);
    ui.printError('删除服务商失败，请重试');
  }
}

/**
 * 更新服务商配置
 * @param {string} name - 服务商名称（可选）
 */
async function updateProvider(name) {
  try {
    if (!name) {
      name = await question(`${COLORS.cyan}请输入要更新的服务商名称:${COLORS.reset} `);
    }

    const nameValidation = validators.validateProviderName(name);
    if (!nameValidation.isValid) {
      ui.printError(nameValidation.error);
      return;
    }

    const providerResult = configManager.findProviderByName(nameValidation.data);
    if (!providerResult.success) {
      ui.printError(`找不到服务商 "${nameValidation.data}"`);
      return;
    }

    const provider = providerResult.data;
    ui.printTitle(`更新服务商: ${nameValidation.data}`);

    console.log(`${COLORS.cyan}保持不变请直接按回车，否则输入新值${COLORS.reset}\n`);

    const updates = {};

    // 询问是否更新 Base URL
    const baseUrlInput = await question(`Base URL [${provider.baseUrl}]: `);
    if (baseUrlInput.trim()) {
      const baseUrlValidation = validators.validateBaseUrl(baseUrlInput);
      if (!baseUrlValidation.isValid) {
        ui.printError(baseUrlValidation.error);
        return;
      }
      updates.baseUrl = baseUrlValidation.data;
    }

    // 询问是否更新 API Key
    const apiKeyInput = await question(`API Key [${COLORS.dim}已隐藏${COLORS.reset}]: `);
    if (apiKeyInput.trim()) {
      const apiKeyValidation = validators.validateApiKey(apiKeyInput);
      if (!apiKeyValidation.isValid) {
        ui.printError(apiKeyValidation.error);
        return;
      }
      updates.apiKey = apiKeyValidation.data;
    }

    // 询问是否更新 Model
    const modelInput = await question(`Model [${provider.model || '未设置'}]: `);
    if (modelInput !== '' || (modelInput === '' && provider.model)) {
      // 如果输入非空，更新；如果输入为空且当前有model，删除
      if (modelInput.trim()) {
        updates.model = modelInput.trim();
      } else if (provider.model) {
        // 用户清空了模型字段
        const confirm = await question(`${COLORS.yellow}确定删除模型设置? (yes/no):${COLORS.reset} `);
        if (confirm.toLowerCase() === 'yes' || confirm.toLowerCase() === 'y') {
          updates.model = '';
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      ui.printWarning('没有任何更改\n');
      return;
    }

    const result = configManager.updateProvider(nameValidation.data, updates);

    if (result.success) {
      ui.printSuccess(`服务商 "${nameValidation.data}" 已成功更新\n`);
      console.log(`${COLORS.dim}更新的字段:${COLORS.reset}`);
      if (updates.baseUrl) console.log(`  - Base URL: ${updates.baseUrl}`);
      if (updates.apiKey) console.log(`  - API Key: ${COLORS.dim}已更新${COLORS.reset}`);
      if (updates.model !== undefined) {
        console.log(`  - Model: ${updates.model || COLORS.dim + '已删除' + COLORS.reset}`);
      }
      console.log();
    } else {
      ui.printError(`更新失败: ${result.error.message}`);
    }
  } catch (err) {
    ui.logError('更新服务商时发生错误', err);
    ui.printError('更新服务商失败，请重试');
  }
}

/**
 * 显示当前配置
 */
function showCurrentConfig() {
  try {
    const result = configManager.getCurrentConfig();

    if (!result.success) {
      ui.printError('获取当前配置失败');
      return;
    }

    const data = result.data;

    if (!data.hasActiveProvider) {
      ui.printTitle('当前激活配置');
      ui.printWarning('当前没有激活任何服务商配置');
      ui.printInfo(`使用 ${COLORS.cyan}claude-switcher switch <名称>${COLORS.reset} 激活配置\n`);
      return;
    }

    if (!data.exists) {
      ui.printTitle('当前激活配置');
      ui.printWarning('当前激活的服务商不存在');
      ui.printInfo(`使用 ${COLORS.cyan}claude-switcher list${COLORS.reset} 查看可用的服务商\n`);
      return;
    }

    ui.printTitle('当前激活配置');
    console.log(`服务商名称: ${COLORS.bright}${data.provider.name}${COLORS.reset}`);
    console.log(`ANTHROPIC_AUTH_TOKEN: ${data.apiKey ? data.apiKey.substring(0, 10) + '...' + data.apiKey.substring(data.apiKey.length - 4) : '未设置'}`);
    console.log(`ANTHROPIC_BASE_URL: ${data.baseUrl || '未设置'}`);
    if (data.model) {
      console.log(`Model: ${data.model}`);
    }
    console.log(`\n${COLORS.dim}配置文件位置:${COLORS.reset}`);
    console.log(`  ~/.claude/settings.json\n`);
    console.log(`${COLORS.cyan}提示:${COLORS.reset} 如果 Claude Code 无法读取配置，请重启 Claude Code 或使用工具直接启动\n`);
  } catch (err) {
    ui.logError('显示当前配置时发生错误', err);
    ui.printError('显示当前配置失败');
  }
}

/**
 * 交互式菜单
 */
/**
 * 显示增强的交互式菜单
 */
async function interactiveMode() {
  let searchTerm = '';
  let filteredProviders = [];
  
  while (true) {
    // 清屏（在支持的终端中）
    if (process.stdout.isTTY) {
      console.clear();
    }
    
    console.log(`\n${COLORS.cyan}${COLORS.bright}Claude Code 配置切换工具${COLORS.reset}`);
    console.log(`${COLORS.dim}==================================${COLORS.reset}\n`);

    // 显示当前状态
    try {
      const configResult = configManager.getCurrentConfig();
      if (configResult.success && configResult.data.hasActiveProvider && configResult.data.exists) {
        const { provider } = configResult.data;
        console.log(`${COLORS.green}当前激活:${COLORS.reset} ${COLORS.bright}${provider.name}${COLORS.reset}`);
        console.log(`${COLORS.dim}Base URL: ${provider.baseUrl}${COLORS.reset}\n`);
      } else {
        console.log(`${COLORS.yellow}当前: 未配置任何服务商${COLORS.reset}\n`);
      }
    } catch (err) {
      console.log(`${COLORS.red}状态: 读取配置失败${COLORS.reset}\n`);
    }

    // 获取服务商列表用于搜索
    try {
      const providersResult = configManager.getAllProviders();
      if (providersResult.success) {
        filteredProviders = searchTerm 
          ? providersResult.data.providers.filter(p => 
              p.name.toLowerCase().includes(searchTerm.toLowerCase())
            )
          : providersResult.data.providers;
      }
    } catch (err) {
      // 忽略错误
    }

    // 显示菜单选项
    console.log('请选择操作:');
    console.log(`  ${COLORS.cyan}1${COLORS.reset} - 列出所有配置${filteredProviders && filteredProviders.length > 0 ? ` (${filteredProviders.length}个)` : ''}`);
    console.log(`  ${COLORS.cyan}2${COLORS.reset} - 添加新配置`);
    console.log(`  ${COLORS.cyan}3${COLORS.reset} - 切换配置${searchTerm ? ` (搜索: "${searchTerm}")` : ''}`);
    console.log(`  ${COLORS.cyan}4${COLORS.reset} - 删除配置`);
    console.log(`  ${COLORS.cyan}5${COLORS.reset} - 显示当前配置`);
    console.log(`  ${COLORS.cyan}6${COLORS.reset} - 更新配置`);
    console.log(`  ${COLORS.cyan}7${COLORS.reset} - 验证配置连接`);
    console.log(`  ${COLORS.cyan}8${COLORS.reset} - 系统状态检查`);
    console.log(`  ${COLORS.cyan}9${COLORS.reset} - 搜索/筛选 (当前: ${searchTerm || '无'})`);
    console.log(`  ${COLORS.cyan}10${COLORS.reset} - 帮助`);
    console.log(`  ${COLORS.cyan}0${COLORS.reset} - 退出\n`);

    const choice = await question(`${COLORS.cyan}请输入选择 (0-10):${COLORS.reset} `);

    try {
      switch (choice.trim()) {
        case '1':
          await listProvidersInteractive(searchTerm);
          break;
        case '2':
          await addProvider();
          break;
        case '3':
          if (filteredProviders && filteredProviders.length > 0) {
            await switchProviderInteractive(filteredProviders);
          } else {
            const switchName = await question(`\n${COLORS.cyan}请输入要切换的服务商名称:${COLORS.reset} `);
            if (switchName.trim()) {
              await switchProvider(switchName.trim());
            }
          }
          break;
        case '4':
          if (filteredProviders && filteredProviders.length > 0) {
            await removeProviderInteractive(filteredProviders);
          } else {
            const removeName = await question(`\n${COLORS.cyan}请输入要删除的服务商名称:${COLORS.reset} `);
            if (removeName.trim()) {
              await removeProvider(removeName.trim());
            }
          }
          break;
        case '5':
          showCurrentConfig();
          break;
        case '6':
          if (filteredProviders && filteredProviders.length > 0) {
            await updateProviderInteractive(filteredProviders);
          } else {
            const updateName = await question(`\n${COLORS.cyan}请输入要更新的服务商名称:${COLORS.reset} `);
            if (updateName.trim()) {
              await updateProvider(updateName.trim());
            }
          }
          break;
        case '7':
          await validateConfigsInteractive();
          break;
        case '8':
          await showSystemHealth();
          break;
        case '9':
          searchTerm = await question(`\n${COLORS.cyan}请输入搜索关键词 (留空清除搜索):${COLORS.reset} `);
          searchTerm = searchTerm.trim();
          break;
        case '10':
          ui.showHelp();
          await question(`\n${COLORS.dim}按回车键继续...${COLORS.reset}`);
          break;
        case '0':
        case 'q':
        case 'quit':
        case 'exit':
          const confirm = await question(`\n${COLORS.cyan}确认退出? (y/N):${COLORS.reset} `);
          if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
            console.log(`\n${COLORS.green}再见！${COLORS.reset}\n`);
            return;
          }
          break;
        default:
          ui.printError('无效的选择，请重试');
          await question(`\n${COLORS.dim}按回车键继续...${COLORS.reset}`);
      }
    } catch (err) {
      ui.logError('处理菜单选择时发生错误', err);
      ui.printError(`处理选择时发生错误: ${err.message}`);
      await question(`\n${COLORS.dim}按回车键继续...${COLORS.reset}`);
    }
  }
}

/**
 * 交互式列出服务商（支持搜索）
 */
async function listProvidersInteractive(searchTerm = '') {
  const providersResult = configManager.getAllProviders();
  
  if (!providersResult.success) {
    ui.printError('获取服务商列表失败');
    return;
  }

  let providers = providersResult.data.providers;
  
  // 应用搜索过滤
  if (searchTerm) {
    providers = providers.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    console.log(`\n${COLORS.cyan}搜索结果 (${providers.length}个):${COLORS.reset}\n`);
  } else {
    console.log(`\n${COLORS.cyan}已保存的服务商配置 (${providers.length}个):${COLORS.reset}\n`);
  }

  if (providers.length === 0) {
    if (searchTerm) {
      console.log(`${COLORS.yellow}未找到匹配的服务商${COLORS.reset}`);
    } else {
      console.log(`${COLORS.yellow}暂无配置，请先添加服务商${COLORS.reset}`);
    }
    await question(`\n${COLORS.dim}按回车键继续...${COLORS.reset}`);
    return;
  }

  providers.forEach((provider, index) => {
    const marker = provider.isActive ? '👉' : '  ';
    console.log(`${marker} [${index + 1}] ${COLORS.bright}${provider.name}${COLORS.reset}`);
    console.log(`    ${COLORS.dim}Base URL:${COLORS.reset} ${provider.baseUrl}`);
    console.log(`    ${COLORS.dim}API Key:${COLORS.reset} ${getSecureApiKeyDisplay(provider.apiKey)} ${COLORS.dim}(已加密存储)${COLORS.reset}`);
    console.log(`    ${COLORS.dim}Added:${COLORS.reset} ${new Date(provider.createdAt).toLocaleString()}`);
    console.log();
  });

  await question(`${COLORS.dim}按回车键继续...${COLORS.reset}`);
}

/**
 * 交互式切换服务商
 */
async function switchProviderInteractive(providers) {
  console.log(`\n${COLORS.cyan}${COLORS.bright}请选择服务商 (↑↓ 移动, 回车确认, Ctrl+C 取消)${COLORS.reset}\n`);
  
  const selectedProvider = await selectFromList(providers, 'name');
  if (selectedProvider) {
    await switchProvider(selectedProvider.name);
  }
}

/**
 * 交互式删除服务商
 */
async function removeProviderInteractive(providers) {
  console.log(`\n${COLORS.cyan}${COLORS.bright}请选择要删除的服务商${COLORS.reset}\n`);
  
  const selectedProvider = await selectFromList(providers, 'name');
  if (selectedProvider) {
    await removeProvider(selectedProvider.name);
  }
}

/**
 * 交互式更新服务商
 */
async function updateProviderInteractive(providers) {
  console.log(`\n${COLORS.cyan}${COLORS.bright}请选择要更新的服务商${COLORS.reset}\n`);
  
  const selectedProvider = await selectFromList(providers, 'name');
  if (selectedProvider) {
    await updateProvider(selectedProvider.name);
  }
}

/**
 * 交互式验证配置
 */
async function validateConfigsInteractive() {
  const providersResult = configManager.getAllProviders();
  
  if (!providersResult.success || providersResult.data.providers.length === 0) {
    ui.printError('没有可验证的服务商配置');
    return;
  }

  console.log(`\n${COLORS.cyan}选择要验证的服务商 (可多选，空格分隔):${COLORS.reset}\n`);
  
  const selectedProviders = await selectMultipleFromList(providersResult.data.providers, 'name');
  if (selectedProviders.length > 0) {
    await validateProviders(selectedProviders);
  }
}

/**
 * 从列表中选择单个项目
 */
async function selectFromList(items, displayField = 'name') {
  if (items.length === 0) return null;
  
  const selectedIndex = 0;
  
  // 简单的选择实现（使用数字选择）
  while (true) {
    console.log(`${COLORS.cyan}可用选项:${COLORS.reset}\n`);
    
    items.forEach((item, index) => {
      const marker = index === selectedIndex ? '▸' : ' ';
      const display = typeof item === 'object' ? item[displayField] : item;
      console.log(`${marker} [${index + 1}] ${display}`);
    });
    
    console.log('');
    const input = await question(`${COLORS.cyan}请选择 (1-${items.length}, 0取消):${COLORS.reset} `);
    
    const choice = parseInt(input.trim());
    if (choice === 0) {
      return null;
    } else if (choice >= 1 && choice <= items.length) {
      return items[choice - 1];
    } else {
      console.log(`${COLORS.red}无效选择，请重试${COLORS.reset}`);
    }
  }
}

/**
 * 从列表中选择多个项目
 */
async function selectMultipleFromList(items, displayField = 'name') {
  if (items.length === 0) return [];
  
  console.log(`${COLORS.cyan}可用选项:${COLORS.reset}\n`);
  
  items.forEach((item, index) => {
    const display = typeof item === 'object' ? item[displayField] : item;
    console.log(`  [${index + 1}] ${display}`);
  });
  
  console.log('');
  const input = await question(`${COLORS.cyan}请选择 (1-${items.length}, 可多选，用空格分隔):${COLORS.reset} `);
  
  const choices = input.trim().split(/\s+/).map(n => parseInt(n)).filter(n => n >= 1 && n <= items.length);
  
  return choices.map(choice => items[choice - 1]);
}

/**
 * 测试 API 连接
 * @param {Object} provider - 服务商对象
 * @returns {Promise<boolean>} 是否连接成功
 */
async function testConnection(provider) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(false);
    }, constants.API_TIMEOUT);

    try {
      const cmd = `curl -s -o /dev/null -w "%{http_code}" -X POST "${provider.baseUrl}/messages" -H "x-api-key: ${provider.apiKey}" -H "anthropic-version: ${constants.ANTHROPIC_API_VERSION}" -H "content-type: application/json" -d '{"model":"${constants.TEST_MODEL}","max_tokens":${constants.TEST_MAX_TOKENS},"messages":[{"role":"user","content":"test"}]}'`;

      const result = execSync(cmd, { timeout: constants.CURL_TIMEOUT, stdio: 'pipe' }).toString().trim();
      clearTimeout(timeout);

      const statusCode = parseInt(result);
      resolve(statusCode >= constants.HTTP_SUCCESS_MIN && statusCode < constants.HTTP_SUCCESS_MAX);
    } catch (err) {
      clearTimeout(timeout);
      resolve(false);
    }
  });
}

/**
 * 交互式选择菜单
 */
async function interactiveSelect() {
  const providersResult = configManager.getAllProviders();

  if (!providersResult.success || providersResult.data.length === 0) {
    ui.printError('没有可用的服务商配置');
    console.log(`\n请先使用以下命令添加服务商：`);
    console.log(`${COLORS.cyan}ccs add${COLORS.reset}\n`);
    process.exit(1);
  }

  let selectedIndex = 0;
  const stdin = process.stdin;

  try {
    if (stdin.isTTY) {
      stdin.setRawMode(true);
      stdin.resume();
    }

    return new Promise((resolve) => {
      const drawMenu = () => {
        process.stdout.write('\x1Bc');
        console.log(`${COLORS.cyan}${COLORS.bright}请选择服务商 (↑↓ 移动, 回车确认, Ctrl+C 取消)${COLORS.reset}\n`);

        providersResult.data.forEach((provider, index) => {
          if (index === selectedIndex) {
            console.log(`${COLORS.bgBlue}${COLORS.white}${COLORS.bright} ▸ ${provider.name} ${COLORS.reset}`);
          } else {
            console.log(`   ${provider.name}`);
          }
        });
      };

      const handleKeypress = (chunk) => {
        const key = chunk[0];

        if (chunk.length === 3 && chunk[0] === 27 && chunk[1] === 91) {
          if (chunk[2] === 65) {
            selectedIndex = (selectedIndex - 1 + providersResult.data.length) % providersResult.data.length;
            drawMenu();
          } else if (chunk[2] === 66) {
            selectedIndex = (selectedIndex + 1) % providersResult.data.length;
            drawMenu();
          }
        } else if (key === 13) {
          if (stdin.isTTY) {
            stdin.setRawMode(false);
            stdin.pause();
          }
          stdin.removeListener('data', handleKeypress);
          resolve(providersResult.data[selectedIndex]);
        } else if (key === 3) {
          if (stdin.isTTY) {
            stdin.setRawMode(false);
            stdin.pause();
          }
          console.log(`\n${COLORS.yellow}已取消${COLORS.reset}`);
          process.exit(0);
        }
      };

      stdin.on('data', handleKeypress);
      drawMenu();
    });
  } catch (err) {
    if (stdin.isTTY) {
      stdin.setRawMode(false);
    }
    throw err;
  }
}

/**
 * 检查npm上是否有新版本
 * @returns {Promise<{hasUpdate: boolean, latestVersion: string, currentVersion: string}>}
 */
async function checkForUpdates() {
  return await updateChecker.checkUpdate(VERSION);
}

/**
 * 显示版本更新通知
 */
async function showUpdateNotification() {
  const updateInfo = await checkForUpdates();

  if (updateInfo.hasUpdate) {
    console.log(`\n${COLORS.yellow}${COLORS.bright}╔════════════════════════════════════╗${COLORS.reset}`);
    console.log(`${COLORS.yellow}${COLORS.bright}║  🎉 发现新版本可用！                ║${COLORS.reset}`);
    console.log(`${COLORS.yellow}${COLORS.bright}╠════════════════════════════════════╣${COLORS.reset}`);
    console.log(`${COLORS.yellow}║  当前版本: v${updateInfo.currentVersion}${' '.repeat(20 - updateInfo.currentVersion.length)}║${COLORS.reset}`);
    console.log(`${COLORS.yellow}║  最新版本: v${updateInfo.latestVersion}${' '.repeat(20 - updateInfo.latestVersion.length)}║${COLORS.reset}`);
    console.log(`${COLORS.yellow}${COLORS.bright}╠════════════════════════════════════╣${COLORS.reset}`);
    console.log(`${COLORS.yellow}║  运行: claude-switcher update       ║${COLORS.reset}`);
    console.log(`${COLORS.yellow}║  或: npm install -g claude-config-switcher${COLORS.reset}`);
    console.log(`${COLORS.yellow}${COLORS.bright}╚════════════════════════════════════╝${COLORS.reset}\n`);
  }
}

/**
 * 执行更新
 */
async function updateTool() {
  ui.printTitle('更新 Claude Config Switcher');

  console.log('正在检查最新版本...\n');

  const updateInfo = await updateChecker.checkUpdate(VERSION, true); // 强制检查

  if (!updateInfo.hasUpdate) {
    ui.printSuccess(`当前已是最新版本 v${VERSION}`);
    return;
  }

  console.log(`发现新版本: v${updateInfo.latestVersion} (当前: v${updateInfo.currentVersion})\n`);

  const confirm = await question(`${COLORS.cyan}是否现在更新? (y/n): ${COLORS.reset}`);

  if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
    console.log('已取消更新');
    return;
  }

  try {
    ui.printInfo('正在更新...');

    // 检查是否通过npm安装
    const npmPrefix = execSync('npm config get prefix', { encoding: 'utf-8' }).trim();
    const globalInstallPath = path.join(npmPrefix, 'lib', 'node_modules', 'claude-config-switcher');

    if (fs.existsSync(globalInstallPath)) {
      execSync('npm update -g claude-config-switcher', { stdio: 'inherit' });
      ui.printSuccess('更新完成！');
      console.log(`\n${COLORS.green}新版本已安装，请重新运行命令${COLORS.reset}\n`);
    } else {
      ui.printError('未通过npm全局安装，请手动更新:');
      console.log('  npm install -g claude-config-switcher\n');
    }
  } catch (err) {
    ui.printError('更新失败');
    console.log(`错误: ${err.message}\n`);
  }
}

/**
 * 验证配置文件完整性
 */
async function verifyConfigs() {
  ui.printTitle('验证配置文件完整性');
  
  console.log('正在检查配置文件完整性...\n');
  
  const switcherConfigPath = path.join(os.homedir(), '.claude', 'model-switcher.json');
  const claudeConfigPath = path.join(os.homedir(), '.claude', 'settings.json');
  
  const configs = [
    { name: '服务商配置', path: switcherConfigPath },
    { name: 'Claude配置', path: claudeConfigPath }
  ];
  
  let allValid = true;
  
  for (const config of configs) {
    console.log(`🔍 检查 ${config.name}...`);
    
    const result = configManager.verifyConfigIntegrity(config.path);
    
    if (result.isValid && !result.isTampered) {
      console.log(`   ${COLORS.green}✅${COLORS.reset} ${result.message}`);
    } else if (result.isTampered) {
      console.log(`   ${COLORS.red}⚠️${COLORS.reset} ${result.message}`);
      console.log(`   ${COLORS.yellow}💡 提示: 运行 "claude-switcher repair" 来修复${COLORS.reset}`);
      allValid = false;
    } else {
      console.log(`   ${COLORS.red}❌${COLORS.reset} ${result.message}`);
      allValid = false;
    }
    
    if (result.currentHash && result.storedHash) {
      console.log(`   ${COLORS.dim}当前哈希: ${result.currentHash.substring(0, 16)}...${COLORS.reset}`);
      console.log(`   ${COLORS.dim}存储哈希: ${result.storedHash.substring(0, 16)}...${COLORS.reset}`);
    }
    console.log('');
  }
  
  if (allValid) {
    ui.printSuccess('所有配置文件完整性验证通过！');
  } else {
    ui.printError('发现配置文件完整性问题');
  }
}

/**
 * 修复配置文件完整性
 */
async function repairConfigs() {
  ui.printTitle('修复配置文件完整性');
  
  console.log('正在修复配置文件完整性...\n');
  
  const switcherConfigPath = path.join(os.homedir(), '.claude', 'model-switcher.json');
  const claudeConfigPath = path.join(os.homedir(), '.claude', 'settings.json');
  
  const configs = [
    { name: '服务商配置', path: switcherConfigPath },
    { name: 'Claude配置', path: claudeConfigPath }
  ];
  
  let repairCount = 0;
  
  for (const config of configs) {
    console.log(`🔧 修复 ${config.name}...`);
    
    const result = configManager.repairConfigIntegrity(config.path);
    
    if (result.success) {
      console.log(`   ${COLORS.green}✅${COLORS.reset} ${result.message}`);
      if (result.backupCreated) {
        console.log(`   ${COLORS.cyan}ℹ️${COLORS.reset} 已创建备份文件`);
      }
      repairCount++;
    } else {
      console.log(`   ${COLORS.red}❌${COLORS.reset} ${result.message}`);
    }
    console.log('');
  }
  
  if (repairCount > 0) {
    ui.printSuccess(`已修复 ${repairCount} 个配置文件的完整性问题！`);
  } else {
    ui.printInfo('没有需要修复的配置文件');
  }
}

/**
 * 配置向导
 */
async function runConfigWizard() {
  ui.printTitle('Claude Code 配置向导');
  
  console.log('欢迎使用 Claude Code 配置切换工具！');
  console.log('这个向导将帮助您完成初始配置。\n');
  
  // 检查是否已有配置
  const providersResult = configManager.getAllProviders();
  const hasExistingConfig = providersResult.success && providersResult.data && providersResult.data.providers && providersResult.data.providers.length > 0;
  
  if (hasExistingConfig) {
    console.log(`${COLORS.yellow}检测到您已有配置：${COLORS.reset}`);
    providersResult.data.providers.forEach((provider, index) => {
      console.log(`  ${index + 1}. ${provider.name} (${provider.baseUrl})`);
    });
    console.log('');
    
    const overwrite = await question(`${COLORS.cyan}是否要重新配置? (y/N):${COLORS.reset} `);
    if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
      console.log('\n配置向导已取消。');
      return;
    }
  }
  
  // 步骤1: 选择配置方式
  console.log(`${COLORS.bright}步骤 1/4: 选择配置方式${COLORS.reset}\n`);
  console.log('请选择您想要使用的配置方式：');
  console.log('  1 - 使用预设模板（推荐）');
  console.log('  2 - 手动配置');
  console.log('  3 - 从文件导入');
  
  const configMethod = await question(`\n${COLORS.cyan}请选择 (1-3):${COLORS.reset} `);
  
  switch (configMethod.trim()) {
    case '1':
      await configureFromTemplate();
      break;
    case '2':
      await configureManually();
      break;
    case '3':
      await configureFromFile();
      break;
    default:
      console.log(`${COLORS.yellow}无效选择，将使用手动配置${COLORS.reset}\n`);
      await configureManually();
  }
  
  // 步骤4: 完成配置
  console.log(`\n${COLORS.bright}步骤 4/4: 完成配置${COLORS.reset}\n`);
  console.log(`${COLORS.green}🎉 配置完成！${COLORS.reset}`);
  console.log('\n接下来您可以：');
  console.log('  - 使用 "ccs list" 查看所有配置');
  console.log('  - 使用 "ccs switch <名称>" 切换配置');
  console.log('  - 使用 "ccs interactive" 进入交互模式');
  console.log('  - 使用 "ccs validate" 验证配置连接\n');
  
  // 询问是否安装自动补全
  const installCompletion = await question(`${COLORS.cyan}是否安装 Shell 自动补全? (Y/n):${COLORS.reset} `);
  if (installCompletion.toLowerCase() !== 'n' && installCompletion.toLowerCase() !== 'no') {
    await installShellCompletion();
  }
  
  console.log(`\n${COLORS.green}配置向导已完成！享受使用 Claude Code 吧！${COLORS.reset}\n`);
}

/**
 * 使用预设模板配置
 */
async function configureFromTemplate() {
  console.log(`\n${COLORS.bright}步骤 2/4: 选择预设模板${COLORS.reset}\n`);
  
  const templates = [
    {
      name: 'Anthropic Official',
      description: 'Anthropic 官方 API',
      baseUrl: 'https://api.anthropic.com',
      model: 'claude-3-sonnet-20241022'
    },
    {
      name: 'Azure OpenAI',
      description: 'Azure OpenAI Service (Anthropic 兼容)',
      baseUrl: 'https://your-resource.openai.azure.com',
      model: 'claude-3-sonnet-20241022'
    },
    {
      name: 'Local Development',
      description: '本地开发服务器',
      baseUrl: 'http://localhost:8000',
      model: 'claude-3-sonnet-20241022'
    },
    {
      name: 'Custom Provider',
      description: '自定义 API 提供商',
      baseUrl: '',
      model: ''
    }
  ];
  
  console.log('请选择一个模板：');
  templates.forEach((template, index) => {
    console.log(`  ${index + 1} - ${template.name}`);
    console.log(`      ${template.description}`);
    if (template.baseUrl) {
      console.log(`      URL: ${template.baseUrl}`);
    }
    console.log('');
  });
  
  const templateChoice = await question(`${COLORS.cyan}请选择 (1-${templates.length}):${COLORS.reset} `);
  const templateIndex = parseInt(templateChoice.trim()) - 1;
  
  if (templateIndex < 0 || templateIndex >= templates.length) {
    console.log(`${COLORS.red}无效选择，将使用自定义配置${COLORS.reset}`);
    await configureManually();
    return;
  }
  
  const selectedTemplate = templates[templateIndex];
  
  console.log(`\n${COLORS.bright}步骤 3/4: 配置详细信息${COLORS.reset}\n`);
  console.log(`已选择模板: ${COLORS.cyan}${selectedTemplate.name}${COLORS.reset}\n`);
  
  // 获取服务商名称
  const providerName = await question(`${COLORS.cyan}服务商名称 (默认: ${selectedTemplate.name}):${COLORS.reset} `) || selectedTemplate.name;
  
  // 获取 Base URL
  let baseUrl = selectedTemplate.baseUrl;
  if (selectedTemplate.name === 'Custom Provider' || selectedTemplate.baseUrl === '') {
    baseUrl = await question(`${COLORS.cyan}Base URL:${COLORS.reset} `);
  } else {
    const customUrl = await question(`${COLORS.cyan}Base URL (默认: ${selectedTemplate.baseUrl}):${COLORS.reset} `);
    if (customUrl.trim()) {
      baseUrl = customUrl.trim();
    }
  }
  
  // 获取 API Key
  const apiKey = await question(`${COLORS.cyan}API Key:${COLORS.reset} `);
  
  // 获取模型（可选）
  let model = selectedTemplate.model;
  const customModel = await question(`${COLORS.cyan}模型 (可选，默认: ${selectedTemplate.model || '未设置'}):${COLORS.reset} `);
  if (customModel.trim()) {
    model = customModel.trim();
  }
  
  // 保存配置
  const result = configManager.addProvider(providerName.trim(), baseUrl.trim(), apiKey.trim(), model);
  
  if (result.success) {
    console.log(`\n${COLORS.green}✅ 配置已保存: ${providerName}${COLORS.reset}`);
    
    // 询问是否激活
    const activate = await question(`${COLORS.cyan}是否现在激活此配置? (Y/n):${COLORS.reset} `);
    if (activate.toLowerCase() !== 'n' && activate.toLowerCase() !== 'no') {
      const switchResult = configManager.switchToProvider(providerName.trim());
      if (switchResult.success) {
        console.log(`${COLORS.green}✅ 已激活配置: ${providerName}${COLORS.reset}`);
      } else {
        console.log(`${COLORS.red}❌ 激活失败: ${switchResult.error}${COLORS.reset}`);
      }
    }
  } else {
    console.log(`${COLORS.red}❌ 配置保存失败: ${result.error}${COLORS.reset}`);
  }
}

/**
 * 手动配置
 */
async function configureManually() {
  console.log(`\n${COLORS.bright}步骤 2/4: 手动配置${COLORS.reset}\n`);
  
  // 获取服务商名称
  const providerName = await question(`${COLORS.cyan}服务商名称:${COLORS.reset} `);
  
  // 获取 Base URL
  const baseUrl = await question(`${COLORS.cyan}Base URL:${COLORS.reset} `);
  
  // 获取 API Key
  const apiKey = await question(`${COLORS.cyan}API Key:${COLORS.reset} `);
  
  // 获取模型（可选）
  const model = await question(`${COLORS.cyan}模型 (可选):${COLORS.reset} `);
  
  console.log(`\n${COLORS.bright}步骤 3/4: 确认配置${COLORS.reset}\n`);
  console.log('请确认您的配置信息：');
  console.log(`  服务商名称: ${COLORS.cyan}${providerName}${COLORS.reset}`);
  console.log(`  Base URL: ${COLORS.cyan}${baseUrl}${COLORS.reset}`);
  console.log(`  API Key: ${COLORS.cyan}${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}${COLORS.reset}`);
  if (model.trim()) {
    console.log(`  模型: ${COLORS.cyan}${model}${COLORS.reset}`);
  }
  
  const confirm = await question(`\n${COLORS.cyan}确认保存? (Y/n):${COLORS.reset} `);
  
  if (confirm.toLowerCase() === 'n' || confirm.toLowerCase() === 'no') {
    console.log('配置已取消。');
    return;
  }
  
  // 保存配置
  const result = configManager.addProvider(providerName.trim(), baseUrl.trim(), apiKey.trim(), model.trim() || undefined);
  
  if (result.success) {
    console.log(`\n${COLORS.green}✅ 配置已保存${COLORS.reset}`);
    
    // 询问是否激活
    const activate = await question(`${COLORS.cyan}是否现在激活此配置? (Y/n):${COLORS.reset} `);
    if (activate.toLowerCase() !== 'n' && activate.toLowerCase() !== 'no') {
      const switchResult = configManager.switchToProvider(providerName.trim());
      if (switchResult.success) {
        console.log(`${COLORS.green}✅ 已激活配置${COLORS.reset}`);
      } else {
        console.log(`${COLORS.red}❌ 激活失败: ${switchResult.error}${COLORS.reset}`);
      }
    }
  } else {
    console.log(`${COLORS.red}❌ 配置保存失败: ${result.error}${COLORS.reset}`);
  }
}

/**
 * 从文件导入配置
 */
async function configureFromFile() {
  console.log(`\n${COLORS.bright}步骤 2/4: 从文件导入${COLORS.reset}\n`);
  
  const filePath = await question(`${COLORS.cyan}配置文件路径 (JSON格式):${COLORS.reset} `);
  
  try {
    if (!fs.existsSync(filePath.trim())) {
      console.log(`${COLORS.red}❌ 文件不存在: ${filePath}${COLORS.reset}`);
      return;
    }
    
    const fileContent = fs.readFileSync(filePath.trim(), 'utf-8');
    const config = JSON.parse(fileContent);
    
    console.log(`\n${COLORS.bright}步骤 3/4: 确认导入${COLORS.reset}\n`);
    console.log('找到以下配置：');
    
    if (config.providers && Array.isArray(config.providers)) {
      config.providers.forEach((provider, index) => {
        console.log(`  ${index + 1}. ${provider.name} (${provider.baseUrl})`);
      });
    } else {
      console.log(`${COLORS.red}❌ 配置文件格式无效${COLORS.reset}`);
      return;
    }
    
    const confirm = await question(`\n${COLORS.cyan}确认导入这些配置? (y/N):${COLORS.reset} `);
    
    if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
      // 导入配置
      let successCount = 0;
      for (const provider of config.providers) {
        const result = configManager.addProvider(
          provider.name,
          provider.baseUrl,
          provider.apiKey,
          provider.model
        );
        if (result.success) {
          successCount++;
        }
      }
      
      console.log(`\n${COLORS.green}✅ 成功导入 ${successCount}/${config.providers.length} 个配置${COLORS.reset}`);
    } else {
      console.log('导入已取消。');
    }
  } catch (err) {
    console.log(`${COLORS.red}❌ 导入失败: ${err.message}${COLORS.reset}`);
  }
}

/**
 * 导出配置到文件
 */
async function exportConfig() {
  ui.printTitle('导出配置');
  
  try {
    // 获取所有配置
    const providersResult = configManager.getAllProviders();
    if (!providersResult.success || !providersResult.data || !providersResult.data.providers || !providersResult.data.providers.length) {
      ui.printError('没有可导出的配置');
      return;
    }
    
    console.log('请选择导出格式：');
    console.log('  1 - JSON格式（推荐）');
    console.log('  2 - YAML格式');
    console.log('  3 - 加密JSON（保护敏感信息）');
    
    const formatChoice = await question(`${COLORS.cyan}请选择 (1-3):${COLORS.reset} `);
    
    let format = 'json';
    switch (formatChoice.trim()) {
      case '1':
        format = 'json';
        break;
      case '2':
        format = 'yaml';
        break;
      case '3':
        format = 'encrypted';
        break;
      default:
        console.log(`${COLORS.yellow}无效选择，将使用JSON格式${COLORS.reset}`);
        format = 'json';
    }
    
    // 获取输出文件路径
    const defaultFileName = `claude-config-${new Date().toISOString().split('T')[0]}.${format === 'yaml' ? 'yml' : 'json'}`;
    const filePath = await question(`${COLORS.cyan}输出文件路径 (默认: ${defaultFileName}):${COLORS.reset} `) || defaultFileName;
    
    // 准备导出数据
    const exportData = {
      version: VERSION,
      exportedAt: new Date().toISOString(),
      providers: providersResult.data.providers.map(provider => ({
        name: provider.name,
        baseUrl: provider.baseUrl,
        model: provider.model,
        // 对于加密导出，保留完整API Key；否则脱敏
        apiKey: format === 'encrypted' ? provider.apiKey : `${provider.apiKey.substring(0, 8)}...${provider.apiKey.substring(provider.apiKey.length - 4)}`,
        isApiKeyMasked: format !== 'encrypted',
        createdAt: provider.createdAt,
        isActive: provider.isActive
      }))
    };
    
    let content;
    if (format === 'yaml') {
      // 简单的YAML格式化
      content = `# Claude Config Switcher 导出文件\n# 版本: ${exportData.version}\n# 导出时间: ${exportData.exportedAt}\n\nproviders:\n`;
      exportData.providers.forEach(provider => {
        content += `  - name: "${provider.name}"\n    baseUrl: "${provider.baseUrl}"\n    model: "${provider.model || ''}"\n    apiKey: "${provider.apiKey}"\n    isApiKeyMasked: ${provider.isApiKeyMasked}\n    createdAt: "${provider.createdAt}"\n    isActive: ${provider.isActive}\n`;
      });
    } else if (format === 'encrypted') {
      // 加密整个配置
      const crypto = require('crypto');
      const encryptionKey = crypto.randomBytes(32).toString('hex');
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(encryptionKey, 'hex'), iv);
      
      let encrypted = cipher.update(JSON.stringify(exportData), 'utf8', 'base64');
      encrypted += cipher.final('base64');
      const authTag = cipher.getAuthTag();
      
      content = JSON.stringify({
        encrypted: true,
        version: VERSION,
        data: encrypted,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        encryptionKey: encryptionKey // 在实际应用中应该通过其他方式安全传输
      }, null, 2);
      
      console.log(`\n${COLORS.yellow}⚠️  加密密钥: ${encryptionKey}${COLORS.reset}`);
      console.log(`${COLORS.yellow}请妥善保存此密钥，导入时需要使用${COLORS.reset}\n`);
    } else {
      // 标准JSON
      content = JSON.stringify(exportData, null, 2);
    }
    
    // 写入文件
    fs.writeFileSync(filePath, content, 'utf-8');
    
    console.log(`${COLORS.green}✅ 配置已导出到: ${filePath}${COLORS.reset}`);
    console.log(`包含 ${exportData.providers.length} 个服务商配置`);
    
    if (format === 'encrypted') {
      console.log(`${COLORS.yellow}记住保存加密密钥！${COLORS.reset}`);
    }
    
  } catch (err) {
    ui.logError('导出配置失败', err);
    ui.printError(`导出失败: ${err.message}`);
  }
}

/**
 * 从文件导入配置
 */
async function importConfig() {
  ui.printTitle('导入配置');
  
  try {
    const filePath = await question(`${COLORS.cyan}配置文件路径:${COLORS.reset} `);
    
    if (!fs.existsSync(filePath.trim())) {
      ui.printError('文件不存在');
      return;
    }
    
    const fileContent = fs.readFileSync(filePath.trim(), 'utf-8');
    let importData;
    
    // 尝试解析JSON
    try {
      importData = JSON.parse(fileContent);
    } catch (err) {
      ui.printError('文件格式无效，请确保是有效的JSON或YAML文件');
      return;
    }
    
    // 处理加密文件
    if (importData.encrypted) {
      console.log(`${COLORS.yellow}检测到加密配置文件${COLORS.reset}`);
      
      const encryptionKey = await question(`${COLORS.cyan}请输入加密密钥:${COLORS.reset} `);
      
      try {
        const crypto = require('crypto');
        const decipher = crypto.createDecipheriv(
          'aes-256-gcm',
          Buffer.from(encryptionKey, 'hex'),
          Buffer.from(importData.iv, 'base64')
        );
        decipher.setAuthTag(Buffer.from(importData.authTag, 'base64'));
        
        let decrypted = decipher.update(importData.data, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        
        importData = JSON.parse(decrypted);
        console.log(`${COLORS.green}✅ 配置文件解密成功${COLORS.reset}`);
      } catch (decryptErr) {
        ui.printError('解密失败，请检查密钥是否正确');
        return;
      }
    }
    
    // 验证导入数据
    if (!importData.providers || !Array.isArray(importData.providers)) {
      ui.printError('配置文件格式无效：缺少providers数组');
      return;
    }
    
    console.log(`\n${COLORS.cyan}找到 ${importData.providers.length} 个配置:${COLORS.reset}\n`);
    
    importData.providers.forEach((provider, index) => {
      const status = provider.isApiKeyMasked ? '(API Key已脱敏)' : '';
      console.log(`  ${index + 1}. ${provider.name} (${provider.baseUrl}) ${status}`);
    });
    
    // 检查API Key是否被脱敏
    const maskedProviders = importData.providers.filter(p => p.isApiKeyMasked);
    if (maskedProviders.length > 0) {
      console.log(`\n${COLORS.yellow}⚠️  注意: ${maskedProviders.length} 个配置的API Key已脱敏，需要重新设置${COLORS.reset}`);
      
      const proceed = await question(`${COLORS.cyan}是否继续导入? (y/N):${COLORS.reset} `);
      if (proceed.toLowerCase() !== 'y' && proceed.toLowerCase() !== 'yes') {
        console.log('导入已取消。');
        return;
      }
      
      // 为脱敏的API Key提供重新设置的选项
      for (const provider of maskedProviders) {
        console.log(`\n配置: ${provider.name}`);
        const newApiKey = await question(`${COLORS.cyan}请输入新的API Key (留空跳过此配置):${COLORS.reset} `);
        if (newApiKey.trim()) {
          provider.apiKey = newApiKey.trim();
          provider.isApiKeyMasked = false;
        }
      }
    }
    
    // 询问是否覆盖现有配置
    const existingProviders = configManager.getAllProviders();
    const hasExisting = existingProviders.success && existingProviders.data.providers.length > 0;
    
    let importMode = 'merge'; // 默认合并
    if (hasExisting) {
      console.log(`\n检测到现有配置 (${existingProviders.data.providers.length} 个)`);
      const modeChoice = await question(`${COLORS.cyan}导入模式: (1)合并 (2)覆盖 (3)跳过重复? 默认合并:${COLORS.reset} `);
      
      switch (modeChoice.trim()) {
        case '2':
          importMode = 'overwrite';
          break;
        case '3':
          importMode = 'skip';
          break;
        default:
          importMode = 'merge';
      }
    }
    
    // 执行导入
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    console.log(`\n${COLORS.cyan}开始导入...${COLORS.reset}\n`);
    
    for (const provider of importData.providers) {
      if (provider.isApiKeyMasked) {
        console.log(`${COLORS.yellow}跳过 ${provider.name}: API Key未设置${COLORS.reset}`);
        skipCount++;
        continue;
      }
      
      try {
        // 检查是否已存在
        const existingProvider = configManager.findProviderByName(provider.name);
        
        if (existingProvider.success) {
          if (importMode === 'skip') {
            console.log(`${COLORS.yellow}跳过 ${provider.name}: 已存在${COLORS.reset}`);
            skipCount++;
            continue;
          } else if (importMode === 'merge') {
            console.log(`${COLORS.cyan}更新 ${provider.name}${COLORS.reset}`);
            const updateResult = configManager.updateProvider(provider.name, {
              baseUrl: provider.baseUrl,
              apiKey: provider.apiKey,
              model: provider.model
            });
            if (updateResult.success) {
              successCount++;
            } else {
              console.log(`${COLORS.red}更新 ${provider.name} 失败: ${updateResult.error}${COLORS.reset}`);
              errorCount++;
            }
            continue;
          }
        }
        
        // 添加新配置或覆盖现有配置
        const result = configManager.addProvider(
          provider.name,
          provider.baseUrl,
          provider.apiKey,
          provider.model
        );
        
        if (result.success) {
          console.log(`${COLORS.green}✅ 导入 ${provider.name}${COLORS.reset}`);
          successCount++;
        } else {
          console.log(`${COLORS.red}❌ 导入 ${provider.name} 失败: ${result.error}${COLORS.reset}`);
          errorCount++;
        }
      } catch (err) {
        console.log(`${COLORS.red}❌ 处理 ${provider.name} 时出错: ${err.message}${COLORS.reset}`);
        errorCount++;
      }
    }
    
    // 显示导入结果
    console.log(`\n${COLORS.bright}导入完成:${COLORS.reset}`);
    console.log(`  成功: ${successCount}`);
    console.log(`  跳过: ${skipCount}`);
    console.log(`  失败: ${errorCount}`);
    
    if (successCount > 0) {
      console.log(`\n${COLORS.green}✅ 配置导入成功！${COLORS.reset}`);
      console.log('使用 "ccs list" 查看所有配置');
      console.log('使用 "ccs switch <名称>" 切换配置');
    }
    
  } catch (err) {
    ui.logError('导入配置失败', err);
    ui.printError(`导入失败: ${err.message}`);
  }
}

/**
 * 验证所有配置
 */
async function validateAllConfigs() {
  ui.printTitle('验证配置连接');
  
  try {
    const providersResult = configManager.getAllProviders();
    
    if (!providersResult.success || !providersResult.data || !providersResult.data.providers || !providersResult.data.providers.length) {
      ui.printError('没有可验证的配置');
      return;
    }
    
    const providers = providersResult.data.providers;
    console.log(`正在验证 ${providers.length} 个配置...\n`);
    
    let validCount = 0;
    let invalidCount = 0;
    let errorCount = 0;
    const results = [];
    
    for (const provider of providers) {
      console.log(`验证 ${COLORS.bright}${provider.name}${COLORS.reset}...`);
      
      try {
        const isValid = await validateProviderConnection(provider);
        
        if (isValid) {
          console.log(`  ${COLORS.green}✅ 连接正常${COLORS.reset}`);
          validCount++;
          results.push({ provider: provider.name, status: 'valid', error: null });
        } else {
          console.log(`  ${COLORS.red}❌ 连接失败${COLORS.reset}`);
          invalidCount++;
          results.push({ provider: provider.name, status: 'invalid', error: 'Connection failed' });
        }
      } catch (err) {
        console.log(`  ${COLORS.red}❌ 验证出错: ${err.message}${COLORS.reset}`);
        errorCount++;
        results.push({ provider: provider.name, status: 'error', error: err.message });
      }
    }
    
    // 显示总结
    console.log(`\n${COLORS.bright}验证结果:${COLORS.reset}`);
    console.log(`  ${COLORS.green}✅ 正常: ${validCount}${COLORS.reset}`);
    console.log(`  ${COLORS.red}❌ 失败: ${invalidCount}${COLORS.reset}`);
    console.log(`  ${COLORS.yellow}⚠️  错误: ${errorCount}${COLORS.reset}`);
    console.log(`  ${COLORS.dim}总计: ${providers.length}${COLORS.reset}`);
    
    // 显示详细结果
    const failedResults = results.filter(r => r.status !== 'valid');
    if (failedResults.length > 0) {
      console.log(`\n${COLORS.bright}失败的配置:${COLORS.reset}`);
      failedResults.forEach(result => {
        console.log(`  ${COLORS.red}• ${result.provider}: ${result.error || 'Connection failed'}${COLORS.reset}`);
      });
      
      console.log(`\n${COLORS.cyan}建议:${COLORS.reset}`);
      console.log('  - 检查网络连接');
      console.log('  - 验证 API Key 是否有效');
      console.log('  - 确认 Base URL 是否正确');
      console.log('  - 检查服务商服务状态');
    }
    
    // 生成验证报告
    await generateValidationReport(results);
    
  } catch (err) {
    ui.logError('验证配置时发生错误', err);
    ui.printError(`验证失败: ${err.message}`);
  }
}

/**
 * 验证单个服务商连接
 */
async function validateProviderConnection(provider) {
  const https = require('https');
  const http = require('http');
  
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(provider.baseUrl);
      
      // 创建简单的测试请求
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname || '/',
        method: 'GET',
        timeout: 10000,
        headers: {
          'User-Agent': `claude-config-switcher/${VERSION}`,
          'Authorization': `Bearer ${provider.apiKey}`,
      // 添加API版本头（如果需要）
      'anthropic-version': '2023-06-01'
        }
      };
      
      const client = url.protocol === 'https:' ? https : http;
      
      const req = client.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          // 检查响应状态
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(true);
          } else if (res.statusCode === 401) {
            reject(new Error('API Key 无效或已过期'));
          } else if (res.statusCode === 404) {
            reject(new Error('API 端点不存在'));
          } else if (res.statusCode >= 400 && res.statusCode < 500) {
            reject(new Error(`客户端错误 (${res.statusCode})`));
          } else {
            reject(new Error(`服务器错误 (${res.statusCode})`));
          }
        });
      });
      
      req.on('error', (err) => {
        if (err.code === 'ENOTFOUND') {
          reject(new Error('主机名无法解析'));
        } else if (err.code === 'ECONNREFUSED') {
          reject(new Error('连接被拒绝'));
        } else if (err.code === 'ETIMEDOUT') {
          reject(new Error('连接超时'));
        } else {
          reject(new Error(`网络错误: ${err.message}`));
        }
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('请求超时'));
      });
      
      req.setTimeout(10000);
      req.end();
      
    } catch (err) {
      if (err.message.includes('Invalid URL')) {
        reject(new Error('无效的 Base URL'));
      } else {
        reject(err);
      }
    }
  });
}

/**
 * 生成验证报告
 */
async function generateValidationReport(results) {
  try {
    const report = {
      timestamp: new Date().toISOString(),
      version: VERSION,
      summary: {
        total: results.length,
        valid: results.filter(r => r.status === 'valid').length,
        invalid: results.filter(r => r.status === 'invalid').length,
        error: results.filter(r => r.status === 'error').length
      },
      details: results
    };
    
    // 保存报告到文件
    const reportDir = path.join(os.homedir(), '.claude');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const reportFile = path.join(reportDir, `validation-report-${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf-8');
    
    console.log(`\n${COLORS.cyan}📄 详细报告已保存至: ${reportFile}${COLORS.reset}`);
    
  } catch (err) {
    console.log(`\n${COLORS.yellow}⚠️  保存验证报告失败: ${err.message}${COLORS.reset}`);
  }
}

function showVersion() {
  console.log(`Claude Code 配置切换工具 v${VERSION}`);
  console.log('');
  console.log(`位置: ${__dirname}`);
  console.log(`Node.js: ${process.version}`);
  console.log(`平台: ${os.platform()} ${os.release()}`);
}

/**
 * 显示审计日志
 */
function showAuditLog() {
  ui.printTitle('审计日志');

  const logFile = path.join(os.homedir(), '.claude', 'audit.log');

  if (!fs.existsSync(logFile)) {
    console.log('暂无审计日志记录\n');
    return;
  }

  try {
    const content = fs.readFileSync(logFile, 'utf-8');
    const lines = content.trim().split('\n');

    console.log(`共 ${lines.length} 条记录\n`);

    // 显示最近20条
    const recentLines = lines.slice(-20);
    recentLines.forEach((line, index) => {
      if (line.includes('[SUCCESS]')) {
        console.log(`${COLORS.green}${line}${COLORS.reset}`);
      } else if (line.includes('[FAILED]')) {
        console.log(`${COLORS.red}${line}${COLORS.reset}`);
      } else {
        console.log(line);
      }
    });

    if (lines.length > 20) {
      console.log(`\n${COLORS.cyan}... 还有 ${lines.length - 20} 条记录${COLORS.reset}`);
    }

    console.log(`\n日志文件: ${logFile}`);
  } catch (err) {
    ui.printError('读取审计日志失败');
  }
}

/**
 * 安装 Shell 自动补全
 */
function installShellCompletion() {
  ui.printTitle('安装 Shell 自动补全');

  const shell = os.userInfo().username ? 'bash' : 'bash';
  const completionsDir = path.join(os.homedir(), '.bash_completion.d');

  try {
    if (!fs.existsSync(completionsDir)) {
      fs.mkdirSync(completionsDir, { recursive: true });
    }

    const sourceFile = path.join(__dirname, 'completions', 'claude-switcher.bash');
    const destFile = path.join(completionsDir, 'claude-switcher');

    if (fs.existsSync(sourceFile)) {
      fs.copyFileSync(sourceFile, destFile);
      console.log(`${COLORS.green}✅ Bash 自动补全已安装${COLORS.reset}`);
      console.log(`\n${COLORS.cyan}请将以下内容添加到你的 ~/.bashrc 或 ~/.bash_profile:${COLORS.reset}`);
      console.log(`  if [ -f ~/.bash_completion.d/claude-switcher ]; then`);
      console.log(`    . ~/.bash_completion.d/claude-switcher`);
      console.log(`  fi\n`);
    } else {
      console.log(`${COLORS.yellow}⚠ 自动补全文件未找到${COLORS.reset}\n`);
    }
  } catch (err) {
    ui.printError('安装自动补全失败');
    console.log(`错误: ${err.message}\n`);
  }
}

/**
 * 健康检查命令
 */
async function healthCheck() {
  ui.printTitle('系统健康检查');

  console.log('正在检查系统状态...\n');

  let allChecksPassed = true;

  // 检查 Node.js 版本
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
  console.log(`[${COLORS.cyan}✓${COLORS.reset}] Node.js 版本: v${nodeVersion} ${majorVersion >= 14 ? COLORS.green + '(OK)' + COLORS.reset : COLORS.yellow + '(建议升级)' + COLORS.reset}`);

  // 检查配置目录
  const configDir = path.join(os.homedir(), '.claude');
  const configDirExists = fs.existsSync(configDir);
  console.log(`[${configDirExists ? COLORS.cyan + '✓' + COLORS.reset : COLORS.red + '✗' + COLORS.reset}] 配置目录: ${configDir}`);

  // 检查配置文件
  const configFile = path.join(configDir, 'model-switcher.json');
  const configFileExists = fs.existsSync(configFile);
  if (configFileExists) {
    const configStat = fs.statSync(configFile);
    console.log(`[${COLORS.cyan}✓${COLORS.reset}] 配置文件: ${configFile} (${Math.round(configStat.size / 1024)}KB)`);

    // 检查配置文件权限
    try {
      const stats = fs.statSync(configFile);
      const mode = (stats.mode & parseInt('777', 8)).toString(8);
      if (mode === '600') {
        console.log(`[${COLORS.cyan}✓${COLORS.reset}] 文件权限: ${mode} (安全)`);
      } else {
        console.log(`[${COLORS.yellow}⚠${COLORS.reset}] 文件权限: ${mode} (建议设置为 600)`);
        allChecksPassed = false;
      }
    } catch (err) {
      console.log(`[${COLORS.red}✗${COLORS.reset}] 无法检查文件权限`);
    }
  } else {
    console.log(`[${COLORS.yellow}⚠${COLORS.reset}] 配置文件不存在: ${configFile}`);
  }

  // 检查加密密钥
  const keyFile = path.join(configDir, '.key');
  const keyFileExists = fs.existsSync(keyFile);
  if (keyFileExists) {
    console.log(`[${COLORS.cyan}✓${COLORS.reset}] 加密密钥: ${COLORS.green}已配置${COLORS.reset}`);
  } else {
    console.log(`[${COLORS.yellow}⚠${COLORS.reset}] 加密密钥: ${COLORS.yellow}未设置${COLORS.reset}`);
  }

  // 检查 Claude Code 配置
  const settingsFile = path.join(configDir, 'settings.json');
  if (fs.existsSync(settingsFile)) {
    try {
      const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
      const hasActiveProvider = settings.activeProvider || settings.model;
      if (hasActiveProvider) {
        console.log(`[${COLORS.cyan}✓${COLORS.reset}] Claude Code 集成: ${COLORS.green}已配置${COLORS.reset}`);
        console.log(`    - 激活提供商: ${settings.activeProvider || 'N/A'}`);
        console.log(`    - 模型: ${settings.model || 'N/A'}`);
      } else {
        console.log(`[${COLORS.yellow}⚠${COLORS.reset}] Claude Code 集成: ${COLORS.yellow}未完整配置${COLORS.reset}`);
      }
    } catch (err) {
      console.log(`[${COLORS.red}✗${COLORS.reset}] Claude Code 配置损坏`);
    }
  } else {
    console.log(`[${COLORS.yellow}⚠${COLORS.reset}] Claude Code 配置: ${COLORS.yellow}未找到${COLORS.reset}`);
  }

  // 检查网络连接
  console.log(`\n${COLORS.bright}网络检查${COLORS.reset}`);
  const https = require('https');
  try {
    await new Promise((resolve, reject) => {
      const req = https.get('https://api.anthropic.com', { timeout: 5000 }, (res) => {
        console.log(`[${COLORS.cyan}✓${COLORS.reset}] Anthropic API: ${COLORS.green}可访问${COLORS.reset}`);
        resolve();
      });
      req.on('error', () => {
        console.log(`[${COLORS.yellow}⚠${COLORS.reset}] Anthropic API: ${COLORS.yellow}无法访问${COLORS.reset}`);
        resolve();
      });
      req.on('timeout', () => {
        req.destroy();
        console.log(`[${COLORS.yellow}⚠${COLORS.reset}] Anthropic API: ${COLORS.yellow}连接超时${COLORS.reset}`);
        resolve();
      });
    });
  } catch (err) {
    console.log(`[${COLORS.yellow}⚠${COLORS.reset}] 网络检查失败`);
  }

  // 检查已配置的服务商
  console.log(`\n${COLORS.bright}服务商配置${COLORS.reset}`);
  const providersResult = configManager.getAllProviders();
  if (providersResult.success && providersResult.data.providers && providersResult.data.providers.length > 0) {
    console.log(`[${COLORS.cyan}✓${COLORS.reset}] 已配置 ${providersResult.data.providers.length} 个服务商`);

    providersResult.data.providers.forEach((provider, index) => {
      console.log(`    ${index + 1}. ${provider.name} (${provider.baseUrl})`);
    });
  } else {
    console.log(`[${COLORS.yellow}⚠${COLORS.reset}] 未配置任何服务商`);
  }

  // 总结
  console.log(`\n${COLORS.bright}检查结果${COLORS.reset}`);
  if (allChecksPassed) {
    console.log(`${COLORS.green}${COLORS.bright}✅ 系统状态: 健康${COLORS.reset}\n`);
  } else {
    console.log(`${COLORS.yellow}${COLORS.bright}⚠ 系统状态: 需要关注${COLORS.reset}\n`);
  }
}

/**
 * 验证服务商配置
 * @param {string} name - 服务商名称（可选，不指定则验证所有）
 */
async function validateProvider(name = null) {
  ui.printTitle('验证服务商配置');

  try {
    let providersToValidate = [];

    if (name) {
      // 验证指定的提供商
      const providerResult = configManager.findProviderByName(name);
      if (!providerResult.success) {
        ui.printError(`找不到服务商 "${name}"`);
        return;
      }
      providersToValidate = [providerResult.data];
    } else {
      // 验证所有提供商
      const providersResult = configManager.getAllProviders();
      if (!providersResult.success) {
        ui.printError('获取服务商列表失败');
        return;
      }
      providersToValidate = providersResult.data;

      if (providersToValidate.length === 0) {
        ui.printWarning('没有找到任何服务商配置');
        return;
      }
    }

    let validCount = 0;
    let invalidCount = 0;

    for (const provider of providersToValidate) {
      // 解密 API Key
      let decryptedApiKey;
      try {
        decryptedApiKey = decryptText(provider.apiKey);
      } catch (err) {
        decryptedApiKey = provider.apiKey;
      }

      console.log(`\n验证 ${COLORS.bright}${provider.name}${COLORS.reset}...`);

      // 使用 curl 测试连接
      const isValid = await testConnection({
        ...provider,
        apiKey: decryptedApiKey
      });

      if (isValid) {
        console.log(`  ${COLORS.green}✅ 连接正常${COLORS.reset}`);
        validCount++;
      } else {
        console.log(`  ${COLORS.red}❌ 连接失败${COLORS.reset}`);
        invalidCount++;
      }
    }

    console.log(`\n${COLORS.cyan}验证结果:${COLORS.reset}`);
    console.log(`  ${COLORS.green}✅ 正常: ${validCount}${COLORS.reset}`);
    console.log(`  ${COLORS.red}❌ 失败: ${invalidCount}${COLORS.reset}`);
    console.log(`  ${COLORS.dim}总计: ${providersToValidate.length}${COLORS.reset}`);

  } catch (err) {
    ui.logError('验证配置时发生错误', err);
    ui.printError('验证配置失败');
  }
}

/**
 * 创建配置备份
 * @param {string} configPath - 配置文件路径
 * @returns {string} 备份文件路径
 */
function createBackup(configPath) {
  try {
    if (!fs.existsSync(configPath)) {
      return null;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${configPath}.backup-${timestamp}`;

    fs.copyFileSync(configPath, backupPath);
    fs.chmodSync(backupPath, 0o600);

    return backupPath;
  } catch (err) {
    ui.logError('创建备份失败', err);
    return null;
  }
}

/**
 * 启动 Claude Code
 */
function launchClaudeCode() {
  try {
    console.log(`\n${COLORS.green}✅ 正在启动 Claude Code...${COLORS.reset}\n`);

    const result = configManager.getCurrentConfig();
    if (!result.success || !result.data.hasActiveProvider || !result.data.exists) {
      ui.printError('未找到激活的配置，请先切换配置');
      return;
    }

    const { apiKey, baseUrl } = result.data;

    if (!apiKey) {
      ui.printError('未找到 API Key，请先切换配置');
      return;
    }

    const stdin = process.stdin;
    stdin.removeAllListeners('data');
    stdin.removeAllListeners('readable');
    stdin.removeAllListeners('keypress');

    if (stdin.isTTY) {
      stdin.setRawMode(false);
    }
    stdin.pause();

    setTimeout(() => {
      const { execSync } = require('child_process');
      const env = {
        ...process.env,
        [constants.ENV_ANTHROPIC_AUTH_TOKEN]: apiKey,
        [constants.ENV_ANTHROPIC_BASE_URL]: baseUrl || ''
      };
      execSync('claude --dangerously-skip-permissions', { stdio: 'inherit', env });
    }, constants.PROCESS_START_DELAY);
  } catch (err) {
    ui.logError('启动 Claude Code 时发生错误', err);
    ui.printError(`启动 Claude Code 失败: ${err.message}`);
    console.log(`\n请确保已安装 Claude Code CLI\n`);
    process.exit(1);
  }
}

// ===========================================
// 主函数
// ===========================================

/**
 * 程序入口点
 */
async function main() {
  try {
    // 初始化配置目录
    configManager.ensureConfigDir();

    // 检查是否开启调试模式
    const args = process.argv.slice(2);
    const hasDebugFlag = args.includes('--debug') || args.includes('-d');
    const isUpdateCommand = args[0] === 'update';
    const isVersionCommand = args[0] === 'version' || args[0] === '--version' || args[0] === '-v';
    const isHelpCommand = args[0] === 'help' || args[0] === '--help' || args[0] === '-h';

    // 启用调试模式
    if (hasDebugFlag) {
      console.log(`${COLORS.yellow}🔍 调试模式已启用${COLORS.reset}\n`);
    }

    // 在非特定命令下检查更新（非版本命令、非帮助命令、非更新命令）
    if (!isVersionCommand && !isHelpCommand && !isUpdateCommand && !hasDebugFlag) {
      showUpdateNotification().catch(() => {});
    }

    const command = args[0];

    // 无参数时进入交互式选择
    if (!command) {
      console.log(`${COLORS.cyan}${COLORS.bright}Claude Code 配置切换工具${COLORS.reset}\n`);

      // 检查是否有上次使用的配置
      const currentConfig = configManager.getCurrentConfig();
      let useLastProvider = false;

      if (currentConfig.success && currentConfig.data.hasActiveProvider && currentConfig.data.exists) {
        const lastProviderName = currentConfig.data.provider?.name || currentConfig.data.activeProviderName;

        if (lastProviderName) {
          const confirm = await question(`${COLORS.cyan}是否继续使用上次选择的服务商 "${lastProviderName}"? (y/n): ${COLORS.reset}`);

          if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
            useLastProvider = true;
          }
        }
      }

      if (useLastProvider) {
        const providerResult = configManager.findProviderByName(currentConfig.data.provider.name);
        if (providerResult.success) {
          console.log(`\n${COLORS.green}✅ 继续使用: ${COLORS.bright}${providerResult.data.name}${COLORS.reset}`);
          console.log(`Base URL: ${providerResult.data.baseUrl}\n`);

          ui.showLoading('测试连接中...');
          const isConnected = await testConnection(providerResult.data);
          ui.showConnectionResult(isConnected);

          const result = configManager.switchToProvider(providerResult.data);
          if (result.success) {
            console.log(`\n${COLORS.green}✅ 配置已更新${COLORS.reset}\n`);
            launchClaudeCode();
          }
          return;
        }
      }

      // 如果不使用上次配置或找不到，则进入选择菜单
      const selectedProvider = await interactiveSelect();

      console.log(`\n${COLORS.cyan}选择的服务商: ${COLORS.bright}${selectedProvider.name}${COLORS.reset}`);
      console.log(`Base URL: ${selectedProvider.baseUrl}\n`);

      ui.showLoading('测试连接中...');
      const isConnected = await testConnection(selectedProvider);
      ui.showConnectionResult(isConnected);

      const result = configManager.switchToProvider(selectedProvider);

      if (result.success) {
        console.log(`\n${COLORS.green}✅ 配置已保存${COLORS.reset}`);
        console.log(`配置文件: ~/.claude/settings.json\n`);
        launchClaudeCode();
      } else {
        ui.printError(`配置失败: ${result.error.message}`);
      }

      return;
    }

    // 根据命令执行操作
    switch (command) {
      case 'add':
        await addProvider();
        break;
      case 'list':
        listProviders();
        break;
      case 'switch':
        await switchProvider(args[1]);
        break;
      case 'update':
        await updateTool();
        break;
      case 'edit':
        await updateProvider(args[1]);
        break;
      case 'remove':
        await removeProvider(args[1]);
        break;
      case 'show':
        showCurrentConfig();
        break;
      case 'health':
      case 'diagnose':
        await healthCheck();
        break;
      case 'validate':
      case 'test':
        await validateProvider(args[1]);
        break;
      case 'backup':
        const backupPath = createBackup(constants.SWITCHER_CONFIG_FILE);
        if (backupPath) {
          ui.printSuccess(`备份已创建: ${backupPath}`);
        } else {
          ui.printError('创建备份失败');
        }
        break;
      case 'audit':
      case 'log':
        showAuditLog();
        break;
      case 'install-completion':
        installShellCompletion();
        break;
      case 'wizard':
      case 'setup':
      case 'init':
        await runConfigWizard();
        break;
      case 'export':
        await exportConfig();
        break;
      case 'import':
        await importConfig();
        break;
      case 'validate':
        await validateAllConfigs();
        break;
      case 'interactive':
      case 'inter':
      case 'i':
        await interactiveMode();
        break;
      case 'verify':
        await verifyConfigs();
        break;
      case 'repair':
        await repairConfigs();
        break;
      case 'version':
      case '--version':
      case '-v':
        showVersion();
        break;
      case 'help':
      case '--help':
      case '-h':
        ui.showHelp();
        break;
      default:
        ui.printError(`未知命令: "${command}"`);
        console.log();
        ui.showHelp();
    }
  } catch (err) {
    ui.logError('程序执行时发生错误', err);
    ui.printError(`发生错误: ${err.message}`);
  } finally {
    if (rl && typeof rl.close === 'function') {
      rl.close();
    }
  }
}

// 执行主函数
main();
