/**
 * 内置命令系统
 * 提供快捷的 AI 功能命令，使用 : 前缀
 */

export function useBuiltinCommands() {
  /**
   * 内置命令定义
   * key: 命令名称（包含 : 前缀）
   * value: AI 提示词模板或函数
   */
  const builtinCommands = {
    // 娱乐类
    ':joke': '给我讲一个程序员笑话，要幽默有趣',
    ':smile': '给我一句励志的话，鼓舞人心的那种',
    ':quote': '分享一句关于编程或技术的名言',
    ':zen': '分享一句禅意的话，让人平静思考',

    // 实用类
    ':tip': '给我一个终端使用技巧或 shell 命令技巧',
    ':debug': '分析终端中最近的错误输出，给出解决方案',
    ':explain': (args) => args ? `详细解释这个命令的作用: ${args}` : '请提供需要解释的命令',
    ':how': (args) => args ? `如何使用命令行实现: ${args}` : '请描述你想实现的功能',

    // Git 相关
    ':commit': '根据当前的代码变更生成一个好的 git commit message',
    ':review': '审查当前的代码变更，给出改进建议',
    ':branch': '建议一个合适的 git 分支名称',

    // 开发相关
    ':doc': (args) => args ? `为这段代码生成文档: ${args}` : '为当前代码生成文档注释',
    ':test': (args) => args ? `为这个函数生成测试用例: ${args}` : '生成测试用例的建议',
    ':refactor': '分析当前代码，给出重构建议',
    ':perf': '给出性能优化建议',

    // 学习类
    ':learn': (args) => args ? `教我学习: ${args}` : '我想学习新知识，给我建议',
    ':book': (args) => args ? `推荐关于 ${args} 的技术书籍` : '推荐优秀的技术书籍',
    ':course': (args) => args ? `推荐学习 ${args} 的在线课程或资源` : '推荐优质的编程学习资源',

    // 系统相关
    ':fix': '帮我修复最近遇到的错误',
    ':clean': '给我清理系统或项目的建议',
    ':setup': (args) => args ? `如何安装和配置 ${args}` : '给我开发环境配置建议',

    // 创意类
    ':name': (args) => args ? `为 ${args} 起一个好听的名字` : '帮我起一个项目名称',
    ':idea': '给我一个有趣的项目想法',
    ':color': '推荐一套好看的配色方案',

    // 帮助
    ':help': '列出所有可用的内置命令及其说明',
    ':list': '列出所有可用的内置命令'
  }

  /**
   * 检查是否是内置命令
   */
  const isBuiltinCommand = (input) => {
    if (!input || typeof input !== 'string') return false
    const command = input.trim().split(/\s+/)[0]
    return command.startsWith(':') && builtinCommands.hasOwnProperty(command)
  }

  /**
   * 获取命令的 AI 提示词
   */
  const getCommandPrompt = (input) => {
    const parts = input.trim().split(/\s+/)
    const command = parts[0]
    const args = parts.slice(1).join(' ')

    if (!builtinCommands.hasOwnProperty(command)) {
      return null
    }

    const template = builtinCommands[command]

    // 如果是函数，调用函数生成提示词
    if (typeof template === 'function') {
      return template(args)
    }

    // 否则直接返回模板
    return template
  }

  /**
   * 获取帮助信息
   */
  const getHelpMessage = () => {
    const categories = {
      '娱乐类': [':joke', ':smile', ':quote', ':zen'],
      '实用类': [':tip', ':debug', ':explain', ':how'],
      'Git 相关': [':commit', ':review', ':branch'],
      '开发相关': [':doc', ':test', ':refactor', ':perf'],
      '学习类': [':learn', ':book', ':course'],
      '系统相关': [':fix', ':clean', ':setup'],
      '创意类': [':name', ':idea', ':color'],
      '帮助': [':help', ':list']
    }

    let help = '\n内置命令列表:\n\n'

    for (const [category, commands] of Object.entries(categories)) {
      help += `${category}:\n`
      for (const cmd of commands) {
        const template = builtinCommands[cmd]
        const description = typeof template === 'function'
          ? template('').replace(/: $/, '')
          : template
        help += `  ${cmd.padEnd(12)} - ${description}\n`
      }
      help += '\n'
    }

    help += '使用方法: 直接输入命令，例如 :joke\n'
    help += '带参数命令: :explain ls -la\n'

    return help
  }

  /**
   * 获取所有命令列表
   */
  const getAllCommands = () => {
    return Object.keys(builtinCommands)
  }

  return {
    builtinCommands,
    isBuiltinCommand,
    getCommandPrompt,
    getHelpMessage,
    getAllCommands
  }
}
