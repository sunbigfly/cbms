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
import { Checkbox } from '@/components/ui/checkbox'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2, ChevronDown, Copy, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { MiniBoxPreview } from './MiniBoxPreview'

// 可编辑下拉框组件 - 修复闪烁问题
interface EditableSelectProps {
    value: string
    onChange: (value: string) => void
    options: string[]
    placeholder: string
    compact?: boolean  // 紧凑模式用于表格
}

function EditableSelect({ value, onChange, options, placeholder, compact }: EditableSelectProps) {
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
                    className={cn("pr-8", compact && "h-8 text-xs")}
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

interface BatchCheckInDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    slotIds: string[]
    slotLabels?: string[]  // 位置标签（如 A1, B2）
    boxRows?: number       // 盒子行数
    boxCols?: number       // 盒子列数  
    locationInfo?: {
        libraryName?: string
        rackName?: string
        boxName?: string
    }
    onSuccess?: () => void
}

interface SampleFormData {
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

const DEFAULT_FORM_DATA: SampleFormData = {
    name: '',
    type: '',
    batchNo: '',
    quantity: 1,
    concentration: '',
    viability: 0.95,
    passage: 'P1',
    media: '',
    notes: '',
    sterileCheck: '',
}

// 单行卡片编辑组件（显示全部字段）
interface CardRowProps {
    index: number
    label: string
    data: SampleFormData
    onChange: (index: number, data: SampleFormData) => void
    presets: Record<string, string[]>
}

function CardRow({ index, label, data, onChange, presets }: CardRowProps) {
    const updateField = <K extends keyof SampleFormData>(field: K, value: SampleFormData[K]) => {
        onChange(index, { ...data, [field]: value })
    }

    return (
        <div className="border rounded-lg p-3 bg-card hover:bg-muted/30 transition-colors">
            {/* 位置标签 */}
            <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                <span className="text-xs font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded">
                    {label}
                </span>
            </div>

            {/* 第一行：核心字段 */}
            <div className="grid grid-cols-4 gap-2 mb-2">
                <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">样本名称 *</label>
                    <EditableSelect
                        value={data.name}
                        onChange={(v) => updateField('name', v)}
                        options={presets['CELL_NAME'] || []}
                        placeholder="样本名称"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">细胞类型 *</label>
                    <EditableSelect
                        value={data.type}
                        onChange={(v) => updateField('type', v)}
                        options={presets['CELL_TYPE'] || []}
                        placeholder="细胞类型"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">批次号</label>
                    <Input
                        value={data.batchNo}
                        onChange={(e) => updateField('batchNo', e.target.value)}
                        placeholder="批次号"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">代数</label>
                    <EditableSelect
                        value={data.passage}
                        onChange={(v) => updateField('passage', v)}
                        options={presets['PASSAGE'] || []}
                        placeholder="代数"
                    />
                </div>
            </div>

            {/* 第二行：次要字段 */}
            <div className="grid grid-cols-5 gap-2 mb-2">
                <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">体积(mL)</label>
                    <Input
                        type="number"
                        step="0.1"
                        value={data.quantity}
                        onChange={(e) => updateField('quantity', parseFloat(e.target.value) || 0)}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">活性(0-1)</label>
                    <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={data.viability}
                        onChange={(e) => updateField('viability', parseFloat(e.target.value) || 0)}
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">浓度</label>
                    <EditableSelect
                        value={data.concentration}
                        onChange={(v) => updateField('concentration', v)}
                        options={presets['CRYO_DENSITY'] || []}
                        placeholder="浓度"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">冻存液</label>
                    <EditableSelect
                        value={data.media}
                        onChange={(v) => updateField('media', v)}
                        options={presets['CRYO_MEDIA'] || []}
                        placeholder="冻存液"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground">无菌验证</label>
                    <EditableSelect
                        value={data.sterileCheck}
                        onChange={(v) => updateField('sterileCheck', v)}
                        options={presets['STERILE_CHECK'] || []}
                        placeholder="选择"
                    />
                </div>
            </div>

            {/* 第三行：备注 */}
            <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">备注</label>
                <Input
                    value={data.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder="备注信息..."
                />
            </div>
        </div>
    )
}


export function BatchCheckInDialog({
    open,
    onOpenChange,
    slotIds,
    slotLabels,
    boxRows = 9,
    boxCols = 9,
    locationInfo,
    onSuccess
}: BatchCheckInDialogProps) {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(false)
    const [useSameData, setUseSameData] = useState(true)
    const [formData, setFormData] = useState<SampleFormData>(DEFAULT_FORM_DATA)
    const [formDataList, setFormDataList] = useState<SampleFormData[]>([])
    const [error, setError] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(0)
    const presets = usePresets()

    const isBatch = slotIds.length > 1
    const ITEMS_PER_PAGE = 1  // 每页只显示1个，无需滚动

    // 获取当前登录用户名
    const currentUser = session?.user?.name || ''

    // 初始化 formDataList
    useEffect(() => {
        if (open && slotIds.length > 0 && !useSameData) {
            setFormDataList(slotIds.map(() => ({ ...DEFAULT_FORM_DATA })))
            setCurrentPage(0)
        }
    }, [open, slotIds, useSameData])

    // 获取位置标签
    const getLabel = (index: number) => {
        if (slotLabels && slotLabels[index]) {
            return slotLabels[index]
        }
        return `#${index + 1}`
    }

    // 复制首行到所有行
    const copyFirstToAll = () => {
        if (formDataList.length > 0) {
            const firstRow = formDataList[0]
            setFormDataList(formDataList.map(() => ({ ...firstRow })))
        }
    }

    // 更新单行数据
    const updateRowData = (index: number, data: SampleFormData) => {
        setFormDataList(prev => {
            const newList = [...prev]
            newList[index] = data
            return newList
        })
    }

    const handleSubmit = async () => {
        if (useSameData) {
            if (!formData.name || !formData.type) {
                setError('请填写样本名称和类型')
                return
            }
        } else {
            // 检查所有行是否填写完整
            const incomplete = formDataList.findIndex(d => !d.name || !d.type)
            if (incomplete !== -1) {
                setError(`第 ${incomplete + 1} 行（${getLabel(incomplete)}）未填写样本名称或类型`)
                return
            }
        }

        setLoading(true)
        setError(null)

        try {
            if (useSameData) {
                const submitData = {
                    ...formData,
                    unit: 'mL',
                    owner: currentUser,
                }

                const response = await fetch('/api/samples', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...submitData,
                        slotIds,
                        userId: currentUser,
                    }),
                })

                if (!response.ok) {
                    const data = await response.json()
                    throw new Error(data.error || '入库失败')
                }
            } else {
                // 逐个提交不同的数据
                for (let i = 0; i < slotIds.length; i++) {
                    const submitData = {
                        ...formDataList[i],
                        unit: 'mL',
                        owner: currentUser,
                    }

                    const response = await fetch('/api/samples', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...submitData,
                            slotId: slotIds[i],
                            userId: currentUser,
                        }),
                    })

