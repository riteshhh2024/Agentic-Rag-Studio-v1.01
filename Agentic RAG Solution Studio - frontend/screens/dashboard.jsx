// Dashboard — Pipeline lifecycle with live stages
const Dashboard = ({ onNav, activeUseCase }) => {
  const [usecases, setUsecases] = React.useState([]);
  const [loading,  setLoading]  = React.useState(true);
  const [progress, setProgress] = React.useState(null);

  React.useEffect(() => {
    API.usecases.list()
      .then(setUsecases)
      .catch(() => setUsecases([]))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    if (!activeUseCase) { setProgress(null); return; }
    API.usecases.progress(activeUseCase.id)
      .then(setProgress)
      .catch(() => setProgress(null));
  }, [activeUseCase?.id]);

  const currentStage = progress?.current_stage ?? (activeUseCase ? 1 : 0);
  const stageLabel   = progress?.stages?.[currentStage - 1]?.name ?? (activeUseCase ? "Use Case Intake" : "Not started");
  const totalDocs    = activeUseCase?.document_count ?? 0;
  const totalRuns    = activeUseCase?.run_count ?? 0;

  const STAGE_DEFS = [
    { num: "01", name: "Use Case Intake",   desc: "Define problem & success criteria",  nav: "usecases"  },
    { num: "02", name: "Knowledge Upload",  desc: "Parse · chunk · embed",               nav: "knowledge" },
    { num: "03", name: "RAG Configuration", desc: "Retrieval & answer policy",           nav: "rag"       },
    { num: "04", name: "Agentic Q&A",       desc: "Controlled multi-step workflow",      nav: "agent"     },
    { num: "05", name: "Evaluation",        desc: "Faithfulness, latency, risk",         nav: "eval"      },
    { num: "06", name: "Report",            desc: "Solution deliverable",                nav: "report"    },
  ];

  const getStageState = (idx) => {
    if (!progress) return (!activeUseCase ? "" : idx === 0 ? "done" : "");
    const s = progress.stages[idx];
    if (!s) return "";
    if (s.done) return "done";
    if (idx === progress.current_stage) return "active";
    return "";
  };

  return (
    <div className="page">
      <div className="page-head" style={{ fontFamily: "\"JetBrains Mono\"" }}>
        <div>
          <div className="eyebrow"><span className="glyph"></span> Overview</div>
          <h1 className="h1">Build, evaluate, and deploy<br /><em>enterprise RAG solutions</em></h1>
          <p className="h1-sub">Design, tune and evaluate agentic RAG systems — from problem intake to a production-ready report.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={() => onNav("onboarding")}>
            <Icon name="plus" size={13} /> New Workspace
          </button>
        </div>
      </div>

      <div className="grid-4 mb-4">
        <MetricCard label="Workspaces" value={String(usecases.length)} delta={`${usecases.length} total`} deltaTone="flat"
          spark={<Sparkline data={[0, 0, 1, 1, 1, Math.max(1, usecases.length - 1), usecases.length]} />} />
        <MetricCard label="Documents" value={String(totalDocs)} unit="docs" delta={activeUseCase ? "Active workspace" : "Select workspace"} deltaTone="flat"
          spark={<Sparkline data={[0, 0, 0, 0, 0, 0, totalDocs]} color="var(--acc-cyan)" />} />
        <MetricCard label="Agent Runs" value={String(totalRuns)} delta={activeUseCase ? "Active workspace" : "Select workspace"} deltaTone="flat"
          spark={<Sparkline data={[0, 0, 0, 0, 0, 0, totalRuns]} />} />
        <MetricCard label="Pipeline Stage" value={activeUseCase ? String(currentStage) : "—"} unit={activeUseCase ? "of 6" : ""}
          delta={activeUseCase ? stageLabel : "Select a workspace"} deltaTone="flat"
          spark={<Sparkline data={[0, 0, 1, 1, currentStage > 2 ? 2 : 0, currentStage > 3 ? 3 : 0, currentStage]} color="var(--acc-cyan)" />} />
      </div>

      {/* Pipeline lifecycle rail */}
      <div className="card mb-4" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--line-soft)", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "\"JetBrains Mono\"" }}>
          <div>
            <div className="card-title">Pipeline Lifecycle</div>
            <div className="card-sub mt-2">
              {activeUseCase
                ? progress
                  ? `Stage ${currentStage}/6 — ${stageLabel} · ${activeUseCase.name}`
                  : `Loading stages for ${activeUseCase.name}…`
                : "Select a workspace to track progress"}
            </div>
          </div>
          <Badge tone={!activeUseCase ? "default" : currentStage >= 6 ? "ok" : "lime"}>
            {!activeUseCase ? "No Workspace" : currentStage >= 6 ? "Complete" : `Stage ${currentStage}/6`}
          </Badge>
        </div>
        <div className="rail">
          {STAGE_DEFS.map((s, i) => {
            const state     = getStageState(i);
            const stageInfo = progress?.stages?.[i];
            return (
              <div key={s.num} className={`rail-step ${state}`}
                style={{ cursor: activeUseCase ? "pointer" : "default" }}
                onClick={() => activeUseCase && onNav(s.nav)}>
                <div className="pip"></div>
                <div className="num">{s.num}</div>
                <div className="name">{s.name}</div>
                <div className="desc">{stageInfo?.detail || s.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid-2-1 gap-6">
        <div className="card" style={{ padding: 0 }}>
          <div className="card-head" style={{ padding: "16px 18px", marginBottom: 0, borderBottom: "1px solid var(--line-soft)" }}>
            <div>
              <div className="card-title">Your Workspaces</div>
              <div className="card-sub mt-2">{usecases.length} workspace{usecases.length !== 1 ? "s" : ""}</div>
            </div>
            <button className="btn btn-ghost" onClick={() => onNav("onboarding")}>
              <Icon name="plus" size={12} /> New
            </button>
          </div>
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--fg-dim)", fontFamily: "var(--font-mono)", fontSize: 12 }}>Loading…</div>
          ) : usecases.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center" }}>
              <div style={{ color: "var(--fg-dim)", fontSize: 13, marginBottom: 12 }}>No workspaces yet.</div>
              <button className="btn btn-primary" onClick={() => onNav("onboarding")}>
                <Icon name="plus" size={13} /> Create your first workspace
              </button>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Workspace</th><th>Industry</th><th>Style</th><th>Docs</th><th>Runs</th><th>Created</th>
                </tr>
              </thead>
              <tbody>
                {usecases.map((uc) => (
                  <tr key={uc.id} style={{ cursor: "pointer", background: activeUseCase?.id === uc.id ? "var(--acc-lime-soft)" : undefined }}
                    onClick={() => onNav("usecases", uc)}>
                    <td>
                      {activeUseCase?.id === uc.id && <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--acc-lime)", marginRight: 6, verticalAlign: "middle" }} />}
                      {uc.name}
                    </td>
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
                ["01", "Create a workspace", "onboarding"],
                ["02", "Upload documents",   "knowledge" ],
                ["03", "Configure RAG",      "rag"       ],
                ["04", "Ask the agent",      "agent"     ],
                ["05", "Run evaluation",     "eval"      ],
                ["06", "Generate report",    "report"    ],
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
