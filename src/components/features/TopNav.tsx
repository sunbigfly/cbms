'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    Database,
    History,
    BarChart3,
    Settings,
    Search,
    FlaskConical,
    User,
    LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const navItems = [
    { href: '/', label: '首页', icon: LayoutDashboard },
    { href: '/inventory', label: '细胞数据详情', icon: Database },
    { href: '/audit', label: '历史记录', icon: History },
    { href: '/reports', label: '报表', icon: BarChart3 },
    { href: '/settings', label: '系统设置', icon: Settings },
]

export function TopNav() {
    const pathname = usePathname()

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center px-4 gap-4">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 font-semibold">
                    <FlaskConical className="h-6 w-6 text-primary" />
                    <span className="hidden md:inline-block text-lg">CBMS</span>
                </Link>

                {/* Main Navigation */}
                <nav className="flex items-center gap-1 ml-4">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href ||
                            (item.href !== '/' && pathname.startsWith(item.href))

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                                    'hover:bg-accent hover:text-accent-foreground',
                                    isActive
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground'
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                <span className="hidden lg:inline-block">{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Global Search */}
                <div className="relative w-64 hidden md:block">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="搜索样本 (Ctrl+K)"
                        className="pl-8 h-9"
                    />
                </div>

                {/* User Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                                A
                            </div>
                            <span className="hidden lg:inline-block text-sm">Admin</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>我的账户</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <User className="mr-2 h-4 w-4" />
                            个人资料
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/settings">
                                <Settings className="mr-2 h-4 w-4" />
                                系统设置
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                            <LogOut className="mr-2 h-4 w-4" />
                            退出登录
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}

