# 2028 国考备考助手

第一版本地优先备考工作台，包含登录、今日任务、成语刷题、即时解析、错题复习、词义测试、统计、账号安全和题库后台。

## 本地启动

首次进入项目目录后运行：

```powershell
npm install
npm run start:local
```

`start:local` 会先生成生产构建，再启动 `next start`，避免开发服务器和生产构建共用 `.next` 导致页面脚本 404。访问 `http://127.0.0.1:3000`。

也可以直接运行 `scripts/start-local.ps1` 或双击 `scripts/start-local.cmd`。

本地管理员演示账号：`admin@example.com` / `123456`。普通用户可先注册。未配置 Supabase 时，数据保存在浏览器本地。

## CSV 题库

后台可下载模板、导入和导出题库。必填字段为：

```text
题干,选项A,选项B,选项C,选项D,正确选项,解析,难度,来源,来源说明
```

正确选项只能填写 `A`、`B`、`C` 或 `D`；题目重复、选项缺失和非法难度会阻止导入。缺少来源说明只产生警告，正式发布前应补齐。

## 测试

```powershell
npm test
npm run test:e2e
```

端到端测试会复用本地 3000 端口；没有运行服务时会调用 `scripts/start-local.ps1` 自动构建并启动。

## Supabase

1. 在 Supabase 项目中执行 `supabase/migrations/001_initial_schema.sql`。
2. 复制 `.env.example` 为 `.env.local`，填写 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。
3. 在 Supabase Auth 中配置邮箱验证和密码策略。
4. 将经过人工校审的 `lib/content.ts` 内容导入 `idioms` 与 `questions` 表。
5. 首个管理员注册后，由受信任管理员在数据库中执行：

```sql
update public.profiles set role = 'admin' where email = 'admin@example.com';
```

Supabase 模式启用后，认证、题库、错题、答题记录、训练场次、目标设置和词条收藏会使用服务端表；没有环境变量时自动回退到本地模式。管理员权限由 `profiles.role` 和 RLS 判断，不依赖邮箱字符串。

当前内容是常用成语的可追溯编辑稿，题目为原创语境题，不冒充官方真题；`reviewStatus` 和 `sourceRef` 保留人工校审入口。
