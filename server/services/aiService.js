// services/aiService.js
const axios = require('axios')

// 模拟AI图像识别服务
const recognizeImage = async (imageUrl) => {
  try {
    // 这里应该调用真实的AI识别API
    // 为了演示，我们使用模拟数据
    
    // 模拟识别延迟
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 模拟识别结果
    const mockResults = [
      {
        type: 'garbage_sorting',
        confidence: 0.92,
        categories: ['recyclable', 'plastic_bottle'],
        description: '识别到可回收垃圾 - 塑料瓶'
      },
      {
        type: 'energy_saving',
        confidence: 0.88,
        categories: ['light_switch', 'off'],
        description: '识别到节能行为 - 关灯'
      },
      {
        type: 'green_travel',
        confidence: 0.85,
        categories: ['bicycle', 'transportation'],
        description: '识别到绿色出行 - 骑自行车'
      },
      {
        type: 'eco_shopping',
        confidence: 0.90,
        categories: ['reusable_bag', 'shopping'],
        description: '识别到环保购物 - 使用环保袋'
      },
      {
        type: 'water_saving',
        confidence: 0.87,
        categories: ['faucet', 'closed'],
        description: '识别到节水行为 - 关闭水龙头'
      }
    ]
    
    // 随机选择一个结果
    const result = mockResults[Math.floor(Math.random() * mockResults.length)]
    
    // 模拟识别失败的情况（10%概率）
    if (Math.random() < 0.1) {
      return {
        success: false,
        message: '无法识别图片中的环保行为，请重新拍照'
      }
    }
    
    return {
      success: true,
      data: result
    }
    
  } catch (error) {
    console.error('AI识别服务错误:', error)
    return {
      success: false,
      message: '识别服务暂时不可用'
    }
  }
}

// 真实的AI识别服务调用（示例）
const realAIRecognition = async (imageUrl) => {
  try {
    const response = await axios.post(process.env.AI_API_URL, {
      image_url: imageUrl,
      model: 'eco-behavior-v1',
      confidence_threshold: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.AI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    })
    
    if (response.data.success) {
      return {
        success: true,
        data: {
          type: response.data.category,
          confidence: response.data.confidence,
          categories: response.data.labels,
          description: response.data.description
        }
      }
    } else {
      return {
        success: false,
        message: response.data.message || '识别失败'
      }
    }
    
  } catch (error) {
    console.error('AI API调用失败:', error)
    return {
      success: false,
      message: '识别服务暂时不可用'
    }
  }
}

// 图像预处理
const preprocessImage = async (imageUrl) => {
  try {
    // 这里可以添加图像预处理逻辑
    // 比如压缩、裁剪、格式转换等
    
    return {
      success: true,
      processedUrl: imageUrl
    }
    
  } catch (error) {
    console.error('图像预处理失败:', error)
    return {
      success: false,
      message: '图像处理失败'
    }
  }
}

// 批量识别
const batchRecognize = async (imageUrls) => {
  try {
    const results = await Promise.all(
      imageUrls.map(url => recognizeImage(url))
    )
    
    return {
      success: true,
      data: results
    }
    
  } catch (error) {
    console.error('批量识别失败:', error)
    return {
      success: false,
      message: '批量识别失败'
    }
  }
}

// 获取支持的识别类型
const getSupportedTypes = () => {
  return [
    {
      type: 'garbage_sorting',
      name: '垃圾分类',
      description: '识别垃圾分类行为',
      examples: ['可回收垃圾', '有害垃圾', '厨余垃圾', '其他垃圾']
    },
    {
      type: 'energy_saving',
      name: '节能减排',
      description: '识别节能行为',
      examples: ['关灯', '关空调', '拔插头', '使用节能设备']
    },
    {
      type: 'green_travel',
      name: '绿色出行',
      description: '识别绿色出行方式',
      examples: ['步行', '骑自行车', '乘坐公交', '地铁出行']
    },
    {
      type: 'eco_shopping',
      name: '环保购物',
      description: '识别环保购物行为',
      examples: ['使用环保袋', '购买环保产品', '减少包装']
    },
    {
      type: 'water_saving',
      name: '节约用水',
      description: '识别节水行为',
      examples: ['关闭水龙头', '使用节水设备', '收集雨水']
    },
    {
      type: 'paper_saving',
      name: '节约用纸',
      description: '识别节纸行为',
      examples: ['双面打印', '电子文档', '废纸回收']
    }
  ]
}

module.exports = {
  recognizeImage,
  realAIRecognition,
  preprocessImage,
  batchRecognize,
  getSupportedTypes
}