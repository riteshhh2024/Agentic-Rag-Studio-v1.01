// Evaluation Dashboard — wired to real API
const Evaluation = ({ activeUseCase, onNav, providerConfig }) => {
  const usecaseId = activeUseCase?.id;

  // ── data state ────────────────────────────────────────────────────────────
  const [questions,    setQuestions]    = useState([]);
  const [evalResult,   setEvalResult]   = useState(null);  // EvaluationRunDetailResponse
  const [evalHistory,  setEvalHistory]  = useState([]);    // EvaluationRunSummary[]

  // ── UI state ──────────────────────────────────────────────────────────────
  const [loading,      setLoading]      = useState(true);
  const [running,      setRunning]      = useState(false);
  const [error,        setError]        = useState(null);

  // ── add-question form state ───────────────────────────────────────────────
  const [showForm,     setShowForm]     = useState(false);
  const [newQ,         setNewQ]         = useState("");
  const [newExpected,  setNewExpected]  = useState("");
  const [newSources,   setNewSources]   = useState("");
  const [newTags,      setNewTags]      = useState("");
  const [adding,       setAdding]       = useState(false);

  // ── load on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!usecaseId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      API.evaluation.listGoldenQuestions(usecaseId),
      API.evaluation.listEvaluations(usecaseId),
    ]).then(([qs, evals]) => {
      setQuestions(qs);
      setEvalHistory(evals);
      // auto-load most recent completed evaluation
      const latest = evals.find(e => e.status === "completed");
      if (latest) {
        return API.evaluation.get(latest.id).then(setEvalResult);
      }
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, [usecaseId]);

  // ── add golden question ───────────────────────────────────────────────────
  const addQuestion = async () => {
    if (!newQ.trim() || !usecaseId) return;
    setAdding(true); setError(null);
    try {
      const sources = newSources.split(",").map(s => s.trim()).filter(Boolean);
      const tags    = newTags.split(",").map(s => s.trim()).filter(Boolean);
      await API.evaluation.addGoldenQuestions({
        usecase_id: usecaseId,
        questions: [{
          question: newQ.trim(),
          expected_answer: newExpected.trim() || null,
          expected_sources: sources,
          tags,
        }],
      });
      const updated = await API.evaluation.listGoldenQuestions(usecaseId);
      setQuestions(updated);
      setNewQ(""); setNewExpected(""); setNewSources(""); setNewTags("");
      setShowForm(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setAdding(false);
    }
  };

  // ── delete golden question ────────────────────────────────────────────────
  const deleteQuestion = async (qid) => {
    try {
      await API.evaluation.deleteGoldenQuestion(qid);
      setQuestions(prev => prev.filter(q => q.id !== qid));
    } catch (e) {
      setError(e.message);
    }
  };

  // ── run evaluation ────────────────────────────────────────────────────────
  const runEval = async () => {
    if (!usecaseId) return;
    setRunning(true); setError(null);
    try {
      const summary = await API.evaluation.run({ usecase_id: usecaseId, provider: providerConfig?.provider || "openai", model: providerConfig?.chat_model || null });
      const detail  = await API.evaluation.get(summary.evaluation_id);
      setEvalResult(detail);
      const evals = await API.evaluation.listEvaluations(usecaseId);
      setEvalHistory(evals);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  // ── helpers ───────────────────────────────────────────────────────────────
  const fmtScore = (v) => v != null ? v.toFixed(2) : "—";
  const fmtMs    = (v) => v != null ? `${v}ms` : "—";
  const passCount = evalResult?.results?.filter(r => r.status === "pass").length  || 0;
  const failCount = evalResult?.results?.filter(r => r.status !== "pass").length  || 0;
  const total     = evalResult?.results?.length || 0;

  // latency sparkline from history
  const latencies = evalHistory
    .filter(e => e.avg_latency_ms != null)
    .slice(0, 10)
    .reverse()
    .map(e => e.avg_latency_ms);

  const SparkLine = ({ data }) => {
    if (data.length < 2) return <div style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 12 }}>Not enough runs yet</div>;
    const w = 380, h = 80;
    const max = Math.max(...data) * 1.1;
    const min = Math.min(...data) * 0.9;
    const pts = data.map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / (max - min || 1)) * h * 0.85 - 6;
      return [x, y];
    });
    const line = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
    const area = `${line} L${w},${h} L0,${h} Z`;
    return (
      <svg width="100%" height="90" viewBox={`0 0 ${w} ${h+10}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--acc-lime)" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="var(--acc-lime)" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={area} fill="url(#spark-grad)"/>
        <path d={line} fill="none" stroke="var(--acc-lime)" strokeWidth="1.5"/>
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 3 : 2} fill="var(--acc-lime)"/>
        ))}
      </svg>
    );
  };

  // ── no use case guard ─────────────────────────────────────────────────────
  if (!usecaseId) {
    return (
      <div className="page">
        <div className="page-head">
          <div>
            <div className="eyebrow"><span className="glyph"></span> Step 05 · Evaluation</div>
            <h1 className="h1" style={{ fontSize: 38 }}>Quality &amp; risk<br/><em>signals</em></h1>
          </div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No use case selected</div>
          <div className="card-sub mb-4">Select a use case to manage golden questions and run evaluations.</div>
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
            <div className="eyebrow"><span className="glyph"></span> Step 05 · Evaluation</div>
            <h1 className="h1" style={{ fontSize: 38 }}>Quality &amp; risk<br/><em>signals</em></h1>
          </div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <div className="card-sub">Loading evaluation data…</div>
        </div>
      </div>
    );
  }

  const hasResults = evalResult && evalResult.results && evalResult.results.length > 0;
  const failedRows = evalResult?.results?.filter(r => r.status !== "pass") || [];

  return (
    <div className="page">
      {/* ── Header ── */}
      <div className="page-head">
        <div>
          <div className="eyebrow"><span className="glyph"></span> Step 05 · Evaluation</div>
          <h1 className="h1" style={{ fontSize: 38 }}>Quality &amp; risk<br/><em>signals</em></h1>
        </div>
        <div className="flex gap-2">
          {hasResults && (
            <Badge tone="ok"><span className="dot" style={{ width: 5, height: 5 }}></span> {passCount}/{total} passed</Badge>
          )}
          <button className="btn btn-ghost" onClick={() => setShowForm(f => !f)}>
            <Icon name="plus" size={12} /> Add Question
          </button>
          <button className="btn btn-primary" onClick={runEval} disabled={running || questions.length === 0}>
            {running
              ? <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> Running…</>
              : <><Icon name="play" size={11} /> Run Full Eval</>
            }
          </button>
        </div>
      </div>

      {error && (
        <div className="card mb-4" style={{ background: "var(--acc-red-soft, #2a1010)", border: "1px solid var(--acc-red, #e55)", padding: "12px 16px", color: "var(--acc-red, #e55)", fontSize: 13 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* ── Add Question Form ── */}
      {showForm && (
        <div className="card mb-4">
          <div className="card-title mb-3">Add Golden Question</div>
          <div className="flex-col gap-3">
            <div>
              <label className="field-label">Question *</label>
              <input className="input" placeholder="e.g. What is the standard refund window?" value={newQ} onChange={e => setNewQ(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Expected Answer <span style={{ color: "var(--text-muted)" }}>(optional)</span></label>
              <textarea className="textarea" rows={2} placeholder="The expected correct answer…" value={newExpected} onChange={e => setNewExpected(e.target.value)} />
            </div>
            <div className="grid-2 gap-4">
              <div>
                <label className="field-label">Expected Sources <span style={{ color: "var(--text-muted)" }}>(comma-separated)</span></label>
                <input className="input" placeholder="refund_policy.txt, escalation_sop.md" value={newSources} onChange={e => setNewSources(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Tags <span style={{ color: "var(--text-muted)" }}>(comma-separated)</span></label>
                <input className="input" placeholder="refund, policy, escalation" value={newTags} onChange={e => setNewTags(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={addQuestion} disabled={adding || !newQ.trim()}>
                {adding ? "Adding…" : "Add Question"}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Golden Questions Panel ── */}
      <div className="card mb-4" style={{ padding: 0 }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="card-title">Golden Question Set</div>
            <div className="card-sub mt-2">{questions.length} question{questions.length !== 1 ? "s" : ""} · ground-truth evaluation dataset</div>
          </div>
          <Badge tone={questions.length >= 5 ? "ok" : "warn"}>
            {questions.length >= 5 ? `${questions.length} ready` : `${questions.length}/5 min`}
          </Badge>
        </div>

        {questions.length === 0 ? (
          <div style={{ padding: "32px 18px", textAlign: "center", color: "var(--text-muted)" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📝</div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>No golden questions yet</div>
            <div style={{ fontSize: 12.5 }}>Add at least 5 questions with expected answers to run a meaningful evaluation.</div>
            <button className="btn btn-primary mt-3" onClick={() => setShowForm(true)}>Add First Question</button>
          </div>
        ) : (
          <div>
            {questions.map((q, i) => (
              <div key={q.id} style={{ padding: "12px 18px", borderBottom: "1px solid var(--line-soft)", display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ minWidth: 22, height: 22, borderRadius: "50%", background: "var(--bg-elev)", border: "1px solid var(--line-soft)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5, fontWeight: 600, color: "var(--text-muted)", flexShrink: 0, marginTop: 1 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 3 }}>{q.question}</div>
                  {q.expected_answer && (
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      Expected: {q.expected_answer}
                    </div>
                  )}
                  <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                    {q.expected_sources?.map(s => (
                      <span key={s} style={{ fontSize: 10.5, padding: "1px 6px", background: "var(--acc-cyan-soft)", color: "var(--acc-cyan)", borderRadius: 4, border: "1px solid var(--acc-cyan)" }}>{s}</span>
                    ))}
                    {q.tags?.map(t => (
                      <span key={t} style={{ fontSize: 10.5, padding: "1px 6px", background: "var(--bg-elev)", color: "var(--text-muted)", borderRadius: 4, border: "1px solid var(--line-soft)" }}>#{t}</span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => deleteQuestion(q.id)}
                  style={{ padding: "3px 7px", fontSize: 11, background: "transparent", border: "1px solid var(--line-soft)", borderRadius: 5, color: "var(--text-muted)", cursor: "pointer", flexShrink: 0 }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Evaluation Results (only when we have a run) ── */}
      {hasResults && (
        <>
          {/* Metric cards */}
          <div className="grid-3 mb-4" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
            <MetricCard label="Context Relevance"  value={fmtScore(evalResult.avg_context_relevance)}  delta="" />
            <MetricCard label="Faithfulness"        value={fmtScore(evalResult.avg_faithfulness)}       delta="" />
            <MetricCard label="Answer Relevance"    value={fmtScore(evalResult.avg_answer_relevance)}   delta="" />
            <MetricCard label="Hallucination Risk"  value={passCount >= total * 0.8 ? "Low" : "Med"}    delta="stable" deltaTone="flat" />
            <MetricCard label="Avg Latency"         value={evalResult.avg_latency_ms != null ? (evalResult.avg_latency_ms / 1000).toFixed(1) : "—"} unit="sec" delta="" />
            <MetricCard label="Questions"           value={String(total)}                               delta={`${passCount} passed`} />
          </div>

          {/* Quality bars + latency chart */}
          <div className="grid-2 gap-4 mb-4">
            <div className="card">
              <div className="card-head">
                <div className="card-title">Quality Metrics</div>
                <span className="mono dim" style={{ fontSize: 10.5 }}>{total}-question eval · {evalResult.provider}</span>
              </div>
              <div className="flex-col gap-1">
                {[
                  ["Context Relevance",  evalResult.avg_context_relevance],
                  ["Answer Relevance",   evalResult.avg_answer_relevance],
                  ["Faithfulness",       evalResult.avg_faithfulness],
                  ["Pass Rate",          total > 0 ? passCount / total : null],
                ].map(([k, v]) => (
                  <div key={k} className="bar-row">
                    <span className="bar-label">{k}</span>
                    <span className="bar-track">
                      <span className="bar-fill" style={{ width: v != null ? `${(v * 100).toFixed(0)}%` : "0%" }}></span>
                    </span>
                    <span className="bar-val">{v != null ? v.toFixed(2) : "—"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <div className="card-title">Avg Latency · eval history</div>
                <span className="mono dim" style={{ fontSize: 10.5 }}>{evalHistory.length} run{evalHistory.length !== 1 ? "s" : ""}</span>
              </div>
              <SparkLine data={latencies} />
              {latencies.length >= 2 && (
                <div className="flex justify-between mt-2" style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--fg-dim)" }}>
                  <span>earliest</span>
                  <span>latest · {latencies[latencies.length - 1]}ms</span>
                </div>
              )}
            </div>
          </div>

          {/* Pass/fail + per-question results */}
          <div className="grid-2 gap-4 mb-4">
            <div className="card">
              <div className="card-head">
                <div className="card-title">Pass / Fail Breakdown</div>
                <span className="mono dim" style={{ fontSize: 10.5 }}>{total} questions</span>
              </div>
              <div style={{ display: "flex", height: 28, borderRadius: 6, overflow: "hidden", marginTop: 8, marginBottom: 16 }}>
                {passCount > 0 && <div style={{ flex: passCount, background: "var(--ok)" }}></div>}
                {failCount > 0 && <div style={{ flex: failCount, background: "var(--err)" }}></div>}
              </div>
              <div className="flex-col gap-2" style={{ fontSize: 12.5 }}>
                <div className="flex items-center justify-between">
                  <span><span className="dot" style={{ width: 7, height: 7, marginRight: 8, display: "inline-block" }}></span>Passed</span>
                  <span className="mono">{passCount} · {total > 0 ? Math.round(passCount/total*100) : 0}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span><span style={{ width: 7, height: 7, background: "var(--err)", borderRadius: "50%", marginRight: 8, display: "inline-block" }}></span>Failed</span>
                  <span className="mono">{failCount} · {total > 0 ? Math.round(failCount/total*100) : 0}%</span>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-title mb-3">Eval Run Info</div>
              <div className="flex-col gap-2" style={{ fontSize: 12.5 }}>
                <div className="flex justify-between"><span className="muted">Eval ID</span><span className="mono" style={{ fontSize: 10.5 }}>{evalResult.id.slice(0, 16)}…</span></div>
                <div className="flex justify-between"><span className="muted">Provider</span><span>{evalResult.provider}</span></div>
                <div className="flex justify-between"><span className="muted">Questions</span><span>{evalResult.total_questions}</span></div>
                <div className="flex justify-between"><span className="muted">Status</span><span><Badge tone="ok">{evalResult.status}</Badge></span></div>
                <div className="flex justify-between"><span className="muted">Run at</span><span style={{ fontSize: 11 }}>{new Date(evalResult.created_at).toLocaleString()}</span></div>
              </div>
            </div>
          </div>

          {/* Per-question results table */}
          <div className="card mb-4" style={{ padding: 0 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="card-title">Per-Question Results</div>
                <div className="card-sub mt-2">All {total} evaluation results</div>
              </div>
              {failCount > 0 && <Badge tone="warn">{failCount} failure{failCount !== 1 ? "s" : ""}</Badge>}
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: "35%" }}>Question</th>
                  <th>Faithfulness</th>
                  <th>Answer Rel.</th>
                  <th>Context Rel.</th>
                  <th>Halluc. Risk</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {evalResult.results.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 12, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.question}
                    </td>
                    <td><span className="mono" style={{ color: r.faithfulness >= 0.7 ? "var(--acc-lime)" : "var(--warn)" }}>{fmtScore(r.faithfulness)}</span></td>
                    <td><span className="mono">{fmtScore(r.answer_relevance)}</span></td>
                    <td><span className="mono">{fmtScore(r.context_relevance)}</span></td>
                    <td>
                      <Badge tone={r.hallucination_risk === "high" ? "err" : r.hallucination_risk === "medium" ? "warn" : "ok"}>
                        {r.hallucination_risk || "low"}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={r.status === "pass" ? "ok" : "err"}>{r.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Failed case diagnostics */}
          {failedRows.length > 0 && (
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div className="card-title">Failed Questions · Diagnostic</div>
                  <div className="card-sub mt-2">Questions that scored below the pass threshold</div>
                </div>
                <Badge tone="warn">{failedRows.length} failure{failedRows.length !== 1 ? "s" : ""}</Badge>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: "40%" }}>Question</th>
                    <th>Faithfulness</th>
                    <th>Notes</th>
                    <th>Suggested Fix</th>
                  </tr>
                </thead>
                <tbody>
                  {failedRows.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: 12 }}>{r.question}</td>
                      <td><span className="mono" style={{ color: "var(--err)" }}>{fmtScore(r.faithfulness)}</span></td>
                      <td className="muted" style={{ fontSize: 11.5 }}>{r.notes || "Low faithfulness score"}</td>
                      <td>
                        <span style={{ color: "var(--acc-lime)", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                          <Icon name="zap" size={11} /> Upload relevant documents &amp; re-index
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Empty state when no eval has run yet ── */}
      {!hasResults && !running && questions.length > 0 && (
        <div className="card" style={{ textAlign: "center", padding: "40px 24px" }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>▶</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Ready to evaluate</div>
          <div className="card-sub mb-4">{questions.length} question{questions.length !== 1 ? "s" : ""} in the dataset. Click <strong>Run Full Eval</strong> to score your RAG pipeline.</div>
          <button className="btn btn-primary" onClick={runEval}>Run Full Eval</button>
        </div>
      )}

      {running && (
        <div className="card" style={{ textAlign: "center", padding: "40px 24px" }}>
          <div style={{ fontSize: 28, marginBottom: 10, animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Running evaluation…</div>
          <div className="card-sub">Running agent workflow for each golden question. This may take a moment.</div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .flex-col { display: flex; flex-direction: column; }
        .flex { display: flex; }
        .muted { color: var(--text-muted); }
      `}</style>
    </div>
  );
};

window.Evaluation = Evaluation;
