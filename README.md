# 营会管理系统

> 为营会发起者及参与者查看日程及分工提供支持

## 🏗️ 架构说明

本项目采用前后端分离架构：

- **前端** (`fontend/`): Vue 3 + TypeScript + Ant Design Vue
- **后端** (`backend/`): Node.js + Express + JWT认证

## 🔐 认证系统

### 密码管理
- 密码由后端自动生成和管理
- 默认每60分钟自动更新一次
- 前端通过API获取密码配置信息
- 支持邮箱发送临时访问密码

### API 接口
- **后端地址**: http://localhost:9010
- **认证接口**:
  - `GET /api/auth/password-config` - 获取密码配置
  - `POST /api/auth/verify-password` - 验证密码
  - `POST /api/auth/verify-token` - 验证Token
  - `POST /api/auth/refresh-password` - 刷新密码
- **邮件接口**:
  - `POST /api/send-password-email` - 发送密码邮件

## 🚀 快速开始

### 1. 启动后端服务
```bash
cd backend
npm install
npm start
```

### 2. 启动前端服务
```bash
cd fontend
npm install
npm run dev
```

### 3. 访问系统
- 前端应用: http://localhost:9001
- 后端API: http://localhost:9010

## 📝 使用说明

1. **首次访问**: 系统会自动生成密码并存储在后端
2. **密码获取**: 在登录页面选择"邮箱获取"模式，输入白名单邮箱
3. **密码验证**: 输入正确的临时密码即可登录
4. **自动更新**: 密码每小时自动更新，确保安全性

## 🔧 开发说明

### 后端开发
```bash
cd backend
npm run test-auth  # 测试认证功能
```

### 前端开发
```bash
cd fontend
npm run dev       # 启动开发服务器
```

## 📁 项目结构

```
ikecoolon.github.io/
├── backend/           # 后端服务
│   ├── server.js      # 主服务文件
│   ├── test-auth.js   # 认证测试脚本
│   └── data/          # 密码配置文件存储目录
├── fontend/           # 前端应用
│   ├── src/
│   │   ├── api/       # API接口
│   │   ├── store/     # 状态管理
│   │   └── utils/     # 工具函数
│   └── public/json/   # 静态数据文件
└── README.md          # 项目说明
```

## 🎯 核心特性

- ✅ 前后端分离架构
- ✅ JWT Token认证
- ✅ 自动密码生成和更新
- ✅ 邮箱密码发送
- ✅ 密码过期管理
- ✅ 响应式前端界面

---
