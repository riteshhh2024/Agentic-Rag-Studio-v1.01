// Use Case Intake
const UseCases = ({ activeUseCase, onUseCaseChange }) => {
  const [form, setForm] = React.useState({
    name: "",
    industry: "",
    problem: "",
    users: "",
    sources: "",
    success: "",
    answer_style: "support-agent",
    latency: "3",
    accuracy: "High",
    risk: "Low",
  });
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [usecaseId, setUsecaseId] = React.useState(null);

  React.useEffect(() => {
    if (activeUseCase) {
      setUsecaseId(activeUseCase.id);
      setForm({
        name: activeUseCase.name || "",
        industry: activeUseCase.industry || "",
        problem: activeUseCase.business_problem || "",
        users: (activeUseCase.target_users || []).join(", "),
        sources: (activeUseCase.document_types || []).join(", "),
        success: (activeUseCase.success_criteria || []).join(", "),
        answer_style: activeUseCase.answer_style || "support-agent",
        latency: "3",
        accuracy: "High",
        risk: "Low",
      });
    }
  }, [activeUseCase]);

  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.problem.trim()) {
      setError("Workspace name and business problem are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        industry: form.industry.trim() || null,
        business_problem: form.problem.trim(),
        target_users: form.users.split(",").map(s => s.trim()).filter(Boolean),
        document_types: form.sources.split(",").map(s => s.trim()).filter(Boolean),
        success_criteria: form.success.split(",").map(s => s.trim()).filter(Boolean),
        answer_style: form.answer_style,
      };
      let result;
      if (usecaseId) {
        result = await API.usecases.update(usecaseId, payload);
      } else {
        result = await API.usecases.create(payload);
        setUsecaseId(result.id);
      }
      if (onUseCaseChange) onUseCaseChange(result);
      setSaved(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleNew = () => {
    setUsecaseId(null);
    setSaved(false);
    setError(null);
    setForm({
      name: "", industry: "", problem: "", users: "", sources: "", success: "",
      answer_style: "support-agent", latency: "3", accuracy: "High", risk: "Low",
    });
    if (onUseCaseChange) onUseCaseChange(null);
  };

  const ANSWER_STYLES = [
    { value: "concise", label: "CONCISE" },
    { value: "detailed", label: "DETAILED" },
    { value: "support-agent", label: "SUPPORT" },
    { value: "legal-review", label: "LEGAL" },
    { value: "technical-runbook", label: "TECHNICAL" },
  ];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow"><span className="glyph"></span> Step 01 · Use Case Intake</div>
          <h1 className="h1" style={{ fontSize: 38 }}>Define the workspace<br /><em>problem to solve</em></h1>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={handleNew}>
            <Icon name="plus" size={12} /> New Use Case
          </button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : saved ? <><Icon name="check" size={12} /> Saved</> : <><Icon name="copy" size={12} /> Save Use Case</>}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "var(--err)" + "22", border: "1px solid var(--err)", borderRadius: 8, marginBottom: 16, fontSize: 12.5, color: "var(--err)" }}>
          {error}
        </div>
      )}

      <div className="grid-2-1 gap-6">
        <div className="card">
          <div className="card-head">
            <div>
              <div className="card-title">Workspace Brief</div>
              <div className="card-sub mt-2">Captures the workspace context, end users and constraints</div>
            </div>
            <Badge tone={saved ? "ok" : "lime"}>{usecaseId ? (saved ? "Saved" : "Unsaved") : "New"}</Badge>
          </div>

          <div className="flex-col gap-4">
            <div className="grid-2 gap-4">
              <div>
                <label className="field-label">Workspace Name *</label>
                <input className="input" value={form.name} onChange={set("name")} placeholder="e.g. HR Policy Assistant" />
              </div>
              <div>
                <label className="field-label">Industry</label>
                <input className="input" value={form.industry} onChange={set("industry")} placeholder="e.g. Consumer SaaS" />
              </div>
            </div>

            <div>
              <label className="field-label">Business Problem *</label>
              <textarea className="textarea" value={form.problem} onChange={set("problem")}
                placeholder="Describe the core problem this RAG system will solve…" />
            </div>

            <div className="grid-2 gap-4">
              <div>
                <label className="field-label">Target Users</label>
                <input className="input" value={form.users} onChange={set("users")} placeholder="Support Agents, Team Leads" />
                <div className="field-hint">Comma-separated</div>
              </div>
              <div>
                <label className="field-label">Knowledge Sources / Document Types</label>
                <input className="input" value={form.sources} onChange={set("sources")} placeholder="Refund policy, SOP, FAQ" />
                <div className="field-hint">Comma-separated</div>
              </div>
            </div>

            <div>
              <label className="field-label">Success Criteria</label>
              <textarea className="textarea" value={form.success} onChange={set("success")}
                placeholder="Citations required, latency under 3 seconds, low hallucination risk" style={{ minHeight: 60 }} />
              <div className="field-hint">Comma-separated criteria</div>
            </div>

            <div className="divider-stripe"></div>

            <div>
              <label className="field-label">Answer Style</label>
              <div className="seg" style={{ flexWrap: "wrap" }}>
                {ANSWER_STYLES.map(o => (
                  <button key={o.value} className={form.answer_style === o.value ? "active" : ""}
                    onClick={() => { setForm({ ...form, answer_style: o.value }); setSaved(false); }}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid-2 gap-4">
              <div>
                <label className="field-label">Latency Requirement</label>
                <div className="slider-row">
                  <input type="range" className="slider" min="1" max="10" value={form.latency} onChange={set("latency")} />
                  <span className="slider-val">≤ {form.latency}.0s</span>
                </div>
                <div className="field-hint">P95 end-to-end response time</div>
              </div>
              <div>
                <label className="field-label">Risk Tolerance</label>
                <Seg value={form.risk} options={[
                  { value: "Low", label: "LOW" }, { value: "Med", label: "MED" }, { value: "High", label: "HIGH" }
                ]} onChange={(v) => { setForm({ ...form, risk: v }); setSaved(false); }} />
                <div className="field-hint">Tolerance for unverified outputs</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-col gap-4">
          <div className="card" style={{ borderColor: "var(--acc-lime-line)" }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}><span className="glyph"></span> Live Preview</div>
            <div className="card-title">Solution Summary</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, lineHeight: 1.3, marginTop: 12, letterSpacing: "-0.01em" }}>
              {form.name || <span style={{ color: "var(--fg-faint)" }}>Enter a name…</span>}
            </div>
            {form.industry && <div className="mono dim" style={{ fontSize: 11, marginTop: 6 }}>{form.industry}</div>}

            <div className="divider-stripe mt-4 mb-4"></div>

            {form.problem ? (
              <div style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.6 }}>
                {form.users && <>For <b style={{ color: "var(--fg)" }}>{form.users.split(",")[0]}</b> — </>}
                {form.problem.substring(0, 120)}{form.problem.length > 120 ? "…" : ""}
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: "var(--fg-faint)" }}>Describe the business problem above…</div>
            )}

            <div className="mt-4 flex-col gap-2">
              <div className="flex items-center justify-between" style={{ fontSize: 11.5 }}>
                <span className="mono dim">Risk profile</span>
                <Badge tone={form.risk === "Low" ? "ok" : form.risk === "Med" ? "warn" : "err"}>{form.risk}</Badge>
              </div>
              <div className="flex items-center justify-between" style={{ fontSize: 11.5 }}>
                <span className="mono dim">Latency target</span><span className="mono">≤ {form.latency}.0s</span>
              </div>
              <div className="flex items-center justify-between" style={{ fontSize: 11.5 }}>
                <span className="mono dim">Answer style</span><span className="mono">{form.answer_style}</span>
              </div>
              <div className="flex items-center justify-between" style={{ fontSize: 11.5 }}>
                <span className="mono dim">Saved ID</span>
                <span className="mono dim">{usecaseId ? usecaseId.slice(0, 12) + "…" : "—"}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title mb-3">Recommended Architecture</div>
            <div className="flex-col gap-2" style={{ fontSize: 12.5 }}>
              {[
                ["Retrieval", "Dense vector + ChromaDB"],
                ["Embedding", "text-embedding-3-small"],
                ["Vector DB", "ChromaDB (local)"],
                ["Reranker", "Optional — toggle in RAG Config"],
                ["Agent pattern", "LangGraph-style controlled"],
                ["Evaluator", "LLM-judge + citation check"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between" style={{ paddingBottom: 6, borderBottom: "1px dashed var(--line-soft)" }}>
                  <span className="mono dim" style={{ fontSize: 11 }}>{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

window.UseCases = UseCases;
