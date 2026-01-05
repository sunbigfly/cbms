'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSession } from 'next-auth/react'
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
import { Plus, ChevronDown } from 'lucide-react'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const sampleSchema = z.object({
    name: z.string().min(1, '请输入样本名称'),
    type: z.string().min(1, '请选择或输入细胞类型'),
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

// 预设细胞类型
const cellTypePresets = [
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

// 预设冻存液类型
const mediaTypePresets = [
    'CryoStor CS10',
    'CryoStor CS5',
    'DMSO 10%',
    'DMSO 5%',
    'FBS + DMSO',
]

// 可编辑下拉框组件
interface EditableSelectProps {
    value: string
    onChange: (value: string) => void
    options: string[]
    placeholder: string
    className?: string
}

function EditableSelect({ value, onChange, options, placeholder, className }: EditableSelectProps) {
    const [open, setOpen] = useState(false)
    const [inputValue, setInputValue] = useState(value)

    // 同步外部值
    useEffect(() => {
        setInputValue(value)
    }, [value])

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(inputValue.toLowerCase())
    )

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value
        setInputValue(newValue)
        onChange(newValue)
    }

    const handleSelect = (option: string) => {
        setInputValue(option)
        onChange(option)
        setOpen(false)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div className={cn("relative", className)}>
                    <Input
                        value={inputValue}
                        onChange={handleInputChange}
                        onFocus={() => setOpen(true)}
                        placeholder={placeholder}
                        className="pr-8"
                    />
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
                <div className="max-h-48 overflow-y-auto">
                    {filteredOptions.length === 0 ? (
                        <div className="py-2 px-3 text-sm text-muted-foreground">
                            无匹配项，直接输入自定义值
                        </div>
                    ) : (
                        filteredOptions.map((option) => (
                            <div
                                key={option}
                                className="py-2 px-3 text-sm cursor-pointer hover:bg-accent"
                                onClick={() => handleSelect(option)}
                            >
                                {option}
                            </div>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}

interface SampleEntryFormProps {
    slotId?: string
    slotLabel?: string
    boxName?: string
    onSuccess?: () => void
}

export function SampleEntryForm({ slotId, slotLabel, boxName, onSuccess }: SampleEntryFormProps) {
    const { data: session } = useSession()
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

    // 当对话框打开时，自动填充当前登录用户
    useEffect(() => {
        if (open && session?.user?.name) {
            form.setValue('owner', session.user.name)
        }
    }, [open, session, form])

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

                            {/* Cell Type - Editable Select */}
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>细胞类型 *</FormLabel>
                                        <FormControl>
                                            <EditableSelect
                                                value={field.value}
                                                onChange={field.onChange}
                                                options={cellTypePresets}
                                                placeholder="选择或输入细胞类型"
                                            />
                                        </FormControl>
                                        <FormDescription>可选择预设或输入自定义类型</FormDescription>
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

                            {/* Media - Editable Select */}
                            <FormField
                                control={form.control}
                                name="media"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>冻存液</FormLabel>
                                        <FormControl>
                                            <EditableSelect
                                                value={field.value || ''}
                                                onChange={field.onChange}
                                                options={mediaTypePresets}
                                                placeholder="选择或输入冻存液"
                                            />
                                        </FormControl>
                                        <FormDescription>可选择预设或输入自定义</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Owner - Auto-filled with current user */}
                            <FormField
                                control={form.control}
                                name="owner"
                                render={({ field }) => (
                                    <FormItem className="col-span-2">
                                        <FormLabel>负责人 *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="输入负责人姓名" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            {session?.user?.name ? '已自动填充当前登录用户' : '请输入负责人姓名'}
                                        </FormDescription>
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
