'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Database, ArrowRight, ArrowLeft, Check, Lock } from 'lucide-react'

const facilitySchema = z.object({
    name: z.string().min(1, '请输入细胞库名称'),
    type: z.string().min(1, '请选择细胞库类型'),
    description: z.string().optional(),
    isPrivate: z.boolean().default(false),
    rackCount: z.coerce.number().min(1, '至少需要1个扇/提').max(20, '最多20个扇/提'),
    shelvesPerRack: z.coerce.number().min(1, '至少需要1层').max(10, '最多10层'),
    boxesPerShelf: z.coerce.number().min(1, '至少需要1个盒子').max(10, '最多10个盒子'),
    boxRows: z.coerce.number().min(1, '至少1行').max(20, '最多20行'),
    boxCols: z.coerce.number().min(1, '至少1列').max(20, '最多20列'),
})

type FacilityFormData = z.infer<typeof facilitySchema>

const facilityTypes = [
    { value: 'FREEZER_NEG80', label: '-80°C 冷冻库' },
    { value: 'FREEZER_NEG20', label: '-20°C 冷冻库' },
    { value: 'LN2_TANK', label: '液氮罐' },
    { value: 'REFRIGERATOR', label: '4°C 冰箱' },
]

// 盒子规格预设类型
interface BoxSizePreset {
    value: string
    label: string
    rows: number
    cols: number
}

// 默认预设（用于 API 加载前和自定义选项）
const defaultBoxSizePresets: BoxSizePreset[] = [
    { value: 'custom', label: '自定义', rows: 0, cols: 0 },
]

interface CreateFacilityWizardProps {
    onSuccess?: () => void
    forcePrivate?: boolean // 强制创建为私有库
    embedded?: boolean // 嵌入模式，不渲染自己的 Dialog
}

