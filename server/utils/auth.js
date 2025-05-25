// utils/auth.js
const jwt = require('jsonwebtoken')
const User = require('../models/User')

// JWT 认证中间件
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '缺少访问令牌'
      })
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    
    // 验证用户是否存在且活跃
    const user = await User.findById(decoded.userId)
    
    if (!user || !user.isActive || user.isBanned) {
      return res.status(401).json({
        success: false,
        message: '用户不存在或已被禁用'
      })
    }
    
    req.user = {
      userId: decoded.userId,
      openid: decoded.openid
    }
    
    next()
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '访问令牌已过期'
      })
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '无效的访问令牌'
      })
    }
    
    console.error('认证失败:', error)
    res.status(500).json({
      success: false,
      message: '认证失败'
    })
  }
}

// 生成 JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  })
}

// 验证 JWT token
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET)
}

module.exports = {
  authenticateToken,
  generateToken,
  verifyToken
}