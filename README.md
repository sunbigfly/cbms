# Large Project Template

> **适用场景**: 大型 SaaS 应用 | 复杂业务系统 | 企业级应用（50+ 页面）

**技术栈版本**: Next.js 15 + React 19 + TypeScript 5 + Prisma 6 + NextAuth 4 + shadcn/ui

---

## 🎯 核心原则

### 1. AI 友好性优先
- ✅ 选择 AI 训练数据最丰富的技术（如 NextAuth v4 而非 v5 beta）
- ✅ 使用标准化的 API 模式（REST > tRPC）
- ✅ 避免频繁变化的 beta 版本

### 2. 简洁性优先
- ✅ 能用标准方案就不用第三方库（React Context > Zustand）
- ✅ 避免过度抽象（直接用 console.log，不需要自定义 logger）
- ✅ 最少代码完成功能

### 3. 稳定性优先
- ✅ 使用稳定版本，避免 beta/canary
- ✅ 选择成熟的技术栈
- ✅ 等待 AI 训练数据充足后再采用新特性

### 4. 分层灵活
- ✅ 完整的组件分层（ui/ + features/）
- ✅ 路由组织（路由组）
- ✅ 可扩展的架构

---

## 📦 依赖清单（15-20 个）

**全部依赖（核心 + 推荐 + 可选）**

```json
{
  "dependencies": {
    "next": "^15.1.8",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "tailwindcss": "^3.4.0",
    "@prisma/client": "^6.19.0",
    "next-auth": "^4.24.0",
    "@next-auth/prisma-adapter": "^1.0.7",
    "react-hook-form": "^7.54.0",
    "@hookform/resolvers": "^3.9.0",
    "zod": "^3.24.0",
    "clsx": "^2.1.0",
    "bcryptjs": "^2.4.3",
    "tailwind-merge": "^2.2.0",
    "lucide-react": "^0.263.1",
    "class-variance-authority": "^0.7.0"
  },
  "devDependencies": {
    "typescript": "^5.9.2",
    "@types/node": "^22.10.5",
    "@types/react": "^19.0.6",
    "@types/react-dom": "^19.0.2",
    "@types/bcryptjs": "^2.4.6",
    "prisma": "^6.19.0"
  }
}
```

