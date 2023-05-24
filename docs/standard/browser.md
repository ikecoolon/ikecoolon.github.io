# 浏览器本地存储规范

## 介绍
**因微前端架构下各业务工程聚合会采用同源策略，本地存储key可能冲突，故产生该规范。**

## 占用情况
::: warning 注意
### SessionStorage

| keys                      | 使用情况 | 用途 |
| --------------------------|:------:|:-----|
| acloud-urls               | used   | 当前用户权限      |
| acloud-menu               | used   | 所有菜单         |
| acloud-user_info          | used   | 用户信息         |
| acloud-refresh_token      | used   | 惰性令牌         |
| acloud-access_token       | used   | 令牌            |
| acloud-access_token_obj   | used   | token对象化     |

:::

::: warning 注意
### LocalStorage

| keys                      | 使用情况 | 用途 |
| --------------------------|:------:|:-----|

:::





## 如何使用本页
**如果你的业务使用本地存储，请遵循注册制的约定**



### 查阅
**确认已占用的key及含义**
    
### 新增
**明确你要使用key值命名及含义，并补全[本页](https://192.168.0.29:8443/svn/190361/trunk/05.Code/infrastructure/frontend-standard/docs/standard/browser.md)**

### 修改
::: danger 请慎重操作

**与平台组及各项目组充分沟通，达成一致后再进行修改**

:::
