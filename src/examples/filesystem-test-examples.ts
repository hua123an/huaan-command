// 文件系统 API 测试示例
// 这个文件展示了如何在前端使用新的文件系统命令

import { invoke } from '@tauri-apps/api/core';

interface FileInfo {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified?: string;
  created?: string;
  permissions?: string;
}

// ============ 基础文件操作示例 ============

export async function testFileOperations() {
  console.group('📁 文件操作测试');

  try {
    // 1. 检查路径是否存在
    console.log('\n1️⃣ 检查路径是否存在');
    const testPath = '~/test-file.txt';
    const exists = await invoke<boolean>('path_exists', { path: testPath });
    console.log(`路径 ${testPath} 存在: ${exists}`);

    // 2. 写入文件（会自动备份）
    console.log('\n2️⃣ 写入测试文件');
    const content = `测试文件
创建时间: ${new Date().toLocaleString()}
内容: Hello from Tauri File System API!`;

    await invoke('write_file', {
      path: testPath,
      content: content,
    });
    console.log('✅ 文件写入成功（已自动备份旧文件）');

    // 3. 读取文件
    console.log('\n3️⃣ 读取文件内容');
    const readContent = await invoke<string>('read_file', {
      path: testPath,
    });
    console.log('文件内容:', readContent);

    // 4. 获取文件元数据
    console.log('\n4️⃣ 获取文件元数据');
    const metadata = await invoke<FileInfo>('get_file_metadata', {
      path: testPath,
    });
    console.log('文件信息:', {
      名称: metadata.name,
      大小: `${metadata.size} bytes`,
      修改时间: metadata.modified,
      创建时间: metadata.created,
      权限: metadata.permissions,
    });

    // 5. 复制文件
    console.log('\n5️⃣ 复制文件');
    const copyPath = '~/test-file-copy.txt';
    await invoke('copy_file', {
      source: testPath,
      destination: copyPath,
      overwrite: true,
    });
    console.log('✅ 文件复制成功');

    // 6. 移动/重命名文件
    console.log('\n6️⃣ 重命名文件');
    const newPath = '~/test-file-renamed.txt';
    await invoke('move_file', {
      source: copyPath,
      destination: newPath,
      overwrite: true,
    });
    console.log('✅ 文件重命名成功');

    // 7. 删除文件（会创建备份）
    console.log('\n7️⃣ 删除文件');
    await invoke('delete_file', {
      path: newPath,
      createBackup: true,
    });
    console.log('✅ 文件删除成功（已创建备份）');

    console.log('\n✅ 所有文件操作测试通过！');
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }

  console.groupEnd();
}

// ============ 目录操作示例 ============

export async function testDirectoryOperations() {
  console.group('📂 目录操作测试');

  try {
    const testDir = '~/test-directory';

    // 1. 创建目录
    console.log('\n1️⃣ 创建测试目录');
    await invoke('create_directory', {
      path: testDir,
      recursive: true,
    });
    console.log('✅ 目录创建成功');

    // 2. 在目录中创建文件
    console.log('\n2️⃣ 在目录中创建文件');
    await invoke('write_file', {
      path: `${testDir}/file1.txt`,
      content: '第一个文件',
    });
    await invoke('write_file', {
      path: `${testDir}/file2.txt`,
      content: '第二个文件',
    });
    console.log('✅ 文件创建成功');

    // 3. 列出目录内容
    console.log('\n3️⃣ 列出目录内容');
    const files = await invoke<FileInfo[]>('list_files', {
      dir: testDir,
      showHidden: false,
    });

    console.log(`目录包含 ${files.length} 个项目:`);
    files.forEach((file) => {
      const type = file.is_dir ? '📁' : '📄';
      const size = file.is_dir ? '' : `(${file.size} bytes)`;
      console.log(`  ${type} ${file.name} ${size}`);
    });

    // 4. 删除目录（递归）
    console.log('\n4️⃣ 删除目录');
    await invoke('delete_directory', {
      path: testDir,
      recursive: true,
    });
    console.log('✅ 目录删除成功');

    console.log('\n✅ 所有目录操作测试通过！');
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }

  console.groupEnd();
}

// ============ 列出主目录示例 ============

export async function listHomeDirectory() {
  console.group('🏠 列出主目录内容');

  try {
    const homeDir = '~';
    const files = await invoke<FileInfo[]>('list_files', {
      dir: homeDir,
      showHidden: false,
    });

    console.log(`\n主目录包含 ${files.length} 个项目:`);

    // 分类显示
    const directories = files.filter((f) => f.is_dir);
    const regularFiles = files.filter((f) => !f.is_dir);

    console.log(`\n📁 目录 (${directories.length}):`);
    directories.slice(0, 10).forEach((dir) => {
      console.log(`  ${dir.name}`);
    });

    console.log(`\n📄 文件 (${regularFiles.length}):`);
    regularFiles.slice(0, 10).forEach((file) => {
      const size = formatBytes(file.size);
      console.log(`  ${file.name} (${size})`);
    });

    if (files.length > 20) {
      console.log(`\n... 还有 ${files.length - 20} 个项目`);
    }
  } catch (error) {
    console.error('❌ 列出目录失败:', error);
  }

  console.groupEnd();
}

// ============ 安全性测试 ============

export async function testSecurity() {
  console.group('🔒 安全性测试');

  const dangerousPaths = [
    '/etc/passwd',
    '/etc/shadow',
    '/.ssh/id_rsa',
    '/sys/kernel',
    'C:\\Windows\\System32\\config\\SAM',
  ];

  for (const path of dangerousPaths) {
    try {
      console.log(`\n尝试读取敏感文件: ${path}`);
      await invoke<string>('read_file', { path });
      console.warn('⚠️ 警告: 能够读取敏感文件！');
    } catch (error) {
      console.log(`✅ 正确阻止访问: ${error}`);
    }
  }

  console.groupEnd();
}

// ============ 文件大小限制测试 ============

export async function testFileSizeLimit() {
  console.group('📏 文件大小限制测试');

  try {
    // 创建一个超过 10MB 的字符串
    const largeContent = 'x'.repeat(11 * 1024 * 1024); // 11MB

    console.log('\n尝试写入 11MB 文件（超过 10MB 限制）');
    await invoke('write_file', {
      path: '~/large-file.txt',
      content: largeContent,
    });
    console.warn('⚠️ 警告: 能够写入超大文件！');
  } catch (error) {
    console.log(`✅ 正确拒绝大文件: ${error}`);
  }

  console.groupEnd();
}

// ============ 工具函数 ============

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// ============ 运行所有测试 ============

export async function runAllTests() {
  console.log('🚀 开始文件系统 API 测试...\n');

  await testFileOperations();
  await testDirectoryOperations();
  await listHomeDirectory();
  await testSecurity();
  await testFileSizeLimit();

  console.log('\n🎉 所有测试完成！');
}

// ============ React 组件示例 ============

export function FileSystemTester() {
  const handleRunTests = async () => {
    await runAllTests();
  };

  return (
    <div>
      <h2>文件系统 API 测试</h2>
      <button onClick={handleRunTests}>运行所有测试</button>
      <p>测试结果请查看控制台</p>
    </div>
  );
}

// 使用方法:
// import { runAllTests } from './filesystem-test-examples';
//
// // 在应用启动时运行测试
// runAllTests();
//
// // 或在组件中使用
// <FileSystemTester />
