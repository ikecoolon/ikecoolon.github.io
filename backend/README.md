# 营会管理系统后端服务

专用于处理认证、密码管理和邮件服务的后端服务。

## 🚀 快速开始

### 1. 安装依赖
```bash
cd server
npm install
```

### 2. 启动服务
```bash
npm start
```

### 3. 测试服务
```bash
npm test
```

## 📡 API 接口

### 健康检查
```http
GET /health
```

**响应示例：**
```json
{
  "status": "ok",
  "service": "camp-mail-service",
  "timestamp": "2025-09-16T07:00:00.000Z"
}
```

### 发送密码邮件
```http
POST /api/send-password-email
```

**请求体：**
```json
{
  "email": "user@example.com"
}
```

**成功响应：**
```json
{
  "success": true,
  "message": "密码邮件发送成功",
  "messageId": "1234567890@example.com"
}
```

**错误响应：**
```json
{
  "success": false,
  "message": "该邮箱不在白名单中，无法发送密码邮件"
}
```

**注意：** 发送密码邮件时，系统会自动验证邮箱是否在白名单中。只有白名单中的邮箱才能成功发送邮件。

## 🔐 认证 API

### 获取密码配置
```http
GET /api/auth/password-config
```

**成功响应：**
```json
{
  "success": true,
  "data": {
    "lastUpdated": "2025-09-16T07:00:00.000Z",
    "updateInterval": 60,
    "nextUpdateTime": "2025-09-16T08:00:00.000Z",
    "email": "52282858@qq.com",
    "enabled": true,
    "timeUntilExpiry": 3600
  }
}
```

### 验证密码
```http
POST /api/auth/verify-password
```

**请求体：**
```json
{
  "password": "Ab3!Xy9$Zp2"
}
```

**成功响应：**
```json
{
  "success": true,
  "message": "密码验证成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "admin",
    "username": "admin",
    "email": "52282858@qq.com",
    "role": "admin"
  }
}
```

### 验证 Token
```http
POST /api/auth/verify-token
```

**请求体：**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**成功响应：**
```json
{
  "success": true,
  "message": "Token验证成功",
  "user": {
    "userId": "admin",
    "username": "admin",
    "role": "admin",
    "iat": 1631760000
  }
}
```

### 获取当前密码（开发环境）
```http
GET /api/auth/current-password
```

**成功响应：**
```json
{
  "success": true,
  "password": "Ab3!Xy9$Zp2",
  "lastUpdated": "2025-09-16T07:00:00.000Z",
  "timeUntilExpiry": 3600
}
```

### 刷新密码
```http
POST /api/auth/refresh-password
```

**成功响应：**
```json
{
  "success": true,
  "message": "密码已刷新",
  "lastUpdated": "2025-09-16T07:00:00.000Z",
  "nextUpdateTime": "2025-09-16T08:00:00.000Z"
}
```

## ⚙️ 配置说明

### SMTP配置
目前已配置为QQ邮箱：
- **服务器**: smtp.qq.com
- **端口**: 587
- **安全**: TLS
- **发件邮箱**: 52282858@qq.com

### 修改配置
如需修改SMTP配置，请编辑 `server.js` 文件中的 `createTransporter` 函数：

```javascript
function createTransporter() {
  return nodemailer.createTransporter({
    host: 'your-smtp-server.com',
    port: 587,
    secure: false,
    auth: {
      user: 'your-email@example.com',
      pass: 'your-password'
    }
  });
}
```

## 🧪 测试说明

### 运行测试
```bash
npm test
```

### 测试内容
1. ✅ 服务健康检查
2. ✅ 邮件发送功能
3. ✅ 错误处理验证

### 预期输出
```
🧪 开始测试邮件服务...

🏥 测试健康检查...
✅ 健康检查通过
   服务状态: ok
   服务名称: camp-mail-service

📧 测试邮件发送...
✅ 邮件发送成功!
   收件人: 52282858@qq.com
   密码: TestPass123!
   消息ID: 1234567890@qq.com

🎉 测试完成!
```


## 🔧 开发说明

### 项目结构
```
server/
├── data/
│   ├── auth.json              # 密码配置和认证数据
│   └── email-whitelist.json   # 邮箱白名单配置
├── package.json               # 项目配置
├── server.js                  # 主服务文件
├── test-email.js              # 邮件服务测试脚本
├── test-auth.js               # 认证服务测试脚本
└── README.md                  # 说明文档
```

### 依赖说明
- **express**: Web框架
- **nodemailer**: 邮件发送库
- **cors**: 跨域支持
- **jsonwebtoken**: JWT token生成和验证
- **bcryptjs**: 密码加密（预留扩展用）

### 数据文件说明
- **data/auth.json**: 密码配置和认证相关数据
- **data/email-whitelist.json**: 邮箱白名单配置数据

### 端口配置
默认端口：`3002`

可通过环境变量修改：
```bash
PORT=8080 npm start
```

## 🚨 注意事项

### 安全提醒
1. **保护邮箱凭据**: 不要将邮箱密码提交到版本控制系统
2. **使用授权码**: QQ邮箱等服务商需要使用授权码而非登录密码
3. **生产环境**: 在生产环境中使用环境变量存储敏感信息

### 使用限制
1. **频率限制**: 注意邮件服务商的发送频率限制
2. **内容限制**: 避免发送垃圾邮件
3. **收件人验证**: 服务会验证邮箱格式，但不会验证邮箱是否存在

### 故障排除
- **连接失败**: 检查网络连接和SMTP服务器配置
- **认证失败**: 确认使用的是正确的授权码
- **发送失败**: 检查邮箱账户状态和发送权限

## 🔄 与前端集成

前端应用可以通过以下方式调用邮件服务：

```javascript
// 发送密码邮件
const response = await fetch('http://localhost:9010/api/send-password-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'user@example.com'
  })
});

const result = await response.json();
if (result.success) {
  console.log('邮件发送成功:', result.messageId);
} else {
  console.error('邮件发送失败:', result.message);
}
```

## 📈 扩展功能

### 可能的增强
- [ ] 支持多种邮件服务商
- [ ] 邮件模板自定义
- [ ] 发送日志记录
- [ ] 批量邮件发送
- [ ] 邮件队列管理

---

## 🎯 总结

这是一个专为营会管理系统设计的轻量级邮件服务，主要功能是发送临时访问密码邮件。服务设计简洁、安全，易于部署和维护。

如有问题，请检查服务日志或参考故障排除部分。
