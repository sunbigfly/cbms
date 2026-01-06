'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ValidationError {
    row: number
    field: string
    message: string
}

interface CSVImportDialogProps {
    trigger: React.ReactNode
    onSuccess?: () => void
}

type ImportMode = 'skip' | 'overwrite'

export function CSVImportDialog({ trigger, onSuccess }: CSVImportDialogProps) {
    const [open, setOpen] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isValidating, setIsValidating] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const [importMode, setImportMode] = useState<ImportMode>('skip')
    const [validationResult, setValidationResult] = useState<{
        success: boolean
        count?: number
        errors?: ValidationError[]
        message?: string
        hasConflicts?: boolean
        conflictCount?: number
        totalCount?: number
    } | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const { toast } = useToast()

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile && droppedFile.name.endsWith('.csv')) {
            setFile(droppedFile)
            setValidationResult(null)
        } else {
            toast({
                title: '文件格式错误',
                description: '请上传 .csv 格式的文件',
                variant: 'destructive',
            })
        }
    }, [toast])

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            setFile(selectedFile)
            setValidationResult(null)
        }
    }, [])

    const handleValidate = async () => {
        if (!file) return

        setIsValidating(true)
        setValidationResult(null)

        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('/api/csv/import?validate=true', {
                method: 'POST',
                body: formData,
            })

            const result = await response.json()
            setValidationResult(result)

            if (result.success) {
                toast({
                    title: '验证通过',
                    description: result.message,
                })
            } else if (result.hasConflicts) {
                // 有冲突，但可以选择处理方式
                toast({
                    title: '发现位置冲突',
                    description: `${result.conflictCount} 个位置已被占用，请选择处理方式`,
                    variant: 'default',
                })
            }
        } catch {
            toast({
                title: '验证失败',
                description: '网络错误，请重试',
                variant: 'destructive',
            })
        } finally {
            setIsValidating(false)
        }
    }

    const handleImport = async () => {
        if (!file) return

        setIsImporting(true)

        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch(`/api/csv/import?mode=${importMode}`, {
                method: 'POST',
                body: formData,
            })

            const result = await response.json()

            if (result.success || result.imported > 0) {
                toast({
                    title: '导入完成',
                    description: result.message,
                })
                setOpen(false)
                setFile(null)
                setValidationResult(null)
                setImportMode('skip')
                onSuccess?.()
            } else {
                setValidationResult({
                    success: false,
                    errors: result.errors || result.validationErrors,
                    message: result.message || '导入失败',
                })
            }
        } catch {
            toast({
                title: '导入失败',
                description: '网络错误，请重试',
                variant: 'destructive',
            })
        } finally {
            setIsImporting(false)
        }
    }

    const resetState = () => {
        setFile(null)
        setValidationResult(null)
        setImportMode('skip')
    }

    // 判断是否可以导入（验证通过 或 有冲突但已选择处理方式）
    const canImport = validationResult?.success || validationResult?.hasConflicts

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen)
            if (!isOpen) resetState()
        }}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>导入 CSV 文件</DialogTitle>
                    <DialogDescription>
                        上传包含样本数据的 CSV 文件进行批量导入
                    </DialogDescription>
                </DialogHeader>

                {/* File Upload Area */}
                <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
                        ? 'border-primary bg-primary/5'
                        : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                        }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleFileSelect}
                    />

                    {file ? (
                        <div className="space-y-2">
                            <FileText className="h-10 w-10 mx-auto text-primary" />
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-muted-foreground">
                                {(file.size / 1024).toFixed(1)} KB
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                更换文件
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                            <p className="text-muted-foreground">
                                拖拽 CSV 文件到此处，或
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                选择文件
                            </Button>
                        </div>
                    )}
                </div>

                {/* Validation Results */}
                {validationResult && (
                    <div className={`rounded-lg p-4 ${validationResult.success
                        ? 'bg-green-50 dark:bg-green-950/30'
                        : validationResult.hasConflicts
                            ? 'bg-amber-50 dark:bg-amber-950/30'
                            : 'bg-red-50 dark:bg-red-950/30'
                        }`}>
                        <div className="flex items-start gap-3">
                            {validationResult.success ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                            ) : validationResult.hasConflicts ? (
                                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                            ) : (
                                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                            )}
                            <div className="flex-1">
                                <p className={`font-medium ${validationResult.success
                                    ? 'text-green-700 dark:text-green-400'
                                    : validationResult.hasConflicts
                                        ? 'text-amber-700 dark:text-amber-400'
                                        : 'text-red-700 dark:text-red-400'
                                    }`}>
                                    {validationResult.message}
                                </p>
                                {validationResult.errors && validationResult.errors.length > 0 && !validationResult.hasConflicts && (
                                    <ul className="mt-2 space-y-1 text-sm text-red-600 dark:text-red-400">
                                        {validationResult.errors.slice(0, 5).map((err, i) => (
                                            <li key={i}>
                                                <Badge variant="outline" className="mr-2">
                                                    行 {err.row}
                                                </Badge>
                                                {err.field && <span className="font-medium">{err.field}: </span>}
                                                {err.message}
                                            </li>
                                        ))}
                                        {validationResult.errors.length > 5 && (
                                            <li className="text-muted-foreground">
                                                ... 还有 {validationResult.errors.length - 5} 个错误
                                            </li>
                                        )}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Conflict Mode Selection */}
                {validationResult?.hasConflicts && (
                    <div className="rounded-lg border p-4 space-y-3">
                        <p className="text-sm font-medium">请选择冲突处理方式：</p>
                        <RadioGroup
                            value={importMode}
                            onValueChange={(value) => setImportMode(value as ImportMode)}
                            className="space-y-2"
                        >
                            <div className="flex items-start space-x-3">
                                <RadioGroupItem value="skip" id="skip" className="mt-1" />
                                <Label htmlFor="skip" className="cursor-pointer">
                                    <span className="font-medium">略过冲突</span>
                                    <p className="text-sm text-muted-foreground">
                                        跳过已有样本的位置，仅导入空位置的数据
                                    </p>
                                </Label>
                            </div>
                            <div className="flex items-start space-x-3">
                                <RadioGroupItem value="overwrite" id="overwrite" className="mt-1" />
                                <Label htmlFor="overwrite" className="cursor-pointer">
                                    <span className="font-medium">覆盖现有</span>
                                    <p className="text-sm text-muted-foreground">
                                        用 CSV 中的数据替换已有的样本（此操作不可撤销）
                                    </p>
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                )}

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                    >
                        取消
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={handleValidate}
                        disabled={!file || isValidating || isImporting}
                    >
                        {isValidating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        验证数据
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={!file || !canImport || isImporting}
                    >
                        {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        确认导入
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
