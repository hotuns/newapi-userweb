# `user-web`

基于 Next.js 16 的普通用户前端，面向 `new-api` 的用户侧能力，提供：

- 自定义营销首页
- 登录 / 注册
- 用户控制台
- API Key 管理
- 模型与价格浏览
- 消费日志
- 只读账单与订阅概览
- 个人资料与修改密码

管理员仍使用 `new-api` 自带后台，这个项目不实现管理员页面。

## 开发

```bash
source ~/.zshrc
pnpm install
pnpm dev
```

默认通过 `.env.example` 中的 `NEWAPI_BASE_URL=http://localhost:3000` 连接本机 `new-api`。

## 部署

生产部署采用独立 `MoreToken` 容器接入官方 `new-api` Docker 网络的方式，不修改上游 `new-api/docker-compose.yml`。

- Dockerfile: [Dockerfile](/home/hotuns/moretoken-newapi/user-web/Dockerfile)
- Compose: [docker-compose.yml](/home/hotuns/moretoken-newapi/user-web/docker-compose.yml)
- 部署文档: [DEPLOYMENT.md](/home/hotuns/moretoken-newapi/user-web/DEPLOYMENT.md)

## 当前 API 使用说明

这一节只记录 **当前已经在代码里实际使用或显式白名单放行** 的接口。

### 1. 前端自己的同域接口

这些接口由 Next.js 提供，浏览器始终请求它们，而不是直接请求 `new-api`。

#### 认证接口

- `POST /api/auth/login`
  - 用途：用户名密码登录
  - 后端转发到：`POST /api/user/login`
  - 额外行为：透传后端 `session` cookie；如果不是 2FA 挑战，会写入 `newapi_uid` cookie

- `POST /api/auth/login/2fa`
  - 用途：完成 2FA 登录
  - 后端转发到：`POST /api/user/login/2fa`
  - 额外行为：透传后端 `session` cookie；成功后写入 `newapi_uid`

- `POST /api/auth/register`
  - 用途：普通用户注册
  - 后端转发到：`POST /api/user/register`

- `POST /api/auth/logout`
  - 用途：退出登录
  - 后端转发到：`GET /api/user/logout`
  - 额外行为：清理 `newapi_uid`

#### 通用代理接口

- `ALL /api/newapi/[...path]`
  - 用途：统一代理用户侧接口
  - 额外行为：
    - 仅允许白名单路径
    - 自动透传浏览器携带的 `session` cookie
    - 对受保护接口自动补 `New-Api-User: <uid>`

### 2. 当前实际使用的 `new-api` 后端接口

下面按页面/功能列出最终落到 `new-api` 的接口。

#### 公共页 / 营销页

- `GET /api/status`
  - 使用位置：首页、登录页、注册页、法律页
  - 用途：
    - 读取 `turnstile_check`
    - 读取 `email_verification`
    - 读取 `quota_display_type`
    - 读取 `custom_currency_symbol`
    - 判断 `user_agreement_enabled`
    - 判断 `privacy_policy_enabled`

- `GET /api/pricing`
  - 使用位置：首页模型价格预览、`/models`
  - 用途：公开模型与价格浏览
  - 备注：当前你的实例返回 `data: []`，前端已按空状态处理

- `GET /api/privacy-policy`
  - 使用位置：`/legal/privacy`
  - 用途：读取隐私政策正文

- `GET /api/user-agreement`
  - 使用位置：`/legal/terms`
  - 用途：读取服务条款正文

#### 认证

- `POST /api/user/login`
  - 使用位置：登录页
  - 用途：账号密码登录

- `POST /api/user/login/2fa`
  - 使用位置：登录页 2FA 第二步
  - 用途：完成两步验证

- `POST /api/user/register`
  - 使用位置：注册页
  - 用途：普通用户注册

- `GET /api/user/logout`
  - 使用位置：顶部退出按钮
  - 用途：清理后端 session

#### 用户资料 / 设置

- `GET /api/user/self`
  - 使用位置：`/dashboard`、`/settings/profile`
  - 用途：获取当前用户资料、额度、请求数等

