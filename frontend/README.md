# 营会管理系统

> 为营会发起者及参与者查看日程及分工提供支持

## ✨ 功能特性

### 🔐 安全认证
- **密码保护**: 编辑功能需要输入密码
- **简单认证**: 使用静态密码验证
- **默认密码**: admin123

### 📅 仪表盘
- **双视图模式**: 支持周视图和天视图切换
- **直观展示**: 活动在日历上清晰展示
- **动态详情**: 右侧内容栏显示选中活动的详细信息
- **实时统计**: 显示活动数量、服侍人员等关键指标

### 👥 服侍者管理
- **人员录入**: 添加服侍者基本信息、联系方式
- **技能管理**: 记录每位服侍者的技能特长
- **可用时间**: 管理服侍者的可服侍时间
- **服侍分配**: 查看每位服侍者参与的活动安排

### 📋 活动管理
- **活动创建**: 创建营会活动，设置时间、地点
- **职责分配**: 为活动分配相应的服侍人员
- **注意事项**: 记录每个活动的特殊要求和注意事项
- **状态跟踪**: 追踪活动状态（计划中、进行中、已完成）

## 🛠️ 技术栈

- **前端**: Vue 3.0 + TypeScript + Ant Design Vue
- **样式**: UnoCSS 原子化CSS
- **状态管理**: Pinia
- **路由**: Vue Router
- **时间处理**: Day.js
- **工具库**: Lodash-es
- **数据存储**: JSON配置文件

## 🚀 快速开始

### 环境要求
- Node.js >= 16.0
- npm >= 8.0

### 一键启动
```bash
./start.sh
```

### 手动启动

1. **安装依赖**
```bash
npm install
```

2. **启动开发服务器**
```bash
npm run dev
```

### 访问地址
- 前端应用: http://localhost:3000

## ⚙️ 使用说明

### 首次使用

1. **启动系统**
   ```bash
   ./start.sh
   ```

2. **访问系统**
   - 打开浏览器访问 http://localhost:3000
   - 系统会自动创建默认数据

3. **登录系统**
   - 点击需要编辑的功能时会要求输入密码
   - 默认密码：`admin123`

4. **开始使用**
   - 在仪表盘查看活动安排
   - 查看服侍者和活动信息
   - 在系统设置中查看系统状态

### 功能特性

#### 营会管理
- **营会创建**: 支持创建多场营会，设置营会的名称、起始日期、结束日期、地点等信息
- **营会状态**: 营会状态包括规划中、进行中、已完成、已取消
- **活动关联**: 营会可以关联多个活动，支持查看营会相关的所有活动
- **状态筛选**: 支持按营会状态筛选显示
- **详情查看**: 点击营会卡片可查看详细的营会信息和关联活动
- **活动管理**: 在营会详情中可以添加或移除关联的活动

#### 仪表盘功能
- **数据概览**: 显示活动总数、今日活动、服侍人员、服侍类型等统计信息
- **日历视图**: 周视图显示，支持点击日期查看当天详细活动
- **时间段分组**: 活动按时间段自动分组：
  - **上午** (6:00-12:00): 早晨活动
  - **下午** (12:00-18:00): 下午活动
  - **晚上** (18:00-24:00): 晚间活动
- **活动详情**: 点击活动可查看详细信息，支持查看课程和人员详情

#### 数据管理
- **在线编辑**: 支持在线数据修改和保存
- **自动保存**: 修改后自动保存到浏览器本地存储
- **数据导出**: 可导出修改后的数据为JSON文件
- **数据导入**: 支持从备份文件导入数据
- **数据重置**: 可重置为原始配置文件状态
- **数据来源**: 优先使用本地存储数据，无数据时从 `public/json/` 读取默认数据

### 自动密码管理系统

系统支持自动生成和管理密码功能：

#### 密码配置
- **存储位置**: `public/json/auth.json`
- **自动生成**: 系统启动时自动生成强密码
- **定时更新**: 支持设置密码更新间隔（默认1小时）
- **邮件通知**: 可配置密码更新通知（需集成邮件服务）

#### 密码管理命令
```bash
# 生成新密码配置
npm run generate-password

# 生成指定更新间隔的密码（例如2小时）
npm run generate-password generate 120

# 更新当前密码
npm run update-password

# 查看当前密码配置
npm run view-password
```

#### 密码配置示例
```json
{
  "currentPassword": "Ab3!Xy9$Zp2",
  "lastUpdated": "2024-01-01T10:00:00.000Z",
  "updateInterval": 60,
  "nextUpdateTime": "2024-01-01T11:00:00.000Z",
  "email": "52282858@qq.com",
  "enabled": true
}
```

#### 密码安全特性
- **强密码生成**: 包含大小写字母、数字和特殊字符
- **自动更新**: 可设置定时更新密码
- **配置管理**: 通过JSON文件管理密码配置
- **开发环境**: 开发环境下可在控制台查看密码

### 数据文件说明

系统支持两种数据存储方式：

#### 1. 本地存储（推荐）
- 数据自动保存到浏览器本地存储
- 支持实时修改和保存
- 修改立即生效，无需刷新页面

#### 2. JSON配置文件（默认数据）
- **`public/json/ministries.json`**: 服侍类型数据（敬拜组、接待组等）
  ```json
  [
    {
      "id": "1",
      "name": "敬拜组",
      "description": "负责营会期间的敬拜带领",
      "responsibilities": ["主领敬拜", "协调乐器", "管理音响"],
      "requirements": ["有敬拜经验", "熟悉诗歌"],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
  ```

