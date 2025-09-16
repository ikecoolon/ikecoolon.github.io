#!/bin/bash

# 营会管理系统启动脚本

echo "🏕️ 营会管理系统启动脚本"
echo "========================"

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 检测到缺少依赖，正在安装..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
    echo "✅ 依赖安装完成"
fi

# 创建必要的目录
mkdir -p public/json
mkdir -p dist

echo ""
echo "🚀 启动前端服务..."

# 启动前端开发服务器
npm run dev

echo ""
echo "🎉 前端服务已停止！"
echo ""
echo "📍 访问地址："
echo "   http://localhost:3000"
echo ""
echo "💡 提示："
echo "   - 数据存储在浏览器本地存储中"
echo "   - 首次访问会自动从 public/json/ 加载默认数据"
echo "   - 登录密码：admin123"
echo "   - 数据文件位置：public/json/"