**官方文档链接**:
- [Next.js](https://nextjs.org/docs)
- [React](https://react.dev)
- [TypeScript](https://www.typescriptlang.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Radix UI](https://www.radix-ui.com)
- [Prisma](https://www.prisma.io/docs)
- [NextAuth.js](https://next-auth.js.org)
- [React Hook Form](https://react-hook-form.com)
- [Zod](https://zod.dev)
- [lucide-react](https://lucide.dev)

**选型理由**:
- **Prisma**: AI 训练数据最丰富的 ORM，错误率 ~5%
- **NextAuth v4**: 稳定版，AI 错误率 ~5-10%（v5 beta 错误率 ~30-40%）
- **React Hook Form + Zod**: 行业标准，AI 训练数据极其丰富
- **shadcn/ui**: 代码在项目中，AI 可完全理解和修改，完全控制
- **tailwind-merge**: 智能合并 Tailwind 类名，避免冲突
- **lucide-react**: 现代图标库，shadcn/ui 默认使用
- **class-variance-authority**: 类型安全的组件变体系统

---

## 🏗️ 项目结构（完整分层）

```
large-project/
├── src/
│   ├── app/               # Next.js App Router
│   │   ├── (auth)/       # 路由组（认证相关页面）
│   │   ├── api/          # API Routes
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts
│   │   ├── layout.tsx    # 根布局
│   │   ├── page.tsx      # 首页
│   │   └── globals.css   # 全局样式（含 shadcn/ui CSS 变量）
│   ├── components/        # React 组件
│   │   ├── ui/           # shadcn/ui 组件（自动生成）
│   │   └── features/     # 业务组件
│   └── lib/              # 工具函数
│       ├── prisma.ts    # Prisma 客户端
│       ├── auth.ts      # NextAuth 配置
│       └── utils.ts     # 通用工具（cn 函数）
├── prisma/
│   └── schema.prisma    # 数据库 Schema
├── public/              # 静态资源
├── components.json      # shadcn/ui 配置
├── .env.example         # 环境变量示例
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
└── postcss.config.js
```

**shadcn/ui 组件目录说明**:
- `components/ui/` - shadcn/ui 组件会自动安装到这里
- 每个组件都是独立的 `.tsx` 文件，可以自由修改
- 示例: `button.tsx`, `form.tsx`, `dialog.tsx`, `input.tsx` 等

---

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
# 或
pnpm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-min-32-characters"
```

### 3. 初始化数据库

```bash
# 同步数据库 schema
npm run db:push

# 或使用 migration（推荐生产环境）
npx prisma migrate dev --name init
```

### 4. 初始化并安装 shadcn/ui 组件

```bash
# 初始化 shadcn/ui（只需执行一次）
npx shadcn@latest init

# 添加常用组件（使用稳定版）
npx shadcn@latest add button
npx shadcn@latest add form
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add toast
npx shadcn@latest add table
npx shadcn@latest add select
npx shadcn@latest add textarea
npx shadcn@latest add checkbox
npx shadcn@latest add radio-group
npx shadcn@latest add switch
npx shadcn@latest add alert
npx shadcn@latest add badge
npx shadcn@latest add avatar
npx shadcn@latest add separator
npx shadcn@latest add tabs
npx shadcn@latest add accordion
```

**注意**: 始终使用 `shadcn@latest`（稳定版），不要使用 `shadcn@canary`

### 5. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看结果。

### 6. 查看数据库（可选）

```bash
npm run db:studio
```

---

## 📝 核心技术规范

### shadcn/ui 使用（必须使用）

**重要**: 本项目**必须使用 shadcn/ui** 作为 UI 组件库。

**为什么选择 shadcn/ui？**
- ✅ **AI 友好性最佳**: 组件代码直接复制到项目中，AI 可以完全理解和修改，训练数据极其丰富
- ✅ **稳定版本**: 使用 `shadcn@latest`（稳定版），避免 canary/beta 版本
- ✅ **完全控制**: 代码在你的项目中，可以自由定制
- ✅ **类型安全**: 完整的 TypeScript 支持
- ✅ **无依赖锁定**: 不是 npm 包，而是代码片段
- ✅ **Tailwind 原生**: 使用 Tailwind CSS，与技术栈完美契合
- ✅ **可访问性**: 基于 Radix UI，符合 WAI-ARIA 标准

**版本说明**:
- ✅ 使用 `npx shadcn@latest` 安装组件（稳定版）
- ❌ 不要使用 `shadcn@canary` 或其他 beta 版本
- ✅ AI 对稳定版本的训练数据最丰富，错误率最低

**基础组件使用**:

```tsx
import { Button } from '@/components/ui/button'

export function MyComponent() {
  return (
    <div className="space-y-4">
      <Button>Default</Button>
      <Button variant="destructive">Delete</Button>
      <Button variant="outline">Cancel</Button>
      <Button variant="ghost">Ghost</Button>
      <Button size="sm">Small</Button>
      <Button size="lg">Large</Button>
    </div>
  )
}
```

**表单组件使用**:

```tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

const formSchema = z.object({
  username: z.string().min(2, '用户名至少2个字符'),
  email: z.string().email('邮箱格式不正确'),
})

export function ProfileForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      email: '',
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>用户名</FormLabel>
              <FormControl>
                <Input placeholder="请输入用户名" {...field} />
              </FormControl>
              <FormDescription>这是你的公开显示名称</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>邮箱</FormLabel>
              <FormControl>
                <Input type="email" placeholder="请输入邮箱" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">提交</Button>
      </form>
    </Form>
  )
}
```

---

### Prisma 最佳实践

参考 `prisma/schema.prisma`，已包含：
- ✅ User 模型（用户表）
- ✅ Account 模型（OAuth 账户）
- ✅ Session 模型（会话管理）
- ✅ Post 模型（示例业务模型）

**使用示例**:

```tsx
// Server Component 中使用
import { prisma } from '@/lib/prisma'

async function getUsers() {
  return await prisma.user.findMany()
}

// API Route 中使用
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const users = await prisma.user.findMany()
  return NextResponse.json(users)
}
```

---

### NextAuth v4 配置

已配置在 `src/lib/auth.ts`，包含：
- ✅ Prisma Adapter（数据库集成）
- ✅ JWT 策略（无状态会话）
- ✅ Credentials Provider（邮箱密码登录）
- ✅ 密码加密（bcryptjs）

**使用示例**:

```tsx
// Server Component 中获取会话
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function Page() {
  const session = await getServerSession(authOptions)

  if (!session) {
    return <div>Please sign in</div>
  }

  return <div>Welcome {session.user?.name}</div>
}
```

---

## 🤖 AI 提示词模板

### 开始新功能时

```
我正在使用以下技术栈开发 Next.js 项目：

核心技术：
- Next.js 15.1.8 (App Router, Server Components)
- React 19.2.0
- TypeScript 5.9.2 (strict mode)
- Tailwind CSS 3.4.0

UI 组件库：
- shadcn/ui (latest stable version) - 必须使用
- 基于 Radix UI + Tailwind CSS

数据层：
- Prisma 6.19.0 (PostgreSQL)
- NextAuth 4.24.0 (认证)

表单验证：
- React Hook Form 7.54.0 + Zod 3.24.0
- shadcn/ui Form 组件（集成 React Hook Form）

请遵循以下原则：
1. 优先使用 Server Components（除非需要交互）
2. UI 组件必须使用 shadcn/ui（不要手写基础组件）
3. 表单使用 shadcn/ui Form + React Hook Form + Zod
4. 使用 Route Handlers 处理 API
5. 使用 Prisma 操作数据库
6. 样式使用 Tailwind CSS utility classes
7. 代码简洁，避免过度抽象
8. 始终使用 shadcn@latest（稳定版），不使用 canary/beta

现在请帮我 [具体任务]
```

---

## 💡 实用示例

### 使用 shadcn/ui 创建复杂表单

```tsx
// src/components/features/CreatePostForm.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const postSchema = z.object({
  title: z.string().min(5, '标题至少5个字符'),
  content: z.string().min(20, '内容至少20个字符'),
  category: z.enum(['tech', 'business', 'lifestyle']),
  published: z.boolean().default(false),
})

type PostFormData = z.infer<typeof postSchema>

export function CreatePostForm() {
  const form = useForm<PostFormData>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      title: '',
      content: '',
      published: false,
    },
  })

  const onSubmit = async (data: PostFormData) => {
    const response = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (response.ok) {
      form.reset()
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>标题</FormLabel>
              <FormControl>
                <Input placeholder="输入文章标题" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>分类</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="tech">技术</SelectItem>
                  <SelectItem value="business">商业</SelectItem>
                  <SelectItem value="lifestyle">生活</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>内容</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="输入文章内容"
                  className="min-h-[200px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>支持 Markdown 格式</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">发布文章</Button>
      </form>
    </Form>
  )
}
```

### 使用 Dialog 组件

```tsx
// src/components/features/DeleteConfirmDialog.tsx
'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

interface DeleteConfirmDialogProps {
  onConfirm: () => void
  itemName: string
}

export function DeleteConfirmDialog({ onConfirm, itemName }: DeleteConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">删除</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除？</AlertDialogTitle>
          <AlertDialogDescription>
            你确定要删除 "{itemName}" 吗？此操作无法撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>确认删除</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### 使用 Toast 通知

```tsx
// src/components/features/ToastExample.tsx
'use client'

import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

export function ToastExample() {
  const { toast } = useToast()

  return (
    <Button
      onClick={() => {
        toast({
          title: '操作成功',
          description: '你的更改已保存',
        })
      }}
    >
      显示通知
    </Button>
  )
}
```

### 创建自定义 UI 组件

```tsx
// src/components/ui/loading-spinner.tsx
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600',
        sizeClasses[size],
        className
      )}
    />
  )
}
```

---

## 📚 常见问题

### Q: 如何添加新的 shadcn/ui 组件？
**A**: 使用 shadcn CLI（稳定版）：
```bash
# 添加单个组件
npx shadcn@latest add [component-name]

# 例如：
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add toast
npx shadcn@latest add select

# 一次添加多个组件
npx shadcn@latest add button card input form
```

查看所有可用组件：
```bash
npx shadcn@latest add
```

**重要**: 始终使用 `shadcn@latest`（稳定版），不要使用 `shadcn@canary`

### Q: shadcn/ui vs Material-UI / Ant Design？
**A**:
- **shadcn/ui**: 代码在你的项目中，AI 友好度最高，完全可定制
- **Material-UI / Ant Design**: npm 包，AI 只能调用 API，定制困难，包体积大

对于 AI 辅助开发，shadcn/ui 是最佳选择。

### Q: 如何自定义 shadcn/ui 组件？
**A**: 直接编辑 `src/components/ui/` 中的组件文件，它们就是普通的 React 组件。

例如修改 Button 的默认样式：
```tsx
// src/components/ui/button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-blue-600 text-white hover:bg-blue-700", // 修改这里
        // ... 其他变体
      },
    },
  }
)
```

### Q: 如何切换主题（深色模式）？
**A**: shadcn/ui 已配置 CSS 变量支持主题切换。使用 `next-themes`：
```bash
npm install next-themes
```

```tsx
// src/app/layout.tsx
import { ThemeProvider } from 'next-themes'

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### Q: 如何组织大型项目的组件？
**A**: 推荐分层：
```
src/components/
├── ui/              # shadcn/ui 基础组件
├── features/        # 业务功能组件
│   ├── auth/       # 认证相关
│   ├── posts/      # 文章相关
│   └── users/      # 用户相关
└── layouts/         # 布局组件
```

### Q: 如何添加 OAuth 登录（Google/GitHub）？
**A**: 在 `src/lib/auth.ts` 的 `providers` 数组中添加：
```ts
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'

providers: [
  GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  }),
  GitHubProvider({
    clientId: process.env.GITHUB_ID!,
    clientSecret: process.env.GITHUB_SECRET!,
  }),
  // ... 其他 providers
]
```

### Q: 如何优化大型项目的性能？
**A**:
1. **代码分割**: 使用动态导入
```tsx
import dynamic from 'next/dynamic'

