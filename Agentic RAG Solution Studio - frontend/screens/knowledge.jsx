// Knowledge Base — Phase 2 (wired to real API)
const STAGES = ["Uploaded", "Parsed", "Chunked", "Embedded", "Indexed"];

const STATUS_STAGE = {
  uploaded:  0,
  processing: 2,
  processed: 3,
  indexed:   4,
  failed:    -1,
};

const STATUS_TONE = {
  uploaded:   "default",
  processing: "warn",
  processed:  "cyan",
  indexed:    "ok",
  failed:     "err",
};

const FILE_TYPE_ICON = { pdf: "file", txt: "file", md: "file" };

function fmtBytes(n) {
  if (!n) return "—";
  if (n < 1000) return n + " ch";
  return (n / 1000).toFixed(1) + "k ch";
}

function timeSince(iso) {
  if (!iso) return "—";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m ago";
  if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
  return new Date(iso).toLocaleDateString();
}

// ── Pipeline progress bar ────────────────────────────────────────────────────
const PipelineProgress = ({ doc }) => {
  if (!doc) return null;
  const stageIdx = doc.status === "failed" ? -1 : (STATUS_STAGE[doc.status] ?? 0);
  return (
    <div className="card mb-4" style={{ padding: 0 }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line-soft)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div className="card-title">Processing Pipeline</div>
          <div className="card-sub mt-2">
            {doc.filename} · {doc.status === "failed" ? "failed" : `stage ${Math.max(stageIdx, 0) + 1} of ${STAGES.length}`}
          </div>
        </div>
        <Badge tone={STATUS_TONE[doc.status] || "default"}>{doc.status}</Badge>
      </div>
      <div style={{ padding: "20px 18px" }}>
        <div className="flex items-center" style={{ gap: 0 }}>
          {STAGES.map((s, i) => {
            const done    = i < stageIdx;
            const current = i === stageIdx;
            const failed  = doc.status === "failed";
            return (
              <React.Fragment key={s}>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: failed && current ? "var(--err)" : done || current ? "var(--acc-lime)" : "var(--bg-elev)",
                    border: current && !failed ? "1.5px solid var(--acc-lime)" : "1px solid var(--line)",
                    margin: "0 auto", display: "grid", placeItems: "center",
                    boxShadow: (done || current) && !failed ? "0 0 12px var(--acc-lime-line)" : "none",
                    color: done || (current && !failed) ? "var(--bg-base)" : "var(--fg-dim)",
                    fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 600,
                  }}>
                    {done ? <Icon name="check" size={12} stroke={2.5} /> : i + 1}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, fontWeight: 500, color: (done || current) ? "var(--fg)" : "var(--fg-dim)" }}>
                    {s}
                  </div>
                </div>
                {i < STAGES.length - 1 && (
                  <div style={{ flex: 1, height: 1, background: done ? "var(--acc-lime)" : "var(--line)", marginTop: -22 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Main screen ──────────────────────────────────────────────────────────────
const Knowledge = ({ activeUseCase }) => {
  const [docs, setDocs]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState({});   // { docId: true }
  const [processingAll, setProcessingAll] = useState(false);
  const [error, setError]       = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [focusDoc, setFocusDoc] = useState(null);     // doc shown in pipeline
  const fileInputRef            = React.useRef(null);

  const usecaseId = activeUseCase?.id;

  // ── Load documents ─────────────────────────────────────────────────────────
  const loadDocs = React.useCallback(() => {
    if (!usecaseId) { setDocs([]); return; }
    setLoading(true);
    API.documents.list(usecaseId)
      .then(d => {
        setDocs(d);
        // pin pipeline to the most recently touched doc
        if (d.length > 0) setFocusDoc(prev => prev ? d.find(x => x.id === prev.id) || d[0] : d[0]);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [usecaseId]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  // ── Upload handler ─────────────────────────────────────────────────────────
  const handleFiles = async (files) => {
    if (!usecaseId) { setError("Select a use case first."); return; }
    setError(null);
    setUploading(true);
    const fileArray = Array.from(files);
    try {
      for (const file of fileArray) {
        const doc = await API.documents.upload(usecaseId, file);
        setDocs(prev => [doc, ...prev]);
        setFocusDoc(doc);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const onFileInput   = (e) => handleFiles(e.target.files);
  const onDrop        = (e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); };
  const onDragOver    = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave   = () => setDragOver(false);

  // ── Process single doc ─────────────────────────────────────────────────────
  const processDoc = async (docId) => {
    setProcessing(p => ({ ...p, [docId]: true }));
    setError(null);
    try {
      const result = await API.documents.process(docId);
      setDocs(prev => prev.map(d => d.id === docId
        ? { ...d, status: result.status, chunk_count: result.chunks_created }
        : d
      ));
      setFocusDoc(prev => prev?.id === docId ? { ...prev, status: result.status, chunk_count: result.chunks_created } : prev);
    } catch (e) {
      setError(e.message);
      setDocs(prev => prev.map(d => d.id === docId ? { ...d, status: "failed" } : d));
    } finally {
      setProcessing(p => { const n = { ...p }; delete n[docId]; return n; });
    }
  };

  // ── Process all ────────────────────────────────────────────────────────────
  const processAll = async () => {
    if (!usecaseId) return;
    setProcessingAll(true);
    setError(null);
    try {
      await API.documents.processAll(usecaseId);
      await loadDocs();
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessingAll(false);
    }
  };

  // ── Delete doc ─────────────────────────────────────────────────────────────
  const deleteDoc = async (docId) => {
    setError(null);
    try {
      await API.documents.delete(docId);
      setDocs(prev => {
        const next = prev.filter(d => d.id !== docId);
        if (focusDoc?.id === docId) setFocusDoc(next[0] || null);
        return next;
      });
    } catch (e) {
      setError(e.message);
    }
  };

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalChunks  = docs.reduce((s, d) => s + (d.chunk_count || 0), 0);
  const totalChars   = docs.reduce((s, d) => s + (d.text_length || 0), 0);
  const indexedCount = docs.filter(d => d.status === "indexed").length;
  const needsProcess = docs.filter(d => d.status === "uploaded" || d.status === "failed");

  // ── No use case guard ──────────────────────────────────────────────────────
  if (!activeUseCase) {
    return (
      <div className="page">
        <div className="page-head">
          <div>
            <div className="eyebrow"><span className="glyph"></span> Step 02 · Knowledge Upload</div>
            <h1 className="h1" style={{ fontSize: 38 }}>Index the<br /><em>customer corpus</em></h1>
          </div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <Icon name="folder" size={32} style={{ color: "var(--fg-faint)", margin: "0 auto 16px" }} />
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No use case selected</div>
          <div style={{ color: "var(--fg-dim)", fontSize: 13 }}>
            Create or select a use case first, then come back to upload documents.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="page-head">
        <div>
          <div className="eyebrow"><span className="glyph"></span> Step 02 · Knowledge Upload</div>
          <h1 className="h1" style={{ fontSize: 38 }}>Index the<br /><em>customer corpus</em></h1>
        </div>
        <div className="flex gap-2">
          {needsProcess.length > 0 && (
            <button className="btn btn-ghost" onClick={processAll} disabled={processingAll}>
              <Icon name="zap" size={12} />
              {processingAll ? "Processing…" : `Process All (${needsProcess.length})`}
            </button>
          )}
          <button className="btn btn-ghost" onClick={loadDocs} disabled={loading}>
            <Icon name="refresh" size={12} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Icon name="upload" size={12} /> {uploading ? "Uploading…" : "Upload Documents"}
          </button>
          <input ref={fileInputRef} type="file" multiple accept=".txt,.md,.pdf" style={{ display: "none" }} onChange={onFileInput} />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ padding: "10px 14px", background: "oklch(0.7 0.18 25 / 0.1)", border: "1px solid var(--err)", borderRadius: 8, marginBottom: 16, fontSize: 12.5, color: "var(--err)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ color: "var(--err)", padding: "2px 6px" }}>
            <Icon name="x" size={12} />
          </button>
        </div>
      )}

      {/* Dropzone + Summary */}
      <div className="grid-2-1 gap-6 mb-4">
        <div
          className="dropzone"
          style={{ borderColor: dragOver ? "var(--acc-lime)" : undefined, background: dragOver ? "var(--acc-lime-soft)" : undefined, cursor: "pointer" }}
          onClick={() => fileInputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          <div className="ico-lg">
            {uploading
              ? <Icon name="refresh" size={20} style={{ animation: "spin 1s linear infinite" }} />
              : <Icon name="upload" size={20} />}
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: "-0.01em" }}>
            {uploading ? "Uploading…" : dragOver ? "Drop to upload" : "Drag & drop documents here"}
          </div>
          <div className="mt-2 muted" style={{ fontSize: 12.5 }}>
            or click to browse — supports PDF, TXT, Markdown up to 50 MB each
          </div>
          <div className="mt-4 flex gap-2" style={{ justifyContent: "center" }}>
            <Badge>PDF</Badge><Badge>TXT</Badge><Badge>MD</Badge>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Index Summary</div>
            <Badge tone={indexedCount > 0 ? "ok" : "default"}>
              <span className="dot" style={{ width: 5, height: 5, background: indexedCount > 0 ? "var(--ok)" : "var(--fg-faint)" }}></span>
              {indexedCount > 0 ? "Has indexed docs" : "Not indexed yet"}
            </Badge>
          </div>
          <div className="flex-col gap-3" style={{ fontSize: 12.5 }}>
            <div className="flex justify-between"><span className="mono dim">Documents</span><span className="mono">{docs.length}</span></div>
            <div className="flex justify-between"><span className="mono dim">Indexed</span><span className="mono">{indexedCount}</span></div>
            <div className="flex justify-between"><span className="mono dim">Total chunks</span><span className="mono">{totalChunks || "—"}</span></div>
            <div className="flex justify-between"><span className="mono dim">Total characters</span><span className="mono">{fmtBytes(totalChars)}</span></div>
            <div className="divider-stripe"></div>
            <div className="flex justify-between"><span className="mono dim">Vector DB</span><span className="mono">ChromaDB</span></div>
            <div className="flex justify-between"><span className="mono dim">Embedding</span><span className="mono">text-embedding-3-small</span></div>
            <div className="flex justify-between"><span className="mono dim">Use case</span>
              <span className="mono dim" style={{ fontSize: 10, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {activeUseCase.id.slice(0, 16)}…
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pipeline progress — shows the focused document */}
      {focusDoc && <PipelineProgress doc={focusDoc} />}

      {/* Documents table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line-soft)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="card-title">
            Documents · {docs.length}
            {needsProcess.length > 0 && (
              <span className="mono dim" style={{ fontSize: 11, marginLeft: 10, fontWeight: 400 }}>
                {needsProcess.length} need processing
              </span>
            )}
          </div>
          <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 11 }} onClick={loadDocs}>
            <Icon name="refresh" size={11} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--fg-dim)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
            Loading documents…
          </div>
        ) : docs.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <Icon name="folder" size={28} style={{ color: "var(--fg-faint)", margin: "0 auto 12px", display: "block" }} />
            <div style={{ color: "var(--fg-dim)", fontSize: 13 }}>No documents yet — upload your first file above.</div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Type</th>
                <th>Chunks</th>
                <th>Size</th>
                <th>Status</th>
                <th>Uploaded</th>
                <th style={{ width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {docs.map(d => (
                <tr key={d.id}
                  style={{ cursor: "pointer", background: focusDoc?.id === d.id ? "var(--bg-card-hi)" : undefined }}
                  onClick={() => setFocusDoc(d)}
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <Icon name="file" size={14} style={{ color: "var(--acc-cyan)", flexShrink: 0 }} />
                      <span style={{ fontWeight: focusDoc?.id === d.id ? 500 : 400 }}>{d.filename}</span>
                    </div>
                  </td>
                  <td className="muted mono" style={{ fontSize: 11 }}>{d.file_type.toUpperCase()}</td>
                  <td className="mono">{d.chunk_count > 0 ? d.chunk_count : "—"}</td>
                  <td className="mono dim">{fmtBytes(d.text_length)}</td>
                  <td><Badge tone={STATUS_TONE[d.status] || "default"}>{d.status}</Badge></td>
                  <td className="mono dim">{timeSince(d.created_at)}</td>
                  <td onClick={e => e.stopPropagation()}>
                    <div className="flex gap-2" style={{ justifyContent: "flex-end" }}>
                      {(d.status === "uploaded" || d.status === "failed") && (
                        <button
                          className="btn btn-ghost"
                          style={{ padding: "3px 8px", fontSize: 11 }}
                          disabled={!!processing[d.id]}
                          onClick={() => processDoc(d.id)}
                        >
                          {processing[d.id]
                            ? <Icon name="refresh" size={11} style={{ animation: "spin 1s linear infinite" }} />
                            : <Icon name="zap" size={11} />}
                          {processing[d.id] ? " Processing…" : " Process"}
                        </button>
                      )}
                      <button
                        className="btn btn-ghost"
                        style={{ padding: "3px 8px", fontSize: 11, color: "var(--err)" }}
                        onClick={() => deleteDoc(d.id)}
                      >
                        <Icon name="x" size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* spin keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

window.Knowledge = Knowledge;
