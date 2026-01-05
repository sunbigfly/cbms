'use client'

import { Button } from '@/components/ui/button'
import { Building2, Lock } from 'lucide-react'

export type LibraryMode = 'public' | 'private'

interface LibrarySwitchProps {
    value: LibraryMode
    onChange: (value: LibraryMode) => void
    className?: string
}

/**
 * 公共库/私有库切换组件
 * 用于在库存页面顶部切换显示公共库还是私有库
 */
export function LibrarySwitch({ value, onChange, className = '' }: LibrarySwitchProps) {
    return (
        <div className={`inline-flex items-center gap-1 p-1 bg-muted rounded-lg ${className}`}>
            <Button
                size="sm"
                variant={value === 'public' ? 'default' : 'ghost'}
                onClick={() => onChange('public')}
                className="gap-1.5"
            >
                <Building2 className="h-4 w-4" />
                公共库
            </Button>
            <Button
                size="sm"
                variant={value === 'private' ? 'default' : 'ghost'}
                onClick={() => onChange('private')}
                className="gap-1.5"
            >
                <Lock className="h-4 w-4" />
                私有库
            </Button>
        </div>
    )
}
