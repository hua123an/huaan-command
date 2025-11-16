/**
 * 版本更新检查模块
 * 
 * 功能：
 * - 检查npm仓库最新版本
 * - 缓存检查结果避免频繁请求
 * - 提供更新提示
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CACHE_FILE = path.join(os.homedir(), '.claude', '.version-cache');
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

/**
 * 获取npm仓库的最新版本信息
 * @param {string} packageName - 包名
 * @returns {Promise<string>} 最新版本号
 */
function getLatestVersion(packageName) {
  return new Promise((resolve, reject) => {
    const url = `https://registry.npmjs.org/${packageName}`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const packageInfo = JSON.parse(data);
          const latestVersion = packageInfo['dist-tags']?.latest;
          if (latestVersion) {
            resolve(latestVersion);
          } else {
            reject(new Error('无法获取最新版本信息'));
          }
        } catch (err) {
          reject(new Error('解析版本信息失败: ' + err.message));
        }
      });
    }).on('error', (err) => {
      reject(new Error('网络请求失败: ' + err.message));
    });
  });
}

/**
 * 读取缓存的版本信息
 * @returns {Object|null} 缓存信息或null
 */
function readCache() {
  try {
    if (!fs.existsSync(CACHE_FILE)) {
      return null;
    }
    
    const cacheData = fs.readFileSync(CACHE_FILE, 'utf-8');
    const cache = JSON.parse(cacheData);
    
    // 检查缓存是否过期
    if (Date.now() - cache.timestamp > CACHE_DURATION) {
      return null;
    }
    
    return cache;
  } catch (err) {
    return null;
  }
}

/**
 * 写入版本缓存
 * @param {string} latestVersion - 最新版本号
 */
function writeCache(latestVersion) {
  try {
    const cacheDir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    const cache = {
      latestVersion,
      timestamp: Date.now()
    };
    
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (err) {
    // 忽略缓存写入错误，不影响主要功能
  }
}

/**
 * 检查版本更新
 * @param {string} currentVersion - 当前版本
 * @param {boolean} forceCheck - 是否强制检查（忽略缓存）
 * @returns {Promise<Object>} 检查结果
 */
async function checkUpdate(currentVersion, forceCheck = false) {
  try {
    let latestVersion;
    
    // 如果不是强制检查，先尝试读取缓存
    if (!forceCheck) {
      const cache = readCache();
      if (cache && cache.latestVersion) {
        latestVersion = cache.latestVersion;
      }
    }
    
    // 如果没有缓存信息或强制检查，则从npm获取
    if (!latestVersion) {
      latestVersion = await getLatestVersion('claude-config-switcher');
      writeCache(latestVersion);
    }
    
    const hasUpdate = compareVersions(currentVersion, latestVersion) < 0;
    
    return {
      currentVersion,
      latestVersion,
      hasUpdate,
      needsUpdate: hasUpdate
    };
    
  } catch (err) {
    return {
      currentVersion,
      latestVersion: null,
      hasUpdate: false,
      needsUpdate: false,
      error: err.message
    };
  }
}

/**
 * 比较版本号
 * @param {string} v1 - 版本1
 * @param {string} v2 - 版本2
 * @returns {number} -1: v1 < v2, 0: v1 === v2, 1: v1 > v2
 */
function compareVersions(v1, v2) {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  const maxLength = Math.max(parts1.length, parts2.length);
  
  for (let i = 0; i < maxLength; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    
    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
  }
  
  return 0;
}

/**
 * 显示更新提示
 * @param {Object} updateInfo - 更新信息
 */
function showUpdateNotice(updateInfo) {
  if (updateInfo.needsUpdate) {
    console.log('\n🚀 发现新版本!');
    console.log(`当前版本: ${updateInfo.currentVersion}`);
    console.log(`最新版本: ${updateInfo.latestVersion}`);
    console.log('\n更新命令: npm install -g claude-config-switcher@latest');
    console.log('或者: npm update -g claude-config-switcher\n');
  } else if (updateInfo.error) {
    console.log(`\n⚠️  检查更新失败: ${updateInfo.error}\n`);
  }
}

module.exports = {
  checkUpdate,
  compareVersions,
  showUpdateNotice,
  getLatestVersion,
  readCache,
  writeCache
};