'use client'

import { SideNav } from '@/components/features/SideNav'

interface AppLayoutProps {
    children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
    return (
        <div className="flex min-h-screen bg-background">
            <SideNav />
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    )
}
