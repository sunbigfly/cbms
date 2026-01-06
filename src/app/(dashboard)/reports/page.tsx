'use client'

import { useState, useEffect } from 'react'
import { Breadcrumbs } from '@/components/features/Breadcrumbs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Upload, Loader2, TrendingUp, BarChart3 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { CSVImportDialog } from '@/components/features/CSVImportDialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    Legend,
} from 'recharts'

interface MonthlyStats {
    create: number
    consume: number
    edit: number
}

interface ChartData {
    name: string
    value: number
    [key: string]: string | number
}

interface TrendData {
    date: string
    入库: number
    出库: number
    编辑: number
}

interface ReportStats {
    facilityDistribution: ChartData[]
    typeDistribution: ChartData[]
    passageDistribution: ChartData[]
    ownerDistribution: ChartData[]
    dailyTrends: TrendData[]
}

// 分布类型定义
type DistributionType = 'facility' | 'type' | 'passage' | 'owner'

const DISTRIBUTION_OPTIONS: { value: DistributionType; label: string; description: string }[] = [
    { value: 'facility', label: '细胞库分布', description: '每个细胞库中的样本数量占比' },
    { value: 'type', label: '样本类型分布', description: '不同细胞类型的样本数量' },
    { value: 'passage', label: '代次分布', description: '不同代次(Passage)的样本数量' },
    { value: 'owner', label: '所有者分布', description: '各实验员存放的样本数量' },
]

// 柔和的配色方案
const COLORS = [
    'hsl(221, 83%, 53%)',   // 蓝色
    'hsl(142, 71%, 45%)',   // 绿色
    'hsl(38, 92%, 50%)',    // 橙色
    'hsl(262, 83%, 58%)',   // 紫色
    'hsl(346, 77%, 50%)',   // 粉红
    'hsl(199, 89%, 48%)',   // 青色
    'hsl(43, 96%, 56%)',    // 黄色
    'hsl(280, 67%, 52%)',   // 紫罗兰
]

const TREND_COLORS = {
    入库: 'hsl(221, 83%, 53%)',
    出库: 'hsl(346, 77%, 50%)',
    编辑: 'hsl(38, 92%, 50%)',
}

