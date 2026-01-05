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
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

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
    unit: string
    concentration: string
    viability: number
    passage: string
    media: string
    owner: string
    notes: string
}

const DEFAULT_FORM_DATA: SampleFormData = {
    name: '',
    type: '',
    batchNo: '',
    quantity: 1,
    unit: 'ml',
    concentration: '',
    viability: 0.95,
    passage: 'P1',
    media: '',
    owner: '',
    notes: '',
}

export function BatchCheckInDialog({
    open,
    onOpenChange,
    slotIds,
    onSuccess
}: BatchCheckInDialogProps) {
    const [loading, setLoading] = useState(false)
    const [useSameData, setUseSameData] = useState(true)
    const [formData, setFormData] = useState<SampleFormData>(DEFAULT_FORM_DATA)
    const [error, setError] = useState<string | null>(null)

    const isBatch = slotIds.length > 1

    const handleSubmit = async () => {
        if (!formData.name || !formData.type) {
            setError('请填写样本名称和类型')
            return
        }

        setLoading(true)
        setError(null)

        try {
            if (isBatch && useSameData) {
                // Batch check-in with same data
                const response = await fetch('/api/samples', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...formData,
                        slotIds,
                        userId: 'system', // TODO: get from auth
                    }),
                })

                if (!response.ok) {
                    const data = await response.json()
                    throw new Error(data.error || '入库失败')
                }
            } else {
                // Single check-in or user wants individual editing
                for (const slotId of slotIds) {
                    const response = await fetch('/api/samples', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...formData,
                            slotId,
                            userId: 'system',
                        }),
                    })

                    if (!response.ok) {
                        const data = await response.json()
                        throw new Error(data.error || `槽位 ${slotId} 入库失败`)
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
                            所有位置使用相同的样本数据（批量入库同类细胞）
                        </Label>
                    </div>
                )}

                <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">样本名称 *</Label>
                            <Input
                                id="name"
                                placeholder="如：CHO-K1"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="type">细胞类型 *</Label>
                            <Input
                                id="type"
                                placeholder="如：Chinese Hamster Ovary"
                                value={formData.type}
                                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="batchNo">批次号</Label>
                            <Input
                                id="batchNo"
                                placeholder="如：20260105-01"
                                value={formData.batchNo}
                                onChange={(e) => setFormData(prev => ({ ...prev, batchNo: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="owner">负责人 *</Label>
                            <Input
                                id="owner"
                                placeholder="如：王海燕"
                                value={formData.owner}
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
                                value={formData.quantity}
                                onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="unit">单位</Label>
                            <Input
                                id="unit"
                                placeholder="ml"
                                value={formData.unit}
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
                                value={formData.viability}
                                onChange={(e) => setFormData(prev => ({ ...prev, viability: parseFloat(e.target.value) || 0 }))}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="concentration">浓度</Label>
                            <Input
                                id="concentration"
                                placeholder="如：2.8x10^6"
                                value={formData.concentration}
                                onChange={(e) => setFormData(prev => ({ ...prev, concentration: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="passage">代次</Label>
                            <Input
                                id="passage"
                                placeholder="如：P1"
                                value={formData.passage}
                                onChange={(e) => setFormData(prev => ({ ...prev, passage: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="media">培养基</Label>
                        <Input
                            id="media"
                            placeholder="如：CryoStor"
                            value={formData.media}
                            onChange={(e) => setFormData(prev => ({ ...prev, media: e.target.value }))}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">备注</Label>
                        <Textarea
                            id="notes"
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
