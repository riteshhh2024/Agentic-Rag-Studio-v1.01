// Shared UI primitives + icons (lucide-style inline SVGs)
const { useState, useEffect, useRef, useMemo } = React;

const Icon = ({ name, size = 16, stroke = 1.6, style }) => {
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></>,
    layers: <><path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></>,
    folder: <><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
    sliders: <><line x1="4" y1="6" x2="20" y2="6" /><circle cx="9" cy="6" r="2" /><line x1="4" y1="12" x2="20" y2="12" /><circle cx="15" cy="12" r="2" /><line x1="4" y1="18" x2="20" y2="18" /><circle cx="9" cy="18" r="2" /></>,
    bot: <><rect x="4" y="8" width="16" height="12" rx="2" /><path d="M12 4v4" /><circle cx="9" cy="14" r="1" /><circle cx="15" cy="14" r="1" /><path d="M2 14h2M20 14h2" /></>,
    gauge: <><path d="M12 14l4-4" /><path d="M3.34 19a10 10 0 1 1 17.32 0" /></>,
    cpu: <><rect x="5" y="5" width="14" height="14" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>,
    plus: <><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>,
    play: <polygon points="6 4 20 12 6 20 6 4" />,
    arrowRight: <><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>,
    arrowUp: <><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></>,
    arrowDown: <><line x1="12" y1="5" x2="12" y2="19" /><polyline points="19 12 12 19 5 12" /></>,
    check: <polyline points="20 6 9 17 4 12" />,
    chevronRight: <polyline points="9 6 15 12 9 18" />,
    chevronDown: <polyline points="6 9 12 15 18 9" />,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>,
    sparkles: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" /></>,
    search: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
    git: <><circle cx="6" cy="6" r="2" /><circle cx="18" cy="18" r="2" /><path d="M6 8v8a4 4 0 0 0 4 4h6" /></>,
    spark: <><path d="M12 2 9.5 9 2 12l7.5 3 2.5 7 2.5-7 7.5-3-7.5-3z" /></>,
    copy: <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
    refresh: <><polyline points="23 4 23 10 17 10" /><path d="M20.49 15A9 9 0 1 1 18.36 5.64L23 10" /></>,
    bookmark: <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />,
    db: <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v6c0 1.66 4 3 9 3s9-1.34 9-3V5" /><path d="M3 11v6c0 1.66 4 3 9 3s9-1.34 9-3v-6" /></>,
    zap: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    network: <><rect x="9" y="2" width="6" height="6" rx="1" /><rect x="2" y="16" width="6" height="6" rx="1" /><rect x="16" y="16" width="6" height="6" rx="1" /><path d="M12 8v4M5 16v-2h14v2" /></>,
    eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>,
    flag: <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></>,
    x: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {paths[name] || null}
    </svg>);

};

const Badge = ({ children, tone = "default" }) =>
<span className={`badge ${tone}`}>{children}</span>;


const MetricCard = ({ label, value, unit, delta, deltaTone = "ok", spark }) =>
<div className="metric">
    <div className="label">
      <span style={{ fontFamily: "\"JetBrains Mono\"" }}>{label}</span>
      {spark}
    </div>
    <div className="val" style={{ fontFamily: "\"JetBrains Mono\"" }}>{value}{unit && <span className="unit" style={{ fontFamily: "\"JetBrains Mono\"" }}>{unit}</span>}</div>
    {delta &&
  <div className={`delta ${deltaTone}`}>
        <Icon name={deltaTone === "down" ? "arrowDown" : deltaTone === "flat" ? "arrowRight" : "arrowUp"} size={11} />
        {delta}
      </div>
  }
  </div>;


const Sparkline = ({ data, color = "var(--acc-lime)" }) => {
  const w = 60,h = 18;
  const max = Math.max(...data),min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = i / (data.length - 1) * w;
    const y = h - (v - min) / (max - min || 1) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline fill="none" stroke={color} strokeWidth="1.4" points={pts} />
    </svg>);

};

const Toggle = ({ on, onChange }) =>
<div className={`toggle ${on ? "on" : ""}`} onClick={() => onChange(!on)} />;


const Slider = ({ value, min = 0, max = 100, step = 1, onChange, format }) =>
<div className="slider-row">
    <input type="range" className="slider" value={value} min={min} max={max} step={step}
  onChange={(e) => onChange(Number(e.target.value))} />
    <span className="slider-val">{format ? format(value) : value}</span>
  </div>;


const Seg = ({ value, options, onChange }) =>
<div className="seg">
    {options.map((o) =>
  <button key={o.value} className={value === o.value ? "active" : ""} onClick={() => onChange(o.value)}>{o.label}</button>
  )}
  </div>;


Object.assign(window, { Icon, Badge, MetricCard, Sparkline, Toggle, Slider, Seg });