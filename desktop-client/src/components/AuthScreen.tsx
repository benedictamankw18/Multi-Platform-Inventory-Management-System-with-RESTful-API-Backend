import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './auth-pages.css'

type AuthMode = 'login' | 'forgot' | 'reset'

function AuthScreen() {
  const { login, forgotPassword, resetPassword, error: authError, clearError } = useAuth()

  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isResetPwVisible, setIsResetPwVisible] = useState(false)
  const [isResetConfirmPwVisible, setIsResetConfirmPwVisible] = useState(false)
  const [loginIdentifier, setLoginIdentifier] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resetToken, setResetToken] = useState('')

  // Detect reset-password link (e.g. /auth/reset-password?token=xxx)
  useEffect(() => {
    const pathname = window.location.pathname.toLowerCase()
    const token = new URLSearchParams(window.location.search).get('token')?.trim() || ''

    if (pathname.startsWith('/auth/reset-password') || token) {
      setAuthMode('reset')
      setResetToken(token)
      setAuthMessage('')
      clearError()
    }
  }, [clearError])

  const handleLoginSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setAuthMessage('')
    setIsSubmitting(true)
    try {
      await login(loginIdentifier, loginPassword)
      setAuthMessage('Signed in successfully.')
    } catch {
      // AuthContext sets error
    } finally {
      setIsSubmitting(false)
    }
  }, [login, loginIdentifier, loginPassword])

  const handleForgotPasswordSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setAuthMessage('')
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const email = String(formData.get('recoveryEmail') || '')
    try {
      const result = await forgotPassword(email)
      setAuthMessage(result)
    } catch {
      // AuthContext sets error
    } finally {
      setIsSubmitting(false)
    }
  }, [forgotPassword])

  const handleResetPasswordSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setAuthMessage('')
    setIsSubmitting(true)
    const formData = new FormData(e.currentTarget)
    const token = String(formData.get('resetToken') || resetToken).trim()
    const password = String(formData.get('newPassword') || '')
    const confirmPassword = String(formData.get('confirmPassword') || '')

    if (!token) {
      setAuthMessage('Reset token is required.')
      setIsSubmitting(false)
      return
    }

    if (password !== confirmPassword) {
      setAuthMessage('Passwords do not match.')
      setIsSubmitting(false)
      return
    }

    try {
      const result = await resetPassword(token, password)
      setResetToken('')
      if (window.location.pathname.toLowerCase().startsWith('/auth/reset-password')) {
        window.history.replaceState({}, '', '/')
      }
      setAuthMode('login')
      setAuthMessage(result)
    } catch {
      // AuthContext sets error
    } finally {
      setIsSubmitting(false)
    }
  }, [resetPassword, resetToken])
  const copyByMode = useMemo(
    () => ({
      login: {
        eyebrow: 'Inventory Suite',
        title: 'Welcome back.',
        intro:
          'Sign in to manage stock levels, branch transfers, sales, and reporting from one secure workspace.',
      },
      forgot: {
        eyebrow: 'Account recovery',
        title: 'Reset your password.',
        intro:
          'Enter the email address on your account and we will send password reset instructions.',
      },
      reset: {
        eyebrow: 'Set a new password',
        title: 'Create a secure password.',
        intro:
          'Use the reset token from your email or SMS, then set a new password to regain access.',
      },
    }),
    []
  )

  const activeCopy = copyByMode[authMode]

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-label="Login form">
        <div className="auth-hero">
          <div className="brand-lockup">
            <div className="brand-mark brand-mark--small" aria-hidden="true">
              <span className="brand-mark__layer brand-mark__layer--top" />
              <span className="brand-mark__layer brand-mark__layer--base" />
            </div>
            <div>
              <span className="auth-eyebrow">{activeCopy.eyebrow}</span>
              <h1>{activeCopy.title}</h1>
            </div>
          </div>

          <p className="auth-intro">{activeCopy.intro}</p>

          <div className="auth-highlights">
            <article>
              <strong>99% uptime</strong>
              <span>Designed for reliable daily operations</span>
            </article>
            <article>
              <strong>JWT secured</strong>
              <span>Authentication-ready access control</span>
            </article>
            <article>
              <strong>Multi-branch</strong>
              <span>Track stock movement across locations</span>
            </article>
          </div>
        </div>

        <form
          className="login-card"
          onSubmit={
            authMode === 'login'
              ? handleLoginSubmit
              : authMode === 'forgot'
                ? handleForgotPasswordSubmit
                : handleResetPasswordSubmit
          }
        >
          <div className="login-card__header">
            <span className="login-card__eyebrow">
              {authMode === 'login'
                ? 'Secure login'
                : authMode === 'forgot'
                  ? 'Password recovery'
                  : 'Reset confirmation'}
            </span>
            <h2>
              {authMode === 'login'
                ? 'Sign in to your account'
                : authMode === 'forgot'
                  ? 'Send a reset link'
                  : 'Set your new password'}
            </h2>
          </div>

          <div className="auth-switch" role="tablist" aria-label="Authentication options">
            <button
              type="button"
              className={authMode === 'login' ? 'auth-tab is-active' : 'auth-tab'}
              onClick={() => { setAuthMode('login'); clearError(); setAuthMessage(''); }}
            >
              Login
            </button>
            <button
              type="button"
              className={authMode === 'forgot' ? 'auth-tab is-active' : 'auth-tab'}
              onClick={() => { setAuthMode('forgot'); clearError(); setAuthMessage(''); }}
            >
              Forgot password
            </button>
          </div>

          {(authMessage || authError) && (
          <div className={authError ? 'auth-feedback auth-feedback--error' : 'auth-feedback'}>
            {authError || authMessage}
          </div>
        )}

          {authMode === 'login' ? (
            <>
              <label className="field">
                <span>Username or email</span>
                <input
                  type="text"
                  placeholder="admin@inventory.local or admin"
                  value={loginIdentifier}
                  onChange={(event) => setLoginIdentifier(event.target.value)}
                  autoComplete="username email"
                  required
                />
              </label>

              <label className="field">
                <span>Password</span>
                <div className="password-row">
                  <input
                    type={isPasswordVisible ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setIsPasswordVisible((v) => !v)}
                    aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                  >
                    {isPasswordVisible ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /><path d="M14.12 14.12a3 3 0 11-4.24-4.24" /></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    )}
                  </button>
                </div>
              </label>

              <div className="login-row">
                <label className="checkbox-field">
                  <input type="checkbox" defaultChecked />
                  <span>Remember me</span>
                </label>
                <button type="button" className="link-button" onClick={() => { setAuthMode('forgot'); clearError(); setAuthMessage(''); }}>
                  Forgot password?
                </button>
              </div>

              <button type="submit" className="sign-in-button" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </button>

              <div className="login-footer">
                <span>Need an account? Contact your administrator.</span>
              </div>
            </>
          ) : authMode === 'forgot' ? (
            <>
              <label className="field">
                <span>Email address</span>
                <input
                  type="email"
                  name="recoveryEmail"
                  placeholder="admin@inventory.local"
                  autoComplete="email"
                  required
                />
              </label>

              <p className="form-note">
                We will send a secure reset link to the address on file.
              </p>

              <button type="submit" className="sign-in-button" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send reset link'}
              </button>

              <div className="login-footer">
                <span>Remembered your password?</span>
                <button type="button" className="link-button" onClick={() => { setAuthMode('login'); clearError(); setAuthMessage(''); }}>
                  Back to login
                </button>
              </div>

              <div className="login-footer">
                <span>Already have a reset token?</span>
                <button type="button" className="link-button" onClick={() => { setAuthMode('reset'); clearError(); setAuthMessage(''); }}>
                  Reset password now
                </button>
              </div>
            </>
          ) : (
            <>
              <label className="field">
                <span>Reset token</span>
                <input
                  type="text"
                  name="resetToken"
                  placeholder="Paste your reset token"
                  defaultValue={resetToken}
                  readOnly={Boolean(resetToken)}
                  autoComplete="off"
                  required
                />
              </label>

              <label className="field">
                <span>New password</span>
                <div className="password-row">
                  <input
                    type={isResetPwVisible ? 'text' : 'password'}
                    name="newPassword"
                    placeholder="Enter a new password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setIsResetPwVisible((v) => !v)}
                    aria-label={isResetPwVisible ? 'Hide password' : 'Show password'}
                  >
                    {isResetPwVisible ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /><path d="M14.12 14.12a3 3 0 11-4.24-4.24" /></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    )}
                  </button>
                </div>
              </label>

              <label className="field">
                <span>Confirm new password</span>
                <div className="password-row">
                  <input
                    type={isResetConfirmPwVisible ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Re-enter new password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setIsResetConfirmPwVisible((v) => !v)}
                    aria-label={isResetConfirmPwVisible ? 'Hide password' : 'Show password'}
                  >
                    {isResetConfirmPwVisible ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /><path d="M14.12 14.12a3 3 0 11-4.24-4.24" /></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    )}
                  </button>
                </div>
              </label>

              <p className="form-note">
                Password must be at least 8 characters and include uppercase, lowercase, and a number.
              </p>

              <button type="submit" className="sign-in-button" disabled={isSubmitting}>
                {isSubmitting ? 'Resetting...' : 'Reset password'}
              </button>

              <div className="login-footer">
                <span>Need a new token?</span>
                <button type="button" className="link-button" onClick={() => { setAuthMode('forgot'); clearError(); setAuthMessage(''); }}>
                  Request reset link
                </button>
              </div>
            </>
          )}
        </form>

        {(authMessage || authError) && (
          <div className={authError ? 'auth-feedback auth-feedback--error' : 'auth-feedback'}>
            {authError || authMessage}
          </div>
        )}
      </section>
    </main>
  )
}

export default AuthScreen