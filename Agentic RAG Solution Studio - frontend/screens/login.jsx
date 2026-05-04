// Login — hardcoded ADMIN101 / 12345 (replace with real auth later)
const STUDIO_ID   = "ADMIN101";
const STUDIO_PASS = "12345";

const Login = ({ onLogin }) => {
  const [studioId,  setStudioId]  = useState("");
  const [password,  setPassword]  = useState("");
  const [showPass,  setShowPass]  = useState(false);
  const [error,     setError]     = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [shake,     setShake]     = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Simulate a brief async check (feels intentional, not instant)
    await new Promise(r => setTimeout(r, 400));

    if (studioId.trim().toUpperCase() === STUDIO_ID && password === STUDIO_PASS) {
      onLogin({ studioId: studioId.trim().toUpperCase() });
    } else {
      setLoading(false);
      setError("Invalid Studio ID or password.");
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: `radial-gradient(900px 600px at 80% 20%, var(--grad-1), transparent 55%),
                   radial-gradient(700px 500px at 10% 80%, var(--grad-2), transparent 55%),
                   var(--bg-base)`,
      padding: 24,
    }}>
      {/* Ambient grid lines */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: `linear-gradient(var(--line-soft) 1px, transparent 1px),
                          linear-gradient(90deg, var(--line-soft) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
        opacity: 0.35,
      }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420 }}>

        {/* Brand mark */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "var(--bg-card)",
            border: "1px solid var(--acc-lime-line)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            marginBottom: 20,
            boxShadow: "0 0 40px color-mix(in oklab, var(--acc-lime) 20%, transparent)",
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M4 6 L12 2 L20 6 L20 18 L12 22 L4 18 Z" stroke="var(--acc-lime)" strokeWidth="1.4" strokeLinejoin="round"/>
              <path d="M12 2 L12 12 L4 6" stroke="var(--acc-lime)" strokeWidth="1" opacity="0.6" strokeLinejoin="round"/>
              <path d="M12 12 L20 6 M12 12 L12 22" stroke="var(--acc-lime)" strokeWidth="1" opacity="0.4"/>
              <circle cx="12" cy="12" r="1.8" fill="var(--acc-lime)"/>
            </svg>
          </div>
          <div style={{
            fontFamily: "var(--font-display)",
            fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}>
            Agentic RAG Studio
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 6, letterSpacing: "0.04em" }}>
            Enterprise GenAI POC Builder · v0.1.0
          </div>
        </div>

        {/* Card */}
        <div
          className="card"
          style={{
            padding: "32px 36px",
            border: "1px solid var(--line-soft)",
            animation: shake ? "shake 0.55s ease" : "none",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Sign in to your workspace</div>
          <div style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 28 }}>
            Use your Studio ID and password to continue.
          </div>

          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 18,
              background: "var(--acc-red-soft, rgba(229,85,85,0.08))",
              border: "1px solid var(--acc-red, #e55)",
              color: "var(--acc-red, #e55)",
              fontSize: 13, display: "flex", alignItems: "center", gap: 8,
            }}>
              <Icon name="x" size={14} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: "block", fontSize: 11.5, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.07em",
                color: "var(--text-muted)", marginBottom: 6,
              }}>
                Studio ID
              </label>
              <input
                className="input"
                type="text"
                placeholder="e.g. ADMIN101"
                value={studioId}
                onChange={e => { setStudioId(e.target.value); setError(null); }}
                autoFocus
                autoComplete="username"
                style={{ width: "100%", fontFamily: "var(--font-mono)", letterSpacing: "0.05em", textTransform: "uppercase" }}
              />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{
                display: "block", fontSize: 11.5, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.07em",
                color: "var(--text-muted)", marginBottom: 6,
              }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  className="input"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(null); }}
                  autoComplete="current-password"
                  style={{ width: "100%", paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--text-muted)", padding: 0, display: "flex",
                  }}
                  tabIndex={-1}
                >
                  <Icon name="eye" size={15} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !studioId.trim() || !password}
              style={{ width: "100%", justifyContent: "center", height: 42, fontSize: 14 }}
            >
              {loading ? (
                <span style={{ opacity: 0.8 }}>Authenticating…</span>
              ) : (
                <><Icon name="arrowRight" size={14} /> Sign In</>
              )}
            </button>
          </form>
        </div>

        {/* Footer note */}
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 11.5, color: "var(--text-muted)", opacity: 0.7 }}>
          Credentials are hardcoded for this demo build.
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%,100%  { transform: translateX(0); }
          15%      { transform: translateX(-8px); }
          30%      { transform: translateX(8px); }
          45%      { transform: translateX(-6px); }
          60%      { transform: translateX(6px); }
          75%      { transform: translateX(-3px); }
          90%      { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
};

window.Login = Login;
