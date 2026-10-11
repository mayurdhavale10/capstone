'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn, AlertCircle } from 'lucide-react'
import { loginAction } from './actions'
import styles from './login.module.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        const res = await loginAction(formData)
        if (res?.error) {
          setError(res.error)
        } else {
          router.push('/dashboard')
          router.refresh()
        }
      } catch (err: any) {
        // In Next.js, redirect() throws NEXT_REDIRECT which signals successful navigation
        if (err?.message?.includes('NEXT_REDIRECT') || err?.digest?.startsWith('NEXT_REDIRECT')) {
          router.push('/dashboard')
          router.refresh()
        } else {
          setError(err.message || 'Authentication error.')
        }
      }
    })
  }

  const fillDemo = (role: string) => {
    const accounts: Record<string, { email: string; password: string }> = {
      admin: { email: 'admin@roadiq.com', password: 'admin123' },
      inspector: { email: 'inspector@roadiq.com', password: 'inspect123' },
      viewer: { email: 'viewer@roadiq.com', password: 'view123' },
    }
    setEmail(accounts[role].email)
    setPassword(accounts[role].password)
    setError('')
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logoArea}>
          <div>
            <h1 className={styles.logoTitle}>RoadIQ</h1>
            <p className={styles.logoSub}>Infrastructure Intelligence</p>
          </div>
        </div>

        <div className={styles.formHeader}>
          <h2 className={styles.formTitle}>Sign In</h2>
          <p className={styles.formSubtitle}>Access your dashboard to continue</p>
        </div>

        {/* Demo Accounts */}
        <div className={styles.demoAccounts}>
          <span className={styles.demoLabel}>Demo Access:</span>
          <div className={styles.demoButtons}>
            {['admin', 'inspector', 'viewer'].map((role) => (
              <button
                key={role}
                type="button"
                className={styles.demoBtn}
                onClick={() => fillDemo(role)}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              className="input"
              placeholder="you@roadiq.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className={styles.error}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isPending}
            style={{ marginTop: '8px' }}
          >
            {isPending ? 'Authenticating...' : (
              <>
                <LogIn size={16} /> Sign In
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
