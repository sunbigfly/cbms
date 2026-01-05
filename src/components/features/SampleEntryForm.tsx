'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Plus } from 'lucide-react'

const sampleSchema = z.object({
    name: z.string().min(1, '请输入样本名称'),
    type: z.string().min(1, '请选择细胞类型'),
    batchNo: z.string().optional(),
    quantity: z.coerce.number().min(0.1, '数量必须大于0'),
    unit: z.string().default('ml'),
    concentration: z.string().min(1, '请输入浓度'),
    viability: z.coerce.number().min(0).max(1, '活力值必须在0-1之间'),
    passage: z.string().min(1, '请输入代次'),
    media: z.string().optional(),
    owner: z.string().min(1, '请输入负责人'),
    notes: z.string().optional(),
})

type SampleFormData = z.infer<typeof sampleSchema>

const cellTypes = [
    'CHO-K1',
    'CHO-S',
    'CHO-DG44',
    'HEK293',
    'HEK293T',
    'Vero',
    'SP2/0',
    'NS0',
    'BHK',
    'MDCK',
]

const mediaTypes = [
    'CryoStor CS10',
    'CryoStor CS5',
    'DMSO 10%',
    'DMSO 5%',
    'FBS + DMSO',
]

interface SampleEntryFormProps {
    slotId?: string
    slotLabel?: string
    boxName?: string
    onSuccess?: () => void
}

export function SampleEntryForm({ slotId, slotLabel, boxName, onSuccess }: SampleEntryFormProps) {
    const [open, setOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<SampleFormData>({
        resolver: zodResolver(sampleSchema),
        defaultValues: {
            name: '',
            type: '',
            batchNo: '',
            quantity: 1.0,
            unit: 'ml',
            concentration: '',
            viability: 0.95,
            passage: 'P1',
            media: '',
            owner: '',
            notes: '',
        },
    })

    async function onSubmit(data: SampleFormData) {
        setIsSubmitting(true)
        try {
            const response = await fetch('/api/samples', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, slotId }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || '入库失败')
            }

            console.log('Sample created:', result)
            form.reset()
            setOpen(false)
            onSuccess?.()
        } catch (error) {
            console.error('Error creating sample:', error)
            // TODO: Show error toast
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    新增样本
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>样本入库</DialogTitle>
                    <DialogDescription>
                        {boxName && slotLabel
                            ? `位置: ${boxName} - ${slotLabel}`
                            : '填写样本信息完成入库'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Sample Name */}
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>样本名称 *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="如: CHO-K1" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Cell Type */}
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>细胞类型 *</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="选择类型" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {cellTypes.map((type) => (
                                                    <SelectItem key={type} value={type}>
                                                        {type}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Batch No */}
                            <FormField
                                control={form.control}
                                name="batchNo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>批次号</FormLabel>
                                        <FormControl>
                                            <Input placeholder="如: 2026-01-04" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Passage */}
                            <FormField
                                control={form.control}
                                name="passage"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>代次 *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="如: P3" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Quantity & Unit */}
                            <FormField
                                control={form.control}
                                name="quantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>数量 (ml) *</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.1" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Concentration */}
                            <FormField
                                control={form.control}
                                name="concentration"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>浓度 *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="如: 2.5x10^6" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Viability */}
                            <FormField
                                control={form.control}
                                name="viability"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>活力值 *</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" min="0" max="1" {...field} />
                                        </FormControl>
                                        <FormDescription>0-1 之间的小数</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Media */}
                            <FormField
                                control={form.control}
                                name="media"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>冻存液</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="选择冻存液" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {mediaTypes.map((media) => (
                                                    <SelectItem key={media} value={media}>
                                                        {media}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Owner */}
                            <FormField
                                control={form.control}
                                name="owner"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>负责人 *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="输入负责人姓名" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Notes */}
                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>备注</FormLabel>
                                        <FormControl>
                                            <Input placeholder="可选备注信息" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                取消
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? '提交中...' : '确认入库'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
