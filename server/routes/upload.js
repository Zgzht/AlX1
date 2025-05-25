// routes/upload.js
const express = require('express')
const multer = require('multer')
const path = require('path')
const sharp = require('sharp')
const fs = require('fs').promises
const { authenticateToken } = require('../utils/auth')

const router = express.Router()

// 配置 multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const fileFilter = (req, file, cb) => {
  // 只允许图片文件
  if (file.mimetype.startsWith('image/')) {
    cb(null, true)
  } else {
    cb(new Error('只允许上传图片文件'), false)
  }
}

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  }
})

// 上传图片
router.post('/image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '没有上传文件'
      })
    }
    
    const originalPath = req.file.path
    const filename = req.file.filename
    const compressedFilename = 'compressed-' + filename
    const compressedPath = path.join('uploads', compressedFilename)
    
    // 压缩图片
    await sharp(originalPath)
      .resize(800, 600, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toFile(compressedPath)
    
    // 删除原始文件
    await fs.unlink(originalPath)
    
    const imageUrl = `/uploads/${compressedFilename}`
    
    res.json({
      success: true,
      data: {
        url: imageUrl,
        filename: compressedFilename,
        originalName: req.file.originalname,
        size: req.file.size
      }
    })
    
  } catch (error) {
    console.error('上传图片失败:', error)
    
    // 清理文件
    if (req.file) {
      try {
        await fs.unlink(req.file.path)
      } catch (unlinkError) {
        console.error('清理文件失败:', unlinkError)
      }
    }
    
    res.status(500).json({
      success: false,
      message: '上传失败'
    })
  }
})

// 批量上传图片
router.post('/images', authenticateToken, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有上传文件'
      })
    }
    
    const uploadedImages = []
    
    for (const file of req.files) {
      try {
        const originalPath = file.path
        const filename = file.filename
        const compressedFilename = 'compressed-' + filename
        const compressedPath = path.join('uploads', compressedFilename)
        
        // 压缩图片
        await sharp(originalPath)
          .resize(800, 600, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 80 })
          .toFile(compressedPath)
        
        // 删除原始文件
        await fs.unlink(originalPath)
        
        uploadedImages.push({
          url: `/uploads/${compressedFilename}`,
          filename: compressedFilename,
          originalName: file.originalname,
          size: file.size
        })
        
      } catch (error) {
        console.error('处理图片失败:', error)
        // 继续处理其他图片
      }
    }
    
    res.json({
      success: true,
      data: {
        images: uploadedImages,
        count: uploadedImages.length
      }
    })
    
  } catch (error) {
    console.error('批量上传失败:', error)
    res.status(500).json({
      success: false,
      message: '批量上传失败'
    })
  }
})

// 删除图片
router.delete('/image/:filename', authenticateToken, async (req, res) => {
  try {
    const { filename } = req.params
    const filePath = path.join('uploads', filename)
    
    // 检查文件是否存在
    try {
      await fs.access(filePath)
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      })
    }
    
    // 删除文件
    await fs.unlink(filePath)
    
    res.json({
      success: true,
      message: '文件删除成功'
    })
    
  } catch (error) {
    console.error('删除文件失败:', error)
    res.status(500).json({
      success: false,
      message: '删除文件失败'
    })
  }
})

// 获取图片信息
router.get('/image/:filename/info', async (req, res) => {
  try {
    const { filename } = req.params
    const filePath = path.join('uploads', filename)
    
    // 检查文件是否存在
    try {
      await fs.access(filePath)
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      })
    }
    
    // 获取文件信息
    const stats = await fs.stat(filePath)
    const metadata = await sharp(filePath).metadata()
    
    res.json({
      success: true,
      data: {
        filename,
        size: stats.size,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime
      }
    })
    
  } catch (error) {
    console.error('获取文件信息失败:', error)
    res.status(500).json({
      success: false,
      message: '获取文件信息失败'
    })
  }
})

module.exports = router