// Agentic RAG Solution Studio — API Client
// Communicates with FastAPI backend at localhost:8000

const API_BASE = "http://localhost:8000";

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!response.ok) {
    let error;
    try { error = await response.json(); } catch { error = { detail: response.statusText }; }
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

// ── Health ──────────────────────────────────────────────────────────────────
const API = {
  health: {
    get: () => apiFetch("/health"),
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  settings: {
    get:            () => apiFetch("/settings"),
    testConnection: () => apiFetch("/settings/test-connection", { method: "POST" }),
    testOllama:     () => apiFetch("/settings/test-ollama",     { method: "POST" }),
  },

  // ── Benchmarks ────────────────────────────────────────────────────────────
  benchmarks: {
    summary: (usecaseId) => apiFetch(`/benchmarks/${usecaseId}`),
  },

  // ── Use Cases ──────────────────────────────────────────────────────────────
  usecases: {
    list: () => apiFetch("/usecases"),
    get: (id) => apiFetch(`/usecases/${id}`),
    create: (payload) => apiFetch("/usecases", { method: "POST", body: JSON.stringify(payload) }),
    update: (id, payload) => apiFetch(`/usecases/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
    delete: (id) => apiFetch(`/usecases/${id}`, { method: "DELETE" }),
  },

  // ── Documents ─────────────────────────────────────────────────────────────
  documents: {
    list: (usecaseId) => apiFetch(`/documents?usecase_id=${usecaseId}`),
    get: (documentId) => apiFetch(`/documents/${documentId}`),
    upload: async (usecaseId, file) => {
      const form = new FormData();
      form.append("usecase_id", usecaseId);
      form.append("file", file);
      const response = await fetch(`${API_BASE}/documents/upload`, { method: "POST", body: form });
      if (!response.ok) { const e = await response.json(); throw new Error(e.detail || "Upload failed"); }
      return response.json();
    },
    process: (documentId) => apiFetch(`/documents/${documentId}/process`, { method: "POST" }),
    processAll: (usecaseId) => apiFetch(`/documents/process-all?usecase_id=${usecaseId}`, { method: "POST" }),
    delete: (documentId) => apiFetch(`/documents/${documentId}`, { method: "DELETE" }),
  },

  // ── RAG ───────────────────────────────────────────────────────────────────
  rag: {
    getConfig: (usecaseId) => apiFetch(`/rag/config/${usecaseId}`),
    saveConfig: (payload) => apiFetch("/rag/config", { method: "POST", body: JSON.stringify(payload) }),
    index: (payload) => apiFetch("/rag/index", { method: "POST", body: JSON.stringify(payload) }),
    retrieve: (payload) => apiFetch("/rag/retrieve", { method: "POST", body: JSON.stringify(payload) }),
  },

  // ── Agent ─────────────────────────────────────────────────────────────────
  agent: {
    ask: (payload) => apiFetch("/agent/ask", { method: "POST", body: JSON.stringify(payload) }),
    listRuns: (usecaseId) => apiFetch(`/agent/runs/${usecaseId}`),
    getRun: (usecaseId, runId) => apiFetch(`/agent/runs/${usecaseId}/${runId}`),
  },

  // ── Evaluation ────────────────────────────────────────────────────────────
  evaluation: {
    addGoldenQuestions: (payload) => apiFetch("/evaluation/golden-questions", { method: "POST", body: JSON.stringify(payload) }),
    listGoldenQuestions: (usecaseId) => apiFetch(`/evaluation/golden-questions/${usecaseId}`),
    deleteGoldenQuestion: (questionId) => apiFetch(`/evaluation/golden-questions/${questionId}`, { method: "DELETE" }),
    listEvaluations: (usecaseId) => apiFetch(`/evaluation/list/${usecaseId}`),
    run: (payload) => apiFetch("/evaluation/run", { method: "POST", body: JSON.stringify(payload) }),
    get: (evalId) => apiFetch(`/evaluation/${evalId}`),
  },

  // ── Reports ───────────────────────────────────────────────────────────────
  reports: {
    generate: (payload) => apiFetch("/reports/generate", { method: "POST", body: JSON.stringify(payload) }),
    list: (usecaseId) => apiFetch(`/reports/list/${usecaseId}`),
    get: (reportId) => apiFetch(`/reports/${reportId}`),
    getContent: async (reportId) => {
      const url = `${API_BASE}/reports/${reportId}/download`;
      const r = await fetch(url);
      if (!r.ok) throw new Error("Failed to fetch report content");
      return r.text();
    },
    downloadUrl: (reportId) => `${API_BASE}/reports/${reportId}/download`,
  },
};

window.API = API;
window.API_BASE = API_BASE;
