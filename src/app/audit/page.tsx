'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/features/AppLayout'
import { Breadcrumbs } from '@/components/features/Breadcrumbs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Search, Filter, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AuditLog {
    id: string
    action: string
    sample: string
    user: string
    description: string
    timestamp: string
}

function ActionBadge({ action }: { action: string }) {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
        CREATE: 'default',
        MOVE: 'secondary',
        CONSUME: 'outline',
        UPDATE: 'secondary',
        DESTROY: 'destructive',
    }

    const labels: Record<string, string> = {
        CREATE: '入库',
        MOVE: '移动',
        CONSUME: '出库',
        UPDATE: '更新',
        DESTROY: '销毁',
    }

    return (
        <Badge variant={variants[action] || 'outline'}>
            {labels[action] || action}
        </Badge>
    )
}

function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    })
}

export default function AuditPage() {
    const [loading, setLoading] = useState(true)
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
    const [total, setTotal] = useState(0)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        async function fetchAuditLogs() {
            try {
                const params = new URLSearchParams()
                if (searchQuery) params.set('search', searchQuery)

                const res = await fetch(`/api/audit?${params.toString()}`)
                if (res.ok) {
                    const data = await res.json()
                    setAuditLogs(data.logs || [])
                    setTotal(data.total || 0)
                }
            } catch (error) {
                console.error('Failed to fetch audit logs:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchAuditLogs()
    }, [searchQuery])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
    }

    if (loading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span>加载中...</span>
                    </div>
                </div>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <div className="container mx-auto px-4 py-6">
                <div className="mb-6">
                    <Breadcrumbs />
                </div>

                {/* Page Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">历史记录</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            查看所有样本操作的审计日志
                        </p>
                    </div>
                    <Button variant="outline" size="sm">
                        <Filter className="mr-2 h-4 w-4" />
                        筛选
                    </Button>
                </div>

                {/* Search and Filters */}
                <Card className="mb-6">
                    <CardContent className="pt-4">
                        <form onSubmit={handleSearch} className="flex gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="搜索样本名称、用户或描述..."
                                    className="pl-9"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Audit Log Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>操作日志</CardTitle>
                        <CardDescription>共 {total} 条记录</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {auditLogs.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                暂无审计日志
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-20">操作</TableHead>
                                        <TableHead>样本名称</TableHead>
                                        <TableHead className="hidden sm:table-cell">操作人</TableHead>
                                        <TableHead>时间</TableHead>
                                        <TableHead className="hidden lg:table-cell">描述</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {auditLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>
                                                <ActionBadge action={log.action} />
                                            </TableCell>
                                            <TableCell className="font-medium">{log.sample}</TableCell>
                                            <TableCell className="hidden sm:table-cell">{log.user}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {formatTimestamp(log.timestamp)}
                                            </TableCell>
                                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                                                {log.description}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    )
}
