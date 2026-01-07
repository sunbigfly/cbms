'use client'

import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Database,
    History,
    Shield,
    Github,
    ArrowUpRight,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

// --- 优雅悬浮卡片组件 (保持不变) ---
function RefinedFeatureCard() {
    const [activeCells, setActiveCells] = useState<number[]>([])

    useEffect(() => {
        const interval = setInterval(() => {
            const newCells = Array.from({ length: 4 }, () => Math.floor(Math.random() * 81))
            setActiveCells(newCells)
        }, 2000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="relative w-[380px] h-[400px] flex items-center justify-center">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

            <Card className="absolute top-0 right-0 w-[320px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border-border/40 bg-background/95 backdrop-blur-sm animate-[float_6s_ease-in-out_infinite] z-10">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500/20 via-blue-500 to-indigo-500/20 opacity-50" />

                <div className="p-5 spacy-y-4">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <div className="font-semibold text-base text-foreground">HEK293T</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">2024-01-08 入库</div>
                        </div>
                        <Badge variant="secondary" className="font-mono text-[10px] h-5 bg-muted/50 text-foreground">
                            P3
                        </Badge>
                    </div>

                    <div className="grid grid-cols-9 gap-[3px] aspect-square p-2 bg-muted/20 rounded-xl border border-black/5">
                        {Array.from({ length: 81 }).map((_, i) => {
                            const isHighlight = activeCells.includes(i)
                            const isOccupied = [0, 1, 9, 10, 11, 19, 20, 21, 22, 60, 61, 62, 79, 80].includes(i);

                            return (
                                <div
                                    key={i}
                                    className={cn(
                                        "rounded-sm transition-all duration-1000 ease-in-out",
                                        isHighlight
                                            ? "bg-blue-600 shadow-[0_0_10px_2px_rgba(37,99,235,0.3)] scale-105"
                                            : isOccupied
                                                ? "bg-blue-200/60"
                                                : "bg-gray-100/50"
                                    )}
                                />
                            )
                        })}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 text-[10px] text-muted-foreground font-medium">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full w-[35%] bg-blue-500 rounded-full" />
                        </div>
                        <span>35%</span>
                    </div>
                </div>
            </Card>

            <Card className="absolute -bottom-12 -left-4 w-52 p-4 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.15)] border-white/40 bg-white/80 backdrop-blur-xl animate-[float_5s_ease-in-out_infinite_reverse] z-20">
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <div className="text-xs font-medium text-muted-foreground">总存储量</div>
                        <div className="text-2xl font-bold tracking-tight text-slate-800 mt-1">12,580</div>
                    </div>
                    <div className="p-1.5 rounded-md bg-green-500/10 text-green-600 rotate-3">
                        <ArrowUpRight className="w-4 h-4" />
                    </div>
                </div>

                <div className="relative pt-2">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500/80 w-[78%] rounded-full shadow-[0_0_10px_rgba(34,197,94,0.4)]" />
                    </div>
                    <div className="mt-2 text-[10px] text-slate-400 font-medium text-right">
                        78% 空间利用率
                    </div>
                </div>
            </Card>
        </div>
    )
}

const FeatureItem = ({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) => (
    <div className="flex gap-4 group">
        <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full border bg-background flex items-center justify-center shadow-sm group-hover:border-primary/50 group-hover:text-primary transition-colors">
                <Icon className="w-4 h-4" />
            </div>
            <div className="w-[1px] h-full bg-border group-last:hidden mt-2 min-h-[2rem]" />
        </div>
        <div className="pb-8 pt-1">
            <h3 className="font-medium text-foreground text-sm group-hover:text-primary transition-colors duration-300">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed max-w-sm">
                {desc}
            </p>
        </div>
    </div>
)

export default function AboutPage() {
    return (
        <div className="container mx-auto px-6 max-w-6xl h-[calc(100vh-2rem)] relative flex flex-col">

            {/* 核心内容区：pt-16 上移 */}
            <div className="flex-1 flex flex-col pt-16">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

                    {/* 左侧：叙事 */}
                    <div className="lg:col-span-5 flex flex-col animate-in slide-in-from-left-4 duration-700">
                        <div className="mb-10 space-y-4">
                            <div className="inline-flex items-center gap-2 rounded-full border bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground w-fit">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                Running v1.0.0
                            </div>

                            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground">
                                重新定义实验室<br />
                                <span className="text-primary">样本管理体验</span>
                            </h1>
                            <p className="text-muted-foreground text-base leading-7">
                                CBMS 将复杂的生物样本数据转化为直观、优雅的可视化界面。让科研人员从繁琐的记录中解放出来，专注于创新与发现。
                            </p>
                        </div>

                        {/* 功能列表 */}
                        <div className="pl-1">
                            <FeatureItem
                                icon={Database}
                                title="可视化矩阵"
                                desc="9x9 物理映射视图，告别枯燥的表格，让每个样本的位置一目了然。"
                            />
                            <FeatureItem
                                icon={History}
                                title="全时空追溯"
                                desc="自动记录每一次入库、移动、取用，构建完整的数据生命周期。"
                            />
                            <FeatureItem
                                icon={Shield}
                                title="企业级安全"
                                desc="基于角色的访问控制 (RBAC)，确保核心数据的绝对安全。"
                            />
                        </div>

                        {/* 底部行动区：整合 GitHub 按钮和版权信息，增加上方间距 (mt-10) */}
                        <div className="mt-10 flex flex-col gap-6">
                            <div className="flex items-center gap-6">
                                <Button className="rounded-full px-6 shadow-lg shadow-primary/20" asChild>
                                    <a href="https://github.com/sunbigfly/cbms" target="_blank">
                                        <Github className="mr-2 w-4 h-4" />
                                        Star on GitHub
                                    </a>
                                </Button>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground/80">
                                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">S</span>
                                    <span>Designed by sunbigfly</span>
                                </div>
                            </div>

                            {/* 版权信息移到这里 */}
                            <div className="text-xs text-muted-foreground/40 leading-relaxed">
                                © {new Date().getFullYear()} Cell Bank Management System. <br />All rights reserved.
                            </div>
                        </div>
                    </div>

                    {/* 右侧：悬浮卡片 */}
                    <div className="lg:col-span-7 flex justify-center lg:justify-end pt-12 animate-in slide-in-from-right-4 duration-1000 delay-200">
                        <RefinedFeatureCard />
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-15px); }
                }
            `}</style>
        </div>
    )
}
