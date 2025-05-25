// pages/report/report.js
const api = require('../../utils/api')
const util = require('../../utils/util')

Page({
  data: {
    reportPeriod: '最近一月',
    currentPeriod: 'month',
    summary: {
      totalActions: 0,
      totalScore: 0,
      avgScore: 0
    },
    typeChartData: [],
    scoreChartData: [],
    typeStats: [],
    recentActions: [],
    suggestions: [],
    chartWidth: 300,
    showPicker: false,
    selectedPeriod: 'month'
  },

  onLoad() {
    this.initChartWidth()
    this.loadReport()
    this.loadSuggestions()
  },

  onShow() {
    this.loadReport()
  },

  onPullDownRefresh() {
    this.loadReport().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 初始化图表宽度
  initChartWidth() {
    const systemInfo = wx.getSystemInfoSync()
    const chartWidth = systemInfo.windowWidth - 80 // 减去padding
    this.setData({ chartWidth })
  },

  // 加载报告数据
  async loadReport() {
    try {
      wx.showLoading({ title: '生成报告中...' })
      
      const { currentPeriod } = this.data
      
      // 计算时间范围
      const { start, end } = this.calculateDateRange(currentPeriod)
      
      // 获取报告数据
      const reportResult = await api.getEcoReport({
        start: start.toISOString(),
        end: end.toISOString()
      })
      
      if (reportResult.success) {
        const reportData = reportResult.data
        
        // 设置总览数据
        this.setData({
          summary: reportData.summary
        })
        
        // 处理类型统计图表数据
        this.processTypeChartData(reportData.typeStats)
        
        // 处理积分趋势数据
        this.processScoreChartData(reportData.recentActions)
        
        // 设置详细统计
        this.setData({
          typeStats: reportData.typeStats
        })
        
        // 处理最近活动
        const recentActions = reportData.recentActions.map(action => ({
          ...action,
          timeText: util.formatTime(new Date(action.createdAt))
        }))
        this.setData({ recentActions })
      }
      
    } catch (error) {
      console.error('加载报告失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 处理类型统计图表数据
  processTypeChartData(typeStats) {
    const chartData = typeStats.map(stat => ({
      label: stat.typeName,
      value: stat.count
    }))
    
    this.setData({ typeChartData: chartData })
  },

  // 处理积分趋势数据
  processScoreChartData(actions) {
    // 按日期分组统计积分
    const dailyScores = {}
    
    actions.forEach(action => {
      const date = new Date(action.createdAt).toDateString()
      if (!dailyScores[date]) {
        dailyScores[date] = 0
      }
      dailyScores[date] += action.score
    })
    
    // 转换为图表数据
    const chartData = Object.keys(dailyScores)
      .sort()
      .slice(-7) // 最近7天
      .map(date => ({
        label: new Date(date).getMonth() + 1 + '/' + new Date(date).getDate(),
        value: dailyScores[date]
      }))
    
    this.setData({ scoreChartData: chartData })
  },

  // 计算日期范围
  calculateDateRange(period) {
    const end = new Date()
    const start = new Date()
    
    switch (period) {
      case 'week':
        start.setDate(end.getDate() - 7)
        break
      case 'month':
        start.setMonth(end.getMonth() - 1)
        break
      case 'quarter':
        start.setMonth(end.getMonth() - 3)
        break
      case 'year':
        start.setFullYear(end.getFullYear() - 1)
        break
      default:
        start.setMonth(end.getMonth() - 1)
    }
    
    return { start, end }
  },

  // 加载环保建议
  loadSuggestions() {
    const suggestions = [
      {
        id: 1,
        icon: '/images/suggestion-recycle.png',
        title: '继续垃圾分类',
        description: '您在垃圾分类方面表现优秀，建议继续保持这个好习惯。'
      },
      {
        id: 2,
        icon: '/images/suggestion-energy.png',
        title: '节能减排',
        description: '尝试更多节能行为，如随手关灯、使用节能电器等。'
      },
      {
        id: 3,
        icon: '/images/suggestion-travel.png',
        title: '绿色出行',
        description: '多选择步行、骑行或公共交通，减少碳排放。'
      }
    ]
    
    this.setData({ suggestions })
  },

  // 显示时间选择器
  showPeriodPicker() {
    this.setData({ 
      showPicker: true,
      selectedPeriod: this.data.currentPeriod
    })
  },

  // 隐藏时间选择器
  hidePeriodPicker() {
    this.setData({ showPicker: false })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 阻止事件冒泡
  },

  // 选择时间周期
  selectPeriod(e) {
    const period = e.currentTarget.dataset.period
    this.setData({ selectedPeriod: period })
  },

  // 确认时间选择
  confirmPeriod() {
    const { selectedPeriod } = this.data
    const periodNames = {
      week: '最近一周',
      month: '最近一月',
      quarter: '最近三月',
      year: '最近一年'
    }
    
    this.setData({
      currentPeriod: selectedPeriod,
      reportPeriod: periodNames[selectedPeriod],
      showPicker: false
    })
    
    this.loadReport()
  },

  // 跳转到历史记录
  goToHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    })
  },

  // 分享报告
  shareReport() {
    const { summary, reportPeriod } = this.data
    
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
    
    // 可以生成报告图片或调用分享API
    wx.showToast({
      title: '分享功能开发中',
      icon: 'none'
    })
  },

  // 分享给朋友
  onShareAppMessage() {
    const { summary, reportPeriod } = this.data
    return {
      title: `我的${reportPeriod}环保报告：完成${summary.totalActions}次环保行为，获得${summary.totalScore}积分！`,
      path: '/pages/report/report',
      imageUrl: '/images/share-report.png'
    }
  },

  // 分享到朋友圈
  onShareTimeline() {
    const { summary, reportPeriod } = this.data
    return {
      title: `我的${reportPeriod}环保报告：完成${summary.totalActions}次环保行为，获得${summary.totalScore}积分！`,
      imageUrl: '/images/share-report.png'
    }
  }
})