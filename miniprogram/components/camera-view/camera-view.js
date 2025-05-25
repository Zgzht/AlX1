// components/camera-view/camera-view.js
const api = require('../../utils/api')

Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    }
  },

  data: {
    devicePosition: 'back',
    flash: 'off',
    imageUrl: '',
    recognitionResult: null,
    recognizing: false,
    submitting: false,
    guideText: '将环保行为对准取景框'
  },

  lifetimes: {
    attached() {
      this.cameraContext = wx.createCameraContext()
    }
  },

  methods: {
    // 拍照
    takePhoto() {
      if (this.data.recognizing) return
      
      this.cameraContext.takePhoto({
        quality: 'high',
        success: (res) => {
          this.setData({
            imageUrl: res.tempImagePath,
            recognizing: true
          })
          
          // 开始识别
          this.recognizeImage(res.tempImagePath)
        },
        fail: (err) => {
          console.error('拍照失败:', err)
          wx.showToast({
            title: '拍照失败',
            icon: 'none'
          })
        }
      })
    },

    // 从相册选择
    selectFromAlbum() {
      wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album'],
        success: (res) => {
          const imageUrl = res.tempFilePaths[0]
          this.setData({
            imageUrl: imageUrl,
            recognizing: true
          })
          
          // 开始识别
          this.recognizeImage(imageUrl)
        }
      })
    },

    // 重新拍照
    retakePhoto() {
      this.setData({
        imageUrl: '',
        recognitionResult: null,
        recognizing: false,
        submitting: false
      })
    },

    // 确认提交
    confirmPhoto() {
      if (!this.data.recognitionResult || this.data.submitting) return
      
      this.setData({ submitting: true })
      
      const { recognitionResult, imageUrl } = this.data
      
      // 先上传图片
      this.uploadImage(imageUrl).then(uploadResult => {
        if (uploadResult.success) {
          // 提交环保行为
          return api.submitEcoAction({
            type: recognitionResult.type,
            name: recognitionResult.name,
            description: recognitionResult.description,
            score: recognitionResult.score,
            confidence: recognitionResult.confidence / 100,
            imageUrl: uploadResult.data.url
          })
        } else {
          throw new Error('图片上传失败')
        }
      }).then(result => {
        if (result.success) {
          wx.showToast({
            title: '提交成功',
            icon: 'success'
          })
          
          // 触发成功事件
          this.triggerEvent('success', {
            action: result.data,
            score: recognitionResult.score
          })
          
          // 重置状态
          this.resetCamera()
        } else {
          throw new Error(result.message || '提交失败')
        }
      }).catch(error => {
        console.error('提交失败:', error)
        wx.showToast({
          title: error.message || '提交失败',
          icon: 'none'
        })
      }).finally(() => {
        this.setData({ submitting: false })
      })
    },

    // 图像识别
    recognizeImage(imageUrl) {
      // 先上传图片获取URL
      this.uploadImage(imageUrl).then(uploadResult => {
        if (uploadResult.success) {
          // 调用识别API
          return api.recognizeImage(uploadResult.data.url)
        } else {
          throw new Error('图片上传失败')
        }
      }).then(result => {
        if (result.success) {
          this.setData({
            recognitionResult: {
              type: result.data.type,
              name: result.data.name,
              description: result.data.description,
              score: result.data.score,
              confidence: Math.round(result.data.confidence * 100)
            }
          })
        } else {
          wx.showToast({
            title: result.message || '识别失败，请重新拍照',
            icon: 'none'
          })
          this.retakePhoto()
        }
      }).catch(error => {
        console.error('识别失败:', error)
        wx.showToast({
          title: '识别失败，请重新拍照',
          icon: 'none'
        })
        this.retakePhoto()
      }).finally(() => {
        this.setData({ recognizing: false })
      })
    },

    // 上传图片
    uploadImage(filePath) {
      return new Promise((resolve, reject) => {
        wx.uploadFile({
          url: api.baseUrl + '/upload/image',
          filePath: filePath,
          name: 'image',
          header: {
            'Authorization': 'Bearer ' + wx.getStorageSync('token')
          },
          success: (res) => {
            try {
              const data = JSON.parse(res.data)
              resolve(data)
            } catch (error) {
              reject(error)
            }
          },
          fail: reject
        })
      })
    },

    // 切换摄像头
    switchCamera() {
      this.setData({
        devicePosition: this.data.devicePosition === 'back' ? 'front' : 'back'
      })
    },

    // 切换闪光灯
    toggleFlash() {
      this.setData({
        flash: this.data.flash === 'off' ? 'on' : 'off'
      })
    },

    // 相机错误
    onCameraError(e) {
      console.error('相机错误:', e.detail)
      wx.showToast({
        title: '相机启动失败',
        icon: 'none'
      })
    },

    // 相机停止
    onCameraStop() {
      console.log('相机已停止')
    },

    // 相机就绪
    onCameraReady() {
      console.log('相机已就绪')
    },

    // 取消
    onCancel() {
      this.triggerEvent('cancel')
      this.resetCamera()
    },

    // 重置相机
    resetCamera() {
      this.setData({
        imageUrl: '',
        recognitionResult: null,
        recognizing: false,
        submitting: false,
        devicePosition: 'back',
        flash: 'off'
      })
    }
  }
})