// routes/eco.js
const express = require('express')
const axios = require('axios')
const User = require('../models/User')
const EcoAction = require('../models/EcoAction')
const { authenticateToken } = require('../utils/auth')
const { recognizeImage } = require('../services/aiService')

const router = express.Router()

// 图像识别
router.post('/recognize', authenticateToken, async (req, res) => {
  try {
    const { imageUrl } = req.body
    
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: '缺少图片URL'
      })
    }
    
    // 调用AI识别服务
    const recognitionResult = await recognizeImage(imageUrl)
    
    if (!recognitionResult.success) {
      return res.json({
        success: false,
        message: recognitionResult.message || '识别失败'
      })
    }
    
    const { type, confidence, categories } = recognitionResult.data
    
    // 根据识别结果计算积分
    const score = calculateEcoScore(type, confidence)
    
    // 获取行为名称和描述
    const actionInfo = getEcoActionInfo(type)
    
    res.json({
      success: true,
      data: {
        type,
        name: actionInfo.name,
        description: actionInfo.description,
        score,
        confidence,
        categories
      }
    })
    
  } catch (error) {
    console.error('图像识别失败:', error)
    res.status(500).json({
      success: false,
      message: '识别服务暂时不可用'
    })
  }
})

// 提交环保行为
router.post('/action', authenticateToken, async (req, res) => {
  try {
    const {
      type,
      name,
      description,
      score,
      confidence,
      imageUrl,
      location
    } = req.body
    
    if (!type || !name || score === undefined) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      })
    }
    
    const user = await User.findById(req.user.userId)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }
    
    // 创建环保行为记录
    const ecoAction = new EcoAction({
      userId: user._id,
      openid: user.openid,
      type,
      name,
      description,
      score,
      imageUrl,
      location,
      aiResult: {
        confidence,
        verified: confidence > 0.8
      }
    })
    
    await ecoAction.save()
    
    // 更新用户积分和统计
    await user.addScore(score)
    user.totalActions += 1
    user.todayActions += 1
    user.updateStreak()
    
    await user.save()
    
    res.json({
      success: true,
      data: {
        actionId: ecoAction._id,
        score: ecoAction.score,
        totalScore: user.score,
        level: user.level,
        levelName: user.levelName
      }
    })
    
  } catch (error) {
    console.error('提交环保行为失败:', error)
    res.status(500).json({
      success: false,
      message: '提交失败'
    })
  }
})

// 获取环保行为历史
router.get('/actions', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query
    const skip = (page - 1) * limit
    
    const query = {
      openid: req.user.openid,
      status: 'approved'
    }
    
    if (type) {
      query.type = type
    }
    
    const actions = await EcoAction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('type name description score imageUrl location createdAt')
    
    const total = await EcoAction.countDocuments(query)
    
    res.json({
      success: true,
      data: {
        actions: actions.map(action => ({
          id: action._id,
          type: action.type,
          name: action.name,
          description: action.description,
          score: action.score,
          imageUrl: action.imageUrl,
          location: action.location,
          createdAt: action.createdAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    })
    
  } catch (error) {
    console.error('获取环保行为历史失败:', error)
    res.status(500).json({
      success: false,
      message: '获取历史记录失败'
    })
  }
})

// 获取今日环保行为
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const actions = await EcoAction.getTodayActions(req.user.openid)
    
    res.json({
      success: true,
      data: {
        actions: actions.map(action => ({
          id: action._id,
          type: action.type,
          name: action.name,
          score: action.score,
          createdAt: action.createdAt
        }))
      }
    })
    
  } catch (error) {
    console.error('获取今日环保行为失败:', error)
    res.status(500).json({
      success: false,
      message: '获取今日行为失败'
    })
  }
})

// 获取环保统计
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { period = 'week' } = req.query
    
    const stats = await EcoAction.getActionStats(req.user.openid, period)
    
    res.json({
      success: true,
      data: {
        stats: stats.map(stat => ({
          type: stat._id,
          typeName: getEcoActionInfo(stat._id).name,
          count: stat.count,
          totalScore: stat.totalScore,
          avgScore: Math.round(stat.avgScore)
        }))
      }
    })
    
  } catch (error) {
    console.error('获取环保统计失败:', error)
    res.status(500).json({
      success: false,
      message: '获取统计数据失败'
    })
  }
})

// 获取环保报告
router.get('/report', authenticateToken, async (req, res) => {
  try {
    const { start, end } = req.query
    
    const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const endDate = end ? new Date(end) : new Date()
    
    const actions = await EcoAction.find({
      openid: req.user.openid,
      status: 'approved',
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ createdAt: -1 })
    
    // 统计数据
    const totalActions = actions.length
    const totalScore = actions.reduce((sum, action) => sum + action.score, 0)
    const typeStats = {}
    
    actions.forEach(action => {
      if (!typeStats[action.type]) {
        typeStats[action.type] = {
          count: 0,
          score: 0
        }
      }
      typeStats[action.type].count += 1
      typeStats[action.type].score += action.score
    })
    
    res.json({
      success: true,
      data: {
        period: {
          start: startDate,
          end: endDate
        },
        summary: {
          totalActions,
          totalScore,
          avgScore: totalActions > 0 ? Math.round(totalScore / totalActions) : 0
        },
        typeStats: Object.keys(typeStats).map(type => ({
          type,
          typeName: getEcoActionInfo(type).name,
          count: typeStats[type].count,
          score: typeStats[type].score,
          percentage: Math.round((typeStats[type].count / totalActions) * 100)
        })),
        recentActions: actions.slice(0, 10).map(action => ({
          id: action._id,
          type: action.type,
          name: action.name,
          score: action.score,
          createdAt: action.createdAt
        }))
      }
    })
    
  } catch (error) {
    console.error('获取环保报告失败:', error)
    res.status(500).json({
      success: false,
      message: '获取报告失败'
    })
  }
})

// 辅助函数
function calculateEcoScore(type, confidence) {
  const baseScores = {
    'garbage_sorting': 10,
    'energy_saving': 15,
    'green_travel': 20,
    'eco_shopping': 12,
    'water_saving': 8,
    'paper_saving': 6
  }
  
  const baseScore = baseScores[type] || 5
  const confidenceMultiplier = Math.max(0.5, confidence)
  
  return Math.floor(baseScore * confidenceMultiplier)
}

function getEcoActionInfo(type) {
  const actionInfos = {
    'garbage_sorting': {
      name: '垃圾分类',
      description: '正确分类垃圾，减少环境污染，促进资源回收利用。'
    },
    'energy_saving': {
      name: '节能减排',
      description: '节约能源使用，减少碳排放，保护地球环境。'
    },
    'green_travel': {
      name: '绿色出行',
      description: '选择环保出行方式，减少尾气排放，改善空气质量。'
    },
    'eco_shopping': {
      name: '环保购物',
      description: '使用环保购物袋，减少塑料污染，支持可持续消费。'
    },
    'water_saving': {
      name: '节约用水',
      description: '珍惜水资源，合理用水，保护水环境。'
    },
    'paper_saving': {
      name: '节约用纸',
      description: '减少纸张浪费，保护森林资源，支持数字化办公。'
    }
  }
  
  return actionInfos[type] || {
    name: '环保行为',
    description: '积极参与环保行动，为地球环境贡献力量。'
  }
}

module.exports = router