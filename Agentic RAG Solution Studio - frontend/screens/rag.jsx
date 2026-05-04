// RAG Configuration — wired to real API
const RagConfig = ({ activeUseCase, onNav }) => {
  // ── config state ──────────────────────────────────────────────────────────
  const [chunkSize,   setChunkSize]   = useState(800);
  const [overlap,     setOverlap]     = useState(120);
  const [topK,        setTopK]        = useState(5);
  const [mode,        setMode]        = useState("vector");
  const [rerank,      setRerank]      = useState(false);
  const [cite,        setCite]        = useState(true);
  const [style,       setStyle]       = useState("Support-Agent");
  const [strict,      setStrict]      = useState("High");
  const [embedProvider, setEmbedProvider] = useState("openai");

  // ── UI state ──────────────────────────────────────────────────────────────
  const [configId,    setConfigId]    = useState(null);
  const [dirty,       setDirty]       = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [indexing,    setIndexing]    = useState(false);
  const [indexResult, setIndexResult] = useState(null); // { indexed_chunks, status }
  const [error,       setError]       = useState(null);
  const [loading,     setLoading]     = useState(true);

  // ── retrieval test panel ──────────────────────────────────────────────────
  const [testQuery,   setTestQuery]   = useState("");
  const [testRunning, setTestRunning] = useState(false);
  const [testResults, setTestResults] = useState(null); // ChunkResult[]
  const [testError,   setTestError]   = useState(null);

  const usecaseId = activeUseCase?.id;

  // ── load config on mount / usecase change ─────────────────────────────────
  useEffect(() => {
    if (!usecaseId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    setIndexResult(null);
    setTestResults(null);
    API.rag.getConfig(usecaseId)
      .then(cfg => {
        setConfigId(cfg.id);
        setChunkSize(cfg.chunk_size);
        setOverlap(cfg.chunk_overlap);
        setTopK(cfg.top_k);
        setMode(cfg.retrieval_mode || "vector");
        setRerank(cfg.reranking ?? false);
        setCite(cfg.citation_required ?? true);
        setEmbedProvider(cfg.embedding_provider || "openai");
        setDirty(false);
      })
      .catch(() => {/* 404 means no config yet — defaults are fine */})
      .finally(() => setLoading(false));
  }, [usecaseId]);

  // mark dirty whenever a control changes
  const mark = (setter) => (val) => { setter(val); setDirty(true); };

  // ── save config ───────────────────────────────────────────────────────────
  const saveConfig = async () => {
    if (!usecaseId) return;
    setSaving(true); setError(null);
    try {
      const cfg = await API.rag.saveConfig({
        usecase_id:        usecaseId,
        chunk_size:        chunkSize,
        chunk_overlap:     overlap,
        top_k:             topK,
        retrieval_mode:    mode,
        reranking:         rerank,
        citation_required: cite,
        embedding_provider: embedProvider,
      });
      setConfigId(cfg.id);
      setDirty(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── index documents ───────────────────────────────────────────────────────
  const runIndex = async () => {
    if (!usecaseId) return;
    setIndexing(true); setError(null); setIndexResult(null);
    try {
      // save config first so indexing uses latest settings
      if (dirty) await saveConfig();
      const res = await API.rag.index({ usecase_id: usecaseId, embedding_provider: embedProvider, vector_store: "chroma" });
      setIndexResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setIndexing(false);
    }
  };

  // ── retrieval test ────────────────────────────────────────────────────────
  const runTest = async () => {
    if (!usecaseId || !testQuery.trim()) return;
    setTestRunning(true); setTestError(null); setTestResults(null);
    try {
      const res = await API.rag.retrieve({ usecase_id: usecaseId, query: testQuery.trim(), top_k: topK, embedding_provider: embedProvider });
      setTestResults(res.chunks);
    } catch (e) {
      setTestError(e.message);
    } finally {
      setTestRunning(false);
    }
  };

  const pipeline = ["User Query", "Query Rewrite", "Retriever", "Reranker", "Context Builder", "LLM", "Citation Verifier", "Final Answer"];

  const configJson = JSON.stringify({
    chunk_size:       chunkSize,
    chunk_overlap:    overlap,
    top_k:            topK,
    retrieval_mode:   mode,
    reranking:        rerank,
    citation_required: cite,
    answer_style:      style.toLowerCase(),
    grounding:         strict.toLowerCase(),
    embedding_provider: embedProvider,
    vector_db:         "chroma",
  }, null, 2);

  // ── no use case guard ─────────────────────────────────────────────────────
  if (!usecaseId) {
    return (
      <div className="page">
        <div className="page-head">
          <div>
            <div className="eyebrow"><span className="glyph"></span> Step 03 · RAG Configuration</div>
            <h1 className="h1" style={{ fontSize: 38 }}>Tune the<br/><em>retrieval pipeline</em></h1>
          </div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No use case selected</div>
          <div className="card-sub mb-4">Select or create a use case first, then configure its RAG pipeline.</div>
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
            <div className="eyebrow"><span className="glyph"></span> Step 03 · RAG Configuration</div>
            <h1 className="h1" style={{ fontSize: 38 }}>Tune the<br/><em>retrieval pipeline</em></h1>
          </div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <div className="card-sub">Loading configuration…</div>
        </div>
      </div>
    );
  }

  const modeLabel = { vector: "Vector Search", hybrid: "Hybrid Search", metadata_filtered: "Metadata Filtered" };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow"><span className="glyph"></span> Step 03 · RAG Configuration</div>
          <h1 className="h1" style={{ fontSize: 38 }}>Tune the<br/><em>retrieval pipeline</em></h1>
        </div>
        <div className="flex gap-2">
          {dirty && (
            <button className="btn btn-ghost" onClick={() => { setDirty(false); /* reload */ window.location.reload(); }}>
              <Icon name="refresh" size={12} /> Reset
            </button>
          )}
          <button
            className="btn btn-ghost"
            onClick={saveConfig}
            disabled={saving || !dirty}
            style={{ opacity: (!dirty || saving) ? 0.5 : 1 }}
          >
            {saving ? "Saving…" : "Save Config"}
          </button>
          <button className="btn btn-primary" onClick={runIndex} disabled={indexing}>
            {indexing
              ? <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> Indexing…</>
              : <><Icon name="zap" size={12} /> Index &amp; Apply</>
            }
          </button>
        </div>
      </div>

      {error && (
        <div className="card mb-4" style={{ background: "var(--acc-red-soft, #2a1010)", border: "1px solid var(--acc-red, #e55)", padding: "12px 16px", color: "var(--acc-red, #e55)", fontSize: 13 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {indexResult && (
        <div className="card mb-4" style={{ background: "var(--acc-lime-soft)", border: "1px solid var(--acc-lime-line)", padding: "12px 16px", fontSize: 13 }}>
          <strong>Indexed:</strong> {indexResult.indexed_chunks} chunks · status: <strong>{indexResult.status}</strong>
        </div>
      )}

      {/* ── Pipeline preview ── */}
      <div className="card mb-4" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="card-title">Live Pipeline Preview</div>
            <div className="card-sub mt-2">8 controlled stages · {rerank ? "with" : "without"} reranking · citation {cite ? "required" : "optional"}</div>
          </div>
          <Badge tone="lime"><span className="dot" style={{ width: 5, height: 5 }}></span> Live</Badge>
        </div>
        <div className="pipeline">
          {pipeline.map((node, i) => (
            <React.Fragment key={node}>
              <div className="pipe-node" style={{
                ...(node === "Reranker" && !rerank ? { opacity: 0.3 } : {}),
                ...(node === "Citation Verifier" && !cite ? { opacity: 0.3 } : {}),
                ...(i === 0 ? { background: "var(--acc-cyan-soft)", borderColor: "var(--acc-cyan)" } : {}),
                ...(i === pipeline.length - 1 ? { background: "var(--acc-lime-soft)", borderColor: "var(--acc-lime-line)" } : {}),
              }}>
                <div className="label">Stage {String(i+1).padStart(2,"0")}</div>
                <div className="name">{node}</div>
              </div>
              {i < pipeline.length - 1 && <div className="pipe-arrow"></div>}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="grid-2-1 gap-6">
        {/* ── Left: controls ── */}
        <div className="flex-col gap-4">
          <div className="card">
            <div className="card-head">
              <div className="card-title">Retrieval &amp; Answer Policy</div>
              {dirty && <Badge>Unsaved changes</Badge>}
            </div>

            <div className="grid-2 gap-6">
              <div>
                <label className="field-label">Chunk Size · tokens</label>
                <Slider value={chunkSize} min={128} max={1024} step={32} onChange={mark(setChunkSize)} format={(v) => `${v} tok`} />
                <div className="field-hint">Larger chunks preserve context, smaller improve precision</div>
              </div>
              <div>
                <label className="field-label">Chunk Overlap · tokens</label>
                <Slider value={overlap} min={0} max={256} step={8} onChange={mark(setOverlap)} format={(v) => `${v} tok`} />
                <div className="field-hint">Recommended: 10–20% of chunk size</div>
              </div>
              <div>
                <label className="field-label">Top-K Retrieval</label>
                <Slider value={topK} min={1} max={20} step={1} onChange={mark(setTopK)} format={(v) => `K = ${v}`} />
                <div className="field-hint">Number of chunks returned for context</div>
              </div>
              <div>
                <label className="field-label">Retrieval Mode</label>
                <select className="select" value={mode} onChange={(e) => { setMode(e.target.value); setDirty(true); }}>
                  <option value="vector">Vector Search</option>
                  <option value="hybrid">Hybrid Search</option>
                  <option value="metadata_filtered">Metadata Filtered Search</option>
                </select>
                <div className="field-hint">Hybrid combines BM25 lexical with dense vectors</div>
              </div>
              <div>
                <label className="field-label">Embedding Provider</label>
                <select className="select" value={embedProvider} onChange={(e) => { setEmbedProvider(e.target.value); setDirty(true); }}>
                  <option value="openai">OpenAI (text-embedding-3-small)</option>
                  <option value="ollama">Ollama (nomic-embed-text)</option>
                </select>
                <div className="field-hint">Must match what was used when indexing. Re-index after changing.</div>
              </div>
            </div>

            <div className="divider-stripe mt-4 mb-4"></div>

            <div className="grid-2 gap-6">
              <div className="flex items-center justify-between" style={{ padding: "10px 14px", background: "var(--bg-canvas)", borderRadius: 10, border: "1px solid var(--line-soft)" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Reranking</div>
                  <div className="field-hint" style={{ marginTop: 2 }}>bge-reranker-base, top-N → K</div>
                </div>
                <Toggle on={rerank} onChange={mark(setRerank)} />
              </div>
              <div className="flex items-center justify-between" style={{ padding: "10px 14px", background: "var(--bg-canvas)", borderRadius: 10, border: "1px solid var(--line-soft)" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>Citation Required</div>
                  <div className="field-hint" style={{ marginTop: 2 }}>Block answers without source spans</div>
                </div>
                <Toggle on={cite} onChange={mark(setCite)} />
              </div>
            </div>

            <div className="grid-2 gap-6 mt-4">
              <div>
                <label className="field-label">Answer Style</label>
                <Seg value={style} options={[
                  { value: "Concise",       label: "CONCISE" },
                  { value: "Detailed",      label: "DETAILED" },
                  { value: "Support-Agent", label: "SUPPORT" },
                  { value: "Technical",     label: "TECHNICAL" },
                ]} onChange={mark(setStyle)} />
              </div>
              <div>
                <label className="field-label">Grounding Strictness</label>
                <Seg value={strict} options={[
                  { value: "Low",  label: "LOW" },
                  { value: "Med",  label: "MEDIUM" },
                  { value: "High", label: "HIGH" },
                ]} onChange={mark(setStrict)} />
              </div>
            </div>
          </div>

          {/* ── Retrieval test panel ── */}
          <div className="card">
            <div className="card-title mb-3">Test Retrieval</div>
            <div className="field-hint mb-2">Ask a question to preview what chunks would be retrieved. Requires indexed documents.</div>
            <div className="flex gap-2 mb-3">
              <input
                className="input"
                style={{ flex: 1 }}
                placeholder="e.g. What is the refund policy for damaged delivery?"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") runTest(); }}
              />
              <button className="btn btn-primary" onClick={runTest} disabled={testRunning || !testQuery.trim()}>
                {testRunning ? "…" : "Retrieve"}
              </button>
            </div>

            {testError && (
              <div style={{ fontSize: 12.5, color: "var(--acc-red, #e55)", padding: "8px 12px", background: "var(--acc-red-soft, #2a1010)", borderRadius: 8, marginBottom: 8 }}>
                {testError}
              </div>
            )}

            {testResults !== null && testResults.length === 0 && (
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", padding: "10px 0" }}>
                No chunks found. Upload and index documents first.
              </div>
            )}

            {testResults && testResults.length > 0 && (
              <div className="flex-col gap-2">
                {testResults.map((c, i) => (
                  <div key={c.chunk_id} style={{ background: "var(--bg-canvas)", border: "1px solid var(--line-soft)", borderRadius: 8, padding: "10px 12px" }}>
                    <div className="flex items-center justify-between mb-1">
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-muted)" }}>
                        #{i+1} · {c.filename}
                      </div>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: c.score > 0.7 ? "var(--acc-lime)" : c.score > 0.4 ? "var(--acc-cyan)" : "var(--text-muted)" }}>
                        {(c.score * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.55, color: "var(--text-secondary, #aaa)" }}>
                      {c.text_preview}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: JSON + impact ── */}
        <div className="flex-col gap-4">
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line-soft)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="card-title">Configuration JSON</div>
              <button
                className="btn btn-ghost"
                style={{ padding: "4px 8px", fontSize: 11 }}
                onClick={() => navigator.clipboard.writeText(configJson)}
              >
                <Icon name="copy" size={11} /> Copy
              </button>
            </div>
            <pre className="json" style={{ borderRadius: 0, border: "none", margin: 0, fontSize: 11.5, overflowX: "auto" }}>
{configJson.split("\n").map((line, i) => {
  // colour keys vs values
  const keyMatch = line.match(/^(\s*)"([^"]+)":\s*(.*)/);
  if (keyMatch) {
    const [, indent, key, val] = keyMatch;
    const valEl = val.startsWith('"') ? <span className="s">{val}</span>
                : val === "true" || val === "false" ? <span className="b">{val}</span>
                : <span className="n">{val}</span>;
    return <span key={i}>{indent}<span className="k">"{key}"</span>: {valEl}{"\n"}</span>;
  }
  return <span key={i}>{line}{"\n"}</span>;
})}
            </pre>
          </div>

          <div className="card">
            <div className="card-title mb-3">Estimated Impact</div>
            <div className="flex-col gap-2" style={{ fontSize: 12.5 }}>
              {/* latency: grows with topK */}
              <div className="bar-row">
                <span className="bar-label">Latency</span>
                <span className="bar-track"><span className="bar-fill" style={{ width: `${Math.min(95, 30 + topK * 3.5)}%` }}></span></span>
                <span className="bar-val">{(0.8 + topK * 0.16).toFixed(1)}s</span>
              </div>
              {/* recall: grows with topK */}
              <div className="bar-row">
                <span className="bar-label">Recall@K</span>
                <span className="bar-track"><span className="bar-fill" style={{ width: `${Math.min(98, 50 + topK * 4.5)}%` }}></span></span>
                <span className="bar-val">{(0.5 + topK * 0.045).toFixed(2)}</span>
              </div>
              {/* faithfulness: higher with citation required */}
              <div className="bar-row">
                <span className="bar-label">Faithfulness</span>
                <span className="bar-track"><span className="bar-fill" style={{ width: cite ? "89%" : "64%" }}></span></span>
                <span className="bar-val">{cite ? "0.89" : "0.64"}</span>
              </div>
              {/* cost: grows with topK */}
              <div className="bar-row">
                <span className="bar-label">Cost / query</span>
                <span className="bar-track"><span className="bar-fill" style={{ width: `${Math.min(90, 15 + topK * 4)}%` }}></span></span>
                <span className="bar-val">${(0.002 + topK * 0.0008).toFixed(4)}</span>
              </div>
            </div>
          </div>

          {configId && (
            <div className="card" style={{ padding: "12px 16px", fontSize: 12 }}>
              <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>Config ID</div>
              <div style={{ fontFamily: "monospace", wordBreak: "break-all", fontSize: 11 }}>{configId}</div>
              <div style={{ color: "var(--text-muted)", marginTop: 8, marginBottom: 4 }}>Use Case</div>
              <div style={{ fontFamily: "monospace", fontSize: 11 }}>{usecaseId}</div>
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

window.RagConfig = RagConfig;
