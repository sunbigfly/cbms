'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/features/AppLayout'
import { Breadcrumbs } from '@/components/features/Breadcrumbs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FlaskConical,
  Box,
  Database,
  TrendingUp,
  Plus,
  ArrowRight,
  Loader2,
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  facilitiesCount: number
  samplesCount: number
  emptySlots: number
  totalSlots: number
  monthlyOps: number
  weeklyCheckIns: number
  capacityPercent: number
}

interface RecentActivity {
  id: string
  action: string
  sample: string
  description: string
  user: string
  timestamp: string
}

interface FacilityOverview {
  id: string
  name: string
  type: string
  capacity: number
  slots: string
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date()
  const time = new Date(timestamp)
  const diff = Math.floor((now.getTime() - time.getTime()) / 1000)

  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
  return `${Math.floor(diff / 86400)}天前`
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    CREATE: '入库',
    MOVE: '移动',
    CONSUME: '出库',
    UPDATE: '更新',
    DESTROY: '销毁',
  }
  return labels[action] || action
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([])
  const [facilities, setFacilities] = useState<FacilityOverview[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/stats')
        if (res.ok) {
          const data = await res.json()
          setStats(data.stats)
          setRecentActivities(data.recentActivities || [])
          setFacilities(data.facilities || [])
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const statsCards = stats ? [
    {
      title: '总设施数',
      value: String(stats.facilitiesCount),
      description: '冷冻库/液氮罐',
      icon: Database,
      trend: `${stats.facilitiesCount} 个设施`,
      color: 'text-primary',
    },
    {
      title: '总样本数',
      value: stats.samplesCount.toLocaleString(),
      description: '活跃存储中',
      icon: FlaskConical,
      trend: `+${stats.weeklyCheckIns} 本周入库`,
      color: 'text-success',
    },
    {
      title: '可用槽位',
      value: stats.emptySlots.toLocaleString(),
      description: '剩余存储空间',
      icon: Box,
      trend: `${stats.capacityPercent}% 已用`,
      color: 'text-info',
    },
    {
      title: '本月操作',
      value: String(stats.monthlyOps),
      description: '入库/出库/转移',
      icon: TrendingUp,
      trend: '审计记录',
      color: 'text-warning',
    },
  ] : []

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">仪表盘</h1>
            <p className="text-muted-foreground mt-1">
              细胞银行管理系统 - 概览
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/inventory">
                <Plus className="mr-2 h-4 w-4" />
                快速入库
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {statsCards.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.title} className="relative overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.description}
                  </p>
                  <Badge variant="secondary" className="mt-2 text-xs">
                    {stat.trend}
                  </Badge>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Recent Activities & Quick Access */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle>最近活动</CardTitle>
              <CardDescription>系统最新的样本操作记录</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无操作记录
                  </div>
                ) : (
                  recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <Badge
                        variant={
                          activity.action === 'CREATE'
                            ? 'default'
                            : activity.action === 'CONSUME' || activity.action === 'DESTROY'
                              ? 'destructive'
                              : 'secondary'
                        }
                        className="mt-0.5"
                      >
                        {getActionLabel(activity.action)}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{activity.sample}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {activity.description}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>{formatTimeAgo(activity.timestamp)}</p>
                        <p>{activity.user}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Button variant="ghost" className="w-full mt-4" asChild>
                <Link href="/audit">
                  查看全部历史
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Quick Access - Facilities */}
          <Card>
            <CardHeader>
              <CardTitle>设施概览</CardTitle>
              <CardDescription>点击进入设施管理</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {facilities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    暂无设施，请先创建
                  </div>
                ) : (
                  facilities.map((facility) => (
                    <Link
                      key={facility.id}
                      href="/inventory"
                      className="flex items-center gap-4 p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center"
                        style={{
                          background: `conic-gradient(hsl(var(--primary)) ${facility.capacity}%, hsl(var(--muted)) 0%)`,
                        }}
                      >
                        <div className="h-7 w-7 rounded-full bg-background flex items-center justify-center text-xs font-bold">
                          {facility.capacity}%
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{facility.name}</p>
                        <p className="text-xs text-muted-foreground">{facility.type}</p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-medium">{facility.slots}</p>
                        <p className="text-xs text-muted-foreground">已用/总槽位</p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link href="/settings">
                  管理设施
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
