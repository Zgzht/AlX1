// API 接口封装
const app = getApp()

// 基础请求方法
const request = (url, options = {}) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: app.globalData.serverUrl + url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'content-type': 'application/json',
        'Authorization': wx.getStorageSync('token') || '',
        ...options.header
      },
      success: res => {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else if (res.statusCode === 401) {
          // 未授权，清除token并跳转登录
          wx.removeStorageSync('token')
          wx.navigateTo({
            url: '/pages/login/login'
          })
          reject(res)
        } else {
          reject(res)
        }
      },
      fail: err => {
        console.error('请求失败:', err)
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        })
        reject(err)
      }
    })
  })
}

// 用户相关API
const userAPI = {
  // 用户登录
  login: (code, userInfo) => {
    return request('/api/user/login', {
      method: 'POST',
      data: { code, userInfo }
    })
  },

  // 获取用户信息
  getUserInfo: () => {
    return request('/api/user/info')
  },

  // 更新用户信息
  updateUserInfo: (userInfo) => {
    return request('/api/user/update', {
      method: 'PUT',
      data: userInfo
    })
  },

  // 获取用户积分
  getUserScore: () => {
    return request('/api/user/score')
  },

  // 获取用户排名
  getUserRanking: () => {
    return request('/api/user/ranking')
  }
}

// 环保行为相关API
const ecoAPI = {
  // 提交环保行为
  submitAction: (actionData) => {
    return request('/api/eco/action', {
      method: 'POST',
      data: actionData
    })
  },

  // 图像识别
  recognizeImage: (imageUrl) => {
    return request('/api/eco/recognize', {
      method: 'POST',
      data: { imageUrl }
    })
  },

  // 获取环保行为历史
  getActionHistory: (page = 1, limit = 20) => {
    return request(`/api/eco/actions?page=${page}&limit=${limit}`)
  },

  // 获取今日环保行为
  getTodayActions: () => {
    return request('/api/eco/today')
  },

  // 获取环保统计
  getEcoStats: (period = 'week') => {
    return request(`/api/eco/stats?period=${period}`)
  },

  // 获取环保报告
  getEcoReport: (startDate, endDate) => {
    return request(`/api/eco/report?start=${startDate}&end=${endDate}`)
  }
}

// 任务相关API
const taskAPI = {
  // 获取任务列表
  getTasks: () => {
    return request('/api/tasks')
  },

  // 完成任务
  completeTask: (taskId) => {
    return request(`/api/tasks/${taskId}/complete`, {
      method: 'POST'
    })
  },

  // 获取任务进度
  getTaskProgress: (taskId) => {
    return request(`/api/tasks/${taskId}/progress`)
  }
}

// 排行榜相关API
const rankingAPI = {
  // 获取排行榜
  getRanking: (type = 'score', period = 'week') => {
    return request(`/api/ranking?type=${type}&period=${period}`)
  },

  // 获取好友排行
  getFriendsRanking: () => {
    return request('/api/ranking/friends')
  }
}

// 奖励相关API
const rewardAPI = {
  // 获取奖励列表
  getRewards: () => {
    return request('/api/rewards')
  },

  // 兑换奖励
  exchangeReward: (rewardId) => {
    return request(`/api/rewards/${rewardId}/exchange`, {
      method: 'POST'
    })
  },

  // 获取兑换历史
  getExchangeHistory: () => {
    return request('/api/rewards/history')
  }
}

// 上传图片
const uploadImage = (filePath) => {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: app.globalData.serverUrl + '/api/upload/image',
      filePath: filePath,
      name: 'image',
      header: {
        'Authorization': wx.getStorageSync('token') || ''
      },
      success: res => {
        try {
          const data = JSON.parse(res.data)
          if (data.success) {
            resolve(data.data)
          } else {
            reject(data.message)
          }
        } catch (e) {
          reject('上传失败')
        }
      },
      fail: reject
    })
  })
}

// 批量上传图片
const uploadImages = (filePaths) => {
  const uploadPromises = filePaths.map(filePath => uploadImage(filePath))
  return Promise.all(uploadPromises)
}

// 下载文件
const downloadFile = (url, fileName) => {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url: app.globalData.serverUrl + url,
      success: res => {
        if (res.statusCode === 200) {
          // 保存到相册
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: resolve,
            fail: reject
          })
        } else {
          reject(res)
        }
      },
      fail: reject
    })
  })
}

// 获取二维码
const getQRCode = (data) => {
  return request('/api/qrcode', {
    method: 'POST',
    data: { data }
  })
}

// 分享相关API
const shareAPI = {
  // 分享环保成果
  shareEcoResult: (actionId) => {
    return request(`/api/share/eco/${actionId}`, {
      method: 'POST'
    })
  },

  // 获取分享数据
  getShareData: (type, id) => {
    return request(`/api/share/${type}/${id}`)
  }
}

// 消息相关API
const messageAPI = {
  // 获取消息列表
  getMessages: (page = 1, limit = 20) => {
    return request(`/api/messages?page=${page}&limit=${limit}`)
  },

  // 标记消息已读
  markAsRead: (messageId) => {
    return request(`/api/messages/${messageId}/read`, {
      method: 'PUT'
    })
  },

  // 获取未读消息数量
  getUnreadCount: () => {
    return request('/api/messages/unread/count')
  }
}

module.exports = {
  request,
  userAPI,
  ecoAPI,
  taskAPI,
  rankingAPI,
  rewardAPI,
  shareAPI,
  messageAPI,
  uploadImage,
  uploadImages,
  downloadFile,
  getQRCode
}