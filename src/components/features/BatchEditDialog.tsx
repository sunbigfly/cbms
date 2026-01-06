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
import { Loader2, AlertCircle, ChevronDown } from 'lucide-react'
import { useSession } from 'next-auth/react'

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
    onSuccess
}: BatchEditDialogProps) {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(false)
    const [fetchingData, setFetchingData] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loadedSamples, setLoadedSamples] = useState<SampleData[]>([])
    const [formData, setFormData] = useState<Partial<EditFormData>>({})
    const presets = usePresets()

    const currentUser = session?.user?.name || ''

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
                    setFormData({
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
                    })
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
            setError(null)
        }
    }, [open])

    const isBatch = sampleIds.length > 1
    const isSameBatch = areSameBatch(loadedSamples)

    const handleSubmit = async () => {
        if (!formData.name || !formData.type) {
            setError('请填写样本名称和类型')
            return
        }

        setLoading(true)
        setError(null)

        try {
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
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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

                        {isBatch && !isSameBatch && (
                            <div className="flex items-start gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-md text-sm">
                                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-medium text-yellow-800 dark:text-yellow-200">选中的样本不属于同一批次</p>
                                    <p className="text-yellow-700 dark:text-yellow-300 text-xs mt-0.5">
                                        建议逐个编辑
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="grid gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>样本名称 *</Label>
                                    <EditableSelect
                                        value={formData.name || ''}
                                        onChange={(v) => setFormData(prev => ({ ...prev, name: v }))}
                                        options={presets['CELL_NAME'] || []}
                                        placeholder="选择或输入"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>细胞类型 *</Label>
                                    <EditableSelect
                                        value={formData.type || ''}
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
                                        value={formData.batchNo || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, batchNo: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>体积 (mL)</Label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={formData.quantity || 0}
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
                                        value={formData.viability || 0}
                                        onChange={(e) => setFormData(prev => ({ ...prev, viability: parseFloat(e.target.value) || 0 }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>浓度</Label>
                                    <EditableSelect
                                        value={formData.concentration || ''}
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
                                        value={formData.passage || ''}
                                        onChange={(v) => setFormData(prev => ({ ...prev, passage: v }))}
                                        options={presets['PASSAGE'] || []}
                                        placeholder="选择或输入"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>冻存液</Label>
                                    <EditableSelect
                                        value={formData.media || ''}
                                        onChange={(v) => setFormData(prev => ({ ...prev, media: v }))}
                                        options={presets['CRYO_MEDIA'] || []}
                                        placeholder="选择或输入"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>无菌验证</Label>
                                <EditableSelect
                                    value={formData.sterileCheck || ''}
                                    onChange={(v) => setFormData(prev => ({ ...prev, sterileCheck: v }))}
                                    options={presets['STERILE_CHECK'] || []}
                                    placeholder="选择"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>备注</Label>
                                <Textarea
                                    value={formData.notes || ''}
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
                                保存更改
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
