// app.js
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const mongoose = require('mongoose')
const path = require('path')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 12000

// 中间件
app.use(helmet())
app.use(cors({
  origin: true,
  credentials: true
}))
app.use(morgan('combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// 数据库连接
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/eco-behavior'
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB 连接成功')
})
.catch(err => {
  console.error('MongoDB 连接失败:', err)
})

// 路由
app.use('/api/user', require('./routes/user'))
app.use('/api/eco', require('./routes/eco'))
app.use('/api/tasks', require('./routes/tasks'))
app.use('/api/ranking', require('./routes/ranking'))
app.use('/api/rewards', require('./routes/rewards'))
app.use('/api/upload', require('./routes/upload'))
app.use('/api/share', require('./routes/share'))
app.use('/api/messages', require('./routes/messages'))

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// 根路径
app.get('/', (req, res) => {
  res.json({
    message: '环保行为监测与奖励平台 API',
    version: '1.0.0',
    docs: '/api/docs'
  })
})

// 404 处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  })
})

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err)
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在端口 ${PORT}`)
  console.log(`访问地址: http://localhost:${PORT}`)
})

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...')
  mongoose.connection.close(() => {
    console.log('数据库连接已关闭')
    process.exit(0)
  })
})

module.exports = app