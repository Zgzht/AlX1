// models/User.js
const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  // 微信用户信息
  openid: {
    type: String,
    required: true,
    unique: true
  },
  unionid: String,
  nickName: String,
  avatarUrl: String,
  gender: Number,
  city: String,
  province: String,
  country: String,
  
  // 用户积分和等级
  score: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  
  // 环保统计
  totalActions: {
    type: Number,
    default: 0
  },
  todayActions: {
    type: Number,
    default: 0
  },
  weeklyActions: {
    type: Number,
    default: 0
  },
  monthlyActions: {
    type: Number,
    default: 0
  },
  
  // 连续天数
  currentStreak: {
    type: Number,
    default: 0
  },
  maxStreak: {
    type: Number,
    default: 0
  },
  lastActionDate: Date,
  
  // 任务完成情况
  completedTasks: [{
    taskId: String,
    completedAt: Date,
    reward: Number
  }],
  
  // 成就
  achievements: [{
    achievementId: String,
    unlockedAt: Date,
    title: String
  }],
  
  // 用户设置
  settings: {
    notifications: {
      type: Boolean,
      default: true
    },
    privacy: {
      type: Boolean,
      default: false
    },
    shareLocation: {
      type: Boolean,
      default: true
    }
  },
  
  // 状态
  isActive: {
    type: Boolean,
    default: true
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  
  // 时间戳
  lastLoginAt: Date,
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
userSchema.index({ openid: 1 })
userSchema.index({ score: -1 })
userSchema.index({ level: -1 })
userSchema.index({ createdAt: -1 })

// 虚拟字段
userSchema.virtual('levelName').get(function() {
  const levelNames = {
    1: '环保新手',
    2: '环保爱好者',
    3: '环保达人',
    4: '环保专家',
    5: '环保大师',
    6: '环保导师',
    7: '环保领袖',
    8: '环保先锋',
    9: '环保卫士',
    10: '环保守护者'
  }
  return levelNames[this.level] || '环保新手'
})

// 实例方法
userSchema.methods.addScore = function(points) {
  this.score += points
  this.level = this.calculateLevel()
  this.updatedAt = new Date()
  return this.save()
}

userSchema.methods.calculateLevel = function() {
  if (this.score < 100) return 1
  if (this.score < 300) return 2
  if (this.score < 600) return 3
  if (this.score < 1000) return 4
  if (this.score < 1500) return 5
  return Math.min(10, Math.floor(this.score / 300) + 1)
}

userSchema.methods.updateStreak = function() {
  const today = new Date()
  const lastAction = this.lastActionDate
  
  if (!lastAction) {
    this.currentStreak = 1
  } else {
    const daysDiff = Math.floor((today - lastAction) / (1000 * 60 * 60 * 24))
    
    if (daysDiff === 1) {
      this.currentStreak += 1
    } else if (daysDiff > 1) {
      this.currentStreak = 1
    }
  }
  
  this.maxStreak = Math.max(this.maxStreak, this.currentStreak)
  this.lastActionDate = today
}

// 静态方法
userSchema.statics.findByOpenid = function(openid) {
  return this.findOne({ openid })
}

userSchema.statics.getTopUsers = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ score: -1 })
    .limit(limit)
    .select('nickName avatarUrl score level levelName')
}

// 中间件
userSchema.pre('save', function(next) {
  this.updatedAt = new Date()
  next()
})

module.exports = mongoose.model('User', userSchema)