const HeavyComponent = dynamic(() => import('@/components/HeavyComponent'), {
  loading: () => <LoadingSpinner />,
})
```

2. **图片优化**: 使用 Next.js Image 组件
```tsx
import Image from 'next/image'

<Image
  src="/image.jpg"
  alt="Description"
  width={800}
  height={600}
  priority // 首屏图片
/>
```

3. **数据库查询优化**: 使用 Prisma 的 select 和 include
```tsx
const users = await prisma.user.findMany({
  select: { id: true, name: true, email: true }, // 只查询需要的字段
})
```

### Q: 如何部署到 Vercel？
**A**:
```bash
# 1. 确保数据库可从外部访问
# 2. 在 Vercel 中设置环境变量
# 3. 部署
vercel

# 4. 运行数据库迁移
npx prisma migrate deploy
```

---

## 📖 学习资源

- [Next.js 官方教程](https://nextjs.org/learn)
- [shadcn/ui 文档](https://ui.shadcn.com)
- [Radix UI 文档](https://www.radix-ui.com/docs/primitives/overview/introduction)
- [Prisma 文档](https://www.prisma.io/docs)
- [NextAuth.js 文档](https://next-auth.js.org/getting-started/introduction)
- [React Hook Form 文档](https://react-hook-form.com/get-started)
- [Zod 文档](https://zod.dev)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)

---

## 🎨 设计系统

本模板使用 shadcn/ui 的设计系统，基于 CSS 变量实现主题化。

### 颜色系统

在 `src/app/globals.css` 中定义：
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  /* ... 更多颜色 */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... 深色模式颜色 */
}
```

### 间距系统

使用 Tailwind CSS 的间距系统：
- `p-4` = 1rem (16px)
- `m-8` = 2rem (32px)
- `space-y-4` = 子元素垂直间距 1rem

### 字体系统

- `text-sm` = 0.875rem (14px)
- `text-base` = 1rem (16px)
- `text-lg` = 1.125rem (18px)
- `text-xl` = 1.25rem (20px)
- `text-2xl` = 1.5rem (24px)

---

**最后更新**: 2025-01-07
**模板版本**: v1.0

