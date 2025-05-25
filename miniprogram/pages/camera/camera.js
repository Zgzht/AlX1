// camera.js
const app = getApp()
const { ecoAPI, uploadImage } = require('../../utils/api')
const { chooseImage, compressImage, getLocation } = require('../../utils/util')

Page({
  data: {
    devicePosition: 'back',
    flash: 'off',
    showResult: false,
    currentImage: '',
    recognizing: false,
    recognitionResult: null,
    submitted: false,
    capturing: false,
    showTipsModal: false,
    recentActions: []
  },

  onLoad() {
    this.loadRecentActions()
  },

  onShow() {
    // 重置状态
    this.setData({
      showResult: false,
      recognitionResult: null,
      submitted: false
    })
  },

  // 拍照
  takePhoto() {
    if (this.data.capturing) return
    
    this.setData({ capturing: true })
    
    const ctx = wx.createCameraContext()
    ctx.takePhoto({
      quality: 'high',
      success: (res) => {
        console.log('拍照成功:', res.tempImagePath)
        this.setData({
          currentImage: res.tempImagePath,
          showResult: true,
          capturing: false
        })
      },
      fail: (err) => {
        console.error('拍照失败:', err)
        app.showError('拍照失败，请重试')
        this.setData({ capturing: false })
      }
    })
  },

  // 从相册选择
  async chooseFromGallery() {
    try {
      const res = await chooseImage(1, ['album'])
      if (res.tempFilePaths && res.tempFilePaths.length > 0) {
        this.setData({
          currentImage: res.tempFilePaths[0],
          showResult: true
        })
      }
    } catch (error) {
      console.error('选择图片失败:', error)
      if (error.errMsg && error.errMsg.includes('cancel')) {
        return // 用户取消选择
      }
      app.showError('选择图片失败')
    }
  },

  // 重新拍照
  retakePhoto() {
    this.setData({
      showResult: false,
      currentImage: '',
      recognitionResult: null,
      submitted: false
    })
  },

  // 继续拍照
  continuePhoto() {
    this.retakePhoto()
    this.loadRecentActions() // 刷新历史记录
  },

  // 识别图片
  async recognizeImage() {
    if (this.data.recognizing) return
    
    this.setData({ recognizing: true })
    
    try {
      // 压缩图片
      const compressRes = await compressImage(this.data.currentImage, 0.7)
      
      // 上传图片
      app.showLoading('上传图片中...')
      const uploadRes = await uploadImage(compressRes.tempFilePath)
      
      // 调用识别API
      app.showLoading('AI识别中...')
      const recognizeRes = await ecoAPI.recognizeImage(uploadRes.url)
      
      app.hideLoading()
      
      if (recognizeRes.success) {
        this.setData({
          recognitionResult: {
            success: true,
            data: {
              type: recognizeRes.data.type,
              name: recognizeRes.data.name,
              description: recognizeRes.data.description,
              score: recognizeRes.data.score,
              confidence: recognizeRes.data.confidence
            }
          }
        })
        
        // 播放成功音效
        wx.vibrateShort()
      } else {
        this.setData({
          recognitionResult: {
            success: false,
            message: recognizeRes.message || '识别失败，请重试'
          }
        })
      }
      
    } catch (error) {
      console.error('识别失败:', error)
      app.hideLoading()
      this.setData({
        recognitionResult: {
          success: false,
          message: '识别失败，请检查网络连接'
        }
      })
    } finally {
      this.setData({ recognizing: false })
    }
  },

  // 提交环保行为
  async submitAction() {
    if (!this.data.recognitionResult || !this.data.recognitionResult.success) {
      return
    }
    
    try {
      app.showLoading('提交中...')
      
      // 获取位置信息
      let location = null
      try {
        location = await getLocation()
      } catch (err) {
        console.log('获取位置失败:', err)
      }
      
      // 提交环保行为
      const actionData = {
        type: this.data.recognitionResult.data.type,
        name: this.data.recognitionResult.data.name,
        description: this.data.recognitionResult.data.description,
        score: this.data.recognitionResult.data.score,
        confidence: this.data.recognitionResult.data.confidence,
        imageUrl: this.data.currentImage,
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude
        } : null
      }
      
      const submitRes = await ecoAPI.submitAction(actionData)
      
      app.hideLoading()
      
      if (submitRes.success) {
        this.setData({ submitted: true })
        app.showSuccess(`恭喜获得 ${this.data.recognitionResult.data.score} 积分！`)
        
        // 更新全局数据
        app.globalData.userScore += this.data.recognitionResult.data.score
        app.globalData.todayActions += 1
        
        // 播放成功音效
        wx.vibrateShort()
      } else {
        app.showError(submitRes.message || '提交失败')
      }
      
    } catch (error) {
      console.error('提交失败:', error)
      app.hideLoading()
      app.showError('提交失败，请重试')
    }
  },

  // 切换闪光灯
  toggleFlash() {
    const flash = this.data.flash === 'off' ? 'on' : 'off'
    this.setData({ flash })
  },

  // 切换摄像头
  switchCamera() {
    const devicePosition = this.data.devicePosition === 'back' ? 'front' : 'back'
    this.setData({ devicePosition })
  },

  // 显示拍照技巧
  showTips() {
    this.setData({ showTipsModal: true })
  },

  // 隐藏拍照技巧
  hideTips() {
    this.setData({ showTipsModal: false })
  },

  // 加载最近的环保行为
  async loadRecentActions() {
    try {
      const res = await ecoAPI.getActionHistory(1, 5)
      if (res.success && res.data.actions) {
        this.setData({
          recentActions: res.data.actions.map(action => ({
            id: action.id,
            name: action.name,
            score: action.score,
            imageUrl: action.imageUrl || '/images/default-eco.png'
          }))
        })
      }
    } catch (error) {
      console.error('加载历史记录失败:', error)
    }
  },

  // 查看行为详情
  viewActionDetail(e) {
    const action = e.currentTarget.dataset.action
    wx.navigateTo({
      url: `/pages/action-detail/action-detail?id=${action.id}`
    })
  },

  // 相机错误处理
  error(e) {
    console.error('相机错误:', e.detail)
    wx.showModal({
      title: '相机权限',
      content: '需要相机权限才能拍照识别，请在设置中开启相机权限',
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting()
        }
      }
    })
  },

  // 页面分享
  onShareAppMessage() {
    return {
      title: '环保助手 - AI识别环保行为，让环保更简单',
      path: '/pages/camera/camera',
      imageUrl: '/images/share-camera.png'
    }
  },

  onShareTimeline() {
    return {
      title: '用AI识别环保行为，一起保护地球！',
      query: '',
      imageUrl: '/images/share-camera.png'
    }
  }
})