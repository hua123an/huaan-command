# ultrathink 测试指南

本文档说明如何运行 ultrathink 项目的测试套件。

## 测试框架

本项目使用 Node.js 内置的 `assert` 模块作为测试框架，无需任何外部依赖。测试框架包括：

- **test-runner.js** - 测试运行器，提供测试执行和结果统计功能
- **assert 模块** - Node.js 内置断言库，提供丰富的断言方法

## 测试文件结构

```
tests/
├── test-runner.js      # 测试运行器
├── test.configManager.js   # 配置管理测试
├── test.validators.js      # 验证函数测试
├── test.ui.js              # UI 输出测试
└── test.e2e.js             # 端到端测试
```

## 测试内容

### 1. 配置管理测试 (test.configManager.js)

测试配置文件的保存、加载和管理功能：

- ✅ 空配置加载
- ✅ 配置保存和加载
- ✅ 多提供商配置管理
- ✅ 配置文件不存在处理
- ✅ Claude settings 读写
- ✅ 配置文件格式验证
- ✅ 权限错误处理
- ✅ 大配置文件处理
- ✅ 配置覆盖
- ✅ 特殊字符处理

**运行命令：**
```bash
npm run test:config
# 或者
node tests/test.configManager.js
```

### 2. 验证函数测试 (test.validators.js)

测试输入验证逻辑：

- ✅ URL 格式验证（HTTP/HTTPS）
- ✅ API Key 验证（非空、无换行符）
- ✅ 提供商名称验证（格式、长度、字符集）
- ✅ 配置文件完整性验证
- ✅ 边界条件测试
- ✅ 特殊字符处理
- ✅ 类型检查

**运行命令：**
```bash
npm run test:validators
# 或者
node tests/test.validators.js
```

### 3. UI 输出测试 (test.ui.js)

测试用户界面输出功能：

- ✅ 标题打印
- ✅ 成功/错误/警告/信息消息
- ✅ 帮助信息显示
- ✅ 多行消息处理
- ✅ 长消息处理
- ✅ 特殊字符处理
- ✅ Unicode 字符支持
- ✅ 颜色代码验证
- ✅ 格式化输出（提供商列表、当前配置）
- ✅ 交互式菜单提示
- ✅ 无颜色模式支持

**运行命令：**
```bash
npm run test:ui
# 或者
node tests/test.ui.js
```

### 4. 端到端测试 (test.e2e.js)

测试完整的用户操作流程：

- ✅ 完整添加流程
- ✅ 重复提供商检查
- ✅ 无效输入处理
- ✅ 完整切换流程
- ✅ 完整删除流程
- ✅ 取消操作处理
- ✅ 多提供商操作
- ✅ 配置文件损坏恢复
- ✅ 边界条件测试
- ✅ 并发操作
- ✅ 错误恢复
- ✅ 数据持久性

**运行命令：**
```bash
npm run test:e2e
# 或者
node tests/test.e2e.js
```

## 运行所有测试

### 方法一：使用 npm 脚本（推荐）

```bash
# 运行所有测试
npm test

# 或指定运行特定测试
npm run test:config
npm run test:validators
npm run test:ui
npm run test:e2e
```

### 方法二：直接运行测试运行器

```bash
# 运行所有测试
node tests/test-runner.js
```

### 方法三：单独运行测试文件

```bash
# 运行单个测试文件
node tests/test.configManager.js
node tests/test.validators.js
node tests/test.ui.js
node tests/test.e2e.js
```

## 测试输出说明

测试运行时会显示以下信息：

```
======================================================================
 ultrathink 测试套件
======================================================================

运行测试文件: test.configManager.js
==================================================
  ✓ testLoadEmptyConfig
  ✓ testSaveAndLoadConfig
  ✓ testSaveMultipleProviders
  ...

运行测试文件: test.validators.js
==================================================
  ✓ testValidUrls
  ✓ testInvalidUrls
  ...

======================================================================
 测试摘要
======================================================================

总测试数: 42
通过: 42
失败: 0
通过率: 100.00%
```

### 符号说明

- ✓ - 测试通过
- ✗ - 测试失败
- = - 分隔符

### 退出码

- **0** - 所有测试通过
- **1** - 有测试失败

## 测试覆盖范围

### 核心功能覆盖率

