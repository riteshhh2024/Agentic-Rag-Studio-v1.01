// Benchmarks — wired to real agent_runs metrics
const Benchmarks = ({ activeUseCase, onNav }) => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!activeUseCase) return;
    setLoading(true); setError(null);
    API.benchmarks.summary(activeUseCase.id)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [activeUseCase?.id]);

  // ── helpers ───────────────────────────────────────────────────────────────
  const fmt_ms   = v => v == null ? "—" : v >= 1000 ? `${(v/1000).toFixed(1)}s` : `${v}ms`;
  const fmt_cost = v => v == null ? "—" : v < 0.001 ? `$${(v*1000).toFixed(4)}‰` : `$${v.toFixed(4)}`;
  const pct      = (a, b) => (b ? Math.round((a / b) * 100) : 0);

  // Sparkline (SVG) for an array of nullable numbers
  const Sparkline = ({ values, color = "var(--acc-lime)", height = 48 }) => {
    const valid = values.filter(v => v != null);
    if (valid.length < 2) return <div style={{ height, display: "grid", placeItems: "center", fontSize: 11, color: "var(--text-muted)", opacity: 0.6 }}>no data</div>;
    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const range = max - min || 1;
    const w = 260;
    const pts = values.map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = v == null ? null : height - ((v - min) / range) * (height - 8) - 4;
      return { x, y };
    }).filter(p => p.y != null);
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const fill = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
      + ` L${pts[pts.length-1].x},${height} L${pts[0].x},${height} Z`;
    return (
      <svg width="100%" viewBox={`0 0 ${w} ${height}`} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fill} fill="url(#spark-grad)" />
        <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    );
  };

  // ── no use-case selected ──────────────────────────────────────────────────
  if (!activeUseCase) return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow"><span className="glyph"></span> Step 06 · Inference Benchmarks</div>
          <h1 className="h1" style={{ fontSize: 38 }}>Compare<br /><em>inference providers</em></h1>
        </div>
      </div>
      <div className="card" style={{ textAlign: "center", padding: 48 }}>
        <div className="card-sub" style={{ marginBottom: 12 }}>No use case selected</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Select a use case from the sidebar to view benchmark data.</div>
      </div>
    </div>
  );

  // ── loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow"><span className="glyph"></span> Step 06 · Inference Benchmarks</div>
          <h1 className="h1" style={{ fontSize: 38 }}>Compare<br /><em>inference providers</em></h1>
        </div>
      </div>
      <div className="card" style={{ textAlign: "center", padding: 40 }}><div className="card-sub">Loading metrics…</div></div>
    </div>
  );

  const riskTotal = data ? Object.values(data.risk_distribution).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow"><span className="glyph"></span> Step 06 · Inference Benchmarks</div>
          <h1 className="h1" style={{ fontSize: 38 }}>Compare<br /><em>inference providers</em></h1>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={() => onNav && onNav("agent")}>
            <Icon name="zap" size={12} /> Run Agent Query
          </button>
        </div>
      </div>

      {error && (
        <div className="card mb-4" style={{ background: "var(--acc-red-soft, #2a1010)", border: "1px solid var(--acc-red, #e55)", padding: "12px 16px", color: "var(--acc-red, #e55)", fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* ── Info banner ── */}
      <div className="card mb-4" style={{ borderColor: "var(--acc-cyan-soft)", background: "linear-gradient(135deg, var(--bg-card-hi), var(--bg-card))" }}>
        <div className="flex items-start gap-4">
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--acc-cyan-soft)", border: "1px solid var(--acc-lime-line)", display: "grid", placeItems: "center", color: "var(--acc-cyan)", flexShrink: 0 }}>
            <Icon name="network" size={15} />
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: "-0.005em" }}>Live metrics from agent run history</div>
            <div style={{ fontSize: 13, color: "var(--fg-muted)", marginTop: 6, lineHeight: 1.55, maxWidth: 720 }}>
              All numbers are derived from real agent runs stored in the database for <strong>{activeUseCase.name}</strong>.
              Run more queries via the Agent tab to generate richer benchmark data.
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI row ── */}
      {data && (
        <div className="grid-4 mb-4">
          {[
            { label: "Total Runs",    value: data.total_runs,                         sub: `${data.completed_runs} completed` },
            { label: "Avg Latency",   value: fmt_ms(data.avg_latency_ms),             sub: `p95 ${fmt_ms(data.p95_latency_ms)}` },
            { label: "Total Tokens",  value: (data.total_input_tokens + data.total_output_tokens).toLocaleString(), sub: `avg ${data.avg_tokens_per_run ?? "—"}/run` },
            { label: "Total Cost",    value: fmt_cost(data.total_cost_usd),           sub: `avg ${fmt_cost(data.avg_cost_usd)}/run` },
          ].map(({ label, value, sub }) => (
            <div key={label} className="card" style={{ textAlign: "center", padding: "18px 12px" }}>
              <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>{value}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
              <div style={{ fontSize: 11, color: "var(--acc-lime)", marginTop: 3 }}>{sub}</div>
            </div>
          ))}
        </div>
      )}

      {(!data || data.total_runs === 0) && (
        <div className="card mb-4" style={{ textAlign: "center", padding: 48 }}>
          <div className="card-sub" style={{ marginBottom: 10 }}>No agent runs yet</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
            Run agent queries to generate benchmark data for this use case.
          </div>
          <button className="btn btn-primary" onClick={() => onNav && onNav("agent")}>Go to Agent</button>
        </div>
      )}

      {data && data.total_runs > 0 && (
        <div className="grid-2 gap-4">

          {/* ── Latency percentiles ── */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">Latency Percentiles</div>
              <span className="mono dim" style={{ fontSize: 10.5 }}>{data.completed_runs} runs</span>
            </div>
            {[
              { label: "p50 (median)", value: data.p50_latency_ms, max: data.p95_latency_ms || 1 },
              { label: "p90",          value: data.p90_latency_ms, max: data.p95_latency_ms || 1 },
              { label: "p95",          value: data.p95_latency_ms, max: data.p95_latency_ms || 1 },
              { label: "avg",          value: data.avg_latency_ms != null ? Math.round(data.avg_latency_ms) : null, max: data.p95_latency_ms || 1 },
            ].map(({ label, value, max }) => (
              <div key={label} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: "var(--text-muted)" }}>{label}</span>
                  <span className="mono">{fmt_ms(value)}</span>
                </div>
                <div style={{ height: 6, background: "var(--bg-canvas)", borderRadius: 4 }}>
                  <div style={{ height: "100%", width: `${value ? Math.min(100, (value / max) * 100) : 0}%`, background: "var(--acc-lime)", borderRadius: 4, transition: "width 0.4s" }} />
                </div>
              </div>
            ))}

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>Latency over last {data.recent_latencies.length} runs</div>
              <Sparkline values={data.recent_latencies} color="var(--acc-lime)" />
            </div>
          </div>

          {/* ── Cost & tokens ── */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">Cost &amp; Tokens</div>
              <span className="mono dim" style={{ fontSize: 10.5 }}>cumulative</span>
            </div>
            {[
              { label: "Total Input Tokens",  value: data.total_input_tokens.toLocaleString() },
              { label: "Total Output Tokens", value: data.total_output_tokens.toLocaleString() },
              { label: "Total Cost",          value: fmt_cost(data.total_cost_usd) },
              { label: "Avg Cost / Run",      value: fmt_cost(data.avg_cost_usd) },
              { label: "Avg Tokens / Run",    value: data.avg_tokens_per_run != null ? Math.round(data.avg_tokens_per_run).toLocaleString() : "—" },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line-soft)", fontSize: 12.5 }}>
                <span style={{ color: "var(--text-muted)" }}>{label}</span>
                <span className="mono">{value}</span>
              </div>
            ))}

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>Cost over last {data.recent_costs.length} runs</div>
              <Sparkline values={data.recent_costs} color="var(--acc-cyan)" />
            </div>
          </div>

          {/* ── Provider breakdown ── */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">Provider Breakdown</div>
              <Badge tone="ok">Active</Badge>
            </div>
            {data.providers.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "16px 0" }}>No completed runs yet.</div>
            )}
            <div className="flex-col gap-2">
              {data.providers.map(p => (
                <div key={p.provider} style={{ padding: "10px 14px", background: "var(--bg-canvas)", borderRadius: 8, border: "1px solid var(--line-soft)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{p.provider}</div>
                    <Badge tone="ok">{p.run_count} runs</Badge>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                    {[
                      { k: "Avg Latency", v: fmt_ms(p.avg_latency_ms) },
                      { k: "Avg Cost",    v: fmt_cost(p.avg_cost_usd) },
                      { k: "Tokens",      v: p.total_tokens.toLocaleString() },
                    ].map(({ k, v }) => (
                      <div key={k} style={{ textAlign: "center" }}>
                        <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
                        <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 2 }}>{k}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: "var(--acc-cyan-soft)", border: "1px dashed var(--acc-lime-line)", fontSize: 12, color: "var(--fg-muted)" }}>
              <Icon name="shield" size={11} style={{ marginRight: 6, color: "var(--acc-cyan)" }}/>
              NVIDIA NIM-compatible adapter is configurable — bring your own OpenAI-compatible endpoint URL.
            </div>
          </div>

          {/* ── Risk distribution ── */}
          <div className="card">
            <div className="card-head">
              <div className="card-title">Risk Classification</div>
              <span className="mono dim" style={{ fontSize: 10.5 }}>from grounding verifier</span>
            </div>
            <div className="flex-col gap-3">
              {[
                { key: "low",     label: "Low Risk",     color: "var(--acc-lime)",  tone: "ok" },
                { key: "medium",  label: "Medium Risk",  color: "var(--acc-cyan)",  tone: "cyan" },
                { key: "high",    label: "High Risk",    color: "var(--acc-red, #e55)", tone: "err" },
                { key: "unknown", label: "Unclassified", color: "var(--text-muted)", tone: "default" },
              ].map(({ key, label, color, tone }) => {
                const count = data.risk_distribution[key] || 0;
                const width = pct(count, riskTotal);
                return (
                  <div key={key}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
                      <span style={{ color: "var(--text-muted)" }}>{label}</span>
                      <span className="mono">{count} <span style={{ color: "var(--text-muted)", fontSize: 10 }}>({width}%)</span></span>
                    </div>
                    <div style={{ height: 8, background: "var(--bg-canvas)", borderRadius: 4 }}>
                      <div style={{ height: "100%", width: `${width}%`, background: color, borderRadius: 4, transition: "width 0.4s" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 16, padding: "12px 14px", background: "var(--bg-canvas)", borderRadius: 8, border: "1px solid var(--line-soft)", fontSize: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>How risk is classified</div>
              <div style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
                The agent's Risk Classifier node evaluates each answer for hallucination risk, factual grounding, and source coverage. High-risk answers are flagged for human review before delivery.
              </div>
            </div>
          </div>

        </div>
      )}

      <style>{`
        .flex-col { display: flex; flex-direction: column; }
        .flex { display: flex; }
      `}</style>
    </div>
  );
};

window.Benchmarks = Benchmarks;