export function CreateFacilityWizard({ onSuccess, forcePrivate = false, embedded = false }: CreateFacilityWizardProps) {
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [boxSizePreset, setBoxSizePreset] = useState('9x9') // 默认选择 9x9
    const [boxSizePresets, setBoxSizePresets] = useState<BoxSizePreset[]>(defaultBoxSizePresets)

    // 从 API 加载盒子规格预设
    useEffect(() => {
        async function loadPresets() {
            try {
                const res = await fetch('/api/presets?category=BOX_SIZE')
                if (res.ok) {
                    const data = await res.json()
                    // API 返回的是 Prisma 对象数组: Array<{ category: string, value: string, ... }>
                    if (Array.isArray(data) && data.length > 0) {
                        const presets: BoxSizePreset[] = data.map((item: { value: string }) => {
                            const [rows, cols] = item.value.split('x').map(Number)
                            return {
                                value: item.value,
                                label: `${rows}×${cols}`,
                                rows,
                                cols,
                            }
                        })
                        // 添加自定义选项
                        presets.push({ value: 'custom', label: '自定义', rows: 0, cols: 0 })
                        setBoxSizePresets(presets)

                        // 尝试保持之前的选择或默认值
                        if (presets.find(p => p.value === '9x9')) {
                            setBoxSizePreset('9x9')
                        } else {
                            setBoxSizePreset(presets[0]?.value || 'custom')
                        }
                    }
                }
            } catch (error) {
                console.error('Failed to load presets:', error)
            }
        }
        loadPresets()
    }, [])

    const form = useForm<FacilityFormData>({
        resolver: zodResolver(facilitySchema),
        defaultValues: {
            name: '',
            type: '',
            description: '',
            isPrivate: forcePrivate, // 如果 forcePrivate 则默认为 true
            rackCount: 4,
            shelvesPerRack: 5,
            boxesPerShelf: 1,
            boxRows: 9,
            boxCols: 9,
        },
    })

    const watchedValues = form.watch()
    const totalSlots = watchedValues.rackCount *
        watchedValues.shelvesPerRack *
        watchedValues.boxesPerShelf *
        watchedValues.boxRows *
        watchedValues.boxCols

    async function onSubmit(data: FacilityFormData) {
        setIsSubmitting(true)
        try {
            const response = await fetch('/api/facilities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || '创建失败')
            }

            console.log('Facility created:', result)
            form.reset()
            setBoxSizePreset('9x9')
            setStep(1)
            setOpen(false)
            onSuccess?.()
        } catch (error) {
            console.error('Error creating facility:', error)
            // TODO: Show error toast
        } finally {
            setIsSubmitting(false)
        }
    }

    const nextStep = async () => {
        if (step === 1) {
            const valid = await form.trigger(['name', 'type'])
            if (valid) setStep(2)
        } else if (step === 2) {
            const valid = await form.trigger(['rackCount', 'shelvesPerRack', 'boxesPerShelf'])
            if (valid) setStep(3)
        }
    }

    const prevStep = () => {
        if (step > 1) setStep(step - 1)
    }

    // 表单内容
    const formContent = (
        <>
            {/* Progress */}
            <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                    <span>步骤 {step} / 3</span>
                    <span>{Math.round((step / 3) * 100)}%</span>
                </div>
                <Progress value={(step / 3) * 100} className="h-2" />
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                    {/* Step 1: Basic Info */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>细胞库名称 *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="如: Master Cell Bank" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>细胞库类型 *</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="选择类型" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {facilityTypes.map((type) => (
                                                    <SelectItem key={type.value} value={type.value}>
                                                        {type.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>描述</FormLabel>
                                        <FormControl>
                                            <Input placeholder="可选描述信息" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* 仅在非强制私有模式下显示私有库选项 */}
                            {!forcePrivate && (
                                <FormField
                                    control={form.control}
                                    name="isPrivate"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel className="flex items-center gap-1.5">
                                                    <Lock className="h-4 w-4" />
                                                    创建为私有库
                                                </FormLabel>
                                                <FormDescription>
                                                    私有库只有您自己可以访问，不会出现在公共库列表中
                                                </FormDescription>
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>
                    )}

                    {/* Step 2: Structure */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="rackCount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>扇/提数</FormLabel>
                                            <FormControl>
                                                <Input type="number" min="1" max="20" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="shelvesPerRack"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>每架层数</FormLabel>
                                            <FormControl>
                                                <Input type="number" min="1" max="10" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="boxesPerShelf"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>每层盒数</FormLabel>
                                            <FormControl>
                                                <Input type="number" min="1" max="10" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* 盒子规格选择 */}
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-sm font-medium">盒子规格</Label>
                                    <Select
                                        value={boxSizePreset}
                                        onValueChange={(value) => {
                                            setBoxSizePreset(value)
                                            const preset = boxSizePresets.find(p => p.value === value)
                                            if (preset && value !== 'custom') {
                                                form.setValue('boxRows', preset.rows)
                                                form.setValue('boxCols', preset.cols)
                                            }
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="选择盒子规格" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {boxSizePresets.map((preset) => (
                                                <SelectItem key={preset.value} value={preset.value}>
                                                    {preset.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {boxSizePreset === 'custom' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="boxRows"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>行数</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" min="1" max="20" {...field} />
                                                    </FormControl>
                                                    <FormDescription>范围 1-20</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="boxCols"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>列数</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" min="1" max="20" {...field} />
                                                    </FormControl>
                                                    <FormDescription>范围 1-20</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Confirm */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <Card>
                                <CardContent className="pt-4 space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">细胞库名称</span>
                                        <span className="font-medium">{watchedValues.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">细胞库类型</span>
                                        <Badge variant="outline">
                                            {facilityTypes.find(t => t.value === watchedValues.type)?.label}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">库类型</span>
                                        <Badge variant={watchedValues.isPrivate ? 'default' : 'secondary'}>
                                            {watchedValues.isPrivate ? '私有库' : '公共库'}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">存储结构</span>
                                        <span>
                                            {watchedValues.rackCount} 架 × {watchedValues.shelvesPerRack} 层 × {watchedValues.boxesPerShelf} 盒
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">盒子规格</span>
                                        <span>{watchedValues.boxRows}×{watchedValues.boxCols}</span>
                                    </div>
                                    <div className="border-t pt-3 flex justify-between">
                                        <span className="font-medium">总槽位数</span>
                                        <Badge className="text-lg">{totalSlots.toLocaleString()}</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={prevStep}
                            disabled={step === 1}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            上一步
                        </Button>

                        {step < 3 ? (
                            <Button type="button" onClick={nextStep}>
                                下一步
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button type="submit" disabled={isSubmitting}>
                                <Check className="mr-2 h-4 w-4" />
                                {isSubmitting ? '创建中...' : '确认创建'}
                            </Button>
                        )}
                    </div>
                </form>
            </Form>
        </>
    )

    // 嵌入模式：直接返回表单内容
    if (embedded) {
        return formContent
    }

    // 独立模式：包裹 Dialog
    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setStep(1); form.reset(); setBoxSizePreset('9x9') } }}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    新增细胞库
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-primary" />
                        创建存储细胞库
                    </DialogTitle>
                    <DialogDescription>
                        {step === 1 && '第一步：填写基本信息'}
                        {step === 2 && '第二步：配置存储结构'}
                        {step === 3 && '第三步：确认配置'}
                    </DialogDescription>
                </DialogHeader>
                {formContent}
            </DialogContent>
        </Dialog>
    )
}
