# 📧 邮件服务配置指南

## 🎯 概述

营会管理系统现已支持邮件服务，可以将临时访问密码发送到指定邮箱。要启用邮件功能，你需要配置一个发件邮箱账户。

## ⚙️ 配置步骤

### 步骤1：准备邮箱账户

#### QQ邮箱配置
1. 登录 QQ邮箱：https://mail.qq.com
2. 点击 **设置** → **账户**
3. 找到 **POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务**
4. 开启 **POP3/SMTP服务**
5. 点击 **生成授权码**
6. **保存授权码**（这是你需要填写的密码）

#### Gmail配置
1. 登录 Gmail：https://mail.google.com
2. 点击右上角头像 → **Google 账户**
3. 点击左侧 **安全**
4. 开启 **两步验证**
5. 返回安全页面，找到 **应用密码**
6. 生成应用密码（选择"邮件"应用）
7. **保存16位密码**

#### 163邮箱配置
1. 登录 163邮箱：https://mail.163.com
2. 点击 **设置** → **POP3/SMTP/IMAP**
3. 开启 **POP3/SMTP服务**
4. 点击 **客户端授权密码**
5. 生成授权码
6. **保存授权码**

### 步骤2：运行配置脚本

```bash
# 运行邮件配置脚本
npm run setup-email
```

按照提示进行配置：

```
是否启用邮件服务？(y/n): y

📧 选择邮件服务提供商:
1. QQ邮箱 (smtp.qq.com)
2. Gmail (smtp.gmail.com)
3. 163邮箱 (smtp.163.com)
4. 自定义SMTP服务器
请选择 (1-4): 1

✅ 已选择: QQ邮箱 SMTP 配置

请输入发件邮箱地址: your-email@qq.com
请输入邮箱密码/授权码: xxxxxxxxxxxx
发件人姓名 (默认: 营会管理系统): 营会管理系统
发件人邮箱 (默认: your-email@qq.com): your-email@qq.com
```

### 步骤3：测试配置

```bash
# 测试邮件配置
npm run test-email

# 查看当前配置
npm run setup-email show

# 获取帮助信息
npm run setup-email help
```

## 🔧 配置文件说明

配置完成后会在 `public/json/email-config.json` 生成以下配置：

```json
{
  "enabled": true,
  "service": "qq",
  "smtp": {
    "host": "smtp.qq.com",
    "port": 587,
    "secure": false,
    "auth": {
      "user": "your-email@qq.com",
      "pass": "your-authorization-code"
    }
  },
  "from": {
    "name": "营会管理系统",
    "address": "your-email@qq.com"
  },
  "templates": {
    "passwordEmail": {
      "subject": "营会管理系统临时访问密码",
      "htmlTemplate": "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;'>...</div>",
      "textTemplate": "亲爱的用户，\n\n您的临时访问密码是：{password}\n..."
    }
  },
  "lastUpdated": "2025-09-16T07:00:00.000Z",
  "description": "邮件服务配置 - QQ邮箱 SMTP 配置"
}
```

## 📧 SMTP服务器信息

| 服务商 | SMTP服务器 | 端口 | SSL/TLS | 说明 |
|--------|-------------|------|---------|------|
| QQ邮箱 | smtp.qq.com | 587 | TLS | 需要授权码 |
| Gmail | smtp.gmail.com | 587 | TLS | 需要应用密码 |
| 163邮箱 | smtp.163.com | 465 | SSL | 需要授权码 |
| Outlook | smtp-mail.outlook.com | 587 | TLS | 需要密码 |

## 🎨 邮件模板自定义

你可以在 `email-config.json` 中自定义邮件模板：

```json
"templates": {
  "passwordEmail": {
    "subject": "自定义邮件标题",
    "htmlTemplate": "<div style='font-family: 微软雅黑;'>您的密码是：{password}</div>",
    "textTemplate": "您的密码是：{password}"
  }
}
```

### 模板变量
- `{password}` - 临时访问密码
- `{expirationTime}` - 密码过期时间
- `{timestamp}` - 发送时间

## 🔐 安全注意事项

### 密码安全
- ✅ **授权码代替密码**：使用邮箱提供的授权码，而不是登录密码
- ✅ **定期更换**：定期更换授权码
- ✅ **权限控制**：只在必要时开启SMTP服务

### 配置安全
- ✅ **文件权限**：确保配置文件不被公开访问
- ✅ **环境变量**：生产环境建议使用环境变量存储敏感信息
- ✅ **日志记录**：记录邮件发送日志但不记录密码

### 使用安全
- ✅ **白名单验证**：只有白名单邮箱才能接收密码
- ✅ **频率限制**：限制邮件发送频率
- ✅ **内容过滤**：邮件内容不包含敏感信息

## 🐛 故障排除

### 常见问题

#### 1. 连接失败
```
错误：getaddrinfo ENOTFOUND smtp.qq.com
```
**解决方案**：
- 检查网络连接
- 确认SMTP服务器地址正确
- 检查防火墙设置

#### 2. 认证失败
```
错误：Invalid login
```
**解决方案**：
- 确认使用的是授权码而不是登录密码
- 检查邮箱和授权码是否正确
- 确认SMTP服务已开启

#### 3. 发送被拒绝
```
错误：Mail rejected
```
**解决方案**：
- 检查发件人邮箱是否与SMTP账户一致
- 确认邮箱服务商的发送限制
- 检查邮箱是否被列入黑名单

### 调试方法

#### 1. 查看详细日志
```javascript
// 在浏览器控制台中查看邮件发送详情
console.log('邮件发送详情:', emailResult)
```

#### 2. 测试连接
```bash
# 使用telnet测试SMTP连接
telnet smtp.qq.com 587
```

#### 3. 验证配置
```bash
# 运行配置测试
npm run test-email
```

## 🚀 生产环境部署

### 环境变量配置
对于生产环境，建议使用环境变量：

```javascript
// 在生产环境中使用环境变量
const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
}
```

### 后端集成
在生产环境中，建议将邮件发送功能移至后端：

```javascript
// 前端调用后端API
const response = await fetch('/api/send-password-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
})
```

## 📞 技术支持

### 相关文件
- `src/utils/emailService.ts` - 邮件服务核心逻辑
- `public/json/email-config.json` - 邮件配置
- `public/json/email-whitelist.json` - 邮箱白名单
- `scripts/setup-email.cjs` - 配置脚本
- `scripts/test-email.cjs` - 测试脚本

### 扩展功能
- **邮件队列**：处理大量邮件发送
- **模板引擎**：支持更复杂的邮件模板
- **附件支持**：发送带附件的邮件
- **多语言支持**：支持多种语言的邮件模板

---

## 🎉 配置完成！

配置完成后，你就可以通过登录页面的"邮箱获取"功能，向白名单邮箱发送临时访问密码了！

**配置状态检查**：
```bash
npm run test-email
```

**使用示例**：
1. 打开登录页面
2. 选择"邮箱获取"模式
3. 输入白名单邮箱
4. 点击"发送密码"
5. 检查邮箱获取密码

如有问题，请查看浏览器控制台日志或运行测试脚本进行诊断。
