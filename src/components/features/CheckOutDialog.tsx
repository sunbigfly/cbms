'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, FlaskConical } from 'lucide-react'

type CheckOutReason = 'EXPERIMENT' | 'DESTROY' | 'TRANSFER'

interface CheckOutDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    sample?: {
        id: string
        name: string
        type: string
        location: string
    }
    onConfirm: (reason: CheckOutReason, notes?: string) => void
}

const reasons: { value: CheckOutReason; label: string; description: string }[] = [
    { value: 'EXPERIMENT', label: '实验使用', description: '样本将用于实验' },
    { value: 'TRANSFER', label: '转移', description: '样本将转移到其他位置或机构' },
    { value: 'DESTROY', label: '销毁', description: '样本过期或需要销毁' },
]

export function CheckOutDialog({ open, onOpenChange, sample, onConfirm }: CheckOutDialogProps) {
    const [reason, setReason] = useState<CheckOutReason>('EXPERIMENT')
    const [notes, setNotes] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleConfirm = async () => {
        setIsSubmitting(true)
        try {
            await new Promise(resolve => setTimeout(resolve, 300))
            onConfirm(reason, notes)
            setReason('EXPERIMENT')
            setNotes('')
            onOpenChange(false)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!sample) return null

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FlaskConical className="h-5 w-5 text-destructive" />
                        样本出库确认
                    </DialogTitle>
                    <DialogDescription>
                        请确认出库原因，操作后无法撤销
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Sample Info */}
                    <div className="p-3 rounded-lg bg-muted">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">{sample.name}</p>
                                <p className="text-sm text-muted-foreground">{sample.type}</p>
                            </div>
                            <Badge variant="outline">{sample.location}</Badge>
                        </div>
                    </div>

                    {/* Reason Selection */}
                    <div className="space-y-2">
                        <Label>出库原因 *</Label>
                        <Select value={reason} onValueChange={(v) => setReason(v as CheckOutReason)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {reasons.map((r) => (
                                    <SelectItem key={r.value} value={r.value}>
                                        <div>
                                            <p className="font-medium">{r.label}</p>
                                            <p className="text-xs text-muted-foreground">{r.description}</p>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label>备注</Label>
                        <Input
                            placeholder="可选：添加备注信息"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    {/* Warning for Destroy */}
                    {reason === 'DESTROY' && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-medium">警告：销毁操作</p>
                                <p>此操作将永久删除样本记录，请确认已完成必要的归档。</p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        取消
                    </Button>
                    <Button
                        variant={reason === 'DESTROY' ? 'destructive' : 'default'}
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? '处理中...' : '确认出库'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
