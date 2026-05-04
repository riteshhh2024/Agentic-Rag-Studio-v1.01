// Sidebar + Header chrome
const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "usecases", label: "Use Cases", icon: "layers" },
  { id: "knowledge", label: "Knowledge Base", icon: "folder" },
  { id: "rag", label: "RAG Config", icon: "sliders" },
  { id: "agent", label: "Agent Workspace", icon: "bot" },
  { id: "eval", label: "Evaluation", icon: "gauge" },
  { id: "bench", label: "Inference Benchmarks", icon: "cpu" },
  { id: "report", label: "Reports", icon: "file" },
  { id: "settings", label: "Settings", icon: "settings" },
];

const Sidebar = ({ active, onNav }) => {
  const [health, setHealth] = React.useState(null);

  React.useEffect(() => {
    API.health.get()
      .then(h => setHealth({ ok: true, data: h }))
      .catch(() => setHealth({ ok: false }));
  }, []);

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-row">
          <div className="brand-mark">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 6 L12 2 L20 6 L20 18 L12 22 L4 18 Z" stroke="var(--acc-lime)" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M12 2 L12 12 L4 6" stroke="var(--acc-lime)" strokeWidth="1" opacity="0.6" strokeLinejoin="round" />
              <path d="M12 12 L20 6 M12 12 L12 22" stroke="var(--acc-lime)" strokeWidth="1" opacity="0.4" />
              <circle cx="12" cy="12" r="1.6" fill="var(--acc-lime)" />
            </svg>
          </div>
          <div>
            <div className="brand-name" style={{ fontFamily: "\"JetBrains Mono\"" }}>Agentic RAG Studio</div>
            <div className="brand-sub">v0.1.0 · POC Builder</div>
          </div>
        </div>
      </div>

      <div className="nav-label">Workspace</div>
      {NAV.slice(0, 5).map((n) =>
        <div key={n.id} className={`nav-item ${active === n.id ? "active" : ""}`} onClick={() => onNav(n.id)}
          style={{ fontFamily: "\"JetBrains Mono\"" }}>
          <Icon name={n.icon} />
          <span>{n.label}</span>
        </div>
      )}

      <div className="nav-label">Analyze</div>
      {NAV.slice(5, 8).map((n) =>
        <div key={n.id} className={`nav-item ${active === n.id ? "active" : ""}`} onClick={() => onNav(n.id)}
          style={{ fontFamily: "\"JetBrains Mono\"" }}>
          <Icon name={n.icon} />
          <span>{n.label}</span>
        </div>
      )}

      <div className="nav-label">System</div>
      {NAV.slice(8).map((n) =>
        <div key={n.id} className={`nav-item ${active === n.id ? "active" : ""}`} onClick={() => onNav(n.id)}
          style={{ fontFamily: "\"JetBrains Mono\"" }}>
          <Icon name={n.icon} />
          <span>{n.label}</span>
        </div>
      )}

      <div className="sidebar-footer">
        <div className="health-card">
          <div className="health-title">
            <span className={`dot ${health === null ? "idle" : health.ok ? "" : "warn"}`}></span>
            {health === null ? "Connecting…" : health.ok ? "Backend Online" : "Backend Offline"}
          </div>
          <div className="health-row">
            <span>API</span>
            <b style={{ color: health?.ok ? "var(--ok)" : "var(--err)" }}>
              {health === null ? "…" : health.ok ? "OK" : "Error"}
            </b>
          </div>
          <div className="health-row">
            <span>Version</span>
            <b>{health?.data?.version || "—"}</b>
          </div>
          <div className="health-row">
            <span>Service</span>
            <b className="dim" style={{ fontSize: 10 }}>
              {health?.data?.service ? "rag-studio" : "—"}
            </b>
          </div>
        </div>
      </div>
    </aside>
  );
};

const Header = ({ active, activeUseCase, user, onLogout }) => {
  const labels = {
    dashboard: "Overview",
    usecases: "Use Case Intake",
    knowledge: "Knowledge Base",
    rag: "RAG Configuration",
    agent: "Agent Workspace",
    eval: "Evaluation",
    bench: "Inference Benchmarks",
    report: "POC Report",
    settings: "Settings",
  };

  // Derive initials from Studio ID (e.g. "ADMIN101" → "A1", "SA" fallback)
  const initials = user?.studioId
    ? (user.studioId.replace(/[^A-Z0-9]/g, "").slice(0, 2))
    : "SA";

  return (
    <header className="header">
      <div className="crumbs" style={{ fontFamily: "\"JetBrains Mono\"" }}>
        <span>Workspace</span>
        <span className="sep">/</span>
        <span>{activeUseCase?.name || "No use case selected"}</span>
        <span className="sep">/</span>
        <span className="here">{labels[active] || ""}</span>
      </div>

      {activeUseCase && (
        <div className="project-pill" style={{ marginLeft: 16 }}>
          <Icon name="bookmark" size={13} style={{ color: "var(--acc-cyan)" }} />
          <span style={{ fontFamily: "\"JetBrains Mono\"" }}>{activeUseCase.name}</span>
          <span className="dim mono" style={{ fontSize: 10, marginLeft: 4 }}>
            {activeUseCase.id?.slice(0, 8)}
          </span>
        </div>
      )}

      <div className="header-spacer" />

      <span className="env-badge"><span className="dot"></span> Demo Workspace</span>

      <button className="model-select">
        <Icon name="cpu" size={13} style={{ color: "var(--acc-lime)" }} />
        <span style={{ fontFamily: "\"JetBrains Mono\"" }}>OpenAI · gpt-4o-mini</span>
        <Icon name="chevronDown" size={12} style={{ color: "var(--fg-dim)" }} />
      </button>

      <button className="btn btn-icon btn-ghost" title="Toggle theme" onClick={() => {
        const cur = document.documentElement.getAttribute("data-theme") || "dark";
        document.documentElement.setAttribute("data-theme", cur === "dark" ? "light" : "dark");
      }}>
        <Icon name="sparkles" size={14} />
      </button>
      <button className="btn btn-icon btn-ghost"><Icon name="bell" size={14} /></button>

      {/* User identity + logout */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 4 }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, fontFamily: "var(--font-mono)", lineHeight: 1 }}>
            {user?.studioId || "SA"}
          </div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1, marginTop: 2 }}>Admin</div>
        </div>
        <div
          className="avatar"
          title={`Signed in as ${user?.studioId || "SA"}`}
          style={{ cursor: "default" }}
        >
          {initials}
        </div>
        {onLogout && (
          <button
            className="btn btn-icon btn-ghost"
            title="Sign out"
            onClick={onLogout}
            style={{ color: "var(--text-muted)" }}
          >
            <Icon name="arrowRight" size={14} style={{ transform: "rotate(180deg)" }} />
          </button>
        )}
      </div>
    </header>
  );
};

Object.assign(window, { Sidebar, Header, NAV });
