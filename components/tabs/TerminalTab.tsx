"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { getApiBase, getToken } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

type LineType = "cmd" | "out" | "err" | "sys";

interface Line {
  type:      LineType;
  text:      string;
  timestamp: string;
}

type Shell = "powershell" | "cmd";

// ── Constants ──────────────────────────────────────────────────────────────

const WELCOME: Line[] = [
  { type: "sys", text: "JARVIS Interactive Shell v2.0", timestamp: "" },
  { type: "sys", text: "Commands run on the remote PC · ↑↓ for history · Ctrl+L to clear", timestamp: "" },
  { type: "sys", text: "─────────────────────────────────────────────────", timestamp: "" },
];

const QUICK_CMDS: Array<{ label: string; cmd: string; shell?: Shell }> = [
  { label: "Processes",     cmd: "Get-Process | Select-Object -First 15 Name,CPU,WorkingSet | Format-Table -AutoSize" },
  { label: "Desktop files", cmd: "dir C:\\Users\\$env:USERNAME\\Desktop" },
  { label: "Network",       cmd: "ipconfig /all" },
  { label: "Sysinfo",       cmd: "systeminfo" },
  { label: "Date/Time",     cmd: "Get-Date" },
  { label: "Who am I",      cmd: "whoami /all" },
  { label: "Tasklist",      cmd: "tasklist /FO TABLE" },
  { label: "Netstat",       cmd: "netstat -an | Select-Object -First 30" },
  { label: "Startup",       cmd: "Get-CimInstance Win32_StartupCommand | Select-Object Name,Command,Location" },
  { label: "Disk usage",    cmd: "Get-PSDrive -PSProvider FileSystem | Format-Table Name,Used,Free,Root -AutoSize" },
  { label: "Env vars",      cmd: "Get-ChildItem Env: | Format-Table Name,Value -AutoSize" },
  { label: "WiFi profiles", cmd: "netsh wlan show profiles" },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function timestamp() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function lineColor(type: LineType): string {
  switch (type) {
    case "cmd": return "#00d4ff";
    case "err": return "#ef4444";
    case "sys": return "rgba(226,232,240,0.3)";
    default:    return "#e2e8f0";
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function TerminalTab() {
  const [lines,     setLines]     = useState<Line[]>(WELCOME);
  const [input,     setInput]     = useState("");
  const [history,   setHistory]   = useState<string[]>([]);
  const [histIdx,   setHistIdx]   = useState(-1);
  const [loading,   setLoading]   = useState(false);
  const [cwd,       setCwd]       = useState("C:\\");
  const [shell,     setShell]     = useState<Shell>("powershell");
  const [wrap,      setWrap]      = useState(true);
  const [showQuick, setShowQuick] = useState(true);
  const [copied,    setCopied]    = useState(false);
  const endRef   = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef  = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Ctrl+L = clear
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "l") {
        e.preventDefault();
        clearTerminal();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Execute command ───────────────────────────────────────────────────

  const runCmd = useCallback(async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed || loading) return;

    const ts = timestamp();

    setLines(prev => [...prev, {
      type: "cmd",
      text: `${shell === "powershell" ? "PS" : "CMD"} ${cwd}> ${trimmed}`,
      timestamp: ts,
    }]);
    setHistory(prev => [trimmed, ...prev.slice(0, 99)]);
    setHistIdx(-1);
    setInput("");
    setLoading(true);

    try {
      const base  = getApiBase();
      const token = getToken();
      const resp  = await fetch(`${base}/api/control`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "run_cmd", params: { cmd: trimmed, shell } }),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json() as { output?: string; error?: string };

      if (data.error) throw new Error(data.error);

      const output = (data.output ?? "(no output)").trimEnd();

      // If output has cd-like info, update cwd
      const cdMatch = output.match(/^([A-Z]:\\[^\r\n]*)$/m);
      if (trimmed.toLowerCase().startsWith("cd ") && cdMatch) {
        setCwd(cdMatch[1]);
      }

      setLines(prev => [...prev, { type: "out", text: output, timestamp: timestamp() }]);
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      setLines(prev => [...prev, { type: "err", text: `Error: ${m}`, timestamp: timestamp() }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [loading, cwd, shell]);

  const clearTerminal = () => {
    setLines([
      { type: "sys", text: "Terminal cleared.", timestamp: timestamp() },
    ]);
  };

  const copyOutput = () => {
    const text = lines.map(l => l.text).join("\n");
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadOutput = () => {
    const text = lines.map(l =>
      l.timestamp ? `[${l.timestamp}] ${l.text}` : l.text
    ).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement("a"), {
      href: url, download: `jarvis_shell_${Date.now()}.txt`,
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      runCmd(input);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const idx = Math.min(histIdx + 1, history.length - 1);
      if (history[idx] !== undefined) { setHistIdx(idx); setInput(history[idx]); }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const idx = histIdx - 1;
      setHistIdx(Math.max(idx, -1));
      setInput(idx < 0 ? "" : history[idx]);
    } else if (e.key === "Tab") {
      e.preventDefault();
      // Simple tab: pick last matching history entry
      const q = input.toLowerCase();
      const match = history.find(h => h.toLowerCase().startsWith(q) && h !== input);
      if (match) setInput(match);
    }
  };

  const prompt = `${shell === "powershell" ? "PS" : "CMD"} ${cwd}>`;

  return (
    <>
      <style>{`
        @keyframes term-blink { 0%,100%{opacity:1;} 50%{opacity:0;} }
        @keyframes term-up    { from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;} }
        .term-row:hover .term-ts { opacity: 1 !important; }
      `}</style>

      <div style={{
        display: "flex", flexDirection: "column", gap: 14,
        height: "calc(100vh - 160px)", minHeight: 480,
      }}>

        {/* ── Header ──────────────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between",
          alignItems: "center", flexWrap: "wrap", gap: 10 }}>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#e2e8f0", margin: 0 }}>
              💻 Interactive Shell
            </h2>

            {/* Shell switcher */}
            <div style={{
              display: "flex", background: "rgba(0,0,0,0.3)",
              borderRadius: 7, border: "1px solid rgba(255,255,255,0.08)",
              overflow: "hidden",
            }}>
              {(["powershell", "cmd"] as Shell[]).map(s => (
                <button key={s} onClick={() => setShell(s)} style={{
                  fontSize: "0.7rem", padding: "5px 12px", border: "none",
                  background: shell === s ? "rgba(0,212,255,0.2)" : "transparent",
                  color: shell === s ? "#00d4ff" : "rgba(226,232,240,0.45)",
                  fontWeight: 700, cursor: "pointer", fontFamily: "monospace",
                  transition: "all 0.15s",
                }}>
                  {s === "powershell" ? "PS" : "CMD"}
                </button>
              ))}
            </div>

            {/* CWD badge */}
            <code style={{
              fontSize: "0.72rem", color: "rgba(0,212,255,0.6)",
              background: "rgba(0,212,255,0.06)",
              border: "1px solid rgba(0,212,255,0.12)",
              borderRadius: 5, padding: "2px 8px",
            }}>
              📁 {cwd}
            </code>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {/* Wrap toggle */}
            <button onClick={() => setWrap(v => !v)} style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
              color: "rgba(226,232,240,0.5)", borderRadius: 6, padding: "5px 10px",
              fontSize: "0.72rem", cursor: "pointer", fontFamily: "inherit",
            }}>{wrap ? "↔ Nowrap" : "↩ Wrap"}</button>

            {/* Quick toggle */}
            <button onClick={() => setShowQuick(v => !v)} style={{
              background: showQuick ? "rgba(0,212,255,0.08)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${showQuick ? "rgba(0,212,255,0.2)" : "rgba(255,255,255,0.08)"}`,
              color: showQuick ? "#00d4ff" : "rgba(226,232,240,0.45)",
              borderRadius: 6, padding: "5px 10px",
              fontSize: "0.72rem", cursor: "pointer", fontFamily: "inherit",
            }}>⚡ Quick</button>

            {/* Copy */}
            <button onClick={copyOutput} style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              color: copied ? "#22c55e" : "rgba(226,232,240,0.5)",
              borderRadius: 6, padding: "5px 10px",
              fontSize: "0.72rem", cursor: "pointer", fontFamily: "inherit",
              transition: "color 0.2s",
            }}>{copied ? "✓ Copied" : "📋 Copy"}</button>

            {/* Download */}
            <button onClick={downloadOutput} style={{
              background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.18)",
              color: "#22c55e", borderRadius: 6, padding: "5px 10px",
              fontSize: "0.72rem", cursor: "pointer", fontFamily: "inherit",
            }}>⬇ Save</button>

            {/* Clear */}
            <button onClick={clearTerminal} style={{
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
              color: "#ef4444", borderRadius: 6, padding: "5px 10px",
              fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>🗑 Clear</button>
          </div>
        </div>

        {/* ── Quick commands ───────────────────────────────────────── */}
        {showQuick && (
          <div style={{
            background: "rgba(0,0,0,0.25)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10, padding: "10px 14px",
            animation: "term-up 0.2s ease both",
          }}>
            <div style={{ fontSize: "0.62rem", color: "rgba(226,232,240,0.3)",
              textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
              ⚡ Quick Commands
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {QUICK_CMDS.map(({ label, cmd }) => (
                <button key={label} onClick={() => { setInput(cmd); inputRef.current?.focus(); }} style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                  color: "rgba(226,232,240,0.6)", borderRadius: 6,
                  padding: "4px 10px", fontSize: "0.72rem",
                  cursor: "pointer", fontFamily: "monospace", transition: "all 0.15s",
                }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,212,255,0.3)";
                    (e.currentTarget as HTMLButtonElement).style.color = "#00d4ff";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.07)";
                    (e.currentTarget as HTMLButtonElement).style.color = "rgba(226,232,240,0.6)";
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Terminal body ────────────────────────────────────────── */}
        <div
          ref={bodyRef}
          onClick={() => inputRef.current?.focus()}
          style={{
            flex: 1, background: "#020608",
            borderRadius: 12, padding: "12px 0",
            fontFamily: "'Cascadia Code','Fira Code','JetBrains Mono',monospace",
            fontSize: "0.8rem", overflowY: "auto", overflowX: "hidden",
            border: "1px solid rgba(0,212,255,0.12)",
            boxShadow: "inset 0 0 24px rgba(0,0,0,0.5)",
            cursor: "text",
          }}
        >
          {lines.map((line, i) => (
            <div key={i} className="term-row" style={{
              display: "flex", gap: 8, padding: "1px 14px",
              whiteSpace: wrap ? "pre-wrap" : "pre",
              wordBreak: wrap ? "break-all" : "normal",
              overflowX: wrap ? "visible" : "auto",
            }}>
              {/* Timestamp — visible on hover */}
              <span className="term-ts" style={{
                fontSize: "0.65rem", color: "rgba(226,232,240,0.2)",
                flexShrink: 0, width: 58, opacity: 0,
                transition: "opacity 0.15s", lineHeight: "1.6",
                fontFamily: "monospace",
              }}>
                {line.timestamp}
              </span>
              <span style={{ color: lineColor(line.type), lineHeight: 1.6, flex: 1 }}>
                {line.text}
              </span>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div style={{ padding: "1px 14px 1px 80px", color: "#00d4ff", opacity: 0.6 }}>
              <span style={{ animation: "term-blink 1s step-end infinite" }}>▌</span>
              <span style={{ marginLeft: 6, fontSize: "0.75rem" }}>Executing…</span>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* ── Input bar ────────────────────────────────────────────── */}
        <div style={{
          display: "flex", gap: 10, alignItems: "center",
          background: "#020608",
          border: `1px solid ${loading ? "rgba(0,212,255,0.15)" : "rgba(0,212,255,0.3)"}`,
          borderRadius: 10, padding: "10px 14px",
          transition: "border-color 0.2s",
        }}>
          {/* Prompt */}
          <span style={{
            color: "#00d4ff", fontWeight: 700, fontSize: "0.82rem",
            fontFamily: "monospace", flexShrink: 0, whiteSpace: "nowrap",
          }}>
            {prompt}
          </span>

          {/* Input */}
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder={loading ? "Executing…" : "Type a command…"}
            autoComplete="off"
            spellCheck={false}
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              color: "#e2e8f0", fontSize: "0.82rem",
              fontFamily: "monospace", caretColor: "#00d4ff",
              opacity: loading ? 0.4 : 1,
            }}
          />

          {/* Loading spinner */}
          {loading && (
            <span style={{
              width: 14, height: 14, borderRadius: "50%",
              border: "2px solid rgba(0,212,255,0.3)", borderTopColor: "#00d4ff",
              display: "inline-block", flexShrink: 0,
              animation: "term-blink 0.7s linear infinite",
            }} />
          )}

          {/* Run button */}
          <button
            onClick={() => runCmd(input)}
            disabled={loading || !input.trim()}
            style={{
              background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.25)",
              color: loading || !input.trim() ? "rgba(0,212,255,0.3)" : "#00d4ff",
              borderRadius: 7, padding: "4px 14px",
              fontSize: "0.78rem", fontWeight: 700,
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              fontFamily: "monospace",
            }}
          >
            ↵ Run
          </button>
        </div>

        {/* Footer hints */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          fontSize: "0.65rem", color: "rgba(226,232,240,0.22)", flexWrap: "wrap", gap: 4,
        }}>
          <span>↑↓ history · Tab autocomplete · Ctrl+L clear · Shift+Enter newline</span>
          <span>{lines.length} lines · {history.length} history entries</span>
        </div>
      </div>
    </>
  );
}