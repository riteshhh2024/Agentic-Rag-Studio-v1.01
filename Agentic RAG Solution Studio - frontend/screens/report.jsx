// POC Report — wired to real API
const Report = ({ activeUseCase, onNav }) => {
  const usecaseId = activeUseCase?.id;

  // ── state ─────────────────────────────────────────────────────────────────
  const [reports,      setReports]      = useState([]);      // ReportSummary[]
  const [activeReport, setActiveReport] = useState(null);    // ReportResponse
  const [markdown,     setMarkdown]     = useState("");      // raw .md content
  const [sections,     setSections]     = useState([]);      // parsed sections
  const [evalSummary,  setEvalSummary]  = useState(null);    // metrics for exec card

  const [loading,      setLoading]      = useState(true);
  const [generating,   setGenerating]   = useState(false);
  const [error,        setError]        = useState(null);

  // options
  const [inclEval,     setInclEval]     = useState(true);
  const [inclArch,     setInclArch]     = useState(true);

  // ── parse markdown into sections ─────────────────────────────────────────
  const parseMarkdown = (md) => {
    const lines = md.split("\n");
    const secs = [];
    let current = null;
    for (const line of lines) {
      if (line.startsWith("## ")) {
        if (current) secs.push(current);
        const title = line.replace(/^##\s+\d+\.\s*/, "").trim();
        const num = String(secs.length + 1).padStart(2, "0");
        current = { num, title, lines: [] };
      } else if (current) {
        current.lines.push(line);
      }
    }
    if (current) secs.push(current);
    return secs.map(s => ({
      ...s,
      body: s.lines.join("\n").trim(),
    }));
  };

  // extract exec metrics from markdown (look for Evaluation Results table)
  const extractMetrics = (md) => {
    const metrics = {};
    const faith  = md.match(/Faithfulness\s*\|\s*([\d.]+)/);
    const ansrel = md.match(/Answer Relevance\s*\|\s*([\d.]+)/);
    const ctxrel = md.match(/Context Relevance\s*\|\s*([\d.]+)/);
    const lat    = md.match(/Avg Latency\s*\|\s*(\d+)/);
    const total  = md.match(/Questions Evaluated\s*\|\s*(\d+)/);
    if (faith)  metrics.faithfulness      = parseFloat(faith[1]);
    if (ansrel) metrics.answerRelevance   = parseFloat(ansrel[1]);
    if (ctxrel) metrics.contextRelevance  = parseFloat(ctxrel[1]);
    if (lat)    metrics.latencyMs         = parseInt(lat[1]);
    if (total)  metrics.totalQuestions    = parseInt(total[1]);
    return Object.keys(metrics).length ? metrics : null;
  };

  // ── load on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!usecaseId) { setLoading(false); return; }
    setLoading(true);
    API.reports.list(usecaseId)
      .then(async (list) => {
        setReports(list);
        if (list.length > 0) {
          const latest = list[0];
          setActiveReport(latest);
          const md = await API.reports.getContent(latest.id);
          setMarkdown(md);
          setSections(parseMarkdown(md));
          setEvalSummary(extractMetrics(md));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [usecaseId]);

  // ── load a specific report ────────────────────────────────────────────────
  const loadReport = async (rep) => {
    setActiveReport(rep);
    try {
      const md = await API.reports.getContent(rep.id);
      setMarkdown(md);
      setSections(parseMarkdown(md));
      setEvalSummary(extractMetrics(md));
    } catch (e) {
      setError(e.message);
    }
  };

  // ── generate ──────────────────────────────────────────────────────────────
  const generate = async () => {
    if (!usecaseId) return;
    setGenerating(true); setError(null);
    try {
      const rep = await API.reports.generate({
        usecase_id: usecaseId,
        include_evaluation: inclEval,
        include_architecture: inclArch,
        format: "markdown",
      });
      const md = await API.reports.getContent(rep.id);
      setMarkdown(md);
      setSections(parseMarkdown(md));
      setEvalSummary(extractMetrics(md));
      setActiveReport(rep);
      const updated = await API.reports.list(usecaseId);
      setReports(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  // ── copy exec summary ─────────────────────────────────────────────────────
  const copyExecSummary = () => {
    const text = sections.slice(0, 2).map(s => `## ${s.title}\n\n${s.body}`).join("\n\n");
    navigator.clipboard.writeText(text || markdown.slice(0, 800));
  };

  // ── render a section body (basic markdown → JSX) ──────────────────────────
  const renderBody = (body) => {
    if (!body) return null;
    const lines = body.split("\n");
    const elements = [];
    let listItems = [];
    let tableLines = [];
    let inTable = false;
    let inCode = false;
    let codeLines = [];

    const flushList = () => {
      if (listItems.length) {
        elements.push(<ul key={elements.length} style={{ margin: "4px 0 8px 16px", color: "var(--fg-muted)" }}>{listItems.map((li, i) => <li key={i} style={{ marginBottom: 4, fontSize: 13 }}>{li}</li>)}</ul>);
        listItems = [];
      }
    };
    const flushTable = () => {
      if (tableLines.length > 1) {
        const rows = tableLines.filter(l => !l.match(/^\|[-| ]+\|$/));
        const cells = rows.map(r => r.split("|").filter(c => c.trim()).map(c => c.trim()));
        elements.push(
          <table key={elements.length} className="table" style={{ marginBottom: 8 }}>
            <thead><tr>{cells[0]?.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
            <tbody>{cells.slice(1).map((row, i) => <tr key={i}>{row.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
          </table>
        );
        tableLines = [];
      }
    };

    for (const line of lines) {
      if (line.startsWith("```")) {
        if (inCode) {
          elements.push(<pre key={elements.length} className="json" style={{ fontSize: 11.5, borderRadius: 8 }}>{codeLines.join("\n")}</pre>);
          codeLines = []; inCode = false;
        } else { inCode = true; }
        continue;
      }
      if (inCode) { codeLines.push(line); continue; }
      if (line.startsWith("|")) { flushList(); tableLines.push(line); continue; }
      else if (tableLines.length) { flushTable(); }
      if (line.startsWith("- ")) { listItems.push(line.slice(2)); continue; }
      else { flushList(); }
      if (line.startsWith("### ")) {
        elements.push(<div key={elements.length} style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 10, marginBottom: 4 }}>{line.slice(4)}</div>);
      } else if (line.startsWith("> ")) {
        elements.push(<div key={elements.length} style={{ borderLeft: "2px solid var(--acc-lime-line)", paddingLeft: 12, color: "var(--text-muted)", fontSize: 12, marginBottom: 8, fontStyle: "italic" }}>{line.slice(2)}</div>);
      } else if (line.startsWith("**") && line.endsWith("**")) {
        elements.push(<div key={elements.length} style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{line.replace(/\*\*/g, "")}</div>);
      } else if (line.trim()) {
        elements.push(<p key={elements.length} style={{ fontSize: 13, lineHeight: 1.65, marginBottom: 8, color: "var(--fg-muted)" }}>{line}</p>);
      }
    }
    flushList(); flushTable();
    return elements;
  };

  // ── no use case guard ─────────────────────────────────────────────────────
  if (!usecaseId) {
    return (
      <div className="page">
        <div className="page-head">
          <div>
            <div className="eyebrow"><span className="glyph"></span> Step 07 · POC Report</div>
            <h1 className="h1" style={{ fontSize: 38 }}>Customer-ready<br/><em>POC deliverable</em></h1>
          </div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No use case selected</div>
          <div className="card-sub mb-4">Select a use case to generate its POC report.</div>
          <button className="btn btn-primary" onClick={() => onNav && onNav("usecases")}>Go to Use Cases</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page">
        <div className="page-head">
          <div>
            <div className="eyebrow"><span className="glyph"></span> Step 07 · POC Report</div>
            <h1 className="h1" style={{ fontSize: 38 }}>Customer-ready<br/><em>POC deliverable</em></h1>
          </div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: 40 }}><div className="card-sub">Loading reports…</div></div>
      </div>
    );
  }

  const hasReport = sections.length > 0;
  const reportDate = activeReport ? new Date(activeReport.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "";

  return (
    <div className="page" style={{ fontFamily: "\"JetBrains Mono\"" }}>
      {/* ── Header ── */}
      <div className="page-head">
        <div>
          <div className="eyebrow"><span className="glyph"></span> Step 07 · POC Report{reports.length > 0 ? ` · v${reports.length}` : ""}</div>
          <h1 className="h1" style={{ fontSize: 38 }}>Customer-ready<br/><em>POC deliverable</em></h1>
        </div>
        <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
          {hasReport && (
            <button className="btn btn-ghost" style={{ fontFamily: "\"JetBrains Mono\"" }} onClick={copyExecSummary}>
              <Icon name="copy" size={12} /> Copy Exec Summary
            </button>
          )}
          {activeReport && (
            <a
              href={API.reports.downloadUrl(activeReport.id)}
              download={`poc-report-${usecaseId}.md`}
              className="btn btn-ghost"
              style={{ textDecoration: "none" }}
            >
              <Icon name="download" size={12} /> Export Markdown
            </a>
          )}
          <button className="btn btn-primary" onClick={generate} disabled={generating}>
            {generating
              ? <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> Generating…</>
              : <><Icon name="sparkles" size={12} /> {hasReport ? "Regenerate" : "Generate Report"}</>
            }
          </button>
        </div>
      </div>

      {error && (
        <div className="card mb-4" style={{ background: "var(--acc-red-soft, #2a1010)", border: "1px solid var(--acc-red, #e55)", padding: "12px 16px", color: "var(--acc-red, #e55)", fontSize: 13 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* ── Generate options (shown when no report yet) ── */}
      {!hasReport && !generating && (
        <div className="card mb-4">
          <div className="card-title mb-3">Report Options</div>
          <div className="flex gap-6 mb-4">
            <div className="flex items-center justify-between" style={{ padding: "10px 14px", background: "var(--bg-canvas)", borderRadius: 10, border: "1px solid var(--line-soft)", flex: 1 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Include Evaluation Results</div>
                <div className="field-hint" style={{ marginTop: 2 }}>Embed faithfulness, relevance and latency metrics</div>
              </div>
              <Toggle on={inclEval} onChange={setInclEval} />
            </div>
            <div className="flex items-center justify-between" style={{ padding: "10px 14px", background: "var(--bg-canvas)", borderRadius: 10, border: "1px solid var(--line-soft)", flex: 1 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Include Architecture Diagram</div>
                <div className="field-hint" style={{ marginTop: 2 }}>ASCII architecture + agent workflow diagram</div>
              </div>
              <Toggle on={inclArch} onChange={setInclArch} />
            </div>
          </div>
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>📄</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>No report generated yet</div>
            <div className="card-sub mb-4">Click Generate Report to build the full POC deliverable from your use case data, documents, and evaluation results.</div>
            <button className="btn btn-primary" onClick={generate}>Generate Report</button>
          </div>
        </div>
      )}

      {generating && (
        <div className="card mb-4" style={{ textAlign: "center", padding: "40px 24px" }}>
          <div style={{ fontSize: 28, marginBottom: 10, animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Generating report…</div>
          <div className="card-sub">Pulling use case data, documents, RAG config, and evaluation results.</div>
        </div>
      )}

      {hasReport && (
        <>
          {/* ── Executive Summary card ── */}
          <div className="card mb-4" style={{
            background: "linear-gradient(135deg, var(--bg-card-hi) 0%, var(--bg-card) 100%)",
            borderColor: "var(--acc-lime-line)",
            padding: 28,
            position: "relative",
            overflow: "hidden",
            fontFamily: "\"JetBrains Mono\"",
          }}>
            <div style={{ position: "absolute", top: 0, right: 0, width: 240, height: 240, background: "radial-gradient(circle, var(--acc-lime-soft), transparent 70%)", pointerEvents: "none" }}></div>
            <div className="flex justify-between items-center" style={{ marginBottom: 18, position: "relative" }}>
              <div className="eyebrow" style={{ marginBottom: 0 }}><span className="glyph"></span> Executive Summary</div>
              <div className="flex gap-2">
                <Badge tone="lime">Generated</Badge>
                <span className="mono dim" style={{ fontSize: 11 }}>{activeReport?.id?.slice(0, 8).toUpperCase()} · {reportDate}</span>
              </div>
            </div>

            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, lineHeight: 1.4, letterSpacing: "-0.01em", color: "var(--fg)", maxWidth: 900, position: "relative", marginBottom: 20 }}>
              Agentic RAG Solution Studio produced a grounded knowledge assistant for{" "}
              <em style={{ color: "var(--acc-lime)" }}>{activeUseCase?.name}</em> — using indexed documents,
              a controlled 6-node agent workflow, evaluation metrics, citation verification and risk classification.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18, position: "relative" }}>
              {[
                ["Faithfulness",      evalSummary?.faithfulness      != null ? evalSummary.faithfulness.toFixed(2)       : "—"],
                ["Answer Relevance",  evalSummary?.answerRelevance   != null ? evalSummary.answerRelevance.toFixed(2)    : "—"],
                ["Avg Latency",       evalSummary?.latencyMs         != null ? `${(evalSummary.latencyMs/1000).toFixed(1)}s` : "—"],
                ["Questions Eval'd",  evalSummary?.totalQuestions    != null ? String(evalSummary.totalQuestions)        : "—"],
              ].map(([k, v]) => (
                <div key={k} style={{ paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                  <div className="mono dim" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.1em" }}>{k}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 28, marginTop: 4, letterSpacing: "-0.01em" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Main body: sections + sidebar ── */}
          <div className="grid-2-1 gap-6">
            {/* Left: parsed sections */}
            <div className="card" style={{ padding: "8px 28px", fontFamily: "\"JetBrains Mono\"" }}>
              {sections.map((s, i) => (
                <div key={i} className="report-section">
                  <div className="num">{s.num}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4>{s.title}</h4>
                    {renderBody(s.body)}
                  </div>
                </div>
              ))}
            </div>

            {/* Right: sidebar */}
            <div className="flex-col gap-4" style={{ position: "sticky", top: 88, alignSelf: "start" }}>
              {/* Options (when report exists, allow toggling and regenerating) */}
              <div className="card">
                <div className="card-title mb-3">Report Options</div>
                <div className="flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div style={{ fontSize: 12.5 }}>Include Evaluation</div>
                    <Toggle on={inclEval} onChange={setInclEval} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div style={{ fontSize: 12.5 }}>Include Architecture</div>
                    <Toggle on={inclArch} onChange={setInclArch} />
                  </div>
                  <button className="btn btn-primary" onClick={generate} disabled={generating} style={{ marginTop: 4 }}>
                    {generating ? "Generating…" : "Regenerate"}
                  </button>
                </div>
              </div>

              {/* Outline */}
              <div className="card">
                <div className="card-head">
                  <div className="card-title">Report Outline</div>
                  <span className="mono dim" style={{ fontSize: 10.5 }}>{sections.length} sections</span>
                </div>
                <div className="flex-col" style={{ fontSize: 12.5 }}>
                  {sections.map((s) => (
                    <div key={s.num} style={{ display: "flex", gap: 12, padding: "7px 0", borderBottom: "1px dashed var(--line-soft)", color: "var(--fg-muted)", cursor: "default" }}>
                      <span className="mono dim" style={{ width: 22 }}>{s.num}</span>
                      <span>{s.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deliverables */}
              <div className="card">
                <div className="card-head">
                  <div className="card-title">Deliverable Bundle</div>
                </div>
                <div className="flex-col gap-2">
                  {reports.map((rep, i) => (
                    <div
                      key={rep.id}
                      onClick={() => loadReport(rep)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "9px 12px",
                        background: activeReport?.id === rep.id ? "var(--bg-elev)" : "var(--bg-canvas)",
                        borderRadius: 8,
                        border: `1px solid ${activeReport?.id === rep.id ? "var(--acc-lime-line)" : "var(--line-soft)"}`,
                        cursor: "pointer",
                      }}
                    >
                      <Icon name="file" size={13} style={{ color: "var(--acc-cyan)", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          poc-report-v{reports.length - i}.md
                        </div>
                        <div className="mono dim" style={{ fontSize: 10.5 }}>
                          {new Date(rep.created_at).toLocaleString()}
                        </div>
                      </div>
                      <a
                        href={API.reports.downloadUrl(rep.id)}
                        download={`poc-report-v${reports.length - i}.md`}
                        onClick={e => e.stopPropagation()}
                        style={{ padding: 5, color: "var(--text-muted)", textDecoration: "none" }}
                      >
                        <Icon name="download" size={11} />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .flex-col { display: flex; flex-direction: column; }
        .flex { display: flex; }
      `}</style>
    </div>
  );
};

window.Report = Report;
