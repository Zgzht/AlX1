// routes/share.js
const express = require('express')
const QRCode = require('qrcode')
const EcoAction = require('../models/EcoAction')
const User = require('../models/User')
const { authenticateToken } = require('../utils/auth')

const router = express.Router()

// 分享环保成果
router.post('/eco/:actionId', authenticateToken, async (req, res) => {
  try {
    const { actionId } = req.params
    
    const action = await EcoAction.findById(actionId)
    
    if (!action) {
      return res.status(404).json({
        success: false,
        message: '环保行为不存在'
      })
    }
    
    if (action.openid !== req.user.openid) {
      return res.status(403).json({
        success: false,
        message: '无权分享此内容'
      })
    }
    
    // 增加分享次数
    action.shareCount += 1
    await action.save()
    
    // 生成分享数据
    const shareData = {
      title: `我刚完成了${action.name}，获得了${action.score}积分！`,
      description: action.description,
      imageUrl: action.imageUrl,
      path: `/pages/share/share?type=eco&id=${actionId}`,
      score: action.score,
      actionName: action.name
    }
    
    res.json({
      success: true,
      data: shareData
    })
    
  } catch (error) {
    console.error('分享环保成果失败:', error)
    res.status(500).json({
      success: false,
      message: '分享失败'
    })
  }
})

// 获取分享数据
router.get('/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params
    
    let shareData = {}
    
    switch (type) {
      case 'eco':
        shareData = await getEcoShareData(id)
        break
      case 'user':
        shareData = await getUserShareData(id)
        break
      case 'ranking':
        shareData = await getRankingShareData(id)
        break
      default:
        return res.status(400).json({
          success: false,
          message: '不支持的分享类型'
        })
    }
    
    if (!shareData) {
      return res.status(404).json({
        success: false,
        message: '分享内容不存在'
      })
    }
    
    res.json({
      success: true,
      data: shareData
    })
    
  } catch (error) {
    console.error('获取分享数据失败:', error)
    res.status(500).json({
      success: false,
      message: '获取分享数据失败'
    })
  }
})

// 生成分享二维码
router.post('/qrcode', async (req, res) => {
  try {
    const { data, size = 200 } = req.body
    
    if (!data) {
      return res.status(400).json({
        success: false,
        message: '缺少二维码数据'
      })
    }
    
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
    
    res.json({
      success: true,
      data: {
        qrcode: qrCodeDataURL,
        data: data
      }
    })
    
  } catch (error) {
    console.error('生成二维码失败:', error)
    res.status(500).json({
      success: false,
      message: '生成二维码失败'
    })
  }
})

// 分享统计
router.get('/stats/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params
    
    let stats = {}
    
    switch (type) {
      case 'eco':
        const action = await EcoAction.findById(id)
        if (action) {
          stats = {
            shareCount: action.shareCount,
            likeCount: action.likeCount
          }
        }
        break
      default:
        stats = { shareCount: 0, likeCount: 0 }
    }
    
    res.json({
      success: true,
      data: stats
    })
    
  } catch (error) {
    console.error('获取分享统计失败:', error)
    res.status(500).json({
      success: false,
      message: '获取分享统计失败'
    })
  }
})

// 获取环保行为分享数据
async function getEcoShareData(actionId) {
  try {
    const action = await EcoAction.findById(actionId).populate('userId', 'nickName avatarUrl')
    
    if (!action) {
      return null
    }
    
    return {
      type: 'eco',
      title: `${action.userId.nickName}完成了${action.name}`,
      description: `获得了${action.score}积分，一起来保护环境吧！`,
      imageUrl: action.imageUrl,
      user: {
        nickName: action.userId.nickName,
        avatarUrl: action.userId.avatarUrl
      },
      action: {
        name: action.name,
        score: action.score,
        createdAt: action.createdAt
      }
    }
    
  } catch (error) {
    console.error('获取环保分享数据失败:', error)
    return null
  }
}

// 获取用户分享数据
async function getUserShareData(userId) {
  try {
    const user = await User.findById(userId)
    
    if (!user) {
      return null
    }
    
    return {
      type: 'user',
      title: `${user.nickName}的环保成就`,
      description: `已获得${user.score}积分，完成${user.totalActions}次环保行为`,
      user: {
        nickName: user.nickName,
        avatarUrl: user.avatarUrl,
        score: user.score,
        level: user.level,
        totalActions: user.totalActions
      }
    }
    
  } catch (error) {
    console.error('获取用户分享数据失败:', error)
    return null
  }
}

// 获取排行榜分享数据
async function getRankingShareData(period) {
  try {
    const topUsers = await User.find({ isActive: true })
      .sort({ score: -1 })
      .limit(3)
      .select('nickName avatarUrl score level')
    
    return {
      type: 'ranking',
      title: '环保排行榜',
      description: '看看谁是环保达人！',
      topUsers: topUsers.map((user, index) => ({
        rank: index + 1,
        nickName: user.nickName,
        avatarUrl: user.avatarUrl,
        score: user.score,
        level: user.level
      }))
    }
    
  } catch (error) {
    console.error('获取排行榜分享数据失败:', error)
    return null
  }
}

module.exports = router