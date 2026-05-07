// Home — personalised landing screen
const Home = ({ user, onNav }) => {
  const [workspaces, setWorkspaces] = React.useState([]);
  const [loading,    setLoading]    = React.useState(true);

  React.useEffect(() => {
    API.usecases.list()
      .then(setWorkspaces)
      .catch(() => setWorkspaces([]))
      .finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = user?.display_name || user?.studio_id || "there";

  const totalDocs = workspaces.reduce((s, w) => s + (w.document_count || 0), 0);
  const totalRuns = workspaces.reduce((s, w) => s + (w.run_count || 0), 0);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow"><span className="glyph"></span> Home</div>
          <h1 className="h1" style={{ fontSize: 38 }}>
            {greeting}, <em>{name}</em>
          </h1>
          <p className="h1-sub">Here's your Agentic RAG Studio at a glance.</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNav("onboarding")}>
          <Icon name="plus" size={13} /> New Workspace
        </button>
      </div>

      {/* Stat row */}
      <div className="grid-4 mb-4">
        <MetricCard label="Workspaces" value={String(workspaces.length)} delta="total" deltaTone="flat"
          spark={<Sparkline data={[0,0,1,1,Math.max(1,workspaces.length-1),workspaces.length,workspaces.length]} />} />
        <MetricCard label="Documents" value={String(totalDocs)} unit="docs" delta="across all workspaces" deltaTone="flat"
          spark={<Sparkline data={[0,0,0,0,0,0,totalDocs]} color="var(--acc-cyan)" />} />
        <MetricCard label="Agent Runs" value={String(totalRuns)} delta="across all workspaces" deltaTone="flat"
          spark={<Sparkline data={[0,0,0,0,0,0,totalRuns]} />} />
        <MetricCard label="Account" value={user?.role || "Admin"} delta={user?.studio_id || ""} deltaTone="flat"
          spark={<Sparkline data={[1,1,1,1,1,1,1]} color="var(--acc-lime)" />} />
      </div>

      {/* Workspace cards */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--line-soft)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div className="card-title">Your Workspaces</div>
            <div className="card-sub mt-2">{workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}</div>
          </div>
          <button className="btn btn-ghost" onClick={() => onNav("onboarding")}>
            <Icon name="plus" size={12} /> New
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--fg-dim)", fontSize: 13 }}>Loading…</div>
        ) : workspaces.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 13, color: "var(--fg-dim)", marginBottom: 16 }}>No workspaces yet. Create one to get started.</div>
            <button className="btn btn-primary" onClick={() => onNav("onboarding")}>
              <Icon name="plus" size={13} /> Create your first workspace
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16, padding: 18 }}>
            {workspaces.map(ws => <WorkspaceCard key={ws.id} ws={ws} onNav={onNav} />)}
          </div>
        )}
      </div>
    </div>
  );
};

const WorkspaceCard = ({ ws, onNav }) => {
  const [progress, setProgress] = React.useState(null);

  React.useEffect(() => {
    API.usecases.progress(ws.id)
      .then(setProgress)
      .catch(() => setProgress(null));
  }, [ws.id]);

  const stage   = progress?.current_stage ?? 1;
  const pct     = Math.round((stage / 6) * 100);
  const stageName = progress?.stages?.[stage - 1]?.name ?? "Use Case Intake";

  return (
    <div style={{
      background: "var(--bg-canvas)", border: "1px solid var(--line-soft)",
      borderRadius: 10, padding: 16, cursor: "pointer",
      transition: "border-color 0.15s",
    }}
      onClick={() => onNav("usecases", ws)}
      onMouseEnter={e => e.currentTarget.style.borderColor = "var(--acc-lime-line)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "var(--line-soft)"}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.3 }}>{ws.name}</div>
        <Badge tone="lime">{ws.answer_style}</Badge>
      </div>

      {ws.industry && (
        <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 10 }}>{ws.industry}</div>
      )}

      {/* Progress bar */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
          <span>Stage {stage}/6 — {stageName}</span>
          <span>{pct}%</span>
        </div>
        <div style={{ height: 4, background: "var(--bg-elev)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: "var(--acc-lime)", borderRadius: 2, transition: "width 0.4s ease" }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--text-muted)" }}>
        <span><span className="mono">{ws.document_count || 0}</span> docs</span>
        <span><span className="mono">{ws.run_count || 0}</span> runs</span>
        <span style={{ marginLeft: "auto" }}>{new Date(ws.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
};

window.Home = Home;
