// models/EcoAction.js
const mongoose = require('mongoose')

const ecoActionSchema = new mongoose.Schema({
  // 用户信息
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  openid: {
    type: String,
    required: true
  },
  
  // 行为信息
  type: {
    type: String,
    required: true,
    enum: ['garbage_sorting', 'energy_saving', 'green_travel', 'eco_shopping', 'water_saving', 'paper_saving']
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  
  // 图片信息
  imageUrl: String,
  originalImageUrl: String,
  
  // AI 识别结果
  aiResult: {
    confidence: Number,
    categories: [String],
    tags: [String],
    verified: {
      type: Boolean,
      default: false
    }
  },
  
  // 积分奖励
  score: {
    type: Number,
    required: true,
    min: 0
  },
  bonusScore: {
    type: Number,
    default: 0
  },
  
  // 位置信息
  location: {
    latitude: Number,
    longitude: Number,
    address: String,
    city: String,
    province: String
  },
  
  // 状态
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  
  // 审核信息
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  reviewNote: String,
  
  // 分享信息
  shareCount: {
    type: Number,
    default: 0
  },
  likeCount: {
    type: Number,
    default: 0
  },
  
  // 时间戳
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
})

// 索引
ecoActionSchema.index({ userId: 1, createdAt: -1 })
ecoActionSchema.index({ openid: 1, createdAt: -1 })
ecoActionSchema.index({ type: 1, createdAt: -1 })
ecoActionSchema.index({ status: 1, createdAt: -1 })
ecoActionSchema.index({ createdAt: -1 })

// 虚拟字段
ecoActionSchema.virtual('typeName').get(function() {
  const typeNames = {
    'garbage_sorting': '垃圾分类',
    'energy_saving': '节能减排',
    'green_travel': '绿色出行',
    'eco_shopping': '环保购物',
    'water_saving': '节约用水',
    'paper_saving': '节约用纸'
  }
  return typeNames[this.type] || '未知行为'
})

// 实例方法
ecoActionSchema.methods.approve = function(reviewerId, note) {
  this.status = 'approved'
  this.reviewedBy = reviewerId
  this.reviewedAt = new Date()
  this.reviewNote = note
  this.updatedAt = new Date()
  return this.save()
}

ecoActionSchema.methods.reject = function(reviewerId, note) {
  this.status = 'rejected'
  this.reviewedBy = reviewerId
  this.reviewedAt = new Date()
  this.reviewNote = note
  this.updatedAt = new Date()
  return this.save()
}

// 静态方法
ecoActionSchema.statics.getTodayActions = function(openid) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  return this.find({
    openid,
    status: 'approved',
    createdAt: {
      $gte: today,
      $lt: tomorrow
    }
  }).sort({ createdAt: -1 })
}

ecoActionSchema.statics.getWeeklyActions = function(openid) {
  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  weekStart.setHours(0, 0, 0, 0)
  
  return this.find({
    openid,
    status: 'approved',
    createdAt: { $gte: weekStart }
  }).sort({ createdAt: -1 })
}

ecoActionSchema.statics.getMonthlyActions = function(openid) {
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  
  return this.find({
    openid,
    status: 'approved',
    createdAt: { $gte: monthStart }
  }).sort({ createdAt: -1 })
}

ecoActionSchema.statics.getActionStats = function(openid, period = 'week') {
  const today = new Date()
  let startDate
  
  switch (period) {
    case 'day':
      startDate = new Date(today)
      startDate.setHours(0, 0, 0, 0)
      break
    case 'week':
      startDate = new Date(today)
      startDate.setDate(today.getDate() - today.getDay())
      startDate.setHours(0, 0, 0, 0)
      break
    case 'month':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      break
    default:
      startDate = new Date(today)
      startDate.setDate(today.getDate() - 7)
  }
  
  return this.aggregate([
    {
      $match: {
        openid,
        status: 'approved',
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalScore: { $sum: '$score' },
        avgScore: { $avg: '$score' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ])
}

// 中间件
ecoActionSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

module.exports = mongoose.model('EcoAction', ecoActionSchema)