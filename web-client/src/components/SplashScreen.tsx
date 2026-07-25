import './auth-pages.css'

function SplashScreen() {
  return (
    <main className="splash-screen" aria-label="Application splash screen">
      <div className="splash-card">
        <div className="splash-orbit" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="brand-mark" aria-hidden="true">
          <span className="brand-mark__layer brand-mark__layer--top" />
          <span className="brand-mark__layer brand-mark__layer--base" />
        </div>
        <span className="splash-eyebrow">Multi-platform inventory system</span>
        <h1>Loading your control center</h1>
        <p>
          Preparing branch data, stock alerts, and secure access for the
          inventory dashboard.
        </p>
        <div className="splash-loader" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </main>
  )
}

export default SplashScreen