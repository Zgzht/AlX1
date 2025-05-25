// app.js
App({
  globalData: {
    userInfo: null,
    serverUrl: 'https://work-1-etvvzsaewrvmavhp.prod-runtime.all-hands.dev',
    userScore: 0,
    userLevel: 1,
    todayActions: 0
  },

  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        console.log('登录成功', res.code)
        this.getUserInfo()
      }
    })

    // 检查更新
    this.checkForUpdate()
  },

  getUserInfo() {
    // 获取用户信息
    wx.getSetting({
      success: res => {
        if (res.authSetting['scope.userInfo']) {
          wx.getUserInfo({
            success: res => {
              this.globalData.userInfo = res.userInfo
              if (this.userInfoReadyCallback) {
                this.userInfoReadyCallback(res)
              }
            }
          })
        }
      }
    })
  },

  checkForUpdate() {
    const updateManager = wx.getUpdateManager()
    updateManager.onCheckForUpdate(function (res) {
      console.log('检查更新结果:', res.hasUpdate)
    })

    updateManager.onUpdateReady(function () {
      wx.showModal({
        title: '更新提示',
        content: '新版本已经准备好，是否重启应用？',
        success: function (res) {
          if (res.confirm) {
            updateManager.applyUpdate()
          }
        }
      })
    })

    updateManager.onUpdateFailed(function () {
      console.log('新版本下载失败')
    })
  },

  // 网络请求封装
  request(options) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: this.globalData.serverUrl + options.url,
        method: options.method || 'GET',
        data: options.data || {},
        header: {
          'content-type': 'application/json',
          ...options.header
        },
        success: res => {
          if (res.statusCode === 200) {
            resolve(res.data)
          } else {
            reject(res)
          }
        },
        fail: reject
      })
    })
  },

  // 显示加载提示
  showLoading(title = '加载中...') {
    wx.showLoading({
      title: title,
      mask: true
    })
  },

  // 隐藏加载提示
  hideLoading() {
    wx.hideLoading()
  },

  // 显示成功提示
  showSuccess(title) {
    wx.showToast({
      title: title,
      icon: 'success',
      duration: 2000
    })
  },

  // 显示错误提示
  showError(title) {
    wx.showToast({
      title: title,
      icon: 'none',
      duration: 2000
    })
  }
})