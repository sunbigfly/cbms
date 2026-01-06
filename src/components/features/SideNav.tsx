'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import {
    LayoutDashboard,
    Database,
    History,
    BarChart3,
    Settings,
    FlaskConical,
    LogOut,
    PanelLeftClose,
    PanelLeftOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { useState, useCallback, useEffect } from 'react'

const SIDEBAR_COOKIE_NAME = 'sidebar_collapsed'
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

// 从 cookie 读取值（仅客户端使用）
function getCollapsedFromCookie(): boolean {
    if (typeof document === 'undefined') return false
    const match = document.cookie.match(new RegExp(`(^| )${SIDEBAR_COOKIE_NAME}=([^;]+)`))
    return match ? match[2] === 'true' : false
}

// 导航项配置，adminOnly 标记仅管理员可见
const navItems = [
    { href: '/', label: '首页', icon: LayoutDashboard, adminOnly: false },
    { href: '/inventory', label: '细胞库', icon: Database, adminOnly: false },
    { href: '/audit', label: '历史记录', icon: History, adminOnly: false },
    { href: '/reports', label: '报表', icon: BarChart3, adminOnly: false },
    { href: '/settings', label: '系统设置', icon: Settings, adminOnly: false },
]

export function SideNav() {
    const pathname = usePathname()
    const router = useRouter()
    const { data: session, status } = useSession()

    // 使用 cookie 持久化收起/展开状态
    // 初始值固定为 false 以避免 hydration 不匹配，mount 后从 cookie 读取
    const [collapsed, setCollapsedState] = useState(false)
    // 追踪是否已完成首次 mount，用于禁用初始过渡动画
    const [mounted, setMounted] = useState(false)

    // 客户端 mount 后从 cookie 读取真实状态
    useEffect(() => {
        const savedValue = getCollapsedFromCookie()
        setCollapsedState(savedValue)
        // 使用 requestAnimationFrame 确保状态更新后再启用动画
        requestAnimationFrame(() => {
            setMounted(true)
        })
    }, [])

    // 包装 setCollapsed 以同时更新 cookie
    const setCollapsed = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
        setCollapsedState((prev) => {
            const newValue = typeof value === 'function' ? value(prev) : value
            document.cookie = `${SIDEBAR_COOKIE_NAME}=${newValue}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
            return newValue
        })
    }, [])

    // 判断是否是管理员
    const isAdmin = session?.user?.role === 'ADMIN'

    // 过滤导航项：非管理员隐藏 adminOnly 项
    const visibleNavItems = navItems.filter(item => !item.adminOnly || isAdmin)

    const handleSignOut = async () => {
        await signOut({ redirect: false })
        router.push('/login')
    }

    // 获取用户显示名称
    const userName = session?.user?.name || '用户'
    const userInitial = userName[0].toUpperCase()

    return (
        <TooltipProvider delayDuration={0}>
            <aside
                className={cn(
                    'sticky top-0 h-screen flex flex-col border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
                    mounted && 'transition-all duration-300',
                    collapsed ? 'w-16' : 'w-42'
                )}
            >
                {/* Logo */}
                <div className={cn(
                    'flex items-center h-14 border-b px-3 overflow-hidden',
                    collapsed ? 'justify-center' : ''
                )}>
                    <FlaskConical className="h-6 w-6 text-primary flex-shrink-0" />
                    <span className={cn(
                        "font-semibold text-lg whitespace-nowrap",
                        mounted && "transition-all duration-300",
                        collapsed ? "w-0 opacity-0 ml-0" : "w-auto opacity-100 ml-2"
                    )}>
                        CBMS
                    </span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
                    {visibleNavItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href ||
                            (item.href !== '/' && pathname.startsWith(item.href))

                        const linkContent = (
                            <Link
                                href={item.href}
                                className={cn(
                                    'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors overflow-hidden',
                                    isActive
                                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                                    collapsed && 'justify-center px-2'
                                )}
                            >
                                <Icon className="h-5 w-5 flex-shrink-0" />
                                <span className={cn(
                                    'whitespace-nowrap',
                                    mounted && 'transition-all duration-300',
                                    collapsed ? 'w-0 opacity-0 ml-0' : 'w-auto opacity-100 ml-3'
                                )}>
                                    {item.label}
                                </span>
                            </Link>
                        )

                        if (collapsed) {
                            return (
                                <Tooltip key={item.href}>
                                    <TooltipTrigger asChild>
                                        {linkContent}
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                        {item.label}
                                    </TooltipContent>
                                </Tooltip>
                            )
                        }

                        return <div key={item.href}>{linkContent}</div>
                    })}
                </nav>

                {/* Bottom Section: User & Collapse */}
                {/* Bottom Section: User & Collapse */}
                <div className="border-t p-2 space-y-1">
                    {/* User Info & Logout Unified */}
                    {status === 'authenticated' && (
                        <div className={cn(
                            'flex items-center rounded-md transition-colors',
                            collapsed ? 'flex-col gap-2 justify-center py-2' : 'justify-between px-2 py-2 hover:bg-accent/50'
                        )}>
                            <div className={cn(
                                "flex items-center min-w-0 transition-all",
                                collapsed ? "justify-center gap-0" : "flex-1 gap-3"
                            )}>
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium flex-shrink-0">
                                    {userInitial}
                                </div>
                                <div className={cn(
                                    "flex flex-col min-w-0",
                                    mounted && "transition-all duration-300",
                                    collapsed ? "w-0 opacity-0 overflow-hidden" : "w-auto opacity-100"
                                )}>
                                    <p className="text-sm font-medium truncate leading-none">{userName}</p>
                                    {isAdmin && (
                                        <p className="text-[10px] text-muted-foreground mt-1">管理员</p>
                                    )}
                                </div>
                            </div>

                            {/* Logout Action */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            "text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 flex-shrink-0",
                                            !collapsed && "ml-2"
                                        )}
                                        onClick={handleSignOut}
                                    >
                                        <LogOut className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right">退出登录</TooltipContent>
                            </Tooltip>
                        </div>
                    )}

                    {/* Login Button (when not authenticated) */}
                    {status !== 'authenticated' && (
                        <Button variant="outline" size="sm" className="w-full" asChild>
                            <Link href="/login">
                                {collapsed ? '登录' : '登录系统'}
                            </Link>
                        </Button>
                    )}

                    <div className="h-px bg-border/50 my-1 mx-2" />

                    {/* Collapse Toggle */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn('w-full', collapsed ? 'justify-center px-0 gap-0' : 'justify-start px-2')}
                        onClick={() => setCollapsed(!collapsed)}
                    >
                        {collapsed ? (
                            <PanelLeftOpen className="h-4 w-4 text-muted-foreground transition-transform duration-300 flex-shrink-0" />
                        ) : (
                            <PanelLeftClose className="h-4 w-4 text-muted-foreground transition-transform duration-300 flex-shrink-0" />
                        )}
                        <span className={cn(
                            "text-muted-foreground whitespace-nowrap overflow-hidden",
                            mounted && "transition-all duration-300",
                            collapsed ? "w-0 opacity-0 ml-0" : "w-auto opacity-100 ml-2"
                        )}>
                            收起导航
                        </span>
                    </Button>
                </div>
            </aside>
        </TooltipProvider>
    )
}
