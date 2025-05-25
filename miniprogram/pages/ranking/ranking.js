// pages/ranking/ranking.js
const api = require('../../utils/api')

Page({
  data: {
    currentTab: 'score',
    currentPeriod: 'all',
    rankingData: [],
    userRanking: null,
    loading: false
  },

  onLoad() {
    this.loadRanking()
  },

  onPullDownRefresh() {
    this.loadRanking().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 切换排行榜类型
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab !== this.data.currentTab) {
      this.setData({ currentTab: tab })
      this.loadRanking()
    }
  },

  // 切换时间周期
  switchPeriod(e) {
    const period = e.currentTarget.dataset.period
    if (period !== this.data.currentPeriod) {
      this.setData({ currentPeriod: period })
      this.loadRanking()
    }
  },

  // 加载排行榜数据
  async loadRanking() {
    const { currentTab, currentPeriod } = this.data
    
    this.setData({ loading: true })
    
    try {
      // 并行加载排行榜和用户排名
      const [rankingResult, userRankingResult] = await Promise.all([
        api.getRanking({
          type: currentTab,
          period: currentPeriod,
          limit: 50
        }),
        api.getUserRanking({
          type: currentTab,
          period: currentPeriod
        })
      ])
      
      if (rankingResult.success) {
        this.setData({
          rankingData: rankingResult.data.ranking
        })
      }
      
      if (userRankingResult.success) {
        this.setData({
          userRanking: userRankingResult.data
        })
      }
      
    } catch (error) {
      console.error('加载排行榜失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 获取数值单位
  getValueUnit(type) {
    switch (type) {
      case 'score':
        return '积分'
      case 'actions':
        return '次'
      case 'streak':
        return '天'
      default:
        return ''
    }
  },

  // 分享排行榜
  onShareAppMessage() {
    const { currentTab, currentPeriod } = this.data
    const tabNames = {
      score: '积分榜',
      actions: '行为榜',
      streak: '连续榜'
    }
    const periodNames = {
      all: '总榜',
      month: '月榜',
      week: '周榜'
    }
    
    return {
      title: `环保助手${tabNames[currentTab]}${periodNames[currentPeriod]}，快来看看你的排名！`,
      path: `/pages/ranking/ranking?tab=${currentTab}&period=${currentPeriod}`,
      imageUrl: '/images/share-ranking.png'
    }
  }
})