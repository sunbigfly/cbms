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
import { useState, useEffect } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'

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
}

interface BatchEditDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    sampleIds: string[]
    samples?: SampleData[]
    onSuccess?: () => void
}

// Check if samples are from the same batch (all fields match except timestamps)
function areSameBatch(samples: SampleData[]): boolean {
    if (samples.length <= 1) return true

    const first = samples[0]
    return samples.every(s =>
        s.name === first.name &&
        s.type === first.type &&
        s.batchNo === first.batchNo &&
        s.quantity === first.quantity &&
        s.unit === first.unit &&
        s.concentration === first.concentration &&
        s.viability === first.viability &&
        s.passage === first.passage &&
        s.media === first.media &&
        s.owner === first.owner
    )
}

interface EditFormData {
    name: string
    type: string
    batchNo: string
    quantity: number
    unit: string
    concentration: string
    viability: number
    passage: string
    media: string
    owner: string
    notes: string
}

export function BatchEditDialog({
    open,
    onOpenChange,
    sampleIds,
    samples = [],
    onSuccess
}: BatchEditDialogProps) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loadedSamples, setLoadedSamples] = useState<SampleData[]>([])
    const [formData, setFormData] = useState<Partial<EditFormData>>({})

    // Load sample data
    // Use sampleIdsKey to prevent infinite loops from array reference changes
    const sampleIdsKey = sampleIds.join(',')
    useEffect(() => {
        if (open && samples.length > 0) {
            setLoadedSamples(samples)
            // Pre-fill form with first sample's data
            const first = samples[0]
            setFormData({
                name: first.name,
                type: first.type,
                batchNo: first.batchNo || '',
                quantity: first.quantity || 0,
                unit: first.unit || 'ml',
                concentration: first.concentration || '',
                viability: first.viability || 0,
                passage: first.passage || '',
                media: first.media || '',
                owner: first.owner || '',
                notes: first.notes || '',
            })
        } else if (open && sampleIds.length > 0) {
            // TODO: Fetch samples from API
            setLoadedSamples([])
        }
        // Reset when dialog closes
        if (!open) {
            setLoadedSamples([])
            setFormData({})
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, sampleIdsKey]) // Intentionally using sampleIdsKey to prevent loops

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
                    updates: formData,
                    userId: 'system',
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
            setFormData({})
            setError(null)
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
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <div className="px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
                        {error}
                    </div>
                )}

                {/* Warning for different batches */}
                {isBatch && !isSameBatch && (
                    <div className="flex items-start gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-md text-sm">
                        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-medium text-yellow-800 dark:text-yellow-200">选中的样本不属于同一批次</p>
                            <p className="text-yellow-700 dark:text-yellow-300 text-xs mt-0.5">
                                建议逐个编辑，或仅修改需要统一更新的字段
                            </p>
                        </div>
                    </div>
                )}

                <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">样本名称 *</Label>
                            <Input
                                id="name"
                                value={formData.name || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="type">细胞类型 *</Label>
                            <Input
                                id="type"
                                value={formData.type || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="batchNo">批次号</Label>
                            <Input
                                id="batchNo"
                                value={formData.batchNo || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, batchNo: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="owner">负责人</Label>
                            <Input
                                id="owner"
                                value={formData.owner || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, owner: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="quantity">体积</Label>
                            <Input
                                id="quantity"
                                type="number"
                                step="0.1"
                                value={formData.quantity || 0}
                                onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="unit">单位</Label>
                            <Input
                                id="unit"
                                value={formData.unit || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="viability">活力</Label>
                            <Input
                                id="viability"
                                type="number"
                                step="0.01"
                                min="0"
                                max="1"
                                value={formData.viability || 0}
                                onChange={(e) => setFormData(prev => ({ ...prev, viability: parseFloat(e.target.value) || 0 }))}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="concentration">浓度</Label>
                            <Input
                                id="concentration"
                                value={formData.concentration || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, concentration: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="passage">代次</Label>
                            <Input
                                id="passage"
                                value={formData.passage || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, passage: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="media">培养基</Label>
                        <Input
                            id="media"
                            value={formData.media || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, media: e.target.value }))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">备注</Label>
                        <Textarea
                            id="notes"
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
            </DialogContent>
        </Dialog>
    )
}
