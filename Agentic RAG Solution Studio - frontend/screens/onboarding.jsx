// Onboarding Wizard — 4-step setup flow, wired to real API
const Onboarding = ({ onNav, onUseCaseChange }) => {
  const [step,      setStep]      = useState(0);
  const [launching, setLaunching] = useState(false);
  const [error,     setError]     = useState(null);

  const [data, setData] = useState({
    type:       "support",
    name:       "Acme Support Knowledge Assistant",
    industry:   "Consumer Internet / SaaS",
    problem:    "Support agents spend too much time searching policy documents, troubleshooting guides, and escalation SOPs.",
    users:      "Customer support agents and support team leads",
    sources:    ["PDFs", "Markdown", "DOCX", "Internal SOPs"],
    style:      "Support-Agent Tone",
    citation:   true,
    escalation: true,
    latency:    "Under 3 seconds",
    grounding:  "High",
  });

  const set = (k, v) => setData(d => ({ ...d, [k]: v }));
  const toggleSrc = (s) => set("sources", data.sources.includes(s) ? data.sources.filter(x => x !== s) : [...data.sources, s]);

  const steps = [
    { num: "01", label: "Use Case Type" },
    { num: "02", label: "Customer Context" },
    { num: "03", label: "Requirements" },
    { num: "04", label: "Review & Launch" },
  ];

  const useCases = [
    { id: "support",  title: "Customer Support Knowledge Assistant", desc: "Policy, FAQ, troubleshooting, and support workflows.",       icon: "bot"      },
    { id: "contract", title: "Enterprise Contract Intelligence",     desc: "Contracts, clauses, risk review, and structured extraction.", icon: "shield"   },
    { id: "docs",     title: "Technical Documentation Copilot",      desc: "API docs, deployment guides, runbooks, developer support.",   icon: "file"     },
    { id: "custom",   title: "Custom Enterprise RAG POC",            desc: "Start from a blank solution architecture.",                  icon: "sparkles" },
  ];

  const next = () => setStep(s => Math.min(3, s + 1));
  const back = () => setStep(s => Math.max(0, s - 1));

  const handleLaunch = async () => {
    setLaunching(true);
    setError(null);
    try {
      const styleMap = {
        "Concise": "concise",
        "Detailed": "detailed",
        "Support-Agent Tone": "support",
        "Technical Tone": "technical",
      };
      const payload = {
        name:             data.name.trim() || "New POC",
        industry:         data.industry.trim() || null,
        business_problem: data.problem.trim(),
        target_users:     data.users.split(",").map(u => u.trim()).filter(Boolean),
        document_types:   data.sources,
        success_criteria: [
          data.citation   ? "Citation required on all answers" : "Citation optional",
          data.escalation ? "High-risk queries escalated to Tier-2" : null,
          `Latency: ${data.latency.toLowerCase()}`,
          `Grounding: ${data.grounding}`,
        ].filter(Boolean),
        answer_style: styleMap[data.style] || "concise",
      };
      const created = await API.usecases.create(payload);
      if (onUseCaseChange) onUseCaseChange(created);
      if (onNav) onNav("knowledge", created);
    } catch (e) {
      setError(e.message);
    } finally {
      setLaunching(false);
    }
  };

  const handleSample = () => {
    if (onNav) onNav("dashboard");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: `radial-gradient(1200px 600px at 80% -10%, var(--grad-1), transparent 60%), radial-gradient(900px 500px at -10% 100%, var(--grad-2), transparent 60%), var(--bg-base)`,
      display: "flex", flexDirection: "column",
    }}>
      {/* Top bar */}
      <div style={{ padding: "20px 32px", borderBottom: "1px solid var(--line-soft)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--acc-lime-soft)", border: "1px solid var(--acc-lime-line)", display: "grid", placeItems: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 6 L12 2 L20 6 L20 18 L12 22 L4 18 Z" stroke="var(--acc-lime)" strokeWidth="1.4" strokeLinejoin="round"/>
              <path d="M12 2 L12 12 L4 6" stroke="var(--acc-lime)" strokeWidth="1" opacity="0.6" strokeLinejoin="round"/>
              <path d="M12 12 L20 6 M12 12 L12 22" stroke="var(--acc-lime)" strokeWidth="1" opacity="0.4"/>
              <circle cx="12" cy="12" r="1.6" fill="var(--acc-lime)"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: "-0.01em" }}>Agentic RAG Studio</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Enterprise GenAI POC Builder</div>
          </div>
        </div>
        <button className="btn btn-ghost" onClick={handleSample}>
          <Icon name="zap" size={12} /> Load Sample POC
        </button>
      </div>

      {/* Step progress */}
      <div style={{ padding: "28px 32px 0", maxWidth: 1080, width: "100%", margin: "0 auto" }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}><span className="glyph"></span> Workspace Setup · Step {step + 1} of 4</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 8 }}>
          {steps.map((s, i) => (
            <div key={s.num} style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: i === step ? "var(--bg-card-hi)" : "transparent",
              border: `1px solid ${i <= step ? "var(--acc-lime-line)" : "var(--line-soft)"}`,
              opacity: i > step ? 0.55 : 1,
              transition: "all 200ms",
            }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: i <= step ? "var(--acc-lime)" : "var(--fg-faint)", letterSpacing: "0.1em" }}>{s.num}</div>
              <div style={{ fontSize: 12.5, marginTop: 3, fontWeight: 500 }}>{s.label}</div>
              <div style={{ height: 2, marginTop: 8, background: i < step ? "var(--acc-lime)" : i === step ? "linear-gradient(90deg, var(--acc-lime), transparent)" : "var(--line-soft)", borderRadius: 2 }}></div>
            </div>
          ))}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ maxWidth: 1080, margin: "16px auto 0", width: "100%", padding: "0 32px" }}>
          <div style={{ padding: "12px 16px", background: "var(--acc-red-soft, #2a1010)", border: "1px solid var(--acc-red, #e55)", borderRadius: 8, color: "var(--acc-red, #e55)", fontSize: 13 }}>
            {error}
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, padding: "32px 32px 24px", maxWidth: 1080, width: "100%", margin: "0 auto" }}>

        {/* Step 0 — Use Case Type */}
        {step === 0 && (
          <div>
            <h1 className="h1" style={{ fontSize: 40, marginBottom: 8 }}>What type of <em>GenAI solution</em><br/>are you building?</h1>
            <p className="h1-sub">Pick a starting point — we'll pre-configure the agent graph, retrieval policy and evaluation set for that pattern.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 28 }}>
              {useCases.map(uc => {
                const sel = data.type === uc.id;
                return (
                  <div key={uc.id} onClick={() => set("type", uc.id)} className="card" style={{
                    cursor: "pointer",
                    borderColor: sel ? "var(--acc-lime-line)" : "var(--line-soft)",
                    background: sel ? "linear-gradient(135deg, var(--bg-card-hi), var(--bg-card))" : "var(--bg-card)",
                    transition: "all 160ms",
                    padding: 22,
                    position: "relative",
                  }}>
                    {sel && <div style={{ position: "absolute", top: 14, right: 14, width: 18, height: 18, borderRadius: "50%", background: "var(--acc-lime)", display: "grid", placeItems: "center" }}><Icon name="check" size={11} stroke={3} style={{ color: "var(--bg-base)" }}/></div>}
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: sel ? "var(--acc-lime-soft)" : "var(--bg-elev)", border: `1px solid ${sel ? "var(--acc-lime-line)" : "var(--line)"}`, display: "grid", placeItems: "center", color: sel ? "var(--acc-lime)" : "var(--fg-muted)", marginBottom: 14 }}>
                      <Icon name={uc.icon} size={17}/>
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: "-0.01em", lineHeight: 1.25 }}>{uc.title}</div>
                    <div style={{ fontSize: 12.5, color: "var(--fg-muted)", marginTop: 8, lineHeight: 1.55 }}>{uc.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 1 — Customer Context */}
        {step === 1 && (
          <div>
            <h1 className="h1" style={{ fontSize: 40, marginBottom: 8 }}>Define the <em>customer problem</em></h1>
            <p className="h1-sub">Capture the demo context, end users and constraints. This becomes the brief in the customer-facing POC report.</p>
            <div className="card mt-6" style={{ padding: 24 }}>
              <div className="grid-2 gap-4">
                <div>
                  <label className="field-label">Customer / Demo Name</label>
                  <input className="input" value={data.name} onChange={(e) => set("name", e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Industry</label>
                  <input className="input" value={data.industry} onChange={(e) => set("industry", e.target.value)} />
                </div>
              </div>
              <div className="mt-4">
                <label className="field-label">Business Problem</label>
                <textarea className="textarea" value={data.problem} onChange={(e) => set("problem", e.target.value)} />
              </div>
              <div className="mt-4">
                <label className="field-label">Target Users</label>
                <input className="input" value={data.users} onChange={(e) => set("users", e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Step 2 — Requirements */}
        {step === 2 && (
          <div>
            <h1 className="h1" style={{ fontSize: 40, marginBottom: 8 }}>Set <em>knowledge &amp; response</em><br/>requirements</h1>
            <p className="h1-sub">These map directly to the RAG pipeline configuration and evaluation thresholds.</p>
            <div className="card mt-6" style={{ padding: 24 }}>
              <label className="field-label">Knowledge Source Types</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                {["PDFs", "Markdown", "TXT", "DOCX", "Internal SOPs", "API Docs"].map(s => {
                  const on = data.sources.includes(s);
                  return (
                    <button key={s} onClick={() => toggleSrc(s)} style={{
                      padding: "7px 12px", borderRadius: 7, fontSize: 12.5,
                      border: `1px solid ${on ? "var(--acc-lime-line)" : "var(--line-soft)"}`,
                      background: on ? "var(--acc-lime-soft)" : "var(--bg-input)",
                      color: on ? "var(--acc-lime)" : "var(--fg-muted)",
                      cursor: "pointer",
                      display: "inline-flex", alignItems: "center", gap: 6,
                    }}>
                      {on && <Icon name="check" size={11} stroke={2.5}/>}{s}
                    </button>
                  );
                })}
              </div>

              <div style={{ height: 1, background: "var(--line-soft)", margin: "20px 0" }}></div>

              <label className="field-label">Expected Answer Style</label>
              <Seg value={data.style} options={[
                { value: "Concise",            label: "CONCISE"   },
                { value: "Detailed",           label: "DETAILED"  },
                { value: "Support-Agent Tone", label: "SUPPORT"   },
                { value: "Technical Tone",     label: "TECHNICAL" },
              ]} onChange={(v) => set("style", v)} />

              <div className="grid-2 gap-4 mt-4">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--bg-canvas)", borderRadius: 10, border: "1px solid var(--line-soft)" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Citation Required</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>Block answers without source spans</div>
                  </div>
                  <Toggle on={data.citation} onChange={(v) => set("citation", v)} />
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "var(--bg-canvas)", borderRadius: 10, border: "1px solid var(--line-soft)" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>Escalation Required</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>Route flagged risks to Tier-2</div>
                  </div>
                  <Toggle on={data.escalation} onChange={(v) => set("escalation", v)} />
                </div>
              </div>

              <div className="grid-2 gap-4 mt-4">
                <div>
                  <label className="field-label">Latency Requirement</label>
                  <select className="select" value={data.latency} onChange={(e) => set("latency", e.target.value)}>
                    <option>Under 1 second</option>
                    <option>Under 3 seconds</option>
                    <option>Under 5 seconds</option>
                    <option>Under 10 seconds</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">Grounding Requirement</label>
                  <select className="select" value={data.grounding} onChange={(e) => set("grounding", e.target.value)}>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Strict</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Review & Launch */}
        {step === 3 && (
          <div>
            <h1 className="h1" style={{ fontSize: 40, marginBottom: 8 }}>Review your <em>GenAI POC</em><br/>workspace</h1>
            <p className="h1-sub">Confirm the configuration. You can change any of this later from the workspace settings.</p>

            <div className="card mt-6" style={{ padding: 0, overflow: "hidden", borderColor: "var(--acc-lime-line)" }}>
              <div style={{ padding: "22px 26px", background: "linear-gradient(135deg, var(--bg-card-hi), var(--bg-card))", borderBottom: "1px solid var(--line-soft)" }}>
                <div className="eyebrow" style={{ marginBottom: 10 }}><span className="glyph"></span> Workspace Summary</div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 28, letterSpacing: "-0.01em", lineHeight: 1.25 }}>{data.name}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>{data.industry} · {useCases.find(u => u.id === data.type)?.title}</div>
              </div>

              <div style={{ padding: "20px 26px" }}>
                <div className="grid-2 gap-6">
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Goal</div>
                    <div style={{ fontSize: 13.5, color: "var(--fg-muted)", lineHeight: 1.55 }}>{data.problem}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Target Users</div>
                    <div style={{ fontSize: 13.5, color: "var(--fg-muted)", lineHeight: 1.55 }}>{data.users}</div>
                  </div>
                </div>

                <div style={{ height: 1, background: "var(--line-soft)", margin: "18px 0" }}></div>

                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Configuration</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                  {[
                    [data.citation   ? "Citation required"    : "Citation optional",   data.citation   ],
                    [data.escalation ? "Escalation enabled"   : "Escalation disabled", data.escalation ],
                    [`Grounding: ${data.grounding}`, true],
                    [`Latency: ${data.latency.toLowerCase()}`, true],
                    [`Style: ${data.style}`, true],
                    [`Sources: ${data.sources.join(", ")}`, true],
                  ].map(([label, on], i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "var(--fg-muted)", padding: "6px 0" }}>
                      <Icon name="check" size={11} stroke={2.5} style={{ color: on ? "var(--acc-lime)" : "var(--fg-faint)" }}/>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div style={{ padding: "20px 32px", borderTop: "1px solid var(--line-soft)", background: "color-mix(in oklab, var(--bg-base) 80%, transparent)", backdropFilter: "blur(10px)" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button className="btn btn-ghost" onClick={back} disabled={step === 0} style={{ opacity: step === 0 ? 0.4 : 1 }}>
            <Icon name="arrowRight" size={12} style={{ transform: "rotate(180deg)" }} /> Back
          </button>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)" }}>Step {step + 1} of 4 · {steps[step].label}</div>
          {step < 3 ? (
            <button className="btn btn-primary" onClick={next}>
              Continue <Icon name="arrowRight" size={12}/>
            </button>
          ) : (
            <button className="btn btn-primary" onClick={handleLaunch} disabled={launching}>
              {launching ? (
                "Creating workspace…"
              ) : (
                <><Icon name="sparkles" size={12}/> Launch Workspace</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

window.Onboarding = Onboarding;
