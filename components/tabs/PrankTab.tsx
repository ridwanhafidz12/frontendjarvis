"use client";
import { useState, useCallback, useRef, ReactNode } from "react";
import { control } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

type MsgState = { ok: boolean; text: string } | null;

// ── Helpers ────────────────────────────────────────────────────────────────

function useRunner() {
  const [loading, setLoading] = useState<string | null>(null);
  const [msg,     setMsg]     = useState<MsgState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(async (
    id:      string,
    action:  string,
    params:  Record<string, unknown>,
    label:   string,
  ) => {
    setMsg(null);
    setLoading(id);
    try {
      await control(action, params);
      if (timer.current) clearTimeout(timer.current);
      setMsg({ ok: true, text: `✅ ${label} berhasil dijalankan` });
      timer.current = setTimeout(() => setMsg(null), 3500);
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e);
      setMsg({ ok: false, text: `❌ ${label} gagal: ${m}` });
    } finally {
      setLoading(null);
    }
  }, []);

  return { loading, msg, setMsg, run };
}

// ── Sub-components ─────────────────────────────────────────────────────────

function PrankCard({
  icon, title, subtitle, danger = false, children,
}: {
  icon: string; title: string; subtitle: string;
  danger?: boolean; children: ReactNode;
}) {
  return (
    <div style={{
      background: "rgba(6,10,22,0.6)",
      border: `1px solid ${danger ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 14, padding: "18px 20px",
      display: "flex", flexDirection: "column", gap: 14,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: danger ? "rgba(239,68,68,0.1)" : "rgba(0,212,255,0.07)",
          border: `1px solid ${danger ? "rgba(239,68,68,0.2)" : "rgba(0,212,255,0.15)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.4rem",
        }}>
          {icon}
        </div>
        <div>
          <div style={{
            fontSize: "0.9rem", fontWeight: 700,
            color: danger ? "#ef4444" : "#e2e8f0",
          }}>
            {title}
          </div>
          <div style={{ fontSize: "0.72rem", color: "rgba(226,232,240,0.4)", marginTop: 1 }}>
            {subtitle}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

function RunBtn({
  id, label, loading, onClick, danger = false, disabled = false,
}: {
  id: string; label: string; loading: string | null;
  onClick: () => void; danger?: boolean; disabled?: boolean;
}) {
  const isLoading = loading === id;
  return (
    <button
      onClick={onClick}
      disabled={!!loading || disabled}
      style={{
        width: "100%", borderRadius: 9, padding: "10px",
        fontSize: "0.85rem", fontWeight: 700,
        background: danger ? "rgba(239,68,68,0.12)" : "rgba(0,212,255,0.1)",
        border: `1px solid ${danger ? "rgba(239,68,68,0.3)" : "rgba(0,212,255,0.25)"}`,
        color: danger ? "#ef4444" : "#00d4ff",
        cursor: !!loading || disabled ? "not-allowed" : "pointer",
        opacity: !!loading && !isLoading ? 0.5 : 1,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        fontFamily: "inherit", transition: "all 0.15s",
      }}
    >
      {isLoading
        ? <span style={{
            width: 14, height: 14, borderRadius: "50%",
            border: `2px solid ${danger ? "#ef4444" : "#00d4ff"}`,
            borderTopColor: "transparent", display: "inline-block",
            animation: "prank-spin 0.7s linear infinite",
          }} />
        : label}
    </button>
  );
}

function RangeInput({
  min, max, value, onChange, accent = "#00d4ff", label,
}: {
  min: number; max: number; value: number;
  onChange: (v: number) => void; accent?: string; label?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {label && (
        <span style={{ fontSize: "0.7rem", color: "rgba(226,232,240,0.35)",
          textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>
          {label}
        </span>
      )}
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        style={{ flex: 1, accentColor: accent }} />
      <span style={{
        color: accent, fontWeight: 800, fontFamily: "monospace",
        fontSize: "0.85rem", minWidth: 38, textAlign: "right",
      }}>
        {value}s
      </span>
    </div>
  );
}

function InputField({
  value, onChange, placeholder, multiline = false,
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean;
}) {
  const base: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 8, padding: "8px 12px",
    color: "#e2e8f0", fontSize: "0.85rem",
    fontFamily: "inherit", outline: "none",
    width: "100%", boxSizing: "border-box",
  };
  if (multiline) return (
    <textarea
      value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={2}
      style={{ ...base, resize: "none" }}
    />
  );
  return (
    <input
      value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} style={base}
    />
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function PrankTab() {
  const { loading, msg, setMsg, run } = useRunner();

  // TTS
  const [ttsText,   setTtsText]   = useState("Hello! JARVIS is watching you.");

  // Blackscreen
  const [blackDur,  setBlackDur]  = useState(10);

  // Jumpscare
  const [jumpMsg,   setJumpMsg]   = useState("BOO! 😱");

  // BSOD
  const [bsodDur,   setBsodDur]   = useState(10);

  // Popup
  const [popTitle,  setPopTitle]  = useState("JARVIS");
  const [popMsg,    setPopMsg]    = useState("This message is brought to you by JARVIS.");

  // Marquee
  const [marquee,   setMarquee]   = useState("JARVIS was here 👀");

  const QUICK_TTS = [
    "I see you.",
    "Don't panic. Everything is fine.",
    "System alert: unauthorized access detected.",
    "Attention! JARVIS is taking control.",
    "Baterai hampir habis, segera charger.",
  ];

  const SOUND_EFFECTS: Array<{ label: string; type: string; danger: boolean }> = [
    { label: "🔔 Beep",       type: "beep",     danger: false },
    { label: "❌ Error",      type: "error",    danger: true  },
    { label: "💀 Critical",   type: "critical", danger: true  },
    { label: "✅ Success",    type: "success",  danger: false },
  ];

  return (
    <>
      <style>{`
        @keyframes prank-spin { to { transform: rotate(360deg); } }
        @keyframes prank-up   { from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:none;} }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── Header ──────────────────────────────────────────────── */}
        <div>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#e2e8f0", margin: "0 0 4px" }}>
            🎭 Prank & Fun Tools
          </h2>
          <p style={{ fontSize: "0.72rem", color: "rgba(226,232,240,0.35)", margin: 0 }}>
            Remote interaction tools untuk PC target · gunakan dengan bijak
          </p>
        </div>

        {/* Toast */}
        {msg && (
          <div style={{
            padding: "10px 16px", borderRadius: 10,
            background: msg.ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            border: `1px solid ${msg.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
            color: msg.ok ? "#22c55e" : "#ef4444",
            fontSize: "0.82rem", fontWeight: 600,
            display: "flex", justifyContent: "space-between", alignItems: "center",
            animation: "prank-up 0.2s ease both",
          }}>
            <span>{msg.text}</span>
            <button onClick={() => setMsg(null)} style={{
              background: "none", border: "none", color: "inherit",
              cursor: "pointer", padding: 0, fontSize: "0.9rem",
            }}>✕</button>
          </div>
        )}

        {/* ── Grid ────────────────────────────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 16,
        }}>

          {/* TTS */}
          <PrankCard icon="🔊" title="Text to Speech"
            subtitle="JARVIS speaks text aloud on target PC">
            <InputField value={ttsText} onChange={setTtsText}
              placeholder="Text to speak…" multiline />
            <div>
              <div style={{ fontSize: "0.65rem", color: "rgba(226,232,240,0.3)",
                textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
                Quick messages
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {QUICK_TTS.map(t => (
                  <button key={t} onClick={() => setTtsText(t)} style={{
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 6, padding: "5px 10px", color: "rgba(226,232,240,0.5)",
                    fontSize: "0.73rem", cursor: "pointer", textAlign: "left",
                    fontFamily: "inherit", transition: "all 0.15s",
                  }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.color = "#e2e8f0";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,212,255,0.2)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.color = "rgba(226,232,240,0.5)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.06)";
                    }}
                  >
                    "{t}"
                  </button>
                ))}
              </div>
            </div>
            <RunBtn id="speak" label="🔊 Speak Now" loading={loading}
              onClick={() => run("speak", "speak", { text: ttsText }, "Text to Speech")} />
          </PrankCard>

          {/* Blackscreen */}
          <PrankCard icon="⬛" title="Black Screen"
            subtitle="Temporary screen blackout on target PC">
            <RangeInput min={1} max={60} value={blackDur}
              onChange={setBlackDur} label="Duration" />
            <RunBtn id="blackscreen" label="⬛ Activate Blackscreen" loading={loading}
              onClick={() => run("blackscreen", "blackscreen", { duration: blackDur }, "Black Screen")} />
          </PrankCard>

          {/* Jumpscare */}
          <PrankCard icon="😱" title="Jumpscare"
            subtitle="Fullscreen red scare with alarm sound" danger>
            <InputField value={jumpMsg} onChange={setJumpMsg}
              placeholder="Scare message…" />
            <RunBtn id="jumpscare" label="😱 Send Jumpscare" loading={loading} danger
              onClick={() => run("jumpscare", "jumpscare", { message: jumpMsg }, "Jumpscare")} />
          </PrankCard>

          {/* Fake BSOD */}
          <PrankCard icon="💀" title="Fake BSOD"
            subtitle="Simulate Windows Blue Screen of Death" danger>
            <RangeInput min={2} max={60} value={bsodDur}
              onChange={setBsodDur} label="Duration" accent="#ef4444" />
            <div style={{
              background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
              borderRadius: 8, padding: "8px 12px",
              fontSize: "0.72rem", color: "rgba(239,68,68,0.7)",
            }}>
              ⚠️ Layar PC target akan terblokir selama {bsodDur} detik.
            </div>
            <RunBtn id="bsod" label="💀 Show Fake BSOD" loading={loading} danger
              onClick={() => {
                if (window.confirm(`Tampilkan Fake BSOD selama ${bsodDur} detik?`)) {
                  run("bsod", "bsod", { duration: bsodDur }, "Fake BSOD");
                }
              }} />
          </PrankCard>

          {/* Custom Popup */}
          <PrankCard icon="💬" title="Custom Popup"
            subtitle="Show a Windows message dialog box">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <InputField value={popTitle} onChange={setPopTitle} placeholder="Popup title…" />
              <InputField value={popMsg}   onChange={setPopMsg}   placeholder="Message…" multiline />
            </div>
            <RunBtn id="popup" label="💬 Show Popup" loading={loading}
              onClick={() => run("popup", "popup", { title: popTitle, message: popMsg }, "Custom Popup")} />
          </PrankCard>

          {/* Sound Effects */}
          <PrankCard icon="🔔" title="Sound Effects"
            subtitle="Play system alert sounds on target PC">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {SOUND_EFFECTS.map(s => (
                <button
                  key={s.type}
                  disabled={!!loading}
                  onClick={() => run(s.type, "play_sound", { type: s.type }, s.label)}
                  style={{
                    background: s.danger ? "rgba(239,68,68,0.1)" : "rgba(0,212,255,0.08)",
                    border: `1px solid ${s.danger ? "rgba(239,68,68,0.25)" : "rgba(0,212,255,0.2)"}`,
                    color: s.danger ? "#ef4444" : "#00d4ff",
                    borderRadius: 8, padding: "10px",
                    fontSize: "0.82rem", fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading && loading !== s.type ? 0.5 : 1,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    fontFamily: "inherit", transition: "all 0.15s",
                  }}
                >
                  {loading === s.type
                    ? <span style={{
                        width: 12, height: 12, borderRadius: "50%",
                        border: `2px solid ${s.danger ? "#ef4444" : "#00d4ff"}`,
                        borderTopColor: "transparent", display: "inline-block",
                        animation: "prank-spin 0.7s linear infinite",
                      }} />
                    : s.label}
                </button>
              ))}
            </div>
          </PrankCard>

          {/* Marquee / Notification */}
          <PrankCard icon="📢" title="Desktop Notification"
            subtitle="Send a toast notification to target PC">
            <InputField value={marquee} onChange={setMarquee}
              placeholder="Notification message…" />
            <RunBtn id="marquee" label="📢 Send Notification" loading={loading}
              onClick={() => run(
                "marquee", "popup",
                { title: "JARVIS Notification", message: marquee },
                "Desktop Notification"
              )} />
          </PrankCard>

          {/* Quick Combo */}
          <PrankCard icon="⚡" title="Quick Pranks"
            subtitle="One-click instant prank actions">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { id: "combo-bsod5",    label: "💀 Quick BSOD (5s)",     action: "bsod",        params: { duration: 5 },                         danger: true  },
                { id: "combo-black10",  label: "⬛ Quick Blackout (10s)", action: "blackscreen", params: { duration: 10 },                         danger: false },
                { id: "combo-scare",    label: "😱 Default Jumpscare",    action: "jumpscare",   params: { message: "BOO! 😱" },                  danger: true  },
                { id: "combo-scream",   label: "🚨 Loud Alarm",           action: "play_sound",  params: { type: "critical" },                    danger: true  },
                { id: "combo-tts",      label: "👁 I See You (TTS)",      action: "speak",       params: { text: "I can see you. Be careful." },  danger: false },
              ].map(item => (
                <button
                  key={item.id}
                  disabled={!!loading}
                  onClick={() => {
                    if (item.danger && !window.confirm(`Jalankan: ${item.label}?`)) return;
                    run(item.id, item.action, item.params, item.label);
                  }}
                  style={{
                    background: item.danger ? "rgba(239,68,68,0.07)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${item.danger ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.07)"}`,
                    color: item.danger ? "#ef4444" : "rgba(226,232,240,0.7)",
                    borderRadius: 8, padding: "9px 14px",
                    fontSize: "0.82rem", fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading && loading !== item.id ? 0.5 : 1,
                    display: "flex", alignItems: "center", gap: 8,
                    textAlign: "left", fontFamily: "inherit", transition: "all 0.15s",
                  }}
                >
                  {loading === item.id
                    ? <span style={{
                        width: 12, height: 12, borderRadius: "50%",
                        border: `2px solid currentColor`, borderTopColor: "transparent",
                        display: "inline-block", animation: "prank-spin 0.7s linear infinite",
                      }} />
                    : null}
                  {item.label}
                </button>
              ))}
            </div>
          </PrankCard>

        </div>
      </div>
    </>
  );
}