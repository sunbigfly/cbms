'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Breadcrumbs } from '@/components/features/Breadcrumbs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Edit, Database, Users, Loader2, ChevronDown, ChevronUp, Package, Layers, ShieldAlert, Settings } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog'
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { CreateFacilityWizard } from '@/components/features/CreateFacilityWizard'
import { useToast } from '@/hooks/use-toast'
import { PresetsManager } from '@/components/features/PresetsManager'

interface Facility {
    id: string
    name: string
    type: string
    description?: string
    totalRacks: number
    _count?: {
        racks: number
    }
    racks?: Rack[]
}

interface Rack {
    id: string
    name: string
    code: string
    totalShelves: number
    shelves?: Shelf[]
}

interface Shelf {
    id: string
    name: string
    order: number
    boxes?: Box[]
}

interface Box {
    id: string
    name: string
    rows: number
    columns: number
}

export default function SettingsPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const { toast } = useToast()
    const [facilityDialogOpen, setFacilityDialogOpen] = useState(false)
    const [privateFacilityDialogOpen, setPrivateFacilityDialogOpen] = useState(false)
    const [facilities, setFacilities] = useState<Facility[]>([])
    const [privateFacilities, setPrivateFacilities] = useState<Facility[]>([])
    const [loading, setLoading] = useState(true)
    const [privateLoading, setPrivateLoading] = useState(true)

    // 权限检查: 只有管理员可访问
    const isAdmin = session?.user?.role === 'ADMIN'

    // 未登录重定向到登录页
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login')
        }
    }, [status, router])

    // Edit dialog state
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [editingFacility, setEditingFacility] = useState<Facility | null>(null)
    const [editFormData, setEditFormData] = useState({ name: '', type: '', description: '' })

    // Delete dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deletingFacility, setDeletingFacility] = useState<Facility | null>(null)
    const [canDelete, setCanDelete] = useState(true)
    const [sampleCount, setSampleCount] = useState(0)

    // Expanded facilities for rack/box management
    const [expandedFacility, setExpandedFacility] = useState<string | null>(null)
    const [facilityDetails, setFacilityDetails] = useState<Record<string, Facility>>({})

    // Add rack dialog
    const [addRackDialogOpen, setAddRackDialogOpen] = useState(false)
    const [addRackFacilityId, setAddRackFacilityId] = useState<string | null>(null)
    const [rackFormData, setRackFormData] = useState({ name: '', shelvesPerRack: 4, boxRows: 9, boxCols: 9 })

    // Add box dialog
    const [addBoxDialogOpen, setAddBoxDialogOpen] = useState(false)
    const [addBoxShelfId, setAddBoxShelfId] = useState<string | null>(null)
    const [boxFormData, setBoxFormData] = useState({ name: '', rows: 9, columns: 9 })

    // Delete rack/box dialog
    const [deleteRackDialogOpen, setDeleteRackDialogOpen] = useState(false)
    const [deletingRackId, setDeletingRackId] = useState<string | null>(null)
    const [deleteBoxDialogOpen, setDeleteBoxDialogOpen] = useState(false)
    const [deletingBoxId, setDeletingBoxId] = useState<string | null>(null)

    // User management state
    interface UserInfo {
        id: string
        employeeId: string | null
        name: string | null
        email: string
        role: string
        isBlocked: boolean
        createdAt: string
    }
    const [users, setUsers] = useState<UserInfo[]>([])
    const [usersLoading, setUsersLoading] = useState(false)
    const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false)
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null)

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

    // 获取私有细胞库列表（员工）
    const fetchPrivateFacilities = useCallback(async () => {
        try {
            setPrivateLoading(true)
            const res = await fetch('/api/facilities?private=true')
            if (res.ok) {
                const data = await res.json()
                setPrivateFacilities(data)
            }
        } catch (error) {
            console.error('Failed to fetch private facilities:', error)
        } finally {
            setPrivateLoading(false)
        }
    }, [])

    const fetchFacilityDetails = async (facilityId: string) => {
        try {
            const res = await fetch(`/api/inventory?facilityId=${facilityId}`)
            if (res.ok) {
                const data = await res.json()
                setFacilityDetails(prev => ({ ...prev, [facilityId]: data }))
            }
        } catch (error) {
            console.error('Failed to fetch facility details:', error)
        }
    }

    useEffect(() => {
        if (isAdmin) {
            fetchFacilities()
        }
        // 员工和管理员都可以获取私有细胞库列表
        fetchPrivateFacilities()
    }, [fetchFacilities, fetchPrivateFacilities, isAdmin])

    const handleFacilitySuccess = () => {
        setFacilityDialogOpen(false)
        fetchFacilities()
    }

    const handlePrivateFacilitySuccess = () => {
        setPrivateFacilityDialogOpen(false)
        fetchPrivateFacilities()
    }

    // User management functions
    const fetchUsers = async () => {
        setUsersLoading(true)
        try {
            const res = await fetch('/api/users')
            if (res.ok) {
                const data = await res.json()
                setUsers(data)
            }
        } catch (error) {
            console.error('Failed to fetch users:', error)
        } finally {
            setUsersLoading(false)
        }
    }

    const handleToggleBlock = async (userId: string, isBlocked: boolean) => {
        try {
            const res = await fetch('/api/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: userId, isBlocked }),
            })
            if (res.ok) {
                toast({ title: isBlocked ? '已封禁' : '已解封', description: '用户状态已更新' })
                fetchUsers()
            } else {
                const data = await res.json()
                toast({ title: '操作失败', description: data.error, variant: 'destructive' })
            }
        } catch {
            toast({ title: '操作失败', description: '网络错误', variant: 'destructive' })
        }
    }

    const handleDeleteUser = async () => {
        if (!deletingUserId) return
        try {
            const res = await fetch(`/api/users?id=${deletingUserId}`, { method: 'DELETE' })
            if (res.ok) {
                toast({ title: '删除成功', description: '用户已删除' })
                setDeleteUserDialogOpen(false)
                fetchUsers()
            } else {
                const data = await res.json()
                toast({ title: '删除失败', description: data.error, variant: 'destructive' })
            }
        } catch {
            toast({ title: '删除失败', description: '网络错误', variant: 'destructive' })
        }
    }

    // Load users when switching to users tab
    useEffect(() => {
        fetchUsers()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Edit handlers
    const openEditDialog = (facility: Facility) => {
        setEditingFacility(facility)
        setEditFormData({
            name: facility.name,
            type: facility.type,
            description: facility.description || '',
        })
        setEditDialogOpen(true)
    }

    const handleUpdateFacility = async () => {
        if (!editingFacility) return
        try {
            const res = await fetch('/api/facilities', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingFacility.id, ...editFormData }),
            })
            if (res.ok) {
                toast({ title: '更新成功', description: '细胞库信息已更新' })
                setEditDialogOpen(false)
                fetchFacilities()
            } else {
                const data = await res.json()
                toast({ title: '更新失败', description: data.error, variant: 'destructive' })
            }
        } catch (error) {
            toast({ title: '更新失败', description: '网络错误', variant: 'destructive' })
        }
    }

    // Delete handlers
    const openDeleteDialog = (facility: Facility) => {
        setDeletingFacility(facility)
        setCanDelete(true) // 默认允许尝试删除，失败会提示
        setDeleteDialogOpen(true)
    }

    const handleDeleteFacility = async () => {
        if (!deletingFacility) return
        try {
            const res = await fetch(`/api/facilities?id=${deletingFacility.id}`, { method: 'DELETE' })
            if (res.ok) {
                toast({ title: '删除成功', description: '细胞库已删除' })
                setDeleteDialogOpen(false)
                fetchFacilities()
            } else {
                const data = await res.json()
                if (data.canDelete === false) {
                    setCanDelete(false)
                    setSampleCount(data.sampleCount || 0)
                } else {
                    toast({ title: '删除失败', description: data.error, variant: 'destructive' })
                }
            }
        } catch (error) {
            toast({ title: '删除失败', description: '网络错误', variant: 'destructive' })
        }
    }

    // Expand/collapse facility
    const toggleFacilityExpand = async (facilityId: string) => {
        if (expandedFacility === facilityId) {
            setExpandedFacility(null)
        } else {
            setExpandedFacility(facilityId)
            if (!facilityDetails[facilityId]) {
                await fetchFacilityDetails(facilityId)
            }
        }
    }

    // Add rack handlers
    const openAddRackDialog = (facilityId: string) => {
        setAddRackFacilityId(facilityId)
        setRackFormData({ name: '', shelvesPerRack: 4, boxRows: 9, boxCols: 9 })
        setAddRackDialogOpen(true)
    }

    const handleAddRack = async () => {
        if (!addRackFacilityId) return
        try {
            const res = await fetch('/api/racks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ facilityId: addRackFacilityId, ...rackFormData }),
            })
            if (res.ok) {
                toast({ title: '添加成功', description: '架子已添加' })
                setAddRackDialogOpen(false)
                fetchFacilities()
                fetchFacilityDetails(addRackFacilityId)
            } else {
                const data = await res.json()
                toast({ title: '添加失败', description: data.error, variant: 'destructive' })
            }
        } catch (error) {
            toast({ title: '添加失败', description: '网络错误', variant: 'destructive' })
        }
    }

    // Delete rack
    const handleDeleteRack = async () => {
        if (!deletingRackId) return
        try {
            const res = await fetch(`/api/racks?id=${deletingRackId}`, { method: 'DELETE' })
            if (res.ok) {
                toast({ title: '删除成功', description: '架子已删除' })
                setDeleteRackDialogOpen(false)
                fetchFacilities()
                if (expandedFacility) fetchFacilityDetails(expandedFacility)
            } else {
                const data = await res.json()
                toast({ title: '删除失败', description: data.error, variant: 'destructive' })
            }
        } catch (error) {
            toast({ title: '删除失败', description: '网络错误', variant: 'destructive' })
        }
    }

    // Add box handlers
    const openAddBoxDialog = (shelfId: string) => {
        setAddBoxShelfId(shelfId)
        setBoxFormData({ name: '', rows: 9, columns: 9 })
        setAddBoxDialogOpen(true)
    }

    const handleAddBox = async () => {
        if (!addBoxShelfId) return
        try {
            const res = await fetch('/api/boxes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shelfId: addBoxShelfId, ...boxFormData }),
            })
            if (res.ok) {
                toast({ title: '添加成功', description: '盒子已添加' })
                setAddBoxDialogOpen(false)
                if (expandedFacility) fetchFacilityDetails(expandedFacility)
            } else {
                const data = await res.json()
                toast({ title: '添加失败', description: data.error, variant: 'destructive' })
            }
        } catch (error) {
            toast({ title: '添加失败', description: '网络错误', variant: 'destructive' })
        }
    }

    // Delete box
    const handleDeleteBox = async () => {
        if (!deletingBoxId) return
        try {
            const res = await fetch(`/api/boxes?id=${deletingBoxId}`, { method: 'DELETE' })
            if (res.ok) {
                toast({ title: '删除成功', description: '盒子已删除' })
                setDeleteBoxDialogOpen(false)
                if (expandedFacility) fetchFacilityDetails(expandedFacility)
            } else {
                const data = await res.json()
                toast({ title: '删除失败', description: data.error, variant: 'destructive' })
            }
        } catch {
            toast({ title: '删除失败', description: '网络错误', variant: 'destructive' })
        }
    }

    // 权限检查：非管理员显示无权限页面
    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    // 员工和管理员都可以访问设置页面，但显示不同的 Tab

    return (
        <div className="container mx-auto px-4 py-6 max-w-7xl">
            <div className="mb-6">
                <Breadcrumbs />
            </div>

            <div className="mb-6">
                <h1 className="text-2xl font-bold">{isAdmin ? '系统设置' : '我的设置'}</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    {isAdmin ? '管理细胞库配置和用户权限' : '管理您的私有细胞库'}
                </p>
            </div>

            <Tabs defaultValue={isAdmin ? 'facilities' : 'private-library'} className="space-y-6">
                <TabsList>
                    {isAdmin && (
                        <>
                            <TabsTrigger value="facilities" className="gap-2">
                                <Database className="h-4 w-4" />
                                细胞库管理
                            </TabsTrigger>
                            <TabsTrigger value="users" className="gap-2">
                                <Users className="h-4 w-4" />
                                用户管理
                            </TabsTrigger>
                            <TabsTrigger value="presets" className="gap-2">
                                <Settings className="h-4 w-4" />
                                预设管理
                            </TabsTrigger>
                        </>
                    )}
                    <TabsTrigger value="private-library" className="gap-2">
                        <Database className="h-4 w-4" />
                        我的私有库
                    </TabsTrigger>
                </TabsList>

                {isAdmin && (
                    <TabsContent value="facilities">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>存储细胞库</CardTitle>
                                        <CardDescription>管理冷冻库和液氮罐配置</CardDescription>
                                    </div>
                                    <Dialog open={facilityDialogOpen} onOpenChange={setFacilityDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button>
                                                <Plus className="mr-2 h-4 w-4" />
                                                新增细胞库
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle>创建新细胞库</DialogTitle>
                                                <DialogDescription>
                                                    按步骤配置您的存储细胞库
                                                </DialogDescription>
                                            </DialogHeader>
                                            <CreateFacilityWizard embedded onSuccess={handleFacilitySuccess} />
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
                                            暂无细胞库，点击&quot;新增细胞库&quot;开始创建
                                        </div>
                                    ) : (
                                        facilities.map((facility) => (
                                            <div key={facility.id} className="border rounded-lg">
                                                <div className="flex items-center justify-between p-4">
                                                    <div
                                                        className="flex items-center gap-2 cursor-pointer flex-1"
                                                        onClick={() => toggleFacilityExpand(facility.id)}
                                                    >
                                                        {expandedFacility === facility.id ? (
                                                            <ChevronUp className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronDown className="h-4 w-4" />
                                                        )}
                                                        <div>
                                                            <p className="font-medium">{facility.name}</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {facility.type} | {facility.totalRacks} 扇/提
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openEditDialog(facility)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive"
                                                            onClick={() => openDeleteDialog(facility)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Expanded content: Racks and Boxes */}
                                                {expandedFacility === facility.id && (
                                                    <div className="border-t p-4 bg-muted/30">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <h4 className="text-sm font-medium">架子管理</h4>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => openAddRackDialog(facility.id)}
                                                            >
                                                                <Plus className="h-3 w-3 mr-1" />
                                                                添加架子
                                                            </Button>
                                                        </div>

                                                        {facilityDetails[facility.id]?.racks?.map((rack) => (
                                                            <div key={rack.id} className="ml-4 mb-3 border-l-2 pl-4">
                                                                <div className="flex items-center justify-between py-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <Layers className="h-4 w-4 text-muted-foreground" />
                                                                        <span className="font-medium">{rack.name}</span>
                                                                        <Badge variant="secondary">{rack.totalShelves} 层</Badge>
                                                                    </div>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 text-destructive"
                                                                        onClick={() => {
                                                                            setDeletingRackId(rack.id)
                                                                            setDeleteRackDialogOpen(true)
                                                                        }}
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                </div>

                                                                {/* Shelves and Boxes */}
                                                                {rack.shelves?.map((shelf) => (
                                                                    <div key={shelf.id} className="ml-4 py-1">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-sm text-muted-foreground">{shelf.name}</span>
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="flex gap-1">
                                                                                    {shelf.boxes?.map((box) => (
                                                                                        <div
                                                                                            key={box.id}
                                                                                            className="flex items-center gap-1 px-2 py-1 bg-background border rounded text-xs"
                                                                                        >
                                                                                            <Package className="h-3 w-3" />
                                                                                            {box.name}
                                                                                            <Button
                                                                                                variant="ghost"
                                                                                                size="icon"
                                                                                                className="h-4 w-4 text-destructive"
                                                                                                onClick={() => {
                                                                                                    setDeletingBoxId(box.id)
                                                                                                    setDeleteBoxDialogOpen(true)
                                                                                                }}
                                                                                            >
                                                                                                <Trash2 className="h-2 w-2" />
                                                                                            </Button>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-6 w-6"
                                                                                    onClick={() => openAddBoxDialog(shelf.id)}
                                                                                >
                                                                                    <Plus className="h-3 w-3" />
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ))}

                                                        {!facilityDetails[facility.id] && (
                                                            <div className="flex items-center justify-center py-4">
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {isAdmin && (
                    <TabsContent value="users">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>用户管理</CardTitle>
                                        <CardDescription>管理已注册的系统用户</CardDescription>
                                    </div>
                                    <Button variant="outline" onClick={fetchUsers}>
                                        刷新列表
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {usersLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                            <span className="ml-2 text-muted-foreground">加载中...</span>
                                        </div>
                                    ) : users.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            暂无用户
                                        </div>
                                    ) : (
                                        users.map((user) => (
                                            <div key={user.id} className={`flex items-center justify-between p-4 border rounded-lg ${user.isBlocked ? 'bg-muted/50 opacity-60' : ''}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center font-medium ${user.isBlocked ? 'bg-destructive/20' : 'bg-primary/20'}`}>
                                                        {user.name?.[0] || user.employeeId?.[0] || '?'}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{user.name || '未设置'}</p>
                                                        <p className="text-sm text-muted-foreground">工号: {user.employeeId || '-'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                                                        {user.role === 'ADMIN' ? '管理员' : '员工'}
                                                    </Badge>
                                                    {user.isBlocked && (
                                                        <Badge variant="destructive">已封禁</Badge>
                                                    )}
                                                    {user.role !== 'ADMIN' && (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleToggleBlock(user.id, !user.isBlocked)}
                                                            >
                                                                {user.isBlocked ? '解封' : '封禁'}
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-destructive"
                                                                onClick={() => {
                                                                    setDeletingUserId(user.id)
                                                                    setDeleteUserDialogOpen(true)
                                                                }}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {isAdmin && (
                    <TabsContent value="presets">
                        <PresetsManager />
                    </TabsContent>
                )}

                {/* 私有库管理 Tab - 员工和管理员都可见 */}
                <TabsContent value="private-library">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>我的私有细胞库</CardTitle>
                                    <CardDescription>管理您自己的私有存储细胞库</CardDescription>
                                </div>
                                <Dialog open={privateFacilityDialogOpen} onOpenChange={setPrivateFacilityDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <Plus className="mr-2 h-4 w-4" />
                                            新增私有细胞库
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle>创建私有细胞库</DialogTitle>
                                            <DialogDescription>
                                                按步骤配置您的私有存储细胞库
                                            </DialogDescription>
                                        </DialogHeader>
                                        <CreateFacilityWizard forcePrivate={true} embedded onSuccess={handlePrivateFacilitySuccess} />
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {privateLoading ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                        <span className="ml-2 text-muted-foreground">加载中...</span>
                                    </div>
                                ) : privateFacilities.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        暂无私有细胞库，点击&quot;新增私有细胞库&quot;开始创建
                                    </div>
                                ) : (
                                    privateFacilities.map((facility) => (
                                        <div key={facility.id} className="border rounded-lg">
                                            <div className="flex items-center justify-between p-4">
                                                <div
                                                    className="flex items-center gap-2 cursor-pointer flex-1"
                                                    onClick={() => toggleFacilityExpand(facility.id)}
                                                >
                                                    {expandedFacility === facility.id ? (
                                                        <ChevronUp className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronDown className="h-4 w-4" />
                                                    )}
                                                    <div>
                                                        <p className="font-medium">{facility.name}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {facility.type} | {facility.totalRacks} 扇/提
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditDialog(facility)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive"
                                                        onClick={() => openDeleteDialog(facility)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Expanded content: Racks and Boxes */}
                                            {expandedFacility === facility.id && (
                                                <div className="border-t p-4 bg-muted/30">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h4 className="text-sm font-medium">架子管理</h4>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => openAddRackDialog(facility.id)}
                                                        >
                                                            <Plus className="h-3 w-3 mr-1" />
                                                            添加架子
                                                        </Button>
                                                    </div>

                                                    {facilityDetails[facility.id]?.racks?.map((rack) => (
                                                        <div key={rack.id} className="ml-4 mb-3 border-l-2 pl-4">
                                                            <div className="flex items-center justify-between py-2">
                                                                <div className="flex items-center gap-2">
                                                                    <Layers className="h-4 w-4 text-muted-foreground" />
                                                                    <span className="font-medium">{rack.name}</span>
                                                                    <Badge variant="secondary">{rack.totalShelves} 层</Badge>
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 text-destructive"
                                                                    onClick={() => {
                                                                        setDeletingRackId(rack.id)
                                                                        setDeleteRackDialogOpen(true)
                                                                    }}
                                                                >
                                                                    <Trash2 className="h-3 w-3" />
                                                                </Button>
                                                            </div>

                                                            {/* Shelves and Boxes */}
                                                            {rack.shelves?.map((shelf) => (
                                                                <div key={shelf.id} className="ml-4 py-1">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-sm text-muted-foreground">{shelf.name}</span>
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="flex gap-1">
                                                                                {shelf.boxes?.map((box) => (
                                                                                    <div
                                                                                        key={box.id}
                                                                                        className="flex items-center gap-1 px-2 py-1 bg-background border rounded text-xs"
                                                                                    >
                                                                                        <Package className="h-3 w-3" />
                                                                                        {box.name}
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="icon"
                                                                                            className="h-4 w-4 text-destructive"
                                                                                            onClick={() => {
                                                                                                setDeletingBoxId(box.id)
                                                                                                setDeleteBoxDialogOpen(true)
                                                                                            }}
                                                                                        >
                                                                                            <Trash2 className="h-2 w-2" />
                                                                                        </Button>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-6 w-6"
                                                                                onClick={() => openAddBoxDialog(shelf.id)}
                                                                            >
                                                                                <Plus className="h-3 w-3" />
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}

                                                    {!facilityDetails[facility.id] && (
                                                        <div className="flex items-center justify-center py-4">
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Edit Facility Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>编辑细胞库</DialogTitle>
                        <DialogDescription>修改细胞库基本信息</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>细胞库名称</Label>
                            <Input
                                value={editFormData.name}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>细胞库类型</Label>
                            <Select
                                value={editFormData.type}
                                onValueChange={(value) => setEditFormData(prev => ({ ...prev, type: value }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="-80°C 冰箱">-80°C 冰箱</SelectItem>
                                    <SelectItem value="液氮罐">液氮罐</SelectItem>
                                    <SelectItem value="-20°C 冰箱">-20°C 冰箱</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>描述</Label>
                            <Input
                                value={editFormData.description}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>取消</Button>
                        <Button onClick={handleUpdateFacility}>保存</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Facility Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {canDelete ? '确认删除' : '无法删除'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {canDelete
                                ? `确定要删除细胞库 "${deletingFacility?.name}" 吗？此操作不可撤销。`
                                : `细胞库 "${deletingFacility?.name}" 内还有 ${sampleCount} 个细胞样本，无法删除。请先清空细胞库内的样本。`
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        {canDelete && (
                            <AlertDialogAction onClick={handleDeleteFacility} className="bg-destructive text-destructive-foreground">
                                删除
                            </AlertDialogAction>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Add Rack Dialog */}
            <Dialog open={addRackDialogOpen} onOpenChange={setAddRackDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>添加架子</DialogTitle>
                        <DialogDescription>配置新架子的参数</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>架子名称（可选）</Label>
                            <Input
                                placeholder="自动生成"
                                value={rackFormData.name}
                                onChange={(e) => setRackFormData(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>层数</Label>
                            <Input
                                type="number"
                                value={rackFormData.shelvesPerRack}
                                onChange={(e) => setRackFormData(prev => ({ ...prev, shelvesPerRack: parseInt(e.target.value) || 1 }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>盒子行数</Label>
                                <Input
                                    type="number"
                                    value={rackFormData.boxRows}
                                    onChange={(e) => setRackFormData(prev => ({ ...prev, boxRows: parseInt(e.target.value) || 1 }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>盒子列数</Label>
                                <Input
                                    type="number"
                                    value={rackFormData.boxCols}
                                    onChange={(e) => setRackFormData(prev => ({ ...prev, boxCols: parseInt(e.target.value) || 1 }))}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddRackDialogOpen(false)}>取消</Button>
                        <Button onClick={handleAddRack}>添加</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Box Dialog */}
            <Dialog open={addBoxDialogOpen} onOpenChange={setAddBoxDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>添加盒子</DialogTitle>
                        <DialogDescription>配置新盒子的参数</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>盒子名称（可选）</Label>
                            <Input
                                placeholder="自动生成"
                                value={boxFormData.name}
                                onChange={(e) => setBoxFormData(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>行数</Label>
                                <Input
                                    type="number"
                                    value={boxFormData.rows}
                                    onChange={(e) => setBoxFormData(prev => ({ ...prev, rows: parseInt(e.target.value) || 1 }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>列数</Label>
                                <Input
                                    type="number"
                                    value={boxFormData.columns}
                                    onChange={(e) => setBoxFormData(prev => ({ ...prev, columns: parseInt(e.target.value) || 1 }))}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddBoxDialogOpen(false)}>取消</Button>
                        <Button onClick={handleAddBox}>添加</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Rack Dialog */}
            <AlertDialog open={deleteRackDialogOpen} onOpenChange={setDeleteRackDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除架子</AlertDialogTitle>
                        <AlertDialogDescription>
                            确定要删除这个架子吗？如果架子内有细胞样本，将无法删除。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteRack} className="bg-destructive text-destructive-foreground">
                            删除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Box Dialog */}
            <AlertDialog open={deleteBoxDialogOpen} onOpenChange={setDeleteBoxDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除盒子</AlertDialogTitle>
                        <AlertDialogDescription>
                            确定要删除这个盒子吗？如果盒子内有细胞样本，将无法删除。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteBox} className="bg-destructive text-destructive-foreground">
                            删除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete User Dialog */}
            <AlertDialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除用户</AlertDialogTitle>
                        <AlertDialogDescription>
                            确定要删除这个用户吗？此操作不可撤销。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground">
                            删除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    )
}
