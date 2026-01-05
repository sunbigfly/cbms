'use client'

import { useState, useEffect, useCallback } from 'react'
import { TopNav } from '@/components/features/TopNav'
import { Breadcrumbs } from '@/components/features/Breadcrumbs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Edit, Database, Users, Loader2 } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { CreateFacilityWizard } from '@/components/features/CreateFacilityWizard'

interface Facility {
    id: string
    name: string
    type: string
    description?: string
    totalRacks: number
    _count?: {
        racks: number
    }
    racks?: Array<{
        _count?: {
            shelves: number
        }
        shelves?: Array<{
            _count?: {
                boxes: number
            }
        }>
    }>
}

export default function SettingsPage() {
    const [facilityDialogOpen, setFacilityDialogOpen] = useState(false)
    const [facilities, setFacilities] = useState<Facility[]>([])
    const [loading, setLoading] = useState(true)

    const fetchFacilities = useCallback(async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/facilities')
            if (res.ok) {
                const data = await res.json()
                setFacilities(data)
            }
        } catch (error) {
            console.error('Failed to fetch facilities:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchFacilities()
    }, [fetchFacilities])

    const handleFacilitySuccess = () => {
        setFacilityDialogOpen(false)
        fetchFacilities() // 创建成功后刷新列表
    }
    return (
        <div className="min-h-screen bg-background">
            <TopNav />

            <main className="container mx-auto px-4 py-6">
                <div className="mb-6">
                    <Breadcrumbs />
                </div>

                {/* Page Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">系统设置</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        管理设施配置和用户权限
                    </p>
                </div>

                <Tabs defaultValue="facilities" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="facilities" className="gap-2">
                            <Database className="h-4 w-4" />
                            设施管理
                        </TabsTrigger>
                        <TabsTrigger value="users" className="gap-2">
                            <Users className="h-4 w-4" />
                            用户管理
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="facilities">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>存储设施</CardTitle>
                                        <CardDescription>管理冷冻库和液氮罐配置</CardDescription>
                                    </div>
                                    <Dialog open={facilityDialogOpen} onOpenChange={setFacilityDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button>
                                                <Plus className="mr-2 h-4 w-4" />
                                                新增设施
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle>创建新设施</DialogTitle>
                                                <DialogDescription>
                                                    按步骤配置您的存储设施
                                                </DialogDescription>
                                            </DialogHeader>
                                            <CreateFacilityWizard onSuccess={handleFacilitySuccess} />
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {loading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                            <span className="ml-2 text-muted-foreground">加载中...</span>
                                        </div>
                                    ) : facilities.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            暂无设施，点击"新增设施"开始创建
                                        </div>
                                    ) : (
                                        facilities.map((facility) => (
                                            <div key={facility.id} className="flex items-center justify-between p-4 border rounded-lg">
                                                <div>
                                                    <p className="font-medium">{facility.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {facility.type} | {facility.totalRacks} 货架
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button variant="ghost" size="icon">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="users">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>用户管理</CardTitle>
                                        <CardDescription>管理系统用户和权限</CardDescription>
                                    </div>
                                    <Button>
                                        <Plus className="mr-2 h-4 w-4" />
                                        新增用户
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {[
                                        { name: 'Admin', email: 'admin@cbms.local', role: 'ADMIN' },
                                        { name: 'Lab Tech', email: 'tech@cbms.local', role: 'TECHNICIAN' },
                                    ].map((user, index) => (
                                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center font-medium">
                                                    {user.name[0]}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{user.name}</p>
                                                    <p className="text-sm text-muted-foreground">{user.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                                                    {user.role === 'ADMIN' ? '管理员' : '技术员'}
                                                </Badge>
                                                <Button variant="ghost" size="icon">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    )
}