- **`public/json/participants.json`**: 服侍者数据
  ```json
  [
    {
      "id": "1",
      "name": "张三",
      "phone": "13800138001",
      "email": "zhangsan@example.com",
      "ministryIds": ["1"],
      "skills": ["吉他", "唱歌"],
      "availability": "周末",
      "notes": "有3年敬拜经验",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
  ```

- **`public/json/camps.json`**: 活动数据
  ```json
  [
    {
      "id": "1",
      "title": "开幕式",
      "description": "营会开幕仪式",
      "startTime": "2024-01-16T09:00:00.000Z",
      "endTime": "2024-01-16T10:00:00.000Z",
      "location": "主会场",
      "assignedMembers": ["1", "2"],
      "ministryIds": ["1", "2"],
      "notes": "需要提前30分钟到场准备",
      "status": "planned",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
  ```

- **`public/json/courses.json`**: 课程数据
  ```json
  [
    {
      "id": "1",
      "title": "信仰基础",
      "instructor": "张牧师",
      "description": "基督教信仰的基本真理",
      "duration": 90,
      "activities": ["1", "2"],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
  ```

## 📁 项目结构

```
营会管理系统/
├── src/                    # 前端源码
│   ├── api/                # API接口（本地数据管理）
│   ├── components/         # 通用组件
│   ├── layouts/            # 布局组件
│   ├── store/              # 状态管理
│   ├── utils/              # 工具函数
│   ├── view/               # 页面组件
│   │   ├── dashboard/      # 仪表盘
│   │   ├── ministry/       # 服侍者管理
│   │   ├── activity/       # 活动管理
│   │   ├── settings/       # 系统设置
│   │   └── login/          # 登录页面
│   └── main.ts             # 应用入口
├── json/                   # 默认数据文件（源文件）
├── public/
│   ├── json/               # 复制的默认数据文件（供前端读取）
│   └── index.html          # HTML模板
├── types/                  # TypeScript类型定义
└── build/                  # 构建配置
```

## 🔧 开发指南

### 代码规范
- 使用 ESLint + Prettier 进行代码格式化
- 遵循 TypeScript 严格模式
- 采用驼峰命名规范
- 使用 JSDoc 注释

### 样式规范
- 优先使用 UnoCSS 原子类
- 避免编写自定义 CSS
- 使用 px 作为单位
- 合理使用 UnoCSS 动画效果

### 组件设计原则
- 合理拆分复杂组件
- 公共组件使用 props 传递数据
- 业务组件使用 store 管理状态
- 保持单一职责原则

## 📝 数据结构

### 活动数据 (activities)
```typescript
interface Activity {
  id: string
  title: string
  description: string
  startTime: Date
  endTime: Date
  location: string
  assignedMembers: string[]
  ministryIds: string[]
  notes?: string
  status: 'planned' | 'ongoing' | 'completed' | 'cancelled'
  createdAt: Date
}
```

### 服侍者数据 (members)
```typescript
interface MinistryMember {
  id: string
  name: string
  phone: string
  email: string
  ministryIds: string[]
  skills: string[]
  availability: string
  notes?: string
  createdAt: Date
}
```

### 服侍类型数据 (ministries)
```typescript
interface Ministry {
  id: string
  name: string
  description: string
  responsibilities: string[]
  requirements: string[]
  createdAt: Date
}
```

## 🚀 部署说明

### 部署到静态服务器
1. 将整个项目目录上传到静态服务器
2. 确保 `public/json/` 目录下的文件可以被访问
3. 配置服务器支持SPA路由（重定向到 index.html）
4. 访问部署后的地址即可使用

### 部署到 GitHub Pages
```bash
# 将项目上传到GitHub仓库
# 在GitHub Pages设置中选择部署整个仓库
# 确保public/json/目录下的文件会被正确提供
```

### 重要说明
- **数据修改**: 所有数据修改都需要直接编辑 `public/json/` 目录下的JSON文件
- **文件权限**: 确保部署服务器可以读取 `public/json/` 目录下的文件
- **CORS**: 如果遇到跨域问题，可能需要在服务器配置中允许JSON文件的访问

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交变更
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证

## 📞 支持

如有问题或建议，请联系系统管理员

---

## 🎯 使用指南

### 日常使用

1. **查看活动安排**
   - 在仪表盘查看日历视图
   - 切换周视图/天视图
   - 点击活动查看详情

2. **管理服侍者**
   - 进入"服侍者管理"页面
   - 点击"添加服侍者"添加新成员
   - 编辑现有成员信息
   - 分配服侍类型和技能

3. **安排活动**
   - 进入"活动管理"页面
   - 点击"添加活动"创建新活动
   - 编辑活动信息和分配服侍人员
   - 设置注意事项和状态

4. **数据维护**
   - 数据自动保存，无需手动操作
   - 定期在系统设置中导出数据备份
   - 必要时导入备份文件恢复数据
   - 可重置系统恢复到初始状态

### 密码修改

如需修改登录密码，请在代码中修改：
```typescript
// src/store/auth.ts
const DEFAULT_PASSWORD = '新密码'
```

### 数据备份

建议定期在系统设置中导出数据进行备份，以防浏览器数据丢失。

---

**🏕️ 愿这个系统能为您的营会管理带来便利！**