- `PUT /api/user/self`
  - 使用位置：`/settings/profile`、`/settings/security`
  - 用途：
    - 更新 `display_name`
    - 修改密码（`original_password` + `password`）

#### 模型

- `GET /api/user/models`
  - 使用位置：`/dashboard`、`/models`
  - 用途：读取当前登录用户可用模型列表

#### Token / API Key

- `GET /api/token`
  - 使用位置：`/keys`
  - 用途：读取当前用户的 token 列表

- `POST /api/token`
  - 使用位置：`/keys`
  - 用途：创建 token
  - 当前前端提交字段：
    - `name`
    - `group`
    - `unlimited_quota`
    - `remain_quota`
    - `expired_time`
    - `allow_ips`
    - `model_limits_enabled`
    - `model_limits`
    - `cross_group_retry`

- `PUT /api/token?status_only=true`
  - 使用位置：`/keys`
  - 用途：启用 / 禁用 token

- `DELETE /api/token/:id`
  - 使用位置：`/keys`
  - 用途：删除 token

- `POST /api/token/:id/key`
  - 使用位置：`/keys`
  - 用途：查看 token 完整值

#### 日志

- `GET /api/log/self`
  - 使用位置：`/dashboard`、`/logs`
  - 用途：读取当前用户消费日志

- `GET /api/log/self/stat`
  - 使用位置：`/dashboard`、`/logs`
  - 用途：读取当前用户日志统计值，例如 `quota`、`rpm`、`tpm`

#### 账单 / 订阅

- `GET /api/user/topup/info`
  - 使用位置：`/billing`
  - 用途：读取充值开关、支付方式、最小充值额度等

- `GET /api/user/topup/self`
  - 使用位置：`/billing`
  - 用途：读取当前用户充值记录

- `GET /api/subscription/self`
  - 使用位置：`/dashboard`、`/billing`
  - 用途：读取当前用户订阅概览、额度重置时间、账单偏好

- `GET /api/subscription/plans`
  - 使用位置：`/dashboard`、`/billing`
  - 用途：把订阅中的 `plan_id` 映射成可读的套餐标题与额度配置

#### 控制台趋势

- `GET /api/data/self`
  - 使用位置：`/dashboard`
  - 用途：读取当前用户按小时聚合的用量趋势数据
  - 当前前端使用方式：
    - 拉取今日曲线
    - 拉取近 3 天曲线
    - 拉取近 7 天曲线

### 3. 已加入代理白名单但当前页面未实际调用的接口

这些接口已经在 `src/lib/newapi.ts` 白名单里放行，但当前版本页面还没有实际使用：

- `GET /api/notice`
  - 预留给后续首页公告或站点通知模块

- `GET /api/verification`
  - 预留给邮箱验证码发送
  - 当前因为你的实例 `email_verification=false`，注册页没有发送验证码流程

- `GET /api/reset_password`
  - 预留给找回密码页
  - 当前 V1 未实现找回密码页面

- `GET /api/user/token`
  - 预留给“系统 access token”查看或生成功能
  - 当前未在页面里使用

- `PUT /api/user/setting`
  - 预留给用户通知偏好或更细粒度设置
  - 当前未在页面里使用

### 4. 鉴权约定

用户态接口不是只靠后端 `session` cookie。

当前前端实现使用两层信息：

- 后端 `session` cookie
  - 由 `new-api` 登录后返回
  - Next BFF 会在代理请求时透传

- `newapi_uid` cookie
  - 由 Next 在登录成功后写入
  - 代理受保护接口时，会把它映射到请求头：
    - `New-Api-User: <uid>`

如果只有 `session` 而没有 `New-Api-User`，`new-api` 的用户态接口会返回未授权。

### 5. 代码位置

如果后续继续加页面或接口，优先看这些文件：

- `src/app/api/auth/*`
  - 认证相关的 Next BFF 路由

- `src/app/api/newapi/[...path]/route.ts`
  - 通用代理入口

- `src/lib/newapi.ts`
  - `new-api` 白名单与请求头注入规则

- `src/lib/server-fetch.ts`
  - 当前服务端页面使用的 `new-api` 抓取函数

- `src/types/api.ts`
  - 当前前端共享 API 类型
