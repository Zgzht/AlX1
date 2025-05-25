// tasks.js
const app = getApp()
const { taskAPI } = require('../../utils/api')

Page({
  data: {
    currentCategory: 'daily',
    completedToday: 0,
    totalCompleted: 0,
    currentStreak: 0,
    categories: [
      { key: 'daily', name: '每日', icon: 'daily', count: 0 },
      { key: 'weekly', name: '每周', icon: 'weekly', count: 0 },
      { key: 'achievement', name: '成就', icon: 'achievement', count: 0 }
    ],
    dailyTasks: [],
    weeklyTasks: [],
    achievementTasks: [],
    showTips: true,
    currentTips: '完成每日任务可以获得额外积分奖励，坚持完成还有连续奖励哦！',
    loading: true
  },

  onLoad() {
    this.loadTasks()
  },

  onShow() {
    this.refreshTasks()
  },

  onPullDownRefresh() {
    this.refreshTasks().finally(() => {
      wx.stopPullDownRefresh()
    })
  },

  // 加载任务数据
  async loadTasks() {
    try {
      app.showLoading('加载中...')
      
      const res = await taskAPI.getTasks()
      if (res.success) {
        this.processTasks(res.data)
      }
      
    } catch (error) {
      console.error('加载任务失败:', error)
      app.showError('加载任务失败')
    } finally {
      app.hideLoading()
      this.setData({ loading: false })
    }
  },

  // 刷新任务数据
  async refreshTasks() {
    try {
      const res = await taskAPI.getTasks()
      if (res.success) {
        this.processTasks(res.data)
      }
    } catch (error) {
      console.error('刷新任务失败:', error)
    }
  },

  // 处理任务数据
  processTasks(data) {
    const { tasks, stats } = data
    
    // 分类任务
    const dailyTasks = tasks.filter(task => task.type === 'daily')
    const weeklyTasks = tasks.filter(task => task.type === 'weekly')
    const achievementTasks = tasks.filter(task => task.type === 'achievement')
    
    // 计算未完成任务数量
    const dailyCount = dailyTasks.filter(task => !task.completed).length
    const weeklyCount = weeklyTasks.filter(task => !task.completed).length
    const achievementCount = achievementTasks.filter(task => !task.completed && task.progress >= task.target).length
    
    // 更新分类计数
    const categories = this.data.categories.map(cat => ({
      ...cat,
      count: cat.key === 'daily' ? dailyCount : 
             cat.key === 'weekly' ? weeklyCount : 
             achievementCount
    }))
    
    this.setData({
      dailyTasks: this.formatTasks(dailyTasks),
      weeklyTasks: this.formatTasks(weeklyTasks),
      achievementTasks: this.formatTasks(achievementTasks),
      categories: categories,
      completedToday: stats.completedToday || 0,
      totalCompleted: stats.totalCompleted || 0,
      currentStreak: stats.currentStreak || 0
    })
  },

  // 格式化任务数据
  formatTasks(tasks) {
    return tasks.map(task => ({
      ...task,
      progress: Math.min(task.progress, task.target),
      progressPercent: Math.min(100, (task.progress / task.target) * 100)
    }))
  },

  // 切换任务分类
  switchCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({ 
      currentCategory: category 
    })
    
    // 更新提示内容
    const tips = {
      daily: '完成每日任务可以获得额外积分奖励，坚持完成还有连续奖励哦！',
      weekly: '周任务难度更高，但奖励也更丰厚，挑战自己的极限吧！',
      achievement: '成就任务是永久性的，完成后可以获得特殊称号和丰厚奖励！'
    }
    
    this.setData({
      currentTips: tips[category] || tips.daily
    })
  },

  // 完成任务
  async completeTask(e) {
    const task = e.currentTarget.dataset.task
    
    if (task.completed || task.progress < task.target) {
      return
    }
    
    try {
      app.showLoading('领取奖励中...')
      
      const res = await taskAPI.completeTask(task.id)
      
      if (res.success) {
        // 更新任务状态
        this.updateTaskStatus(task.id, true)
        
        // 显示奖励
        this.showRewardModal(task)
        
        // 更新全局积分
        app.globalData.userScore += task.reward
        
        // 播放成功音效
        wx.vibrateShort()
        
      } else {
        app.showError(res.message || '领取失败')
      }
      
    } catch (error) {
      console.error('完成任务失败:', error)
      app.showError('领取失败，请重试')
    } finally {
      app.hideLoading()
    }
  },

  // 更新任务状态
  updateTaskStatus(taskId, completed) {
    const updateTasks = (tasks) => {
      return tasks.map(task => {
        if (task.id === taskId) {
          return { ...task, completed }
        }
        return task
      })
    }
    
    this.setData({
      dailyTasks: updateTasks(this.data.dailyTasks),
      weeklyTasks: updateTasks(this.data.weeklyTasks),
      achievementTasks: updateTasks(this.data.achievementTasks)
    })
    
    // 更新统计数据
    if (completed) {
      this.setData({
        completedToday: this.data.completedToday + 1,
        totalCompleted: this.data.totalCompleted + 1
      })
    }
  },

  // 显示奖励弹窗
  showRewardModal(task) {
    const title = task.type === 'achievement' ? '成就解锁！' : '任务完成！'
    let content = `恭喜获得 ${task.reward} 积分奖励！`
    
    if (task.title_reward) {
      content += `\n解锁称号：${task.title_reward}`
    }
    
    wx.showModal({
      title: title,
      content: content,
      showCancel: false,
      confirmText: '太棒了',
      confirmColor: '#4CAF50'
    })
  },

  // 关闭提示
  closeTips() {
    this.setData({ showTips: false })
  },

  // 查看任务详情
  viewTaskDetail(e) {
    const task = e.currentTarget.dataset.task
    wx.navigateTo({
      url: `/pages/task-detail/task-detail?id=${task.id}`
    })
  },

  // 跳转到相关页面
  goToCamera() {
    wx.switchTab({
      url: '/pages/camera/camera'
    })
  },

  goToRanking() {
    wx.switchTab({
      url: '/pages/ranking/ranking'
    })
  },

  // 页面分享
  onShareAppMessage() {
    return {
      title: `我在环保助手已完成${this.data.totalCompleted}个任务，快来一起挑战吧！`,
      path: '/pages/tasks/tasks',
      imageUrl: '/images/share-tasks.png'
    }
  },

  onShareTimeline() {
    return {
      title: '环保任务挑战 - 让环保成为习惯',
      query: '',
      imageUrl: '/images/share-tasks.png'
    }
  }
})