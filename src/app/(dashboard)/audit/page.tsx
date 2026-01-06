'use client'

import { useState, useEffect } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Breadcrumbs } from '@/components/features/Breadcrumbs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { Loader2 } from 'lucide-react'

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

// 定义表格列
const columns: ColumnDef<AuditLog>[] = [
    {
        accessorKey: 'action',
        header: '操作',
        cell: ({ row }) => <ActionBadge action={row.getValue('action')} />,
        filterFn: (row, id, value) => {
            if (!value) return true
            return row.getValue(id) === value
        },
    },
    {
        accessorKey: 'sample',
        header: '样本名称',
        cell: ({ row }) => (
            <span className="font-medium">{row.getValue('sample')}</span>
        ),
    },
    {
        accessorKey: 'user',
        header: '操作人',
    },
    {
        accessorKey: 'timestamp',
        header: '时间',
        cell: ({ row }) => (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatTimestamp(row.getValue('timestamp'))}
            </span>
        ),
    },
    {
        accessorKey: 'description',
        header: '描述',
        cell: ({ row }) => (
            <span className="text-sm text-muted-foreground line-clamp-2">
                {row.getValue('description')}
            </span>
        ),
    },
]

// 操作类型过滤选项
const actionFilterOptions = [
    { label: '入库', value: 'CREATE' },
    { label: '出库', value: 'CONSUME' },
    { label: '更新', value: 'UPDATE' },
    { label: '移动', value: 'MOVE' },
    { label: '销毁', value: 'DESTROY' },
]

export default function AuditPage() {
    const [loading, setLoading] = useState(true)
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])

    useEffect(() => {
        async function fetchAuditLogs() {
            try {
                const res = await fetch('/api/audit')
                if (res.ok) {
                    const data = await res.json()
                    setAuditLogs(data.logs || [])
                }
            } catch (error) {
                console.error('Failed to fetch audit logs:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchAuditLogs()
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>加载中...</span>
                </div>
            </div>
        )
    }

    return (
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
            </div>

            {/* Data Table */}
            <Card>
                <CardHeader>
                    <CardTitle>操作日志</CardTitle>
                    <CardDescription>共 {auditLogs.length} 条记录</CardDescription>
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={columns}
                        data={auditLogs}
                        searchPlaceholder="搜索样本名称、用户或描述..."
                        filterOptions={[
                            {
                                column: 'action',
                                label: '操作',
                                options: actionFilterOptions,
                            },
                        ]}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
