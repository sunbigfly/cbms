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
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Plus, Database, ArrowRight, ArrowLeft, Check } from 'lucide-react'

const facilitySchema = z.object({
    name: z.string().min(1, '请输入设施名称'),
    type: z.string().min(1, '请选择设施类型'),
    description: z.string().optional(),
    rackCount: z.coerce.number().min(1, '至少需要1个货架').max(20, '最多20个货架'),
    shelvesPerRack: z.coerce.number().min(1, '至少需要1层').max(10, '最多10层'),
    boxesPerShelf: z.coerce.number().min(1, '至少需要1个盒子').max(10, '最多10个盒子'),
    boxRows: z.coerce.number().min(1, '至少1行').max(15, '最多15行'),
    boxCols: z.coerce.number().min(1, '至少1列').max(15, '最多15列'),
})

type FacilityFormData = z.infer<typeof facilitySchema>

const facilityTypes = [
    { value: 'FREEZER_NEG80', label: '-80°C 冷冻库' },
    { value: 'FREEZER_NEG20', label: '-20°C 冷冻库' },
    { value: 'LN2_TANK', label: '液氮罐' },
    { value: 'REFRIGERATOR', label: '4°C 冰箱' },
]

interface CreateFacilityWizardProps {
    onSuccess?: () => void
}

export function CreateFacilityWizard({ onSuccess }: CreateFacilityWizardProps) {
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<FacilityFormData>({
        resolver: zodResolver(facilitySchema),
        defaultValues: {
            name: '',
            type: '',
            description: '',
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

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setStep(1); form.reset() } }}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    新增设施
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-primary" />
                        创建存储设施
                    </DialogTitle>
                    <DialogDescription>
                        {step === 1 && '第一步：填写基本信息'}
                        {step === 2 && '第二步：配置存储结构'}
                        {step === 3 && '第三步：确认配置'}
                    </DialogDescription>
                </DialogHeader>

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
                                            <FormLabel>设施名称 *</FormLabel>
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
                                            <FormLabel>设施类型 *</FormLabel>
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
                                                <FormLabel>货架数</FormLabel>
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

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="boxRows"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>盒子行数</FormLabel>
                                                <FormControl>
                                                    <Input type="number" min="1" max="15" {...field} />
                                                </FormControl>
                                                <FormDescription>常用: 9 或 10</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="boxCols"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>盒子列数</FormLabel>
                                                <FormControl>
                                                    <Input type="number" min="1" max="15" {...field} />
                                                </FormControl>
                                                <FormDescription>常用: 9 或 10</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 3: Confirm */}
                        {step === 3 && (
                            <div className="space-y-4">
                                <Card>
                                    <CardContent className="pt-4 space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">设施名称</span>
                                            <span className="font-medium">{watchedValues.name}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">设施类型</span>
                                            <Badge variant="outline">
                                                {facilityTypes.find(t => t.value === watchedValues.type)?.label}
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
            </DialogContent>
        </Dialog>
    )
}
