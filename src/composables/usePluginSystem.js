import { ref, computed } from 'vue'

// 插件接口定义
export const PluginInterface = {
  name: 'string',
  version: 'string',
  description: 'string',
  author: 'string',
  homepage: 'string',
  main: 'string',
  permissions: 'array',
  dependencies: 'array',
  hooks: 'object'
}

// 插件状态
export const PluginStatus = {
  INSTALLED: 'installed',
  ENABLED: 'enabled',
  DISABLED: 'disabled',
  ERROR: 'error'
}

// 插件管理 Composable
export function usePluginSystem() {
  // 状态
  const plugins = ref(new Map())
  const loadedPlugins = ref(new Map())
  const hooks = ref(new Map())
  
  // 插件注册表
  const registry = ref({})
  
  // 注册插件
  const registerPlugin = (pluginConfig) => {
    try {
      // 验证插件配置
      validatePluginConfig(pluginConfig)
      
      // 检查依赖
      checkDependencies(pluginConfig)
      
      // 创建插件实例
      const plugin = createPluginInstance(pluginConfig)
      
      // 存储插件
      plugins.value.set(pluginConfig.name, {
        ...pluginConfig,
        status: PluginStatus.INSTALLED,
        instance: plugin,
        installedAt: new Date()
      })
      
      // 注册钩子
      registerHooks(pluginConfig.name, pluginConfig.hooks)
      
      console.log(`插件 ${pluginConfig.name} 注册成功`)
      return true
    } catch (error) {
      console.error(`插件 ${pluginConfig.name} 注册失败:`, error)
      return false
    }
  }
  
  // 卸载插件
  const unregisterPlugin = (pluginName) => {
    const plugin = plugins.value.get(pluginName)
    if (!plugin) return false
    
    try {
      // 卸载钩子
      unregisterHooks(pluginName)
      
      // 销毁插件实例
      if (plugin.instance && typeof plugin.instance.destroy === 'function') {
        plugin.instance.destroy()
      }
      
      // 移除插件
      plugins.value.delete(pluginName)
      
      console.log(`插件 ${pluginName} 卸载成功`)
      return true
    } catch (error) {
      console.error(`插件 ${pluginName} 卸载失败:`, error)
      return false
    }
  }
  
  // 启用插件
  const enablePlugin = (pluginName) => {
    const plugin = plugins.value.get(pluginName)
    if (!plugin) return false
    
    try {
      // 检查权限
      checkPermissions(plugin)
      
      // 启用插件
      if (plugin.instance && typeof plugin.instance.enable === 'function') {
        plugin.instance.enable()
      }
      
      plugin.status = PluginStatus.ENABLED
      
      console.log(`插件 ${pluginName} 启用成功`)
      return true
    } catch (error) {
      plugin.status = PluginStatus.ERROR
      console.error(`插件 ${pluginName} 启动失败:`, error)
      return false
    }
  }
  
  // 禁用插件
  const disablePlugin = (pluginName) => {
    const plugin = plugins.value.get(pluginName)
    if (!plugin) return false
    
    try {
      // 禁用插件
      if (plugin.instance && typeof plugin.instance.disable === 'function') {
        plugin.instance.disable()
      }
      
      plugin.status = PluginStatus.DISABLED
      
      console.log(`插件 ${pluginName} 禁用成功`)
      return true
    } catch (error) {
      plugin.status = PluginStatus.ERROR
      console.error(`插件 ${pluginName} 禁用失败:`, error)
      return false
    }
  }
  
  // 获取插件列表
  const getPluginList = () => {
    return Array.from(plugins.value.values()).map(plugin => ({
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      author: plugin.author,
      status: plugin.status,
      installedAt: plugin.installedAt
    }))
  }
  
  // 获取启用的插件
  const getEnabledPlugins = () => {
    return Array.from(plugins.value.values())
      .filter(plugin => plugin.status === PluginStatus.ENABLED)
  }
  
  // 执行钩子
  const executeHook = async (hookName, ...args) => {
    const hookHandlers = hooks.value.get(hookName) || []
    const results = []
    
    for (const handler of hookHandlers) {
      try {
        const result = await handler(...args)
        results.push(result)
      } catch (error) {
        console.error(`钩子 ${hookName} 执行失败:`, error)
        results.push({ error })
      }
    }
    
    return results
  }
  
  // 验证插件配置
  const validatePluginConfig = (config) => {
    const required = ['name', 'version', 'description', 'main']
    
    for (const field of required) {
      if (!config[field]) {
        throw new Error(`缺少必需字段: ${field}`)
      }
    }
    
    if (typeof config.name !== 'string') {
      throw new Error('插件名称必须是字符串')
    }
    
    if (!/^[a-z][a-z0-9-_]*$/i.test(config.name)) {
      throw new Error('插件名称只能包含字母、数字、下划线和连字符')
    }
    
    if (!/^\d+\.\d+\.\d+$/.test(config.version)) {
      throw new Error('插件版本必须是 semver 格式')
    }
  }
  
  // 检查依赖
  const checkDependencies = (config) => {
    if (!config.dependencies || config.dependencies.length === 0) {
      return
    }
    
    for (const dep of config.dependencies) {
      if (!plugins.value.has(dep)) {
        throw new Error(`缺少依赖插件: ${dep}`)
      }
      
      const depPlugin = plugins.value.get(dep)
      if (depPlugin.status !== PluginStatus.ENABLED) {
        throw new Error(`依赖插件 ${dep} 未启用`)
      }
    }
  }
  
  // 检查权限
  const checkPermissions = (plugin) => {
    if (!plugin.permissions || plugin.permissions.length === 0) {
      return
    }
    
    // 这里可以实现权限检查逻辑
    // 例如: 检查文件系统权限、网络权限等
    console.log(`插件 ${plugin.name} 请求权限:`, plugin.permissions)
  }
  
  // 创建插件实例
  const createPluginInstance = (config) => {
    try {
      // 这里应该动态加载插件代码
      // 由于安全考虑，这里只是一个示例实现
      
      const plugin = {
        name: config.name,
        version: config.version,
        description: config.description,
        
        // 插件生命周期方法
        enable: () => {
          console.log(`插件 ${config.name} 已启用`)
        },
        
        disable: () => {
          console.log(`插件 ${config.name} 已禁用`)
        },
        
        destroy: () => {
          console.log(`插件 ${config.name} 已销毁`)
        },
        
        // 插件功能
        execute: async (command, args) => {
          console.log(`插件 ${config.name} 执行命令:`, command, args)
          return { success: true, result: '命令执行成功' }
        }
      }
      
      return plugin
    } catch (error) {
      throw new Error(`创建插件实例失败: ${error.message}`)
    }
  }
  
  // 注册钩子
  const registerHooks = (pluginName, pluginHooks) => {
    if (!pluginHooks) return
    
    Object.entries(pluginHooks).forEach(([hookName, handler]) => {
      if (!hooks.value.has(hookName)) {
        hooks.value.set(hookName, [])
      }
      
      const wrappedHandler = async (...args) => {
        try {
          return await handler({
            pluginName,
            executeHook: executeHook
          }, ...args)
        } catch (error) {
          console.error(`插件 ${pluginName} 钩子 ${hookName} 执行失败:`, error)
          throw error
        }
      }
      
      hooks.value.get(hookName).push(wrappedHandler)
    })
  }
  
  // 卸载钩子
  const unregisterHooks = (pluginName) => {
    hooks.value.forEach((handlers, hookName) => {
      const filteredHandlers = handlers.filter(handler => {
        try {
          // 检查是否是该插件的钩子
          const handlerString = handler.toString()
          return !handlerString.includes(pluginName)
        } catch {
          return true
        }
      })
      
      if (filteredHandlers.length === 0) {
        hooks.value.delete(hookName)
      } else {
        hooks.value.set(hookName, filteredHandlers)
      }
    })
  }
  
  // 加载插件包
  const loadPluginPackage = async (packageUrl) => {
    try {
      // 这里应该实现从 URL 加载插件包的逻辑
      const response = await fetch(packageUrl)
      const pluginConfig = await response.json()
      
      return registerPlugin(pluginConfig)
    } catch (error) {
      console.error('加载插件包失败:', error)
      return false
    }
  }
  
  // 获取插件市场
  const getPluginMarketplace = () => {
    // 这里应该从服务器获取插件市场信息
    return [
      {
        name: 'theme-pack',
        version: '1.0.0',
        description: '额外的主题包',
        author: 'Huaan Team',
        homepage: 'https://github.com/huaan/theme-pack',
        packageUrl: 'https://releases.huaan.com/plugins/theme-pack.json',
        permissions: ['theme'],
        dependencies: [],
        hooks: {
          'theme:load': 'loadTheme',
          'theme:apply': 'applyTheme'
        }
      },
      {
        name: 'command-shortcuts',
        version: '1.2.0',
        description: '额外的命令快捷键',
        author: 'Huaan Team',
        homepage: 'https://github.com/huaan/command-shortcuts',
        packageUrl: 'https://releases.huaan.com/plugins/command-shortcuts.json',
        permissions: ['shortcuts'],
        dependencies: [],
        hooks: {
          'shortcut:register': 'registerShortcut',
          'shortcut:execute': 'executeShortcut'
        }
      }
    ]
  }
  
  return {
    plugins,
    loadedPlugins,
    hooks,
    registry,
    registerPlugin,
    unregisterPlugin,
    enablePlugin,
    disablePlugin,
    getPluginList,
    getEnabledPlugins,
    executeHook,
    loadPluginPackage,
    getPluginMarketplace
  }
}