                    if (!response.ok) {
                        const data = await response.json()
                        throw new Error(data.error || `位置 ${getLabel(i)} 入库失败`)
                    }
                }
            }

            onSuccess?.()
            onOpenChange(false)
            setFormData(DEFAULT_FORM_DATA)
            setFormDataList([])
        } catch (err) {
            setError(err instanceof Error ? err.message : '入库失败')
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        if (!loading) {
            onOpenChange(false)
            setFormData(DEFAULT_FORM_DATA)
            setFormDataList([])
            setError(null)
        }
    }

    // 分页
    const totalPages = Math.ceil(slotIds.length / ITEMS_PER_PAGE)
    const startIndex = currentPage * ITEMS_PER_PAGE
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, slotIds.length)
    const currentItems = formDataList.slice(startIndex, endIndex)

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className={cn(
                "max-h-[85vh] overflow-y-auto",
                !useSameData && isBatch ? "max-w-4xl" : "max-w-[40rem]"
            )}>
                <DialogHeader>
                    <DialogTitle>
                        {isBatch ? `批量入库 (${slotIds.length} 个位置)` : '样本入库'}
                    </DialogTitle>
                    <DialogDescription>
                        {isBatch
                            ? '为选中的空闲位置添加样本数据'
                            : '填写样本信息进行入库'
                        }
                        {currentUser && <span className="ml-2 text-primary">操作人: {currentUser}</span>}
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <div className="px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
                        {error}
                    </div>
                )}

                {isBatch && (
                    <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                        <Checkbox
                            id="useSameData"
                            checked={useSameData}
                            onCheckedChange={(checked) => setUseSameData(checked === true)}
                        />
                        <Label htmlFor="useSameData" className="text-sm cursor-pointer">
                            所有位置使用相同的样本数据
                        </Label>
                    </div>
                )}

                {/* 统一数据表单（原有） */}
                {(useSameData || !isBatch) && (
                    <div className="grid gap-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">样本名称 *</Label>
                                <EditableSelect
                                    value={formData.name}
                                    onChange={(v) => setFormData(prev => ({ ...prev, name: v }))}
                                    options={presets['CELL_NAME'] || []}
                                    placeholder="选择或输入"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">细胞类型 *</Label>
                                <EditableSelect
                                    value={formData.type}
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
                                    placeholder="20260105-01"
                                    value={formData.batchNo}
                                    onChange={(e) => setFormData(prev => ({ ...prev, batchNo: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">体积(mL)</Label>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">活性(0-1)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="1"
                                    value={formData.viability}
                                    onChange={(e) => setFormData(prev => ({ ...prev, viability: parseFloat(e.target.value) || 0 }))}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">代数</Label>
                                <EditableSelect
                                    value={formData.passage}
                                    onChange={(v) => setFormData(prev => ({ ...prev, passage: v }))}
                                    options={presets['PASSAGE'] || []}
                                    placeholder="选择"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">浓度</Label>
                                <EditableSelect
                                    value={formData.concentration}
                                    onChange={(v) => setFormData(prev => ({ ...prev, concentration: v }))}
                                    options={presets['CRYO_DENSITY'] || []}
                                    placeholder="选择或输入"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">冻存液</Label>
                                <EditableSelect
                                    value={formData.media}
                                    onChange={(v) => setFormData(prev => ({ ...prev, media: v }))}
                                    options={presets['CRYO_MEDIA'] || []}
                                    placeholder="选择或输入"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">无菌验证</Label>
                                <EditableSelect
                                    value={formData.sterileCheck}
                                    onChange={(v) => setFormData(prev => ({ ...prev, sterileCheck: v }))}
                                    options={presets['STERILE_CHECK'] || []}
                                    placeholder="选择"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs">备注</Label>
                            <Input
                                placeholder="其他备注信息..."
                                value={formData.notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            />
                        </div>
                    </div>
                )}

                {/* 卡片式多行编辑（新增） */}
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

                        </div>

                        {/* 卡片和预览 */}
                        <div className="flex gap-4">
                            {/* 小型盒子预览 */}
                            <MiniBoxPreview
                                rows={boxRows}
                                cols={boxCols}
                                selectedLabels={slotLabels || []}
                                currentLabel={getLabel(startIndex)}
                                locationInfo={locationInfo}
                            />

                            {/* 卡片列表 */}
                            <div className="flex-1 space-y-2">
                                {currentItems.map((data, localIndex) => {
                                    const globalIndex = startIndex + localIndex
                                    return (
                                        <CardRow
                                            key={slotIds[globalIndex]}
                                            index={globalIndex}
                                            label={getLabel(globalIndex)}
                                            data={data}
                                            onChange={updateRowData}
                                            presets={presets}
                                        />
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
                                    onClick={() => setCurrentPage(p => (p - 1 + totalPages) % totalPages)}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    {currentPage + 1} / {totalPages}
                                </span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => (p + 1) % totalPages)}
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
                        {isBatch ? `入库 ${slotIds.length} 个样本` : '确认入库'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
