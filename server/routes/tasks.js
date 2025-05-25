// routes/tasks.js
const express = require('express')
const User = require('../models/User')
const EcoAction = require('../models/EcoAction')
const { authenticateToken } = require('../utils/auth')

const router = express.Router()

// 获取任务列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }
    
    // 获取今日和本周的行为统计
    const todayActions = await EcoAction.getTodayActions(user.openid)
    const weeklyActions = await EcoAction.getWeeklyActions(user.openid)
    
    // 生成任务列表
    const tasks = await generateTasks(user, todayActions, weeklyActions)
    
    // 统计数据
    const stats = {
      completedToday: todayActions.length,
      totalCompleted: user.completedTasks.length,
      currentStreak: user.currentStreak
    }
    
    res.json({
      success: true,
      data: {
        tasks,
        stats
      }
    })
    
  } catch (error) {
    console.error('获取任务列表失败:', error)
    res.status(500).json({
      success: false,
      message: '获取任务列表失败'
    })
  }
})

// 完成任务
router.post('/:taskId/complete', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params
    
    const user = await User.findById(req.user.userId)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }
    
    // 检查任务是否已完成
    const existingTask = user.completedTasks.find(task => task.taskId === taskId)
    
    if (existingTask) {
      return res.status(400).json({
        success: false,
        message: '任务已完成'
      })
    }
    
    // 获取任务信息
    const task = await getTaskById(taskId, user)
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      })
    }
    
    // 检查任务是否可以完成
    if (task.progress < task.target) {
      return res.status(400).json({
        success: false,
        message: '任务未完成，无法领取奖励'
      })
    }
    
    // 添加任务完成记录
    user.completedTasks.push({
      taskId: taskId,
      completedAt: new Date(),
      reward: task.reward
    })
    
    // 添加积分奖励
    await user.addScore(task.reward)
    
    // 如果是成就任务，添加成就
    if (task.type === 'achievement' && task.title_reward) {
      user.achievements.push({
        achievementId: taskId,
        unlockedAt: new Date(),
        title: task.title_reward
      })
    }
    
    await user.save()
    
    res.json({
      success: true,
      data: {
        reward: task.reward,
        totalScore: user.score,
        level: user.level,
        achievement: task.title_reward || null
      }
    })
    
  } catch (error) {
    console.error('完成任务失败:', error)
    res.status(500).json({
      success: false,
      message: '完成任务失败'
    })
  }
})

// 获取任务进度
router.get('/:taskId/progress', authenticateToken, async (req, res) => {
  try {
    const { taskId } = req.params
    
    const user = await User.findById(req.user.userId)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      })
    }
    
    const task = await getTaskById(taskId, user)
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      })
    }
    
    res.json({
      success: true,
      data: {
        taskId,
        progress: task.progress,
        target: task.target,
        completed: task.completed,
        percentage: Math.min(100, (task.progress / task.target) * 100)
      }
    })
    
  } catch (error) {
    console.error('获取任务进度失败:', error)
    res.status(500).json({
      success: false,
      message: '获取任务进度失败'
    })
  }
})