| 测试类别 | 测试数量 | 覆盖率目标 |
|---------|---------|----------|
| 配置管理 | 11 个测试 | 90%+ |
| 验证函数 | 15 个测试 | 90%+ |
| UI 输出 | 17 个测试 | 85%+ |
| 端到端 | 15 个测试 | 90%+ |
| **总计** | **58 个测试** | **>80%** |

### 覆盖的场景

✅ **正常流程测试**
- 配置保存和加载
- 正常用户操作流程
- 有效输入处理

✅ **边界条件测试**
- 空配置
- 超长字符串
- 特殊字符
- Unicode 字符
- 极大/极小值

✅ **错误场景测试**
- 无效输入
- 文件不存在
- 权限错误
- JSON 格式错误
- 网络错误

✅ **集成测试**
- 多步骤操作
- 配置覆盖
- 数据持久性
- 状态恢复

## 编写新测试

### 测试函数格式

```javascript
/**
 * 测试函数名称应使用 test 前缀
 */
function testExample() {
  // 1. 准备测试数据
  const testData = { /* ... */ };

  // 2. 执行被测操作
  const result = someFunction(testData);

  // 3. 使用断言验证结果
  assert.strictEqual(result.expectedValue, 'expected', '错误消息');
}
```

### 断言方法

常用断言方法：

```javascript
// 相等性测试
assert.strictEqual(actual, expected, 'message');
assert.deepStrictEqual(actual, expected, 'message');

// 布尔测试
assert.ok(condition, 'message');  // 条件为真
assert.strictEqual(condition, true, 'message');

// 异常测试
try {
  // 可能抛出异常的代码
  assert.fail('应抛出异常');
} catch (error) {
  assert.ok(error.message.includes('预期错误'), 'message');
}
```

### 临时文件处理

使用临时目录进行测试，避免影响真实配置：

```javascript
const TEST_DIR = path.join(os.tmpdir(), 'ultrathink-test');

function setup() {
  // 创建临时目录
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

function cleanup() {
  // 清理临时目录
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
}
```

## 常见问题

### Q: 测试失败但我不确定原因

A: 运行特定的测试文件获取详细错误信息：
```bash
npm run test:config
```
详细错误信息会显示在失败的测试下方。

### Q: 如何添加新的测试

A: 1. 在相应的测试文件中添加新函数
   2. 函数名以 `test` 开头
   3. 使用 `assert` 进行断言
   4. 导出函数：`module.exports = { testNewFunction }`

### Q: 测试覆盖率不够怎么办

A: 1. 检查未覆盖的代码路径
   2. 添加边界条件测试
   3. 添加错误场景测试
   4. 运行 `npm test` 查看覆盖率报告

### Q: 可以并行运行测试吗

A: 目前的测试框架不支持并行运行。测试按顺序执行以避免文件冲突。

## 性能测试

目前测试主要集中在功能正确性，性能测试可以通过以下方式手动执行：

```bash
# 测试大量配置项
time node -e "
  const fs = require('fs');
  const path = require('path');
  // 模拟加载 1000 个提供商配置
"
```

## 持续集成

在 CI/CD 环境中运行测试：

```bash
# 安装依赖（虽然测试不需要外部依赖）
npm install

# 运行所有测试
npm test

# 检查退出码
if [ $? -eq 0 ]; then
  echo "所有测试通过"
else
  echo "有测试失败"
  exit 1
fi
```

## 维护和更新

### 定期任务

- **每次发布前**：运行完整测试套件
- **添加新功能**：编写对应的测试
- **修复 Bug**：添加回归测试
- **每月**：检查测试覆盖率报告

### 测试数据清理

测试使用临时目录，测试完成后会自动清理。如需手动清理：

```bash
rm -rf /tmp/ultrathink-test*
rm -rf /tmp/ultrathink-e2e-test*
```

## 贡献指南

1. 新功能必须包含测试
2. Bug 修复应添加回归测试
3. 所有测试必须通过才能合并
4. 测试代码应包含中文注释
5. 遵循现有的测试命名约定

## 支持

如有问题或建议，请：

1. 查看本文档
2. 运行 `npm test` 查看测试结果
3. 检查具体的测试失败信息

---

**注意**：测试使用真实的文件系统操作，但会在系统临时目录中进行，不会影响您的实际配置文件。
