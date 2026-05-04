// Settings — wired to real API
const Settings = ({ activeUseCase, onNav }) => {
  const [cfg,          setCfg]          = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [testing,      setTesting]      = useState(false);
  const [testingOllama,setTestingOllama]= useState(false);
  const [connTest,     setConnTest]     = useState(null); // ConnectionTestResponse
  const [ollamaTest,   setOllamaTest]   = useState(null);
  const [error,        setError]        = useState(null);

  useEffect(() => {
    API.settings.get()
      .then(setCfg)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const testConnection = async () => {
    setTesting(true); setConnTest(null); setError(null);
    try {
      const res = await API.settings.testConnection();
      setConnTest(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setTesting(false);
    }
  };

  const testOllama = async () => {
    setTestingOllama(true); setOllamaTest(null); setError(null);
    try {
      const res = await API.settings.testOllama();
      setOllamaTest(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setTestingOllama(false);
    }
  };

  const Row = ({ label, value, mono = false, badge = null }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--line-soft)" }}>
      <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontSize: 12.5, fontFamily: mono ? "monospace" : "inherit" }}>
        {badge || value}
      </span>
    </div>
  );

  if (loading) return (
    <div className="page">
      <div className="page-head"><div><div className="eyebrow"><span className="glyph"></span> Workspace</div><h1 className="h1" style={{ fontSize: 38 }}>Settings</h1></div></div>
      <div className="card" style={{ textAlign: "center", padding: 40 }}><div className="card-sub">Loading…</div></div>
    </div>
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow"><span className="glyph"></span> Workspace</div>
          <h1 className="h1" style={{ fontSize: 38 }}>Settings</h1>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={testOllama} disabled={testingOllama}>
            {testingOllama ? "Testing…" : "Test Ollama"}
          </button>
          <button className="btn btn-primary" onClick={testConnection} disabled={testing}>
            {testing ? "Testing…" : "Test OpenAI"}
          </button>
        </div>
      </div>

      {error && (
        <div className="card mb-4" style={{ background: "var(--acc-red-soft, #2a1010)", border: "1px solid var(--acc-red, #e55)", padding: "12px 16px", color: "var(--acc-red, #e55)", fontSize: 13 }}>
          {error}
        </div>
      )}

      {connTest && (
        <div className="card mb-4" style={{
          background: connTest.status === "ok" ? "var(--acc-lime-soft)" : "var(--acc-red-soft, #2a1010)",
          border: `1px solid ${connTest.status === "ok" ? "var(--acc-lime-line)" : "var(--acc-red, #e55)"}`,
          padding: "12px 16px", fontSize: 13,
        }}>
          <strong>{connTest.status === "ok" ? "✓ Connected" : "✗ Failed"}</strong> · {connTest.provider} · {connTest.model}
          {connTest.latency_ms && <span className="mono" style={{ marginLeft: 12, fontSize: 11 }}>{connTest.latency_ms}ms</span>}
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>{connTest.message}</div>
        </div>
      )}

      {ollamaTest && (
        <div className="card mb-4" style={{
          background: ollamaTest.status === "ok" ? "var(--acc-cyan-soft)" : "var(--acc-red-soft, #2a1010)",
          border: `1px solid ${ollamaTest.status === "ok" ? "var(--acc-lime-line)" : "var(--acc-red, #e55)"}`,
          padding: "12px 16px", fontSize: 13,
        }}>
          <strong>{ollamaTest.status === "ok" ? "✓ Ollama Connected" : "✗ Ollama Failed"}</strong> · {ollamaTest.model}
          {ollamaTest.latency_ms && <span className="mono" style={{ marginLeft: 12, fontSize: 11 }}>{ollamaTest.latency_ms}ms</span>}
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>{ollamaTest.message}</div>
        </div>
      )}

      <div className="grid-2 gap-4">
        {/* ── Inference Provider ── */}
        <div className="card">
          <div className="card-title mb-3">Inference Provider</div>
          {cfg && <>
            <Row label="Default Provider" value={cfg.default_provider} />
            <Row label="LLM Model" value={cfg.default_model} mono />
            <Row label="Embedding Model" value={cfg.default_embedding_model} mono />
            <Row label="Cost · Input / 1k tokens" value={`$${cfg.token_cost_input_per_1k}`} mono />
            <Row label="Cost · Output / 1k tokens" value={`$${cfg.token_cost_output_per_1k}`} mono />
            <Row label="OpenAI API Key"
              badge={<Badge tone={cfg.openai_key_set ? "ok" : "err"}>{cfg.openai_key_set ? "Set" : "Not Set"}</Badge>}
            />
            <Row label="Ollama Status"
              badge={<Badge tone={cfg.ollama.running ? "ok" : "err"}>{cfg.ollama.running ? "Running" : "Offline"}</Badge>}
            />
            {cfg.ollama.running && <>
              <Row label="Ollama Version" value={cfg.ollama.version || "—"} mono />
              <Row label="Ollama Chat Model" value={cfg.ollama_default_model} mono />
              <Row label="Ollama Embed Model" value={cfg.ollama_default_embed_model} mono />
              <Row label="Installed Models" value={cfg.ollama.models.length === 0 ? "None — pull a model" : cfg.ollama.models.join(", ")} mono />
            </>}
          </>}
          {!cfg?.openai_key_set && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "var(--bg-canvas)", borderRadius: 8, border: "1px solid var(--line-soft)", fontSize: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>How to set your OpenAI API key</div>
              <div style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
                1. Create <code style={{ background: "var(--bg-elev)", padding: "1px 5px", borderRadius: 3 }}>backend/.env</code><br />
                2. Add: <code style={{ background: "var(--bg-elev)", padding: "1px 5px", borderRadius: 3 }}>OPENAI_API_KEY=sk-...</code><br />
                3. Restart the backend server
              </div>
            </div>
          )}
        </div>

        {/* ── Storage & Infrastructure ── */}
        <div className="card">
          <div className="card-title mb-3">Storage &amp; Infrastructure</div>
          {cfg && <>
            <Row label="Environment" badge={<Badge tone={cfg.app_env === "production" ? "ok" : "cyan"}>{cfg.app_env}</Badge>} />
            <Row label="Vector Store" value={cfg.vector_store} />
            <Row label="Upload Directory" value={cfg.upload_dir.split(/[/\\]/).pop()} mono />
            <Row label="Vector Store Dir" value={cfg.vector_store_dir.split(/[/\\]/).pop()} mono />
          </>}
        </div>

        {/* ── Connections ── */}
        <div className="card">
          <div className="card-title mb-3">Connections</div>
          <div className="flex-col gap-2">
            {[
              ["Backend API",          "ok",      "http://localhost:8000"],
              ["SQLite Database",      "ok",      "studio.db"],
              ["ChromaDB Vector Store","ok",      "local persistent"],
              ["OpenAI API",           cfg?.openai_key_set ? "ok" : "err",  cfg?.openai_key_set ? "Key configured" : "Key missing"],
              ["NVIDIA NIM Adapter",   "default", "Configurable — bring your own endpoint"],
            ].map(([k, tone, note]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: "var(--bg-canvas)", borderRadius: 8, border: "1px solid var(--line-soft)" }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{k}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{note}</div>
                </div>
                <Badge tone={tone}>{tone === "ok" ? "Connected" : tone === "err" ? "Not Set" : "Configurable"}</Badge>
              </div>
            ))}

            {/* Ollama — live status from backend probe */}
            {cfg && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: "var(--bg-canvas)", borderRadius: 8, border: "1px solid var(--line-soft)" }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>Ollama Local</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                    {cfg.ollama.running
                      ? `v${cfg.ollama.version || "?"} · ${cfg.ollama.models.length} model${cfg.ollama.models.length !== 1 ? "s" : ""} available`
                      : "Not running — start with: ollama serve"}
                  </div>
                  {cfg.ollama.running && cfg.ollama.models.length > 0 && (
                    <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {cfg.ollama.models.map(m => (
                        <span key={m} style={{ padding: "2px 7px", borderRadius: 4, background: "var(--acc-cyan-soft)", border: "1px solid var(--acc-lime-line)", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--acc-cyan)" }}>{m}</span>
                      ))}
                    </div>
                  )}
                </div>
                <Badge tone={cfg.ollama.running ? "ok" : "err"}>
                  {cfg.ollama.running ? "Running" : "Offline"}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* ── CORS Origins ── */}
        <div className="card">
          <div className="card-title mb-3">CORS Allowed Origins</div>
          <div className="flex-col gap-2">
            {cfg?.cors_origins?.map(o => (
              <div key={o} style={{ padding: "7px 12px", background: "var(--bg-canvas)", borderRadius: 6, border: "1px solid var(--line-soft)", fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>
                {o}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--text-muted)" }}>
            To change these, update <code style={{ background: "var(--bg-elev)", padding: "1px 5px", borderRadius: 3 }}>cors_origins</code> in <code style={{ background: "var(--bg-elev)", padding: "1px 5px", borderRadius: 3 }}>backend/.env</code> and restart.
          </div>
        </div>
      </div>

      <style>{`
        .flex-col { display: flex; flex-direction: column; }
        .flex { display: flex; }
      `}</style>
    </div>
  );
};

window.Settings = Settings;
