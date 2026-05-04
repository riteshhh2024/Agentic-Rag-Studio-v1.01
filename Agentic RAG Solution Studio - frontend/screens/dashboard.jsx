// Dashboard / Overview
const Dashboard = ({ onNav, activeUseCase }) => {
  const [usecases, setUsecases] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    API.usecases.list()
      .then(setUsecases)
      .catch(() => setUsecases([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="page-head" style={{ fontFamily: "\"JetBrains Mono\"" }}>
        <div>
          <div className="eyebrow"><span className="glyph"></span> Overview · POC-2026-Q2</div>
          <h1 className="h1">Build, evaluate, and present<br /><em>enterprise GenAI POCs</em></h1>
          <p className="h1-sub">A solution-architect workspace for designing, tuning and evaluating agentic RAG proofs-of-concept — from customer intake to a customer-ready report.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={() => onNav("agent")}>
            <Icon name="play" size={12} /> Open Demo Workspace
          </button>
          <button className="btn btn-primary" onClick={() => onNav("usecases")}>
            <Icon name="plus" size={13} /> Create New Use Case
          </button>
        </div>
      </div>

      <div className="grid-4 mb-4">
        <MetricCard label="Active Use Cases" value={String(usecases.length)} delta={`${usecases.length} total`} deltaTone="flat"
          spark={<Sparkline data={[1, 1, 2, 2, 2, Math.max(1, usecases.length - 1), usecases.length]} />} />
        <MetricCard label="Documents Indexed" value="—" unit="docs" delta="Upload to see" deltaTone="flat"
          spark={<Sparkline data={[0, 0, 0, 0, 0, 0, 0]} color="var(--acc-cyan)" />} />
        <MetricCard label="Evaluation Score" value="—" delta="Run eval to score" deltaTone="flat"
          spark={<Sparkline data={[0, 0, 0, 0, 0, 0, 0]} />} />
        <MetricCard label="Avg Latency" value="—" unit="sec" delta="Run agent to measure" deltaTone="flat"
          spark={<Sparkline data={[0, 0, 0, 0, 0, 0, 0]} color="var(--acc-cyan)" />} />
      </div>

      <div className="card mb-4" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--line-soft)", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "\"JetBrains Mono\"" }}>
          <div>
            <div className="card-title">POC Lifecycle</div>
            <div className="card-sub mt-2">
              {activeUseCase ? `Currently at step 1 — Use Case Intake · ${activeUseCase.name}` : "Create a use case to begin"}
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Badge tone={activeUseCase ? "lime" : "default"}>{activeUseCase ? "In Progress" : "Not Started"}</Badge>
          </div>
        </div>
        <div className="rail">
          {[
            { num: "01", name: "Use Case Intake", desc: "Customer problem & success criteria", state: activeUseCase ? "done" : "" },
            { num: "02", name: "Knowledge Upload", desc: "Parse · chunk · embed", state: "" },
            { num: "03", name: "RAG Configuration", desc: "Retrieval & answer policy", state: "" },
            { num: "04", name: "Agentic Q&A", desc: "Controlled multi-step workflow", state: "" },
            { num: "05", name: "Evaluation", desc: "Faithfulness, latency, risk", state: "" },
            { num: "06", name: "POC Report", desc: "Customer deliverable", state: "" },
          ].map((s) =>
            <div key={s.num} className={`rail-step ${s.state}`}>
              <div className="pip"></div>
              <div className="num">{s.num}</div>
              <div className="name">{s.name}</div>
              <div className="desc">{s.desc}</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid-2-1 gap-6">
        <div className="card" style={{ padding: 0 }}>
          <div className="card-head" style={{ padding: "16px 18px", marginBottom: 0, borderBottom: "1px solid var(--line-soft)" }}>
            <div>
              <div className="card-title">Your Use Cases</div>
              <div className="card-sub mt-2">{usecases.length} use case{usecases.length !== 1 ? "s" : ""} in this workspace</div>
            </div>
            <button className="btn btn-ghost" onClick={() => onNav("usecases")}>
              <Icon name="plus" size={12} /> New
            </button>
          </div>
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--fg-dim)", fontFamily: "var(--font-mono)", fontSize: 12 }}>Loading…</div>
          ) : usecases.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center" }}>
              <div style={{ color: "var(--fg-dim)", fontSize: 13, marginBottom: 12 }}>No use cases yet.</div>
              <button className="btn btn-primary" onClick={() => onNav("usecases")}>
                <Icon name="plus" size={13} /> Create your first use case
              </button>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Use Case</th>
                  <th>Industry</th>
                  <th>Style</th>
                  <th>Docs</th>
                  <th>Runs</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {usecases.map((uc) => (
                  <tr key={uc.id} style={{ cursor: "pointer" }} onClick={() => onNav("usecases", uc)}>
                    <td>{uc.name}</td>
                    <td className="muted">{uc.industry || "—"}</td>
                    <td><Badge tone="lime">{uc.answer_style}</Badge></td>
                    <td className="mono">{uc.document_count}</td>
                    <td className="mono">{uc.run_count}</td>
                    <td className="mono dim">{new Date(uc.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex-col gap-4">
          <div className="card" style={{ background: "linear-gradient(135deg, var(--bg-card-hi), var(--bg-card))", borderColor: "var(--acc-lime-line)" }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}><span className="glyph"></span> Architect Tip</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, lineHeight: 1.3, letterSpacing: "-0.01em" }}>
              Run an evaluation pass before you tune retrieval — baseline scores tell you which knob actually matters.
            </div>
            <button className="btn btn-outline mt-4" style={{ borderColor: "var(--acc-lime-line)", color: "var(--acc-lime)" }}
              onClick={() => onNav("eval")}>
              Open Evaluation <Icon name="arrowRight" size={12} />
            </button>
          </div>
          <div className="card">
            <div className="card-head">
              <div className="card-title">Quick Start</div>
              <Icon name="spark" size={13} style={{ color: "var(--acc-lime)" }} />
            </div>
            <div className="flex-col gap-3">
              {[
                ["01", "Create a use case", "usecases"],
                ["02", "Upload documents", "knowledge"],
                ["03", "Configure RAG", "rag"],
                ["04", "Ask the agent", "agent"],
                ["05", "Run evaluation", "eval"],
                ["06", "Generate report", "report"],
              ].map(([n, label, nav]) => (
                <div key={n} style={{ display: "flex", gap: 12, fontSize: 12.5, alignItems: "center", cursor: "pointer" }}
                  onClick={() => onNav(nav)}>
                  <span className="mono dim" style={{ width: 22 }}>{n}</span>
                  <span style={{ color: "var(--fg-muted)" }}>{label}</span>
                  <Icon name="chevronRight" size={11} style={{ color: "var(--fg-faint)", marginLeft: "auto" }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.Dashboard = Dashboard;
