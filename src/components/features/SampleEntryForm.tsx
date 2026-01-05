'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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

const sampleSchema = z.object({
    name: z.string().min(1, '请输入样本名称'),
    type: z.string().min(1, '请选择或输入细胞类型'),
    batchNo: z.string().optional(),
    quantity: z.coerce.number().min(0.1, '数量必须大于0'),
    concentration: z.string().min(1, '请输入浓度'),
    viability: z.coerce.number().min(0).max(1, '活性值必须在0-1之间'),
    passage: z.string().min(1, '请输入代数'),
    media: z.string().optional(),
    notes: z.string().optional(),
    sterileCheck: z.string().optional(),
})

type SampleFormData = z.infer<typeof sampleSchema>

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
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setInputValue(value)
    }, [value])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes(inputValue.toLowerCase())
    )

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value
        setInputValue(newValue)
        onChange(newValue)
        setOpen(true)
    }

    const handleSelect = (option: string) => {
        setInputValue(option)
        onChange(option)
        setOpen(false)
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
                    onClick={() => setOpen(!open)}
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
    const presets = usePresets()

    const currentUser = session?.user?.name || ''

    const form = useForm<SampleFormData>({
        resolver: zodResolver(sampleSchema),
        defaultValues: {
            name: '',
            type: '',
            batchNo: '',
            quantity: 1.0,
            concentration: '',
            viability: 0.95,
            passage: 'P1',
            media: '',
            notes: '',
            sterileCheck: '',
        },
    })

    async function onSubmit(data: SampleFormData) {
        setIsSubmitting(true)
        try {
            const response = await fetch('/api/samples', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    slotId,
                    unit: 'mL',
                    owner: currentUser,
                }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || '入库失败')
            }

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
                        {currentUser && <span className="ml-2 text-primary">操作人: {currentUser}</span>}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            {/* 样本名称 */}
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>样本名称 *</FormLabel>
                                        <FormControl>
                                            <EditableSelect
                                                value={field.value}
                                                onChange={field.onChange}
                                                options={presets['CELL_NAME'] || []}
                                                placeholder="选择或输入"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* 细胞类型 */}
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
                                                options={presets['CELL_TYPE'] || []}
                                                placeholder="选择或输入"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* 批次号 */}
                            <FormField
                                control={form.control}
                                name="batchNo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>批次号</FormLabel>
                                        <FormControl>
                                            <Input placeholder="如: 20260105-01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* 体积 */}
                            <FormField
                                control={form.control}
                                name="quantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>体积 (mL)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.1" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* 活性 */}
                            <FormField
                                control={form.control}
                                name="viability"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>活性 (0-1)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" min="0" max="1" {...field} />
                                        </FormControl>
                                        <FormDescription>0-1 之间的小数</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* 浓度 */}
                            <FormField
                                control={form.control}
                                name="concentration"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>浓度 *</FormLabel>
                                        <FormControl>
                                            <EditableSelect
                                                value={field.value}
                                                onChange={field.onChange}
                                                options={presets['CRYO_DENSITY'] || []}
                                                placeholder="选择或输入"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* 代数 */}
                            <FormField
                                control={form.control}
                                name="passage"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>代数 *</FormLabel>
                                        <FormControl>
                                            <EditableSelect
                                                value={field.value}
                                                onChange={field.onChange}
                                                options={presets['PASSAGE'] || []}
                                                placeholder="选择或输入"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* 冻存液 */}
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
                                                options={presets['CRYO_MEDIA'] || []}
                                                placeholder="选择或输入"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* 无菌验证 */}
                            <FormField
                                control={form.control}
                                name="sterileCheck"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>无菌验证</FormLabel>
                                        <FormControl>
                                            <EditableSelect
                                                value={field.value || ''}
                                                onChange={field.onChange}
                                                options={presets['STERILE_CHECK'] || []}
                                                placeholder="选择"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* 备注 */}
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>备注</FormLabel>
                                    <FormControl>
                                        <Input placeholder="可选备注信息" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

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
