// 格式化时间
const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

// 格式化日期为 YYYY-MM-DD
const formatDate = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}-${formatNumber(month)}-${formatNumber(day)}`
}

// 计算两个日期之间的天数差
const daysBetween = (date1, date2) => {
  const oneDay = 24 * 60 * 60 * 1000
  return Math.round(Math.abs((date1 - date2) / oneDay))
}

// 防抖函数
const debounce = (func, wait) => {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// 节流函数
const throttle = (func, limit) => {
  let inThrottle
  return function() {
    const args = arguments
    const context = this
    if (!inThrottle) {
      func.apply(context, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// 生成随机ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// 深拷贝
const deepClone = obj => {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime())
  if (obj instanceof Array) return obj.map(item => deepClone(item))
  if (typeof obj === 'object') {
    const clonedObj = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }
}

// 数组去重
const unique = arr => {
  return [...new Set(arr)]
}

// 数字格式化（添加千分位分隔符）
const formatNumber = num => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// 计算文件大小
const formatFileSize = bytes => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 验证手机号
const validatePhone = phone => {
  const reg = /^1[3-9]\d{9}$/
  return reg.test(phone)
}

// 验证邮箱
const validateEmail = email => {
  const reg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return reg.test(email)
}

// 获取图片信息
const getImageInfo = src => {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({
      src,
      success: resolve,
      fail: reject
    })
  })
}

// 压缩图片
const compressImage = (src, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    wx.compressImage({
      src,
      quality,
      success: resolve,
      fail: reject
    })
  })
}

// 选择图片
const chooseImage = (count = 1, sourceType = ['album', 'camera']) => {
  return new Promise((resolve, reject) => {
    wx.chooseImage({
      count,
      sourceType,
      success: resolve,
      fail: reject
    })
  })
}

// 上传文件
const uploadFile = (url, filePath, name = 'file', formData = {}) => {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url,
      filePath,
      name,
      formData,
      success: resolve,
      fail: reject
    })
  })
}

// 获取位置信息
const getLocation = () => {
  return new Promise((resolve, reject) => {
    wx.getLocation({
      type: 'gcj02',
      success: resolve,
      fail: reject
    })
  })
}

// 存储数据
const setStorage = (key, data) => {
  return new Promise((resolve, reject) => {
    wx.setStorage({
      key,
      data,
      success: resolve,
      fail: reject
    })
  })
}

// 获取存储数据
const getStorage = key => {
  return new Promise((resolve, reject) => {
    wx.getStorage({
      key,
      success: resolve,
      fail: reject
    })
  })
}

// 环保行为类型映射
const ecoActionTypes = {
  'garbage_sorting': '垃圾分类',
  'energy_saving': '节能减排',
  'green_travel': '绿色出行',
  'eco_shopping': '环保购物',
  'water_saving': '节约用水',
  'paper_saving': '节约用纸'
}

// 获取环保行为类型名称
const getEcoActionName = type => {
  return ecoActionTypes[type] || '未知行为'
}

// 计算环保积分
const calculateEcoScore = (actionType, level = 1) => {
  const baseScores = {
    'garbage_sorting': 10,
    'energy_saving': 15,
    'green_travel': 20,
    'eco_shopping': 12,
    'water_saving': 8,
    'paper_saving': 6
  }
  
  const baseScore = baseScores[actionType] || 5
  return Math.floor(baseScore * (1 + level * 0.1))
}

// 获取用户等级
const getUserLevel = score => {
  if (score < 100) return 1
  if (score < 300) return 2
  if (score < 600) return 3
  if (score < 1000) return 4
  if (score < 1500) return 5
  return Math.min(10, Math.floor(score / 300) + 1)
}

// 获取等级名称
const getLevelName = level => {
  const levelNames = {
    1: '环保新手',
    2: '环保爱好者',
    3: '环保达人',
    4: '环保专家',
    5: '环保大师',
    6: '环保导师',
    7: '环保领袖',
    8: '环保先锋',
    9: '环保卫士',
    10: '环保守护者'
  }
  return levelNames[level] || '环保新手'
}

module.exports = {
  formatTime,
  formatDate,
  daysBetween,
  debounce,
  throttle,
  generateId,
  deepClone,
  unique,
  formatNumber,
  formatFileSize,
  validatePhone,
  validateEmail,
  getImageInfo,
  compressImage,
  chooseImage,
  uploadFile,
  getLocation,
  setStorage,
  getStorage,
  getEcoActionName,
  calculateEcoScore,
  getUserLevel,
  getLevelName
}