"use client";
import { useState, useCallback, ReactNode } from "react";
import { control, screenshot, webcam, recordScreen } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

type MsgType = "success" | "error" | "info";
interface Msg { type: MsgType; text: string; }

// ── Helpers ────────────────────────────────────────────────────────────────

function useRunner() {
  const [loading, setLoading] = useState<string | null>(null);
  const [msg,     setMsg]     = useState<Msg | null>(null);

  const run = useCallback(async (
    label:      string,
    fn:         () => Promise<unknown>,
    onSuccess?: (r: unknown) => void,
  ) => {
    setMsg(null);
    setLoading(label);
    try {
      const r = await fn();
      setMsg({ type: "success", text: `✅ ${label} berhasil` });
      onSuccess?.(r);
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      setMsg({ type: "error", text: `❌ ${label} gagal: ${m}` });
    } finally {
      setLoading(null);
    }
  }, []);

  return { loading, msg, setMsg, run };
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionCard({ title, icon, children }: {
  title: string; icon: string; children: ReactNode;
}) {
  return (
    <div style={{
      background: "rgba(6,10,22,0.6)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 14, overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{
        padding: "12px 18px",
        background: "rgba(0,212,255,0.03)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ fontSize: "1rem" }}>{icon}</span>
        <span style={{
          fontSize: "0.8rem", fontWeight: 700, color: "#e2e8f0",
          letterSpacing: "0.04em",
        }}>{title}</span>
      </div>
      <div style={{ padding: "16px 18px", flex: 1 }}>
        {children}
      </div>
    </div>
  );
}

function Label({ text }: { text: string }) {
  return (
    <div style={{
      fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em",
      color: "rgba(226,232,240,0.35)", textTransform: "uppercase", marginBottom: 8,
    }}>{text}</div>
  );
}

function Input({ value, onChange, placeholder, type = "text", style: sx = {} }: {
  value: string | number; onChange: (v: string) => void;
  placeholder?: string; type?: string; style?: React.CSSProperties;
}) {
  return (
    <input
      type={type} value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8, padding: "8px 12px",
        color: "#e2e8f0", fontSize: "0.85rem",
        outline: "none", fontFamily: "inherit",
        width: "100%", boxSizing: "border-box",
        ...sx,
      }}
    />
  );
}

function ActionBtn({
  label, onClick, disabled = false,
  variant = "primary", small = false,
  loading = false,
}: {
  label: string; onClick: () => void;
  disabled?: boolean; variant?: "primary" | "danger" | "warning" | "success" | "ghost";
  small?: boolean; loading?: boolean;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: "rgba(0,212,255,0.1)",  border: "1px solid rgba(0,212,255,0.25)",  color: "#00d4ff" },
    danger:  { background: "rgba(239,68,68,0.1)",  border: "1px solid rgba(239,68,68,0.25)",  color: "#ef4444" },
    warning: { background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", color: "#fbbf24" },
    success: { background: "rgba(34,197,94,0.1)",  border: "1px solid rgba(34,197,94,0.25)",  color: "#22c55e" },
    ghost:   { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(226,232,240,0.6)" },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        ...styles[variant],
        borderRadius: 8,
        padding: small ? "5px 12px" : "8px 16px",
        fontSize: small ? "0.72rem" : "0.82rem",
        fontWeight: 600, cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled || loading ? 0.6 : 1,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        whiteSpace: "nowrap", fontFamily: "inherit",
        transition: "all 0.15s",
      }}
    >
      {loading
        ? <span style={{
            width: 12, height: 12, borderRadius: "50%",
            border: "2px solid currentColor", borderTopColor: "transparent",
            display: "inline-block", animation: "ct-spin 0.7s linear infinite",
          }} />
        : label}
    </button>
  );
}

function Chip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
      color: "rgba(226,232,240,0.65)", borderRadius: 6,
      padding: "4px 10px", fontSize: "0.72rem", cursor: "pointer",
      fontFamily: "inherit", transition: "all 0.15s",
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,212,255,0.3)"; (e.currentTarget as HTMLButtonElement).style.color = "#00d4ff"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.09)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(226,232,240,0.65)"; }}
    >{label}</button>
  );
}

