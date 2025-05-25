// routes/ranking.js
const express = require('express')
const User = require('../models/User')
const EcoAction = require('../models/EcoAction')
const { authenticateToken } = require('../utils/auth')

const router = express.Router()

// 获取排行榜
router.get('/', async (req, res) => {
  try {
    const { type = 'score', period = 'all', limit = 50 } = req.query
    
    let ranking = []
    
    switch (type) {
      case 'score':
        ranking = await getScoreRanking(period, limit)
        break
      case 'actions':
        ranking = await getActionsRanking(period, limit)
        break
      case 'streak':
        ranking = await getStreakRanking(limit)
        break
      default:
        ranking = await getScoreRanking(period, limit)
    }
    
    res.json({
      success: true,
      data: {
        ranking,
        type,
        period,
        total: ranking.length
      }
    })
    
  } catch (error) {
    console.error('获取排行榜失败:', error)
    res.status(500).json({
      success: false,
      message: '获取排行榜失败'
    })
  }
})

// 获取用户排名
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const { type = 'score', period = 'all' } = req.query
    
    const user = await User.findById(req.user.userId)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }
    
    let ranking, userRank
    
    switch (type) {
      case 'score':
        ranking = await getScoreRanking(period, 1000)
        userRank = ranking.findIndex(item => item.userId.toString() === user._id.toString()) + 1
        break
      case 'actions':
        ranking = await getActionsRanking(period, 1000)
        userRank = ranking.findIndex(item => item.userId.toString() === user._id.toString()) + 1
        break
      case 'streak':
        ranking = await getStreakRanking(1000)
        userRank = ranking.findIndex(item => item.userId.toString() === user._id.toString()) + 1
        break
      default:
        ranking = await getScoreRanking(period, 1000)
        userRank = ranking.findIndex(item => item.userId.toString() === user._id.toString()) + 1
    }
    
    const userInfo = ranking.find(item => item.userId.toString() === user._id.toString())
    
    res.json({
      success: true,
      data: {
        rank: userRank || 0,
        total: ranking.length,
        user: userInfo || {
          userId: user._id,
          nickName: user.nickName,
          avatarUrl: user.avatarUrl,
          score: user.score,
          level: user.level,
          value: type === 'score' ? user.score : 
                 type === 'actions' ? user.totalActions : 
                 user.currentStreak
        },
        percentile: userRank ? Math.round((1 - (userRank - 1) / ranking.length) * 100) : 0
      }
    })
    
  } catch (error) {
    console.error('获取用户排名失败:', error)
    res.status(500).json({
      success: false,
      message: '获取用户排名失败'
    })
  }
})

// 获取好友排行榜
router.get('/friends', authenticateToken, async (req, res) => {
  try {
    // 这里应该根据实际的好友关系来获取
    // 目前返回空数组，实际项目中需要实现好友系统
    
    res.json({
      success: true,
      data: {
        ranking: [],
        message: '好友系统暂未开放'
      }
    })
    
  } catch (error) {
    console.error('获取好友排行榜失败:', error)
    res.status(500).json({
      success: false,
      message: '获取好友排行榜失败'
    })
  }
})

// 获取周榜变化
router.get('/weekly-change', async (req, res) => {
  try {
    const thisWeekRanking = await getScoreRanking('week', 100)
    const lastWeekRanking = await getScoreRanking('last_week', 100)
    
    const changes = thisWeekRanking.map((current, index) => {
      const lastWeekIndex = lastWeekRanking.findIndex(
        item => item.userId.toString() === current.userId.toString()
      )
      
      const change = lastWeekIndex === -1 ? 'new' : 
                    lastWeekIndex > index ? 'up' :
                    lastWeekIndex < index ? 'down' : 'same'
      
      const changeValue = lastWeekIndex === -1 ? 0 : lastWeekIndex - index
      
      return {
        ...current,
        rank: index + 1,
        change,
        changeValue
      }
    })
    
    res.json({
      success: true,
      data: {
        ranking: changes,
        period: 'week'
      }
    })
    
  } catch (error) {
    console.error('获取周榜变化失败:', error)
    res.status(500).json({
      success: false,
      message: '获取周榜变化失败'
    })
  }
})

// 积分排行榜
async function getScoreRanking(period, limit) {
  let matchCondition = { isActive: true }
  
  if (period === 'week') {
    const weekStart = getWeekStart()
    // 这里应该根据本周获得的积分来排序
    // 简化处理，直接按总积分排序
  } else if (period === 'month') {
    const monthStart = getMonthStart()
    // 这里应该根据本月获得的积分来排序
  }
  
  const users = await User.find(matchCondition)
    .sort({ score: -1 })
    .limit(limit)
    .select('nickName avatarUrl score level')
  
  return users.map((user, index) => ({
    rank: index + 1,
    userId: user._id,
    nickName: user.nickName || '环保用户',
    avatarUrl: user.avatarUrl,
    score: user.score,
    level: user.level,
    value: user.score
  }))
}

// 行为次数排行榜
async function getActionsRanking(period, limit) {
  let matchCondition = { isActive: true }
  
  const users = await User.find(matchCondition)
    .sort({ totalActions: -1 })
    .limit(limit)
    .select('nickName avatarUrl totalActions level')
  
  return users.map((user, index) => ({
    rank: index + 1,
    userId: user._id,
    nickName: user.nickName || '环保用户',
    avatarUrl: user.avatarUrl,
    actions: user.totalActions,
    level: user.level,
    value: user.totalActions
  }))
}

// 连续天数排行榜
async function getStreakRanking(limit) {
  const users = await User.find({ isActive: true })
    .sort({ currentStreak: -1, maxStreak: -1 })
    .limit(limit)
    .select('nickName avatarUrl currentStreak maxStreak level')
  
  return users.map((user, index) => ({
    rank: index + 1,
    userId: user._id,
    nickName: user.nickName || '环保用户',
    avatarUrl: user.avatarUrl,
    currentStreak: user.currentStreak,
    maxStreak: user.maxStreak,
    level: user.level,
    value: user.currentStreak
  }))
}

// 辅助函数
function getWeekStart() {
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  weekStart.setHours(0, 0, 0, 0)
  return weekStart
}

function getMonthStart() {
  const today = new Date()
  return new Date(today.getFullYear(), today.getMonth(), 1)
}

function getLastWeekStart() {
  const thisWeekStart = getWeekStart()
  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(thisWeekStart.getDate() - 7)
  return lastWeekStart
}

module.exports = router