"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getLogs } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

type LogLevel = "ERROR" | "CRITICAL" | "WARNING" | "INFO" | "DEBUG" | "OTHER";

interface ParsedLine {
  raw:       string;
  level:     LogLevel;
  timestamp: string;
  module:    string;
  message:   string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const LEVEL_COLORS: Record<LogLevel, string> = {
  ERROR:    "#ef4444",
  CRITICAL: "#f97316",
  WARNING:  "#f59e0b",
  INFO:     "#00d4ff",
  DEBUG:    "rgba(226,232,240,0.35)",
  OTHER:    "#e2e8f0",
};

const LEVEL_BG: Record<LogLevel, string> = {
  ERROR:    "rgba(239,68,68,0.06)",
  CRITICAL: "rgba(249,115,22,0.06)",
  WARNING:  "rgba(245,158,11,0.04)",
  INFO:     "transparent",
  DEBUG:    "transparent",
  OTHER:    "transparent",
};

// Parse: "2026-03-17 00:09:41,449 [INFO] ModuleName: message"
const LOG_RE = /^(\d{4}-\d{2}-\d{2}\s[\d:,]+)\s+\[(\w+)\]\s+([^:]+):\s*(.*)/;

function parseLine(raw: string): ParsedLine {
  const m = raw.match(LOG_RE);
  if (m) {
    const levelStr = m[2].toUpperCase();
    const level: LogLevel =
      levelStr === "ERROR" || levelStr === "CRITICAL" ? levelStr as LogLevel :
      levelStr === "WARNING" ? "WARNING" :
      levelStr === "INFO"    ? "INFO"    :
      levelStr === "DEBUG"   ? "DEBUG"   : "OTHER";
    return { raw, level, timestamp: m[1], module: m[3].trim(), message: m[4] };
  }
  return { raw, level: "OTHER", timestamp: "", module: "", message: raw };
}

function levelBadge(level: LogLevel) {
  const color = LEVEL_COLORS[level];
  const labels: Record<LogLevel, string> = {
    ERROR: "ERR", CRITICAL: "CRIT", WARNING: "WARN",
    INFO: "INFO", DEBUG: "DBG", OTHER: "—",
  };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      minWidth: 36, padding: "0 5px", height: 16,
      borderRadius: 4, fontSize: "0.6rem", fontWeight: 800,
      letterSpacing: "0.06em", color, border: `1px solid ${color}40`,
      background: `${color}15`, flexShrink: 0,
    }}>
      {labels[level]}
    </span>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!checked)} style={{
      width: 36, height: 20, borderRadius: 10, cursor: "pointer",
      background: checked ? "rgba(0,212,255,0.35)" : "rgba(255,255,255,0.1)",
      border: `1px solid ${checked ? "rgba(0,212,255,0.5)" : "rgba(255,255,255,0.15)"}`,
      position: "relative", transition: "background 0.2s",
      flexShrink: 0,
    }}>
      <div style={{
        position: "absolute", top: 2, left: checked ? 17 : 2,
        width: 14, height: 14, borderRadius: "50%",
        background: checked ? "#00d4ff" : "rgba(255,255,255,0.4)",
        transition: "left 0.2s",
      }} />
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function LogsTab() {
  const [rawLines,     setRawLines]     = useState<string[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [fileName,     setFileName]     = useState("");
  const [autoRefresh,  setAutoRefresh]  = useState(true);
  const [lineCount,    setLineCount]    = useState(100);
  const [filter,       setFilter]       = useState("");
  const [levelFilter,  setLevelFilter]  = useState<LogLevel | "ALL">("ALL");
  const [wrap,         setWrap]         = useState(false);
  const [autoScroll,   setAutoScroll]   = useState(true);
  const endRef  = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────

  const fetchLogs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await getLogs(lineCount) as { lines?: string[]; file?: string };
      setRawLines(data.lines ?? []);
      if (data.file) setFileName(data.file);
    } catch { /* silent */ }
    finally { if (!silent) setLoading(false); }
  }, [lineCount]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const iv = setInterval(() => fetchLogs(true), 5000);
    return () => clearInterval(iv);
  }, [autoRefresh, fetchLogs]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [rawLines, autoScroll]);

  // ── Parse + filter ────────────────────────────────────────────────────

  const parsed = useMemo(() => rawLines.map(parseLine), [rawLines]);

  const filtered = useMemo(() => {
    let result = parsed;
    if (levelFilter !== "ALL") result = result.filter(l => l.level === levelFilter);
    if (filter.trim()) {
      const q = filter.toLowerCase();
      result = result.filter(l => l.raw.toLowerCase().includes(q));
    }
    return result;
  }, [parsed, filter, levelFilter]);

  // Level counts
  const counts = useMemo(() => {
    const c: Partial<Record<LogLevel, number>> = {};
    parsed.forEach(l => { c[l.level] = (c[l.level] ?? 0) + 1; });
    return c;
  }, [parsed]);

  // ── Copy / Download ───────────────────────────────────────────────────

  const copyLogs = () => {
    navigator.clipboard?.writeText(filtered.map(l => l.raw).join("\n")).catch(() => {});
  };

  const downloadLogs = () => {
    const blob = new Blob([filtered.map(l => l.raw).join("\n")], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement("a"), {
      href: url, download: `jarvis_logs_${Date.now()}.txt`,
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  const LEVELS: (LogLevel | "ALL")[] = ["ALL", "ERROR", "CRITICAL", "WARNING", "INFO", "DEBUG"];

  return (
    <>
      <style>{`
        @keyframes log-up { from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;} }
        .log-row:hover { background: rgba(255,255,255,0.02) !important; }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        {/* ── Header ──────────────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#e2e8f0", margin: "0 0 3px" }}>
              📋 System Logs
            </h2>
            <p style={{ fontSize: "0.72rem", color: "rgba(226,232,240,0.35)", margin: 0 }}>
              {fileName || "JARVIS runtime log"} · {rawLines.length} lines total
            </p>
          </div>

          {/* Toolbar */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {/* Lines count */}
            <select
              value={lineCount}
              onChange={e => setLineCount(parseInt(e.target.value))}
              style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 7, padding: "6px 10px", color: "#e2e8f0",
                fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit", outline: "none",
              }}
            >
              {[50, 100, 200, 500, 1000].map(n => (
                <option key={n} value={n}>{n} lines</option>
              ))}
            </select>

            {/* Filter input */}
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="🔍 Filter…"
              style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 7, padding: "6px 12px", color: "#e2e8f0",
                fontSize: "0.78rem", outline: "none", fontFamily: "inherit", width: 160,
              }}
            />

            {/* Auto-refresh toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Toggle checked={autoRefresh} onChange={setAutoRefresh} />
              <span style={{ fontSize: "0.72rem", color: "rgba(226,232,240,0.45)" }}>Auto</span>
            </div>

            {/* Wrap toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Toggle checked={wrap} onChange={setWrap} />
              <span style={{ fontSize: "0.72rem", color: "rgba(226,232,240,0.45)" }}>Wrap</span>
            </div>

            {/* Refresh button */}
            <button onClick={() => fetchLogs(false)} disabled={loading} style={{
              background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)",
              color: "#00d4ff", borderRadius: 7, padding: "6px 12px",
              fontSize: "0.78rem", cursor: loading ? "wait" : "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <span style={{
                display: "inline-block",
                animation: loading ? "log-up 0.7s linear infinite" : "none",
              }}>🔄</span>
              Refresh
            </button>

            {/* Copy */}
            <button onClick={copyLogs} style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(226,232,240,0.6)", borderRadius: 7, padding: "6px 12px",
              fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit",
            }}>
              📋 Copy
            </button>

            {/* Download */}
            <button onClick={downloadLogs} style={{
              background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
              color: "#22c55e", borderRadius: 7, padding: "6px 12px",
              fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit",
            }}>
              ⬇ Save
            </button>
          </div>
        </div>

        {/* ── Level filter tabs ────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {LEVELS.map(level => {
            const count  = level === "ALL" ? rawLines.length : (counts[level] ?? 0);
            const active = levelFilter === level;
            const color  = level === "ALL" ? "#e2e8f0" : LEVEL_COLORS[level];
            return (
              <button
                key={level}
                onClick={() => setLevelFilter(level)}
                style={{
                  background: active ? `${color}18` : "rgba(255,255,255,0.03)",
                  border: `1px solid ${active ? `${color}45` : "rgba(255,255,255,0.07)"}`,
                  color: active ? color : "rgba(226,232,240,0.45)",
                  borderRadius: 7, padding: "5px 12px",
                  fontSize: "0.72rem", fontWeight: active ? 700 : 400,
                  cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: 6,
                  transition: "all 0.15s",
                }}
              >
                {level !== "ALL" && (
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: color, flexShrink: 0,
                  }} />
                )}
                {level}
                <span style={{
                  background: active ? `${color}25` : "rgba(255,255,255,0.06)",
                  borderRadius: 4, padding: "0 6px", fontSize: "0.65rem",
                  fontWeight: 700, minWidth: 20, textAlign: "center",
                }}>
                  {count}
                </span>
              </button>
            );
          })}

          <span style={{
            marginLeft: "auto", fontSize: "0.72rem",
            color: "rgba(226,232,240,0.3)", alignSelf: "center",
          }}>
            {filtered.length} / {rawLines.length} lines
          </span>
        </div>

        {/* ── Log terminal ─────────────────────────────────────────── */}
        <div style={{
          background: "#020608",
          border: "1px solid rgba(0,212,255,0.12)",
          borderRadius: 12, overflow: "hidden",
        }}>
          {/* Terminal header bar */}
          <div style={{
            padding: "8px 14px",
            background: "rgba(0,212,255,0.03)",
            borderBottom: "1px solid rgba(0,212,255,0.08)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", gap: 6 }}>
              {["#ef4444", "#f59e0b", "#22c55e"].map(c => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.7 }} />
              ))}
            </div>
            <span style={{ fontSize: "0.68rem", color: "rgba(226,232,240,0.3)", fontFamily: "monospace" }}>
              {fileName || "jarvis.log"}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Toggle checked={autoScroll} onChange={setAutoScroll} />
              <span style={{ fontSize: "0.68rem", color: "rgba(226,232,240,0.3)" }}>Auto-scroll</span>
            </div>
          </div>

          {/* Log body */}
          <div
            ref={bodyRef}
            style={{
              padding: "10px 0",
              height: 460, overflowY: "auto", overflowX: wrap ? "hidden" : "auto",
              fontFamily: "'Cascadia Code','Fira Code','JetBrains Mono',monospace",
              fontSize: "0.76rem",
            }}
          >
            {loading && rawLines.length === 0 ? (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center",
                height: "100%", gap: 10, color: "rgba(226,232,240,0.3)" }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%",
                  border: "2px solid rgba(0,212,255,0.3)", borderTopColor: "#00d4ff",
                  display: "inline-block", animation: "log-up 0.7s linear infinite" }} />
                Loading logs…
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40,
                color: "rgba(226,232,240,0.3)", fontSize: "0.82rem" }}>
                {filter || levelFilter !== "ALL" ? "Tidak ada log yang cocok dengan filter." : "Tidak ada log."}
              </div>
            ) : (
              filtered.map((line, i) => (
                <div key={i} className="log-row" style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  padding: "2px 14px",
                  background: LEVEL_BG[line.level],
                  borderLeft: line.level === "ERROR" || line.level === "CRITICAL"
                    ? `2px solid ${LEVEL_COLORS[line.level]}` : "2px solid transparent",
                }}>
                  {/* Line number */}
                  <span style={{
                    color: "rgba(226,232,240,0.2)", userSelect: "none",
                    fontSize: "0.7rem", minWidth: 36, textAlign: "right",
                    flexShrink: 0, lineHeight: "1.7",
                    fontFamily: "monospace",
                  }}>
                    {i + 1}
                  </span>

                  {/* Level badge */}
                  <span style={{ paddingTop: 2, flexShrink: 0 }}>
                    {levelBadge(line.level)}
                  </span>

                  {/* Timestamp */}
                  {line.timestamp && (
                    <span style={{
                      color: "rgba(226,232,240,0.25)", fontSize: "0.7rem",
                      flexShrink: 0, lineHeight: "1.7", fontFamily: "monospace",
                      whiteSpace: "nowrap",
                    }}>
                      {line.timestamp.split(" ")[1]?.split(",")[0] ?? ""}
                    </span>
                  )}

                  {/* Module */}
                  {line.module && (
                    <span style={{
                      color: "rgba(0,212,255,0.5)", fontSize: "0.7rem",
                      flexShrink: 0, lineHeight: "1.7", whiteSpace: "nowrap",
                    }}>
                      [{line.module}]
                    </span>
                  )}

                  {/* Message */}
                  <span style={{
                    color: LEVEL_COLORS[line.level],
                    lineHeight: "1.7",
                    whiteSpace: wrap ? "pre-wrap" : "nowrap",
                    overflow: wrap ? "visible" : "hidden",
                    textOverflow: wrap ? "clip" : "ellipsis",
                    flex: 1, minWidth: 0,
                  }}>
                    {line.message || line.raw}
                  </span>
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>
        </div>

        {/* ── Footer stats ─────────────────────────────────────────── */}
        <div style={{
          display: "flex", gap: 14, flexWrap: "wrap",
          fontSize: "0.7rem", color: "rgba(226,232,240,0.3)",
        }}>
          {(["ERROR", "WARNING", "INFO"] as LogLevel[]).map(level => (
            counts[level] ? (
              <span key={level} style={{ color: LEVEL_COLORS[level] }}>
                {level}: {counts[level]}
              </span>
            ) : null
          ))}
          <span style={{ marginLeft: "auto" }}>
            Auto-refresh: {autoRefresh ? "ON (5s)" : "OFF"}
          </span>
        </div>
      </div>
    </>
  );
}