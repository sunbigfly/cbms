'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

type LoginStep = 'check' | 'login' | 'register' | 'reset'

export default function LoginPage() {
    const router = useRouter()
    const [step, setStep] = useState<LoginStep>('check')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    // Form data
    const [employeeId, setEmployeeId] = useState('')
    const [userName, setUserName] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [adminPassword, setAdminPassword] = useState('')
    const [existingUserName, setExistingUserName] = useState('')

    // Step 1: Check employee ID
    const handleCheckEmployeeId = async () => {
        if (!employeeId.trim()) {
            setError('请输入工号')
            return
        }

        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/auth/check-employee', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employeeId: employeeId.trim() }),
            })

            const data = await res.json()

            if (data.exists) {
                setExistingUserName(data.userName || '')
                setStep('login')
            } else {
                setStep('register')
            }
        } catch {
            setError('检查工号失败，请重试')
        } finally {
            setLoading(false)
        }
    }

    // Step 2a: Login with existing account
    const handleLogin = async () => {
        if (!password) {
            setError('请输入密码')
            return
        }

        setLoading(true)
        setError('')

        try {
            const result = await signIn('credentials', {
                employeeId: employeeId.trim(),
                password,
                redirect: false,
            })

            if (result?.error) {
                setError('工号或密码错误')
            } else {
                router.push('/')
                router.refresh()
            }
        } catch {
            setError('登录失败，请重试')
        } finally {
            setLoading(false)
        }
    }

    // Step 2b: Register new account
    const handleRegister = async () => {
        if (!userName.trim()) {
            setError('请输入用户名')
            return
        }
        if (!password || !/^\d{6}$/.test(password)) {
            setError('密码必须是6位数字')
            return
        }
        if (password !== confirmPassword) {
            setError('两次密码不一致')
            return
        }

        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeId: employeeId.trim(),
                    name: userName.trim(),
                    password,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || '注册失败')
                return
            }

            // Auto login after registration
            const loginResult = await signIn('credentials', {
                employeeId: employeeId.trim(),
                password,
                redirect: false,
            })

            if (loginResult?.error) {
                setSuccess('注册成功！请使用工号和密码登录')
                setStep('login')
            } else {
                router.push('/')
                router.refresh()
            }
        } catch {
            setError('注册失败，请重试')
        } finally {
            setLoading(false)
        }
    }

    // Step 2c: Reset password with admin verification
    const handleReset = async () => {
        if (!adminPassword) {
            setError('请输入管理员密码')
            return
        }
        if (!password || !/^\d{6}$/.test(password)) {
            setError('新密码必须是6位数字')
            return
        }
        if (password !== confirmPassword) {
            setError('两次密码不一致')
            return
        }

        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeId: employeeId.trim(),
                    adminPassword,
                    newPassword: password, // Send the new password
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || '重置失败')
                return
            }

            setSuccess(data.message)
            setAdminPassword('')
            setPassword('')
            setConfirmPassword('')
            setStep('login')
        } catch {
            setError('重置失败，请重试')
        } finally {
            setLoading(false)
        }
    }

    const renderStep = () => {
        switch (step) {
            case 'check':
                return (
                    <>
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl">细胞库管理系统</CardTitle>
                            <CardDescription>请输入您的工号</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="employeeId">工号</Label>
                                <Input
                                    id="employeeId"
                                    placeholder="请输入工号"
                                    value={employeeId}
                                    onChange={(e) => setEmployeeId(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleCheckEmployeeId()}
                                />
                            </div>
                            <Button
                                className="w-full"
                                onClick={handleCheckEmployeeId}
                                disabled={loading}
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                继续
                            </Button>
                        </CardContent>
                    </>
                )

            case 'login':
                return (
                    <>
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl">欢迎回来</CardTitle>
                            <CardDescription>
                                {existingUserName ? `${existingUserName}，请输入密码` : '请输入密码登录'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>工号</Label>
                                <Input value={employeeId} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">密码</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="请输入6位数字密码"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                                />
                            </div>
                            <Button
                                className="w-full"
                                onClick={handleLogin}
                                disabled={loading}
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                登录
                            </Button>
                            <div className="flex justify-between text-sm">
                                <Button
                                    variant="link"
                                    className="p-0 h-auto"
                                    onClick={() => { setStep('check'); setPassword('') }}
                                >
                                    更换工号
                                </Button>
                                <Button
                                    variant="link"
                                    className="p-0 h-auto text-orange-600"
                                    onClick={() => setStep('reset')}
                                >
                                    工号被冒用？
                                </Button>
                            </div>
                        </CardContent>
                    </>
                )

            case 'register':
                return (
                    <>
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl">首次登录</CardTitle>
                            <CardDescription>请设置您的账户信息</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>工号</Label>
                                <Input value={employeeId} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="userName">用户名</Label>
                                <Input
                                    id="userName"
                                    placeholder="请输入您的姓名"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="newPassword">密码</Label>
                                <Input
                                    id="newPassword"
                                    type="password"
                                    placeholder="请输入6位数字密码"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">确认密码</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="请再次输入密码"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                                />
                            </div>
                            <Button
                                className="w-full"
                                onClick={handleRegister}
                                disabled={loading}
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                注册并登录
                            </Button>
                            <Button
                                variant="link"
                                className="w-full"
                                onClick={() => { setStep('check'); setPassword(''); setConfirmPassword('') }}
                            >
                                返回
                            </Button>
                        </CardContent>
                    </>
                )

            case 'reset':
                return (
                    <>
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl">账户重置</CardTitle>
                            <CardDescription>请联系管理员获取超级密码</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    如果您的工号被他人冒用，请输入管理员超级密码重置账户。
                                    请设置一个新的6位数字密码。
                                </AlertDescription>
                            </Alert>
                            <div className="space-y-2">
                                <Label>工号</Label>
                                <Input value={employeeId} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="resetNewPassword">新密码</Label>
                                <Input
                                    id="resetNewPassword"
                                    type="password"
                                    placeholder="请输入6位数字新密码"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="resetConfirmPassword">确认新密码</Label>
                                <Input
                                    id="resetConfirmPassword"
                                    type="password"
                                    placeholder="请再次输入新密码"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleReset()}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="adminPassword">管理员超级密码</Label>
                                <Input
                                    id="adminPassword"
                                    type="password"
                                    placeholder="请输入管理员密码"
                                    value={adminPassword}
                                    onChange={(e) => setAdminPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleReset()}
                                />
                            </div>
                            <Button
                                className="w-full"
                                onClick={handleReset}
                                disabled={loading}
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                重置密码
                            </Button>
                            <Button
                                variant="link"
                                className="w-full"
                                onClick={() => { setStep('login'); setAdminPassword('') }}
                            >
                                返回登录
                            </Button>
                        </CardContent>
                    </>
                )
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <Card className="w-full max-w-md shadow-xl">
                {error && (
                    <Alert variant="destructive" className="m-4 mb-0 w-auto">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {success && (
                    <Alert className="m-4 mb-0 border-green-200 bg-green-50 text-green-800 w-auto">
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertDescription>{success}</AlertDescription>
                    </Alert>
                )}
                {renderStep()}
            </Card>
        </div>
    )
}
