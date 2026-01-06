# CBMS - 细胞库管理系统

**Cell Bank Management System** - 现代化细胞样本存储库管理解决方案

基于 Next.js 15 构建的全栈 Web 应用，用于管理细胞样本的入库、出库、位置追踪和审计记录。

---

## ✨ 功能特性

- **📦 库存管理** - 多级存储结构（设施 → 架子 → 抽屉 → 盒子 → 槽位）
- **🔬 样本追踪** - 完整的样本信息管理，支持批量入库/出库
- **📊 仪表盘** - 实时统计数据可视化
- **📝 审计日志** - 全面的操作历史记录
- **🔐 权限管理** - 基于角色的访问控制 (管理员/技术员)
- **🏠 公私库分离** - 支持公共库和个人私有库
- **📥 数据导入导出** - CSV 批量导入/导出功能
- **⚡ 性能优化** - Redis 缓存支持（可选）

---

## 🛠 技术栈

| 分类 | 技术 |
|------|------|
| **框架** | [Next.js 15](https://nextjs.org/) (App Router) |
| **语言** | TypeScript |
| **数据库** | PostgreSQL + [Prisma ORM](https://www.prisma.io/) |
| **缓存** | [Redis](https://redis.io/) (可选) |
| **认证** | [NextAuth.js](https://next-auth.js.org/) |
| **UI 组件** | [Radix UI](https://www.radix-ui.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| **样式** | [Tailwind CSS](https://tailwindcss.com/) |
| **表单验证** | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |

---

## 📋 系统要求

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0 (推荐) 或 npm
- **PostgreSQL** >= 14.0
- **Redis** >= 6.0 (可选，用于缓存)

---

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd cbms
```

### 2. 安装依赖

```bash
pnpm install
# 或使用 npm
npm install
```

### 3. 配置环境变量

复制环境变量模板并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填写实际配置值（详见下方 [环境变量配置](#-环境变量配置)）

### 4. 初始化数据库

```bash
# 同步数据库 schema
pnpm db:push

# 生成 Prisma Client
pnpm db:generate

# (可选) 填充初始数据
pnpm db:seed
```

### 5. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000 打开应用

---

## 🔧 环境变量配置

所有配置均通过环境变量管理。以下是完整的配置项：

### 必需配置

| 变量 | 说明 | 示例值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql://user:password@localhost:5432/cbms?schema=public` |
| `NEXTAUTH_URL` | 应用 URL | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | 认证密钥 (>=32字符) | 使用 `openssl rand -base64 32` 生成 |

### 可选配置

| 变量 | 说明 | 示例值 |
|------|------|--------|
| `REDIS_URL` | Redis 连接字符串 | `redis://localhost:6379` |
| `GOOGLE_CLIENT_ID` | Google OAuth 客户端 ID | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 密钥 | - |
| `GITHUB_ID` | GitHub OAuth 应用 ID | - |
| `GITHUB_SECRET` | GitHub OAuth 密钥 | - |

> **💡 提示**: 若不配置 Redis，系统将在无缓存模式下运行，核心功能不受影响，仅影响部分接口的响应速度。

---

## 📜 可用命令

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm start` | 启动生产服务器 |
| `pnpm lint` | 运行 ESLint 检查 |
| `pnpm db:push` | 同步 Prisma schema 到数据库 |
| `pnpm db:generate` | 生成 Prisma Client |
| `pnpm db:studio` | 打开 Prisma Studio 数据管理界面 |
| `pnpm db:seed` | 填充初始/测试数据 |
| `pnpm db:reset` | 重置数据库并重新填充数据 |

---

## 📁 项目结构

```
cbms/
├── prisma/                 # Prisma 配置与迁移
│   ├── schema.prisma       # 数据库模型定义
│   └── seed.ts             # 数据库种子脚本
├── public/                 # 静态资源
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── (dashboard)/    # 仪表盘路由组
│   │   ├── api/            # API 路由
│   │   └── login/          # 登录页面
│   ├── components/
│   │   ├── features/       # 业务功能组件
│   │   └── ui/             # 通用 UI 组件 (shadcn)
│   ├── hooks/              # 自定义 React Hooks
│   ├── lib/                # 工具库
│   │   ├── auth.ts         # NextAuth 配置
│   │   ├── cache.ts        # 缓存工具
│   │   ├── prisma.ts       # Prisma 客户端
│   │   ├── redis.ts        # Redis 客户端
│   │   └── utils.ts        # 通用工具函数
│   ├── server/             # 服务端代码
│   │   └── db/             # 数据访问层
│   └── types/              # TypeScript 类型定义
├── .env.example            # 环境变量模板
├── next.config.ts          # Next.js 配置
├── tailwind.config.ts      # Tailwind CSS 配置
└── tsconfig.json           # TypeScript 配置
```

---

## 🗄 数据模型

系统使用层级结构管理存储位置：

```
StorageFacility (存储设施)
└── Rack (架子)
    └── Shelf (抽屉/层)
        └── Box (盒子)
            └── Slot (槽位) ─── Sample (样本)
```

主要数据模型：

- **User** - 用户账户与认证
- **StorageFacility** - 存储设施（冰箱、液氮罐等）
- **Rack / Shelf / Box / Slot** - 存储层级结构
- **Sample** - 细胞样本信息
- **AuditLog** - 操作审计日志
- **SystemPreset** - 系统预设选项

---

## 🔐 默认账户

初始化数据库后，可使用以下账户登录：

| 工号 | 密码 | 角色 |
|------|------|------|
| `admin` | `724287349` | 管理员 |

> ⚠️ **生产环境请务必修改默认密码！**

---

## 📄 许可证

本项目仅供内部使用。

---

## 🤝 贡献

如有问题或建议，请联系项目维护者。