function ImagePreview({ src, label, onClose }: {
  src: string; label: string; onClose: () => void;
}) {
  return (
    <div style={{
      marginTop: 14, borderRadius: 10, overflow: "hidden",
      border: "1px solid rgba(0,212,255,0.2)",
      animation: "ct-up 0.25s ease both",
    }}>
      <div style={{
        padding: "8px 14px",
        background: "rgba(0,212,255,0.05)",
        borderBottom: "1px solid rgba(0,212,255,0.1)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "#e2e8f0" }}>
          {label}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <a href={src} download={`${label}_${Date.now()}.png`} style={{
            background: "rgba(0,212,255,0.1)", border: "1px solid rgba(0,212,255,0.25)",
            color: "#00d4ff", borderRadius: 6, padding: "2px 10px",
            fontSize: "0.7rem", fontWeight: 600, textDecoration: "none",
          }}>⬇ Download</a>
          <button onClick={onClose} style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
            color: "#ef4444", borderRadius: 6, padding: "2px 9px",
            fontSize: "0.7rem", cursor: "pointer", fontFamily: "inherit",
          }}>✕</button>
        </div>
      </div>
      <img src={src} alt={label} style={{ width: "100%", display: "block" }} />
    </div>
  );
}

// ── Sections ───────────────────────────────────────────────────────────────

function ScreenSection({ run, loading }: { run: ReturnType<typeof useRunner>["run"]; loading: string | null }) {
  const [imgData,  setImgData]  = useState<string | null>(null);
  const [imgLabel, setImgLabel] = useState("");
  const [duration, setDuration] = useState(10);

  return (
    <SectionCard icon="📸" title="Screen & Camera">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <ActionBtn label="📸 Screenshot" variant="primary" loading={loading === "Screenshot"}
          onClick={() => run("Screenshot", screenshot, (r: unknown) => {
            const d = r as { image?: string };
            if (d?.image) { setImgData(d.image); setImgLabel("Screenshot"); }
          })} />
        <ActionBtn label="📷 Webcam" variant="primary" loading={loading === "Webcam"}
          onClick={() => run("Webcam", webcam, (r: unknown) => {
            const d = r as { image?: string };
            if (d?.image) { setImgData(d.image); setImgLabel("Webcam"); }
          })} />
      </div>

      <Label text="Screen Recording" />
      <div style={{ display: "flex", alignItems: "center", gap: 10,
        background: "rgba(0,0,0,0.2)", padding: "10px 12px", borderRadius: 8 }}>
        <ActionBtn label={`🎬 Record ${duration}s`} variant="primary"
          loading={loading === "Recording"}
          onClick={() => run("Recording", () => recordScreen(duration))} />
        <input type="range" min={3} max={60} value={duration}
          onChange={e => setDuration(parseInt(e.target.value))}
          style={{ flex: 1, accentColor: "#00d4ff" }} />
        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#00d4ff", width: 32 }}>
          {duration}s
        </span>
      </div>

      {imgData && (
        <ImagePreview src={imgData} label={imgLabel}
          onClose={() => { setImgData(null); setImgLabel(""); }} />
      )}
    </SectionCard>
  );
}

