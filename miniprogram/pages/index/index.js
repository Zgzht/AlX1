// index.js
const app = getApp()
const { userAPI, ecoAPI, taskAPI } = require('../../utils/api')
const { getUserLevel, getLevelName } = require('../../utils/util')

Page({
  data: {
    userInfo: {},
    userScore: 0,
    userLevel: 1,
    levelName: '环保新手',
    levelProgress: 0,
    nextLevelScore: 100,
    todayActions: 0,
    todayActionsList: [],
    uncompletedTasks: 0,
    weeklyStats: [],
    currentTip: '每天坚持垃圾分类，为地球环保贡献一份力量！',
    loading: true
  },

  onLoad() {
    this.initPage()
  },

  onShow() {
    this.refreshData()
  },

  onPullDownRefresh() {
    this.refreshData().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 初始化页面
  async initPage() {
    try {
      // 获取用户信息
      if (app.globalData.userInfo) {
        this.setData({
          userInfo: app.globalData.userInfo
        })
      } else {
        // 等待用户信息加载
        app.userInfoReadyCallback = res => {
          this.setData({
            userInfo: res.userInfo
          })
        }
      }

      await this.loadUserData()
      await this.loadTodayActions()
      await this.loadTasks()
      await this.loadWeeklyStats()
      this.loadEcoTips()

    } catch (error) {
      console.error('初始化页面失败:', error)
      app.showError('加载数据失败')
    } finally {
      this.setData({ loading: false })
    }
  },

  // 刷新数据
  async refreshData() {
    try {
      await Promise.all([
        this.loadUserData(),
        this.loadTodayActions(),
        this.loadTasks(),
        this.loadWeeklyStats()
      ])
    } catch (error) {
      console.error('刷新数据失败:', error)
    }
  },

  // 加载用户数据
  async loadUserData() {
    try {
      const scoreRes = await userAPI.getUserScore()
      const score = scoreRes.data.score || 0
      const level = getUserLevel(score)
      const levelName = getLevelName(level)
      
      // 计算下一级所需积分
      const nextLevelScore = this.calculateNextLevelScore(level)
      const currentLevelScore = this.calculateCurrentLevelScore(level)
      const levelProgress = (score - currentLevelScore) / (nextLevelScore - currentLevelScore)

      this.setData({
        userScore: score,
        userLevel: level,
        levelName: levelName,
        levelProgress: Math.max(0, Math.min(1, levelProgress)),
        nextLevelScore: nextLevelScore
      })

      // 更新全局数据
      app.globalData.userScore = score
      app.globalData.userLevel = level

    } catch (error) {
      console.error('加载用户数据失败:', error)
    }
  },

  // 加载今日环保行为
  async loadTodayActions() {
    try {
      const res = await ecoAPI.getTodayActions()
      const actions = res.data.actions || []
      
      this.setData({
        todayActions: actions.length,
        todayActionsList: actions.slice(0, 3).map(action => ({
          id: action.id,
          name: action.name,
          type: action.type,
          score: action.score,
          time: this.formatActionTime(action.createdAt)
        }))
      })

      // 更新全局数据
      app.globalData.todayActions = actions.length

    } catch (error) {
      console.error('加载今日行为失败:', error)
    }
  },

  // 加载任务数据
  async loadTasks() {
    try {
      const res = await taskAPI.getTasks()
      const tasks = res.data.tasks || []
      const uncompletedTasks = tasks.filter(task => !task.completed).length
      
      this.setData({
        uncompletedTasks: uncompletedTasks
      })

    } catch (error) {
      console.error('加载任务失败:', error)
    }
  },

  // 加载周统计数据
  async loadWeeklyStats() {
    try {
      const res = await ecoAPI.getEcoStats('week')
      const stats = res.data.stats || []
      
      this.setData({
        weeklyStats: stats
      })

    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  },

  // 加载环保小贴士
  loadEcoTips() {
    const tips = [
      '每天坚持垃圾分类，为地球环保贡献一份力量！',
      '选择公共交通出行，减少碳排放，保护环境。',
      '随手关灯节约用电，小行为大环保。',
      '使用环保购物袋，减少塑料污染。',
      '节约用水从点滴做起，珍惜每一滴水资源。',
      '废物利用变废为宝，创意环保两不误。',
      '多种植绿植，净化空气美化环境。',
      '选择环保产品，支持可持续发展。'
    ]
    
    const randomTip = tips[Math.floor(Math.random() * tips.length)]
    this.setData({
      currentTip: randomTip
    })
  },

  // 计算当前等级起始积分
  calculateCurrentLevelScore(level) {
    if (level <= 1) return 0
    if (level <= 5) return (level - 1) * 100 + Math.pow(level - 1, 2) * 50
    return 500 + (level - 5) * 300
  },

  // 计算下一等级所需积分
  calculateNextLevelScore(level) {
    if (level >= 10) return this.calculateCurrentLevelScore(10)
    return this.calculateCurrentLevelScore(level + 1)
  },

  // 格式化行为时间
  formatActionTime(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) { // 1分钟内
      return '刚刚'
    } else if (diff < 3600000) { // 1小时内
      return `${Math.floor(diff / 60000)}分钟前`
    } else if (diff < 86400000) { // 24小时内
      return `${Math.floor(diff / 3600000)}小时前`
    } else {
      return `${date.getMonth() + 1}月${date.getDate()}日`
    }
  },

  // 页面跳转方法
  goToCamera() {
    wx.switchTab({
      url: '/pages/camera/camera'
    })
  },

  goToTasks() {
    wx.switchTab({
      url: '/pages/tasks/tasks'
    })
  },

  goToRanking() {
    wx.switchTab({
      url: '/pages/ranking/ranking'
    })
  },

  goToReport() {
    wx.navigateTo({
      url: '/pages/report/report'
    })
  },

  goToProfile() {
    wx.switchTab({
      url: '/pages/profile/profile'
    })
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: `我在环保助手已获得${this.data.userScore}积分，快来一起保护环境吧！`,
      path: '/pages/index/index',
      imageUrl: '/images/share-bg.png'
    }
  },

  onShareTimeline() {
    return {
      title: `环保助手 - 让环保成为习惯`,
      query: '',
      imageUrl: '/images/share-bg.png'
    }
  }
})