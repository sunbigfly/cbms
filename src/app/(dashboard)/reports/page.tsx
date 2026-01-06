'use client'

import { useState, useEffect } from 'react'
import { Breadcrumbs } from '@/components/features/Breadcrumbs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Upload, BarChart3, PieChart, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { CSVImportDialog } from '@/components/features/CSVImportDialog'

interface FacilityCapacity {
    id: string
    name: string
    capacity: number
}

interface MonthlyStats {
    create: number
    consume: number
    edit: number
}

export default function ReportsPage() {
    const { toast } = useToast()
    const [isExporting, setIsExporting] = useState(false)
    const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false)
    const [loading, setLoading] = useState(true)
    const [facilities, setFacilities] = useState<FacilityCapacity[]>([])
    const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({ create: 0, consume: 0, edit: 0 })

    useEffect(() => {
        async function fetchData() {
            try {
                // Fetch facilities
                const facilitiesRes = await fetch('/api/facilities')
                if (facilitiesRes.ok) {
                    const facilitiesData = await facilitiesRes.json()
                    // Get stats for each facility
                    const statsRes = await fetch('/api/stats')
                    if (statsRes.ok) {
                        const statsData = await statsRes.json()
                        setFacilities(statsData.facilities?.map((f: { id: string; name: string; capacity: number }) => ({
                            id: f.id,
                            name: f.name,
                            capacity: f.capacity,
                        })) || [])
                    }
                }

                // Fetch monthly stats from audit logs
                const now = new Date()
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
                const auditRes = await fetch('/api/audit?limit=1000')
                if (auditRes.ok) {
                    const auditData = await auditRes.json()
                    const logs = auditData.logs || []
                    const thisMonthLogs = logs.filter((log: { timestamp: string }) =>
                        new Date(log.timestamp) >= startOfMonth
                    )

                    setMonthlyStats({
                        create: thisMonthLogs.filter((l: { action: string }) => l.action === 'CREATE').length,
                        consume: thisMonthLogs.filter((l: { action: string }) => l.action === 'CONSUME').length,
                        edit: thisMonthLogs.filter((l: { action: string }) => l.action === 'UPDATE').length,
                    })
                }
            } catch (error) {
                console.error('Failed to fetch reports data:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const handleExport = async () => {
        setIsExporting(true)
        try {
            const response = await fetch('/api/csv/export')
            if (!response.ok) {
                throw new Error('导出失败')
            }

            // Get the filename from Content-Disposition header or use default
            const contentDisposition = response.headers.get('Content-Disposition')
            const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
            const filename = filenameMatch?.[1] || 'cbms_export.csv'

            // Download the file
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)

            toast({
                title: '导出成功',
                description: `已下载 ${filename}`,
            })
        } catch {
            toast({
                title: '导出失败',
                description: '请稍后重试',
                variant: 'destructive',
            })
        } finally {
            setIsExporting(false)
        }
    }

    const handleDownloadTemplate = async () => {
        setIsDownloadingTemplate(true)
        try {
            const response = await fetch('/api/csv/export?template=true')
            if (!response.ok) {
                throw new Error('下载失败')
            }

            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'cbms_import_template.csv'
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)

            toast({
                title: '下载成功',
                description: '已下载导入模板',
            })
        } catch {
            toast({
                title: '下载失败',
                description: '请稍后重试',
                variant: 'destructive',
            })
        } finally {
            setIsDownloadingTemplate(false)
        }
    }

    const handleImportSuccess = () => {
        toast({
            title: '导入完成',
            description: '样本数据已成功导入',
        })
    }

    const getCapacityColor = (index: number): string => {
        const colors = ['bg-primary', 'bg-info', 'bg-success', 'bg-warning', 'bg-destructive']
        return colors[index % colors.length]
    }

    const currentMonth = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })

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
                    <h1 className="text-2xl font-bold">报表</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        数据分析和导入导出功能
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Capacity Overview */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <PieChart className="h-5 w-5 text-primary" />
                            容量概览
                        </CardTitle>
                        <CardDescription>各细胞库存储使用情况</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {facilities.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                暂无细胞库数据
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {facilities.map((item, index) => (
                                    <div key={item.id}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>{item.name}</span>
                                            <span className="text-muted-foreground">{item.capacity}%</span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${getCapacityColor(index)} rounded-full transition-all`}
                                                style={{ width: `${item.capacity}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Monthly Stats */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-primary" />
                            本月统计
                        </CardTitle>
                        <CardDescription>{currentMonth}操作统计</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 rounded-lg bg-primary/10">
                                <p className="text-2xl font-bold text-primary">{monthlyStats.create}</p>
                                <p className="text-sm text-muted-foreground">入库</p>
                            </div>
                            <div className="p-4 rounded-lg bg-destructive/10">
                                <p className="text-2xl font-bold text-destructive">{monthlyStats.consume}</p>
                                <p className="text-sm text-muted-foreground">出库</p>
                            </div>
                            <div className="p-4 rounded-lg bg-info/10">
                                <p className="text-2xl font-bold text-info">{monthlyStats.edit}</p>
                                <p className="text-sm text-muted-foreground">编辑</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Import/Export */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>数据导入导出</CardTitle>
                        <CardDescription>批量操作和数据备份</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4 flex-wrap">
                            <CSVImportDialog
                                trigger={
                                    <Button variant="outline">
                                        <Upload className="mr-2 h-4 w-4" />
                                        导入数据
                                    </Button>
                                }
                                onSuccess={handleImportSuccess}
                            />
                            <Button
                                variant="outline"
                                onClick={handleExport}
                                disabled={isExporting}
                            >
                                {isExporting ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Download className="mr-2 h-4 w-4" />
                                )}
                                导出数据
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleDownloadTemplate}
                                disabled={isDownloadingTemplate}
                            >
                                {isDownloadingTemplate ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Download className="mr-2 h-4 w-4" />
                                )}
                                下载导入模板
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
