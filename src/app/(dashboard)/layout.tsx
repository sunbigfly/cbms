'use client'

import { SideNav } from '@/components/features/SideNav'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-screen bg-background">
            <SideNav />
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    )
}