export default function ReportsPage() {
    const { toast } = useToast()
    const [isExporting, setIsExporting] = useState(false)
    const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false)
    const [loading, setLoading] = useState(true)
    const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({ create: 0, consume: 0, edit: 0 })
    const [reportStats, setReportStats] = useState<ReportStats | null>(null)
    const [selectedDistribution, setSelectedDistribution] = useState<DistributionType>('facility')

    useEffect(() => {
        async function fetchData() {
            try {
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

                // Fetch report stats for charts
                const statsRes = await fetch('/api/reports/stats')
                if (statsRes.ok) {
                    const statsData = await statsRes.json()
                    setReportStats(statsData)
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

            const contentDisposition = response.headers.get('Content-Disposition')
            const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
            const filename = filenameMatch?.[1] || 'cbms_export.csv'

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

    const currentMonth = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })

    // 获取当前选中的分布数据
    const getDistributionData = (): ChartData[] => {
        if (!reportStats) return []
        switch (selectedDistribution) {
            case 'facility':
                return reportStats.facilityDistribution || []
            case 'type':
                return reportStats.typeDistribution || []
            case 'passage':
                return reportStats.passageDistribution || []
            case 'owner':
                return reportStats.ownerDistribution || []
            default:
                return []
        }
    }

    // 判断是否使用饼图（facility 和 type 用饼图，passage 和 owner 用柱状图）
    const usePieChart = selectedDistribution === 'facility' || selectedDistribution === 'type'

    const selectedOption = DISTRIBUTION_OPTIONS.find(opt => opt.value === selectedDistribution)

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

    const totalSamples = reportStats?.facilityDistribution?.reduce((sum, item) => sum + item.value, 0) || 0
    const distributionData = getDistributionData()

    return (
        <div className="container mx-auto px-4 py-6 max-w-7xl">
            <div className="mb-6">
                <Breadcrumbs />
            </div>

            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">报表</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        数据分析和可视化统计
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                {/* Monthly Stats Summary */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">总样本数</p>
                                    <p className="text-3xl font-bold text-primary">{totalSamples}</p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                                    <BarChart3 className="h-6 w-6 text-primary" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">{currentMonth}入库</p>
                                    <p className="text-3xl font-bold text-blue-500">{monthlyStats.create}</p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                                    <TrendingUp className="h-6 w-6 text-blue-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border-rose-500/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">{currentMonth}出库</p>
                                    <p className="text-3xl font-bold text-rose-500">{monthlyStats.consume}</p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-rose-500/20 flex items-center justify-center">
                                    <TrendingUp className="h-6 w-6 text-rose-500 rotate-180" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">{currentMonth}编辑</p>
                                    <p className="text-3xl font-bold text-amber-500">{monthlyStats.edit}</p>
                                </div>
                                <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                                    <BarChart3 className="h-6 w-6 text-amber-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Daily Trends Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-primary" />
                                最近30天操作趋势
                            </CardTitle>
                            <CardDescription>每日入库、出库、编辑操作数量</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {reportStats?.dailyTrends && reportStats.dailyTrends.length > 0 ? (
                                <ResponsiveContainer width="100%" height={220}>
                                    <AreaChart data={reportStats.dailyTrends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorCreate" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={TREND_COLORS.入库} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={TREND_COLORS.入库} stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorConsume" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={TREND_COLORS.出库} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={TREND_COLORS.出库} stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorUpdate" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={TREND_COLORS.编辑} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={TREND_COLORS.编辑} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                        <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                                        <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                                        <Tooltip />
                                        <Legend />
                                        <Area type="monotone" dataKey="入库" stroke={TREND_COLORS.入库} fillOpacity={1} fill="url(#colorCreate)" strokeWidth={2} />
                                        <Area type="monotone" dataKey="出库" stroke={TREND_COLORS.出库} fillOpacity={1} fill="url(#colorConsume)" strokeWidth={2} />
                                        <Area type="monotone" dataKey="编辑" stroke={TREND_COLORS.编辑} fillOpacity={1} fill="url(#colorUpdate)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                                    暂无操作记录
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Distribution Chart with Dropdown */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <BarChart3 className="h-5 w-5 text-primary" />
                                        样本分布统计
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                        {selectedOption?.description}
                                    </CardDescription>
                                </div>
                                <Select value={selectedDistribution} onValueChange={(v) => setSelectedDistribution(v as DistributionType)}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="选择分布类型" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DISTRIBUTION_OPTIONS.map(option => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {distributionData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={220}>
                                    {usePieChart ? (
                                        <PieChart>
                                            <Pie
                                                data={distributionData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                outerRadius={75}
                                                innerRadius={45}
                                                fill="#8884d8"
                                                dataKey="value"
                                                animationDuration={500}
                                                label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                                            >
                                                {distributionData.map((_entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend formatter={(value) => <span className="text-sm">{value}</span>} />
                                        </PieChart>
                                    ) : (
                                        <BarChart
                                            data={distributionData}
                                            layout={selectedDistribution === 'owner' ? 'vertical' : 'horizontal'}
                                            margin={{ top: 10, right: 30, left: selectedDistribution === 'owner' ? 80 : 0, bottom: 0 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                            {selectedDistribution === 'owner' ? (
                                                <>
                                                    <XAxis type="number" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                                                    <YAxis type="category" dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} width={75} />
                                                </>
                                            ) : (
                                                <>
                                                    <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                                                    <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                                                </>
                                            )}
                                            <Tooltip />
                                            <Bar
                                                dataKey="value"
                                                name="样本数"
                                                fill="hsl(221, 83%, 53%)"
                                                radius={selectedDistribution === 'owner' ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                                                animationDuration={500}
                                            />
                                        </BarChart>
                                    )}
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                                    暂无样本数据
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Import/Export */}
                <Card>
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
