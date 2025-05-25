// routes/rewards.js
const express = require('express')
const User = require('../models/User')
const { authenticateToken } = require('../utils/auth')

const router = express.Router()

// 获取奖励列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }
    
    const rewards = getAvailableRewards(user)
    
    res.json({
      success: true,
      data: {
        rewards,
        userScore: user.score
      }
    })
    
  } catch (error) {
    console.error('获取奖励列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取奖励列表失败'
    })
  }
})

// 兑换奖励
router.post('/:rewardId/exchange', authenticateToken, async (req, res) => {
  try {
    const { rewardId } = req.params
    
    const user = await User.findById(req.user.userId)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }
    
    const reward = getRewardById(rewardId)
    
    if (!reward) {
      return res.status(404).json({
        success: false,
        message: '奖励不存在'
      })
    }
    
    if (user.score < reward.cost) {
      return res.status(400).json({
        success: false,
        message: '积分不足'
      })
    }
    
    // 扣除积分
    user.score -= reward.cost
    
    // 记录兑换历史
    if (!user.exchangeHistory) {
      user.exchangeHistory = []
    }
    
    user.exchangeHistory.push({
      rewardId: rewardId,
      rewardName: reward.name,
      cost: reward.cost,
      exchangedAt: new Date()
    })
    
    await user.save()
    
    res.json({
      success: true,
      data: {
        reward: reward,
        remainingScore: user.score,
        exchangeId: user.exchangeHistory[user.exchangeHistory.length - 1]._id
      }
    })
    
  } catch (error) {
    console.error('兑换奖励失败:', error)
    res.status(500).json({
      success: false,
      message: '兑换奖励失败'
    })
  }
})

// 获取兑换历史
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }
    
    const history = user.exchangeHistory || []
    
    res.json({
      success: true,
      data: {
        history: history.sort((a, b) => new Date(b.exchangedAt) - new Date(a.exchangedAt))
      }
    })
    
  } catch (error) {
    console.error('获取兑换历史失败:', error)
    res.status(500).json({
      success: false,
      message: '获取兑换历史失败'
    })
  }
})

// 获取可用奖励
function getAvailableRewards(user) {
  const allRewards = [
    {
      id: 'eco_bag',
      name: '环保购物袋',
      description: '可重复使用的环保购物袋，减少塑料污染',
      cost: 100,
      category: 'physical',
      image: '/images/rewards/eco-bag.png',
      stock: 50,
      available: true
    },
    {
      id: 'plant_seed',
      name: '绿植种子包',
      description: '多种绿植种子，美化环境净化空气',
      cost: 150,
      category: 'physical',
      image: '/images/rewards/plant-seed.png',
      stock: 30,
      available: true
    },
    {
      id: 'eco_notebook',
      name: '环保笔记本',
      description: '再生纸制作的环保笔记本',
      cost: 80,
      category: 'physical',
      image: '/images/rewards/eco-notebook.png',
      stock: 100,
      available: true
    },
    {
      id: 'water_bottle',
      name: '保温水杯',
      description: '不锈钢保温杯，减少一次性杯子使用',
      cost: 200,
      category: 'physical',
      image: '/images/rewards/water-bottle.png',
      stock: 20,
      available: true
    },
    {
      id: 'eco_title_1',
      name: '环保先锋称号',
      description: '专属称号，展示你的环保态度',
      cost: 300,
      category: 'virtual',
      image: '/images/rewards/title-1.png',
      available: user.level >= 3
    },
    {
      id: 'eco_title_2',
      name: '绿色卫士称号',
      description: '高级称号，彰显环保领导力',
      cost: 500,
      category: 'virtual',
      image: '/images/rewards/title-2.png',
      available: user.level >= 5
    },
    {
      id: 'avatar_frame_1',
      name: '绿叶头像框',
      description: '清新绿叶主题头像框',
      cost: 120,
      category: 'virtual',
      image: '/images/rewards/frame-1.png',
      available: true
    },
    {
      id: 'avatar_frame_2',
      name: '地球守护者头像框',
      description: '地球主题头像框，守护地球',
      cost: 250,
      category: 'virtual',
      image: '/images/rewards/frame-2.png',
      available: user.level >= 4
    },
    {
      id: 'coupon_coffee',
      name: '咖啡店优惠券',
      description: '合作咖啡店8折优惠券',
      cost: 180,
      category: 'coupon',
      image: '/images/rewards/coupon-coffee.png',
      stock: 50,
      available: true,
      expiry: '30天'
    },
    {
      id: 'coupon_book',
      name: '书店优惠券',
      description: '环保主题书籍9折优惠',
      cost: 160,
      category: 'coupon',
      image: '/images/rewards/coupon-book.png',
      stock: 30,
      available: true,
      expiry: '60天'
    }
  ]
  
  return allRewards.filter(reward => reward.available)
}

// 根据ID获取奖励
function getRewardById(rewardId) {
  const rewards = getAvailableRewards({ level: 10 }) // 获取所有奖励
  return rewards.find(reward => reward.id === rewardId)
}

module.exports = router