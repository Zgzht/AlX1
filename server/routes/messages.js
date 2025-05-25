// routes/messages.js
const express = require('express')
const { authenticateToken } = require('../utils/auth')

const router = express.Router()

// 获取消息列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query
    
    // 模拟消息数据
    const messages = [
      {
        id: '1',
        type: 'system',
        title: '欢迎使用环保助手',
        content: '感谢您加入环保大家庭，让我们一起保护地球！',
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2小时前
      },
      {
        id: '2',
        type: 'reward',
        title: '积分奖励',
        content: '恭喜您完成每日任务，获得50积分奖励！',
        read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24) // 1天前
      },
      {
        id: '3',
        type: 'achievement',
        title: '成就解锁',
        content: '恭喜您解锁"环保新手"成就，继续加油！',
        read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2) // 2天前
      }
    ]
    
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + parseInt(limit)
    const paginatedMessages = messages.slice(startIndex, endIndex)
    
    res.json({
      success: true,
      data: {
        messages: paginatedMessages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: messages.length,
          pages: Math.ceil(messages.length / limit)
        }
      }
    })
    
  } catch (error) {
    console.error('获取消息列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取消息列表失败'
    })
  }
})

// 标记消息已读
router.put('/:messageId/read', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params
    
    // 这里应该更新数据库中的消息状态
    // 目前返回成功响应
    
    res.json({
      success: true,
      message: '消息已标记为已读'
    })
    
  } catch (error) {
    console.error('标记消息已读失败:', error)
    res.status(500).json({
      success: false,
      message: '标记消息已读失败'
    })
  }
})

// 获取未读消息数量
router.get('/unread/count', authenticateToken, async (req, res) => {
  try {
    // 模拟未读消息数量
    const unreadCount = 2
    
    res.json({
      success: true,
      data: {
        count: unreadCount
      }
    })
    
  } catch (error) {
    console.error('获取未读消息数量失败:', error)
    res.status(500).json({
      success: false,
      message: '获取未读消息数量失败'
    })
  }
})

// 删除消息
router.delete('/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params
    
    // 这里应该从数据库中删除消息
    // 目前返回成功响应
    
    res.json({
      success: true,
      message: '消息删除成功'
    })
    
  } catch (error) {
    console.error('删除消息失败:', error)
    res.status(500).json({
      success: false,
      message: '删除消息失败'
    })
  }
})

// 全部标记已读
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    // 这里应该将用户的所有未读消息标记为已读
    // 目前返回成功响应
    
    res.json({
      success: true,
      message: '所有消息已标记为已读'
    })
    
  } catch (error) {
    console.error('全部标记已读失败:', error)
    res.status(500).json({
      success: false,
      message: '全部标记已读失败'
    })
  }
})

module.exports = router