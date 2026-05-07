// Agent Workspace — wired to real API
const Agent = ({ activeUseCase, onNav, providerConfig }) => {
  const usecaseId = activeUseCase?.id;

  // ── conversation state ────────────────────────────────────────────────────
  const [messages,   setMessages]   = useState([]);   // [{role,content,run}]
  const [query,      setQuery]      = useState("");
  const [running,    setRunning]    = useState(false);
  const [error,      setError]      = useState(null);

  // ── active run (right panel) ──────────────────────────────────────────────
  const [activeRun,  setActiveRun]  = useState(null); // full AgentAskResponse

  // ── run history (sidebar / list) ─────────────────────────────────────────
  const [history,    setHistory]    = useState([]);
  const [histLoading,setHistLoading]= useState(false);

  const textareaRef = React.useRef(null);
  const chatBottomRef = React.useRef(null);

  const NODE_LABELS = {
    intent_analyzer:    "Query Understanding",
    retriever:          "Retriever",
    answer_generator:   "Answer Generator",
    grounding_verifier: "Grounding Verifier",
    risk_classifier:    "Risk Classifier",
    final_responder:    "Final Response",
  };

  // ── load run history on mount ─────────────────────────────────────────────
  useEffect(() => {
    if (!usecaseId) return;
    setHistLoading(true);
    API.agent.listRuns(usecaseId)
      .then(runs => setHistory(runs))
      .catch(() => {})
      .finally(() => setHistLoading(false));
  }, [usecaseId]);

  // ── auto-scroll chat ──────────────────────────────────────────────────────
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, running]);

  // ── submit question ───────────────────────────────────────────────────────
  const submit = async (q) => {
    const question = (q || query).trim();
    if (!question || !usecaseId || running) return;

    setQuery("");
    setError(null);
    setRunning(true);

    // add user message
    setMessages(prev => [...prev, { role: "user", content: question }]);

    try {
      const res = await API.agent.ask({
        usecase_id: usecaseId,
        question,
        provider:   providerConfig?.provider   || "openai",
        model:      providerConfig?.chat_model || null,
        rag_config: { top_k: 5, reranking: false, citation_required: true },
      });

      setMessages(prev => [...prev, { role: "agent", content: res.answer, run: res }]);
      setActiveRun(res);

      // refresh history
      API.agent.listRuns(usecaseId).then(setHistory).catch(() => {});
    } catch (e) {
      setError(e.message);
      setMessages(prev => [...prev, { role: "agent", content: `Error: ${e.message}`, run: null }]);
    } finally {
      setRunning(false);
    }
  };

  // ── load a past run into the right panel ──────────────────────────────────
  const loadRun = (histRun) => {
    API.agent.getRun(usecaseId, histRun.id)
      .then(run => setActiveRun(run))
      .catch(() => {});
  };

  const riskTone = (level) => level === "high" ? "red" : level === "medium" ? "warn" : "ok";
  const riskColor = (level) => level === "high" ? "var(--acc-red, #e55)" : level === "medium" ? "var(--warn, #e8a84a)" : "var(--acc-lime)";

  const suggestions = [
    "What is the refund policy for damaged delivery?",
    "Can a customer request a refund after 45 days?",
    "How do I escalate a billing dispute?",
  ];

  // ── no use case guard ─────────────────────────────────────────────────────
  if (!usecaseId) {
    return (
      <div className="page">
        <div className="page-head">
          <div>
            <div className="eyebrow"><span className="glyph"></span> Step 04 · Agentic Q&amp;A</div>
            <h2 className="h2" style={{ fontSize: 32 }}>Controlled <em style={{ color: "var(--acc-lime)" }}>multi-step</em> workflow</h2>
          </div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No use case selected</div>
          <div className="card-sub mb-4">Select a use case to run the agentic workflow.</div>
          <button className="btn btn-primary" onClick={() => onNav && onNav("usecases")}>Go to Use Cases</button>
        </div>
      </div>
    );
  }

  // ── trace step renderer ───────────────────────────────────────────────────
  const TracePanel = ({ run }) => {
    if (!run) return (
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--line-soft)" }}>
          <div className="card-title">Agent Trace</div>
          <div className="card-sub mt-2">Run a question to see the trace</div>
        </div>
        <div style={{ padding: "20px 18px", color: "var(--text-muted)", fontSize: 12.5 }}>
          No run yet. Ask a question to see the 6-node workflow trace.
        </div>
      </div>
    );

    const totalMs = run.metrics?.latency_ms || 0;
    const steps = run.agent_trace || [];

    return (
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--line-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="card-title">Agent Trace</div>
            <div className="card-sub mt-2">{steps.length} stages · {totalMs}ms total</div>
          </div>
          <Badge tone={riskTone(run.risk_level)}>
            {run.risk_level === "high" ? "⚠ High Risk" : run.risk_level === "medium" ? "⚠ Med Risk" : "✓ Low Risk"}
          </Badge>
        </div>
        <div className="steps">
          {steps.map((s, i) => {
            const label = NODE_LABELS[s.node] || s.node;
            const isRisk = s.node === "risk_classifier";
            const isFailed = s.status === "failed";
            const isSkipped = s.status === "skipped";
            return (
              <div key={i} className={`step ${isFailed ? "failed" : isSkipped ? "" : "done"}`}>
                <div className="marker"></div>
                <div className="name">
                  <span>{i+1}. {label}</span>
                  {s.latency_ms > 0 && <span className="mono dim" style={{ fontSize: 10.5 }}>{s.latency_ms}ms</span>}
                </div>
                <div className={`meta${isRisk && run.risk_level !== "low" ? " lime" : ""}`}
                  style={isRisk && run.risk_level !== "low" ? { color: riskColor(run.risk_level) } : {}}
                >
                  {s.detail || s.status}
                </div>
              </div>
            );
          })}
        </div>
        {run.metrics && (
          <div style={{ padding: "10px 18px", borderTop: "1px solid var(--line-soft)", fontSize: 11, color: "var(--text-muted)", display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span>{run.metrics.latency_ms}ms</span>
            {run.metrics.input_tokens && <span>{run.metrics.input_tokens + (run.metrics.output_tokens||0)} tokens</span>}
            {run.metrics.estimated_cost_usd && <span>${run.metrics.estimated_cost_usd.toFixed(5)}</span>}
          </div>
        )}
      </div>
    );
  };

  // ── context chunks panel ──────────────────────────────────────────────────
  const ContextPanel = ({ run }) => {
    if (!run || !run.citations || run.citations.length === 0) return (
      <div className="card">
        <div className="card-title mb-2">Retrieved Context</div>
        <div style={{ fontSize: 12.5, color: "var(--text-muted)" }}>
          {run ? "No chunks retrieved for this run." : "Ask a question to see retrieved context."}
        </div>
      </div>
    );

    return (
      <div className="card">
        <div className="card-head">
          <div className="card-title">Retrieved Context · {run.citations.length} sources</div>
        </div>
        {run.citations.map((c, i) => (
          <div key={i} className="snippet">
            <div className="src">
              <span><Icon name="file" size={10} style={{ color: "var(--acc-cyan)", marginRight: 6 }}/> {c.filename}{c.section ? ` · ${c.section}` : ""}</span>
              {c.chunk_id && <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>{c.chunk_id.slice(0,8)}</span>}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ── answer renderer ───────────────────────────────────────────────────────
  const renderAnswer = (msg) => {
    const run = msg.run;
    const lines = msg.content.split("\n").filter(l => l.trim());

    return (
      <div className="body">
        <div style={{ lineHeight: 1.7, fontSize: 13.5, whiteSpace: "pre-wrap", marginBottom: 12 }}>
          {msg.content}
        </div>

        {run && run.risk_level && run.risk_level !== "low" && (
          <div style={{
            marginTop: 12, padding: "10px 14px",
            borderLeft: `2px solid ${riskColor(run.risk_level)}`,
            background: "var(--acc-lime-soft)",
            borderRadius: "0 8px 8px 0",
          }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: riskColor(run.risk_level), textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
              {run.risk_level === "high" ? "⚠ High Risk" : "⚠ Escalation May Be Required"}
            </div>
            <div style={{ fontSize: 12, color: "var(--fg-muted)" }}>
              {run.agent_trace?.find(t => t.node === "risk_classifier")?.detail || `Risk level: ${run.risk_level}`}
            </div>
          </div>
        )}

        {run && run.citations && run.citations.length > 0 && (
          <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8, fontSize: 11, color: "var(--fg-dim)", fontFamily: "var(--font-mono)" }}>
            <span>Sources:</span>
            {run.citations.map((c, i) => (
              <span key={i}>
                <cite className="cite">{i+1}</cite> {c.filename}{c.section ? ` §${c.section}` : ""}
              </span>
            ))}
          </div>
        )}

        {run && run.metrics && (
          <div style={{ marginTop: 8, fontSize: 10.5, color: "var(--text-muted)", fontFamily: "monospace" }}>
            {run.metrics.latency_ms}ms
            {run.metrics.input_tokens ? ` · ${run.metrics.input_tokens + (run.metrics.output_tokens||0)} tokens` : ""}
            {" · "}<span style={{ color: riskColor(run.risk_level) }}>{run.risk_level} risk</span>
          </div>
        )}
      </div>
    );
  };

  const runCount = history.length;

  return (
    <div className="page" style={{ paddingTop: 20 }}>
      <div className="page-head" style={{ marginBottom: 16 }}>
        <div>
          <div className="eyebrow">
            <span className="glyph"></span> Step 04 · Agentic Q&amp;A
            {runCount > 0 && ` · ${runCount} run${runCount !== 1 ? "s" : ""}`}
          </div>
          <h2 className="h2" style={{ fontSize: 32 }}>
            Controlled <em style={{ color: "var(--acc-lime)", fontStyle: "italic" }}>multi-step</em> workflow
          </h2>
        </div>
        <div className="flex gap-2">
          <Badge tone="cyan"><Icon name="git" size={11} /> LangGraph-style</Badge>
          {activeRun && (
            <Badge tone={riskTone(activeRun.risk_level)}>
              Risk: {activeRun.risk_level}
            </Badge>
          )}
          <button className="btn btn-ghost" onClick={() => { setMessages([]); setActiveRun(null); setQuery(""); }}>
            <Icon name="refresh" size={12} /> Clear
          </button>
        </div>
      </div>

      {error && (
        <div className="card mb-3" style={{ background: "var(--acc-red-soft, #2a1010)", border: "1px solid var(--acc-red, #e55)", padding: "10px 16px", color: "var(--acc-red, #e55)", fontSize: 12.5 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
        {/* ── LEFT: Chat ── */}
        <div className="card" style={{ padding: 0, display: "flex", flexDirection: "column", minHeight: 680 }}>
          {/* header */}
          <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--line-soft)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div className="flex items-center gap-3">
              <Icon name="bot" size={14} style={{ color: "var(--acc-lime)" }} />
              <span style={{ fontSize: 13, fontWeight: 500 }}>{activeUseCase?.name || "Agent"}</span>
              {activeRun && (
                <Badge tone="ok"><span className="dot" style={{ width: 5, height: 5 }}></span> Grounded</Badge>
              )}
            </div>
            {activeRun && (
              <span className="mono dim" style={{ fontSize: 11 }}>
                {activeRun.metrics?.latency_ms}ms · {activeRun.agent_trace?.length} steps · {activeRun.citations?.length} sources
              </span>
            )}
          </div>

          {/* messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
            {messages.length === 0 && (
              <div style={{ padding: "32px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>🤖</div>
                <div style={{ fontWeight: 500, marginBottom: 6 }}>Ready to answer questions</div>
                <div className="card-sub">Ask a question about your uploaded documents.<br/>The 6-node workflow will analyze, retrieve, generate, and verify.</div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg${msg.role === "user" ? " user" : ""}`}>
                <div className="who" style={msg.role === "agent" ? { color: "var(--acc-lime)" } : {}}>
                  {msg.role === "user" ? "Operator" : "Agent"}
                </div>
                {msg.role === "user"
                  ? <div className="body"><p>{msg.content}</p></div>
                  : renderAnswer(msg)
                }
              </div>
            ))}
            {running && (
              <div className="chat-msg">
                <div className="who" style={{ color: "var(--acc-lime)" }}>Agent</div>
                <div className="body">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--text-muted)" }}>
                    <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
                    Running 6-node workflow…
                  </div>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* input */}
          <div style={{ padding: 14, borderTop: "1px solid var(--line-soft)", background: "var(--bg-canvas)" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", background: "var(--bg-input)", border: "1px solid var(--line-soft)", borderRadius: 12, padding: 10 }}>
              <textarea
                ref={textareaRef}
                className="textarea"
                placeholder="Ask the agent…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
                disabled={running}
                style={{ background: "transparent", border: "none", padding: 4, minHeight: 36, fontSize: 13.5, boxShadow: "none", flex: 1, resize: "none" }}
                onFocus={(e) => e.target.style.boxShadow = "none"}
              />
              <button className="btn btn-primary" style={{ padding: "7px 12px" }} onClick={() => submit()} disabled={running || !query.trim()}>
                <Icon name="arrowRight" size={13} /> Run
              </button>
            </div>
            <div className="flex gap-2 mt-3" style={{ fontSize: 11.5, flexWrap: "wrap" }}>
              <span className="mono dim">Try:</span>
              {suggestions.map(s => (
                <span
                  key={s}
                  style={{ padding: "2px 8px", borderRadius: 5, background: "var(--bg-elev)", color: "var(--fg-muted)", cursor: "pointer", border: "1px solid var(--line-soft)" }}
                  onClick={() => { setQuery(s); textareaRef.current?.focus(); }}
                >
                  {s.length > 38 ? s.slice(0, 38) + "…" : s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Trace + Context + History ── */}
        <div className="flex-col gap-4" style={{ minWidth: 0 }}>
          <TracePanel run={activeRun} />
          <ContextPanel run={activeRun} />

          {/* Run History */}
          {history.length > 0 && (
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--line-soft)" }}>
                <div className="card-title">Run History</div>
                <div className="card-sub mt-2">{history.length} past run{history.length !== 1 ? "s" : ""}</div>
              </div>
              <div style={{ maxHeight: 220, overflowY: "auto" }}>
                {history.map(r => (
                  <div
                    key={r.id}
                    onClick={() => loadRun(r)}
                    style={{
                      padding: "10px 18px",
                      borderBottom: "1px solid var(--line-soft)",
                      cursor: "pointer",
                      background: activeRun?.run_id === r.id ? "var(--bg-elev)" : "transparent",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-elev)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = activeRun?.run_id === r.id ? "var(--bg-elev)" : "transparent"}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 500, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.question}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", gap: 10 }}>
                      <span style={{ color: riskColor(r.risk_level) }}>{r.risk_level} risk</span>
                      {r.latency_ms && <span>{r.latency_ms}ms</span>}
                      <span>{new Date(r.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .flex-col { display: flex; flex-direction: column; }
      `}</style>
    </div>
  );
};

window.Agent = Agent;
