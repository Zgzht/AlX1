// components/eco-chart/eco-chart.js
Component({
  properties: {
    data: {
      type: Array,
      value: []
    },
    type: {
      type: String,
      value: 'bar' // bar, line, pie
    },
    width: {
      type: Number,
      value: 300
    },
    height: {
      type: Number,
      value: 200
    },
    showLegend: {
      type: Boolean,
      value: true
    }
  },

  data: {
    canvasWidth: 300,
    canvasHeight: 200,
    legendData: []
  },

  lifetimes: {
    attached() {
      this.initChart()
    }
  },

  observers: {
    'data, type': function(data, type) {
      if (data && data.length > 0) {
        this.drawChart()
      }
    }
  },

  methods: {
    initChart() {
      const { width, height } = this.properties
      this.setData({
        canvasWidth: width,
        canvasHeight: height
      })
      
      // 获取canvas上下文
      this.ctx = wx.createCanvasContext('ecoChart', this)
      
      if (this.properties.data && this.properties.data.length > 0) {
        this.drawChart()
      }
    },

    drawChart() {
      const { data, type } = this.properties
      
      if (!this.ctx || !data || data.length === 0) {
        return
      }
      
      // 清空画布
      this.ctx.clearRect(0, 0, this.data.canvasWidth, this.data.canvasHeight)
      
      switch (type) {
        case 'bar':
          this.drawBarChart(data)
          break
        case 'line':
          this.drawLineChart(data)
          break
        case 'pie':
          this.drawPieChart(data)
          break
        default:
          this.drawBarChart(data)
      }
      
      this.ctx.draw()
    },

    drawBarChart(data) {
      const padding = 40
      const chartWidth = this.data.canvasWidth - padding * 2
      const chartHeight = this.data.canvasHeight - padding * 2
      
      // 计算最大值
      const maxValue = Math.max(...data.map(item => item.value))
      const barWidth = chartWidth / data.length * 0.6
      const barSpacing = chartWidth / data.length * 0.4
      
      // 颜色数组
      const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4']
      
      // 绘制坐标轴
      this.ctx.setStrokeStyle('#e0e0e0')
      this.ctx.setLineWidth(1)
      
      // Y轴
      this.ctx.beginPath()
      this.ctx.moveTo(padding, padding)
      this.ctx.lineTo(padding, padding + chartHeight)
      this.ctx.stroke()
      
      // X轴
      this.ctx.beginPath()
      this.ctx.moveTo(padding, padding + chartHeight)
      this.ctx.lineTo(padding + chartWidth, padding + chartHeight)
      this.ctx.stroke()
      
      // 绘制柱状图
      const legendData = []
      
      data.forEach((item, index) => {
        const barHeight = (item.value / maxValue) * chartHeight
        const x = padding + index * (barWidth + barSpacing) + barSpacing / 2
        const y = padding + chartHeight - barHeight
        
        const color = colors[index % colors.length]
        
        // 绘制柱子
        this.ctx.setFillStyle(color)
        this.ctx.fillRect(x, y, barWidth, barHeight)
        
        // 绘制数值
        this.ctx.setFillStyle('#333')
        this.ctx.setFontSize(12)
        this.ctx.setTextAlign('center')
        this.ctx.fillText(item.value.toString(), x + barWidth / 2, y - 5)
        
        // 绘制标签
        this.ctx.setFillStyle('#666')
        this.ctx.setFontSize(10)
        this.ctx.fillText(item.label, x + barWidth / 2, padding + chartHeight + 20)
        
        // 添加图例数据
        legendData.push({
          label: item.label,
          value: item.value,
          color: color
        })
      })
      
      this.setData({ legendData })
    },

    drawLineChart(data) {
      const padding = 40
      const chartWidth = this.data.canvasWidth - padding * 2
      const chartHeight = this.data.canvasHeight - padding * 2
      
      // 计算最大值和最小值
      const values = data.map(item => item.value)
      const maxValue = Math.max(...values)
      const minValue = Math.min(...values)
      const valueRange = maxValue - minValue || 1
      
      // 绘制坐标轴
      this.ctx.setStrokeStyle('#e0e0e0')
      this.ctx.setLineWidth(1)
      
      // Y轴
      this.ctx.beginPath()
      this.ctx.moveTo(padding, padding)
      this.ctx.lineTo(padding, padding + chartHeight)
      this.ctx.stroke()
      
      // X轴
      this.ctx.beginPath()
      this.ctx.moveTo(padding, padding + chartHeight)
      this.ctx.lineTo(padding + chartWidth, padding + chartHeight)
      this.ctx.stroke()
      
      // 绘制折线
      this.ctx.setStrokeStyle('#4CAF50')
      this.ctx.setLineWidth(2)
      this.ctx.beginPath()
      
      data.forEach((item, index) => {
        const x = padding + (index / (data.length - 1)) * chartWidth
        const y = padding + chartHeight - ((item.value - minValue) / valueRange) * chartHeight
        
        if (index === 0) {
          this.ctx.moveTo(x, y)
        } else {
          this.ctx.lineTo(x, y)
        }
        
        // 绘制数据点
        this.ctx.setFillStyle('#4CAF50')
        this.ctx.fillRect(x - 3, y - 3, 6, 6)
        
        // 绘制数值
        this.ctx.setFillStyle('#333')
        this.ctx.setFontSize(12)
        this.ctx.setTextAlign('center')
        this.ctx.fillText(item.value.toString(), x, y - 10)
        
        // 绘制标签
        this.ctx.setFillStyle('#666')
        this.ctx.setFontSize(10)
        this.ctx.fillText(item.label, x, padding + chartHeight + 20)
      })
      
      this.ctx.stroke()
    },

    drawPieChart(data) {
      const centerX = this.data.canvasWidth / 2
      const centerY = this.data.canvasHeight / 2
      const radius = Math.min(centerX, centerY) - 40
      
      // 计算总值
      const totalValue = data.reduce((sum, item) => sum + item.value, 0)
      
      // 颜色数组
      const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4']
      
      let currentAngle = -Math.PI / 2 // 从顶部开始
      const legendData = []
      
      data.forEach((item, index) => {
        const sliceAngle = (item.value / totalValue) * 2 * Math.PI
        const color = colors[index % colors.length]
        
        // 绘制扇形
        this.ctx.setFillStyle(color)
        this.ctx.beginPath()
        this.ctx.moveTo(centerX, centerY)
        this.ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle)
        this.ctx.closePath()
        this.ctx.fill()
        
        // 绘制标签
        const labelAngle = currentAngle + sliceAngle / 2
        const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7)
        const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7)
        
        this.ctx.setFillStyle('#fff')
        this.ctx.setFontSize(12)
        this.ctx.setTextAlign('center')
        this.ctx.fillText(item.value.toString(), labelX, labelY)
        
        currentAngle += sliceAngle
        
        // 添加图例数据
        const percentage = Math.round((item.value / totalValue) * 100)
        legendData.push({
          label: item.label,
          value: `${item.value} (${percentage}%)`,
          color: color
        })
      })
      
      this.setData({ legendData })
    },

    onTouchStart(e) {
      // 处理触摸开始事件
    },

    onTouchMove(e) {
      // 处理触摸移动事件
    },

    onTouchEnd(e) {
      // 处理触摸结束事件
    }
  }
})