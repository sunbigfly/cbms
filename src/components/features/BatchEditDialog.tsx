'use client'

import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2, AlertCircle, ChevronDown, Copy, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { MiniBoxPreview } from './MiniBoxPreview'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

// 可编辑下拉框组件
interface EditableSelectProps {
    value: string
    onChange: (value: string) => void
    options: string[]
    placeholder: string
}

function EditableSelect({ value, onChange, options, placeholder }: EditableSelectProps) {
    const [open, setOpen] = useState(false)
    const [inputValue, setInputValue] = useState(value)
    const [isFiltering, setIsFiltering] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setInputValue(value)
        setIsFiltering(false)
    }, [value])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false)
                setIsFiltering(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const filteredOptions = isFiltering
        ? options.filter(opt => opt.toLowerCase().includes(inputValue.toLowerCase()))
        : options

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value
        setInputValue(newValue)
        onChange(newValue)
        setOpen(true)
        setIsFiltering(true)
    }

    const handleSelect = (option: string) => {
        setInputValue(option)
        onChange(option)
        setOpen(false)
        setIsFiltering(false)
    }

    const toggleOpen = () => {
        const nextOpen = !open
        setOpen(nextOpen)
        if (nextOpen) {
            setIsFiltering(false)
        }
    }

    return (
        <div ref={containerRef} className="relative">
            <div className="relative">
                <Input
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => setOpen(true)}
                    placeholder={placeholder}
                    className="pr-8"
                />
                <ChevronDown
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50 cursor-pointer"
                    onClick={toggleOpen}
                />
            </div>
            {open && (
                <div className="absolute z-50 mt-1 w-full bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredOptions.length === 0 ? (
                        <div className="py-2 px-3 text-sm text-muted-foreground">
                            无匹配项，可直接输入
                        </div>
                    ) : (
                        filteredOptions.map((option) => (
                            <div
                                key={option}
                                className="py-2 px-3 text-sm cursor-pointer hover:bg-accent"
                                onMouseDown={(e) => {
                                    e.preventDefault()
                                    handleSelect(option)
                                }}
                            >
                                {option}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}

// 预设数据钩子
function usePresets() {
    const [presets, setPresets] = useState<Record<string, string[]>>({})

    const fetchPresets = useCallback(async () => {
        try {
            const res = await fetch('/api/presets')
            if (res.ok) {
                const data = await res.json()
                const grouped: Record<string, string[]> = {}
                for (const preset of data) {
                    if (!grouped[preset.category]) {
                        grouped[preset.category] = []
                    }
                    grouped[preset.category].push(preset.value)
                }
                setPresets(grouped)

                // 对代数进行自然排序 (P1, P2, ... P10, ...)
                if (grouped['PASSAGE']) {
                    grouped['PASSAGE'].sort((a, b) =>
                        a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
                    )
                }
            }
        } catch (error) {
            console.error('Failed to fetch presets:', error)
        }
    }, [])

    useEffect(() => {
        fetchPresets()
    }, [fetchPresets])

    return presets
}

interface SampleData {
    id: string
    name: string
    type: string
    batchNo?: string
    quantity?: number
    unit?: string
    concentration?: string
    viability?: number
    passage?: string
    media?: string
    owner?: string
    notes?: string
    sterileCheck?: string
}

interface BatchEditDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    sampleIds: string[]
    slotLabels?: string[]      // 位置标签
    boxRows?: number           // 盒子行数
    boxCols?: number           // 盒子列数
    onSuccess?: () => void
}

function areSameBatch(samples: SampleData[]): boolean {
    if (samples.length <= 1) return true
    const first = samples[0]
    return samples.every(s =>
        s.name === first.name &&
        s.type === first.type &&
        s.batchNo === first.batchNo
    )
}

interface EditFormData {
    name: string
    type: string
    batchNo: string
    quantity: number
    concentration: string
    viability: number
    passage: string
    media: string
    notes: string
    sterileCheck: string
}

export function BatchEditDialog({
    open,
    onOpenChange,
    sampleIds,
    slotLabels = [],
    boxRows = 9,
    boxCols = 9,
    onSuccess
}: BatchEditDialogProps) {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(false)
    const [fetchingData, setFetchingData] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loadedSamples, setLoadedSamples] = useState<SampleData[]>([])
    const [formData, setFormData] = useState<Partial<EditFormData>>({})
    const [formDataList, setFormDataList] = useState<EditFormData[]>([])
    const [useSameData, setUseSameData] = useState(true)
    const [currentPage, setCurrentPage] = useState(0)
    const presets = usePresets()

    const currentUser = session?.user?.name || ''
    const isBatch = sampleIds.length > 1
    const ITEMS_PER_PAGE = 1

    // 当 dialog 打开时，从 API 获取样本数据
    useEffect(() => {
        async function fetchSampleData() {
            if (!open || sampleIds.length === 0) return

            setFetchingData(true)
            setError(null)

            try {
                // 获取样本详情
                const res = await fetch(`/api/samples?ids=${sampleIds.join(',')}`)
                if (!res.ok) {
                    throw new Error('获取样本信息失败')
                }
                const samples = await res.json()

                if (samples && samples.length > 0) {
                    setLoadedSamples(samples)
                    const first = samples[0]
                    const firstFormData = {
                        name: first.name || '',
                        type: first.type || '',
                        batchNo: first.batchNo || '',
                        quantity: first.quantity || 1,
                        concentration: first.concentration || '',
                        viability: first.viability || 0.95,
                        passage: first.passage || '',
                        media: first.media || '',
                        notes: first.notes || '',
                        sterileCheck: first.sterileCheck || '',
                    }
                    setFormData(firstFormData)
                    // 初始化 formDataList 为每个样本的实际数据
                    setFormDataList(samples.map((s: SampleData) => ({
                        name: s.name || '',
                        type: s.type || '',
                        batchNo: s.batchNo || '',
                        quantity: s.quantity || 1,
                        concentration: s.concentration || '',
                        viability: s.viability || 0.95,
                        passage: s.passage || '',
                        media: s.media || '',
                        notes: s.notes || '',
                        sterileCheck: s.sterileCheck || '',
                    })))
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : '获取样本信息失败')
            } finally {
                setFetchingData(false)
            }
        }

        if (open) {
            fetchSampleData()
        }
    }, [open, sampleIds])

    // 清理
    useEffect(() => {
        if (!open) {
            setLoadedSamples([])
            setFormData({})
            setFormDataList([])
            setError(null)
            setUseSameData(true)
            setCurrentPage(0)
        }
    }, [open])

    const isSameBatch = areSameBatch(loadedSamples)

    // 辅助函数：获取位置标签
    const getLabel = (index: number) => slotLabels[index] || `#${index + 1}`

    // 辅助函数：更新 formDataList 中某行的数据
    const updateRowData = useCallback((index: number, field: keyof EditFormData, value: string | number) => {
        setFormDataList(prev => {
            const newList = [...prev]
            newList[index] = { ...newList[index], [field]: value }
            return newList
        })
    }, [])

    // 辅助函数：复制首行到所有行
    const copyFirstToAll = () => {
        if (formDataList.length > 0) {
            const first = formDataList[0]
            setFormDataList(formDataList.map(() => ({ ...first })))
        }
    }

    // 分页
    const totalPages = Math.ceil(sampleIds.length / ITEMS_PER_PAGE)
    const startIndex = currentPage * ITEMS_PER_PAGE
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, sampleIds.length)
    const currentItems = formDataList.slice(startIndex, endIndex)

    const handleSubmit = async () => {
        if (useSameData) {
            if (!formData.name || !formData.type) {
                setError('请填写样本名称和类型')
                return
            }
        } else {
            // 验证每行数据
            for (let i = 0; i < formDataList.length; i++) {
                if (!formDataList[i].name || !formDataList[i].type) {
                    setError(`位置 ${getLabel(i)} 缺少样本名称或类型`)
                    return
                }
            }
        }

        setLoading(true)
        setError(null)

        try {
            if (useSameData) {
                // 统一修改：所有样本使用相同数据
                const response = await fetch('/api/samples/batch', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sampleIds,
                        updates: {
                            ...formData,
                            unit: 'mL',
                        },
                        userId: currentUser,
                    }),
                })

                if (!response.ok) {
                    const data = await response.json()
                    throw new Error(data.error || '更新失败')
                }
            } else {
                // 依次修改：每个样本使用对应数据
                for (let i = 0; i < sampleIds.length; i++) {
                    const response = await fetch('/api/samples/batch', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            sampleIds: [sampleIds[i]],
                            updates: {
                                ...formDataList[i],
                                unit: 'mL',
                            },
                            userId: currentUser,
                        }),
                    })

                    if (!response.ok) {
                        const data = await response.json()
                        throw new Error(`位置 ${getLabel(i)} 更新失败: ${data.error || '未知错误'}`)
                    }
                }
            }

            onSuccess?.()
            onOpenChange(false)
        } catch (err) {
            setError(err instanceof Error ? err.message : '更新失败')
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        if (!loading) {
            onOpenChange(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className={cn(
                "max-h-[90vh] overflow-y-auto",
                !useSameData && isBatch ? "max-w-4xl" : "max-w-lg"
            )}>
                <DialogHeader>
                    <DialogTitle>
                        {isBatch ? `批量编辑 (${sampleIds.length} 个样本)` : '编辑样本'}
                    </DialogTitle>
                    <DialogDescription>
                        修改样本信息
                        {currentUser && <span className="ml-2 text-primary">操作人: {currentUser}</span>}
                    </DialogDescription>
                </DialogHeader>

                {fetchingData ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">加载样本信息...</span>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div className="px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
                                {error}
                            </div>
                        )}

                        {/* 批量/依次修改切换 */}
                        {isBatch && (
                            <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/50">
                                <Checkbox
                                    id="useSameData"
                                    checked={useSameData}
                                    onCheckedChange={(v) => setUseSameData(!!v)}
                                />
                                <label htmlFor="useSameData" className="text-sm cursor-pointer">
                                    所有样本使用相同的修改（取消勾选可依次修改每个位置）
                                </label>
                            </div>
                        )}

                        {isBatch && !isSameBatch && useSameData && (
                            <div className="flex items-start gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-md text-sm">
                                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-medium text-yellow-800 dark:text-yellow-200">选中的样本不属于同一批次</p>
                                    <p className="text-yellow-700 dark:text-yellow-300 text-xs mt-0.5">
                                        建议取消勾选，依次编辑每个位置
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* 统一修改表单 */}
                        {(useSameData || !isBatch) && (
                            <div className="flex gap-4">
                                {/* 小型盒子预览 - 仅单个编辑时显示 */}
                                {!isBatch && boxRows > 0 && boxCols > 0 && slotLabels.length > 0 && (
                                    <MiniBoxPreview
                                        rows={boxRows}
                                        cols={boxCols}
                                        selectedLabels={slotLabels}
                                    />
                                )}

                                <div className="flex-1 grid gap-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs">样本名称 *</Label>
                                            <EditableSelect
                                                value={formData.name || ''}
                                                onChange={(v) => setFormData(prev => ({ ...prev, name: v }))}
                                                options={presets['CELL_NAME'] || []}
                                                placeholder="选择或输入"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">细胞类型 *</Label>
                                            <EditableSelect
                                                value={formData.type || ''}
                                                onChange={(v) => setFormData(prev => ({ ...prev, type: v }))}
                                                options={presets['CELL_TYPE'] || []}
                                                placeholder="选择或输入"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-4 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs">批次号</Label>
                                            <Input
                                                className="h-8 text-xs"
                                                value={formData.batchNo || ''}
                                                onChange={(e) => setFormData(prev => ({ ...prev, batchNo: e.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">代数</Label>
                                            <EditableSelect
                                                value={formData.passage || ''}
                                                onChange={(v) => setFormData(prev => ({ ...prev, passage: v }))}
                                                options={presets['PASSAGE'] || []}
                                                placeholder="选择"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">体积(mL)</Label>
                                            <Input
                                                className="h-8 text-xs"
                                                type="number"
                                                step="0.1"
                                                value={formData.quantity || 0}
                                                onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">活性(0-1)</Label>
                                            <Input
                                                className="h-8 text-xs"
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="1"
                                                value={formData.viability || 0}
                                                onChange={(e) => setFormData(prev => ({ ...prev, viability: parseFloat(e.target.value) || 0 }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs">浓度</Label>
                                            <EditableSelect
                                                value={formData.concentration || ''}
                                                onChange={(v) => setFormData(prev => ({ ...prev, concentration: v }))}
                                                options={presets['CRYO_DENSITY'] || []}
                                                placeholder="选择"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">冻存液</Label>
                                            <EditableSelect
                                                value={formData.media || ''}
                                                onChange={(v) => setFormData(prev => ({ ...prev, media: v }))}
                                                options={presets['CRYO_MEDIA'] || []}
                                                placeholder="选择"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">无菌验证</Label>
                                            <EditableSelect
                                                value={formData.sterileCheck || ''}
                                                onChange={(v) => setFormData(prev => ({ ...prev, sterileCheck: v }))}
                                                options={presets['STERILE_CHECK'] || []}
                                                placeholder="选择"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <Label className="text-xs">备注</Label>
                                        <Textarea
                                            className="text-xs resize-none"
                                            rows={2}
                                            value={formData.notes || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 依次修改卡片 */}
                        {!useSameData && isBatch && formDataList.length > 0 && (
                            <div className="space-y-3">
                                {/* 工具栏 */}
                                <div className="flex items-center justify-between">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={copyFirstToAll}
                                        className="text-xs"
                                    >
                                        <Copy className="h-3 w-3 mr-1" />
                                        复制首行到所有行
                                    </Button>
                                    <span className="text-xs text-muted-foreground">
                                        共 {sampleIds.length} 个位置
                                    </span>
                                </div>

                                {/* 卡片和预览 */}
                                <div className="flex gap-4">
                                    {/* 小型盒子预览 */}
                                    <MiniBoxPreview
                                        rows={boxRows}
                                        cols={boxCols}
                                        selectedLabels={slotLabels}
                                        currentLabel={getLabel(startIndex)}
                                    />

                                    {/* 卡片 */}
                                    <div className="flex-1">
                                        {currentItems.map((data, localIndex) => {
                                            const globalIndex = startIndex + localIndex
                                            return (
                                                <div key={sampleIds[globalIndex]} className="border rounded-lg p-3 bg-card">
                                                    <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                                                        <span className="text-xs font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded">
                                                            {getLabel(globalIndex)}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {loadedSamples[globalIndex]?.name || '未命名样本'}
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-4 gap-2 mb-2">
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">样本名称 *</Label>
                                                            <EditableSelect
                                                                value={data.name}
                                                                onChange={(v) => updateRowData(globalIndex, 'name', v)}
                                                                options={presets['CELL_NAME'] || []}
                                                                placeholder="样本名称"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">细胞类型 *</Label>
                                                            <EditableSelect
                                                                value={data.type}
                                                                onChange={(v) => updateRowData(globalIndex, 'type', v)}
                                                                options={presets['CELL_TYPE'] || []}
                                                                placeholder="细胞类型"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">批次号</Label>
                                                            <Input
                                                                className="h-8 text-xs"
                                                                value={data.batchNo}
                                                                onChange={(e) => updateRowData(globalIndex, 'batchNo', e.target.value)}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">代数</Label>
                                                            <EditableSelect
                                                                value={data.passage}
                                                                onChange={(v) => updateRowData(globalIndex, 'passage', v)}
                                                                options={presets['PASSAGE'] || []}
                                                                placeholder="代数"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-5 gap-2 mb-2">
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">体积(mL)</Label>
                                                            <Input
                                                                className="h-8 text-xs"
                                                                type="number"
                                                                step="0.1"
                                                                value={data.quantity}
                                                                onChange={(e) => updateRowData(globalIndex, 'quantity', parseFloat(e.target.value) || 0)}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">活性(0-1)</Label>
                                                            <Input
                                                                className="h-8 text-xs"
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                max="1"
                                                                value={data.viability}
                                                                onChange={(e) => updateRowData(globalIndex, 'viability', parseFloat(e.target.value) || 0)}
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">浓度</Label>
                                                            <EditableSelect
                                                                value={data.concentration}
                                                                onChange={(v) => updateRowData(globalIndex, 'concentration', v)}
                                                                options={presets['CRYO_DENSITY'] || []}
                                                                placeholder="浓度"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">冻存液</Label>
                                                            <EditableSelect
                                                                value={data.media}
                                                                onChange={(v) => updateRowData(globalIndex, 'media', v)}
                                                                options={presets['CRYO_MEDIA'] || []}
                                                                placeholder="冻存液"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">无菌验证</Label>
                                                            <EditableSelect
                                                                value={data.sterileCheck}
                                                                onChange={(v) => updateRowData(globalIndex, 'sterileCheck', v)}
                                                                options={presets['STERILE_CHECK'] || []}
                                                                placeholder="选择"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <Label className="text-xs">备注</Label>
                                                        <Textarea
                                                            className="text-xs resize-none"
                                                            rows={2}
                                                            value={data.notes}
                                                            onChange={(e) => updateRowData(globalIndex, 'notes', e.target.value)}
                                                            placeholder="备注信息..."
                                                        />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* 分页 */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                            disabled={currentPage === 0}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <span className="text-sm text-muted-foreground">
                                            {currentPage + 1} / {totalPages}
                                            <span className="ml-2 text-xs">
                                                (显示 {startIndex + 1}-{endIndex} / 共 {sampleIds.length})
                                            </span>
                                        </span>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                                            disabled={currentPage >= totalPages - 1}
                                        >
                                            <ChevronRightIcon className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        <DialogFooter className="sticky bottom-0 bg-background pt-4 mt-4 border-t">
                            <Button variant="outline" onClick={handleClose} disabled={loading}>
                                取消
                            </Button>
                            <Button onClick={handleSubmit} disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {useSameData ? '保存更改' : `保存 ${sampleIds.length} 个样本`}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
