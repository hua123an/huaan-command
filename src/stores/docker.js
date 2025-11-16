import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useDockerStore = defineStore('docker', () => {
  const containers = ref([])
  const images = ref([])
  const volumes = ref([])
  const networks = ref([])
  const dockerInstalled = ref(false)

  // 解析 docker ps 输出
  function parseContainers(output) {
    try {
      const lines = output.split('\n')
      const containerList = []
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        const parts = line.split(/\s{2,}/)
        if (parts.length >= 6) {
          containerList.push({
            id: parts[0],
            image: parts[1],
            command: parts[2],
            created: parts[3],
            status: parts[4],
            ports: parts[5],
            names: parts[6] || ''
          })
        }
      }
      
      return containerList
    } catch (error) {
      console.error('解析容器列表失败:', error)
      return []
    }
  }

  // 更新容器列表
  function updateContainers(output) {
    containers.value = parseContainers(output)
    dockerInstalled.value = true
  }

  // 解析 docker images 输出
  function parseImages(output) {
    try {
      const lines = output.split('\n')
      const imageList = []
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        const parts = line.split(/\s+/)
        if (parts.length >= 5) {
          imageList.push({
            repository: parts[0],
            tag: parts[1],
            id: parts[2],
            created: parts[3],
            size: parts[4]
          })
        }
      }
      
      return imageList
    } catch (error) {
      console.error('解析镜像列表失败:', error)
      return []
    }
  }

  // 更新镜像列表
  function updateImages(output) {
    images.value = parseImages(output)
  }

  // Docker 命令生成器
  const commands = {
    // 容器操作
    listContainers: () => 'docker ps -a',
    startContainer: (id) => `docker start ${id}`,
    stopContainer: (id) => `docker stop ${id}`,
    restartContainer: (id) => `docker restart ${id}`,
    removeContainer: (id, force = false) => `docker rm ${force ? '-f' : ''} ${id}`,
    logsContainer: (id, tail = 100) => `docker logs --tail ${tail} -f ${id}`,
    execContainer: (id, command = '/bin/bash') => `docker exec -it ${id} ${command}`,
    inspectContainer: (id) => `docker inspect ${id}`,
    statsContainer: (id) => `docker stats ${id}`,

    // 镜像操作
    listImages: () => 'docker images',
    pullImage: (image) => `docker pull ${image}`,
    removeImage: (id, force = false) => `docker rmi ${force ? '-f' : ''} ${id}`,
    buildImage: (path, tag) => `docker build -t ${tag} ${path}`,
    tagImage: (image, tag) => `docker tag ${image} ${tag}`,

    // 卷操作
    listVolumes: () => 'docker volume ls',
    createVolume: (name) => `docker volume create ${name}`,
    removeVolume: (name) => `docker volume rm ${name}`,
    inspectVolume: (name) => `docker volume inspect ${name}`,

    // 网络操作
    listNetworks: () => 'docker network ls',
    createNetwork: (name) => `docker network create ${name}`,
    removeNetwork: (name) => `docker network rm ${name}`,
    inspectNetwork: (name) => `docker network inspect ${name}`,

    // 系统操作
    systemInfo: () => 'docker info',
    systemDf: () => 'docker system df',
    systemPrune: (all = false) => `docker system prune ${all ? '-a' : ''} -f`,
    
    // Docker Compose
    composeUp: (file = 'docker-compose.yml') => `docker-compose -f ${file} up -d`,
    composeDown: (file = 'docker-compose.yml') => `docker-compose -f ${file} down`,
    composeLogs: (file = 'docker-compose.yml') => `docker-compose -f ${file} logs -f`,
    composePs: (file = 'docker-compose.yml') => `docker-compose -f ${file} ps`
  }

  // 获取容器状态颜色
  function getContainerStatusColor(status) {
    const statusLower = status.toLowerCase()
    if (statusLower.includes('up')) return '#32d74b' // 绿色
    if (statusLower.includes('exited')) return '#636366' // 灰色
    if (statusLower.includes('paused')) return '#ffd60a' // 黄色
    if (statusLower.includes('restarting')) return '#0a84ff' // 蓝色
    return '#ff453a' // 红色
  }

  // 快速操作模板
  const quickActions = [
    {
      name: '清理所有停止的容器',
      command: 'docker container prune -f',
      description: '删除所有已停止的容器'
    },
    {
      name: '清理未使用的镜像',
      command: 'docker image prune -a -f',
      description: '删除所有未使用的镜像'
    },
    {
      name: '清理未使用的卷',
      command: 'docker volume prune -f',
      description: '删除所有未使用的卷'
    },
    {
      name: '清理所有资源',
      command: 'docker system prune -a --volumes -f',
      description: '清理所有未使用的容器、镜像、卷和网络'
    },
    {
      name: '查看 Docker 磁盘使用',
      command: 'docker system df',
      description: '显示 Docker 占用的磁盘空间'
    },
    {
      name: '停止所有容器',
      command: 'docker stop $(docker ps -q)',
      description: '停止所有正在运行的容器'
    }
  ]

  return {
    containers,
    images,
    volumes,
    networks,
    dockerInstalled,
    commands,
    quickActions,
    updateContainers,
    updateImages,
    getContainerStatusColor
  }
})

