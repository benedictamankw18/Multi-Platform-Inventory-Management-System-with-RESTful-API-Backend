import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useServerConfig } from '../contexts/ServerConfigContext'
import { DEFAULT_SERVER_URL, normalizeServerUrl } from '../services/serverConfig'
import logo from '../assets/logo.png'
import './ConnectServerScreen.css'

/**
 * First-run / "change server" gate. Reuses the split auth layout and design
 * tokens so it reads as part of the same product.
 *
 * "Connect" stays disabled until the *current* input has passed a health check,
 * so a typo can never be committed as the server.
 */
function ConnectServerScreen() {
  const navigate = useNavigate()
  const { serverUrl, check, connect } = useServerConfig()

  const [input, setInput] = useState(serverUrl ?? DEFAULT_SERVER_URL)
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<
    { ok: boolean; message: string; ms?: number; url?: string; warning?: string | null } | null
  >(null)
  // The exact input string that produced the successful check, so editing the
  // field after a pass disables Connect again.
  const [verifiedInput, setVerifiedInput] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canConnect = result?.ok === true && verifiedInput !== null && input.trim() === verifiedInput

  async function onCheck(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setResult(null)
    setVerifiedInput(null)
    setChecking(true)
    try {
      const res = await check(input)
      setResult(res)
      if (res.ok) setVerifiedInput(input.trim())
    } finally {
      setChecking(false)
    }
  }

  function onConnect() {
    const normalized = normalizeServerUrl(input)
    if (!normalized.ok) {
      setError(normalized.error)
      return
    }
    connect(normalized.url)
    navigate('/login')
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-label="Connect to your server">
        <div className="auth-hero">
          <div className="brand-lockup">
            <img src={logo} alt="" className="auth-logo" />
            <div>
              <span className="auth-eyebrow">Inventory Suite</span>
              <h1>Connect to Your Server</h1>
            </div>
          </div>

          <p className="auth-intro">
            Point the app at your inventory API. We&apos;ll confirm it&apos;s reachable
            before you continue, then remember the address for next time.
          </p>

          <div className="auth-highlights">
            <article>
              <strong>Verified</strong>
              <span>Health-checked before you connect</span>
            </article>
            <article>
              <strong>Remembered</strong>
              <span>Reused automatically on next launch</span>
            </article>
            <article>
              <strong>On-prem ready</strong>
              <span>LAN or hosted, http or https</span>
            </article>
          </div>
        </div>

        <form className="login-card" onSubmit={onCheck}>
          <div className="login-card__header">
            <span className="login-card__eyebrow">Server connection</span>
            <h2>Server host URL</h2>
          </div>

          {error ? (
            <div className="auth-feedback auth-feedback--error">{error}</div>
          ) : null}

          {result ? (
            <div className={result.ok ? 'auth-feedback' : 'auth-feedback auth-feedback--error'}>
              {result.ok
                ? `Connected${result.ms != null ? ` · ${result.ms} ms` : ''}.`
                : result.message}
            </div>
          ) : null}

          {result?.ok && result.warning ? (
            <div className="form-note connect-warning">{result.warning}</div>
          ) : null}

          <label className="field">
            <span>Server Host URL</span>
            <input
              type="url"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="http://192.168.1.10:8040"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
          </label>

          <p className="form-note connect-url">
            Include the port if it isn&apos;t 80/443 — for example
            <code> https://inventory.example.com</code>. We&apos;ll append{' '}
            <code>/api/v1</code> automatically.
          </p>

          <div className="connect-actions">
            <button type="submit" className="secondary-action" disabled={checking}>
              {checking ? 'Checking…' : 'Check Connection'}
            </button>
            <button
              type="button"
              className="sign-in-button"
              onClick={onConnect}
              disabled={!canConnect}
            >
              Connect
            </button>
          </div>

          <div className="login-footer">
            <span>Not sure? Default is {DEFAULT_SERVER_URL}</span>
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setInput(DEFAULT_SERVER_URL)
                setResult(null)
                setVerifiedInput(null)
                setError(null)
              }}
            >
              Use default
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}

export default ConnectServerScreen
