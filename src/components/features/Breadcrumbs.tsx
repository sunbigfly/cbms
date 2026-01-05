'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

// Map paths to labels
const pathLabels: Record<string, string> = {
    inventory: '细胞库',
    audit: '历史记录',
    reports: '报表',
    settings: '系统设置',
    facility: '细胞库',
    rack: '扇/提',
    shelf: '层架',
    box: '冻存盒',
}

export function Breadcrumbs() {
    const pathname = usePathname()
    const segments = pathname.split('/').filter(Boolean)

    if (segments.length === 0) {
        return null
    }

    return (
        <Breadcrumb>
            <BreadcrumbList>
                <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                        <Link href="/" className="flex items-center gap-1">
                            <Home className="h-4 w-4" />
                            <span className="sr-only">首页</span>
                        </Link>
                    </BreadcrumbLink>
                </BreadcrumbItem>

                {segments.map((segment, index) => {
                    const href = '/' + segments.slice(0, index + 1).join('/')
                    const isLast = index === segments.length - 1
                    const label = pathLabels[segment] || segment

                    return (
                        <span key={href} className="contents">
                            <BreadcrumbSeparator>
                                <ChevronRight className="h-4 w-4" />
                            </BreadcrumbSeparator>
                            <BreadcrumbItem>
                                {isLast ? (
                                    <BreadcrumbPage>{label}</BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink asChild>
                                        <Link href={href}>{label}</Link>
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                        </span>
                    )
                })}
            </BreadcrumbList>
        </Breadcrumb>
    )
}