// 生成任务列表
async function generateTasks(user, todayActions, weeklyActions) {
  const tasks = []
  
  // 每日任务
  const dailyTasks = [
    {
      id: 'daily_photo_1',
      type: 'daily',
      title: '拍照识别环保行为',
      description: '使用相机拍照识别1次环保行为',
      target: 1,
      progress: todayActions.length,
      reward: 20,
      completed: user.completedTasks.some(task => 
        task.taskId === 'daily_photo_1' && 
        isToday(task.completedAt)
      )
    },
    {
      id: 'daily_photo_3',
      type: 'daily',
      title: '环保行为达人',
      description: '今日完成3次环保行为识别',
      target: 3,
      progress: todayActions.length,
      reward: 50,
      completed: user.completedTasks.some(task => 
        task.taskId === 'daily_photo_3' && 
        isToday(task.completedAt)
      )
    },
    {
      id: 'daily_score_50',
      type: 'daily',
      title: '积分小目标',
      description: '今日获得50积分',
      target: 50,
      progress: todayActions.reduce((sum, action) => sum + action.score, 0),
      reward: 30,
      completed: user.completedTasks.some(task => 
        task.taskId === 'daily_score_50' && 
        isToday(task.completedAt)
      )
    }
  ]
  
  // 周任务
  const weeklyTasks = [
    {
      id: 'weekly_actions_10',
      type: 'weekly',
      title: '环保周挑战',
      description: '本周完成10次环保行为',
      target: 10,
      progress: weeklyActions.length,
      reward: 100,
      completed: user.completedTasks.some(task => 
        task.taskId === 'weekly_actions_10' && 
        isThisWeek(task.completedAt)
      )
    },
    {
      id: 'weekly_types_5',
      type: 'weekly',
      title: '环保多样性',
      description: '本周完成5种不同类型的环保行为',
      target: 5,
      progress: getUniqueActionTypes(weeklyActions).length,
      reward: 150,
      completed: user.completedTasks.some(task => 
        task.taskId === 'weekly_types_5' && 
        isThisWeek(task.completedAt)
      )
    },
    {
      id: 'weekly_streak_7',
      type: 'weekly',
      title: '连续环保',
      description: '连续7天完成环保行为',
      target: 7,
      progress: user.currentStreak,
      reward: 200,
      completed: user.completedTasks.some(task => 
        task.taskId === 'weekly_streak_7' && 
        isThisWeek(task.completedAt)
      )
    }
  ]
  
  // 成就任务
  const achievementTasks = [
    {
      id: 'achievement_first_action',
      type: 'achievement',
      title: '环保新手',
      description: '完成第一次环保行为识别',
      target: 1,
      progress: user.totalActions,
      reward: 100,
      title_reward: '环保新手',
      completed: user.achievements.some(ach => ach.achievementId === 'achievement_first_action')
    },
    {
      id: 'achievement_actions_100',
      type: 'achievement',
      title: '环保达人',
      description: '累计完成100次环保行为',
      target: 100,
      progress: user.totalActions,
      reward: 500,
      title_reward: '环保达人',
      completed: user.achievements.some(ach => ach.achievementId === 'achievement_actions_100')
    },
    {
      id: 'achievement_score_1000',
      type: 'achievement',
      title: '积分大师',
      description: '累计获得1000积分',
      target: 1000,
      progress: user.score,
      reward: 300,
      title_reward: '积分大师',
      completed: user.achievements.some(ach => ach.achievementId === 'achievement_score_1000')
    },
    {
      id: 'achievement_streak_30',
      type: 'achievement',
      title: '坚持不懈',
      description: '连续30天完成环保行为',
      target: 30,
      progress: user.maxStreak,
      reward: 1000,
      title_reward: '环保卫士',
      completed: user.achievements.some(ach => ach.achievementId === 'achievement_streak_30')
    }
  ]
  
  tasks.push(...dailyTasks, ...weeklyTasks, ...achievementTasks)
  
  return tasks
}

// 根据ID获取任务
async function getTaskById(taskId, user) {
  const todayActions = await EcoAction.getTodayActions(user.openid)
  const weeklyActions = await EcoAction.getWeeklyActions(user.openid)
  const tasks = await generateTasks(user, todayActions, weeklyActions)
  
  return tasks.find(task => task.id === taskId)
}

// 辅助函数
function isToday(date) {
  const today = new Date()
  const checkDate = new Date(date)
  return today.toDateString() === checkDate.toDateString()
}

function isThisWeek(date) {
  const today = new Date()
  const checkDate = new Date(date)
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  weekStart.setHours(0, 0, 0, 0)
  
  return checkDate >= weekStart
}

function getUniqueActionTypes(actions) {
  const types = new Set()
  actions.forEach(action => types.add(action.type))
  return Array.from(types)
}

module.exports = router