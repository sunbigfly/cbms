'use client'

import { useState, useEffect, useCallback } from 'react'
import { ColumnDef, RowSelectionState } from '@tanstack/react-table'
import { Breadcrumbs } from '@/components/features/Breadcrumbs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Loader2, Trash2, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Lock, Globe } from 'lucide-react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
    ToggleGroup,
    ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { useToast } from '@/hooks/use-toast'
import {
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    SortingState,
    ColumnFiltersState,
} from '@tanstack/react-table'

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
        CONSUME: 'outline',
        UPDATE: 'secondary',
    }

    const labels: Record<string, string> = {
        CREATE: '入库',
        CONSUME: '出库',
        UPDATE: '编辑',
    }

    return (
        <Badge variant={variants[action] || 'outline'} className="whitespace-nowrap">
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

// 操作类型过滤选项 - 只有入库、出库、编辑
const actionFilterOptions = [
    { label: '入库', value: 'CREATE' },
    { label: '出库', value: 'CONSUME' },
    { label: '编辑', value: 'UPDATE' },
]

export default function AuditPage() {
    const { toast } = useToast()
    const [loading, setLoading] = useState(true)
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
    const [totalCount, setTotalCount] = useState(0)
    const [isAdmin, setIsAdmin] = useState(false)
    const [libraryMode, setLibraryMode] = useState<'public' | 'private'>('public')
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)

    // 表格状态
    const [sorting, setSorting] = useState<SortingState>([])
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const [globalFilter, setGlobalFilter] = useState('')
    const [actionFilter, setActionFilter] = useState<string>('all')

    const fetchAuditLogs = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                limit: '0',
                libraryMode: libraryMode,
            })
            const res = await fetch(`/api/audit?${params}`)
            if (res.ok) {
                const data = await res.json()
                // 只过滤出入库、出库、编辑三种操作
                const filteredLogs = (data.logs || []).filter((log: AuditLog) =>
                    ['CREATE', 'CONSUME', 'UPDATE'].includes(log.action)
                )
                setAuditLogs(filteredLogs)
                setTotalCount(filteredLogs.length)
                setIsAdmin(data.isAdmin || false)
            }
        } catch (error) {
            console.error('Failed to fetch audit logs:', error)
        } finally {
            setLoading(false)
        }
    }, [isAdmin, libraryMode])

    useEffect(() => {
        fetchAuditLogs()
    }, [fetchAuditLogs])

    // 定义表格列
    const columns: ColumnDef<AuditLog>[] = [
        // 复选框列 - 只有管理员显示
        ...(isAdmin ? [{
            id: 'select',
            header: ({ table }: { table: ReturnType<typeof useReactTable<AuditLog>> }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && 'indeterminate')
                    }
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="全选"
                />
            ),
            cell: ({ row }: { row: { getIsSelected: () => boolean; toggleSelected: (value: boolean) => void; getCanSelect: () => boolean } }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="选择行"
                />
            ),
            enableSorting: false,
            enableHiding: false,
            size: 40,
        }] as ColumnDef<AuditLog>[] : []),
        {
            accessorKey: 'action',
            header: '操作',
            cell: ({ row }) => <ActionBadge action={row.getValue('action')} />,
            filterFn: (row, id, value) => {
                if (!value || value === 'all') return true
                return row.getValue(id) === value
            },
            size: 60,
        },
        {
            accessorKey: 'sample',
            header: '样本名称',
            cell: ({ row }) => (
                <span className="font-medium whitespace-nowrap">{row.getValue('sample')}</span>
            ),
            size: 120,
        },
        {
            accessorKey: 'user',
            header: '操作人',
            cell: ({ row }) => (
                <span className="whitespace-nowrap">{row.getValue('user')}</span>
            ),
            size: 70,
        },
        {
            accessorKey: 'timestamp',
            header: '时间',
            cell: ({ row }) => (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(row.getValue('timestamp'))}
                </span>
            ),
            size: 160,
        },
        {
            accessorKey: 'description',
            header: '描述',
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {row.getValue('description')}
                </span>
            ),
        },
    ]

    const table = useReactTable({
        data: auditLogs,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        onRowSelectionChange: setRowSelection,
        enableRowSelection: isAdmin,
        state: {
            sorting,
            columnFilters,
            globalFilter,
            rowSelection,
        },
        initialState: {
            pagination: {
                pageSize: 10,
            },
        },
    })

    // 处理操作类型过滤
    useEffect(() => {
        if (actionFilter === 'all') {
            table.getColumn('action')?.setFilterValue('')
        } else {
            table.getColumn('action')?.setFilterValue(actionFilter)
        }
    }, [actionFilter, table])

    // 获取选中的行
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const selectedIds = selectedRows.map(row => row.original.id)

    // 全选当前页
    const handleSelectAll = () => {
        table.toggleAllPageRowsSelected(true)
    }

    // 取消全选
    const handleDeselectAll = () => {
        table.toggleAllPageRowsSelected(false)
    }

    // 反选
    const handleInvertSelection = () => {
        const currentPageRows = table.getPaginationRowModel().rows
        currentPageRows.forEach(row => {
            row.toggleSelected(!row.getIsSelected())
        })
    }

    // 处理删除
    const handleDelete = async () => {
        if (selectedIds.length === 0) return

        setIsDeleting(true)
        try {
            const res = await fetch('/api/audit', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds }),
            })

            if (res.ok) {
                const result = await res.json()
                toast({
                    title: '删除成功',
                    description: result.message,
                })
                setRowSelection({})
                fetchAuditLogs()
            } else {
                const error = await res.json()
                toast({
                    title: '删除失败',
                    description: error.error || '请稍后重试',
                    variant: 'destructive',
                })
            }
        } catch (error) {
            console.error('Delete failed:', error)
            toast({
                title: '删除失败',
                description: '请稍后重试',
                variant: 'destructive',
            })
        } finally {
            setIsDeleting(false)
            setShowDeleteDialog(false)
        }
    }

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
        <div className="container mx-auto px-4 py-6 max-w-7xl">
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
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <CardTitle>操作日志</CardTitle>
                            <CardDescription>共 {totalCount} 条记录</CardDescription>
                        </div>
                        {/* 公共库/私有库切换按钮 - 所有用户可用 */}
                        <ToggleGroup
                            type="single"
                            value={libraryMode}
                            onValueChange={(value) => {
                                if (value) setLibraryMode(value as 'public' | 'private')
                            }}
                            className="border rounded-md"
                        >
                            <ToggleGroupItem value="public" aria-label="公共库" className="gap-1.5 px-3">
                                <Globe className="h-4 w-4" />
                                公共库
                            </ToggleGroupItem>
                            <ToggleGroupItem value="private" aria-label="私有库" className="gap-1.5 px-3">
                                <Lock className="h-4 w-4" />
                                私有库
                            </ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* 过滤器行 */}
                        <div className="flex flex-wrap items-center gap-4">
                            {/* 搜索输入 */}
                            <div className="relative flex-1 min-w-[200px] max-w-sm">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="搜索样本名称、用户或描述..."
                                    value={globalFilter}
                                    onChange={(e) => setGlobalFilter(e.target.value)}
                                    className="pl-9"
                                />
                            </div>

                            {/* 操作类型过滤 */}
                            <Select value={actionFilter} onValueChange={setActionFilter}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="全部操作" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">全部操作</SelectItem>
                                    {actionFilterOptions.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* 管理员：批量操作按钮 */}
                            {isAdmin && (
                                <div className="flex items-center gap-2 ml-auto">
                                    <Button variant="outline" size="sm" onClick={handleSelectAll}>
                                        全选
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={handleDeselectAll}>
                                        全不选
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={handleInvertSelection}>
                                        反选
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => setShowDeleteDialog(true)}
                                        disabled={selectedIds.length === 0 || isDeleting}
                                    >
                                        {isDeleting ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="mr-2 h-4 w-4" />
                                        )}
                                        删除 ({selectedIds.length})
                                    </Button>
                                </div>
                            )}

                            {/* 每页显示数量 */}
                            {!isAdmin && (
                                <div className="flex items-center gap-2 ml-auto">
                                    <span className="text-sm text-muted-foreground">每页显示</span>
                                    <Select
                                        value={`${table.getState().pagination.pageSize}`}
                                        onValueChange={(value) => table.setPageSize(Number(value))}
                                    >
                                        <SelectTrigger className="w-[70px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {[10, 20, 50, 100].map((pageSize) => (
                                                <SelectItem key={pageSize} value={`${pageSize}`}>
                                                    {pageSize}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <span className="text-sm text-muted-foreground">条</span>
                                </div>
                            )}
                        </div>

                        {/* 管理员：每页显示独立一行 */}
                        {isAdmin && (
                            <div className="flex items-center gap-2 justify-end">
                                <span className="text-sm text-muted-foreground">每页显示</span>
                                <Select
                                    value={`${table.getState().pagination.pageSize}`}
                                    onValueChange={(value) => table.setPageSize(Number(value))}
                                >
                                    <SelectTrigger className="w-[70px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[10, 20, 50, 100].map((pageSize) => (
                                            <SelectItem key={pageSize} value={`${pageSize}`}>
                                                {pageSize}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <span className="text-sm text-muted-foreground">条</span>
                            </div>
                        )}

                        {/* 表格 */}
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <TableRow key={headerGroup.id}>
                                            {headerGroup.headers.map((header) => {
                                                const size = header.column.columnDef.size
                                                return (
                                                    <TableHead
                                                        key={header.id}
                                                        style={size ? { width: size, minWidth: size } : undefined}
                                                    >
                                                        {header.isPlaceholder
                                                            ? null
                                                            : flexRender(
                                                                header.column.columnDef.header,
                                                                header.getContext()
                                                            )}
                                                    </TableHead>
                                                )
                                            })}
                                        </TableRow>
                                    ))}
                                </TableHeader>
                                <TableBody>
                                    {table.getRowModel().rows?.length ? (
                                        table.getRowModel().rows.map((row) => (
                                            <TableRow
                                                key={row.id}
                                                data-state={row.getIsSelected() && 'selected'}
                                            >
                                                {row.getVisibleCells().map((cell) => {
                                                    const size = cell.column.columnDef.size
                                                    return (
                                                        <TableCell
                                                            key={cell.id}
                                                            style={size ? { width: size, minWidth: size } : undefined}
                                                        >
                                                            {flexRender(
                                                                cell.column.columnDef.cell,
                                                                cell.getContext()
                                                            )}
                                                        </TableCell>
                                                    )
                                                })}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell
                                                colSpan={columns.length}
                                                className="h-24 text-center text-muted-foreground"
                                            >
                                                暂无数据
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* 分页 */}
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                共 {table.getFilteredRowModel().rows.length} 条记录，
                                第 {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1} 页
                                {isAdmin && selectedIds.length > 0 && (
                                    <span className="ml-2 text-primary">
                                        (已选中 {selectedIds.length} 条)
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => table.setPageIndex(0)}
                                    disabled={!table.getCanPreviousPage()}
                                >
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => table.previousPage()}
                                    disabled={!table.getCanPreviousPage()}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => table.nextPage()}
                                    disabled={!table.getCanNextPage()}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                                    disabled={!table.getCanNextPage()}
                                >
                                    <ChevronsRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 删除确认对话框 */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>
                            确定要删除选中的 {selectedIds.length} 条历史记录吗？此操作不可撤销。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            确认删除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
