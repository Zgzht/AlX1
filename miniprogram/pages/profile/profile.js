// pages/profile/profile.js
const app = getApp()
const api = require('../../utils/api')
const util = require('../../utils/util')

Page({
  data: {
    userInfo: {},
    achievements: [],
    lockedAchievements: [],
    totalAchievements: 10,
    monthlyActions: 0,
    weeklyScore: 0,
    maxStreak: 0,
    ranking: 0,
    recentActions: []
  },

  onLoad() {
    this.loadUserProfile()
  },

  onShow() {
    this.loadUserProfile()
  },

  onPullDownRefresh() {
    this.loadUserProfile().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 加载用户资料
  async loadUserProfile() {
    try {
      wx.showLoading({ title: '加载中...' })
      
      // 并行加载多个数据
      const [userResult, rankingResult, actionsResult] = await Promise.all([
        api.getUserInfo(),
        api.getUserRanking(),
        api.getEcoActions({ limit: 5 })
      ])
      
      if (userResult.success) {
        const userInfo = userResult.data.user
        this.setData({
          userInfo,
          maxStreak: userInfo.maxStreak || 0
        })
        
        // 加载成就数据
        this.loadAchievements(userInfo.achievements || [])
      }
      
      if (rankingResult.success) {
        this.setData({
          ranking: rankingResult.data.ranking
        })
      }
      
      if (actionsResult.success) {
        const recentActions = actionsResult.data.actions.map(action => ({
          ...action,
          timeText: util.formatTime(new Date(action.createdAt))
        }))
        this.setData({ recentActions })
      }
      
      // 加载统计数据
      this.loadStats()
      
    } catch (error) {
      console.error('加载用户资料失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 加载成就数据
  loadAchievements(userAchievements) {
    const allAchievements = [
      { id: 'first_action', title: '环保新手', description: '完成第一次环保行为' },
      { id: 'actions_10', title: '环保爱好者', description: '完成10次环保行为' },
      { id: 'actions_50', title: '环保达人', description: '完成50次环保行为' },
      { id: 'actions_100', title: '环保专家', description: '完成100次环保行为' },
      { id: 'score_500', title: '积分新星', description: '获得500积分' },
      { id: 'score_1000', title: '积分大师', description: '获得1000积分' },
      { id: 'streak_7', title: '坚持一周', description: '连续7天完成环保行为' },
      { id: 'streak_30', title: '坚持一月', description: '连续30天完成环保行为' },
      { id: 'types_5', title: '全能环保', description: '完成5种不同类型的环保行为' },
      { id: 'share_10', title: '分享达人', description: '分享10次环保成果' }
    ]
    
    const unlockedIds = userAchievements.map(ach => ach.achievementId)
    const achievements = userAchievements
    const lockedAchievements = allAchievements.filter(ach => !unlockedIds.includes(ach.id))
    
    this.setData({
      achievements,
      lockedAchievements,
      totalAchievements: allAchievements.length
    })
  },

  // 加载统计数据
  async loadStats() {
    try {
      const statsResult = await api.getEcoStats('month')
      if (statsResult.success) {
        const monthlyActions = statsResult.data.stats.reduce((sum, stat) => sum + stat.count, 0)
        this.setData({ monthlyActions })
      }
      
      const weeklyStatsResult = await api.getEcoStats('week')
      if (weeklyStatsResult.success) {
        const weeklyScore = weeklyStatsResult.data.stats.reduce((sum, stat) => sum + stat.totalScore, 0)
        this.setData({ weeklyScore })
      }
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  },

  // 跳转到历史记录
  goToHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    })
  },

  // 跳转到积分商城
  goToRewards() {
    wx.navigateTo({
      url: '/pages/rewards/rewards'
    })
  },

  // 跳转到设置
  goToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
    })
  },

  // 分享个人成就
  shareProfile() {
    const { userInfo } = this.data
    
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
    
    // 生成分享数据
    const shareData = {
      title: `我在环保助手获得了${userInfo.score}积分！`,
      path: `/pages/share/share?type=user&id=${userInfo.id}`,
      imageUrl: '/images/share-profile.png'
    }
    
    // 可以调用分享API记录分享行为
    api.shareContent('user', userInfo.id).catch(console.error)
  },

  // 分享给朋友
  onShareAppMessage() {
    const { userInfo } = this.data
    return {
      title: `我在环保助手获得了${userInfo.score}积分，一起来保护环境吧！`,
      path: `/pages/index/index`,
      imageUrl: '/images/share-profile.png'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    const { userInfo } = this.data
    return {
      title: `我在环保助手获得了${userInfo.score}积分，一起来保护环境吧！`,
      imageUrl: '/images/share-profile.png'
    }
  }
})