function AppsSection({ run, loading }: { run: ReturnType<typeof useRunner>["run"]; loading: string | null }) {
  const [appName,  setAppName]  = useState("notepad");
  const [closeApp, setCloseApp] = useState("");
  const [closeTab, setCloseTab] = useState("");

  const QUICK_APPS = ["notepad", "calc", "chrome", "firefox", "explorer", "taskmgr", "cmd", "powershell", "mspaint", "vlc"];

  return (
    <SectionCard icon="🚀" title="Apps & Windows">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        <div>
          <Label text="Launch Application" />
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <Input value={appName} onChange={setAppName} placeholder="App name or path…" />
            <ActionBtn label="▶ Open" variant="primary" loading={loading === `Open ${appName}`}
              onClick={() => run(`Open ${appName}`, () => control("open_app", { app: appName }))} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {QUICK_APPS.map(a => (
              <Chip key={a} label={a} onClick={() => {
                setAppName(a);
                run(`Open ${a}`, () => control("open_app", { app: a }));
              }} />
            ))}
          </div>
        </div>

        <div>
          <Label text="Close Process" />
          <div style={{ display: "flex", gap: 8 }}>
            <Input value={closeApp} onChange={setCloseApp} placeholder="notepad.exe, chrome…" />
            <ActionBtn label="✕ Kill" variant="danger" loading={loading === `Kill ${closeApp}`}
              onClick={() => run(`Kill ${closeApp}`, () => control("close_app", { app: closeApp }))} />
          </div>
        </div>

        <div>
          <Label text="Close Browser Tab" />
          <div style={{ display: "flex", gap: 8 }}>
            <Input value={closeTab} onChange={setCloseTab} placeholder="youtube, facebook…" />
            <ActionBtn label="✕ Tab" variant="danger" loading={loading === `Tab ${closeTab}`}
              onClick={() => run(`Tab ${closeTab}`, () => control("close_tab", { target: closeTab }))} />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function KeyboardSection({ run, loading }: { run: ReturnType<typeof useRunner>["run"]; loading: string | null }) {
  const [typeText, setTypeText] = useState("");
  const [pressKey, setPressKey] = useState("");

  const QUICK_KEYS = ["enter", "space", "backspace", "tab", "esc", "win", "up", "down", "left", "right"];

  return (
    <SectionCard icon="⌨️" title="Keyboard & Typing">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        <div>
          <Label text="Type Text" />
          <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <Input value={typeText} onChange={setTypeText} placeholder="Text to type at cursor…" />
            <ActionBtn label="⌨️ Type" variant="primary" loading={loading === "Type Text"}
              onClick={() => run("Type Text", () => control("type_text", { text: typeText }))} />
          </div>
          <p style={{ fontSize: "0.68rem", color: "rgba(226,232,240,0.3)", margin: 0 }}>
            Teks akan diketik di posisi kursor aktif di PC target.
          </p>
        </div>

        <div>
          <Label text="Press Key" />
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <Input value={pressKey} onChange={setPressKey} placeholder="enter, win, ctrl+c…" />
            <ActionBtn label="↵ Press" variant="primary" loading={loading === `Press ${pressKey}`}
              onClick={() => run(`Press ${pressKey}`, () => control("press_key", { key: pressKey }))} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {QUICK_KEYS.map(k => (
              <Chip key={k} label={k} onClick={() => {
                setPressKey(k);
                run(`Press ${k}`, () => control("press_key", { key: k }));
              }} />
            ))}
          </div>
        </div>

        <div>
          <Label text="Quick Combos" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {[
              { label: "Win+D (Desktop)", key: "win+d"   },
              { label: "Alt+F4",          key: "alt+f4"  },
              { label: "Ctrl+C",          key: "ctrl+c"  },
              { label: "Ctrl+V",          key: "ctrl+v"  },
              { label: "Ctrl+Z",          key: "ctrl+z"  },
              { label: "Ctrl+A",          key: "ctrl+a"  },
              { label: "Print Screen",    key: "printscreen" },
            ].map(({ label, key }) => (
              <Chip key={key} label={label}
                onClick={() => run(`Press ${key}`, () => control("press_key", { key }))} />
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function VolumeSection({ run, loading }: { run: ReturnType<typeof useRunner>["run"]; loading: string | null }) {
  const [vol, setVol] = useState(50);
  const icon = vol === 0 ? "🔇" : vol < 35 ? "🔈" : vol < 70 ? "🔉" : "🔊";

  return (
    <SectionCard icon="🔊" title="System Volume">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <span style={{ fontSize: "1.3rem" }}>{icon}</span>
        <input type="range" min={0} max={100} value={vol}
          onChange={e => setVol(parseInt(e.target.value))}
          style={{ flex: 1, accentColor: "#00d4ff" }} />
        <span style={{
          fontSize: "1rem", fontWeight: 800, color: "#00d4ff",
          fontFamily: "monospace", width: 48, textAlign: "right",
        }}>{vol}%</span>
        <ActionBtn label="Apply" variant="primary"
          loading={loading === `Volume ${vol}`}
          onClick={() => run(`Volume ${vol}`, () => control("set_volume", { level: vol }))} />
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[0, 25, 50, 75, 100].map(v => (
          <ActionBtn key={v} label={`${v}%`} small variant={vol === v ? "success" : "ghost"}
            loading={loading === `Volume ${v}`}
            onClick={() => { setVol(v); run(`Volume ${v}`, () => control("set_volume", { level: v })); }} />
        ))}
      </div>
    </SectionCard>
  );
}

function PowerSection({ run, loading }: { run: ReturnType<typeof useRunner>["run"]; loading: string | null }) {
  const [delay, setDelay] = useState(30);

  return (
    <SectionCard icon="⏻" title="Power & Session">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <ActionBtn label="🔒 Lock PC" variant="warning"
            loading={loading === "Lock"}
            onClick={() => run("Lock", () => control("lock"))} />
          <ActionBtn label="🌙 Sleep Display" variant="ghost"
            loading={loading === "Sleep Display"}
            onClick={() => run("Sleep Display", () => control("sleep_display"))} />
          <ActionBtn label="⛔ Cancel Shutdown" variant="ghost"
            loading={loading === "Cancel Shutdown"}
            onClick={() => run("Cancel Shutdown", () => control("cancel_shutdown"))} />
          <ActionBtn label="📊 Task Manager" variant="ghost"
            loading={loading === "Open taskmgr"}
            onClick={() => run("Open taskmgr", () => control("open_app", { app: "taskmgr" }))} />
        </div>

        <div style={{
          background: "rgba(239,68,68,0.05)",
          border: "1px solid rgba(239,68,68,0.12)",
          borderRadius: 10, padding: 14,
        }}>
          <Label text="Shutdown / Restart Delay (seconds)" />
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <Input value={delay} onChange={v => setDelay(parseInt(v) || 0)}
              type="number" style={{ width: 90, textAlign: "center" }} />
            <input type="range" min={0} max={300} value={delay}
              onChange={e => setDelay(parseInt(e.target.value))}
              style={{ flex: 1, accentColor: "#ef4444" }} />
            <span style={{ fontSize: "0.8rem", color: "#ef4444", fontWeight: 700, width: 36 }}>
              {delay}s
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <ActionBtn label="⏻ Shutdown" variant="danger"
              loading={loading === "Shutdown"}
              onClick={() => {
                if (window.confirm(`Shutdown PC dalam ${delay} detik?`))
                  run("Shutdown", () => control("shutdown", { delay }));
              }} />
            <ActionBtn label="🔄 Restart" variant="danger"
              loading={loading === "Restart"}
              onClick={() => {
                if (window.confirm(`Restart PC dalam ${delay} detik?`))
                  run("Restart", () => control("restart", { delay }));
              }} />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function TtsSection({ run, loading }: { run: ReturnType<typeof useRunner>["run"]; loading: string | null }) {
  const [text, setText] = useState("Hello! I am JARVIS, your AI assistant.");
  const QUICK_TTS = [
    "Hello! I am JARVIS.",
    "System alert: unauthorized access detected.",
    "Baterai hampir habis, segera cas.",
    "Your PC is being monitored.",
  ];

  return (
    <SectionCard icon="🗣️" title="Text to Speech">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <textarea
          value={text} onChange={e => setText(e.target.value)}
          placeholder="Teks yang akan diucapkan…"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8, padding: "10px 12px",
            color: "#e2e8f0", fontSize: "0.85rem",
            fontFamily: "inherit", resize: "vertical",
            minHeight: 70, outline: "none", width: "100%",
            boxSizing: "border-box",
          }}
        />
        <ActionBtn label="🗣️ Speak Now" variant="primary"
          loading={loading === "Speak"}
          onClick={() => run("Speak", () => control("speak", { text }))} />
        <div>
          <Label text="Quick Messages" />
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {QUICK_TTS.map(t => (
              <button key={t} onClick={() => setText(t)} style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 7, padding: "6px 12px",
                color: "rgba(226,232,240,0.55)", fontSize: "0.76rem",
                cursor: "pointer", textAlign: "left",
                fontFamily: "inherit", transition: "all 0.15s",
              }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,212,255,0.25)";
                  (e.currentTarget as HTMLButtonElement).style.color = "#e2e8f0";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.07)";
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(226,232,240,0.55)";
                }}
              >
                "{t}"
              </button>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function SoundSection({ run, loading }: { run: ReturnType<typeof useRunner>["run"]; loading: string | null }) {
  const SOUNDS = [
    { label: "🔔 Beep",     type: "beep"     },
    { label: "❌ Error",    type: "error"    },
    { label: "💀 Critical", type: "critical" },
    { label: "✅ Success",  type: "success"  },
  ];
  return (
    <SectionCard icon="🔔" title="Sound Effects">
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {SOUNDS.map(s => (
          <ActionBtn key={s.type} label={s.label} variant="primary"
            loading={loading === `Sound ${s.type}`}
            onClick={() => run(`Sound ${s.type}`, () => control("play_sound", { type: s.type }))} />
        ))}
      </div>
    </SectionCard>
  );
}

function PopupSection({ run, loading }: { run: ReturnType<typeof useRunner>["run"]; loading: string | null }) {
  const [title, setTitle] = useState("JARVIS");
  const [msg,   setMsg2]  = useState("Hello from JARVIS!");

  return (
    <SectionCard icon="💬" title="Popup & Notifications">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <Input value={title} onChange={setTitle} placeholder="Popup title…" style={{ flex: "0 0 140px" }} />
          <Input value={msg}   onChange={setMsg2}  placeholder="Message…" />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ActionBtn label="💬 Show Popup" variant="primary"
            loading={loading === "Popup"}
            onClick={() => run("Popup", () => control("popup", { title, message: msg }))} />
          <ActionBtn label="💀 Fake BSOD" variant="danger"
            loading={loading === "BSOD"}
            onClick={() => run("BSOD", () => control("bsod", { duration: 5 }))} />
          <ActionBtn label="⬛ Blackscreen" variant="warning"
            loading={loading === "Blackscreen"}
            onClick={() => run("Blackscreen", () => control("blackscreen", { duration: 5 }))} />
          <ActionBtn label="😱 Jumpscare" variant="danger"
            loading={loading === "Jumpscare"}
            onClick={() => run("Jumpscare", () => control("jumpscare", { message: "BOO! 😱" }))} />
        </div>
      </div>
    </SectionCard>
  );
}

function ClipboardSection({ run, loading }: { run: ReturnType<typeof useRunner>["run"]; loading: string | null }) {
  const [clipText,    setClipText]    = useState("");
  const [clipContent, setClipContent] = useState<string | null>(null);

  return (
    <SectionCard icon="📋" title="Clipboard">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <Input value={clipText} onChange={setClipText} placeholder="Teks untuk di-copy ke clipboard…" />
          <ActionBtn label="📋 Set" variant="primary"
            loading={loading === "Set Clipboard"}
            onClick={() => run("Set Clipboard", () => control("clipboard_set", { text: clipText }))} />
        </div>
        <ActionBtn label="📥 Get Clipboard" variant="ghost"
          loading={loading === "Get Clipboard"}
          onClick={() => run("Get Clipboard", () => control("clipboard_get", {}), (r: unknown) => {
            const d = r as { content?: string };
            if (d?.content !== undefined) setClipContent(d.content);
          })} />
        {clipContent !== null && (
          <div style={{
            background: "rgba(0,0,0,0.3)", borderRadius: 8,
            padding: "10px 12px", animation: "ct-up 0.2s ease both",
          }}>
            <div style={{ fontSize: "0.68rem", color: "rgba(226,232,240,0.35)",
              marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Clipboard Content
            </div>
            <pre style={{
              fontSize: "0.8rem", color: "#e2e8f0", margin: 0,
              whiteSpace: "pre-wrap", wordBreak: "break-all", fontFamily: "monospace",
              maxHeight: 100, overflowY: "auto",
            }}>{clipContent || "(empty)"}</pre>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function ControlTab() {
  const { loading, msg, setMsg, run } = useRunner();

  return (
    <>
      <style>{`
        @keyframes ct-spin { to { transform: rotate(360deg); } }
        @keyframes ct-up   { from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;} }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Toast */}
        {msg && (
          <div style={{
            padding: "10px 16px", borderRadius: 10, fontSize: "0.82rem", fontWeight: 600,
            background: msg.type === "error" ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
            border: `1px solid ${msg.type === "error" ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
            color: msg.type === "error" ? "#ef4444" : "#22c55e",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            animation: "ct-up 0.2s ease both",
          }}>
            <span>{msg.text}</span>
            <button onClick={() => setMsg(null)} style={{
              background: "none", border: "none", color: "inherit",
              cursor: "pointer", fontSize: "0.9rem", padding: 0,
            }}>✕</button>
          </div>
        )}

        {/* Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 16,
        }}>
          <ScreenSection    run={run} loading={loading} />
          <AppsSection      run={run} loading={loading} />
          <KeyboardSection  run={run} loading={loading} />
          <VolumeSection    run={run} loading={loading} />
          <PowerSection     run={run} loading={loading} />
          <TtsSection       run={run} loading={loading} />
          <SoundSection     run={run} loading={loading} />
          <PopupSection     run={run} loading={loading} />
          <ClipboardSection run={run} loading={loading} />
        </div>
      </div>
    </>
  );
}