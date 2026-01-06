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
import { Loader2, ChevronDown } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'

// 可编辑下拉框组件 - 修复闪烁问题
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

interface BatchCheckInDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    slotIds: string[]
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

export function BatchCheckInDialog({
    open,
    onOpenChange,
    slotIds,
    onSuccess
}: BatchCheckInDialogProps) {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(false)
    const [useSameData, setUseSameData] = useState(true)
    const [formData, setFormData] = useState<SampleFormData>(DEFAULT_FORM_DATA)
    const [error, setError] = useState<string | null>(null)
    const presets = usePresets()

    const isBatch = slotIds.length > 1

    // 获取当前登录用户名
    const currentUser = session?.user?.name || ''

    const handleSubmit = async () => {
        if (!formData.name || !formData.type) {
            setError('请填写样本名称和类型')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const submitData = {
                ...formData,
                unit: 'mL',
                owner: currentUser,
            }

            if (isBatch && useSameData) {
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
                for (const slotId of slotIds) {
                    const response = await fetch('/api/samples', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...submitData,
                            slotId,
                            userId: currentUser,
                        }),
                    })

                    if (!response.ok) {
                        const data = await response.json()
                        throw new Error(data.error || `槽位入库失败`)
                    }
                }
            }

            onSuccess?.()
            onOpenChange(false)
            setFormData(DEFAULT_FORM_DATA)
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
            setError(null)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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

                <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>样本名称 *</Label>
                            <EditableSelect
                                value={formData.name}
                                onChange={(v) => setFormData(prev => ({ ...prev, name: v }))}
                                options={presets['CELL_NAME'] || []}
                                placeholder="选择或输入"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>细胞类型 *</Label>
                            <EditableSelect
                                value={formData.type}
                                onChange={(v) => setFormData(prev => ({ ...prev, type: v }))}
                                options={presets['CELL_TYPE'] || []}
                                placeholder="选择或输入"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>批次号</Label>
                            <Input
                                placeholder="如：20260105-01"
                                value={formData.batchNo}
                                onChange={(e) => setFormData(prev => ({ ...prev, batchNo: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>体积 (mL)</Label>
                            <Input
                                type="number"
                                step="0.1"
                                value={formData.quantity}
                                onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>活性 (0-1)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="1"
                                value={formData.viability}
                                onChange={(e) => setFormData(prev => ({ ...prev, viability: parseFloat(e.target.value) || 0 }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>浓度</Label>
                            <EditableSelect
                                value={formData.concentration}
                                onChange={(v) => setFormData(prev => ({ ...prev, concentration: v }))}
                                options={presets['CRYO_DENSITY'] || []}
                                placeholder="选择或输入"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>代数</Label>
                            <EditableSelect
                                value={formData.passage}
                                onChange={(v) => setFormData(prev => ({ ...prev, passage: v }))}
                                options={presets['PASSAGE'] || []}
                                placeholder="选择或输入"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>冻存液</Label>
                            <EditableSelect
                                value={formData.media}
                                onChange={(v) => setFormData(prev => ({ ...prev, media: v }))}
                                options={presets['CRYO_MEDIA'] || []}
                                placeholder="选择或输入"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>无菌验证</Label>
                        <EditableSelect
                            value={formData.sterileCheck}
                            onChange={(v) => setFormData(prev => ({ ...prev, sterileCheck: v }))}
                            options={presets['STERILE_CHECK'] || []}
                            placeholder="选择"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>备注</Label>
                        <Textarea
                            placeholder="其他备注信息..."
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        />
                    </div>
                </div>

                <DialogFooter>
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
