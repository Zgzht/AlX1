// routes/user.js
const express = require('express')
const jwt = require('jsonwebtoken')
const axios = require('axios')
const User = require('../models/User')
const { authenticateToken } = require('../utils/auth')

const router = express.Router()

// 微信登录
router.post('/login', async (req, res) => {
  try {
    const { code, userInfo } = req.body
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: '缺少登录凭证'
      })
    }
    
    // 调用微信接口获取 openid
    const wxResponse = await axios.get('https://api.weixin.qq.com/sns/jscode2session', {
      params: {
        appid: process.env.WECHAT_APP_ID,
        secret: process.env.WECHAT_APP_SECRET,
        js_code: code,
        grant_type: 'authorization_code'
      }
    })
    
    if (wxResponse.data.errcode) {
      return res.status(400).json({
        success: false,
        message: '微信登录失败',
        error: wxResponse.data.errmsg
      })
    }
    
    const { openid, unionid, session_key } = wxResponse.data
    
    // 查找或创建用户
    let user = await User.findByOpenid(openid)
    
    if (!user) {
      user = new User({
        openid,
        unionid,
        ...userInfo,
        lastLoginAt: new Date()
      })
    } else {
      // 更新用户信息
      if (userInfo) {
        Object.assign(user, userInfo)
      }
      user.lastLoginAt = new Date()
    }
    
    await user.save()
    
    // 生成 JWT token
    const token = jwt.sign(
      { userId: user._id, openid: user.openid },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    )
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          openid: user.openid,
          nickName: user.nickName,
          avatarUrl: user.avatarUrl,
          score: user.score,
          level: user.level,
          levelName: user.levelName
        }
      }
    })
    
  } catch (error) {
    console.error('登录失败:', error)
    res.status(500).json({
      success: false,
      message: '登录失败'
    })
  }
})

// 获取用户信息
router.get('/info', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          openid: user.openid,
          nickName: user.nickName,
          avatarUrl: user.avatarUrl,
          score: user.score,
          level: user.level,
          levelName: user.levelName,
          totalActions: user.totalActions,
          currentStreak: user.currentStreak,
          maxStreak: user.maxStreak,
          achievements: user.achievements,
          settings: user.settings,
          createdAt: user.createdAt
        }
      }
    })
    
  } catch (error) {
    console.error('获取用户信息失败:', error)
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    })
  }
})

// 更新用户信息
router.put('/update', authenticateToken, async (req, res) => {
  try {
    const { nickName, avatarUrl, settings } = req.body
    
    const user = await User.findById(req.user.userId)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }
    
    // 更新允许的字段
    if (nickName !== undefined) user.nickName = nickName
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl
    if (settings !== undefined) user.settings = { ...user.settings, ...settings }
    
    await user.save()
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          nickName: user.nickName,
          avatarUrl: user.avatarUrl,
          settings: user.settings
        }
      }
    })
    
  } catch (error) {
    console.error('更新用户信息失败:', error)
    res.status(500).json({
      success: false,
      message: '更新用户信息失败'
    })
  }
})

// 获取用户积分
router.get('/score', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }
    
    res.json({
      success: true,
      data: {
        score: user.score,
        level: user.level,
        levelName: user.levelName
      }
    })
    
  } catch (error) {
    console.error('获取用户积分失败:', error)
    res.status(500).json({
      success: false,
      message: '获取用户积分失败'
    })
  }
})

// 获取用户排名
router.get('/ranking', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }
    
    // 计算用户排名
    const ranking = await User.countDocuments({
      score: { $gt: user.score },
      isActive: true
    }) + 1
    
    // 获取总用户数
    const totalUsers = await User.countDocuments({ isActive: true })
    
    res.json({
      success: true,
      data: {
        ranking,
        totalUsers,
        score: user.score,
        level: user.level,
        percentile: Math.round((1 - (ranking - 1) / totalUsers) * 100)
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

module.exports = router