'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Edit, Loader2, X, Check } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
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
import { useToast } from '@/hooks/use-toast'

interface Preset {
    id: string
    category: string
    value: string
    order: number
}

// 预设分类配置
const PRESET_CATEGORIES = [
    { key: 'CELL_NAME', label: '细胞名称', description: '细胞系名称预设' },
    { key: 'CELL_TYPE', label: '细胞类型', description: '细胞类型描述预设' },
    { key: 'CRYO_MEDIA', label: '冻存液', description: '冻存液类型预设' },
    { key: 'CRYO_DENSITY', label: '冻存密度', description: '冻存密度值预设' },
    { key: 'PASSAGE', label: '代数', description: '细胞传代次数预设' },
    { key: 'STERILE_CHECK', label: '无菌验证', description: '无菌验证结果预设' },
]

export function PresetsManager() {
    const { toast } = useToast()
    const [presets, setPresets] = useState<Preset[]>([])
    const [loading, setLoading] = useState(true)
    const [activeCategory, setActiveCategory] = useState('CELL_NAME')

    // 添加预设对话框
    const [addDialogOpen, setAddDialogOpen] = useState(false)
    const [newPresetValue, setNewPresetValue] = useState('')
    const [addLoading, setAddLoading] = useState(false)

    // 编辑预设
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editValue, setEditValue] = useState('')

    // 删除对话框
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deletingPreset, setDeletingPreset] = useState<Preset | null>(null)

    const fetchPresets = useCallback(async () => {
        try {
            setLoading(true)
            const res = await fetch('/api/presets')
            if (res.ok) {
                const data = await res.json()
                setPresets(data)
            }
        } catch (error) {
            console.error('Failed to fetch presets:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchPresets()
    }, [fetchPresets])

    // 获取当前分类的预设
    const currentPresets = presets
        .filter(p => p.category === activeCategory)
        .sort((a, b) => {
            const orderDiff = a.order - b.order
            if (orderDiff !== 0) return orderDiff

            // 如果顺序相同（比如都为0），通过自然排序处理代数等数字混合字符串
            if (activeCategory === 'PASSAGE') {
                return a.value.localeCompare(b.value, undefined, { numeric: true, sensitivity: 'base' })
            }

            return 0 // 保持原有顺序（通常是API返回的文件名排序）
        })

    // 添加预设
    const handleAddPreset = async () => {
        if (!newPresetValue.trim()) return

        setAddLoading(true)
        try {
            const res = await fetch('/api/presets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: activeCategory,
                    value: newPresetValue.trim(),
                    order: currentPresets.length,
                }),
            })
            if (res.ok) {
                toast({ title: '添加成功', description: '预设值已添加' })
                setNewPresetValue('')
                setAddDialogOpen(false)
                fetchPresets()
            } else {
                const data = await res.json()
                toast({ title: '添加失败', description: data.error, variant: 'destructive' })
            }
        } catch {
            toast({ title: '添加失败', description: '网络错误', variant: 'destructive' })
        } finally {
            setAddLoading(false)
        }
    }

    // 更新预设
    const handleUpdatePreset = async (id: string) => {
        if (!editValue.trim()) return

        try {
            const res = await fetch('/api/presets', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, value: editValue.trim() }),
            })
            if (res.ok) {
                toast({ title: '更新成功', description: '预设值已更新' })
                setEditingId(null)
                fetchPresets()
            } else {
                const data = await res.json()
                toast({ title: '更新失败', description: data.error, variant: 'destructive' })
            }
        } catch {
            toast({ title: '更新失败', description: '网络错误', variant: 'destructive' })
        }
    }

    // 删除预设
    const handleDeletePreset = async () => {
        if (!deletingPreset) return

        try {
            const res = await fetch(`/api/presets?id=${deletingPreset.id}`, { method: 'DELETE' })
            if (res.ok) {
                toast({ title: '删除成功', description: '预设值已删除' })
                setDeleteDialogOpen(false)
                setDeletingPreset(null)
                fetchPresets()
            } else {
                const data = await res.json()
                toast({ title: '删除失败', description: data.error, variant: 'destructive' })
            }
        } catch {
            toast({ title: '删除失败', description: '网络错误', variant: 'destructive' })
        }
    }

    const currentCategoryInfo = PRESET_CATEGORIES.find(c => c.key === activeCategory)

    return (
        <Card>
            <CardHeader>
                <CardTitle>预设管理</CardTitle>
                <CardDescription>管理下拉选项的预设值</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-6">
                    {/* 左侧分类列表 */}
                    <div className="w-48 space-y-1">
                        {PRESET_CATEGORIES.map(cat => (
                            <Button
                                key={cat.key}
                                variant={activeCategory === cat.key ? 'secondary' : 'ghost'}
                                className="w-full justify-start"
                                onClick={() => setActiveCategory(cat.key)}
                            >
                                {cat.label}
                                <Badge variant="outline" className="ml-auto">
                                    {presets.filter(p => p.category === cat.key).length}
                                </Badge>
                            </Button>
                        ))}
                    </div>

                    {/* 右侧预设值列表 */}
                    <div className="flex-1 border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="font-medium">{currentCategoryInfo?.label}</h3>
                                <p className="text-sm text-muted-foreground">{currentCategoryInfo?.description}</p>
                            </div>
                            <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                                <Plus className="h-4 w-4 mr-1" />
                                添加
                            </Button>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : currentPresets.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                暂无预设值
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {currentPresets.map(preset => (
                                    <div
                                        key={preset.id}
                                        className="flex items-center justify-between px-3 py-2 border rounded-md bg-muted/30"
                                    >
                                        {editingId === preset.id ? (
                                            <div className="flex items-center gap-2 flex-1">
                                                <Input
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    className="h-8"
                                                    autoFocus
                                                />
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8"
                                                    onClick={() => handleUpdatePreset(preset.id)}
                                                >
                                                    <Check className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8"
                                                    onClick={() => setEditingId(null)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="text-sm">{preset.value}</span>
                                                <div className="flex gap-1">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8"
                                                        onClick={() => {
                                                            setEditingId(preset.id)
                                                            setEditValue(preset.value)
                                                        }}
                                                    >
                                                        <Edit className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-destructive"
                                                        onClick={() => {
                                                            setDeletingPreset(preset)
                                                            setDeleteDialogOpen(true)
                                                        }}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>

            {/* 添加预设对话框 */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>添加预设值</DialogTitle>
                        <DialogDescription>
                            为 "{currentCategoryInfo?.label}" 添加新的预设值
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="输入预设值..."
                            value={newPresetValue}
                            onChange={e => setNewPresetValue(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddPreset()}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                            取消
                        </Button>
                        <Button onClick={handleAddPreset} disabled={addLoading || !newPresetValue.trim()}>
                            {addLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            添加
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 删除确认对话框 */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>
                            确定要删除预设值 &quot;{deletingPreset?.value}&quot; 吗？此操作不可撤销。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeletePreset}
                            className="bg-destructive text-destructive-foreground"
                        >
                            删除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    )
}
