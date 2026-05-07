// Settings — wired to real API
const Settings = ({ activeUseCase, onNav, providerConfig, onProviderChange }) => {
  const [cfg,           setCfg]           = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [testing,       setTesting]       = useState(false);
  const [testingOllama, setTestingOllama] = useState(false);
  const [connTest,      setConnTest]      = useState(null);
  const [ollamaTest,    setOllamaTest]    = useState(null);
  const [error,         setError]         = useState(null);

  // Provider config local edit state
  const [pc,      setPc]      = useState(providerConfig || { provider: "openai", chat_model: "gpt-4o-mini", embed_model: "text-embedding-3-small" });
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  useEffect(() => {
    API.settings.get()
      .then(setCfg)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Keep local pc in sync if parent updates providerConfig
  useEffect(() => {
    if (providerConfig) setPc(providerConfig);
  }, [providerConfig?.provider, providerConfig?.chat_model, providerConfig?.embed_model]);

  const testConnection = async () => {
    setTesting(true); setConnTest(null); setError(null);
    try { setConnTest(await API.settings.testConnection()); }
    catch (e) { setError(e.message); }
    finally { setTesting(false); }
  };

  const testOllama = async () => {
    setTestingOllama(true); setOllamaTest(null); setError(null);
    try { setOllamaTest(await API.settings.testOllama()); }
    catch (e) { setError(e.message); }
    finally { setTestingOllama(false); }
  };

  const saveProvider = async () => {
    setSaving(true); setSaved(false); setError(null);
    try {
      const saved = await API.settings.saveProviderConfig(pc);
      if (onProviderChange) onProviderChange(saved);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const setProvider = (p) => {
    const defaults = {
      openai: { chat_model: "gpt-4o-mini",    embed_model: "text-embedding-3-small" },
      ollama: { chat_model: cfg?.ollama?.models?.[0] || "llama3.2:latest", embed_model: "nomic-embed-text" },
      nvidia: { chat_model: "meta/llama-3.1-8b-instruct", embed_model: "nvidia/nv-embedqa-e5-v5" },
    };
    setPc({ provider: p, ...defaults[p] });
    setSaved(false);
  };

  const OPENAI_CHAT_MODELS  = ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"];
  const OPENAI_EMBED_MODELS = ["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"];
  const NVIDIA_CHAT_MODELS  = ["meta/llama-3.1-8b-instruct", "meta/llama-3.1-70b-instruct", "mistralai/mixtral-8x22b-instruct-v0.1", "nvidia/nemotron-4-340b-instruct"];
  const NVIDIA_EMBED_MODELS = ["nvidia/nv-embedqa-e5-v5", "nvidia/nv-embedqa-mistral-7b-v2"];

  const ollamaModels = cfg?.ollama?.models || [];

  const chatModels = pc.provider === "openai" ? OPENAI_CHAT_MODELS
                   : pc.provider === "nvidia" ? NVIDIA_CHAT_MODELS
                   : ollamaModels;

  const embedModels = pc.provider === "openai" ? OPENAI_EMBED_MODELS
                    : pc.provider === "nvidia" ? NVIDIA_EMBED_MODELS
                    : ollamaModels.length ? ollamaModels : ["nomic-embed-text", "mxbai-embed-large"];

  const Row = ({ label, value, mono = false, badge = null }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid var(--line-soft)" }}>
      <span style={{ fontSize: 12.5, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontSize: 12.5, fontFamily: mono ? "monospace" : "inherit" }}>{badge || value}</span>
    </div>
  );

  if (loading) return (
    <div className="page">
      <div className="page-head"><div><div className="eyebrow"><span className="glyph"></span> System</div><h1 className="h1" style={{ fontSize: 38 }}>Settings</h1></div></div>
      <div className="card" style={{ textAlign: "center", padding: 40 }}><div className="card-sub">Loading…</div></div>
    </div>
  );

  const providerTone = { openai: "lime", ollama: "cyan", nvidia: "ok" };
  const providerLabel = { openai: "OpenAI", ollama: "Ollama", nvidia: "NVIDIA NIM" };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow"><span className="glyph"></span> System</div>
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

      {/* ── Active Provider Switch ─────────────────────────────────────── */}
      <div className="card mb-4">
        <div className="card-head mb-3">
          <div>
            <div className="card-title">Active Provider</div>
            <div className="card-sub mt-1">All agent runs, evaluations, and embeddings will use this provider and model.</div>
          </div>
          <Badge tone={providerTone[pc.provider] || "default"}>{providerLabel[pc.provider] || pc.provider}</Badge>
        </div>

        {/* Provider toggle */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["openai", "ollama", "nvidia"].map(p => (
            <button key={p} onClick={() => setProvider(p)}
              style={{
                flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid",
                cursor: "pointer", fontSize: 12.5, fontWeight: 600, fontFamily: "var(--font-mono)",
                transition: "all 0.15s",
                borderColor: pc.provider === p ? "var(--acc-lime-line)" : "var(--line-soft)",
                background:  pc.provider === p ? "var(--acc-lime-soft)" : "var(--bg-canvas)",
                color:       pc.provider === p ? "var(--acc-lime)" : "var(--text-muted)",
              }}>
              {p === "openai" ? "OpenAI" : p === "ollama" ? "Ollama" : "NVIDIA NIM"}
            </button>
          ))}
        </div>

        {/* Ollama offline warning */}
        {pc.provider === "ollama" && cfg && !cfg.ollama.running && (
          <div style={{ padding: "10px 14px", marginBottom: 16, borderRadius: 8, background: "var(--acc-red-soft, #2a1010)", border: "1px solid var(--acc-red, #e55)", fontSize: 12.5, color: "var(--acc-red, #e55)" }}>
            Ollama is not running. Start it with: <code>ollama serve</code>
          </div>
        )}

        {/* OpenAI key warning */}
        {pc.provider === "openai" && cfg && !cfg.openai_key_set && (
          <div style={{ padding: "10px 14px", marginBottom: 16, borderRadius: 8, background: "var(--acc-red-soft, #2a1010)", border: "1px solid var(--acc-red, #e55)", fontSize: 12.5, color: "var(--acc-red, #e55)" }}>
            OpenAI API key not set. Add <code>OPENAI_API_KEY</code> to <code>backend/.env</code>.
          </div>
        )}

        <div className="grid-2 gap-4" style={{ marginBottom: 16 }}>
          {/* Chat model */}
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: 6 }}>
              Chat Model
            </label>
            {pc.provider === "ollama" && ollamaModels.length === 0 ? (
              <div style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--line-soft)", fontSize: 12, color: "var(--text-muted)" }}>
                No models — run <code>ollama pull llama3.2</code>
              </div>
            ) : (
              <select className="input" value={pc.chat_model}
                onChange={e => { setPc({ ...pc, chat_model: e.target.value }); setSaved(false); }}
                style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                {chatModels.map(m => <option key={m} value={m}>{m}</option>)}
                {/* allow custom entry not in list */}
                {!chatModels.includes(pc.chat_model) && <option value={pc.chat_model}>{pc.chat_model}</option>}
              </select>
            )}
          </div>

          {/* Embed model */}
          <div>
            <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-muted)", marginBottom: 6 }}>
              Embedding Model
            </label>
            <select className="input" value={pc.embed_model}
              onChange={e => { setPc({ ...pc, embed_model: e.target.value }); setSaved(false); }}
              style={{ width: "100%", fontFamily: "var(--font-mono)", fontSize: 12 }}>
              {embedModels.map(m => <option key={m} value={m}>{m}</option>)}
              {!embedModels.includes(pc.embed_model) && <option value={pc.embed_model}>{pc.embed_model}</option>}
            </select>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Changing embed model requires re-indexing documents.</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn-primary" onClick={saveProvider} disabled={saving}>
            {saving ? "Saving…" : saved ? "✓ Saved — active everywhere" : "Apply Provider & Model"}
          </button>
          {saved && <span style={{ fontSize: 12, color: "var(--acc-lime)" }}>All future agent runs will use {providerLabel[pc.provider]} · {pc.chat_model}</span>}
        </div>
      </div>

      <div className="grid-2 gap-4">
        {/* Inference Provider (read-only info) */}
        <div className="card">
          <div className="card-title mb-3">Inference Provider</div>
          {cfg && <>
            <Row label="Default Provider"          value={cfg.default_provider} />
            <Row label="LLM Model"                 value={cfg.default_model} mono />
            <Row label="Embedding Model"           value={cfg.default_embedding_model} mono />
            <Row label="Cost · Input / 1k tokens"  value={`$${cfg.token_cost_input_per_1k}`} mono />
            <Row label="Cost · Output / 1k tokens" value={`$${cfg.token_cost_output_per_1k}`} mono />
            <Row label="OpenAI API Key"
              badge={<Badge tone={cfg.openai_key_set ? "warn" : "err"}>{cfg.openai_key_set ? "Key Set" : "Not Set"}</Badge>} />
            <Row label="Ollama Status"
              badge={<Badge tone={cfg.ollama.running ? "ok" : "err"}>{cfg.ollama.running ? "Running" : "Offline"}</Badge>} />
            {cfg.ollama.running && <>
              <Row label="Ollama Version"       value={cfg.ollama.version || "—"} mono />
              <Row label="Ollama Chat Model"    value={cfg.ollama_default_model} mono />
              <Row label="Ollama Embed Model"   value={cfg.ollama_default_embed_model} mono />
              <Row label="Installed Models"     value={cfg.ollama.models.length === 0 ? "None — pull a model" : cfg.ollama.models.join(", ")} mono />
            </>}
          </>}
        </div>

        {/* Storage & Infrastructure */}
        <div className="card">
          <div className="card-title mb-3">Storage &amp; Infrastructure</div>
          {cfg && <>
            <Row label="Environment"      badge={<Badge tone={cfg.app_env === "production" ? "ok" : "cyan"}>{cfg.app_env}</Badge>} />
            <Row label="Vector Store"     value={cfg.vector_store} />
            <Row label="Upload Directory" value={cfg.upload_dir.split(/[/\\]/).pop()} mono />
            <Row label="Vector Store Dir" value={cfg.vector_store_dir.split(/[/\\]/).pop()} mono />
          </>}
        </div>

        {/* Connections */}
        <div className="card">
          <div className="card-title mb-3">Connections</div>
          <div className="flex-col gap-2">
            {[
              ["Backend API",           "ok",                                        "http://localhost:8000",                                      "Connected"    ],
              ["SQLite Database",       "ok",                                        "studio.db",                                                  "Connected"    ],
              ["ChromaDB Vector Store", "ok",                                        "local persistent",                                           "Connected"    ],
              ["OpenAI API",            cfg?.openai_key_set ? "warn" : "err",
                                        cfg?.openai_key_set ? "Key set — click Test OpenAI to verify" : "Key missing — add OPENAI_API_KEY to .env",
                                        cfg?.openai_key_set ? "Key Set" : "Not Set"],
              ["NVIDIA NIM Adapter",    "default",                                   "Configurable — bring your own endpoint",                     "Configurable" ],
            ].map(([k, tone, note, label]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: "var(--bg-canvas)", borderRadius: 8, border: "1px solid var(--line-soft)" }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{k}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{note}</div>
                </div>
                <Badge tone={tone}>{label}</Badge>
              </div>
            ))}

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
                <Badge tone={cfg.ollama.running ? "ok" : "err"}>{cfg.ollama.running ? "Running" : "Offline"}</Badge>
              </div>
            )}
          </div>
        </div>

        {/* CORS Origins */}
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
            Update <code style={{ background: "var(--bg-elev)", padding: "1px 5px", borderRadius: 3 }}>cors_origins</code> in <code style={{ background: "var(--bg-elev)", padding: "1px 5px", borderRadius: 3 }}>backend/.env</code> and restart.
          </div>
        </div>
      </div>

      <style>{`.flex-col { display: flex; flex-direction: column; } .flex { display: flex; }`}</style>
    </div>
  );
};

window.Settings = Settings;
